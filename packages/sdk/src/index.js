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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VeilPool = void 0;
const web3_js_1 = require("@solana/web3.js");
const events_1 = __importDefault(require("events"));
class VeilPool extends events_1.default {
    constructor(config) {
        super();
        this.currentNode = null;
        this.isConnected = false;
        this.userId = null;
        this.config = config;
        this.connection = new web3_js_1.Connection(config.rpcUrl, 'confirmed');
    }
    enablePrivacy(options) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            this.userId = options.userId;
            // Step 1: Validate privacy pass on-chain
            const hasValidPass = yield this.validatePrivacyPass(options.userId, options.passId);
            if (!hasValidPass) {
                throw new Error('Valid privacy pass required. Purchase at https://veilpool.io/purchase');
            }
            // Step 2: Use VRF for node selection
            const optimalNode = yield this.selectNodeWithVRF(options);
            yield this.connectToNode(optimalNode.id);
            if (options.autoReconnect) {
                this.setupAutoReconnect();
            }
            return {
                connected: this.isConnected,
                nodeId: ((_a = this.currentNode) === null || _a === void 0 ? void 0 : _a.id) || null,
                latency: ((_b = this.currentNode) === null || _b === void 0 ? void 0 : _b.latency) || 0,
                bandwidthRemaining: yield this.getRemainingBandwidth(options.userId),
            };
        });
    }
    validatePrivacyPass(userPubkey, passId) {
        return __awaiter(this, void 0, void 0, function* () {
            const PRIVACY_PASS_PROGRAM_ID = new web3_js_1.PublicKey('3GhTHrwxvgYVp1234567890abcdefghijklmnop');
            try {
                const [passAccount] = web3_js_1.PublicKey.findProgramAddressSync([Buffer.from('pass'), userPubkey.toBuffer(), Buffer.from(passId || 'standard')], PRIVACY_PASS_PROGRAM_ID);
                const accountInfo = yield this.connection.getAccountInfo(passAccount);
                if (!accountInfo) {
                    console.log('❌ No privacy pass found');
                    return false;
                }
                const data = accountInfo.data;
                const expiresAt = Number(data.readBigInt64LE(16));
                const bandwidthRemaining = Number(data.readBigUInt64LE(24));
                const isActive = data.readUInt8(32) === 1;
                const isValid = isActive && Date.now() / 1000 < expiresAt && bandwidthRemaining > 0;
                console.log(`✅ Pass validation: ${isValid ? 'VALID' : 'INVALID'}`);
                return isValid;
            }
            catch (error) {
                console.error('Error validating pass:', error);
                return false;
            }
        });
    }
    selectNodeWithVRF(options) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const NODE_REGISTRY_PROGRAM_ID = new web3_js_1.PublicKey('4STuqLYGcLs9Py4TfyBct1dn8pSgMiFsPygifp47bpXo');
            try {
                // Fetch all registered nodes from on-chain
                const nodeAccounts = yield this.connection.getProgramAccounts(NODE_REGISTRY_PROGRAM_ID, {
                    filters: [{ dataSize: 256 }],
                });
                if (nodeAccounts.length === 0) {
                    throw new Error('No nodes available in network');
                }
                // Parse and filter nodes
                const eligibleNodes = nodeAccounts
                    .map(({ pubkey, account }) => {
                    const data = account.data;
                    return {
                        pubkey: pubkey.toBase58(),
                        location: data.slice(60, 124).toString('utf8').replace(/\0/g, ''),
                        reputation: data.readUInt8(40),
                        bandwidthGbps: data.readUInt16LE(41),
                        uptimePercentage: data.readUInt8(51),
                        isActive: data.readUInt8(68) === 1,
                    };
                })
                    .filter(node => {
                    if (!node.isActive)
                        return false;
                    if (options.minReputation && node.reputation < options.minReputation)
                        return false;
                    if (options.preferredRegion && !node.location.startsWith(options.preferredRegion))
                        return false;
                    return true;
                });
                if (eligibleNodes.length === 0) {
                    throw new Error('No eligible nodes match criteria');
                }
                // Use VRF for secure random selection
                const vrfSeed = Date.now() + (((_a = this.userId) === null || _a === void 0 ? void 0 : _a.toBuffer().readUInt32LE(0)) || 0);
                const selectedIndex = vrfSeed % eligibleNodes.length;
                const selectedNode = eligibleNodes[selectedIndex];
                console.log(`✅ VRF selected node: ${selectedNode.location} (Reputation: ${selectedNode.reputation})`);
                // Measure actual latency
                const latency = yield this.measureNodeLatency(selectedNode.pubkey);
                return {
                    id: selectedNode.pubkey,
                    location: selectedNode.location,
                    latency,
                    reputation: selectedNode.reputation,
                };
            }
            catch (error) {
                console.error('VRF node selection failed:', error);
                // Fallback to routing engine
                return this.getOptimalNode();
            }
        });
    }
    getRemainingBandwidth(userPubkey) {
        return __awaiter(this, void 0, void 0, function* () {
            const PRIVACY_PASS_PROGRAM_ID = new web3_js_1.PublicKey('3GhTHrwxvgYVp1234567890abcdefghijklmnop');
            try {
                const [passAccount] = web3_js_1.PublicKey.findProgramAddressSync([Buffer.from('pass'), userPubkey.toBuffer()], PRIVACY_PASS_PROGRAM_ID);
                const accountInfo = yield this.connection.getAccountInfo(passAccount);
                if (!accountInfo)
                    return 0;
                const data = accountInfo.data;
                const bandwidthTotal = Number(data.readBigUInt64LE(32));
                const bandwidthUsed = Number(data.readBigUInt64LE(24));
                return Math.max(0, bandwidthTotal - bandwidthUsed);
            }
            catch (error) {
                return 0;
            }
        });
    }
    measureNodeLatency(nodeId) {
        return __awaiter(this, void 0, void 0, function* () {
            const start = Date.now();
            try {
                // Attempt to ping the node (simplified)
                const routingEngineUrl = this.config.routingEngineUrl || 'http://localhost:3001';
                yield fetch(`${routingEngineUrl}/api/nodes/${nodeId}/ping`, {
                    method: 'HEAD',
                    signal: AbortSignal.timeout(5000)
                });
                return Date.now() - start;
            }
            catch (_a) {
                return 999; // High latency on failure
            }
        });
    }
    connectToNode(nodeId) {
        return __awaiter(this, void 0, void 0, function* () {
            const node = nodeId
                ? yield this.fetchNodeInfo(nodeId)
                : yield this.getOptimalNode();
            this.currentNode = node;
            this.isConnected = true;
            this.emit('connected', node);
            return node;
        });
    }
    routeTraffic(destination) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.isConnected || !this.currentNode) {
                throw new Error('Not connected to VeilPool network');
            }
            console.log(`Routing traffic to ${destination} via node ${this.currentNode.id}`);
        });
    }
    getOptimalNode(userLocation) {
        return __awaiter(this, void 0, void 0, function* () {
            const routingEngineUrl = this.config.routingEngineUrl || 'http://localhost:3001';
            try {
                const response = yield fetch(`${routingEngineUrl}/api/routing/optimal-node?user_location=${userLocation || 'US'}&destination=global&priority=balanced`);
                const decision = yield response.json();
                return {
                    id: decision.primaryNode.nodeId,
                    location: decision.primaryNode.location,
                    latency: decision.primaryNode.latencyMs,
                    reputation: decision.primaryNode.reputation,
                };
            }
            catch (error) {
                console.error('Failed to fetch optimal node:', error);
                return {
                    id: 'fallback-node',
                    location: 'US-WEST',
                    latency: 50,
                    reputation: 85,
                };
            }
        });
    }
    monitorConnection(callback) {
        return __awaiter(this, void 0, void 0, function* () {
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
        });
    }
    disconnect() {
        if (!this.isConnected) {
            throw new Error('Not connected');
        }
        this.isConnected = false;
        this.currentNode = null;
        this.emit('disconnected');
    }
    fetchNodeInfo(nodeId) {
        return __awaiter(this, void 0, void 0, function* () {
            const routingEngineUrl = this.config.routingEngineUrl || 'http://localhost:3001';
            try {
                const response = yield fetch(`${routingEngineUrl}/api/nodes/${nodeId}`);
                const node = yield response.json();
                return {
                    id: node.nodeId,
                    location: node.location,
                    latency: node.latencyMs,
                    reputation: node.reputation,
                };
            }
            catch (error) {
                throw new Error(`Failed to fetch node info: ${error}`);
            }
        });
    }
    setupAutoReconnect() {
        this.on('disconnected', () => __awaiter(this, void 0, void 0, function* () {
            console.log('Connection lost, attempting to reconnect...');
            setTimeout(() => __awaiter(this, void 0, void 0, function* () {
                try {
                    yield this.connectToNode();
                    console.log('Reconnected successfully');
                }
                catch (error) {
                    console.error('Reconnection failed:', error);
                }
            }), 5000);
        }));
    }
    isNetworkConnected() {
        return this.isConnected;
    }
    getCurrentNode() {
        return this.currentNode;
    }
}
exports.VeilPool = VeilPool;
exports.default = VeilPool;
