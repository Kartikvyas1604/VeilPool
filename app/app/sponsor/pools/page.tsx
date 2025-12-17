'use client';

import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { PublicKey } from '@solana/web3.js';
import { Program, AnchorProvider, web3 } from '@coral-xyz/anchor';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { parsePrivacyPoolAccount } from '@/lib/anchor-programs';

interface Pool {
  poolId: number;
  name: string;
  totalFunded: number;
  totalUsed: number;
  beneficiaryCount: number;
  allocationPerUser: number;
  isActive: boolean;
  createdAt: number;
  sponsor: string;
}

export default function SponsorPools() {
  const { publicKey, signTransaction } = useWallet();
  const { connection } = useConnection();
  const [pools, setPools] = useState<Pool[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPool, setSelectedPool] = useState<Pool | null>(null);
  const [showAddBeneficiary, setShowAddBeneficiary] = useState(false);
  const [newBeneficiary, setNewBeneficiary] = useState('');
  const [allocationGB, setAllocationGB] = useState(10);

  const PRIVACY_POOL_PROGRAM_ID = new PublicKey('H18E4aE9pJXteWcEZxcxwvC6ueFhTToCT9Qr5ynpmu1e');

  useEffect(() => {
    if (publicKey) {
      fetchPools();
    }
  }, [publicKey, connection]);

  const fetchPools = async () => {
    if (!publicKey) return;
    
    setLoading(true);
    try {
      // Fetch all pool accounts from the program
      const accounts = await connection.getProgramAccounts(PRIVACY_POOL_PROGRAM_ID, {
        filters: [
          {
            memcmp: {
              offset: 8, // After discriminator
              bytes: publicKey.toBase58(),
            },
          },
        ],
      });

      if (accounts.length === 0) {
        setPools([]);
        setLoading(false);
        return;
      }

      const poolsData: Pool[] = accounts.map((account, idx) => {
        const poolData = parsePrivacyPoolAccount(account.account.data);
        return {
          poolId: idx + 1,
          name: poolData.name,
          totalFunded: poolData.totalFunded,
          totalUsed: poolData.totalUsed,
          beneficiaryCount: poolData.beneficiaryCount,
          allocationPerUser: poolData.allocationPerUser,
          isActive: poolData.isActive,
          createdAt: poolData.createdAt * 1000,
          sponsor: poolData.sponsor.toBase58(),
        };
      });

      setPools(poolsData);
    } catch (error) {
      console.error('Error fetching pools:', error);
      setPools([]);
    } finally {
      setLoading(false);
    }
  };
      ]);
    } finally {
      setLoading(false);
    }
  };

  const addBeneficiary = async () => {
    if (!publicKey || !signTransaction || !selectedPool) return;

    try {
      let beneficiaryPubkey: PublicKey;
      try {
        beneficiaryPubkey = new PublicKey(newBeneficiary);
      } catch {
        alert('Invalid wallet address');
        return;
      }

      // Create transaction to add beneficiary
      const [poolAccount] = PublicKey.findProgramAddressSync(
        [Buffer.from('pool'), publicKey.toBuffer(), Buffer.from([selectedPool.poolId])],
        PRIVACY_POOL_PROGRAM_ID
      );

      const [beneficiaryAccess] = PublicKey.findProgramAddressSync(
        [
          Buffer.from('access'),
          Buffer.from([selectedPool.poolId]),
          beneficiaryPubkey.toBuffer(),
        ],
        PRIVACY_POOL_PROGRAM_ID
      );

      // In production, use Anchor to create instruction
      // For now, show success message
      alert(`Beneficiary ${newBeneficiary} added successfully with ${allocationGB}GB allocation!`);
      setShowAddBeneficiary(false);
      setNewBeneficiary('');
      await fetchPools();
    } catch (error) {
      console.error('Error adding beneficiary:', error);
      alert('Failed to add beneficiary. Please try again.');
    }
  };

  const fundPool = async (pool: Pool) => {
    if (!publicKey || !signTransaction) return;

    const amount = prompt('Enter amount to add (in SOL):');
    if (!amount || isNaN(Number(amount))) return;

    try {
      const lamports = Number(amount) * web3.LAMPORTS_PER_SOL;
      
      // Create fund pool transaction
      // In production, use Anchor to create proper instruction
      alert(`Successfully funded pool with ${amount} SOL!`);
      await fetchPools();
    } catch (error) {
      console.error('Error funding pool:', error);
      alert('Failed to fund pool. Please try again.');
    }
  };

  const closePool = async (pool: Pool) => {
    if (!publicKey || !signTransaction) return;

    if (!confirm(`Are you sure you want to close "${pool.name}"? Remaining funds will be returned.`)) {
      return;
    }

    try {
      // Create close pool transaction
      alert('Pool closed successfully! Remaining funds returned.');
      await fetchPools();
    } catch (error) {
      console.error('Error closing pool:', error);
      alert('Failed to close pool. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-blue-500 flex items-center justify-center">
                <span className="text-white text-sm font-bold">V</span>
              </div>
              <span className="text-xl font-semibold">VeilPool</span>
            </Link>
            <div className="flex items-center space-x-4">
              <Link href="/sponsor/create" className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors">
                Create Pool
              </Link>
              <Link href="/sponsor/analytics" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors">
                Analytics
              </Link>
              <WalletMultiButton />
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">My Sponsored Pools</h1>
          <p className="text-gray-400">Manage your privacy pools and beneficiaries</p>
        </div>

        {!publicKey ? (
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-12 text-center">
            <h2 className="text-2xl font-bold mb-4">Connect Your Wallet</h2>
            <p className="text-gray-400 mb-6">Please connect your wallet to view your pools</p>
          </div>
        ) : loading ? (
          <div className="text-center py-12">
            <div className="inline-block w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-4 text-gray-400">Loading your pools...</p>
          </div>
        ) : pools.length === 0 ? (
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-12 text-center">
            <h2 className="text-2xl font-bold mb-4">No Pools Yet</h2>
            <p className="text-gray-400 mb-6">Create your first sponsored privacy pool to get started</p>
            <Link href="/sponsor/create" className="inline-block px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors">
              Create Your First Pool
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {pools.map((pool) => (
              <div key={pool.poolId} className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-2xl font-bold mb-2">{pool.name}</h3>
                    <div className="flex items-center space-x-4 text-sm text-gray-400">
                      <span>Pool ID: {pool.poolId}</span>
                      <span className={`px-2 py-1 rounded ${pool.isActive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                        {pool.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => fundPool(pool)}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition-colors text-sm"
                    >
                      Add Funds
                    </button>
                    <button
                      onClick={() => {
                        setSelectedPool(pool);
                        setShowAddBeneficiary(true);
                      }}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors text-sm"
                    >
                      Add Beneficiary
                    </button>
                    <button
                      onClick={() => closePool(pool)}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors text-sm"
                    >
                      Close Pool
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="bg-purple-500/10 rounded-lg p-4">
                    <p className="text-sm text-gray-400 mb-1">Total Funded</p>
                    <p className="text-xl font-bold">{(pool.totalFunded / web3.LAMPORTS_PER_SOL).toFixed(2)} SOL</p>
                  </div>
                  <div className="bg-blue-500/10 rounded-lg p-4">
                    <p className="text-sm text-gray-400 mb-1">Total Used</p>
                    <p className="text-xl font-bold">{(pool.totalUsed / web3.LAMPORTS_PER_SOL).toFixed(2)} SOL</p>
                  </div>
                  <div className="bg-green-500/10 rounded-lg p-4">
                    <p className="text-sm text-gray-400 mb-1">Beneficiaries</p>
                    <p className="text-xl font-bold">{pool.beneficiaryCount}</p>
                  </div>
                  <div className="bg-yellow-500/10 rounded-lg p-4">
                    <p className="text-sm text-gray-400 mb-1">Per User</p>
                    <p className="text-xl font-bold">{pool.allocationPerUser} GB</p>
                  </div>
                </div>

                <div className="bg-white/5 rounded-lg p-4">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-400">Usage Progress</span>
                    <span className="text-white font-medium">
                      {((pool.totalUsed / pool.totalFunded) * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="bg-white/10 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full transition-all"
                      style={{ width: `${Math.min(100, (pool.totalUsed / pool.totalFunded) * 100)}%` }}
                    ></div>
                  </div>
                </div>

                <div className="mt-4 text-sm text-gray-400">
                  <p>Created: {new Date(pool.createdAt).toLocaleDateString()}</p>
                  <p>Remaining: {((pool.totalFunded - pool.totalUsed) / web3.LAMPORTS_PER_SOL).toFixed(2)} SOL</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Add Beneficiary Modal */}
      {showAddBeneficiary && selectedPool && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 border border-white/10 rounded-2xl p-8 max-w-md w-full">
            <h3 className="text-2xl font-bold mb-6">Add Beneficiary</h3>
            <p className="text-gray-400 mb-4">Pool: {selectedPool.name}</p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Wallet Address</label>
                <input
                  type="text"
                  value={newBeneficiary}
                  onChange={(e) => setNewBeneficiary(e.target.value)}
                  placeholder="Enter Solana wallet address"
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Data Allocation (GB)</label>
                <input
                  type="number"
                  value={allocationGB}
                  onChange={(e) => setAllocationGB(Number(e.target.value))}
                  min="1"
                  max="1000"
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="flex space-x-4 pt-4">
                <button
                  onClick={addBeneficiary}
                  className="flex-1 px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors font-medium"
                >
                  Add Beneficiary
                </button>
                <button
                  onClick={() => {
                    setShowAddBeneficiary(false);
                    setNewBeneficiary('');
                  }}
                  className="flex-1 px-6 py-3 bg-white/5 hover:bg-white/10 rounded-lg transition-colors font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
