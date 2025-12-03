'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function UserDashboard() {
  const { publicKey } = useWallet();
  const [bandwidthRemaining, setBandwidthRemaining] = useState(245);
  const [isConnected, setIsConnected] = useState(false);
  const [currentNode, setCurrentNode] = useState('US-WEST-1-A42');
  const [latency, setLatency] = useState(42);

  useEffect(() => {
    const interval = setInterval(() => {
      setLatency(Math.floor(Math.random() * 50) + 20);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-black text-white">
      <nav className="border-b border-white/10 backdrop-blur-sm bg-black/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg"></div>
              <span className="text-2xl font-bold">VeilPool</span>
            </Link>
            <WalletMultiButton />
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">User Dashboard</h1>
          <p className="text-gray-400">Manage your privacy passes and connections</p>
        </div>

        {!publicKey ? (
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-12 text-center">
            <h2 className="text-2xl font-bold mb-4">Connect Your Wallet</h2>
            <p className="text-gray-400 mb-6">Please connect your wallet to access the dashboard</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-gradient-to-br from-purple-500/20 to-purple-500/5 backdrop-blur-sm border border-purple-500/20 rounded-2xl p-6">
                <h3 className="text-sm text-gray-400 mb-2">Bandwidth Remaining</h3>
                <p className="text-4xl font-bold">{bandwidthRemaining} GB</p>
                <div className="mt-4 bg-white/10 rounded-full h-2">
                  <div className="bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full" style={{ width: `${(bandwidthRemaining/500)*100}%` }}></div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-blue-500/20 to-blue-500/5 backdrop-blur-sm border border-blue-500/20 rounded-2xl p-6">
                <h3 className="text-sm text-gray-400 mb-2">Connection Status</h3>
                <div className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-400' : 'bg-gray-400'}`}></div>
                  <p className="text-2xl font-bold">{isConnected ? 'Connected' : 'Disconnected'}</p>
                </div>
                {isConnected && (
                  <p className="text-sm text-gray-400 mt-2">Node: {currentNode}</p>
                )}
              </div>

              <div className="bg-gradient-to-br from-green-500/20 to-green-500/5 backdrop-blur-sm border border-green-500/20 rounded-2xl p-6">
                <h3 className="text-sm text-gray-400 mb-2">Latency</h3>
                <p className="text-4xl font-bold">{latency} ms</p>
                <p className="text-sm text-gray-400 mt-2">Optimal performance</p>
              </div>
            </div>

            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8">
              <h2 className="text-2xl font-bold mb-6">Quick Actions</h2>
              <div className="grid md:grid-cols-2 gap-4">
                <button
                  onClick={() => setIsConnected(!isConnected)}
                  className={`p-6 rounded-xl border transition-all ${
                    isConnected 
                      ? 'bg-red-500/20 border-red-500/30 hover:bg-red-500/30'
                      : 'bg-green-500/20 border-green-500/30 hover:bg-green-500/30'
                  }`}
                >
                  <h3 className="text-xl font-bold mb-2">
                    {isConnected ? 'Disconnect' : 'Connect to Network'}
                  </h3>
                  <p className="text-sm text-gray-400">
                    {isConnected ? 'Stop routing through VeilPool' : 'Start secure browsing'}
                  </p>
                </button>

                <Link href="/user/purchase">
                  <button className="w-full p-6 rounded-xl border bg-purple-500/20 border-purple-500/30 hover:bg-purple-500/30 transition-all">
                    <h3 className="text-xl font-bold mb-2">Buy More Bandwidth</h3>
                    <p className="text-sm text-gray-400">Purchase additional privacy passes</p>
                  </button>
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
