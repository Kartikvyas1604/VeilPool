import { Connection, PublicKey, Transaction } from '@solana/web3.js';

// Deployed Program IDs (Devnet - December 17, 2025)
export const PROGRAM_IDS = {
  NODE_REGISTRY: new PublicKey(process.env.NEXT_PUBLIC_NODE_REGISTRY_PROGRAM_ID || 'FepL8NfccdbfKfGNwCYGX68gLuNxw3SFc4ygvFMyE9tN'),
  PRIVACY_PASS: new PublicKey(process.env.NEXT_PUBLIC_PRIVACY_PASS_PROGRAM_ID || 'Bw98kokEAhjikV167NQEdDsbKe6hUa3Ado3bJNKQPQiZ'),
  PRIVACY_POOL: new PublicKey(process.env.NEXT_PUBLIC_PRIVACY_POOL_PROGRAM_ID || 'BEBqJeWCWgD3hST6YoxMCnHLFx1nxie235aeMRuC51iA'),
  VRF_SELECTION: new PublicKey(process.env.NEXT_PUBLIC_VRF_SELECTION_PROGRAM_ID || '35aknS1cM883peeW1JFZNhC2ooQAAv2D8wEjUisi2wui'),
};

export const RPC_URL = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com';
export const ROUTING_ENGINE_URL = process.env.NEXT_PUBLIC_ROUTING_ENGINE_URL || 'http://localhost:3001';

// Connection singleton
let connection: Connection | null = null;

export function getConnection(): Connection {
  if (!connection) {
    connection = new Connection(RPC_URL, 'confirmed');
  }
  return connection;
}

// Fetch user's privacy pass balance
export async function getUserPrivacyPass(userPubkey: PublicKey): Promise<{
  remainingGb: number;
  expiresAt: number;
  isActive: boolean;
} | null> {
  try {
    const conn = getConnection();
    
    // Find PDA for user's pass account
    const [passAccount] = PublicKey.findProgramAddressSync(
      [Buffer.from('user_pass'), userPubkey.toBuffer()],
      PROGRAM_IDS.PRIVACY_PASS
    );

    const accountInfo = await conn.getAccountInfo(passAccount);
    
    if (!accountInfo) {
      console.log('No privacy pass found for user');
      return null;
    }

    // Parse account data (adjust based on your actual account structure)
    const data = accountInfo.data;
    
    // Example parsing (adjust offsets based on your Anchor account layout)
    // Discriminator at bytes 0-8
    const remainingGb = Number(data.readBigUInt64LE(8));
    const expiresAt = Number(data.readBigInt64LE(16));
    const isActive = data.readUInt8(24) === 1;

    return {
      remainingGb: remainingGb / (1024 * 1024 * 1024), // Convert bytes to GB
      expiresAt,
      isActive,
    };
  } catch (error) {
    console.error('Error fetching privacy pass:', error);
    return null;
  }
}

interface NodeInfo {
  pubkey: string;
  operator: string;
  stakeAmount: number;
  reputation: number;
  location: string;
  bandwidthServed: number;
  uptime: number;
  lastHeartbeat: number;
  isActive: boolean;
}

// Fetch all nodes from Node Registry
export async function getAllNodes(): Promise<NodeInfo[]> {
  try {
    const conn = getConnection();
    
    // Fetch all node accounts from the program
    const accounts = await conn.getProgramAccounts(PROGRAM_IDS.NODE_REGISTRY, {
      filters: [
        {
          dataSize: 256, // Adjust to your NodeAccount size
        },
      ],
    });

    const nodes = accounts.map((account) => {
      const data = account.account.data;
      
      // Parse node data (adjust based on your actual layout)
      try {
        return {
          pubkey: account.pubkey.toBase58(),
          operator: new PublicKey(data.slice(8, 40)).toBase58(),
          stakeAmount: Number(data.readBigUInt64LE(40)),
          reputation: data.readUInt8(48),
          location: data.slice(49, 113).toString('utf-8').replace(/\0/g, ''),
          bandwidthServed: Number(data.readBigUInt64LE(113)),
          uptime: data.readUInt8(121),
          lastHeartbeat: Number(data.readBigInt64LE(122)),
          isActive: data.readUInt8(130) === 1,
        };
      } catch (e) {
        console.error('Error parsing node:', e);
        return null;
      }
    }).filter((node): node is NodeInfo => node !== null);

    return nodes;
  } catch (error) {
    console.error('Error fetching nodes:', error);
    return [];
  }
}

