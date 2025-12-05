import { Connection, PublicKey } from '@solana/web3.js';
import { NodeHealthMetrics } from './types';

const NODE_REGISTRY_PROGRAM_ID = new PublicKey('4STuqLYGcLs9Py4TfyBct1dn8pSgMiFsPygifp47bpXo');

export class NodeMonitor {
  private connection: Connection;
  private nodeCache: Map<string, NodeHealthMetrics> = new Map();
  private healthCheckInterval: NodeJS.Timeout | null = null;

  constructor(rpcUrl: string) {
    this.connection = new Connection(rpcUrl, 'confirmed');
  }

  async startMonitoring(): Promise<void> {
    console.log('Starting node health monitoring...');
    
    await this.fetchAllNodes();
    
    this.healthCheckInterval = setInterval(async () => {
      await this.updateNodeHealth();
    }, 60000);
  }

  stopMonitoring(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }

  async fetchAllNodes(): Promise<NodeHealthMetrics[]> {
    try {
      const programAccounts = await this.connection.getProgramAccounts(
        NODE_REGISTRY_PROGRAM_ID,
        {
          filters: [
            { dataSize: 8 + 200 },
          ],
        }
      );

      const nodes: NodeHealthMetrics[] = [];

      for (const account of programAccounts) {
        try {
          const node = this.parseNodeAccount(account.account.data, account.pubkey.toString());
          if (node.isActive) {
            this.nodeCache.set(node.nodeId, node);
            nodes.push(node);
          }
        } catch (error) {
          console.error(`Failed to parse node account: ${error}`);
        }
      }

      console.log(`Fetched ${nodes.length} active nodes`);
      return nodes;
    } catch (error) {
      console.error('Failed to fetch nodes:', error);
      return [];
    }
  }

  private parseNodeAccount(data: Buffer, pubkey: string): NodeHealthMetrics {
    const reputation = data.readUInt8(40);
    const bandwidthGbps = data.readUInt16LE(41);
    const uptimePercentage = data.readUInt8(43);
    const lastHeartbeat = Number(data.readBigInt64LE(44));
    const isActive = data.readUInt8(52) === 1;

    const operatorOffset = 8;
    const operator = new PublicKey(data.slice(operatorOffset, operatorOffset + 32)).toString();

    const locationBytes = data.slice(60, 124);
    const locationStr = locationBytes.toString('utf8').replace(/\0/g, '').trim();
    const location = locationStr || 'UNKNOWN';

    return {
      nodeId: pubkey,
      operator,
      location,
      latencyMs: Math.floor(Math.random() * 150) + 20,
      uptimePercentage,
      reputation,
      bandwidthGbps,
      pricePerGb: 0.5,
      lastHeartbeat,
      isActive,
      threatLevel: 0,
      connectionSuccessRate: 0.95,
      packetLossRate: 0.01,
    };
  }

  async updateNodeHealth(): Promise<void> {
    console.log('Updating node health metrics...');
    
    const nodes = Array.from(this.nodeCache.values());
    const now = Date.now() / 1000;

    for (const node of nodes) {
      try {
        const latency = await this.pingNode(node.nodeId);
        
        node.latencyMs = latency;
        
        const timeSinceHeartbeat = now - node.lastHeartbeat;
        if (timeSinceHeartbeat > 300) {
          node.isActive = false;
          console.warn(`Node ${node.nodeId} marked inactive - no heartbeat`);
        }

        this.nodeCache.set(node.nodeId, node);
      } catch (error) {
        console.error(`Health check failed for ${node.nodeId}:`, error);
      }
    }
  }

  private async pingNode(nodeId: string): Promise<number> {
    const startTime = Date.now();
    
    await new Promise(resolve => setTimeout(resolve, Math.random() * 50));
    
    return Date.now() - startTime;
  }

  getActiveNodes(): NodeHealthMetrics[] {
    return Array.from(this.nodeCache.values())
      .filter(node => node.isActive)
      .sort((a, b) => b.reputation - a.reputation);
  }

  getNodesByLocation(location: string): NodeHealthMetrics[] {
    return this.getActiveNodes().filter(node => 
      node.location.startsWith(location)
    );
  }

  getNodeById(nodeId: string): NodeHealthMetrics | undefined {
    return this.nodeCache.get(nodeId);
  }

  getNodeCount(): number {
    return this.nodeCache.size;
  }

  getAverageLatency(): number {
    const nodes = this.getActiveNodes();
    if (nodes.length === 0) return 0;
    
    const totalLatency = nodes.reduce((sum, node) => sum + node.latencyMs, 0);
    return totalLatency / nodes.length;
  }

  getAverageUptime(): number {
    const nodes = this.getActiveNodes();
    if (nodes.length === 0) return 0;
    
    const totalUptime = nodes.reduce((sum, node) => sum + node.uptimePercentage, 0);
    return totalUptime / nodes.length;
  }
}
