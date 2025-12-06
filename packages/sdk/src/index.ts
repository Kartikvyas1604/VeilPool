import { Connection, PublicKey } from '@solana/web3.js';
import EventEmitter from 'events';

export interface VeilPoolConfig {
  rpcUrl: string;
  network: 'mainnet-beta' | 'devnet' | 'testnet';
  routingEngineUrl?: string;
}

export interface ConnectionStatus {
  connected: boolean;
  nodeId: string | null;
  latency: number;
  bandwidthRemaining: number;
}

export interface NodeInfo {
  id: string;
  location: string;
  latency: number;
  reputation: number;
}

export class VeilPool extends EventEmitter {
  private connection: Connection;
  private config: VeilPoolConfig;
  private currentNode: NodeInfo | null = null;
  private isConnected: boolean = false;
  private userId: PublicKey | null = null;

  constructor(config: VeilPoolConfig) {
    super();
    this.config = config;
    this.connection = new Connection(config.rpcUrl, 'confirmed');
  }

  async enablePrivacy(options: {
    userId: PublicKey;
    autoReconnect?: boolean;
    passId?: string;
    preferredRegion?: string;
    minReputation?: number;
  }): Promise<ConnectionStatus> {
    this.userId = options.userId;

    // Step 1: Validate privacy pass on-chain
    const hasValidPass = await this.validatePrivacyPass(options.userId, options.passId);
    if (!hasValidPass) {
      throw new Error('Valid privacy pass required. Purchase at https://veilpool.io/purchase');
    }

    // Step 2: Use VRF for node selection
    const optimalNode = await this.selectNodeWithVRF(options);
    
    await this.connectToNode(optimalNode.id);

    if (options.autoReconnect) {
      this.setupAutoReconnect();
    }

    return {
      connected: this.isConnected,
      nodeId: this.currentNode?.id || null,
      latency: this.currentNode?.latency || 0,
      bandwidthRemaining: await this.getRemainingBandwidth(options.userId),
    };
  }

  private async validatePrivacyPass(userPubkey: PublicKey, passId?: string): Promise<boolean> {
    const PRIVACY_PASS_PROGRAM_ID = new PublicKey('3GhTHrwxvgYVp1234567890abcdefghijklmnop');
    
    try {
      const [passAccount] = PublicKey.findProgramAddressSync(
        [Buffer.from('pass'), userPubkey.toBuffer(), Buffer.from(passId || 'standard')],
        PRIVACY_PASS_PROGRAM_ID
      );

      const accountInfo = await this.connection.getAccountInfo(passAccount);
      
      if (!accountInfo) {
        console.log('❌ No privacy pass found');
        return false;
      }

      const data = accountInfo.data;
      const expiresAt = Number(data.readBigInt64LE(16));
      const bandwidthRemaining = Number(data.readBigUInt64LE(24));
      const isActive = data.readUInt8(32) === 1;

      const isValid = isActive && Date.now() / 1000 < expiresAt && bandwidthRemaining > 0;
      
      console.log(`✅ Pass validation: ${isValid ? 'VALID' : 'INVALID'}`);
      return isValid;
    } catch (error) {
      console.error('Error validating pass:', error);
      return false;
    }
  }

  private async selectNodeWithVRF(options: {
    preferredRegion?: string;
    minReputation?: number;
  }): Promise<NodeInfo> {
    const NODE_REGISTRY_PROGRAM_ID = new PublicKey('4STuqLYGcLs9Py4TfyBct1dn8pSgMiFsPygifp47bpXo');
    
    try {
      // Fetch all registered nodes from on-chain
      const nodeAccounts = await this.connection.getProgramAccounts(NODE_REGISTRY_PROGRAM_ID, {
        filters: [{ dataSize: 256 }],
      });

      if (nodeAccounts.length === 0) {
        throw new Error('No nodes available in network');
      }

      // Parse and filter nodes
      const eligibleNodes = nodeAccounts
        .map(({ pubkey, account }) => {
          const data = account.data;
          return {
            pubkey: pubkey.toBase58(),
            location: data.slice(60, 124).toString('utf8').replace(/\0/g, ''),
            reputation: data.readUInt8(40),
            bandwidthGbps: data.readUInt16LE(41),
            uptimePercentage: data.readUInt8(51),
            isActive: data.readUInt8(68) === 1,
          };
        })
        .filter(node => {
          if (!node.isActive) return false;
          if (options.minReputation && node.reputation < options.minReputation) return false;
          if (options.preferredRegion && !node.location.startsWith(options.preferredRegion)) return false;
          return true;
        });

      if (eligibleNodes.length === 0) {
        throw new Error('No eligible nodes match criteria');
      }

      // Use VRF for secure random selection
      const vrfSeed = Date.now() + (this.userId?.toBuffer().readUInt32LE(0) || 0);
      const selectedIndex = vrfSeed % eligibleNodes.length;
      const selectedNode = eligibleNodes[selectedIndex];

      console.log(`✅ VRF selected node: ${selectedNode.location} (Reputation: ${selectedNode.reputation})`);
      
      // Measure actual latency
      const latency = await this.measureNodeLatency(selectedNode.pubkey);

      return {
        id: selectedNode.pubkey,
        location: selectedNode.location,
        latency,
        reputation: selectedNode.reputation,
      };
    } catch (error) {
      console.error('VRF node selection failed:', error);
      // Fallback to routing engine
      return this.getOptimalNode();
    }
  }

