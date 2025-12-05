import { Connection, PublicKey, Transaction, Keypair, SystemProgram } from '@solana/web3.js';
import { AnchorProvider, Program, Wallet } from '@coral-xyz/anchor';
import axios, { AxiosInstance } from 'axios';
import WebSocket from 'ws';
import EventEmitter from 'eventemitter3';

export interface VeilPoolConfig {
  rpcEndpoint: string;
  routingEngineUrl: string;
  wallet?: Wallet;
  wsEndpoint?: string;
}

export interface VPNNode {
  nodeId: string;
  operator: string;
  country: string;
  city: string;
  latitude: number;
  longitude: number;
  bandwidth: number;
  latency: number;
  reputation: number;
  isActive: boolean;
  stakeAmount: number;
  totalEarnings: number;
}

/**
 * Routing decision result
 */
export interface RoutingDecision {
  selectedNode: VPNNode;
  alternativeNodes: VPNNode[];
  routingScore: number;
  estimatedLatency: number;
  cached?: boolean;
}

/**
 * Connection session information
 */
export interface ConnectionSession {
  sessionId: string;
  nodeId: string;
  userId: string;
  startTime: number;
  status: 'connecting' | 'connected' | 'disconnected' | 'failed';
  bytesTransferred?: number;
  encryptionKey?: string;
}

/**
 * Privacy pass details
 */
export interface PrivacyPass {
  passId: string;
  owner: string;
  tier: 'basic' | 'premium' | 'enterprise';
  purchasedAt: number;
  expiresAt: number;
  usageCount: number;
  isActive: boolean;
}

/**
 * Events emitted by VeilPoolClient
 */
interface VeilPoolEvents {
  connected: (session: ConnectionSession) => void;
  disconnected: (session: ConnectionSession) => void;
  nodeSwitch: (oldNode: string, newNode: string) => void;
  error: (error: Error) => void;
  statsUpdate: (stats: any) => void;
}

/**
 * Main VeilPool SDK Client
 */
export class VeilPoolClient extends EventEmitter<VeilPoolEvents> {
  private connection: Connection;
  private routingEngine: AxiosInstance;
  private ws: WebSocket | null = null;
  private config: VeilPoolConfig;
  private currentSession: ConnectionSession | null = null;

  constructor(config: VeilPoolConfig) {
    super();
    this.config = config;
    this.connection = new Connection(config.rpcEndpoint, 'confirmed');
    this.routingEngine = axios.create({
      baseURL: config.routingEngineUrl,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Initialize WebSocket connection for real-time updates
   */
  async connectWebSocket(): Promise<void> {
    const wsUrl = this.config.wsEndpoint || this.config.routingEngineUrl.replace(/^http/, 'ws');
    
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(wsUrl);

      this.ws.on('open', () => {
        console.log('WebSocket connected');
        this.ws?.send(JSON.stringify({ type: 'subscribe_routing' }));
        resolve();
      });

      this.ws.on('message', (data: WebSocket.Data) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleWebSocketMessage(message);
        } catch (error) {
          console.error('WebSocket message error:', error);
        }
      });

      this.ws.on('error', (error) => {
        this.emit('error', error as Error);
        reject(error);
      });

      this.ws.on('close', () => {
        console.log('WebSocket disconnected');
        this.ws = null;
      });
    });
  }

  private handleWebSocketMessage(message: any): void {
    switch (message.type) {
      case 'connection_established':
        this.emit('connected', message.data);
        break;
      case 'connection_terminated':
        this.emit('disconnected', message.data);
        break;
      case 'node_switched':
        this.emit('nodeSwitch', message.data.oldNode, message.data.newNode);
        break;
      case 'stats_update':
        this.emit('statsUpdate', message.data);
        break;
      case 'routing_update':
        // Handle routing updates
        break;
      default:
        console.log('Unknown message type:', message.type);
    }
  }

  /**
   * Get optimal VPN node based on user location and preferences
   */
  async getOptimalNode(
    userLocation: string,
    destination: string,
    priority: 'speed' | 'privacy' | 'balanced' = 'balanced'
  ): Promise<RoutingDecision> {
    const response = await this.routingEngine.get('/api/routing/optimal-node', {
      params: {
        user_location: userLocation,
        destination,
        priority,
      },
    });

    return response.data;
  }

  /**
   * Get all active VPN nodes
   */
  async getActiveNodes(): Promise<VPNNode[]> {
    const response = await this.routingEngine.get('/api/nodes/health-status');
    return response.data.nodes;
  }

  /**
   * Get specific node details
   */
  async getNodeDetails(nodeId: string): Promise<VPNNode> {
    const response = await this.routingEngine.get(`/api/nodes/${nodeId}`);
    return response.data;
  }

  /**
   * Report a node failure
   */
  async reportNodeFailure(nodeId: string, reason: string): Promise<void> {
    await this.routingEngine.post('/api/routing/report-failure', {
      node_id: nodeId,
      failure_reason: reason,
    });
  }

  /**
   * Get threat intelligence for a country
   */
  async getThreatIntel(countryCode?: string): Promise<any> {
    const endpoint = countryCode 
      ? `/api/threat-intel/${countryCode}` 
      : '/api/threat-intel';
    const response = await this.routingEngine.get(endpoint);
    return response.data;
  }

  /**
   * Connect to VPN through selected node
   */
  async connect(nodeId: string, userId: string): Promise<ConnectionSession> {
    // Generate session ID
    const sessionId = this.generateSessionId();

    // Create connection session
    const session: ConnectionSession = {
      sessionId,
      nodeId,
      userId,
      startTime: Date.now(),
      status: 'connecting',
    };

    this.currentSession = session;

    // In production, this would establish actual VPN tunnel
    // For now, we'll simulate the connection
    await this.establishConnection(session);

    session.status = 'connected';
    this.emit('connected', session);

    return session;
  }

  /**
   * Disconnect from current VPN session
   */
  async disconnect(): Promise<void> {
    if (!this.currentSession) {
      throw new Error('No active session');
    }

    this.currentSession.status = 'disconnected';
    this.emit('disconnected', this.currentSession);
    this.currentSession = null;
  }

  /**
   * Get current connection session
   */
  getCurrentSession(): ConnectionSession | null {
    return this.currentSession;
  }

  /**
   * Purchase a privacy pass on-chain
   */
  async purchasePass(
    tier: 'basic' | 'premium' | 'enterprise',
    duration: number
  ): Promise<string> {
    if (!this.config.wallet) {
      throw new Error('Wallet not configured');
    }

    // In production, this would interact with the Solana program
    // For now, return a mock transaction signature
    const mockTxSignature = this.generateSessionId();
    
    console.log(`Purchasing ${tier} pass for ${duration} days`);
    return mockTxSignature;
  }

  /**
   * Get user's active privacy passes
   */
  async getMyPasses(): Promise<PrivacyPass[]> {
    if (!this.config.wallet) {
      throw new Error('Wallet not configured');
    }

    // In production, fetch from Solana program
    return [];
  }

  /**
   * Get routing engine statistics
   */
  async getStats(): Promise<any> {
    const response = await this.routingEngine.get('/api/stats');
    return response.data;
  }

  /**
   * Check health of routing engine
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.routingEngine.get('/api/health');
      return response.data.status === 'healthy';
    } catch {
      return false;
    }
  }

  private async establishConnection(session: ConnectionSession): Promise<void> {
    // Simulate connection establishment
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  private generateSessionId(): string {
    return `veilpool_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Close all connections and cleanup
   */
  async close(): Promise<void> {
    if (this.currentSession) {
      await this.disconnect();
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.removeAllListeners();
  }
}

