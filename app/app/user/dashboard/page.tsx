'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Shield, ArrowRight, Activity, Zap } from 'lucide-react';
import { NeonButton } from '@/components/ui/NeonButton';

export default function UserDashboard() {
  const { publicKey } = useWallet();
  const [bandwidthRemaining, setBandwidthRemaining] = useState(245);
  const [isConnected, setIsConnected] = useState(false);
  const [currentNode, setCurrentNode] = useState('US-WEST-1');
  const [latency, setLatency] = useState(36);

  useEffect(() => {
    const interval = setInterval(() => {
      setLatency(Math.floor(Math.random() * 40) + 20);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-16 flex justify-between items-center">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-500 flex items-center justify-center">
              <Shield size={20} className="text-white" />
            </div>
            <span className="text-xl font-semibold">VeilPool</span>
          </Link>
          <WalletMultiButton />
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-12">
        <div className="mb-10">
          <h1 className="text-3xl font-bold mb-2">User Dashboard</h1>
          <p className="text-zinc-400">Manage your privacy passes and connections</p>
        </div>

        {!publicKey ? (
          <div className="pro-card p-12 text-center">
            <Shield className="w-16 h-16 text-zinc-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-3">Connect Your Wallet</h2>
            <p className="text-zinc-400 mb-6">Please connect your wallet to access the dashboard</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid md:grid-cols-3 gap-6">
              <div className="pro-card p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm text-zinc-400 font-medium">Bandwidth Remaining</h3>
                  <Activity size={18} className="text-blue-400" />
                </div>
                <p className="text-4xl font-bold mb-4">{bandwidthRemaining} GB</p>
                <div className="bg-zinc-800 rounded-full h-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full transition-all" 
                    style={{ width: `${(bandwidthRemaining/500)*100}%` }}
                  />
                </div>
                <p className="text-xs text-zinc-500 mt-2">{((bandwidthRemaining/500)*100).toFixed(0)}% available</p>
              </div>

              <div className="pro-card p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm text-zinc-400 font-medium">Connection Status</h3>
                  <Zap size={18} className="text-yellow-400" />
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-zinc-600'} animate-pulse`} />
                  <p className="text-2xl font-bold">{isConnected ? 'Connected' : 'Disconnected'}</p>
                </div>
                {isConnected && (
                  <p className="text-sm text-zinc-400">Node: {currentNode}</p>
                )}
              </div>

              <div className="pro-card p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm text-zinc-400 font-medium">Latency</h3>
                  <Shield size={18} className="text-green-400" />
                </div>
                <p className="text-4xl font-bold mb-2">{latency} ms</p>
                <p className="text-sm text-zinc-400">Optimal performance</p>
              </div>
            </div>

            <div className="pro-card p-8">
              <h2 className="text-2xl font-bold mb-6">Quick Actions</h2>
              <div className="grid md:grid-cols-2 gap-4">
                <button
                  onClick={() => setIsConnected(!isConnected)}
                  className="pro-card p-6 text-left hover:border-zinc-600 transition-all"
                >
                  <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                    {isConnected ? 'Disconnect from Network' : 'Connect to Network'}
                    <ArrowRight size={16} />
                  </h3>
                  <p className="text-sm text-zinc-400">
                    {isConnected ? 'Stop routing through VeilPool' : 'Start secure browsing'}
                  </p>
                </button>

                <Link href="/user/purchase" className="block">
                  <div className="pro-card p-6 h-full hover:border-zinc-600 transition-all">
                    <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                      Buy More Bandwidth
                      <ArrowRight size={16} />
                    </h3>
                    <p className="text-sm text-zinc-400">Purchase additional privacy passes</p>
                  </div>
                </Link>
              </div>
            </div>

            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8">
              <h2 className="text-2xl font-bold mb-6">Usage History</h2>
              <div className="space-y-4">
                {[
                  { date: '2025-12-03', bandwidth: 12.4, node: 'US-WEST-1' },
                  { date: '2025-12-02', bandwidth: 8.7, node: 'DE-CENTRAL-2' },
                  { date: '2025-12-01', bandwidth: 15.2, node: 'US-EAST-3' },
                ].map((entry, i) => (
                  <div key={i} className="flex justify-between items-center p-4 rounded-xl bg-white/5">
                    <div>
                      <p className="font-semibold">{entry.date}</p>
                      <p className="text-sm text-gray-400">{entry.node}</p>
                    </div>
                    <p className="text-lg font-bold">{entry.bandwidth} GB</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