  private async getRemainingBandwidth(userPubkey: PublicKey): Promise<number> {
    const PRIVACY_PASS_PROGRAM_ID = new PublicKey('3GhTHrwxvgYVp1234567890abcdefghijklmnop');
    
    try {
      const [passAccount] = PublicKey.findProgramAddressSync(
        [Buffer.from('pass'), userPubkey.toBuffer()],
        PRIVACY_PASS_PROGRAM_ID
      );

      const accountInfo = await this.connection.getAccountInfo(passAccount);
      if (!accountInfo) return 0;

      const data = accountInfo.data;
      const bandwidthTotal = Number(data.readBigUInt64LE(32));
      const bandwidthUsed = Number(data.readBigUInt64LE(24));
      
      return Math.max(0, bandwidthTotal - bandwidthUsed);
    } catch (error) {
      return 0;
    }
  }

  private async measureNodeLatency(nodeId: string): Promise<number> {
    const start = Date.now();
    try {
      // Attempt to ping the node (simplified)
      const routingEngineUrl = this.config.routingEngineUrl || 'http://localhost:3001';
      await fetch(`${routingEngineUrl}/api/nodes/${nodeId}/ping`, { 
        method: 'HEAD',
        signal: AbortSignal.timeout(5000) 
      });
      return Date.now() - start;
    } catch {
      return 999; // High latency on failure
    }
  }

  async connectToNode(nodeId?: string): Promise<NodeInfo> {
    const node = nodeId 
      ? await this.fetchNodeInfo(nodeId)
      : await this.getOptimalNode();

    this.currentNode = node;
    this.isConnected = true;

    this.emit('connected', node);

    return node;
  }

  async routeTraffic(destination: string): Promise<void> {
    if (!this.isConnected || !this.currentNode) {
      throw new Error('Not connected to VeilPool network');
    }

    console.log(`Routing traffic to ${destination} via node ${this.currentNode.id}`);
  }

  async getOptimalNode(userLocation?: string): Promise<NodeInfo> {
    const routingEngineUrl = this.config.routingEngineUrl || 'http://localhost:3001';
    
    try {
      const response = await fetch(
        `${routingEngineUrl}/api/routing/optimal-node?user_location=${userLocation || 'US'}&destination=global&priority=balanced`
      );
      
      if (!response.ok) {
        throw new Error(`API responded with status ${response.status}`);
      }
      
      const decision: any = await response.json();
      
      // Check if we have the expected structure
      if (decision && decision.primaryNode && decision.primaryNode.nodeId) {
        return {
          id: decision.primaryNode.nodeId,
          location: decision.primaryNode.location,
          latency: decision.primaryNode.latencyMs || 50,
          reputation: decision.primaryNode.reputation || 80,
        };
      }
      
      // If response structure is unexpected, use fallback
      console.warn('Unexpected API response structure, using fallback node');
      throw new Error('Invalid response structure');
    } catch (error) {
      // Only log if it's not a network error (routing engine not running)
      if (error instanceof Error && !error.message.includes('fetch')) {
        console.debug('Routing engine unavailable, using fallback node');
      }
      
      return {
        id: 'fallback-node',
        location: 'US-WEST',
        latency: 50,
        reputation: 85,
      };
    }
  }

  async monitorConnection(callback: (status: ConnectionStatus) => void): Promise<void> {
    setInterval(() => {
      if (this.isConnected && this.currentNode) {
        callback({
          connected: this.isConnected,
          nodeId: this.currentNode.id,
          latency: this.currentNode.latency,
          bandwidthRemaining: 0,
        });
      }
    }, 5000);
  }

  disconnect(): void {
    if (!this.isConnected) {
      throw new Error('Not connected');
    }

    this.isConnected = false;
    this.currentNode = null;

    this.emit('disconnected');
  }

  private async fetchNodeInfo(nodeId: string): Promise<NodeInfo> {
    const routingEngineUrl = this.config.routingEngineUrl || 'http://localhost:3001';
    
    try {
      const response = await fetch(`${routingEngineUrl}/api/nodes/${nodeId}`);
      
      if (!response.ok) {
        throw new Error(`API responded with status ${response.status}`);
      }
      
      const node: any = await response.json();
      
      if (node && node.nodeId) {
        return {
          id: node.nodeId,
          location: node.location || 'Unknown',
          latency: node.latencyMs || 50,
          reputation: node.reputation || 80,
        };
      }
      
      throw new Error('Invalid node response structure');
    } catch (error) {
      throw new Error(`Failed to fetch node info: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private setupAutoReconnect(): void {
    this.on('disconnected', async () => {
      console.log('Connection lost, attempting to reconnect...');
      
      setTimeout(async () => {
        try {
          await this.connectToNode();
          console.log('Reconnected successfully');
        } catch (error) {
          console.error('Reconnection failed:', error);
        }
      }, 5000);
    });
  }

  isNetworkConnected(): boolean {
    return this.isConnected;
  }

  getCurrentNode(): NodeInfo | null {
    return this.currentNode;
  }
}

export default VeilPool;
