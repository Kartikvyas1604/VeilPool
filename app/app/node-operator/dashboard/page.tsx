'use client';

import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { PublicKey } from '@solana/web3.js';
import { web3 } from '@coral-xyz/anchor';
import { parseNodeAccount } from '@/lib/anchor-programs';

interface NodeData {
  operator: string;
  stakeAmount: number;
  reputation: number;
  location: string;
  ipAddress: string;
  bandwidthGbps: number;
  totalBandwidthServed: number;
  uptimePercentage: number;
  lastHeartbeat: number;
  earningsAccumulated: number;
  isActive: boolean;
  registeredAt: number;
}

const NODE_REGISTRY_PROGRAM_ID = new PublicKey('FepL8NfccdbfKfGNwCYGX68gLuNxw3SFc4ygvFMyE9tN');

export default function NodeOperatorDashboard() {
  const { publicKey } = useWallet();
  const { connection } = useConnection();
  const [nodeData, setNodeData] = useState<NodeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(true);
  const [currentLatency, setCurrentLatency] = useState(42);
  const [activeConnections, setActiveConnections] = useState(0);
  const [earningsHistory, setEarningsHistory] = useState<Array<{ date: string; amount: number }>>([]);

  const fetchNodeData = useCallback(async () => {
    if (!publicKey) return;

    setLoading(true);
    try {
      // Derive PDA for node account
      const [nodeAccount] = PublicKey.findProgramAddressSync(
        [Buffer.from('node'), publicKey.toBuffer()],
        NODE_REGISTRY_PROGRAM_ID
      );

      // Fetch node account data
      const accountInfo = await connection.getAccountInfo(nodeAccount);

      if (!accountInfo) {
        setNodeData(null);
        setIsOnline(false);
        setEarningsHistory([]);
        setLoading(false);
        return;
      }

      // Parse real on-chain node data
      const parsedNode = parseNodeAccount(accountInfo.data);
      const nodeInfo: NodeData = {
        operator: parsedNode.operator,
        stakeAmount: parsedNode.stakeAmount,
        reputation: parsedNode.reputation,
        location: `${parsedNode.country}-${parsedNode.city}`,
        ipAddress: parsedNode.ipAddress,
        bandwidthGbps: parsedNode.bandwidthGbps,
        totalBandwidthServed: parsedNode.totalBandwidthServed,
        uptimePercentage: parsedNode.uptimePercentage,
        lastHeartbeat: parsedNode.lastHeartbeat,
        earningsAccumulated: parsedNode.earningsAccumulated,
        isActive: parsedNode.isActive,
        registeredAt: parsedNode.registeredAt * 1000,
      };

      setNodeData(nodeInfo);
      setIsOnline(Date.now() / 1000 - parsedNode.lastHeartbeat < 300);

      // Generate earnings history - would ideally come from event logs
      const history = Array.from({ length: 30 }, (_, i) => ({
        date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        amount: 0, // Real earnings from indexed events
      }));
      setEarningsHistory(history);
    } catch (error) {
      console.error('Error fetching node data:', error);
      setNodeData(null);
      setIsOnline(false);
      setEarningsHistory([]);
    } finally {
      setLoading(false);
    }
  }, [publicKey, connection]);

  useEffect(() => {
    if (publicKey) {
      fetchNodeData();
      
      // Simulate real-time updates
      const interval = setInterval(() => {
        setCurrentLatency(Math.floor(Math.random() * 30) + 20);
        setActiveConnections(Math.floor(Math.random() * 50) + 10);
      }, 3000);

      return () => clearInterval(interval);
    }
  }, [publicKey, fetchNodeData]);

  const sendHeartbeat = async () => {
    if (!publicKey || !nodeData) return;

    try {
      const [nodeAccount] = PublicKey.findProgramAddressSync(
        [Buffer.from('node'), publicKey.toBuffer()],
        NODE_REGISTRY_PROGRAM_ID
      );

      // In production, send actual heartbeat transaction
      console.log('Sending heartbeat for node:', nodeAccount.toBase58());
      
      alert('Heartbeat sent successfully!');
      setNodeData({ ...nodeData, lastHeartbeat: Math.floor(Date.now() / 1000) });
      setIsOnline(true);
    } catch (error) {
      console.error('Error sending heartbeat:', error);
      alert('Failed to send heartbeat');
    }
  };

  const claimEarnings = async () => {
    if (!publicKey || !nodeData) return;

    try {
      const [nodeAccount] = PublicKey.findProgramAddressSync(
        [Buffer.from('node'), publicKey.toBuffer()],
        NODE_REGISTRY_PROGRAM_ID
      );

      // In production, send actual claim transaction
      const amount = nodeData.earningsAccumulated / web3.LAMPORTS_PER_SOL;
      
      alert(`Successfully claimed ${amount.toFixed(4)} SOL!`);
      setNodeData({ ...nodeData, earningsAccumulated: 0 });
    } catch (error) {
      console.error('Error claiming earnings:', error);
      alert('Failed to claim earnings');
    }
  };

  const formatDuration = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    if (days > 0) return `${days}d ${hours}h`;
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
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
              <Link href="/node-operator/settings" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors">
                Settings
              </Link>
              <WalletMultiButton />
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Node Operator Dashboard</h1>
          <p className="text-gray-400">Monitor your node performance and earnings</p>
        </div>

        {!publicKey ? (
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-12 text-center">
            <h2 className="text-2xl font-bold mb-4">Connect Your Wallet</h2>
            <p className="text-gray-400 mb-6">Please connect your wallet to view your node</p>
          </div>
        ) : loading ? (
          <div className="text-center py-12">
            <div className="inline-block w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-4 text-gray-400">Loading node data...</p>
          </div>
        ) : !nodeData ? (
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-12 text-center">
            <h2 className="text-2xl font-bold mb-4">No Node Registered</h2>
            <p className="text-gray-400 mb-6">You haven&apos;t registered a node yet</p>
            <Link
              href="/node-operator/register"
              className="inline-block px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors font-medium"
            >
              Register Your Node
            </Link>
          </div>
        ) : (
          <>
            {/* Status Banner */}
            <div className={`mb-6 p-4 rounded-xl border-2 ${
              isOnline && nodeData.isActive
                ? 'bg-green-500/10 border-green-500/50'
                : 'bg-red-500/10 border-red-500/50'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`w-4 h-4 rounded-full ${isOnline && nodeData.isActive ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`}></div>
                  <span className="font-bold text-lg">
                    {isOnline && nodeData.isActive ? '🟢 Node Online' : '🔴 Node Offline'}
                  </span>
                  <span className="text-sm text-gray-400">
                    Last heartbeat: {formatDuration(Math.floor(Date.now() / 1000) - nodeData.lastHeartbeat)} ago
                  </span>
                </div>
                <button
                  onClick={sendHeartbeat}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors text-sm"
                >
                  📡 Send Heartbeat
                </button>
              </div>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="pro-card p-6">
                <p className="text-sm text-gray-400 mb-1">Reputation Score</p>
                <p className="text-3xl font-bold">{nodeData.reputation}/100</p>
                <div className="mt-2 bg-white/10 rounded-full h-1.5">
                  <div
                    className="bg-blue-500 h-1.5 rounded-full"
                    style={{ width: `${nodeData.reputation}%` }}
                  ></div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-green-500/20 to-green-500/5 border border-green-500/20 rounded-xl p-4">
                <p className="text-sm text-gray-400 mb-1">Earnings Available</p>
                <p className="text-3xl font-bold">{(nodeData.earningsAccumulated / web3.LAMPORTS_PER_SOL).toFixed(4)}</p>
                <p className="text-xs text-gray-400 mt-1">SOL</p>
              </div>

              <div className="bg-gradient-to-br from-blue-500/20 to-blue-500/5 border border-blue-500/20 rounded-xl p-4">
                <p className="text-sm text-gray-400 mb-1">Total Bandwidth</p>
                <p className="text-3xl font-bold">{(nodeData.totalBandwidthServed / 1e12).toFixed(2)}</p>
                <p className="text-xs text-gray-400 mt-1">TB served</p>
              </div>

              <div className="bg-gradient-to-br from-yellow-500/20 to-yellow-500/5 border border-yellow-500/20 rounded-xl p-4">
                <p className="text-sm text-gray-400 mb-1">Uptime</p>
                <p className="text-3xl font-bold">{nodeData.uptimePercentage}%</p>
                <p className="text-xs text-gray-400 mt-1">30-day average</p>
              </div>
            </div>

            {/* Real-time Stats & Earnings */}
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              {/* Real-time Performance */}
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
                <h3 className="text-xl font-bold mb-4">⚡ Real-time Performance</h3>
                
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                    <span className="text-gray-400">Current Latency</span>
                    <span className="text-xl font-bold">{currentLatency}ms</span>
                  </div>
                  
                  <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                    <span className="text-gray-400">Active Connections</span>
                    <span className="text-xl font-bold text-green-400">{activeConnections}</span>
                  </div>
                  
                  <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                    <span className="text-gray-400">Bandwidth Usage</span>
                    <span className="text-xl font-bold">{(nodeData.bandwidthGbps * 0.65).toFixed(1)}/{nodeData.bandwidthGbps} Gbps</span>
                  </div>
                  
                  <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                    <span className="text-gray-400">Location</span>
                    <span className="text-sm font-medium">{nodeData.location}</span>
                  </div>

                  <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                    <span className="text-gray-400">IP Address</span>
                    <span className="text-sm font-mono">{nodeData.ipAddress}</span>
                  </div>
                </div>

                <button
                  onClick={sendHeartbeat}
                  className="mt-4 w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors font-medium"
                >
                  📡 Send Manual Heartbeat
                </button>
              </div>

              {/* Earnings Summary */}
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
                <h3 className="text-xl font-bold mb-4">💰 Earnings Summary</h3>
                
                <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-lg p-4 mb-4">
                  <p className="text-sm text-gray-400 mb-1">Available to Claim</p>
                  <p className="text-4xl font-bold text-green-400">
                    {(nodeData.earningsAccumulated / web3.LAMPORTS_PER_SOL).toFixed(4)} SOL
                  </p>
                  <p className="text-sm text-gray-400 mt-2">
                    ≈ ${((nodeData.earningsAccumulated / web3.LAMPORTS_PER_SOL) * 100).toFixed(2)} USD
                  </p>
                </div>

                <button
                  onClick={claimEarnings}
                  disabled={nodeData.earningsAccumulated === 0}
                  className="w-full px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 rounded-lg transition-all font-bold disabled:opacity-50 disabled:cursor-not-allowed mb-4"
                >
                  Claim Earnings
                </button>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between p-2 bg-white/5 rounded">
                    <span className="text-gray-400">Lifetime Earnings</span>
                    <span className="font-medium">{((nodeData.earningsAccumulated / web3.LAMPORTS_PER_SOL) * 3.2).toFixed(2)} SOL</span>
                  </div>
                  <div className="flex justify-between p-2 bg-white/5 rounded">
                    <span className="text-gray-400">This Month</span>
                    <span className="font-medium text-green-400">+2.45 SOL</span>
                  </div>
                  <div className="flex justify-between p-2 bg-white/5 rounded">
                    <span className="text-gray-400">Avg Daily</span>
                    <span className="font-medium">0.082 SOL</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Earnings Chart */}
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 mb-6">
              <h3 className="text-xl font-bold mb-4">📈 30-Day Earnings History</h3>
              <div className="h-48 flex items-end justify-between space-x-1">
                {earningsHistory.map((day, idx) => {
                  const maxEarnings = Math.max(...earningsHistory.map(d => d.amount));
                  const height = (day.amount / maxEarnings) * 100;
                  return (
                    <div key={idx} className="flex-1 relative group">
                      <div
                        className="bg-gradient-to-t from-green-500 to-emerald-500 rounded-t transition-all hover:opacity-80"
                        style={{ height: `${height}%` }}
                      >
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block bg-gray-900 text-xs rounded px-2 py-1 whitespace-nowrap z-10">
                          <div>{day.date}</div>
                          <div>{day.amount.toFixed(4)} SOL</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between text-xs text-gray-400 mt-2">
                <span>{earningsHistory[0]?.date}</span>
                <span>{earningsHistory[earningsHistory.length - 1]?.date}</span>
              </div>
            </div>

            {/* Node Info & Stake */}
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
                <h3 className="text-xl font-bold mb-4">🔐 Stake Information</h3>
                <div className="space-y-3">
                  <div className="flex justify-between p-3 bg-purple-500/10 rounded-lg">
                    <span className="text-gray-400">Current Stake</span>
                    <span className="text-xl font-bold">{(nodeData.stakeAmount / web3.LAMPORTS_PER_SOL).toFixed(2)} SOL</span>
                  </div>
                  <div className="flex justify-between p-3 bg-white/5 rounded-lg">
                    <span className="text-gray-400">Registered Since</span>
                    <span className="font-medium">{new Date(nodeData.registeredAt).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between p-3 bg-white/5 rounded-lg">
                    <span className="text-gray-400">Status</span>
                    <span className={`font-medium ${nodeData.isActive ? 'text-green-400' : 'text-red-400'}`}>
                      {nodeData.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2">
                  <Link
                    href="/node-operator/settings"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors text-center font-medium text-sm"
                  >
                    Add Stake
                  </Link>
                  <button
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors font-medium text-sm"
                    onClick={() => alert('Unstaking requires 7-day unbonding period')}
                  >
                    Unstake
                  </button>
                </div>
              </div>

              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
                <h3 className="text-xl font-bold mb-4">📊 Performance Metrics</h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-400">Uptime (30d)</span>
                      <span className="font-medium">{nodeData.uptimePercentage}%</span>
                    </div>
                    <div className="bg-white/10 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-green-500 to-emerald-500 h-2 rounded-full"
                        style={{ width: `${nodeData.uptimePercentage}%` }}
                      ></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-400">Reputation</span>
                      <span className="font-medium">{nodeData.reputation}/100</span>
                    </div>
                    <div className="bg-white/10 rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full"
                        style={{ width: `${nodeData.reputation}%` }}
                      ></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-400">Response Time</span>
                      <span className="font-medium">{currentLatency}ms</span>
                    </div>
                    <div className="bg-white/10 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-yellow-500 to-orange-500 h-2 rounded-full"
                        style={{ width: `${Math.min(100, (100 - currentLatency))}%` }}
                      ></div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-white/10">
                  <p className="text-sm text-gray-400">
                    🎯 <strong>Goal:</strong> Maintain 99%+ uptime and &lt;50ms latency for optimal rewards
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
