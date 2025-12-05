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
exports.NodeMonitor = void 0;
const web3_js_1 = require("@solana/web3.js");
const NODE_REGISTRY_PROGRAM_ID = new web3_js_1.PublicKey('NodE1111111111111111111111111111111111111111');
class NodeMonitor {
    constructor(rpcUrl) {
        this.nodeCache = new Map();
        this.healthCheckInterval = null;
        this.connection = new web3_js_1.Connection(rpcUrl, 'confirmed');
    }
    startMonitoring() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log('Starting node health monitoring...');
            yield this.fetchAllNodes();
            this.healthCheckInterval = setInterval(() => __awaiter(this, void 0, void 0, function* () {
                yield this.updateNodeHealth();
            }), 60000);
        });
    }
    stopMonitoring() {
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
            this.healthCheckInterval = null;
        }
    }
    fetchAllNodes() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const programAccounts = yield this.connection.getProgramAccounts(NODE_REGISTRY_PROGRAM_ID, {
                    filters: [
                        { dataSize: 8 + 200 },
                    ],
                });
                const nodes = [];
                for (const account of programAccounts) {
                    try {
                        const node = this.parseNodeAccount(account.account.data, account.pubkey.toString());
                        if (node.isActive) {
                            this.nodeCache.set(node.nodeId, node);
                            nodes.push(node);
                        }
                    }
                    catch (error) {
                        console.error(`Failed to parse node account: ${error}`);
                    }
                }
                console.log(`Fetched ${nodes.length} active nodes`);
                return nodes;
            }
            catch (error) {
                console.error('Failed to fetch nodes:', error);
                return [];
            }
        });
    }
    parseNodeAccount(data, pubkey) {
        const reputation = data.readUInt8(40);
        const bandwidthGbps = data.readUInt16LE(41);
        const uptimePercentage = data.readUInt8(43);
        const lastHeartbeat = Number(data.readBigInt64LE(44));
        const isActive = data.readUInt8(52) === 1;
        const operatorOffset = 8;
        const operator = new web3_js_1.PublicKey(data.slice(operatorOffset, operatorOffset + 32)).toString();
        const locationBytes = data.slice(60, 124);
        const locationStr = locationBytes.toString('utf8').replace(/\0/g, '').trim();
        const location = locationStr || 'UNKNOWN';
        return {
            nodeId: pubkey,
            operator,
            location,
            latencyMs: Math.floor(Math.random() * 150) + 20,
            uptimePercentage,
            reputation,
            bandwidthGbps,
            pricePerGb: 0.5,
            lastHeartbeat,
            isActive,
            threatLevel: 0,
            connectionSuccessRate: 0.95,
            packetLossRate: 0.01,
        };
    }
    updateNodeHealth() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log('Updating node health metrics...');
            const nodes = Array.from(this.nodeCache.values());
            const now = Date.now() / 1000;
            for (const node of nodes) {
                try {
                    const latency = yield this.pingNode(node.nodeId);
                    node.latencyMs = latency;
                    const timeSinceHeartbeat = now - node.lastHeartbeat;
                    if (timeSinceHeartbeat > 300) {
                        node.isActive = false;
                        console.warn(`Node ${node.nodeId} marked inactive - no heartbeat`);
                    }
                    this.nodeCache.set(node.nodeId, node);
                }
                catch (error) {
                    console.error(`Health check failed for ${node.nodeId}:`, error);
                }
            }
        });
    }
    pingNode(nodeId) {
        return __awaiter(this, void 0, void 0, function* () {
            const startTime = Date.now();
            yield new Promise(resolve => setTimeout(resolve, Math.random() * 50));
            return Date.now() - startTime;
        });
    }
    getActiveNodes() {
        return Array.from(this.nodeCache.values())
            .filter(node => node.isActive)
            .sort((a, b) => b.reputation - a.reputation);
    }
    getNodesByLocation(location) {
        return this.getActiveNodes().filter(node => node.location.startsWith(location));
    }
    getNodeById(nodeId) {
        return this.nodeCache.get(nodeId);
    }
    getNodeCount() {
        return this.nodeCache.size;
    }
    getAverageLatency() {
        const nodes = this.getActiveNodes();
        if (nodes.length === 0)
            return 0;
        const totalLatency = nodes.reduce((sum, node) => sum + node.latencyMs, 0);
        return totalLatency / nodes.length;
    }
    getAverageUptime() {
        const nodes = this.getActiveNodes();
        if (nodes.length === 0)
            return 0;
        const totalUptime = nodes.reduce((sum, node) => sum + node.uptimePercentage, 0);
        return totalUptime / nodes.length;
    }
}
exports.NodeMonitor = NodeMonitor;
