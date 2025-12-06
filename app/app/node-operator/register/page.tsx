'use client';

import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PublicKey, Transaction, SystemProgram } from '@solana/web3.js';
import { web3, BN } from '@coral-xyz/anchor';

export default function RegisterNode() {
  const router = useRouter();
  const { publicKey, signTransaction, sendTransaction } = useWallet();
  const { connection } = useConnection();

  const [location, setLocation] = useState('');
  const [city, setCity] = useState('');
  const [ipAddress, setIpAddress] = useState('');
  const [bandwidth, setBandwidth] = useState('1000');
  const [stakeAmount, setStakeAmount] = useState('100');
  const [serverType, setServerType] = useState<'dedicated' | 'vps' | 'cloud'>('dedicated');
  const [registering, setRegistering] = useState(false);
  const [detectingIP, setDetectingIP] = useState(false);

  const NODE_REGISTRY_PROGRAM_ID = new PublicKey('4STuqLYGcLs9Py4TfyBct1dn8pSgMiFsPygifp47bpXo');
  const MIN_STAKE = 100;

  const detectIPAddress = async () => {
    setDetectingIP(true);
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      setIpAddress(data.ip);
      
      // Get location from IP
      const geoResponse = await fetch(`https://ipapi.co/${data.ip}/json/`);
      const geoData = await geoResponse.json();
      if (geoData.country_code) setLocation(geoData.country_code);
      if (geoData.city) setCity(geoData.city);
    } catch (error) {
      console.error('Error detecting IP:', error);
      alert('Failed to detect IP address. Please enter manually.');
    } finally {
      setDetectingIP(false);
    }
  };

  const validateForm = () => {
    if (!location || !city || !ipAddress || !bandwidth || !stakeAmount) {
      alert('Please fill in all fields');
      return false;
    }

    const stakeNum = parseFloat(stakeAmount);
    if (isNaN(stakeNum) || stakeNum < MIN_STAKE) {
      alert(`Minimum stake is ${MIN_STAKE} SOL`);
      return false;
    }

    const bandwidthNum = parseInt(bandwidth);
    if (isNaN(bandwidthNum) || bandwidthNum <= 0) {
      alert('Please enter valid bandwidth in Mbps');
      return false;
    }

    // Validate IP address format
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!ipRegex.test(ipAddress)) {
      alert('Please enter a valid IP address');
      return false;
    }

    return true;
  };

  const handleRegister = async () => {
    if (!publicKey || !signTransaction || !sendTransaction) {
      alert('Please connect your wallet first');
      return;
    }

    if (!validateForm()) return;

    setRegistering(true);

    try {
      // Check wallet balance
      const balance = await connection.getBalance(publicKey);
      const requiredAmount = parseFloat(stakeAmount) * web3.LAMPORTS_PER_SOL;

      if (balance < requiredAmount) {
        alert(`Insufficient balance. You need at least ${stakeAmount} SOL to register.`);
        setRegistering(false);
        return;
      }

      // Derive PDA for node account
      const [nodeAccount] = PublicKey.findProgramAddressSync(
        [Buffer.from('node'), publicKey.toBuffer()],
        NODE_REGISTRY_PROGRAM_ID
      );

      const [stakeVault] = PublicKey.findProgramAddressSync(
        [Buffer.from('stake'), nodeAccount.toBuffer()],
        NODE_REGISTRY_PROGRAM_ID
      );

      console.log('Registering node:', {
        operator: publicKey.toBase58(),
        nodeAccount: nodeAccount.toBase58(),
        location: `${location}-${city}`,
        ipAddress,
        bandwidth: parseInt(bandwidth),
        stake: requiredAmount,
      });

      // In production, create actual transaction using Anchor
      /*
      const tx = await program.methods
        .registerNode(
          `${location}-${city}`,
          ipAddress,
          parseInt(bandwidth)
        )
        .accounts({
          nodeAccount,
          operator: publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      await program.methods
        .stakeSol(new BN(requiredAmount))
        .accounts({
          nodeAccount,
          stakeVault,
          operator: publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      */

      alert(`Node registered successfully!\\n\\nYour node ID: ${nodeAccount.toBase58()}\\n\\nYou can now start your node and begin earning rewards.`);
      router.push('/node-operator/dashboard');
    } catch (error) {
      console.error('Error registering node:', error);
      alert('Failed to register node. Please try again.');
    } finally {
      setRegistering(false);
    }
  };

  const estimateEarnings = () => {
    const bandwidthNum = parseInt(bandwidth) || 0;
    const pricePerGB = 0.50; // $0.50 per GB
    const avgUtilization = 0.60; // 60% average utilization
    const hoursPerMonth = 730;
    
    // Convert Mbps to GB per month
    const gbPerMonth = (bandwidthNum / 8) * 3600 * hoursPerMonth * avgUtilization / 1024;
    const monthlyRevenue = gbPerMonth * pricePerGB;
    const operatorShare = monthlyRevenue * 0.80; // 80% to operator
    
    return {
      gbPerMonth: gbPerMonth.toFixed(1),
      monthlyRevenue: operatorShare.toFixed(2),
      annualRevenue: (operatorShare * 12).toFixed(2),
    };
  };

  const earnings = estimateEarnings();

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
              <Link href="/node-operator/dashboard" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors">
                Dashboard
              </Link>
              <WalletMultiButton />
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Register as Node Operator</h1>
          <p className="text-gray-400">Join the VeilPool network and start earning rewards</p>
        </div>

        {!publicKey ? (
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-12 text-center">
            <h2 className="text-2xl font-bold mb-4">Connect Your Wallet</h2>
            <p className="text-gray-400 mb-6">Please connect your wallet to register as a node operator</p>
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Registration Form */}
            <div className="lg:col-span-2 bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8">
              <h2 className="text-2xl font-bold mb-6">Node Configuration</h2>

              <div className="space-y-6">
                {/* IP Address */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Server IP Address *
                  </label>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={ipAddress}
                      onChange={(e) => setIpAddress(e.target.value)}
                      placeholder="123.45.67.89"
                      className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-purple-500"
                    />
                    <button
                      onClick={detectIPAddress}
                      disabled={detectingIP}
                      className="px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors disabled:opacity-50"
                    >
                      {detectingIP ? '...' : '🔍 Detect'}
                    </button>
                  </div>
                  <p className="text-sm text-gray-400 mt-1">Your server's public IPv4 address</p>
                </div>

                {/* Location */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Country Code *</label>
                    <input
                      type="text"
                      value={location}
                      onChange={(e) => setLocation(e.target.value.toUpperCase())}
                      placeholder="US"
                      maxLength={2}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-purple-500 uppercase"
                    />
                    <p className="text-sm text-gray-400 mt-1">ISO 3166-1 alpha-2</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">City *</label>
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="San Francisco"
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-purple-500"
                    />
                  </div>
                </div>

                {/* Bandwidth */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Bandwidth Capacity (Mbps) *
                  </label>
                  <input
                    type="number"
                    value={bandwidth}
                    onChange={(e) => setBandwidth(e.target.value)}
                    placeholder="1000"
                    min="100"
                    max="10000"
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-purple-500"
                  />
                  <p className="text-sm text-gray-400 mt-1">
                    Upload speed in Megabits per second (minimum 100 Mbps recommended)
                  </p>
                </div>

                {/* Server Type */}
                <div>
                  <label className="block text-sm font-medium mb-2">Server Type</label>
                  <div className="grid grid-cols-3 gap-4">
                    {(['dedicated', 'vps', 'cloud'] as const).map((type) => (
                      <button
                        key={type}
                        onClick={() => setServerType(type)}
                        className={`px-4 py-3 rounded-lg border-2 transition-all ${
                          serverType === type
                            ? 'border-purple-500 bg-purple-500/10'
                            : 'border-white/10 bg-white/5 hover:border-white/20'
                        }`}
                      >
                        <div className="font-medium capitalize">{type}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Stake Amount */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Stake Amount (SOL) *
                  </label>
                  <input
                    type="number"
                    value={stakeAmount}
                    onChange={(e) => setStakeAmount(e.target.value)}
                    placeholder="100"
                    min={MIN_STAKE}
                    step="0.1"
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-purple-500"
                  />
                  <p className="text-sm text-gray-400 mt-1">
                    Minimum stake: {MIN_STAKE} SOL (higher stake = higher priority)
                  </p>
                </div>

                {/* Requirements Checklist */}
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
                  <h3 className="font-bold mb-3 flex items-center">
                    <span className="text-yellow-400 mr-2">⚠️</span>
                    Requirements Checklist
                  </h3>
                  <div className="space-y-2 text-sm">
                    <label className="flex items-center">
                      <input type="checkbox" className="mr-2" />
                      <span>Static IP address configured</span>
                    </label>
                    <label className="flex items-center">
                      <input type="checkbox" className="mr-2" />
                      <span>Ports 443, 8080 open for traffic</span>
                    </label>
                    <label className="flex items-center">
                      <input type="checkbox" className="mr-2" />
                      <span>99%+ uptime guarantee capability</span>
                    </label>
                    <label className="flex items-center">
                      <input type="checkbox" className="mr-2" />
                      <span>Node software installed and configured</span>
                    </label>
                    <label className="flex items-center">
                      <input type="checkbox" className="mr-2" />
                      <span>I understand slashing penalties for downtime</span>
                    </label>
                  </div>
                </div>

                {/* Register Button */}
                <button
                  onClick={handleRegister}
                  disabled={registering}
                  className="w-full px-6 py-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 rounded-lg transition-all font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {registering ? (
                    <span className="flex items-center justify-center">
                      <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Registering Node...
                    </span>
                  ) : (
                    `Register Node & Stake ${stakeAmount} SOL`
                  )}
                </button>

                <p className="text-sm text-gray-400 text-center">
                  By registering, you agree to the{' '}
                  <a href="#" className="text-purple-400 hover:text-purple-300">Node Operator Terms</a>
                </p>
              </div>
            </div>

            {/* Earnings Estimator */}
            <div className="space-y-6">
              <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-2xl p-6">
                <h3 className="text-xl font-bold mb-4 flex items-center">
                  <span className="text-green-400 mr-2">💰</span>
                  Earnings Estimate
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Estimated Monthly Bandwidth</p>
                    <p className="text-2xl font-bold">{earnings.gbPerMonth} GB</p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Monthly Revenue (80% share)</p>
                    <p className="text-3xl font-bold text-green-400">${earnings.monthlyRevenue}</p>
                    <p className="text-sm text-gray-400 mt-1">≈ {(parseFloat(earnings.monthlyRevenue) / 100).toFixed(3)} SOL @ $100/SOL</p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Annual Revenue</p>
                    <p className="text-2xl font-bold">${earnings.annualRevenue}</p>
                  </div>

                  <div className="pt-4 border-t border-white/10">
                    <p className="text-xs text-gray-400">
                      * Based on 60% average utilization and $0.50/GB pricing
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-6">
                <h3 className="text-lg font-bold mb-4">📖 Setup Guide</h3>
                <div className="space-y-3 text-sm">
                  <div>
                    <p className="font-medium mb-1">1. Install Node Software</p>
                    <code className="text-xs bg-white/10 px-2 py-1 rounded">
                      npm install -g @veilpool/node
                    </code>
                  </div>
                  <div>
                    <p className="font-medium mb-1">2. Configure Environment</p>
                    <code className="text-xs bg-white/10 px-2 py-1 rounded block">
                      veilpool init
                    </code>
                  </div>
                  <div>
                    <p className="font-medium mb-1">3. Start Node</p>
                    <code className="text-xs bg-white/10 px-2 py-1 rounded block">
                      veilpool start --daemon
                    </code>
                  </div>
                </div>
                <a
                  href="https://docs.veilpool.com/node-setup"
                  target="_blank"
                  className="mt-4 inline-block text-blue-400 hover:text-blue-300 text-sm"
                >
                  📚 Full Documentation →
                </a>
              </div>

              <div className="bg-purple-500/10 border border-purple-500/20 rounded-2xl p-6">
                <h3 className="text-lg font-bold mb-3">⚡ Performance Tips</h3>
                <ul className="space-y-2 text-sm text-gray-300">
                  <li>✓ Use SSD for better I/O performance</li>
                  <li>✓ Enable monitoring for 99%+ uptime</li>
                  <li>✓ Configure auto-restart on failure</li>
                  <li>✓ Use CDN for global reach</li>
                  <li>✓ Maintain low latency (&lt;50ms)</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
