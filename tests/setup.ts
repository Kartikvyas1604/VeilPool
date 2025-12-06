// Jest setup file to configure environment variables for Anchor tests
import { config } from 'dotenv';
import { resolve } from 'path';
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { homedir } from 'os';

// Load test environment variables
config({ path: resolve(__dirname, '.env.test') });

// Set default values if not provided
if (!process.env.ANCHOR_PROVIDER_URL) {
  process.env.ANCHOR_PROVIDER_URL = 'http://127.0.0.1:8899';
}

// Create a mock wallet file for testing if it doesn't exist
const walletPath = resolve(homedir(), '.config', 'solana', 'id.json');
if (!existsSync(walletPath)) {
  try {
    const walletDir = resolve(homedir(), '.config', 'solana');
    if (!existsSync(walletDir)) {
      mkdirSync(walletDir, { recursive: true });
    }
    // Create a mock wallet with a random keypair
    const mockKeypair = Array(64).fill(0).map(() => Math.floor(Math.random() * 256));
    writeFileSync(walletPath, JSON.stringify(mockKeypair));
    console.log('Created mock Solana wallet for testing');
  } catch (error) {
    console.warn('Could not create mock wallet, Anchor tests may fail:', error);
  }
}

if (!process.env.ANCHOR_WALLET) {
  process.env.ANCHOR_WALLET = walletPath;
}