interface PoolInfo {
  pubkey: string;
  sponsor: string;
  name: string;
  totalFunded: number;
  totalUsed: number;
  beneficiaryCount: number;
  allocationPerUser: number;
  isActive: boolean;
  createdAt: number;
}

// Fetch sponsored pools
export async function getSponsoredPools(sponsorPubkey?: PublicKey): Promise<PoolInfo[]> {
  try {
    const conn = getConnection();
    
    type FilterType = { dataSize: number } | { memcmp: { offset: number; bytes: string } };
    const filters: FilterType[] = [{ dataSize: 512 }]; // Adjust to PoolAccount size
    
    if (sponsorPubkey) {
      filters.push({
        memcmp: {
          offset: 8, // After discriminator
          bytes: sponsorPubkey.toBase58(),
        },
      });
    }

    const accounts = await conn.getProgramAccounts(PROGRAM_IDS.PRIVACY_POOL, { filters });

    const pools = accounts.map((account) => {
      const data = account.account.data;
      
      try {
        return {
          pubkey: account.pubkey.toBase58(),
          sponsor: new PublicKey(data.slice(8, 40)).toBase58(),
          name: data.slice(40, 104).toString('utf-8').replace(/\0/g, ''),
          totalFunded: Number(data.readBigUInt64LE(104)),
          totalUsed: Number(data.readBigUInt64LE(112)),
          beneficiaryCount: data.readUInt32LE(120),
          allocationPerUser: Number(data.readBigUInt64LE(124)),
          isActive: data.readUInt8(132) === 1,
          createdAt: Number(data.readBigInt64LE(133)),
        };
      } catch (e) {
        console.error('Error parsing pool:', e);
        return null;
      }
    }).filter((pool): pool is PoolInfo => pool !== null);

    return pools;
  } catch (error) {
    console.error('Error fetching pools:', error);
    return [];
  }
}

interface NodeDecision {
  primaryNode: {
    nodeId: string;
    location: string;
    latencyMs: number;
    reputation: number;
    costPerGb: number;
  };
  backupNodes: unknown[];
  reasoning: string;
}

// Get optimal node from routing engine
export async function getOptimalNode(params: {
  userLocation?: string;
  destination?: string;
  priority?: 'cost' | 'latency' | 'balanced';
}): Promise<NodeDecision> {
  try {
    const query = new URLSearchParams({
      user_location: params.userLocation || 'US',
      destination: params.destination || 'global',
      priority: params.priority || 'balanced',
    });

    const response = await fetch(`${ROUTING_ENGINE_URL}/api/routing/optimal-node?${query}`);
    
    if (!response.ok) {
      throw new Error(`Routing engine error: ${response.statusText}`);
    }

    const decision = await response.json();
    return decision;
  } catch (error) {
    console.error('Error fetching optimal node:', error);
    // Return fallback demo node
    return {
      primaryNode: {
        nodeId: 'demo-node-1',
        location: 'US-West',
        latencyMs: 45,
        reputation: 95,
        costPerGb: 0.005,
      },
      backupNodes: [],
      reasoning: 'Fallback node (routing engine unavailable)',
    };
  }
}

// Purchase privacy pass (transaction builder)
// TODO: Implement full transaction building with actual parameters
export async function buildPurchasePassTx(): Promise<Transaction> {
  // This would build an actual transaction to purchase a pass
  // Parameters needed: userPubkey: PublicKey, bandwidthGb: number, paymentMint: PublicKey
  // For now, returning a placeholder
  const tx = new Transaction();
  
  // Add instruction to purchase_pass
  // tx.add(...)
  
  return tx;
}

// Health check for services
export async function checkServiceHealth(): Promise<{
  solana: boolean;
  routingEngine: boolean;
  redis: boolean;
}> {
  const results = {
    solana: false,
    routingEngine: false,
    redis: false,
  };

  try {
    const conn = getConnection();
    const slot = await conn.getSlot();
    results.solana = slot > 0;
  } catch (e) {
    console.error('Solana health check failed:', e);
  }

  try {
    const response = await fetch(`${ROUTING_ENGINE_URL}/health`, { 
      signal: AbortSignal.timeout(5000) 
    });
    results.routingEngine = response.ok;
  } catch (e) {
    console.error('Routing engine health check failed:', e);
  }

  return results;
}

const VeilPoolSDK = {
  getConnection,
  getUserPrivacyPass,
  getAllNodes,
  getSponsoredPools,
  getOptimalNode,
  buildPurchasePassTx,
  checkServiceHealth,
  PROGRAM_IDS,
};

export default VeilPoolSDK;
