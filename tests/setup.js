"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// Jest setup file to configure environment variables for Anchor tests
const dotenv_1 = require("dotenv");
const path_1 = require("path");
const fs_1 = require("fs");
const os_1 = require("os");
// Load test environment variables
(0, dotenv_1.config)({ path: (0, path_1.resolve)(__dirname, '.env.test') });
// Set default values if not provided
if (!process.env.ANCHOR_PROVIDER_URL) {
    process.env.ANCHOR_PROVIDER_URL = 'http://127.0.0.1:8899';
}
// Create a mock wallet file for testing if it doesn't exist
const walletPath = (0, path_1.resolve)((0, os_1.homedir)(), '.config', 'solana', 'id.json');
if (!(0, fs_1.existsSync)(walletPath)) {
    try {
        const walletDir = (0, path_1.resolve)((0, os_1.homedir)(), '.config', 'solana');
        if (!(0, fs_1.existsSync)(walletDir)) {
            (0, fs_1.mkdirSync)(walletDir, { recursive: true });
        }
        // Create a mock wallet with a random keypair
        const mockKeypair = Array(64).fill(0).map(() => Math.floor(Math.random() * 256));
        (0, fs_1.writeFileSync)(walletPath, JSON.stringify(mockKeypair));
        console.log('Created mock Solana wallet for testing');
    }
    catch (error) {
        console.warn('Could not create mock wallet, Anchor tests may fail:', error);
    }
}
if (!process.env.ANCHOR_WALLET) {
    process.env.ANCHOR_WALLET = walletPath;
}
