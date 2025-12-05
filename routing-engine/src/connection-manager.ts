import { NodeHealthMetrics } from './types';
import { logger } from './logger';
import { EventEmitter } from 'events';

interface ActiveConnection {
  connectionId: string;
  userId: string;
  nodeId: string;
  startTime: number;
  bytesTransferred: number;
  packetsTransmitted: number;
  packetsReceived: number;
  lastActivity: number;
  isActive: boolean;
}

interface TrafficStats {
  totalConnections: number;
  activeConnections: number;
  totalBytesTransferred: number;
  averageLatency: number;
  failedConnections: number;
  successRate: number;
}

export class ConnectionManager extends EventEmitter {
  private activeConnections: Map<string, ActiveConnection> = new Map();
  private connectionHistory: ActiveConnection[] = [];
  private trafficStats: TrafficStats = {
    totalConnections: 0,
    activeConnections: 0,
    totalBytesTransferred: 0,
    averageLatency: 0,
    failedConnections: 0,
    successRate: 100,
  };

  constructor() {
    super();
    this.startConnectionMonitoring();
  }

  async establishConnection(
    userId: string,
    node: NodeHealthMetrics,
    correlationId?: string
  ): Promise<string> {
    const connectionId = this.generateConnectionId();

    logger.info('Establishing connection', {
      connectionId,
      userId,
      nodeId: node.nodeId,
      location: node.location,
    }, correlationId);

    const connection: ActiveConnection = {
      connectionId,
      userId,
      nodeId: node.nodeId,
      startTime: Date.now(),
      bytesTransferred: 0,
      packetsTransmitted: 0,
      packetsReceived: 0,
      lastActivity: Date.now(),
      isActive: true,
    };

    this.activeConnections.set(connectionId, connection);
    this.trafficStats.totalConnections++;
    this.trafficStats.activeConnections++;

    this.emit('connectionEstablished', {
      connectionId,
      userId,
      nodeId: node.nodeId,
      timestamp: Date.now(),
    });

    logger.info('Connection established successfully', {
      connectionId,
      nodeId: node.nodeId,
    }, correlationId);

    return connectionId;
  }

  async routeTraffic(
    connectionId: string,
    data: Buffer,
    correlationId?: string
  ): Promise<boolean> {
    const connection = this.activeConnections.get(connectionId);
    
    if (!connection || !connection.isActive) {
      logger.warn('Attempted to route traffic on inactive connection', {
        connectionId,
      }, correlationId);
      return false;
    }

    connection.bytesTransferred += data.length;
    connection.packetsTransmitted++;
    connection.lastActivity = Date.now();

    this.trafficStats.totalBytesTransferred += data.length;

    this.emit('trafficRouted', {
      connectionId,
      bytes: data.length,
      timestamp: Date.now(),
    });

    return true;
  }

  async terminateConnection(connectionId: string, correlationId?: string): Promise<void> {
    const connection = this.activeConnections.get(connectionId);
    
    if (!connection) {
      logger.warn('Attempted to terminate non-existent connection', {
        connectionId,
      }, correlationId);
      return;
    }

    connection.isActive = false;
    this.trafficStats.activeConnections--;

    this.connectionHistory.push(connection);
    this.activeConnections.delete(connectionId);

    if (this.connectionHistory.length > 10000) {
      this.connectionHistory = this.connectionHistory.slice(-5000);
    }

    logger.info('Connection terminated', {
      connectionId,
      duration: Date.now() - connection.startTime,
      bytesTransferred: connection.bytesTransferred,
    }, correlationId);

    this.emit('connectionTerminated', {
      connectionId,
      bytesTransferred: connection.bytesTransferred,
      duration: Date.now() - connection.startTime,
      timestamp: Date.now(),
    });
  }

  async switchNode(
    connectionId: string,
    newNode: NodeHealthMetrics,
    reason: string,
    correlationId?: string
  ): Promise<boolean> {
    const connection = this.activeConnections.get(connectionId);
    
    if (!connection || !connection.isActive) {
      logger.warn('Attempted to switch node on inactive connection', {
        connectionId,
      }, correlationId);
      return false;
    }

    const oldNodeId = connection.nodeId;
    connection.nodeId = newNode.nodeId;
    connection.lastActivity = Date.now();

    logger.info('Node switched for connection', {
      connectionId,
      oldNodeId,
      newNodeId: newNode.nodeId,
      reason,
    }, correlationId);

    this.emit('nodeSwitched', {
      connectionId,
      oldNodeId,
      newNodeId: newNode.nodeId,
      reason,
      timestamp: Date.now(),
    });

    return true;
  }

  getActiveConnection(connectionId: string): ActiveConnection | undefined {
    return this.activeConnections.get(connectionId);
  }

  getUserConnections(userId: string): ActiveConnection[] {
    return Array.from(this.activeConnections.values())
      .filter(conn => conn.userId === userId && conn.isActive);
  }

  getNodeConnections(nodeId: string): ActiveConnection[] {
    return Array.from(this.activeConnections.values())
      .filter(conn => conn.nodeId === nodeId && conn.isActive);
  }

  getTrafficStats(): TrafficStats {
    const activeConns = Array.from(this.activeConnections.values());
    const now = Date.now();
    
    const avgLatency = activeConns.length > 0
      ? activeConns.reduce((sum, conn) => sum + (now - conn.lastActivity), 0) / activeConns.length
      : 0;

    const successRate = this.trafficStats.totalConnections > 0
      ? ((this.trafficStats.totalConnections - this.trafficStats.failedConnections) / 
         this.trafficStats.totalConnections) * 100
      : 100;

    return {
      ...this.trafficStats,
      activeConnections: this.activeConnections.size,
      averageLatency: Math.round(avgLatency),
      successRate: Math.round(successRate * 100) / 100,
    };
  }

  getConnectionHistory(limit: number = 100): ActiveConnection[] {
    return this.connectionHistory.slice(-limit);
  }

  private generateConnectionId(): string {
    return `conn_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }

  private startConnectionMonitoring(): void {
    setInterval(() => {
      const now = Date.now();
      const staleTimeout = 300000; // 5 minutes

      for (const [connectionId, connection] of this.activeConnections.entries()) {
        if (now - connection.lastActivity > staleTimeout) {
          logger.warn('Connection inactive for too long, terminating', {
            connectionId,
            nodeId: connection.nodeId,
            inactiveDuration: now - connection.lastActivity,
          });

          this.terminateConnection(connectionId);
        }
      }
    }, 60000);
  }

  async recordFailedConnection(
    userId: string,
    nodeId: string,
    reason: string,
    correlationId?: string
  ): Promise<void> {
    this.trafficStats.failedConnections++;

    logger.error('Connection failed', {
      userId,
      nodeId,
      reason,
    }, correlationId);

    this.emit('connectionFailed', {
      userId,
      nodeId,
      reason,
      timestamp: Date.now(),
    });
  }
}
