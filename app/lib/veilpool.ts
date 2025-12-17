import { Connection, PublicKey, Transaction } from '@solana/web3.js';

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
  totalSpent: number;
  passType: string;
} | null> {
  try {
    const conn = getConnection();
    
    const [passAccount] = PublicKey.findProgramAddressSync(
      [Buffer.from('user_pass'), userPubkey.toBuffer()],
      PROGRAM_IDS.PRIVACY_PASS
    );

    const accountInfo = await conn.getAccountInfo(passAccount);
    
    if (!accountInfo) {
      console.log('No privacy pass found for user');
      return null;
    }

    const data = accountInfo.data;
    
    let offset = 8;
    const user = new PublicKey(data.slice(offset, offset + 32));
    offset += 32;
    
    const remainingGb = Number(data.readBigUInt64LE(offset));
    offset += 8;
    
    const expiryTimestamp = Number(data.readBigInt64LE(offset));
    offset += 8;
    
    const poolId = data.readUInt8(offset);
    offset += 1;
    
    const hasPoolId = poolId === 1;
    if (hasPoolId) {
      offset += 8;
    }
    
    const purchasedAt = Number(data.readBigInt64LE(offset));
    offset += 8;
    
    const totalSpent = Number(data.readBigUInt64LE(offset));
    offset += 8;
    
    const passType = data.readUInt8(offset);
    offset += 1;
    
    const isActive = data.readUInt8(offset) === 1;

    return {
      remainingGb: remainingGb / (1024 * 1024 * 1024),
      expiresAt: expiryTimestamp,
      isActive,
      totalSpent: totalSpent / 1e6,
      passType: passType === 0 ? 'Pay-Per-GB' : passType === 1 ? 'Subscription' : 'Pool-Sponsored',
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
    
    const accounts = await conn.getProgramAccounts(PROGRAM_IDS.NODE_REGISTRY, {
      filters: [
        {
          dataSize: 8 + 32 + 8 + 1 + (4 + 64) + (4 + 45) + 2 + 8 + 1 + 8 + 8 + 1 + 8 + 8 + 2,
        },
      ],
    });

    const nodes = accounts.map((account) => {
      const data = account.account.data;
      
      try {
        let offset = 8;
        const operator = new PublicKey(data.slice(offset, offset + 32));
        offset += 32;
        
        const stakeAmount = Number(data.readBigUInt64LE(offset));
        offset += 8;
        
        const reputation = data.readUInt8(offset);
        offset += 1;
        
        const locationLength = data.readUInt32LE(offset);
        offset += 4;
        const location = data.slice(offset, offset + locationLength).toString('utf-8');
        offset += 64;
        
        const ipLength = data.readUInt32LE(offset);
        offset += 4;
        offset += 45;
        
        const bandwidthGbps = data.readUInt16LE(offset);
        offset += 2;
        
        const totalBandwidthServed = Number(data.readBigUInt64LE(offset));
        offset += 8;
        
        const uptimePercentage = data.readUInt8(offset);
        offset += 1;
        
        const lastHeartbeat = Number(data.readBigInt64LE(offset));
        offset += 8;
        
        const earningsAccumulated = Number(data.readBigUInt64LE(offset));
        offset += 8;
        
        const isActive = data.readUInt8(offset) === 1;

        return {
          pubkey: account.pubkey.toBase58(),
          operator: operator.toBase58(),
          stakeAmount: stakeAmount / 1e9,
          reputation,
          location: location || 'Unknown',
          bandwidthServed: totalBandwidthServed,
          uptime: uptimePercentage,
          lastHeartbeat,
          isActive,
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

export async function buildPurchasePassTx(): Promise<Transaction> {
  const tx = new Transaction();
  
  
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
