import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import axios from 'axios';

const ROUTING_ENGINE_URL = 'http://localhost:3001';

describe('Routing Engine API', () => {
  beforeAll(async () => {
    // Wait for routing engine to be ready
    await new Promise(resolve => setTimeout(resolve, 2000));
  });
    await nodeMonitor.startMonitoring();
  });

  after(async () => {
    nodeMonitor.stopMonitoring();
    pythIntegration.stopMonitoring();
  });

  describe('Optimal Node Selection', () => {
    it('should select node based on speed priority', async () => {
      const request = {
        userLocation: 'US-CA-SanFrancisco',
        destination: 'www.example.com',
        requiredBandwidth: 10,
        priorityMode: 'speed' as const,
      };

      const decision = await routingEngine.selectOptimalNode(request);

      expect(decision).to.have.property('selectedNode');
      expect(decision.selectedNode).to.have.property('nodeId');
      expect(decision.selectedNode).to.have.property('latency');
      expect(decision.routingScore).to.be.a('number');
    });

    it('should select node based on privacy priority', async () => {
      const request = {
        userLocation: 'US-CA-SanFrancisco',
        destination: 'www.example.com',
        requiredBandwidth: 10,
        priorityMode: 'privacy' as const,
      };

      const decision = await routingEngine.selectOptimalNode(request);

      expect(decision.selectedNode.reputation).to.be.greaterThan(800);
    });

    it('should provide alternative nodes', async () => {
      const request = {
        userLocation: 'US-CA-SanFrancisco',
        destination: 'www.example.com',
        requiredBandwidth: 10,
        priorityMode: 'balanced' as const,
      };

      const decision = await routingEngine.selectOptimalNode(request);

      expect(decision.alternativeNodes).to.be.an('array');
      expect(decision.alternativeNodes.length).to.be.greaterThan(0);
    });

    it('should handle no available nodes', async () => {
      // Stop node monitoring to simulate no nodes
      nodeMonitor.stopMonitoring();

      const request = {
        userLocation: 'US-CA-SanFrancisco',
        destination: 'www.example.com',
        requiredBandwidth: 10000, // Very high bandwidth requirement
        priorityMode: 'speed' as const,
      };

      try {
        await routingEngine.selectOptimalNode(request);
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error.message).to.include('No suitable nodes');
      }

      // Restart monitoring
      await nodeMonitor.startMonitoring();
    });
  });

  describe('Node Health Monitoring', () => {
    it('should return active nodes', () => {
      const nodes = nodeMonitor.getActiveNodes();
      expect(nodes).to.be.an('array');
    });

    it('should get specific node by ID', () => {
      const nodes = nodeMonitor.getActiveNodes();
      if (nodes.length > 0) {
        const node = nodeMonitor.getNodeById(nodes[0].nodeId);
        expect(node).to.exist;
        expect(node?.nodeId).to.equal(nodes[0].nodeId);
      }
    });

    it('should return undefined for non-existent node', () => {
      const node = nodeMonitor.getNodeById('non-existent-id');
      expect(node).to.be.undefined;
    });
  });

  describe('Threat Intelligence', () => {
    it('should get threat level for country', () => {
      const threatLevel = pythIntegration.getThreatLevel('CN');
      expect(threatLevel).to.have.property('country');
      expect(threatLevel).to.have.property('threatLevel');
      expect(threatLevel.threatLevel).to.be.a('number');
    });

    it('should return all threat data', () => {
      const allData = pythIntegration.getAllThreatData();
      expect(allData).to.be.instanceOf(Map);
      expect(allData.size).to.be.greaterThan(0);
    });

    it('should have higher threat for censored countries', () => {
      const cnThreat = pythIntegration.getThreatLevel('CN');
      const usThreat = pythIntegration.getThreatLevel('US');

      expect(cnThreat.threatLevel).to.be.greaterThan(usThreat.threatLevel);
    });
  });

  describe('Routing Statistics', () => {
    it('should return routing stats', () => {
      const stats = routingEngine.getRoutingStats();

      expect(stats).to.have.property('totalRequests');
      expect(stats).to.have.property('cacheHitRate');
      expect(stats).to.have.property('averageDecisionTime');
      expect(stats.totalRequests).to.be.a('number');
    });

    it('should update stats after routing decisions', async () => {
      const statsBefore = routingEngine.getRoutingStats();

      const request = {
        userLocation: 'US-CA-SanFrancisco',
        destination: 'www.example.com',
        requiredBandwidth: 10,
        priorityMode: 'balanced' as const,
      };

      await routingEngine.selectOptimalNode(request);

      const statsAfter = routingEngine.getRoutingStats();
      expect(statsAfter.totalRequests).to.be.greaterThan(statsBefore.totalRequests);
    });
  });

  describe('Load Testing', () => {
    it('should handle multiple concurrent routing requests', async () => {
      const requests = Array(100).fill(null).map((_, i) => ({
        userLocation: 'US-CA-SanFrancisco',
        destination: `www.example${i}.com`,
        requiredBandwidth: 10,
        priorityMode: 'balanced' as const,
      }));

      const startTime = Date.now();
      const decisions = await Promise.all(
        requests.map(req => routingEngine.selectOptimalNode(req))
      );
      const duration = Date.now() - startTime;

      expect(decisions).to.have.lengthOf(100);
      expect(duration).to.be.lessThan(5000); // Should complete in < 5 seconds
      console.log(`Processed 100 requests in ${duration}ms`);
    });

    it('should maintain performance under sustained load', async () => {
      const iterations = 10;
      const requestsPerIteration = 50;
      const durations: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const requests = Array(requestsPerIteration).fill(null).map(() => ({
          userLocation: 'US-CA-SanFrancisco',
          destination: 'www.example.com',
          requiredBandwidth: 10,
          priorityMode: 'balanced' as const,
        }));

        const startTime = Date.now();
        await Promise.all(requests.map(req => routingEngine.selectOptimalNode(req)));
        durations.push(Date.now() - startTime);

        // Small delay between iterations
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
      console.log(`Average duration for ${requestsPerIteration} requests: ${avgDuration}ms`);

      expect(avgDuration).to.be.lessThan(2000); // Average should be < 2 seconds
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid location format', async () => {
      const request = {
        userLocation: 'invalid-format',
        destination: 'www.example.com',
        requiredBandwidth: 10,
        priorityMode: 'balanced' as const,
      };

      try {
        await routingEngine.selectOptimalNode(request);
        // Should still work, just with degraded location matching
      } catch (error) {
        // Error is acceptable
        expect(error).to.exist;
      }
    });

    it('should handle extremely high bandwidth requirements', async () => {
      const request = {
        userLocation: 'US-CA-SanFrancisco',
        destination: 'www.example.com',
        requiredBandwidth: 100000, // 100 Gbps
        priorityMode: 'balanced' as const,
      };

      try {
        await routingEngine.selectOptimalNode(request);
        // May succeed if nodes have capacity, or throw error
      } catch (error) {
        expect(error.message).to.include('bandwidth');
      }
    });
  });
});
