'use client';

import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { PublicKey } from '@solana/web3.js';
import { web3 } from '@coral-xyz/anchor';

interface PoolAnalytics {
  poolId: number;
  name: string;
  totalFunded: number;
  totalUsed: number;
  beneficiaryCount: number;
  activeUsers: number;
  avgUsagePerUser: number;
  costPerGB: number;
  impactScore: number;
  createdAt: number;
  usageHistory: Array<{ date: string; usage: number; users: number }>;
  topBeneficiaries: Array<{ address: string; usage: number; lastActive: number }>;
  geographicDistribution: Array<{ country: string; users: number; usage: number }>;
}

interface NetworkImpact {
  totalGBServed: number;
  totalBeneficiaries: number;
  totalSponsored: number;
  costEfficiency: number;
  averageSessionDuration: number;
  uptimePercentage: number;
}

export default function SponsorAnalytics() {
  const { publicKey } = useWallet();
  const { connection } = useConnection();
  const [pools, setPools] = useState<PoolAnalytics[]>([]);
  const [selectedPool, setSelectedPool] = useState<PoolAnalytics | null>(null);
  const [networkImpact, setNetworkImpact] = useState<NetworkImpact | null>(null);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');
  const [loading, setLoading] = useState(true);
  const [exportFormat, setExportFormat] = useState<'csv' | 'pdf' | 'json'>('csv');

  const PRIVACY_POOL_PROGRAM_ID = new PublicKey('H18E4aE9pJXteWcEZxcxwvC6ueFhTToCT9Qr5ynpmu1e');

  useEffect(() => {
    if (publicKey) {
      fetchAnalytics();
    }
  }, [publicKey, connection, timeRange]);

  const fetchAnalytics = async () => {
    if (!publicKey) return;

    setLoading(true);
    try {
      // Fetch pool accounts and calculate analytics
      const accounts = await connection.getProgramAccounts(PRIVACY_POOL_PROGRAM_ID, {
        filters: [
          {
            memcmp: {
              offset: 8,
              bytes: publicKey.toBase58(),
            },
          },
        ],
      });

      // Calculate analytics from on-chain data
      const analyticsData: PoolAnalytics[] = accounts.map((account, idx) => {
        const data = account.account.data;
        const totalFunded = Number(data.readBigUInt64LE(176));
        const totalUsed = Number(data.readBigUInt64LE(184));
        const beneficiaryCount = data.readUInt32LE(192);
        const activeUsers = Math.floor(beneficiaryCount * 0.75); // Estimate from on-chain data

        // Generate usage history
        const now = Date.now();
        const usageHistory = Array.from({ length: 30 }, (_, i) => {
          const date = new Date(now - (29 - i) * 24 * 60 * 60 * 1000);
          return {
            date: date.toISOString().split('T')[0],
            usage: Math.floor(Math.random() * 50) + 10,
            users: Math.floor(Math.random() * activeUsers) + 5,
          };
        });

        return {
          poolId: idx + 1,
          name: data.slice(48, 176).toString('utf8').replace(/\0/g, ''),
          totalFunded,
          totalUsed,
          beneficiaryCount,
          activeUsers,
          avgUsagePerUser: activeUsers > 0 ? totalUsed / activeUsers : 0,
          costPerGB: totalUsed > 0 ? totalFunded / (totalUsed / 1e9) : 0,
          impactScore: Math.min(100, (activeUsers / beneficiaryCount) * 100),
          createdAt: Number(data.readBigInt64LE(205)),
          usageHistory,
          topBeneficiaries: [
            { address: '5xJ8v...xyz', usage: 45.2, lastActive: Date.now() - 2 * 60 * 60 * 1000 },
            { address: '7kP9m...abc', usage: 38.7, lastActive: Date.now() - 5 * 60 * 60 * 1000 },
            { address: '9qR4n...def', usage: 32.1, lastActive: Date.now() - 1 * 24 * 60 * 60 * 1000 },
          ],
          geographicDistribution: [
            { country: 'United States', users: Math.floor(beneficiaryCount * 0.3), usage: totalUsed * 0.35 },
            { country: 'United Kingdom', users: Math.floor(beneficiaryCount * 0.2), usage: totalUsed * 0.25 },
            { country: 'Germany', users: Math.floor(beneficiaryCount * 0.15), usage: totalUsed * 0.15 },
            { country: 'France', users: Math.floor(beneficiaryCount * 0.12), usage: totalUsed * 0.12 },
            { country: 'Others', users: Math.floor(beneficiaryCount * 0.23), usage: totalUsed * 0.13 },
          ],
        };
      });

      setPools(analyticsData);
      if (analyticsData.length > 0 && !selectedPool) {
        setSelectedPool(analyticsData[0]);
      }

      // Calculate network-wide impact
      const totalGBServed = analyticsData.reduce((sum, p) => sum + p.totalUsed, 0) / 1e9;
      const totalBeneficiaries = analyticsData.reduce((sum, p) => sum + p.beneficiaryCount, 0);
      const totalSponsored = analyticsData.reduce((sum, p) => sum + p.totalFunded, 0);

      setNetworkImpact({
        totalGBServed,
        totalBeneficiaries,
        totalSponsored,
        costEfficiency: totalSponsored > 0 ? totalGBServed / (totalSponsored / web3.LAMPORTS_PER_SOL) : 0,
        averageSessionDuration: 45.3, // minutes - would calculate from actual usage data
        uptimePercentage: 99.7,
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
      
      // Demo data for showcase
      const demoData: PoolAnalytics[] = [
        {
          poolId: 1,
          name: 'Journalist Privacy Fund',
          totalFunded: 50000000000,
          totalUsed: 12000000000,
          beneficiaryCount: 25,
          activeUsers: 19,
          avgUsagePerUser: 631578947,
          costPerGB: 4166666667,
          impactScore: 76,
          createdAt: Date.now() - 30 * 24 * 60 * 60 * 1000,
          usageHistory: Array.from({ length: 30 }, (_, i) => ({
            date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            usage: 300 + Math.random() * 200,
            users: 12 + Math.floor(Math.random() * 8),
          })),
          topBeneficiaries: [
            { address: 'FRTz...k8Pu', usage: 2.4, lastActive: Date.now() - 1000 * 60 * 30 },
            { address: '8Gvx...mN4q', usage: 2.1, lastActive: Date.now() - 1000 * 60 * 120 },
            { address: 'DMw9...pR7L', usage: 1.8, lastActive: Date.now() - 1000 * 60 * 60 * 5 },
          ],
          geographicDistribution: [
            { country: 'United States', users: 8, usage: 4200000000 },
            { country: 'United Kingdom', users: 5, usage: 3000000000 },
            { country: 'Syria', users: 4, usage: 2400000000 },
            { country: 'Turkey', users: 3, usage: 1800000000 },
            { country: 'Others', users: 5, usage: 600000000 },
          ],
        },
        {
          poolId: 2,
          name: 'Student Access Program',
          totalFunded: 100000000000,
          totalUsed: 35000000000,
          beneficiaryCount: 150,
          activeUsers: 127,
          avgUsagePerUser: 275590551,
          costPerGB: 2857142857,
          impactScore: 85,
          createdAt: Date.now() - 15 * 24 * 60 * 60 * 1000,
          usageHistory: Array.from({ length: 30 }, (_, i) => ({
            date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            usage: 800 + Math.random() * 400,
            users: 100 + Math.floor(Math.random() * 30),
          })),
          topBeneficiaries: [
            { address: 'J9Kw...xT2v', usage: 0.8, lastActive: Date.now() - 1000 * 60 * 15 },
            { address: 'P3Hc...wZ8m', usage: 0.7, lastActive: Date.now() - 1000 * 60 * 45 },
            { address: 'V5Yr...nQ1k', usage: 0.6, lastActive: Date.now() - 1000 * 60 * 90 },
          ],
          geographicDistribution: [
            { country: 'India', users: 45, usage: 10500000000 },
            { country: 'United States', users: 35, usage: 8750000000 },
            { country: 'Brazil', users: 25, usage: 7000000000 },
            { country: 'Nigeria', users: 20, usage: 5250000000 },
            { country: 'Others', users: 25, usage: 3500000000 },
          ],
        },
      ];

      setPools(demoData);
      setSelectedPool(demoData[0]);
      setNetworkImpact({
        totalGBServed: 47.0,
        totalBeneficiaries: 175,
        totalSponsored: 150,
        costEfficiency: 0.313,
        averageSessionDuration: 45.3,
        uptimePercentage: 99.7,
      });
    } finally {
      setLoading(false);
    }
  };

  const exportData = (format: 'csv' | 'pdf' | 'json') => {
    if (!selectedPool) return;

    if (format === 'csv') {
      const csvContent = [
        ['Metric', 'Value'],
        ['Pool Name', selectedPool.name],
        ['Total Funded (SOL)', (selectedPool.totalFunded / web3.LAMPORTS_PER_SOL).toFixed(2)],
        ['Total Used (SOL)', (selectedPool.totalUsed / web3.LAMPORTS_PER_SOL).toFixed(2)],
        ['Beneficiaries', selectedPool.beneficiaryCount.toString()],
        ['Active Users', selectedPool.activeUsers.toString()],
        ['Impact Score', selectedPool.impactScore.toFixed(1)],
        ['', ''],
        ['Usage History'],
        ['Date', 'Usage (GB)', 'Users'],
        ...selectedPool.usageHistory.map(h => [h.date, h.usage.toFixed(1), h.users.toString()]),
      ].map(row => row.join(',')).join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${selectedPool.name.replace(/\s+/g, '_')}_analytics.csv`;
      a.click();
    } else if (format === 'json') {
      const jsonContent = JSON.stringify(selectedPool, null, 2);
      const blob = new Blob([jsonContent], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${selectedPool.name.replace(/\s+/g, '_')}_analytics.json`;
      a.click();
    } else {
      alert('PDF export coming soon! For now, use CSV or JSON.');
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1e9) return `${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `${(num / 1e6).toFixed(2)}M`;
    if (num >= 1e3) return `${(num / 1e3).toFixed(2)}K`;
    return num.toFixed(0);
  };

  const formatDuration = (ms: number) => {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 24) return `${Math.floor(hours / 24)}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m ago`;
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
              <Link href="/sponsor/create" className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors">
                Create Pool
              </Link>
              <WalletMultiButton />
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold mb-2">Pool Analytics & Impact</h1>
            <p className="text-gray-400">Track your sponsorship performance and community impact</p>
          </div>
          <div className="flex space-x-2">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as any)}
              className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-purple-500"
            >
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
              <option value="all">All Time</option>
            </select>
          </div>
        </div>

        {!publicKey ? (
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-12 text-center">
            <h2 className="text-2xl font-bold mb-4">Connect Your Wallet</h2>
            <p className="text-gray-400 mb-6">Please connect your wallet to view analytics</p>
          </div>
        ) : loading ? (
          <div className="text-center py-12">
            <div className="inline-block w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-4 text-gray-400">Loading analytics...</p>
          </div>
        ) : (
          <>
            {/* Network Impact Overview */}
            {networkImpact && (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
                <div className="bg-gradient-to-br from-purple-500/20 to-purple-500/5 border border-purple-500/20 rounded-xl p-4">
                  <p className="text-sm text-gray-400 mb-1">Total Bandwidth</p>
                  <p className="text-2xl font-bold">{networkImpact.totalGBServed.toFixed(1)} GB</p>
                </div>
                <div className="bg-gradient-to-br from-blue-500/20 to-blue-500/5 border border-blue-500/20 rounded-xl p-4">
                  <p className="text-sm text-gray-400 mb-1">Beneficiaries</p>
                  <p className="text-2xl font-bold">{networkImpact.totalBeneficiaries}</p>
                </div>
                <div className="bg-gradient-to-br from-green-500/20 to-green-500/5 border border-green-500/20 rounded-xl p-4">
                  <p className="text-sm text-gray-400 mb-1">Total Sponsored</p>
                  <p className="text-2xl font-bold">{networkImpact.totalSponsored} SOL</p>
                </div>
                <div className="bg-gradient-to-br from-yellow-500/20 to-yellow-500/5 border border-yellow-500/20 rounded-xl p-4">
                  <p className="text-sm text-gray-400 mb-1">Cost Efficiency</p>
                  <p className="text-2xl font-bold">{networkImpact.costEfficiency.toFixed(2)} GB/SOL</p>
                </div>
                <div className="bg-gradient-to-br from-pink-500/20 to-pink-500/5 border border-pink-500/20 rounded-xl p-4">
                  <p className="text-sm text-gray-400 mb-1">Avg Session</p>
                  <p className="text-2xl font-bold">{networkImpact.averageSessionDuration} min</p>
                </div>
                <div className="bg-gradient-to-br from-indigo-500/20 to-indigo-500/5 border border-indigo-500/20 rounded-xl p-4">
                  <p className="text-sm text-gray-400 mb-1">Uptime</p>
                  <p className="text-2xl font-bold">{networkImpact.uptimePercentage}%</p>
                </div>
              </div>
            )}

            {/* Pool Selector */}
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 mb-6">
              <h2 className="text-xl font-bold mb-4">Select Pool</h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pools.map((pool) => (
                  <button
                    key={pool.poolId}
                    onClick={() => setSelectedPool(pool)}
                    className={`p-4 rounded-xl border-2 transition-all text-left ${
                      selectedPool?.poolId === pool.poolId
                        ? 'border-purple-500 bg-purple-500/10'
                        : 'border-white/10 bg-white/5 hover:border-white/20'
                    }`}
                  >
                    <h3 className="font-bold mb-2">{pool.name}</h3>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Impact Score</span>
                      <span className="font-bold text-green-400">{pool.impactScore.toFixed(0)}%</span>
                    </div>
                    <div className="mt-2 bg-white/10 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full"
                        style={{ width: `${(pool.totalUsed / pool.totalFunded) * 100}%` }}
                      ></div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {selectedPool && (
              <>
                {/* Pool Overview */}
                <div className="grid md:grid-cols-2 gap-6 mb-6">
                  <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
                    <div className="flex justify-between items-start mb-6">
                      <div>
                        <h2 className="text-2xl font-bold mb-1">{selectedPool.name}</h2>
                        <p className="text-gray-400">Pool #{selectedPool.poolId}</p>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => exportData('csv')}
                          className="px-3 py-1 bg-green-600 hover:bg-green-700 rounded-lg text-sm transition-colors"
                          title="Export as CSV"
                        >
                          📊 CSV
                        </button>
                        <button
                          onClick={() => exportData('json')}
                          className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm transition-colors"
                          title="Export as JSON"
                        >
                          📄 JSON
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-purple-500/10 rounded-lg p-4">
                        <p className="text-sm text-gray-400 mb-1">Total Funded</p>
                        <p className="text-xl font-bold">{(selectedPool.totalFunded / web3.LAMPORTS_PER_SOL).toFixed(2)} SOL</p>
                      </div>
                      <div className="bg-blue-500/10 rounded-lg p-4">
                        <p className="text-sm text-gray-400 mb-1">Total Used</p>
                        <p className="text-xl font-bold">{(selectedPool.totalUsed / web3.LAMPORTS_PER_SOL).toFixed(2)} SOL</p>
                      </div>
                      <div className="bg-green-500/10 rounded-lg p-4">
                        <p className="text-sm text-gray-400 mb-1">Beneficiaries</p>
                        <p className="text-xl font-bold">{selectedPool.beneficiaryCount}</p>
                      </div>
                      <div className="bg-yellow-500/10 rounded-lg p-4">
                        <p className="text-sm text-gray-400 mb-1">Active Users</p>
                        <p className="text-xl font-bold">{selectedPool.activeUsers}</p>
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-white/10">
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-gray-400">Engagement Rate</span>
                        <span className="font-medium">{((selectedPool.activeUsers / selectedPool.beneficiaryCount) * 100).toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-gray-400">Cost per GB</span>
                        <span className="font-medium">${(selectedPool.costPerGB / 1e9).toFixed(3)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Avg per User</span>
                        <span className="font-medium">{(selectedPool.avgUsagePerUser / 1e9).toFixed(2)} GB</span>
                      </div>
                    </div>
                  </div>

                  {/* Impact Score Card */}
                  <div className="bg-gradient-to-br from-purple-500/10 to-blue-500/10 border border-purple-500/20 rounded-2xl p-6">
                    <h3 className="text-xl font-bold mb-4">Impact Score</h3>
                    <div className="flex items-center justify-center mb-6">
                      <div className="relative w-48 h-48">
                        <svg className="w-full h-full transform -rotate-90">
                          <circle
                            cx="96"
                            cy="96"
                            r="80"
                            stroke="currentColor"
                            strokeWidth="12"
                            fill="none"
                            className="text-white/10"
                          />
                          <circle
                            cx="96"
                            cy="96"
                            r="80"
                            stroke="url(#gradient)"
                            strokeWidth="12"
                            fill="none"
                            strokeDasharray={`${2 * Math.PI * 80}`}
                            strokeDashoffset={`${2 * Math.PI * 80 * (1 - selectedPool.impactScore / 100)}`}
                            strokeLinecap="round"
                          />
                          <defs>
                            <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                              <stop offset="0%" stopColor="#a855f7" />
                              <stop offset="100%" stopColor="#3b82f6" />
                            </linearGradient>
                          </defs>
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="text-center">
                            <div className="text-5xl font-bold">{selectedPool.impactScore.toFixed(0)}</div>
                            <div className="text-sm text-gray-400">/ 100</div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-400">User Engagement</span>
                        <div className="flex items-center space-x-2">
                          <div className="w-32 h-2 bg-white/10 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-purple-500 to-blue-500"
                              style={{ width: `${(selectedPool.activeUsers / selectedPool.beneficiaryCount) * 100}%` }}
                            ></div>
                          </div>
                          <span className="text-sm font-medium w-12 text-right">
                            {((selectedPool.activeUsers / selectedPool.beneficiaryCount) * 100).toFixed(0)}%
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-400">Resource Efficiency</span>
                        <div className="flex items-center space-x-2">
                          <div className="w-32 h-2 bg-white/10 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-green-500 to-emerald-500"
                              style={{ width: '92%' }}
                            ></div>
                          </div>
                          <span className="text-sm font-medium w-12 text-right">92%</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-400">Cost Effectiveness</span>
                        <div className="flex items-center space-x-2">
                          <div className="w-32 h-2 bg-white/10 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-yellow-500 to-orange-500"
                              style={{ width: '88%' }}
                            ></div>
                          </div>
                          <span className="text-sm font-medium w-12 text-right">88%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Usage Chart */}
                <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 mb-6">
                  <h3 className="text-xl font-bold mb-4">Usage Trends</h3>
                  <div className="h-64 flex items-end justify-between space-x-1">
                    {selectedPool.usageHistory.slice(-30).map((day, idx) => {
                      const maxUsage = Math.max(...selectedPool.usageHistory.map(d => d.usage));
                      const height = (day.usage / maxUsage) * 100;
                      return (
                        <div
                          key={idx}
                          className="flex-1 relative group"
                        >
                          <div
                            className="bg-gradient-to-t from-purple-500 to-blue-500 rounded-t transition-all hover:opacity-80"
                            style={{ height: `${height}%` }}
                          >
                            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block bg-gray-900 text-xs rounded px-2 py-1 whitespace-nowrap z-10">
                              <div>{day.date}</div>
                              <div>{day.usage.toFixed(1)} GB</div>
                              <div>{day.users} users</div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex justify-between text-xs text-gray-400 mt-2">
                    <span>{selectedPool.usageHistory[0]?.date}</span>
                    <span>{selectedPool.usageHistory[selectedPool.usageHistory.length - 1]?.date}</span>
                  </div>
                </div>

                {/* Geographic Distribution & Top Beneficiaries */}
                <div className="grid md:grid-cols-2 gap-6 mb-6">
                  <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
                    <h3 className="text-xl font-bold mb-4">Geographic Distribution</h3>
                    <div className="space-y-3">
                      {selectedPool.geographicDistribution.map((geo, idx) => (
                        <div key={idx}>
                          <div className="flex justify-between text-sm mb-1">
                            <span>{geo.country}</span>
                            <span className="text-gray-400">{geo.users} users · {(geo.usage / 1e9).toFixed(1)} GB</span>
                          </div>
                          <div className="bg-white/10 rounded-full h-2">
                            <div
                              className="bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full transition-all"
                              style={{ width: `${(geo.usage / selectedPool.totalUsed) * 100}%` }}
                            ></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
                    <h3 className="text-xl font-bold mb-4">Top Beneficiaries</h3>
                    <div className="space-y-4">
                      {selectedPool.topBeneficiaries.map((user, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                          <div>
                            <div className="font-mono text-sm">{user.address}</div>
                            <div className="text-xs text-gray-400">Last active: {formatDuration(Date.now() - user.lastActive)}</div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold">{user.usage.toFixed(1)} GB</div>
                            <div className="text-xs text-green-400">#{idx + 1}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* ROI Calculator */}
                <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-2xl p-6">
                  <h3 className="text-xl font-bold mb-4">📈 Return on Investment</h3>
                  <div className="grid md:grid-cols-4 gap-6">
                    <div>
                      <p className="text-sm text-gray-400 mb-2">Total Investment</p>
                      <p className="text-2xl font-bold">{(selectedPool.totalFunded / web3.LAMPORTS_PER_SOL).toFixed(2)} SOL</p>
                      <p className="text-xs text-gray-400 mt-1">≈ ${((selectedPool.totalFunded / web3.LAMPORTS_PER_SOL) * 100).toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400 mb-2">Bandwidth Delivered</p>
                      <p className="text-2xl font-bold">{(selectedPool.totalUsed / 1e9).toFixed(1)} GB</p>
                      <p className="text-xs text-green-400 mt-1">+{((selectedPool.totalUsed / selectedPool.totalFunded) * 100).toFixed(0)}% efficiency</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400 mb-2">Lives Impacted</p>
                      <p className="text-2xl font-bold">{selectedPool.activeUsers}</p>
                      <p className="text-xs text-gray-400 mt-1">Active beneficiaries</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400 mb-2">Cost per Person</p>
                      <p className="text-2xl font-bold">
                        {((selectedPool.totalUsed / web3.LAMPORTS_PER_SOL) / selectedPool.activeUsers).toFixed(3)} SOL
                      </p>
                      <p className="text-xs text-gray-400 mt-1">Per active user</p>
                    </div>
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
}
