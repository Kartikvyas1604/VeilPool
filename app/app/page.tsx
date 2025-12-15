'use client';

import Link from 'next/link';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import { Shield, Globe, Zap, Lock, Server, Activity, ArrowRight } from 'lucide-react';
import { NeonButton } from '@/components/ui/NeonButton';
import { GlassCard } from '@/components/ui/GlassCard';
import { StatsCard } from '@/components/ui/StatsCard';

const WalletMultiButton = dynamic(
  async () => (await import('@solana/wallet-adapter-react-ui')).WalletMultiButton,
  { ssr: false }
);

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navigation */}
      <nav className="sticky top-0 w-full z-50 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-500 flex items-center justify-center">
              <Shield className="text-white" size={20} />
            </div>
            <span className="text-xl font-semibold">VeilPool</span>
          </div>
          
          <div className="hidden md:flex items-center gap-8 text-sm text-zinc-400">
            <Link href="#features" className="hover:text-white transition-colors">Features</Link>
            <Link href="#network" className="hover:text-white transition-colors">Network</Link>
            <Link href="/explorer" className="hover:text-white transition-colors">Explorer</Link>
          </div>

          <div className="flex items-center gap-4">
            <WalletMultiButton />
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-24 pb-16 px-6">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-4xl mx-auto"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-900 border border-zinc-800 mb-8">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs text-zinc-400">Devnet Beta Live</span>
            </div>
            
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 leading-tight">
              Reclaim Your<br />
              <span className="text-blue-500">Digital Sovereignty</span>
            </h1>
            
            <p className="text-lg text-zinc-400 max-w-2xl mx-auto mb-10 leading-relaxed">
              The world's first DePIN privacy infrastructure powered by AI routing and sponsored pools. 
              Anonymous, unstoppable, and free for those who need it most.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/user/dashboard">
                <NeonButton size="lg" className="w-full sm:w-auto">
                  Launch App <ArrowRight size={16} />
                </NeonButton>
              </Link>
              <Link href="/node-operator/register">
                <NeonButton variant="outline" size="lg" className="w-full sm:w-auto">
                  Run a Node
                </NeonButton>
              </Link>
            </div>
          </motion.div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-20">
            <StatsCard 
              title="Active Nodes" 
              value="1,248" 
              icon={Server} 
              trend="+12%" 
              trendUp={true} 
            />
            <StatsCard 
              title="Protected Traffic" 
              value="4.2 PB" 
              icon={Activity} 
              trend="+8%" 
              trendUp={true} 
            />
            <StatsCard 
              title="Threats Blocked" 
              value="892K" 
              icon={Shield} 
              trend="Live" 
              trendUp={true} 
            />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 px-6 bg-zinc-950/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-3">Enterprise-Grade Privacy</h2>
            <p className="text-zinc-400">Built on Solana for speed, powered by AI for security.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <GlassCard>
              <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center mb-4">
                <Globe className="text-blue-400" size={24} />
              </div>
              <h3 className="text-xl font-semibold mb-2">Sponsored Pools</h3>
              <p className="text-zinc-400 text-sm leading-relaxed">
                NGOs and organizations fund privacy pools, allowing users in restricted regions to access the internet for free.
              </p>
            </GlassCard>

            <GlassCard>
              <div className="w-12 h-12 rounded-lg bg-yellow-500/10 flex items-center justify-center mb-4">
                <Zap className="text-yellow-400" size={24} />
              </div>
              <h3 className="text-xl font-semibold mb-2">AI-Powered Routing</h3>
              <p className="text-zinc-400 text-sm leading-relaxed">
                Real-time censorship detection with sub-100ms routing decisions. Automatically avoid blocked regions.
              </p>
            </GlassCard>

            <GlassCard>
              <div className="w-12 h-12 rounded-lg bg-green-500/10 flex items-center justify-center mb-4">
                <Lock className="text-green-400" size={24} />
              </div>
              <h3 className="text-xl font-semibold mb-2">Zero-Knowledge Access</h3>
              <p className="text-zinc-400 text-sm leading-relaxed">
                Access the network using Privacy Passes. No personal data is ever collected, stored, or transmitted.
              </p>
            </GlassCard>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-800 py-12 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center">
                <Shield className="text-white" size={16} />
              </div>
              <span className="text-lg font-semibold">VeilPool</span>
            </div>
            <p className="text-sm text-zinc-500">© 2025 VeilPool. Building privacy infrastructure on Solana.</p>
            <div className="flex gap-6 text-sm text-zinc-400">
              <a href="#" className="hover:text-white">Docs</a>
              <a href="#" className="hover:text-white">GitHub</a>
              <a href="#" className="hover:text-white">Discord</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
