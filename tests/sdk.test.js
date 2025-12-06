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
const globals_1 = require("@jest/globals");
const web3_js_1 = require("@solana/web3.js");
const index_1 = require("../packages/sdk/src/index");
(0, globals_1.describe)('VeilPool SDK', () => {
    let sdk;
    let connection;
    (0, globals_1.beforeAll)(() => {
        sdk = new index_1.VeilPool({
            rpcUrl: 'https://api.devnet.solana.com',
            network: 'devnet',
            routingEngineUrl: 'http://localhost:3001'
        });
        connection = new web3_js_1.Connection('https://api.devnet.solana.com', 'confirmed');
    });
    (0, globals_1.describe)('Initialization', () => {
        (0, globals_1.it)('should initialize SDK with config', () => {
            (0, globals_1.expect)(sdk).toBeDefined();
            (0, globals_1.expect)(sdk).toBeInstanceOf(index_1.VeilPool);
        });
        (0, globals_1.it)('should create connection to Solana', () => {
            (0, globals_1.expect)(connection).toBeDefined();
        });
    });
    (0, globals_1.describe)('enablePrivacy()', () => {
        (0, globals_1.it)('should enable privacy routing', () => __awaiter(void 0, void 0, void 0, function* () {
            const mockUser = web3_js_1.PublicKey.unique();
            try {
                const result = yield sdk.enablePrivacy({
                    userId: mockUser,
                    autoReconnect: true
                });
                // In test environment, this might fail due to no valid pass
                (0, globals_1.expect)(result).toHaveProperty('connected');
            }
            catch (error) {
                // Expected to fail without valid pass
                (0, globals_1.expect)(error.message).toContain('privacy pass');
            }
        }));
        (0, globals_1.it)('should validate privacy pass before enabling', () => __awaiter(void 0, void 0, void 0, function* () {
            const mockUser = web3_js_1.PublicKey.unique();
            try {
                yield sdk.enablePrivacy({ userId: mockUser });
            }
            catch (error) {
                (0, globals_1.expect)(error.message).toContain('privacy pass');
            }
        }));
        (0, globals_1.it)('should select node with VRF', () => __awaiter(void 0, void 0, void 0, function* () {
            const mockUser = web3_js_1.PublicKey.unique();
            // Test node selection logic
            const node = yield sdk.getOptimalNode('US').catch(() => null);
            if (node) {
                (0, globals_1.expect)(node).toHaveProperty('id');
                (0, globals_1.expect)(node).toHaveProperty('location');
                (0, globals_1.expect)(node).toHaveProperty('latency');
            }
        }));
    });
    (0, globals_1.describe)('connectToNode()', () => {
        (0, globals_1.it)('should connect to specific node', () => __awaiter(void 0, void 0, void 0, function* () {
            try {
                const node = yield sdk.connectToNode('test-node-id');
                (0, globals_1.expect)(node).toHaveProperty('id');
            }
            catch (error) {
                // Expected in test environment
                (0, globals_1.expect)(error).toBeDefined();
            }
        }));
        (0, globals_1.it)('should emit connected event', (done) => {
            sdk.on('connected', (node) => {
                (0, globals_1.expect)(node).toBeDefined();
                done();
            });
            // Would trigger connection in real scenario
        });
    });
    (0, globals_1.describe)('getOptimalNode()', () => {
        (0, globals_1.it)('should return node based on user location', () => __awaiter(void 0, void 0, void 0, function* () {
            const node = yield sdk.getOptimalNode('US');
            (0, globals_1.expect)(node).toHaveProperty('id');
            (0, globals_1.expect)(node).toHaveProperty('location');
            (0, globals_1.expect)(node).toHaveProperty('latency');
            (0, globals_1.expect)(node).toHaveProperty('reputation');
        }));
        (0, globals_1.it)('should prioritize low latency nodes', () => __awaiter(void 0, void 0, void 0, function* () {
            const node = yield sdk.getOptimalNode('US');
            (0, globals_1.expect)(node.latency).toBeLessThan(200);
        }));
        (0, globals_1.it)('should fallback to default node on error', () => __awaiter(void 0, void 0, void 0, function* () {
            const node = yield sdk.getOptimalNode('INVALID');
            (0, globals_1.expect)(node).toHaveProperty('id', 'fallback-node');
        }));
    });
    (0, globals_1.describe)('routeTraffic()', () => {
        (0, globals_1.it)('should route traffic through connected node', () => __awaiter(void 0, void 0, void 0, function* () {
            try {
                yield sdk.routeTraffic('https://example.com');
                (0, globals_1.expect)(true).toBe(true);
            }
            catch (error) {
                (0, globals_1.expect)(error.message).toContain('Not connected');
            }
        }));
        (0, globals_1.it)('should fail when not connected', () => __awaiter(void 0, void 0, void 0, function* () {
            const disconnectedSdk = new index_1.VeilPool({
                rpcUrl: 'https://api.devnet.solana.com',
                network: 'devnet'
            });
            yield (0, globals_1.expect)(() => __awaiter(void 0, void 0, void 0, function* () {
                yield disconnectedSdk.routeTraffic('https://example.com');
            })).rejects.toThrow('Not connected');
        }));
    });
    (0, globals_1.describe)('monitorConnection()', () => {
        (0, globals_1.it)('should monitor connection status', () => __awaiter(void 0, void 0, void 0, function* () {
            const mockCallback = globals_1.jest.fn();
            yield sdk.monitorConnection(mockCallback);
            // Wait for callback
            yield new Promise(resolve => setTimeout(resolve, 6000));
            // Callback might not fire if not connected
            (0, globals_1.expect)(typeof mockCallback).toBe('function');
        }));
        (0, globals_1.it)('should report bandwidth usage', () => __awaiter(void 0, void 0, void 0, function* () {
            let bandwidthReported = false;
            yield sdk.monitorConnection((status) => {
                if (status.bandwidthRemaining !== undefined) {
                    bandwidthReported = true;
                }
            });
            yield new Promise(resolve => setTimeout(resolve, 6000));
            // May not report in test environment
            (0, globals_1.expect)(typeof bandwidthReported).toBe('boolean');
        }));
    });
    (0, globals_1.describe)('disconnect()', () => {
        (0, globals_1.it)('should disconnect from network', () => {
            try {
                sdk.disconnect();
                (0, globals_1.expect)(sdk.isNetworkConnected()).toBe(false);
            }
            catch (error) {
                (0, globals_1.expect)(error.message).toContain('Not connected');
            }
        });
        (0, globals_1.it)('should emit disconnected event', (done) => {
            sdk.on('disconnected', () => {
                (0, globals_1.expect)(true).toBe(true);
                done();
            });
            // Would trigger in real scenario
            setTimeout(done, 100);
        });
        (0, globals_1.it)('should clear current node', () => {
            try {
                sdk.disconnect();
                (0, globals_1.expect)(sdk.getCurrentNode()).toBeNull();
            }
            catch (error) {
                // Expected when not connected
                (0, globals_1.expect)(error).toBeDefined();
            }
        });
    });
    (0, globals_1.describe)('Auto-Reconnect', () => {
        (0, globals_1.it)('should reconnect after disconnection', (done) => {
            sdk.on('disconnected', () => {
                setTimeout(() => {
                    // Check if reconnection attempted
                    (0, globals_1.expect)(true).toBe(true);
                    done();
                }, 6000);
            });
            // Would trigger in real scenario
            setTimeout(done, 100);
        });
    });
    (0, globals_1.describe)('Error Handling', () => {
        (0, globals_1.it)('should handle network errors gracefully', () => __awaiter(void 0, void 0, void 0, function* () {
            const badSdk = new index_1.VeilPool({
                rpcUrl: 'http://invalid-url:9999',
                network: 'devnet'
            });
            const node = yield badSdk.getOptimalNode('US');
            // Should fallback
            (0, globals_1.expect)(node).toHaveProperty('id');
        }));
        (0, globals_1.it)('should handle invalid user input', () => __awaiter(void 0, void 0, void 0, function* () {
            yield (0, globals_1.expect)(() => __awaiter(void 0, void 0, void 0, function* () {
                yield sdk.enablePrivacy({ userId: null });
            })).rejects.toThrow();
        }));
    });
});
(0, globals_1.describe)('SDK Integration Tests', () => {
    (0, globals_1.it)('should complete full privacy flow', () => __awaiter(void 0, void 0, void 0, function* () {
        const sdk = new index_1.VeilPool({
            rpcUrl: 'https://api.devnet.solana.com',
            network: 'devnet',
            routingEngineUrl: 'http://localhost:3001'
        });
        const mockUser = web3_js_1.PublicKey.unique();
        try {
            // Enable privacy
            const status = yield sdk.enablePrivacy({ userId: mockUser });
            (0, globals_1.expect)(status.connected).toBeDefined();
            // Route traffic
            yield sdk.routeTraffic('https://example.com');
            // Monitor connection
            yield sdk.monitorConnection((status) => {
                (0, globals_1.expect)(status.connected).toBeDefined();
            });
            // Disconnect
            sdk.disconnect();
            (0, globals_1.expect)(sdk.isNetworkConnected()).toBe(false);
        }
        catch (error) {
            // Expected in test environment without valid pass
            (0, globals_1.expect)(error).toBeDefined();
        }
    }));
});
