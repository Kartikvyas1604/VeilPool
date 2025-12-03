'use client';

import Link from 'next/link';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-black text-white">
      <nav className="border-b border-white/10 backdrop-blur-sm bg-black/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg"></div>
              <span className="text-2xl font-bold">VeilPool</span>
            </div>
            <WalletMultiButton />
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-16">
          <h1 className="text-6xl font-bold mb-6 bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
            Decentralized Privacy Infrastructure
          </h1>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            First Solana DePIN with sponsored privacy pools, AI-powered threat routing, 
            and 2-line SDK integration for any dApp
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <Link href="/user/dashboard" className="group">
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 hover:bg-white/10 transition-all hover:scale-105">
              <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold mb-2">User Dashboard</h3>
              <p className="text-gray-400">Purchase privacy passes, monitor usage, connect to secure nodes</p>
            </div>
          </Link>

          <Link href="/sponsor/pools" className="group">
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 hover:bg-white/10 transition-all hover:scale-105">
              <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold mb-2">Sponsor Pools</h3>
              <p className="text-gray-400">Create and manage privacy pools for communities, journalists, students</p>
            </div>
          </Link>

          <Link href="/node-operator/dashboard" className="group">
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 hover:bg-white/10 transition-all hover:scale-105">
              <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold mb-2">Node Operator</h3>
              <p className="text-gray-400">Register nodes, stake SOL, earn rewards from network operations</p>
            </div>
          </Link>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <div className="bg-gradient-to-br from-purple-500/10 to-blue-500/10 backdrop-blur-sm border border-white/10 rounded-2xl p-8">
            <h4 className="text-4xl font-bold mb-2">1,247</h4>
            <p className="text-gray-400">Active Nodes</p>
          </div>
          <div className="bg-gradient-to-br from-purple-500/10 to-blue-500/10 backdrop-blur-sm border border-white/10 rounded-2xl p-8">
            <h4 className="text-4xl font-bold mb-2">8.4 PB</h4>
            <p className="text-gray-400">Total Bandwidth Served</p>
          </div>
          <div className="bg-gradient-to-br from-purple-500/10 to-blue-500/10 backdrop-blur-sm border border-white/10 rounded-2xl p-8">
            <h4 className="text-4xl font-bold mb-2">99.97%</h4>
            <p className="text-gray-400">Network Uptime</p>
          </div>
        </div>

        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8">
          <h2 className="text-3xl font-bold mb-6">Why VeilPool?</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-xl font-bold mb-2 text-purple-400">🎯 Sponsored Privacy Pools</h3>
              <p className="text-gray-400">First on-chain primitive for community-funded privacy. NGOs, universities, and DAOs can sponsor access for journalists, students, and activists.</p>
            </div>
            <div>
              <h3 className="text-xl font-bold mb-2 text-blue-400">🤖 AI Threat Routing</h3>
              <p className="text-gray-400">Real-time censorship detection via Pyth oracles with sub-100ms routing decisions. Automatically avoid blocked regions.</p>
            </div>
            <div>
              <h3 className="text-xl font-bold mb-2 text-green-400">🔌 2-Line SDK Integration</h3>
              <p className="text-gray-400">Any Solana dApp adds privacy mode with just two lines of code. Infrastructure play with powerful network effects.</p>
            </div>
            <div>
              <h3 className="text-xl font-bold mb-2 text-yellow-400">⚡ Solana-Powered</h3>
              <p className="text-gray-400">Fast, cheap transactions with on-chain staking, reputation scoring, and cryptographically random node selection via VRF.</p>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-white/10 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-between items-center">
            <p className="text-gray-400">© 2025 VeilPool. Building privacy infrastructure on Solana.</p>
            <div className="flex space-x-6">
              <a href="#" className="text-gray-400 hover:text-white">Docs</a>
              <a href="#" className="text-gray-400 hover:text-white">GitHub</a>
              <a href="#" className="text-gray-400 hover:text-white">Discord</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
