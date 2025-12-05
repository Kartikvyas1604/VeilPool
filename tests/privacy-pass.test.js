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
describe('Privacy Pass Program', () => {
    const provider = anchor_1.AnchorProvider.env();
    anchor.setProvider(provider);
    const program = anchor.workspace.PrivacyPass;
    let user;
    let passSystem;
    let userPass;
    before(() => __awaiter(void 0, void 0, void 0, function* () {
        user = web3_js_1.Keypair.generate();
        // Airdrop SOL to user
        const airdropSignature = yield provider.connection.requestAirdrop(user.publicKey, 10 * web3_js_1.LAMPORTS_PER_SOL);
        yield provider.connection.confirmTransaction(airdropSignature);
    }));
    it('Initializes pass system', () => __awaiter(void 0, void 0, void 0, function* () {
        [passSystem] = web3_js_1.PublicKey.findProgramAddressSync([Buffer.from('pass-system')], program.programId);
        const basicPrice = new anchor.BN(0.1 * web3_js_1.LAMPORTS_PER_SOL);
        const premiumPrice = new anchor.BN(0.5 * web3_js_1.LAMPORTS_PER_SOL);
        const enterprisePrice = new anchor.BN(2 * web3_js_1.LAMPORTS_PER_SOL);
        const tx = yield program.methods
            .initializePassSystem(basicPrice, premiumPrice, enterprisePrice)
            .accounts({
            passSystem: passSystem,
            authority: provider.wallet.publicKey,
            systemProgram: anchor.web3.SystemProgram.programId,
        })
            .rpc();
        console.log('Initialize pass system tx:', tx);
        const systemData = yield program.account.passSystem.fetch(passSystem);
        (0, chai_1.expect)(systemData.authority.toString()).to.equal(provider.wallet.publicKey.toString());
        (0, chai_1.expect)(systemData.totalPasses.toNumber()).to.equal(0);
    }));
    it('Purchases a basic pass', () => __awaiter(void 0, void 0, void 0, function* () {
        [userPass] = web3_js_1.PublicKey.findProgramAddressSync([Buffer.from('pass'), user.publicKey.toBuffer()], program.programId);
        const duration = 30; // 30 days
        const tx = yield program.methods
            .purchasePass(0, duration) // 0 = Basic tier
            .accounts({
            pass: userPass,
            user: user.publicKey,
            passSystem: passSystem,
            systemProgram: anchor.web3.SystemProgram.programId,
        })
            .signers([user])
            .rpc();
        console.log('Purchase pass tx:', tx);
        const passData = yield program.account.privacyPass.fetch(userPass);
        (0, chai_1.expect)(passData.owner.toString()).to.equal(user.publicKey.toString());
        (0, chai_1.expect)(passData.tier).to.equal(0); // Basic
        (0, chai_1.expect)(passData.isActive).to.be.true;
    }));
    it('Redeems pass usage', () => __awaiter(void 0, void 0, void 0, function* () {
        const dataUsed = new anchor.BN(1024 * 1024 * 100); // 100 MB
        const tx = yield program.methods
            .redeemPass(dataUsed)
            .accounts({
            pass: userPass,
            user: user.publicKey,
        })
            .signers([user])
            .rpc();
        console.log('Redeem pass tx:', tx);
        const passData = yield program.account.privacyPass.fetch(userPass);
        (0, chai_1.expect)(passData.usageCount.toNumber()).to.be.greaterThan(0);
    }));
    it('Extends pass expiry', () => __awaiter(void 0, void 0, void 0, function* () {
        const additionalDays = 15;
        const tx = yield program.methods
            .extendExpiry(additionalDays)
            .accounts({
            pass: userPass,
            user: user.publicKey,
        })
            .signers([user])
            .rpc();
        console.log('Extend expiry tx:', tx);
        const passData = yield program.account.privacyPass.fetch(userPass);
        (0, chai_1.expect)(passData.expiresAt.toNumber()).to.be.greaterThan(Date.now() / 1000);
    }));
    it('Fails to purchase with insufficient funds', () => __awaiter(void 0, void 0, void 0, function* () {
        const poorUser = web3_js_1.Keypair.generate();
        const [poorUserPass] = web3_js_1.PublicKey.findProgramAddressSync([Buffer.from('pass'), poorUser.publicKey.toBuffer()], program.programId);
        try {
            yield program.methods
                .purchasePass(2, 30) // Enterprise tier (expensive)
                .accounts({
                pass: poorUserPass,
                user: poorUser.publicKey,
                passSystem: passSystem,
                systemProgram: anchor.web3.SystemProgram.programId,
            })
                .signers([poorUser])
                .rpc();
            chai_1.expect.fail('Should have thrown error');
        }
        catch (error) {
            (0, chai_1.expect)(error).to.exist;
        }
    }));
    it('Purchases premium subscription', () => __awaiter(void 0, void 0, void 0, function* () {
        const premiumUser = web3_js_1.Keypair.generate();
        // Airdrop SOL
        const airdropSignature = yield provider.connection.requestAirdrop(premiumUser.publicKey, 10 * web3_js_1.LAMPORTS_PER_SOL);
        yield provider.connection.confirmTransaction(airdropSignature);
        const [premiumPass] = web3_js_1.PublicKey.findProgramAddressSync([Buffer.from('pass'), premiumUser.publicKey.toBuffer()], program.programId);
        const tx = yield program.methods
            .purchaseSubscription(1, 365) // Premium tier, 1 year
            .accounts({
            pass: premiumPass,
            user: premiumUser.publicKey,
            passSystem: passSystem,
            systemProgram: anchor.web3.SystemProgram.programId,
        })
            .signers([premiumUser])
            .rpc();
        console.log('Purchase subscription tx:', tx);
        const passData = yield program.account.privacyPass.fetch(premiumPass);
        (0, chai_1.expect)(passData.tier).to.equal(1); // Premium
        (0, chai_1.expect)(passData.autoRenew).to.be.true;
    }));
});
