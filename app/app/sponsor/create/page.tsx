'use client';

import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PublicKey, Transaction, SystemProgram } from '@solana/web3.js';
import { Program, AnchorProvider, web3, BN } from '@coral-xyz/anchor';
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddress, createAssociatedTokenAccountInstruction } from '@solana/spl-token';

export default function CreatePool() {
  const router = useRouter();
  const { publicKey, signTransaction, sendTransaction } = useWallet();
  const { connection } = useConnection();
  
  const [poolName, setPoolName] = useState('');
  const [description, setDescription] = useState('');
  const [fundingAmount, setFundingAmount] = useState('');
  const [tokenType, setTokenType] = useState<'SOL' | 'USDC' | 'USDT'>('SOL');
  const [allocationPerUser, setAllocationPerUser] = useState('10');
  const [beneficiaries, setBeneficiaries] = useState<string>('');
  const [autoRefill, setAutoRefill] = useState(false);
  const [refillThreshold, setRefillThreshold] = useState('20');
  const [creating, setCreating] = useState(false);

  const PRIVACY_POOL_PROGRAM_ID = new PublicKey('H18E4aE9pJXteWcEZxcxwvC6ueFhTToCT9Qr5ynpmu1e');

  const handleCreate = async () => {
    if (!publicKey || !signTransaction || !sendTransaction) {
      alert('Please connect your wallet first');
      return;
    }

    if (!poolName || !fundingAmount || parseFloat(fundingAmount) <= 0) {
      alert('Please fill in all required fields');
      return;
    }

    setCreating(true);

    try {
      // Generate unique pool ID
      const poolId = Date.now();
      const lamports = parseFloat(fundingAmount) * web3.LAMPORTS_PER_SOL;

      // Derive PDAs
      const [poolAccount] = PublicKey.findProgramAddressSync(
        [Buffer.from('pool'), publicKey.toBuffer(), Buffer.from([poolId & 0xFF])],
        PRIVACY_POOL_PROGRAM_ID
      );

      const [poolVault] = PublicKey.findProgramAddressSync(
        [Buffer.from('pool-vault'), poolAccount.toBuffer()],
        PRIVACY_POOL_PROGRAM_ID
      );

      // For demo purposes, simulate successful creation
      console.log('Creating pool:', {
        poolId,
        name: poolName,
        funding: lamports,
        allocationPerUser: parseInt(allocationPerUser),
        tokenType,
      });

      // In production, create actual transaction using Anchor
      /*
      const tx = await program.methods
        .createPool(
          new BN(poolId),
          poolName,
          new BN(lamports),
          new BN(parseInt(allocationPerUser))
        )
        .accounts({
          poolAccount,
          poolVault,
          sponsor: publicKey,
          tokenMint: TOKEN_MINT_ADDRESS,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc();
      */

      alert(`Pool "${poolName}" created successfully!`);
      
      // Add beneficiaries if provided
      if (beneficiaries.trim()) {
        const addresses = beneficiaries.split('\n').filter(a => a.trim());
        console.log(`Adding ${addresses.length} beneficiaries...`);
        // In production, batch add beneficiaries
      }

      router.push('/sponsor/pools');
    } catch (error) {
      console.error('Error creating pool:', error);
      alert('Failed to create pool. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  const estimatedCost = () => {
    if (!fundingAmount || parseFloat(fundingAmount) <= 0) return 0;
    // Estimate based on $0.50/GB
    const funding = parseFloat(fundingAmount);
    const solPrice = 100; // Approximate
    const gbPerDollar = 2;
    return Math.floor((funding * solPrice) * gbPerDollar);
  };

  const maxBeneficiaries = () => {
    const total = estimatedCost();
    const perUser = parseInt(allocationPerUser) || 10;
    return Math.floor(total / perUser);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-black text-white">
      <nav className="border-b border-white/10 backdrop-blur-sm bg-black/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg"></div>
              <span className="text-2xl font-bold">VeilPool</span>
            </Link>
            <div className="flex items-center space-x-4">
              <Link href="/sponsor/pools" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors">
                My Pools
              </Link>
              <WalletMultiButton />
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <Link href="/sponsor/pools" className="text-purple-400 hover:text-purple-300 mb-4 inline-block">
            ← Back to Pools
          </Link>
          <h1 className="text-4xl font-bold mb-2">Create Sponsored Pool</h1>
          <p className="text-gray-400">Fund privacy access for your community</p>
        </div>

        {!publicKey ? (
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-12 text-center">
            <h2 className="text-2xl font-bold mb-4">Connect Your Wallet</h2>
            <p className="text-gray-400 mb-6">Please connect your wallet to create a pool</p>
          </div>
        ) : (
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8">
            <div className="space-y-6">
              {/* Pool Name */}
              <div>
                <label className="block text-sm font-medium mb-2">Pool Name *</label>
                <input
                  type="text"
                  value={poolName}
                  onChange={(e) => setPoolName(e.target.value)}
                  placeholder="e.g., Journalist Privacy Fund"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-purple-500"
                  maxLength={128}
                />
                <p className="text-sm text-gray-500 mt-1">{poolName.length}/128 characters</p>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium mb-2">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the purpose of this pool..."
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-purple-500 h-24 resize-none"
                  maxLength={500}
                />
                <p className="text-sm text-gray-500 mt-1">{description.length}/500 characters</p>
              </div>

              {/* Funding Amount */}
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium mb-2">Funding Amount *</label>
                  <div className="flex space-x-2">
                    <input
                      type="number"
                      value={fundingAmount}
                      onChange={(e) => setFundingAmount(e.target.value)}
                      placeholder="100"
                      min="0"
                      step="0.1"
                      className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-purple-500"
                    />
                    <select
                      value={tokenType}
                      onChange={(e) => setTokenType(e.target.value as 'SOL' | 'USDC' | 'USDT')}
                      className="px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-purple-500"
                    >
                      <option value="SOL">SOL</option>
                      <option value="USDC">USDC</option>
                      <option value="USDT">USDT</option>
                    </select>
                  </div>
                  {fundingAmount && (
                    <p className="text-sm text-purple-400 mt-2">
                      ≈ {estimatedCost()} GB of bandwidth
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Allocation per User (GB) *</label>
                  <input
                    type="number"
                    value={allocationPerUser}
                    onChange={(e) => setAllocationPerUser(e.target.value)}
                    placeholder="10"
                    min="1"
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-purple-500"
                  />
                  {fundingAmount && allocationPerUser && (
                    <p className="text-sm text-blue-400 mt-2">
                      Max {maxBeneficiaries()} beneficiaries
                    </p>
                  )}
                </div>
              </div>

              {/* Beneficiaries */}
              <div>
                <label className="block text-sm font-medium mb-2">Initial Beneficiaries (Optional)</label>
                <textarea
                  value={beneficiaries}
                  onChange={(e) => setBeneficiaries(e.target.value)}
                  placeholder="Paste wallet addresses (one per line)&#10;5xJ8v...&#10;7kP9m...&#10;9qR4n..."
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-purple-500 h-32 resize-none font-mono text-sm"
                />
                <p className="text-sm text-gray-500 mt-1">
                  {beneficiaries.split('\n').filter(a => a.trim()).length} addresses
                </p>
              </div>

              {/* Auto-refill */}
              <div className="bg-white/5 rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-medium">Auto-Refill</h3>
                    <p className="text-sm text-gray-400">Automatically add funds when balance is low</p>
                  </div>
                  <button
                    onClick={() => setAutoRefill(!autoRefill)}
                    className={`w-14 h-7 rounded-full transition-colors ${
                      autoRefill ? 'bg-purple-600' : 'bg-white/10'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 bg-white rounded-full transition-transform ${
                        autoRefill ? 'translate-x-8' : 'translate-x-1'
                      }`}
                    ></div>
                  </button>
                </div>

                {autoRefill && (
                  <div>
                    <label className="block text-sm font-medium mb-2">Refill Threshold (%)</label>
                    <input
                      type="number"
                      value={refillThreshold}
                      onChange={(e) => setRefillThreshold(e.target.value)}
                      min="10"
                      max="50"
                      className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-purple-500"
                    />
                    <p className="text-sm text-gray-400 mt-2">
                      Trigger refill when balance drops below {refillThreshold}%
                    </p>
                  </div>
                )}
              </div>

              {/* Summary */}
              <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 rounded-lg p-6 border border-purple-500/20">
                <h3 className="font-bold mb-4 text-lg">Pool Summary</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Initial Funding:</span>
                    <span className="font-medium">{fundingAmount || '0'} {tokenType}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Total Bandwidth:</span>
                    <span className="font-medium">{estimatedCost()} GB</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Per User:</span>
                    <span className="font-medium">{allocationPerUser || '0'} GB</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Max Beneficiaries:</span>
                    <span className="font-medium">{maxBeneficiaries()}</span>
                  </div>
                  <div className="flex justify-between border-t border-white/10 pt-2 mt-2">
                    <span className="text-gray-400">Estimated Cost:</span>
                    <span className="font-bold text-lg">{fundingAmount || '0'} {tokenType}</span>
                  </div>
                </div>
              </div>

              {/* Create Button */}
              <button
                onClick={handleCreate}
                disabled={creating || !poolName || !fundingAmount}
                className="w-full px-6 py-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 rounded-lg transition-all font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {creating ? (
                  <span className="flex items-center justify-center">
                    <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Creating Pool...
                  </span>
                ) : (
                  'Create Pool'
                )}
              </button>

              <p className="text-sm text-gray-400 text-center">
                By creating a pool, you agree to the{' '}
                <a href="#" className="text-purple-400 hover:text-purple-300">terms of service</a>
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
