/**
 * Shared type definitions for VeilPool SDK
 */

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

export interface RoutingDecision {
  selectedNode: VPNNode;
  alternativeNodes: VPNNode[];
  routingScore: number;
  estimatedLatency: number;
  cached?: boolean;
}

export interface ConnectionSession {
  sessionId: string;
  nodeId: string;
  userId: string;
  startTime: number;
  status: 'connecting' | 'connected' | 'disconnected' | 'failed';
  bytesTransferred?: number;
  encryptionKey?: string;
}

export interface PrivacyPass {
  passId: string;
  owner: string;
  tier: 'basic' | 'premium' | 'enterprise';
  purchasedAt: number;
  expiresAt: number;
  usageCount: number;
  isActive: boolean;
}

export interface PrivacyPool {
  poolId: string;
  sponsor: string;
  name: string;
  description: string;
  totalFunding: number;
  remainingFunds: number;
  beneficiaries: string[];
  isActive: boolean;
  createdAt: number;
}

export interface ThreatIntelligence {
  country: string;
  threatLevel: number;
  riskFactors: string[];
  lastUpdated: number;
  censorship: boolean;
  surveillance: boolean;
}

export interface NodeMetrics {
  nodeId: string;
  uptime: number;
  totalConnections: number;
  activeConnections: number;
  totalBytesTransferred: number;
  averageLatency: number;
  successRate: number;
}

export interface RoutingStats {
  totalRequests: number;
  cacheHitRate: number;
  averageDecisionTime: number;
  activeConnections: number;
  totalBytesRouted: number;
}

export type PassTier = 'basic' | 'premium' | 'enterprise';
export type PriorityMode = 'speed' | 'privacy' | 'balanced';
export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'failed';
