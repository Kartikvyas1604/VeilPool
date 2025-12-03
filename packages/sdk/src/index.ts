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
  }): Promise<ConnectionStatus> {
    this.userId = options.userId;

    const optimalNode = await this.getOptimalNode();
    
    await this.connectToNode(optimalNode.id);

    if (options.autoReconnect) {
      this.setupAutoReconnect();
    }

    return {
      connected: this.isConnected,
      nodeId: this.currentNode?.id || null,
      latency: this.currentNode?.latency || 0,
      bandwidthRemaining: 0,
    };
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
      
      const decision = await response.json();
      
      return {
        id: decision.primaryNode.nodeId,
        location: decision.primaryNode.location,
        latency: decision.primaryNode.latencyMs,
        reputation: decision.primaryNode.reputation,
      };
    } catch (error) {
      console.error('Failed to fetch optimal node:', error);
      
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
      const node = await response.json();
      
      return {
        id: node.nodeId,
        location: node.location,
        latency: node.latencyMs,
        reputation: node.reputation,
      };
    } catch (error) {
      throw new Error(`Failed to fetch node info: ${error}`);
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
