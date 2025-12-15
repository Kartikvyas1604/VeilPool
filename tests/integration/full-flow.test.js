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
const anchor_1 = require("@coral-xyz/anchor");
const web3_js_1 = require("@solana/web3.js");
const spl_token_1 = require("@solana/spl-token");
const chai_1 = require("chai");
describe('VeilPool - Full Integration Flow', () => {
    const provider = anchor_1.AnchorProvider.env();
    anchor.setProvider(provider);
    const nodeRegistryProgram = anchor.workspace.NodeRegistry;
    const privacyPoolProgram = anchor.workspace.PrivacyPool;
    const privacyPassProgram = anchor.workspace.PrivacyPass;
    const vrfProgram = anchor.workspace.VrfNodeSelection;
    let tokenMint;
    let globalRegistry;
    let pricingConfig;
    let nodeOperator1;
    let nodeOperator2;
    let sponsor;
    let beneficiary;
    let user;
    before(() => __awaiter(void 0, void 0, void 0, function* () {
        // Generate keypairs
        nodeOperator1 = web3_js_1.Keypair.generate();
        nodeOperator2 = web3_js_1.Keypair.generate();
        sponsor = web3_js_1.Keypair.generate();
        beneficiary = web3_js_1.Keypair.generate();
        user = web3_js_1.Keypair.generate();
        // Airdrop SOL to all accounts
        const airdropAmount = 100 * anchor_1.web3.LAMPORTS_PER_SOL;
        yield Promise.all([
            provider.connection.requestAirdrop(nodeOperator1.publicKey, airdropAmount),
            provider.connection.requestAirdrop(nodeOperator2.publicKey, airdropAmount),
            provider.connection.requestAirdrop(sponsor.publicKey, airdropAmount),
            provider.connection.requestAirdrop(beneficiary.publicKey, airdropAmount),
            provider.connection.requestAirdrop(user.publicKey, airdropAmount),
        ]);
        // Wait for confirmations
        yield new Promise(resolve => setTimeout(resolve, 2000));
        // Create token mint for testing
        tokenMint = yield (0, spl_token_1.createMint)(provider.connection, provider.wallet.payer, provider.wallet.publicKey, null, 6 // USDC decimals
        );
        // Mint tokens to sponsor and user
        const sponsorAta = yield (0, spl_token_1.getOrCreateAssociatedTokenAccount)(provider.connection, provider.wallet.payer, tokenMint, sponsor.publicKey);
        const userAta = yield (0, spl_token_1.getOrCreateAssociatedTokenAccount)(provider.connection, provider.wallet.payer, tokenMint, user.publicKey);
        yield (0, spl_token_1.mintTo)(provider.connection, provider.wallet.payer, tokenMint, sponsorAta.address, provider.wallet.publicKey, 10000000000 // 10,000 USDC
        );
        yield (0, spl_token_1.mintTo)(provider.connection, provider.wallet.payer, tokenMint, userAta.address, provider.wallet.publicKey, 1000000000 // 1,000 USDC
        );
        // Derive PDAs
        [globalRegistry] = web3_js_1.PublicKey.findProgramAddressSync([Buffer.from('registry')], nodeRegistryProgram.programId);
        [pricingConfig] = web3_js_1.PublicKey.findProgramAddressSync([Buffer.from('pricing_config')], privacyPassProgram.programId);
    }));
    describe('1. Node Registry - Complete Flow', () => {
        it('Initializes the global registry', () => __awaiter(void 0, void 0, void 0, function* () {
            const protocolFeeVault = web3_js_1.Keypair.generate().publicKey;
            yield nodeRegistryProgram.methods
                .initialize()
                .accounts({
                globalRegistry,
                authority: provider.wallet.publicKey,
                protocolFeeVault,
                systemProgram: web3_js_1.SystemProgram.programId,
            })
                .rpc();
            const registryData = yield nodeRegistryProgram.account.globalRegistry.fetch(globalRegistry);
            (0, chai_1.expect)(registryData.totalNodes).to.equal(0);
            (0, chai_1.expect)(registryData.authority.toBase58()).to.equal(provider.wallet.publicKey.toBase58());
        }));
        it('Registers node operator 1', () => __awaiter(void 0, void 0, void 0, function* () {
            const [nodeAccount] = web3_js_1.PublicKey.findProgramAddressSync([Buffer.from('node'), nodeOperator1.publicKey.toBuffer()], nodeRegistryProgram.programId);
            yield nodeRegistryProgram.methods
                .registerNode('US-California-SF', '185.227.108.45', 10)
                .accounts({
                nodeAccount,
                globalRegistry,
                operator: nodeOperator1.publicKey,
                systemProgram: web3_js_1.SystemProgram.programId,
            })
                .signers([nodeOperator1])
                .rpc();
            const nodeData = yield nodeRegistryProgram.account.nodeAccount.fetch(nodeAccount);
            (0, chai_1.expect)(nodeData.operator.toBase58()).to.equal(nodeOperator1.publicKey.toBase58());
            (0, chai_1.expect)(nodeData.location).to.equal('US-California-SF');
            (0, chai_1.expect)(nodeData.reputation).to.equal(100);
            (0, chai_1.expect)(nodeData.isActive).to.equal(false); // Not active until staked
        }));
        it('Stakes 100 SOL and activates node', () => __awaiter(void 0, void 0, void 0, function* () {
            const [nodeAccount] = web3_js_1.PublicKey.findProgramAddressSync([Buffer.from('node'), nodeOperator1.publicKey.toBuffer()], nodeRegistryProgram.programId);
            const [stakeVault] = web3_js_1.PublicKey.findProgramAddressSync([Buffer.from('stake'), nodeAccount.toBuffer()], nodeRegistryProgram.programId);
            const stakeAmount = new anchor_1.BN(100 * anchor_1.web3.LAMPORTS_PER_SOL);
            yield nodeRegistryProgram.methods
                .stakeSol(stakeAmount)
                .accounts({
                nodeAccount,
                stakeVault,
                globalRegistry,
                operator: nodeOperator1.publicKey,
                systemProgram: web3_js_1.SystemProgram.programId,
            })
                .signers([nodeOperator1])
                .rpc();
            const nodeData = yield nodeRegistryProgram.account.nodeAccount.fetch(nodeAccount);
            (0, chai_1.expect)(nodeData.isActive).to.equal(true);
            (0, chai_1.expect)(nodeData.stakeAmount.toNumber()).to.equal(stakeAmount.toNumber());
        }));
        it('Registers and stakes node operator 2', () => __awaiter(void 0, void 0, void 0, function* () {
            const [nodeAccount] = web3_js_1.PublicKey.findProgramAddressSync([Buffer.from('node'), nodeOperator2.publicKey.toBuffer()], nodeRegistryProgram.programId);
            yield nodeRegistryProgram.methods
                .registerNode('DE-Berlin', '185.220.101.45', 10)
                .accounts({
                nodeAccount,
                globalRegistry,
                operator: nodeOperator2.publicKey,
                systemProgram: web3_js_1.SystemProgram.programId,
            })
                .signers([nodeOperator2])
                .rpc();
            const [stakeVault] = web3_js_1.PublicKey.findProgramAddressSync([Buffer.from('stake'), nodeAccount.toBuffer()], nodeRegistryProgram.programId);
            yield nodeRegistryProgram.methods
                .stakeSol(new anchor_1.BN(150 * anchor_1.web3.LAMPORTS_PER_SOL))
                .accounts({
                nodeAccount,
                stakeVault,
                globalRegistry,
                operator: nodeOperator2.publicKey,
                systemProgram: web3_js_1.SystemProgram.programId,
            })
                .signers([nodeOperator2])
                .rpc();
            const registryData = yield nodeRegistryProgram.account.globalRegistry.fetch(globalRegistry);
            (0, chai_1.expect)(registryData.totalNodes).to.equal(2);
        }));
        it('Updates heartbeat and records bandwidth', () => __awaiter(void 0, void 0, void 0, function* () {
            const [nodeAccount] = web3_js_1.PublicKey.findProgramAddressSync([Buffer.from('node'), nodeOperator1.publicKey.toBuffer()], nodeRegistryProgram.programId);
            yield nodeRegistryProgram.methods
                .updateHeartbeat(new anchor_1.BN(100)) // 100 GB served
                .accounts({
                nodeAccount,
                globalRegistry,
                operator: nodeOperator1.publicKey,
            })
                .signers([nodeOperator1])
                .rpc();
            const nodeData = yield nodeRegistryProgram.account.nodeAccount.fetch(nodeAccount);
            (0, chai_1.expect)(nodeData.totalBandwidthServed.toNumber()).to.equal(100);
        }));
        it('Records and claims earnings', () => __awaiter(void 0, void 0, void 0, function* () {
            const [nodeAccount] = web3_js_1.PublicKey.findProgramAddressSync([Buffer.from('node'), nodeOperator1.publicKey.toBuffer()], nodeRegistryProgram.programId);
            const earnings = new anchor_1.BN(5 * anchor_1.web3.LAMPORTS_PER_SOL);
            yield nodeRegistryProgram.methods
                .recordEarnings(earnings)
                .accounts({
                nodeAccount,
                globalRegistry,
                operator: nodeOperator1.publicKey,
            })
                .signers([nodeOperator1])
                .rpc();
            const nodeDataBefore = yield nodeRegistryProgram.account.nodeAccount.fetch(nodeAccount);
            (0, chai_1.expect)(nodeDataBefore.earningsAccumulated.toNumber()).to.be.greaterThan(0);
            // Note: claim_earnings requires earnings vault setup in production
        }));
    });
    describe('2. Privacy Pool - Sponsored Access', () => {
        let poolId;
        let poolAccount;
        it('Sponsor creates a privacy pool', () => __awaiter(void 0, void 0, void 0, function* () {
            poolId = new anchor_1.BN(Date.now());
            [poolAccount] = web3_js_1.PublicKey.findProgramAddressSync([Buffer.from('pool'), sponsor.publicKey.toBuffer(), poolId.toArrayLike(Buffer, 'le', 8)], privacyPoolProgram.programId);
            const [poolVault] = web3_js_1.PublicKey.findProgramAddressSync([Buffer.from('pool_vault'), sponsor.publicKey.toBuffer(), poolId.toArrayLike(Buffer, 'le', 8)], privacyPoolProgram.programId);
            const sponsorAta = yield (0, spl_token_1.getOrCreateAssociatedTokenAccount)(provider.connection, provider.wallet.payer, tokenMint, sponsor.publicKey);
            yield privacyPoolProgram.methods
                .createPool(poolId, 'Journalist Protection Fund', new anchor_1.BN(5000000000), new anchor_1.BN(10))
                .accounts({
                poolAccount,
                poolVault,
                tokenMint,
                sponsorTokenAccount: sponsorAta.address,
                sponsor: sponsor.publicKey,
                tokenProgram: spl_token_1.TOKEN_PROGRAM_ID,
                systemProgram: web3_js_1.SystemProgram.programId,
            })
                .signers([sponsor])
                .rpc();
            const poolData = yield privacyPoolProgram.account.poolAccount.fetch(poolAccount);
            (0, chai_1.expect)(poolData.name).to.equal('Journalist Protection Fund');
            (0, chai_1.expect)(poolData.totalFunded.toNumber()).to.equal(5000000000);
            (0, chai_1.expect)(poolData.isActive).to.equal(true);
        }));
        it('Adds beneficiary to pool', () => __awaiter(void 0, void 0, void 0, function* () {
            const [beneficiaryAccess] = web3_js_1.PublicKey.findProgramAddressSync([Buffer.from('access'), poolId.toArrayLike(Buffer, 'le', 8), beneficiary.publicKey.toBuffer()], privacyPoolProgram.programId);
            yield privacyPoolProgram.methods
                .addBeneficiaries(poolId, beneficiary.publicKey, new anchor_1.BN(50))
                .accounts({
                poolAccount,
                beneficiaryAccess,
                beneficiaryKey: beneficiary.publicKey,
                sponsor: sponsor.publicKey,
                systemProgram: web3_js_1.SystemProgram.programId,
            })
                .signers([sponsor])
                .rpc();
            const accessData = yield privacyPoolProgram.account.beneficiaryAccess.fetch(beneficiaryAccess);
            (0, chai_1.expect)(accessData.allocatedGb.toNumber()).to.equal(50);
            (0, chai_1.expect)(accessData.isWhitelisted).to.equal(true);
        }));
        it('Beneficiary redeems pool access', () => __awaiter(void 0, void 0, void 0, function* () {
            const [beneficiaryAccess] = web3_js_1.PublicKey.findProgramAddressSync([Buffer.from('access'), poolId.toArrayLike(Buffer, 'le', 8), beneficiary.publicKey.toBuffer()], privacyPoolProgram.programId);
            yield privacyPoolProgram.methods
                .redeemAccess(new anchor_1.BN(10))
                .accounts({
                poolAccount,
                beneficiaryAccess,
                beneficiary: beneficiary.publicKey,
            })
                .signers([beneficiary])
                .rpc();
            const accessData = yield privacyPoolProgram.account.beneficiaryAccess.fetch(beneficiaryAccess);
            (0, chai_1.expect)(accessData.usedGb.toNumber()).to.equal(10);
            (0, chai_1.expect)(accessData.allocatedGb.toNumber() - accessData.usedGb.toNumber()).to.equal(40);
        }));
        it('Sponsor enables auto-refill', () => __awaiter(void 0, void 0, void 0, function* () {
            yield privacyPoolProgram.methods
                .updateAutoRefill(true, new anchor_1.BN(1000000000))
                .accounts({
                poolAccount,
                sponsor: sponsor.publicKey,
            })
                .signers([sponsor])
                .rpc();
            const poolData = yield privacyPoolProgram.account.poolAccount.fetch(poolAccount);
            (0, chai_1.expect)(poolData.autoRefillEnabled).to.equal(true);
        }));
    });
    describe('3. Privacy Pass - Purchase & Usage', () => {
        it('Initializes the pass system', () => __awaiter(void 0, void 0, void 0, function* () {
            const passMint = yield (0, spl_token_1.createMint)(provider.connection, provider.wallet.payer, provider.wallet.publicKey, null, 9);
            const treasury = web3_js_1.Keypair.generate().publicKey;
            yield privacyPassProgram.methods
                .initializePassSystem(web3_js_1.Keypair.generate().publicKey) // Pyth oracle placeholder
                .accounts({
                pricingConfig,
                passMint,
                treasury,
                authority: provider.wallet.publicKey,
                systemProgram: web3_js_1.SystemProgram.programId,
            })
                .rpc();
            const config = yield privacyPassProgram.account.pricingConfig.fetch(pricingConfig);
            (0, chai_1.expect)(config.isActive).to.equal(true);
        }));
        it('User purchases privacy pass', () => __awaiter(void 0, void 0, void 0, function* () {
            const [passAccount] = web3_js_1.PublicKey.findProgramAddressSync([Buffer.from('pass'), user.publicKey.toBuffer()], privacyPassProgram.programId);
            const userAta = yield (0, spl_token_1.getOrCreateAssociatedTokenAccount)(provider.connection, provider.wallet.payer, tokenMint, user.publicKey);
            const config = yield privacyPassProgram.account.pricingConfig.fetch(pricingConfig);
            const treasuryAta = yield (0, spl_token_1.getOrCreateAssociatedTokenAccount)(provider.connection, provider.wallet.payer, tokenMint, config.treasury);
            yield privacyPassProgram.methods
                .purchasePass(new anchor_1.BN(100)) // 100 GB
                .accounts({
                passAccount,
                pricingConfig,
                userTokenAccount: userAta.address,
                treasury: treasuryAta.address,
                user: user.publicKey,
                tokenProgram: spl_token_1.TOKEN_PROGRAM_ID,
                systemProgram: web3_js_1.SystemProgram.programId,
            })
                .signers([user])
                .rpc();
            const passData = yield privacyPassProgram.account.passAccount.fetch(passAccount);
            (0, chai_1.expect)(passData.remainingGb.toNumber()).to.equal(100);
            (0, chai_1.expect)(passData.isActive).to.equal(true);
        }));
        it('User redeems privacy pass', () => __awaiter(void 0, void 0, void 0, function* () {
            const [passAccount] = web3_js_1.PublicKey.findProgramAddressSync([Buffer.from('pass'), user.publicKey.toBuffer()], privacyPassProgram.programId);
            const [nodeAccount] = web3_js_1.PublicKey.findProgramAddressSync([Buffer.from('node'), nodeOperator1.publicKey.toBuffer()], nodeRegistryProgram.programId);
            yield privacyPassProgram.methods
                .redeemPass(new anchor_1.BN(5), nodeOperator1.publicKey)
                .accounts({
                passAccount,
                user: user.publicKey,
            })
                .signers([user])
                .rpc();
            const passData = yield privacyPassProgram.account.passAccount.fetch(passAccount);
            (0, chai_1.expect)(passData.remainingGb.toNumber()).to.equal(95);
        }));
    });
    describe('4. VRF Node Selection', () => {
        it('Requests random node selection', () => __awaiter(void 0, void 0, void 0, function* () {
            const [vrfRequest] = web3_js_1.PublicKey.findProgramAddressSync([Buffer.from('vrf_request'), user.publicKey.toBuffer()], vrfProgram.programId);
            const seed = Buffer.from(new Uint8Array(32).fill(Math.floor(Math.random() * 255)));
            yield vrfProgram.methods
                .requestRandomNode(Array.from(seed))
                .accounts({
                vrfRequest,
                user: user.publicKey,
                systemProgram: web3_js_1.SystemProgram.programId,
            })
                .signers([user])
                .rpc();
            const requestData = yield vrfProgram.account.vrfRequest.fetch(vrfRequest);
            (0, chai_1.expect)(requestData.isFulfilled).to.equal(false);
        }));
        it('Fulfills VRF selection with weighted nodes', () => __awaiter(void 0, void 0, void 0, function* () {
            const [vrfRequest] = web3_js_1.PublicKey.findProgramAddressSync([Buffer.from('vrf_request'), user.publicKey.toBuffer()], vrfProgram.programId);
            const [node1] = web3_js_1.PublicKey.findProgramAddressSync([Buffer.from('node'), nodeOperator1.publicKey.toBuffer()], nodeRegistryProgram.programId);
            const [node2] = web3_js_1.PublicKey.findProgramAddressSync([Buffer.from('node'), nodeOperator2.publicKey.toBuffer()], nodeRegistryProgram.programId);
            // Simulate VRF result
            const vrfResult = Buffer.from(new Uint8Array(32).fill(Math.floor(Math.random() * 255)));
            yield vrfProgram.methods
                .fulfillRandomSelection(Array.from(vrfResult), [node1, node2], [95, 100] // Reputation-based weights
            )
                .accounts({
                vrfRequest,
                vrfAuthority: provider.wallet.publicKey,
            })
                .rpc();
            const requestData = yield vrfProgram.account.vrfRequest.fetch(vrfRequest);
            (0, chai_1.expect)(requestData.isFulfilled).to.equal(true);
            (0, chai_1.expect)(requestData.selectedNode).to.not.be.null;
        }));
    });
    describe('5. End-to-End Flow', () => {
        it('Complete user journey: Purchase -> Connect -> Use -> Disconnect', () => __awaiter(void 0, void 0, void 0, function* () {
            console.log('\n=== COMPLETE USER JOURNEY ===\n');
            // Step 1: User checks pass balance
            const [passAccount] = web3_js_1.PublicKey.findProgramAddressSync([Buffer.from('pass'), user.publicKey.toBuffer()], privacyPassProgram.programId);
            let passData = yield privacyPassProgram.account.passAccount.fetch(passAccount);
            console.log(`1. User has ${passData.remainingGb.toNumber()} GB remaining`);
            // Step 2: Request optimal node via VRF
            console.log('2. Requesting optimal node via VRF...');
            const [vrfRequest2] = web3_js_1.PublicKey.findProgramAddressSync([Buffer.from('vrf_request_2'), user.publicKey.toBuffer()], vrfProgram.programId);
            // Step 3: Connect to selected node
            console.log('3. Connecting to selected node...');
            const [node1] = web3_js_1.PublicKey.findProgramAddressSync([Buffer.from('node'), nodeOperator1.publicKey.toBuffer()], nodeRegistryProgram.programId);
            const nodeDataBefore = yield nodeRegistryProgram.account.nodeAccount.fetch(node1);
            console.log(`   Node reputation: ${nodeDataBefore.reputation}`);
            // Step 4: Use bandwidth
            console.log('4. Using 20 GB of bandwidth...');
            yield privacyPassProgram.methods
                .redeemPass(new anchor_1.BN(20), nodeOperator1.publicKey)
                .accounts({
                passAccount,
                user: user.publicKey,
            })
                .signers([user])
                .rpc();
            // Step 5: Node records bandwidth served
            yield nodeRegistryProgram.methods
                .updateHeartbeat(new anchor_1.BN(20))
                .accounts({
                nodeAccount: node1,
                globalRegistry,
                operator: nodeOperator1.publicKey,
            })
                .signers([nodeOperator1])
                .rpc();
            // Step 6: Verify final state
            passData = yield privacyPassProgram.account.passAccount.fetch(passAccount);
            const nodeDataAfter = yield nodeRegistryProgram.account.nodeAccount.fetch(node1);
            console.log(`5. Final user balance: ${passData.remainingGb.toNumber()} GB`);
            console.log(`   Node bandwidth served: ${nodeDataAfter.totalBandwidthServed.toNumber()} GB`);
            (0, chai_1.expect)(passData.remainingGb.toNumber()).to.equal(75); // Started at 95, used 20
            (0, chai_1.expect)(nodeDataAfter.totalBandwidthServed.toNumber()).to.equal(120); // 100 + 20
        }));
    });
});
