'use client';

import Link from 'next/link';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import { Shield, Globe, Zap, Lock, Server, Activity } from 'lucide-react';
import { NeonButton } from '@/components/ui/NeonButton';
import { GlassCard } from '@/components/ui/GlassCard';
import { StatsCard } from '@/components/ui/StatsCard';

const WalletMultiButton = dynamic(
  async () => (await import('@solana/wallet-adapter-react-ui')).WalletMultiButton,
  { ssr: false }
);

export default function Home() {
  return (
    <div className="min-h-screen bg-[#050505] text-white overflow-hidden selection:bg-primary/30">
      {/* Background Effects */}
      <div className="fixed inset-0 bg-grid opacity-20 pointer-events-none" />
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-primary/20 blur-[120px] rounded-full pointer-events-none opacity-20" />
      <div className="fixed bottom-0 right-0 w-[800px] h-[600px] bg-secondary/20 blur-[120px] rounded-full pointer-events-none opacity-20" />

      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 border-b border-white/5 bg-black/50 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
              <Shield className="text-white" size={24} />
            </div>
            <span className="text-2xl font-bold tracking-tighter">VEIL<span className="text-primary">POOL</span></span>
          </div>
          
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-400">
            <Link href="#features" className="hover:text-primary transition-colors">Features</Link>
            <Link href="#network" className="hover:text-primary transition-colors">Network</Link>
            <Link href="#governance" className="hover:text-primary transition-colors">Governance</Link>
          </div>

          <div className="flex items-center gap-4">
            <WalletMultiButton />
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-6">
        <div className="max-w-7xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-8">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-sm text-gray-300">Mainnet Beta Live</span>
            </div>
            
            <h1 className="text-6xl md:text-8xl font-bold tracking-tight mb-8 leading-tight">
              Reclaim Your <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-white to-secondary animate-pulse-slow">
                Digital Sovereignty
              </span>
            </h1>
            
            <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-12 leading-relaxed">
              The world's first DePIN privacy infrastructure powered by AI routing and sponsored pools. 
              Anonymous, unstoppable, and free for those who need it most.
            </p>

            <div className="flex flex-col md:flex-row items-center justify-center gap-6">
              <Link href="/user/dashboard">
                <NeonButton className="w-full md:w-auto min-w-[200px]">
                  Launch App
                </NeonButton>
              </Link>
              <Link href="/node-operator/register">
                <NeonButton variant="secondary" glow={false} className="w-full md:w-auto min-w-[200px]">
                  Run a Node
                </NeonButton>
              </Link>
            </div>
          </motion.div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-24">
            <StatsCard 
              title="Active Nodes" 
              value="1,248" 
              icon={Server} 
              trend="+12% this week" 
              trendUp={true} 
            />
            <StatsCard 
              title="Protected Traffic" 
              value="4.2 PB" 
              icon={Activity} 
              trend="+8% this week" 
              trendUp={true} 
            />
            <StatsCard 
              title="Threats Blocked" 
              value="892K" 
              icon={Shield} 
              trend="AI Detection Active" 
              trendUp={true} 
            />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-32 relative">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-20">
            <h2 className="text-4xl font-bold mb-4">Next-Gen Privacy Architecture</h2>
            <p className="text-gray-400">Built on Solana for speed, powered by AI for security.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <GlassCard className="group">
              <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Globe className="text-primary" size={32} />
              </div>
              <h3 className="text-xl font-bold mb-3">Sponsored Pools</h3>
              <p className="text-gray-400 leading-relaxed">
                NGOs and organizations can fund privacy pools, allowing users in restricted regions to access the internet for free.
              </p>
            </GlassCard>

            <GlassCard className="group">
              <div className="w-14 h-14 rounded-xl bg-secondary/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Zap className="text-secondary" size={32} />
              </div>
              <h3 className="text-xl font-bold mb-3">AI-Powered Routing</h3>
              <p className="text-gray-400 leading-relaxed">
                Our routing engine analyzes real-time censorship data to route traffic through the safest and fastest nodes automatically.
              </p>
            </GlassCard>

            <GlassCard className="group">
              <div className="w-14 h-14 rounded-xl bg-accent/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Lock className="text-accent" size={32} />
              </div>
              <h3 className="text-xl font-bold mb-3">Zero-Knowledge Access</h3>
              <p className="text-gray-400 leading-relaxed">
                Access the network using Privacy Passes. No personal data is ever collected, stored, or transmitted.
              </p>
            </GlassCard>
          </div>
        </div>
      </section>
    </div>
  );
}
