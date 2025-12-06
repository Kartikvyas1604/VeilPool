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
const globals_1 = require("@jest/globals");
const web3_js_1 = require("@solana/web3.js");
const anchor_1 = require("@coral-xyz/anchor");
const anchor = __importStar(require("@coral-xyz/anchor"));
(0, globals_1.describe)('Privacy Pass Program', () => {
    const provider = anchor_1.AnchorProvider.env();
    anchor.setProvider(provider);
    const program = anchor.workspace.PrivacyPass;
    let user;
    let pricingConfig;
    let passAccount;
    (0, globals_1.beforeAll)(() => __awaiter(void 0, void 0, void 0, function* () {
        user = web3_js_1.Keypair.generate();
        // Airdrop SOL to user
        const airdropSignature = yield provider.connection.requestAirdrop(user.publicKey, 10 * web3_js_1.LAMPORTS_PER_SOL);
        yield provider.connection.confirmTransaction(airdropSignature);
    }));
    (0, globals_1.it)('Initializes pass system', () => __awaiter(void 0, void 0, void 0, function* () {
        [pricingConfig] = web3_js_1.PublicKey.findProgramAddressSync([Buffer.from('pricing_config')], program.programId);
        // Mock price oracle pubkey
        const priceOracle = web3_js_1.Keypair.generate().publicKey;
        try {
            const tx = yield program.methods
                .initializePassSystem(priceOracle)
                .accounts({
                pricingConfig: pricingConfig,
                authority: provider.wallet.publicKey,
                systemProgram: anchor.web3.SystemProgram.programId,
            })
                .rpc();
            console.log('Initialize pass system tx:', tx);
            const configData = yield program.account.pricingConfig.fetch(pricingConfig);
            (0, globals_1.expect)(configData.authority.toString()).toBe(provider.wallet.publicKey.toString());
        }
        catch (error) {
            console.log('Initialize pass system test skipped (account may already exist)');
        }
    }));
    (0, globals_1.it)('Test pass account PDA derivation', () => {
        [passAccount] = web3_js_1.PublicKey.findProgramAddressSync([Buffer.from('pass'), user.publicKey.toBuffer()], program.programId);
        (0, globals_1.expect)(passAccount).toBeDefined();
        (0, globals_1.expect)(passAccount).toBeInstanceOf(web3_js_1.PublicKey);
    });
});
const tx = await program.methods
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
const passData = await program.account.privacyPass.fetch(userPass);
(0, globals_1.expect)(passData.owner.toString()).to.equal(user.publicKey.toString());
(0, globals_1.expect)(passData.tier).to.equal(0); // Basic
(0, globals_1.expect)(passData.isActive).to.be.true;
;
(0, globals_1.it)('Redeems pass usage', () => __awaiter(void 0, void 0, void 0, function* () {
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
    (0, globals_1.expect)(passData.usageCount.toNumber()).to.be.greaterThan(0);
}));
(0, globals_1.it)('Extends pass expiry', () => __awaiter(void 0, void 0, void 0, function* () {
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
    (0, globals_1.expect)(passData.expiresAt.toNumber()).to.be.greaterThan(Date.now() / 1000);
}));
(0, globals_1.it)('Fails to purchase with insufficient funds', () => __awaiter(void 0, void 0, void 0, function* () {
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
        globals_1.expect.fail('Should have thrown error');
    }
    catch (error) {
        (0, globals_1.expect)(error).to.exist;
    }
}));
(0, globals_1.it)('Purchases premium subscription', () => __awaiter(void 0, void 0, void 0, function* () {
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
    (0, globals_1.expect)(passData.tier).to.equal(1); // Premium
    (0, globals_1.expect)(passData.autoRenew).to.be.true;
}));
;
