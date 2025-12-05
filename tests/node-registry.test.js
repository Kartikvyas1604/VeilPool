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
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
const web3_js_1 = require("@solana/web3.js");
const anchor_1 = require("@coral-xyz/anchor");
const anchor = __importStar(require("@coral-xyz/anchor"));
describe('Node Registry Program', () => {
    const provider = anchor_1.AnchorProvider.env();
    anchor.setProvider(provider);
    const program = anchor.workspace.NodeRegistry;
    let nodeOperator;
    let nodeAccount;
    let stakeVault;
    before(() => __awaiter(void 0, void 0, void 0, function* () {
        nodeOperator = web3_js_1.Keypair.generate();
        // Airdrop SOL to operator
        const airdropSignature = yield provider.connection.requestAirdrop(nodeOperator.publicKey, 10 * web3_js_1.LAMPORTS_PER_SOL);
        yield provider.connection.confirmTransaction(airdropSignature);
    }));
    it('Registers a new VPN node', () => __awaiter(void 0, void 0, void 0, function* () {
        const country = 'US';
        const city = 'San Francisco';
        const bandwidth = 1000; // 1 Gbps in Mbps
        const stakeAmount = new anchor.BN(5 * web3_js_1.LAMPORTS_PER_SOL);
        [nodeAccount] = web3_js_1.PublicKey.findProgramAddressSync([Buffer.from('node'), nodeOperator.publicKey.toBuffer()], program.programId);
        [stakeVault] = web3_js_1.PublicKey.findProgramAddressSync([Buffer.from('stake-vault'), nodeAccount.toBuffer()], program.programId);
        const tx = yield program.methods
            .registerNode(country, city, bandwidth)
            .accounts({
            node: nodeAccount,
            operator: nodeOperator.publicKey,
            stakeVault: stakeVault,
            systemProgram: anchor.web3.SystemProgram.programId,
        })
            .signers([nodeOperator])
            .rpc();
        console.log('Register node tx:', tx);
        const nodeData = yield program.account.node.fetch(nodeAccount);
        (0, chai_1.expect)(nodeData.operator.toString()).to.equal(nodeOperator.publicKey.toString());
        (0, chai_1.expect)(nodeData.country).to.equal(country);
        (0, chai_1.expect)(nodeData.city).to.equal(city);
        (0, chai_1.expect)(nodeData.bandwidth).to.equal(bandwidth);
        (0, chai_1.expect)(nodeData.isActive).to.be.true;
        (0, chai_1.expect)(nodeData.reputation).to.equal(1000); // Initial reputation
    }));
    it('Stakes SOL to node', () => __awaiter(void 0, void 0, void 0, function* () {
        const stakeAmount = new anchor.BN(2 * web3_js_1.LAMPORTS_PER_SOL);
        const tx = yield program.methods
            .stakeSol(stakeAmount)
            .accounts({
            node: nodeAccount,
            operator: nodeOperator.publicKey,
            stakeVault: stakeVault,
            systemProgram: anchor.web3.SystemProgram.programId,
        })
            .signers([nodeOperator])
            .rpc();
        console.log('Stake SOL tx:', tx);
        const nodeData = yield program.account.node.fetch(nodeAccount);
        (0, chai_1.expect)(nodeData.totalStake.toNumber()).to.be.greaterThan(0);
    }));
    it('Updates node heartbeat', () => __awaiter(void 0, void 0, void 0, function* () {
        const latency = 50; // 50ms
        const activeConnections = 10;
        const tx = yield program.methods
            .updateHeartbeat(latency, activeConnections)
            .accounts({
            node: nodeAccount,
            operator: nodeOperator.publicKey,
        })
            .signers([nodeOperator])
            .rpc();
        console.log('Update heartbeat tx:', tx);
        const nodeData = yield program.account.node.fetch(nodeAccount);
        (0, chai_1.expect)(nodeData.latency).to.equal(latency);
        (0, chai_1.expect)(nodeData.activeConnections).to.equal(activeConnections);
    }));
    it('Records earnings for node', () => __awaiter(void 0, void 0, void 0, function* () {
        const earningsAmount = new anchor.BN(0.1 * web3_js_1.LAMPORTS_PER_SOL);
        const tx = yield program.methods
            .recordEarnings(earningsAmount)
            .accounts({
            node: nodeAccount,
            operator: nodeOperator.publicKey,
        })
            .signers([nodeOperator])
            .rpc();
        console.log('Record earnings tx:', tx);
        const nodeData = yield program.account.node.fetch(nodeAccount);
        (0, chai_1.expect)(nodeData.totalEarnings.toNumber()).to.be.greaterThan(0);
    }));
    it('Initiates unstake from node', () => __awaiter(void 0, void 0, void 0, function* () {
        const unstakeAmount = new anchor.BN(1 * web3_js_1.LAMPORTS_PER_SOL);
        const tx = yield program.methods
            .unstakeSol(unstakeAmount)
            .accounts({
            node: nodeAccount,
            operator: nodeOperator.publicKey,
        })
            .signers([nodeOperator])
            .rpc();
        console.log('Unstake SOL tx:', tx);
        const nodeData = yield program.account.node.fetch(nodeAccount);
        (0, chai_1.expect)(nodeData.unstakeAmount.toNumber()).to.be.greaterThan(0);
    }));
    it('Fails to slash non-existent node', () => __awaiter(void 0, void 0, void 0, function* () {
        const fakeNode = web3_js_1.Keypair.generate();
        const slashAmount = new anchor.BN(0.5 * web3_js_1.LAMPORTS_PER_SOL);
        try {
            yield program.methods
                .slashNode(slashAmount)
                .accounts({
                node: fakeNode.publicKey,
                authority: nodeOperator.publicKey,
                stakeVault: stakeVault,
            })
                .signers([nodeOperator])
                .rpc();
            chai_1.expect.fail('Should have thrown error');
        }
        catch (error) {
            (0, chai_1.expect)(error).to.exist;
        }
    }));
});
