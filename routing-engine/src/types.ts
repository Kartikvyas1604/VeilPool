export interface NodeHealthMetrics {
  nodeId: string;
  operator: string;
  location: string;
  latencyMs: number;
  uptimePercentage: number;
  reputation: number;
  bandwidthGbps: number;
  pricePerGb: number;
  lastHeartbeat: number;
  isActive: boolean;
  threatLevel: number;
  connectionSuccessRate?: number;
  packetLossRate?: number;
  avgResponseTime?: number;
  lastHealthCheck?: number;
}

export interface ThreatIntelligence {
  countryCode: string;
  threatLevel: number;
  censorshipScore: number;
  dpiDetected: boolean;
  lastUpdated: number;
  sources: string[];
}

export interface RoutingDecision {
  primaryNode: NodeHealthMetrics;
  fallbackNodes: NodeHealthMetrics[];
  routingScore: number;
  estimatedLatency: number;
  threatAvoidance: boolean;
  timestamp: number;
}

export interface UserRoutingRequest {
  userLocation: string;
  destination: string;
  requiredBandwidth: number;
  priorityMode: 'speed' | 'privacy' | 'balanced';
}
