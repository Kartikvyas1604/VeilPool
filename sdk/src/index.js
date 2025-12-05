"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
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
exports.SponsorSDK = exports.NodeOperatorSDK = exports.VeilPoolClient = void 0;
exports.createVeilPoolClient = createVeilPoolClient;
exports.createNodeOperatorSDK = createNodeOperatorSDK;
exports.createSponsorSDK = createSponsorSDK;
const web3_js_1 = require("@solana/web3.js");
const axios_1 = __importDefault(require("axios"));
const ws_1 = __importDefault(require("ws"));
const eventemitter3_1 = __importDefault(require("eventemitter3"));
/**
 * Main VeilPool SDK Client
 */
class VeilPoolClient extends eventemitter3_1.default {
    constructor(config) {
        super();
        this.ws = null;
        this.currentSession = null;
        this.config = config;
        this.connection = new web3_js_1.Connection(config.rpcEndpoint, 'confirmed');
        this.routingEngine = axios_1.default.create({
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
    connectWebSocket() {
        return __awaiter(this, void 0, void 0, function* () {
            const wsUrl = this.config.wsEndpoint || this.config.routingEngineUrl.replace(/^http/, 'ws');
            return new Promise((resolve, reject) => {
                this.ws = new ws_1.default(wsUrl);
                this.ws.on('open', () => {
                    var _a;
                    console.log('WebSocket connected');
                    (_a = this.ws) === null || _a === void 0 ? void 0 : _a.send(JSON.stringify({ type: 'subscribe_routing' }));
                    resolve();
                });
                this.ws.on('message', (data) => {
                    try {
                        const message = JSON.parse(data.toString());
                        this.handleWebSocketMessage(message);
                    }
                    catch (error) {
                        console.error('WebSocket message error:', error);
                    }
                });
                this.ws.on('error', (error) => {
                    this.emit('error', error);
                    reject(error);
                });
                this.ws.on('close', () => {
                    console.log('WebSocket disconnected');
                    this.ws = null;
                });
            });
        });
    }
    handleWebSocketMessage(message) {
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
    getOptimalNode(userLocation_1, destination_1) {
        return __awaiter(this, arguments, void 0, function* (userLocation, destination, priority = 'balanced') {
            const response = yield this.routingEngine.get('/api/routing/optimal-node', {
                params: {
                    user_location: userLocation,
                    destination,
                    priority,
                },
            });
            return response.data;
        });
    }
    /**
     * Get all active VPN nodes
     */
    getActiveNodes() {
        return __awaiter(this, void 0, void 0, function* () {
            const response = yield this.routingEngine.get('/api/nodes/health-status');
            return response.data.nodes;
        });
    }
    /**
     * Get specific node details
     */
    getNodeDetails(nodeId) {
        return __awaiter(this, void 0, void 0, function* () {
            const response = yield this.routingEngine.get(`/api/nodes/${nodeId}`);
            return response.data;
        });
    }
    /**
     * Report a node failure
     */
    reportNodeFailure(nodeId, reason) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.routingEngine.post('/api/routing/report-failure', {
                node_id: nodeId,
                failure_reason: reason,
            });
        });
    }
    /**
     * Get threat intelligence for a country
     */
    getThreatIntel(countryCode) {
        return __awaiter(this, void 0, void 0, function* () {
            const endpoint = countryCode
                ? `/api/threat-intel/${countryCode}`
                : '/api/threat-intel';
            const response = yield this.routingEngine.get(endpoint);
            return response.data;
        });
    }
    /**
     * Connect to VPN through selected node
     */
    connect(nodeId, userId) {
        return __awaiter(this, void 0, void 0, function* () {
            // Generate session ID
            const sessionId = this.generateSessionId();
            // Create connection session
            const session = {
                sessionId,
                nodeId,
                userId,
                startTime: Date.now(),
                status: 'connecting',
            };
            this.currentSession = session;
            // In production, this would establish actual VPN tunnel
            // For now, we'll simulate the connection
            yield this.establishConnection(session);
            session.status = 'connected';
            this.emit('connected', session);
            return session;
        });
    }
    /**
     * Disconnect from current VPN session
     */
    disconnect() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.currentSession) {
                throw new Error('No active session');
            }
            this.currentSession.status = 'disconnected';
            this.emit('disconnected', this.currentSession);
            this.currentSession = null;
        });
    }
    /**
     * Get current connection session
     */
    getCurrentSession() {
        return this.currentSession;
    }
    /**
     * Purchase a privacy pass on-chain
     */
    purchasePass(tier, duration) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.config.wallet) {
                throw new Error('Wallet not configured');
            }
            // In production, this would interact with the Solana program
            // For now, return a mock transaction signature
            const mockTxSignature = this.generateSessionId();
            console.log(`Purchasing ${tier} pass for ${duration} days`);
            return mockTxSignature;
        });
    }
    /**
     * Get user's active privacy passes
     */
    getMyPasses() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.config.wallet) {
                throw new Error('Wallet not configured');
            }
            // In production, fetch from Solana program
            return [];
        });
    }
    /**
     * Get routing engine statistics
     */
    getStats() {
        return __awaiter(this, void 0, void 0, function* () {
            const response = yield this.routingEngine.get('/api/stats');
            return response.data;
        });
    }
    /**
     * Check health of routing engine
     */
    healthCheck() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const response = yield this.routingEngine.get('/api/health');
                return response.data.status === 'healthy';
            }
            catch (_a) {
                return false;
            }
        });
    }
    establishConnection(session) {
        return __awaiter(this, void 0, void 0, function* () {
            // Simulate connection establishment
            yield new Promise(resolve => setTimeout(resolve, 1000));
        });
    }
    generateSessionId() {
        return `veilpool_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    /**
     * Close all connections and cleanup
     */
    close() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.currentSession) {
                yield this.disconnect();
            }
            if (this.ws) {
                this.ws.close();
                this.ws = null;
            }
            this.removeAllListeners();
        });
    }
}
exports.VeilPoolClient = VeilPoolClient;
/**
 * Node Operator SDK - For running VPN nodes
 */
class NodeOperatorSDK {
    constructor(config) {
        this.config = config;
        this.connection = new web3_js_1.Connection(config.rpcEndpoint, 'confirmed');
    }
    /**
     * Register a new VPN node
     */
    registerNode(country, city, bandwidth, stakeAmount) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.config.wallet) {
                throw new Error('Wallet not configured');
            }
            console.log('Registering node:', { country, city, bandwidth, stakeAmount });
            // In production, interact with node-registry program
            return 'mock_tx_signature';
        });
    }
    /**
     * Update node heartbeat
     */
    sendHeartbeat(nodeId) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log('Sending heartbeat for node:', nodeId);
            // In production, call update_heartbeat instruction
        });
    }
    /**
     * Claim earnings
     */
    claimEarnings(nodeId) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log('Claiming earnings for node:', nodeId);
            return 'mock_tx_signature';
        });
    }
    /**
     * Unstake from node
     */
    unstake(nodeId, amount) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log('Unstaking:', amount, 'from node:', nodeId);
            return 'mock_tx_signature';
        });
    }
}
exports.NodeOperatorSDK = NodeOperatorSDK;
/**
 * Sponsor SDK - For creating privacy pools
 */
class SponsorSDK {
    constructor(config) {
        this.config = config;
        this.connection = new web3_js_1.Connection(config.rpcEndpoint, 'confirmed');
    }
    /**
     * Create a new privacy pool
     */
    createPool(name, description, fundingAmount) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.config.wallet) {
                throw new Error('Wallet not configured');
            }
            console.log('Creating privacy pool:', { name, description, fundingAmount });
            // In production, interact with privacy-pool program
            return 'mock_tx_signature';
        });
    }
    /**
     * Add beneficiaries to pool
     */
    addBeneficiaries(poolId, beneficiaries) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log('Adding beneficiaries to pool:', poolId, beneficiaries);
            return 'mock_tx_signature';
        });
    }
    /**
     * Fund existing pool
     */
    fundPool(poolId, amount) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log('Funding pool:', poolId, 'with amount:', amount);
            return 'mock_tx_signature';
        });
    }
}
exports.SponsorSDK = SponsorSDK;
/**
 * Factory function to create VeilPool client
 */
function createVeilPoolClient(config) {
    return new VeilPoolClient(config);
}
/**
 * Factory function to create Node Operator SDK
 */
function createNodeOperatorSDK(config) {
    return new NodeOperatorSDK(config);
}
/**
 * Factory function to create Sponsor SDK
 */
function createSponsorSDK(config) {
    return new SponsorSDK(config);
}
// Export types
__exportStar(require("./types"), exports);
