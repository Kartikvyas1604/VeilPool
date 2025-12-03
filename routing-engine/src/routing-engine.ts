import { NodeHealthMetrics, RoutingDecision, UserRoutingRequest } from './types';
import { NodeMonitor } from './node-monitor';
import { PythIntegration } from './pyth-integration';

export class RoutingEngine {
  private nodeMonitor: NodeMonitor;
  private pythIntegration: PythIntegration;

  constructor(nodeMonitor: NodeMonitor, pythIntegration: PythIntegration) {
    this.nodeMonitor = nodeMonitor;
    this.pythIntegration = pythIntegration;
  }

  async selectOptimalNode(request: UserRoutingRequest): Promise<RoutingDecision> {
    const startTime = Date.now();
    
    const userThreat = this.pythIntegration.getThreatLevel(request.userLocation);
    const activeNodes = this.nodeMonitor.getActiveNodes();

    if (activeNodes.length === 0) {
      throw new Error('No active nodes available');
    }

    const scoredNodes = activeNodes.map(node => {
      const nodeThreat = this.pythIntegration.getThreatLevel(
        node.location.split('-')[0]
      );

      return {
        node,
        score: this.calculateNodeScore(node, nodeThreat, request, userThreat.threatLevel),
      };
    });

    scoredNodes.sort((a, b) => b.score - a.score);

    const primaryNode = scoredNodes[0].node;
    const fallbackNodes = scoredNodes.slice(1, 4).map(s => s.node);

    const decision: RoutingDecision = {
      primaryNode,
      fallbackNodes,
      routingScore: scoredNodes[0].score,
      estimatedLatency: primaryNode.latencyMs,
      threatAvoidance: userThreat.threatLevel > 7,
      timestamp: Date.now(),
    };

    const processingTime = Date.now() - startTime;
    console.log(`Routing decision made in ${processingTime}ms for user in ${request.userLocation}`);

    return decision;
  }

  private calculateNodeScore(
    node: NodeHealthMetrics,
    nodeThreat: any,
    request: UserRoutingRequest,
    userThreatLevel: number
  ): number {
    const weights = this.getWeights(request.priorityMode);

    if (userThreatLevel > 7 && nodeThreat.threatLevel > 5) {
      return 0;
    }

    const reputationScore = node.reputation * weights.reputation;
    const latencyScore = (100 - Math.min(100, node.latencyMs / 10)) * weights.latency;
    const costScore = (100 - Math.min(100, node.pricePerGb * 100)) * weights.cost;
    const uptimeScore = node.uptimePercentage * weights.uptime;
    const safetyScore = (10 - nodeThreat.threatLevel) * 10 * weights.safety;

    const totalScore = reputationScore + latencyScore + costScore + uptimeScore + safetyScore;

    return Math.round(totalScore * 100) / 100;
  }

  private getWeights(mode: 'speed' | 'privacy' | 'balanced') {
    switch (mode) {
      case 'speed':
        return {
          reputation: 0.2,
          latency: 0.5,
          cost: 0.1,
          uptime: 0.15,
          safety: 0.05,
        };
      case 'privacy':
        return {
          reputation: 0.3,
          latency: 0.1,
          cost: 0.1,
          uptime: 0.2,
          safety: 0.3,
        };
      case 'balanced':
      default:
        return {
          reputation: 0.25,
          latency: 0.25,
          cost: 0.15,
          uptime: 0.2,
          safety: 0.15,
        };
    }
  }

  async getNearbyNodes(countryCode: string, limit: number = 10): Promise<NodeHealthMetrics[]> {
    const allNodes = this.nodeMonitor.getActiveNodes();
    
    const sameCountry = allNodes.filter(node => 
      node.location.startsWith(countryCode)
    );

    if (sameCountry.length >= limit) {
      return sameCountry.slice(0, limit);
    }

    const nearbyRegions = this.getNearbyRegions(countryCode);
    const nearbyNodes = allNodes.filter(node =>
      nearbyRegions.includes(node.location.split('-')[0])
    );

    return [...sameCountry, ...nearbyNodes].slice(0, limit);
  }

  private getNearbyRegions(countryCode: string): string[] {
    const regionMap: Record<string, string[]> = {
      'US': ['CA', 'MX', 'GB', 'DE'],
      'GB': ['DE', 'FR', 'NL', 'US'],
      'DE': ['NL', 'CH', 'FR', 'GB'],
      'CN': ['JP', 'KR', 'SG', 'TW'],
      'JP': ['KR', 'SG', 'TW', 'AU'],
    };

    return regionMap[countryCode] || [];
  }

  getRoutingStats() {
    return {
      totalNodes: this.nodeMonitor.getNodeCount(),
      averageLatency: this.nodeMonitor.getAverageLatency(),
      averageUptime: this.nodeMonitor.getAverageUptime(),
      highRiskCountries: this.pythIntegration.getHighRiskCountries(),
      safeCountries: this.pythIntegration.getSafeCountries(),
    };
  }
}
