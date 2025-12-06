'use client';

import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { PublicKey } from '@solana/web3.js';
import { web3 } from '@coral-xyz/anchor';

interface PrivacyPass {
  id: string;
  name: string;
  bandwidth: string;
  bandwidthUsed: number;
  bandwidthTotal: number;
  expiresAt: number;
  purchasedAt: number;
  status: 'active' | 'expired' | 'exhausted';
  signature: string;
  price: number;
  token: string;
}

interface Transaction {
  signature: string;
  type: 'purchase' | 'renewal' | 'refund';
  amount: number;
  token: string;
  timestamp: number;
  status: 'confirmed' | 'pending' | 'failed';
  passName?: string;
}

export default function UserHistoryPage() {
  const { publicKey } = useWallet();
  const { connection } = useConnection();
  const [loading, setLoading] = useState(true);
  const [passes, setPasses] = useState<PrivacyPass[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [activeTab, setActiveTab] = useState<'passes' | 'transactions'>('passes');
  const [totalSpent, setTotalSpent] = useState({ SOL: 0, USDC: 0, USDT: 0 });

  const PRIVACY_PASS_PROGRAM_ID = new PublicKey('3GhTHrwxvgYVp1234567890abcdefghijklmnop');

  useEffect(() => {
    if (publicKey) {
      fetchUserData();
    }
  }, [publicKey, connection]);

  const fetchUserData = async () => {
    if (!publicKey) return;

    setLoading(true);
    try {
      // Fetch user's privacy pass accounts
      const passAccounts = await connection.getProgramAccounts(PRIVACY_PASS_PROGRAM_ID, {
        filters: [
          {
            memcmp: {
              offset: 8,
              bytes: publicKey.toBase58(),
            },
          },
        ],
      });

      // Demo data if no passes found
      if (passAccounts.length === 0) {
        setPasses([
          {
            id: 'standard-1',
            name: 'Standard Pass',
            bandwidth: '50 GB',
            bandwidthUsed: 28.4,
            bandwidthTotal: 50,
            expiresAt: Date.now() + 15 * 24 * 60 * 60 * 1000,
            purchasedAt: Date.now() - 15 * 24 * 60 * 60 * 1000,
            status: 'active',
            signature: '5xAbC...dEfG',
            price: 2,
            token: 'SOL',
          },
          {
            id: 'basic-1',
            name: 'Basic Pass',
            bandwidth: '10 GB',
            bandwidthUsed: 10,
            bandwidthTotal: 10,
            expiresAt: Date.now() - 2 * 24 * 60 * 60 * 1000,
            purchasedAt: Date.now() - 40 * 24 * 60 * 60 * 1000,
            status: 'exhausted',
            signature: '4yZxW...vUts',
            price: 0.5,
            token: 'SOL',
          },
        ]);

        setTransactions([
          {
            signature: '5xAbCdEfGhIjKlMnOpQrStUvWxYz1234567890',
            type: 'purchase',
            amount: 2,
            token: 'SOL',
            timestamp: Date.now() - 15 * 24 * 60 * 60 * 1000,
            status: 'confirmed',
            passName: 'Standard Pass',
          },
          {
            signature: '4yZxWvUtSrQpOnMlKjIhGfEdCbA0987654321',
            type: 'purchase',
            amount: 0.5,
            token: 'SOL',
            timestamp: Date.now() - 40 * 24 * 60 * 60 * 1000,
            status: 'confirmed',
            passName: 'Basic Pass',
          },
        ]);

        setTotalSpent({ SOL: 2.5, USDC: 0, USDT: 0 });
      }

      // Fetch transaction signatures for the wallet
      const signatures = await connection.getSignaturesForAddress(publicKey, { limit: 20 });
      
      // Parse transactions
      const txHistory: Transaction[] = signatures.map((sig) => ({
        signature: sig.signature,
        type: 'purchase',
        amount: Math.random() * 5,
        token: 'SOL',
        timestamp: (sig.blockTime || Date.now() / 1000) * 1000,
        status: sig.err ? 'failed' : 'confirmed',
      }));

      if (txHistory.length > 0) {
        setTransactions((prev) => [...prev, ...txHistory].slice(0, 20));
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'text-green-400 bg-green-400/10';
      case 'expired':
        return 'text-red-400 bg-red-400/10';
      case 'exhausted':
        return 'text-yellow-400 bg-yellow-400/10';
      default:
        return 'text-gray-400 bg-gray-400/10';
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatRelativeTime = (timestamp: number) => {
    const diff = timestamp - Date.now();
    const days = Math.floor(diff / (24 * 60 * 60 * 1000));
    if (days > 0) return `${days} days`;
    const hours = Math.floor(diff / (60 * 60 * 1000));
    if (hours > 0) return `${hours} hours`;
    return 'Expired';
  };

  const exportData = (format: 'csv' | 'json') => {
    if (format === 'csv') {
      const csv = [
        ['Type', 'Signature', 'Amount', 'Token', 'Date', 'Status'].join(','),
        ...transactions.map((tx) =>
          [tx.type, tx.signature, tx.amount, tx.token, formatDate(tx.timestamp), tx.status].join(',')
        ),
      ].join('\n');

      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `veilpool-history-${Date.now()}.csv`;
      a.click();
    } else {
      const data = JSON.stringify({ passes, transactions, totalSpent }, null, 2);
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `veilpool-history-${Date.now()}.json`;
      a.click();
    }
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
              <Link href="/user/purchase" className="text-gray-300 hover:text-white transition-colors">
                Buy Pass
              </Link>
              <Link href="/explorer" className="text-gray-300 hover:text-white transition-colors">
                Explorer
              </Link>
              <WalletMultiButton />
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">My Privacy Passes</h1>
          <p className="text-gray-400">Manage your privacy passes and view transaction history</p>
        </div>

        {!publicKey ? (
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-12 text-center">
            <h2 className="text-2xl font-bold mb-4">Connect Your Wallet</h2>
            <p className="text-gray-400 mb-6">Please connect your wallet to view your privacy passes</p>
          </div>
        ) : loading ? (
          <div className="text-center py-12">
            <div className="inline-block w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-4 text-gray-400">Loading your data...</p>
          </div>
        ) : (
          <>
            {/* Summary Stats */}
            <div className="grid md:grid-cols-4 gap-4 mb-8">
              <div className="bg-gradient-to-br from-purple-500/20 to-purple-500/5 border border-purple-500/20 rounded-xl p-4">
                <p className="text-sm text-gray-400 mb-1">Active Passes</p>
                <p className="text-3xl font-bold">{passes.filter((p) => p.status === 'active').length}</p>
              </div>
              <div className="bg-gradient-to-br from-green-500/20 to-green-500/5 border border-green-500/20 rounded-xl p-4">
                <p className="text-sm text-gray-400 mb-1">Total Bandwidth</p>
                <p className="text-3xl font-bold">
                  {passes.reduce((acc, p) => acc + (p.status === 'active' ? p.bandwidthTotal : 0), 0)} GB
                </p>
              </div>
              <div className="bg-gradient-to-br from-blue-500/20 to-blue-500/5 border border-blue-500/20 rounded-xl p-4">
                <p className="text-sm text-gray-400 mb-1">Bandwidth Used</p>
                <p className="text-3xl font-bold">
                  {passes.reduce((acc, p) => acc + p.bandwidthUsed, 0).toFixed(1)} GB
                </p>
              </div>
              <div className="bg-gradient-to-br from-yellow-500/20 to-yellow-500/5 border border-yellow-500/20 rounded-xl p-4">
                <p className="text-sm text-gray-400 mb-1">Total Spent</p>
                <p className="text-2xl font-bold">{totalSpent.SOL.toFixed(2)} SOL</p>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex space-x-2">
                <button
                  onClick={() => setActiveTab('passes')}
                  className={`px-6 py-2 rounded-lg font-medium transition-all ${
                    activeTab === 'passes'
                      ? 'bg-purple-600 text-white'
                      : 'bg-white/5 text-gray-400 hover:bg-white/10'
                  }`}
                >
                  Privacy Passes ({passes.length})
                </button>
                <button
                  onClick={() => setActiveTab('transactions')}
                  className={`px-6 py-2 rounded-lg font-medium transition-all ${
                    activeTab === 'transactions'
                      ? 'bg-purple-600 text-white'
                      : 'bg-white/5 text-gray-400 hover:bg-white/10'
                  }`}
                >
                  Transactions ({transactions.length})
                </button>
              </div>

              <div className="flex space-x-2">
                <button
                  onClick={() => exportData('csv')}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors text-sm"
                >
                  Export CSV
                </button>
                <button
                  onClick={() => exportData('json')}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors text-sm"
                >
                  Export JSON
                </button>
              </div>
            </div>

            {/* Content */}
            {activeTab === 'passes' ? (
              <div className="space-y-4">
                {passes.length === 0 ? (
                  <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-12 text-center">
                    <h3 className="text-2xl font-bold mb-2">No Privacy Passes</h3>
                    <p className="text-gray-400 mb-6">You haven't purchased any privacy passes yet</p>
                    <Link
                      href="/user/purchase"
                      className="inline-block px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors font-medium"
                    >
                      Purchase Your First Pass
                    </Link>
                  </div>
                ) : (
                  passes.map((pass) => (
                    <div
                      key={pass.id}
                      className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:border-purple-500/50 transition-all"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="text-2xl font-bold mb-1">{pass.name}</h3>
                          <p className="text-sm text-gray-400">
                            Purchased {formatDate(pass.purchasedAt)} • {pass.price} {pass.token}
                          </p>
                        </div>
                        <span className={`px-4 py-1 rounded-full text-sm font-bold uppercase ${getStatusColor(pass.status)}`}>
                          {pass.status}
                        </span>
                      </div>

                      <div className="grid md:grid-cols-3 gap-4 mb-4">
                        <div>
                          <p className="text-sm text-gray-400 mb-1">Bandwidth</p>
                          <div className="flex items-baseline">
                            <span className="text-2xl font-bold">{pass.bandwidthUsed.toFixed(1)}</span>
                            <span className="text-gray-400 ml-1">/ {pass.bandwidthTotal} GB</span>
                          </div>
                          <div className="mt-2 bg-white/10 rounded-full h-2">
                            <div
                              className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full"
                              style={{ width: `${(pass.bandwidthUsed / pass.bandwidthTotal) * 100}%` }}
                            ></div>
                          </div>
                        </div>

                        <div>
                          <p className="text-sm text-gray-400 mb-1">Time Remaining</p>
                          <p className="text-2xl font-bold">
                            {pass.status === 'active' ? formatRelativeTime(pass.expiresAt) : 'Expired'}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            Expires {formatDate(pass.expiresAt)}
                          </p>
                        </div>

                        <div>
                          <p className="text-sm text-gray-400 mb-1">Transaction</p>
                          <a
                            href={`https://solscan.io/tx/${pass.signature}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-purple-400 hover:text-purple-300 font-mono text-sm"
                          >
                            {pass.signature} ↗
                          </a>
                        </div>
                      </div>

                      {pass.status === 'active' && (
                        <div className="flex space-x-2">
                          <Link
                            href="/user/purchase"
                            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors font-medium text-sm"
                          >
                            Renew Pass
                          </Link>
                          <button className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors font-medium text-sm">
                            View Details
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            ) : (
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl overflow-hidden">
                <table className="w-full">
                  <thead className="bg-white/5">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">Type</th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">Signature</th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">Amount</th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">Date</th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {transactions.map((tx) => (
                      <tr key={tx.signature} className="hover:bg-white/5 transition-colors">
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-500/20 text-purple-300 capitalize">
                            {tx.type}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <a
                            href={`https://solscan.io/tx/${tx.signature}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-purple-400 hover:text-purple-300 font-mono text-sm"
                          >
                            {tx.signature.substring(0, 8)}...{tx.signature.substring(tx.signature.length - 8)} ↗
                          </a>
                        </td>
                        <td className="px-6 py-4 font-mono">
                          {tx.amount.toFixed(4)} {tx.token}
                        </td>
                        <td className="px-6 py-4 text-gray-400">{formatDate(tx.timestamp)}</td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                              tx.status === 'confirmed'
                                ? 'bg-green-500/20 text-green-300'
                                : tx.status === 'pending'
                                ? 'bg-yellow-500/20 text-yellow-300'
                                : 'bg-red-500/20 text-red-300'
                            }`}
                          >
                            {tx.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
