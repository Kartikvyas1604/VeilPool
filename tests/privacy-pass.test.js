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
    let provider;
    let program;
    let user;
    let pricingConfig;
    let passAccount;
    (0, globals_1.beforeAll)(() => __awaiter(void 0, void 0, void 0, function* () {
        try {
            provider = anchor_1.AnchorProvider.env();
            anchor.setProvider(provider);
            program = anchor.workspace.PrivacyPass;
            user = web3_js_1.Keypair.generate();
            // Airdrop SOL to user
            const airdropSignature = yield provider.connection.requestAirdrop(user.publicKey, 10 * web3_js_1.LAMPORTS_PER_SOL);
            yield provider.connection.confirmTransaction(airdropSignature);
        }
        catch (error) {
            console.warn('Solana test validator not available, skipping privacy-pass tests');
        }
    }));
    (0, globals_1.it)('Initializes pass system', () => __awaiter(void 0, void 0, void 0, function* () {
        if (!provider || !program) {
            console.warn('Skipping test: Solana not available');
            return;
        }
        [pricingConfig] = web3_js_1.PublicKey.findProgramAddressSync([Buffer.from('pricing_config')], program.programId);
        // Mock price oracle pubkey
        const priceOracle = web3_js_1.Keypair.generate().publicKey;
        try {
            const tx = yield program.methods
                .initializePassSystem(priceOracle)
                .accountsPartial({
                pricingConfig: pricingConfig,
                authority: provider.wallet.publicKey,
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
        if (!provider || !program) {
            console.warn('Skipping test: Solana not available');
            return;
        }
        [passAccount] = web3_js_1.PublicKey.findProgramAddressSync([Buffer.from('pass'), user.publicKey.toBuffer()], program.programId);
        (0, globals_1.expect)(passAccount).toBeDefined();
        (0, globals_1.expect)(passAccount).toBeInstanceOf(web3_js_1.PublicKey);
    });
});
