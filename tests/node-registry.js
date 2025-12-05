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
const anchor = __importStar(require("@coral-xyz/anchor"));
const chai_1 = require("chai");
describe("node-registry", () => {
    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);
    const program = anchor.workspace.NodeRegistry;
    const authority = provider.wallet;
    let globalRegistry;
    let nodeAccount;
    let stakeVault;
    const operator = anchor.web3.Keypair.generate();
    before(() => __awaiter(void 0, void 0, void 0, function* () {
        [globalRegistry] = anchor.web3.PublicKey.findProgramAddressSync([Buffer.from("registry")], program.programId);
        [nodeAccount] = anchor.web3.PublicKey.findProgramAddressSync([Buffer.from("node"), operator.publicKey.toBuffer()], program.programId);
        [stakeVault] = anchor.web3.PublicKey.findProgramAddressSync([Buffer.from("stake"), nodeAccount.toBuffer()], program.programId);
        yield provider.connection.confirmTransaction(yield provider.connection.requestAirdrop(operator.publicKey, 150 * anchor.web3.LAMPORTS_PER_SOL));
    }));
    it("Initializes the registry", () => __awaiter(void 0, void 0, void 0, function* () {
        const tx = yield program.methods
            .initialize()
            .accounts({
            globalRegistry,
            authority: authority.publicKey,
            protocolFeeVault: authority.publicKey,
        })
            .rpc();
        const registryAccount = yield program.account.globalRegistry.fetch(globalRegistry);
        (0, chai_1.expect)(registryAccount.totalNodes).to.equal(0);
        (0, chai_1.expect)(registryAccount.authority.toString()).to.equal(authority.publicKey.toString());
    }));
    it("Registers a new node", () => __awaiter(void 0, void 0, void 0, function* () {
        const tx = yield program.methods
            .registerNode("US-WEST-1", "192.168.1.1", 10)
            .accounts({
            nodeAccount,
            globalRegistry,
            operator: operator.publicKey,
        })
            .signers([operator])
            .rpc();
        const node = yield program.account.nodeAccount.fetch(nodeAccount);
        (0, chai_1.expect)(node.operator.toString()).to.equal(operator.publicKey.toString());
        (0, chai_1.expect)(node.location).to.equal("US-WEST-1");
        (0, chai_1.expect)(node.reputation).to.equal(100);
        (0, chai_1.expect)(node.isActive).to.equal(false);
        const registry = yield program.account.globalRegistry.fetch(globalRegistry);
        (0, chai_1.expect)(registry.totalNodes).to.equal(1);
    }));
    it("Stakes SOL to activate node", () => __awaiter(void 0, void 0, void 0, function* () {
        const stakeAmount = 100 * anchor.web3.LAMPORTS_PER_SOL;
        const tx = yield program.methods
            .stakeSol(new anchor.BN(stakeAmount))
            .accounts({
            nodeAccount,
            stakeVault,
            globalRegistry,
            operator: operator.publicKey,
        })
            .signers([operator])
            .rpc();
        const node = yield program.account.nodeAccount.fetch(nodeAccount);
        (0, chai_1.expect)(node.stakeAmount.toString()).to.equal(stakeAmount.toString());
        (0, chai_1.expect)(node.isActive).to.equal(true);
    }));
    it("Updates node heartbeat", () => __awaiter(void 0, void 0, void 0, function* () {
        const tx = yield program.methods
            .updateHeartbeat(new anchor.BN(50))
            .accounts({
            nodeAccount,
            globalRegistry,
            operator: operator.publicKey,
        })
            .signers([operator])
            .rpc();
        const node = yield program.account.nodeAccount.fetch(nodeAccount);
        (0, chai_1.expect)(node.totalBandwidthServed.toString()).to.equal("50");
    }));
    it("Updates reputation", () => __awaiter(void 0, void 0, void 0, function* () {
        const tx = yield program.methods
            .updateReputation(95)
            .accounts({
            nodeAccount,
            globalRegistry,
            authority: authority.publicKey,
        })
            .rpc();
        const node = yield program.account.nodeAccount.fetch(nodeAccount);
        (0, chai_1.expect)(node.reputation).to.equal(95);
    }));
    it("Fails to stake with insufficient amount", () => __awaiter(void 0, void 0, void 0, function* () {
        const newOperator = anchor.web3.Keypair.generate();
        yield provider.connection.confirmTransaction(yield provider.connection.requestAirdrop(newOperator.publicKey, 10 * anchor.web3.LAMPORTS_PER_SOL));
        const [newNodeAccount] = anchor.web3.PublicKey.findProgramAddressSync([Buffer.from("node"), newOperator.publicKey.toBuffer()], program.programId);
        const [newStakeVault] = anchor.web3.PublicKey.findProgramAddressSync([Buffer.from("stake"), newNodeAccount.toBuffer()], program.programId);
        yield program.methods
            .registerNode("EU-CENTRAL-1", "10.0.0.1", 5)
            .accounts({
            nodeAccount: newNodeAccount,
            globalRegistry,
            operator: newOperator.publicKey,
        })
            .signers([newOperator])
            .rpc();
        try {
            yield program.methods
                .stakeSol(new anchor.BN(50 * anchor.web3.LAMPORTS_PER_SOL))
                .accounts({
                nodeAccount: newNodeAccount,
                stakeVault: newStakeVault,
                globalRegistry,
                operator: newOperator.publicKey,
            })
                .signers([newOperator])
                .rpc();
            chai_1.expect.fail("Should have failed with insufficient stake");
        }
        catch (error) {
            (0, chai_1.expect)(error.toString()).to.include("InsufficientStake");
        }
    }));
});
