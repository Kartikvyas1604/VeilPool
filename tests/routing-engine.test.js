"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const routing_engine_1 = require("../routing-engine/src/routing-engine");
const node_monitor_1 = require("../routing-engine/src/node-monitor");
const pyth_integration_1 = require("../routing-engine/src/pyth-integration");
describe('Routing Engine Integration Tests', () => {
    let routingEngine;
    let nodeMonitor;
    let pythIntegration;
    const mockRpcUrl = 'https://api.devnet.solana.com';
    const mockPythEndpoint = 'https://pyth.network';
    before(() => __awaiter(void 0, void 0, void 0, function* () {
        nodeMonitor = new node_monitor_1.NodeMonitor(mockRpcUrl);
        pythIntegration = new pyth_integration_1.PythIntegration(mockPythEndpoint);
        routingEngine = new routing_engine_1.RoutingEngine(nodeMonitor, pythIntegration);
        // Add mock nodes for testing
        yield nodeMonitor.startMonitoring();
    }));
    after(() => __awaiter(void 0, void 0, void 0, function* () {
        nodeMonitor.stopMonitoring();
        pythIntegration.stopMonitoring();
    }));
    describe('Optimal Node Selection', () => {
        it('should select node based on speed priority', () => __awaiter(void 0, void 0, void 0, function* () {
            const request = {
                userLocation: 'US-CA-SanFrancisco',
                destination: 'www.example.com',
                requiredBandwidth: 10,
                priorityMode: 'speed',
            };
            const decision = yield routingEngine.selectOptimalNode(request);
            (0, chai_1.expect)(decision).to.have.property('selectedNode');
            (0, chai_1.expect)(decision.selectedNode).to.have.property('nodeId');
            (0, chai_1.expect)(decision.selectedNode).to.have.property('latency');
            (0, chai_1.expect)(decision.routingScore).to.be.a('number');
        }));
        it('should select node based on privacy priority', () => __awaiter(void 0, void 0, void 0, function* () {
            const request = {
                userLocation: 'US-CA-SanFrancisco',
                destination: 'www.example.com',
                requiredBandwidth: 10,
                priorityMode: 'privacy',
            };
            const decision = yield routingEngine.selectOptimalNode(request);
            (0, chai_1.expect)(decision.selectedNode.reputation).to.be.greaterThan(800);
        }));
        it('should provide alternative nodes', () => __awaiter(void 0, void 0, void 0, function* () {
            const request = {
                userLocation: 'US-CA-SanFrancisco',
                destination: 'www.example.com',
                requiredBandwidth: 10,
                priorityMode: 'balanced',
            };
            const decision = yield routingEngine.selectOptimalNode(request);
            (0, chai_1.expect)(decision.alternativeNodes).to.be.an('array');
            (0, chai_1.expect)(decision.alternativeNodes.length).to.be.greaterThan(0);
        }));
        it('should handle no available nodes', () => __awaiter(void 0, void 0, void 0, function* () {
            // Stop node monitoring to simulate no nodes
            nodeMonitor.stopMonitoring();
            const request = {
                userLocation: 'US-CA-SanFrancisco',
                destination: 'www.example.com',
                requiredBandwidth: 10000, // Very high bandwidth requirement
                priorityMode: 'speed',
            };
            try {
                yield routingEngine.selectOptimalNode(request);
                chai_1.expect.fail('Should have thrown error');
            }
            catch (error) {
                (0, chai_1.expect)(error.message).to.include('No suitable nodes');
            }
            // Restart monitoring
            yield nodeMonitor.startMonitoring();
        }));
    });
    describe('Node Health Monitoring', () => {
        it('should return active nodes', () => {
            const nodes = nodeMonitor.getActiveNodes();
            (0, chai_1.expect)(nodes).to.be.an('array');
        });
        it('should get specific node by ID', () => {
            const nodes = nodeMonitor.getActiveNodes();
            if (nodes.length > 0) {
                const node = nodeMonitor.getNodeById(nodes[0].nodeId);
                (0, chai_1.expect)(node).to.exist;
                (0, chai_1.expect)(node === null || node === void 0 ? void 0 : node.nodeId).to.equal(nodes[0].nodeId);
            }
        });
        it('should return undefined for non-existent node', () => {
            const node = nodeMonitor.getNodeById('non-existent-id');
            (0, chai_1.expect)(node).to.be.undefined;
        });
    });
    describe('Threat Intelligence', () => {
        it('should get threat level for country', () => {
            const threatLevel = pythIntegration.getThreatLevel('CN');
            (0, chai_1.expect)(threatLevel).to.have.property('country');
            (0, chai_1.expect)(threatLevel).to.have.property('threatLevel');
            (0, chai_1.expect)(threatLevel.threatLevel).to.be.a('number');
        });
        it('should return all threat data', () => {
            const allData = pythIntegration.getAllThreatData();
            (0, chai_1.expect)(allData).to.be.instanceOf(Map);
            (0, chai_1.expect)(allData.size).to.be.greaterThan(0);
        });
        it('should have higher threat for censored countries', () => {
            const cnThreat = pythIntegration.getThreatLevel('CN');
            const usThreat = pythIntegration.getThreatLevel('US');
            (0, chai_1.expect)(cnThreat.threatLevel).to.be.greaterThan(usThreat.threatLevel);
        });
    });
    describe('Routing Statistics', () => {
        it('should return routing stats', () => {
            const stats = routingEngine.getRoutingStats();
            (0, chai_1.expect)(stats).to.have.property('totalRequests');
            (0, chai_1.expect)(stats).to.have.property('cacheHitRate');
            (0, chai_1.expect)(stats).to.have.property('averageDecisionTime');
            (0, chai_1.expect)(stats.totalRequests).to.be.a('number');
        });
        it('should update stats after routing decisions', () => __awaiter(void 0, void 0, void 0, function* () {
            const statsBefore = routingEngine.getRoutingStats();
            const request = {
                userLocation: 'US-CA-SanFrancisco',
                destination: 'www.example.com',
                requiredBandwidth: 10,
                priorityMode: 'balanced',
            };
            yield routingEngine.selectOptimalNode(request);
            const statsAfter = routingEngine.getRoutingStats();
            (0, chai_1.expect)(statsAfter.totalRequests).to.be.greaterThan(statsBefore.totalRequests);
        }));
    });
    describe('Load Testing', () => {
        it('should handle multiple concurrent routing requests', () => __awaiter(void 0, void 0, void 0, function* () {
            const requests = Array(100).fill(null).map((_, i) => ({
                userLocation: 'US-CA-SanFrancisco',
                destination: `www.example${i}.com`,
                requiredBandwidth: 10,
                priorityMode: 'balanced',
            }));
            const startTime = Date.now();
            const decisions = yield Promise.all(requests.map(req => routingEngine.selectOptimalNode(req)));
            const duration = Date.now() - startTime;
            (0, chai_1.expect)(decisions).to.have.lengthOf(100);
            (0, chai_1.expect)(duration).to.be.lessThan(5000); // Should complete in < 5 seconds
            console.log(`Processed 100 requests in ${duration}ms`);
        }));
        it('should maintain performance under sustained load', () => __awaiter(void 0, void 0, void 0, function* () {
            const iterations = 10;
            const requestsPerIteration = 50;
            const durations = [];
            for (let i = 0; i < iterations; i++) {
                const requests = Array(requestsPerIteration).fill(null).map(() => ({
                    userLocation: 'US-CA-SanFrancisco',
                    destination: 'www.example.com',
                    requiredBandwidth: 10,
                    priorityMode: 'balanced',
                }));
                const startTime = Date.now();
                yield Promise.all(requests.map(req => routingEngine.selectOptimalNode(req)));
                durations.push(Date.now() - startTime);
                // Small delay between iterations
                yield new Promise(resolve => setTimeout(resolve, 100));
            }
            const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
            console.log(`Average duration for ${requestsPerIteration} requests: ${avgDuration}ms`);
            (0, chai_1.expect)(avgDuration).to.be.lessThan(2000); // Average should be < 2 seconds
        }));
    });
    describe('Error Handling', () => {
        it('should handle invalid location format', () => __awaiter(void 0, void 0, void 0, function* () {
            const request = {
                userLocation: 'invalid-format',
                destination: 'www.example.com',
                requiredBandwidth: 10,
                priorityMode: 'balanced',
            };
            try {
                yield routingEngine.selectOptimalNode(request);
                // Should still work, just with degraded location matching
            }
            catch (error) {
                // Error is acceptable
                (0, chai_1.expect)(error).to.exist;
            }
        }));
        it('should handle extremely high bandwidth requirements', () => __awaiter(void 0, void 0, void 0, function* () {
            const request = {
                userLocation: 'US-CA-SanFrancisco',
                destination: 'www.example.com',
                requiredBandwidth: 100000, // 100 Gbps
                priorityMode: 'balanced',
            };
            try {
                yield routingEngine.selectOptimalNode(request);
                // May succeed if nodes have capacity, or throw error
            }
            catch (error) {
                (0, chai_1.expect)(error.message).to.include('bandwidth');
            }
        }));
    });
});