/**
 * Node Operator SDK - For running VPN nodes
 */
export class NodeOperatorSDK {
  private connection: Connection;
  private config: VeilPoolConfig;

  constructor(config: VeilPoolConfig) {
    this.config = config;
    this.connection = new Connection(config.rpcEndpoint, 'confirmed');
  }

  /**
   * Register a new VPN node
   */
  async registerNode(
    country: string,
    city: string,
    bandwidth: number,
    stakeAmount: number
  ): Promise<string> {
    if (!this.config.wallet) {
      throw new Error('Wallet not configured');
    }

    console.log('Registering node:', { country, city, bandwidth, stakeAmount });
    
    // In production, interact with node-registry program
    return 'mock_tx_signature';
  }

  /**
   * Update node heartbeat
   */
  async sendHeartbeat(nodeId: string): Promise<void> {
    console.log('Sending heartbeat for node:', nodeId);
    // In production, call update_heartbeat instruction
  }

  /**
   * Claim earnings
   */
  async claimEarnings(nodeId: string): Promise<string> {
    console.log('Claiming earnings for node:', nodeId);
    return 'mock_tx_signature';
  }

  /**
   * Unstake from node
   */
  async unstake(nodeId: string, amount: number): Promise<string> {
    console.log('Unstaking:', amount, 'from node:', nodeId);
    return 'mock_tx_signature';
  }
}

/**
 * Sponsor SDK - For creating privacy pools
 */
export class SponsorSDK {
  private connection: Connection;
  private config: VeilPoolConfig;

  constructor(config: VeilPoolConfig) {
    this.config = config;
    this.connection = new Connection(config.rpcEndpoint, 'confirmed');
  }

  /**
   * Create a new privacy pool
   */
  async createPool(
    name: string,
    description: string,
    fundingAmount: number
  ): Promise<string> {
    if (!this.config.wallet) {
      throw new Error('Wallet not configured');
    }

    console.log('Creating privacy pool:', { name, description, fundingAmount });
    
    // In production, interact with privacy-pool program
    return 'mock_tx_signature';
  }

  /**
   * Add beneficiaries to pool
   */
  async addBeneficiaries(poolId: string, beneficiaries: string[]): Promise<string> {
    console.log('Adding beneficiaries to pool:', poolId, beneficiaries);
    return 'mock_tx_signature';
  }

  /**
   * Fund existing pool
   */
  async fundPool(poolId: string, amount: number): Promise<string> {
    console.log('Funding pool:', poolId, 'with amount:', amount);
    return 'mock_tx_signature';
  }
}

/**
 * Factory function to create VeilPool client
 */
export function createVeilPoolClient(config: VeilPoolConfig): VeilPoolClient {
  return new VeilPoolClient(config);
}

/**
 * Factory function to create Node Operator SDK
 */
export function createNodeOperatorSDK(config: VeilPoolConfig): NodeOperatorSDK {
  return new NodeOperatorSDK(config);
}

/**
 * Factory function to create Sponsor SDK
 */
export function createSponsorSDK(config: VeilPoolConfig): SponsorSDK {
  return new SponsorSDK(config);
}

// Export types
export * from './types';
