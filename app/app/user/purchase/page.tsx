'use client';

import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { PublicKey, Transaction, SystemProgram } from '@solana/web3.js';
import { web3 } from '@coral-xyz/anchor';
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddress, createAssociatedTokenAccountInstruction } from '@solana/spl-token';

interface PricingTier {
  id: string;
  name: string;
  bandwidth: string;
  duration: string;
  price: number;
  token: 'SOL' | 'USDC' | 'USDT';
  features: string[];
  popular?: boolean;
}

const PRICING_TIERS: PricingTier[] = [
  {
    id: 'basic',
    name: 'Basic Pass',
    bandwidth: '10 GB',
    duration: '7 days',
    price: 0.5,
    token: 'SOL',
    features: ['10 GB data transfer', 'Standard speed', 'Valid for 7 days', 'Basic support'],
  },
  {
    id: 'standard',
    name: 'Standard Pass',
    bandwidth: '50 GB',
    duration: '30 days',
    price: 2,
    token: 'SOL',
    features: ['50 GB data transfer', 'High speed', 'Valid for 30 days', 'Priority routing', 'Email support'],
    popular: true,
  },
  {
    id: 'premium',
    name: 'Premium Pass',
    bandwidth: '200 GB',
    duration: '90 days',
    price: 6,
    token: 'SOL',
    features: ['200 GB data transfer', 'Maximum speed', 'Valid for 90 days', 'Premium nodes', '24/7 support'],
  },
  {
    id: 'unlimited',
    name: 'Unlimited Pass',
    bandwidth: 'Unlimited',
    duration: '365 days',
    price: 20,
    token: 'SOL',
    features: ['Unlimited data transfer', 'Maximum speed', 'Valid for 1 year', 'VIP node access', 'Dedicated support', 'Custom routing'],
  },
];

export default function PurchasePage() {
  const { publicKey, sendTransaction } = useWallet();
  const { connection } = useConnection();
  const [selectedTier, setSelectedTier] = useState<PricingTier | null>(null);
  const [selectedToken, setSelectedToken] = useState<'SOL' | 'USDC' | 'USDT'>('SOL');
  const [processing, setProcessing] = useState(false);
  const [tokenBalances, setTokenBalances] = useState({ SOL: 0, USDC: 0, USDT: 0 });

  const PRIVACY_PASS_PROGRAM_ID = new PublicKey('3GhTHrwxvgYVp1234567890abcdefghijklmnop');
  const USDC_MINT = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'); // Mainnet USDC
  const USDT_MINT = new PublicKey('Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB'); // Mainnet USDT

  useEffect(() => {
    if (publicKey) {
      fetchBalances();
    }
  }, [publicKey, connection]);

  const fetchBalances = async () => {
    if (!publicKey) return;

    try {
      // Get SOL balance
      const solBalance = await connection.getBalance(publicKey);
      
      // Get USDC balance
      const usdcAddress = await getAssociatedTokenAddress(USDC_MINT, publicKey);
      const usdcAccount = await connection.getAccountInfo(usdcAddress);
      const usdcBalance = usdcAccount ? Number(usdcAccount.data.readBigUInt64LE(64)) / 1e6 : 0;

      // Get USDT balance
      const usdtAddress = await getAssociatedTokenAddress(USDT_MINT, publicKey);
      const usdtAccount = await connection.getAccountInfo(usdtAddress);
      const usdtBalance = usdtAccount ? Number(usdtAccount.data.readBigUInt64LE(64)) / 1e6 : 0;

      setTokenBalances({
        SOL: solBalance / web3.LAMPORTS_PER_SOL,
        USDC: usdcBalance,
        USDT: usdtBalance,
      });
    } catch (error) {
      console.error('Error fetching balances:', error);
    }
  };

  const handlePurchase = async (tier: PricingTier) => {
    if (!publicKey) {
      alert('Please connect your wallet first');
      return;
    }

    setSelectedTier(tier);
    setProcessing(true);

    try {
      const priceInToken = selectedToken === 'SOL' ? tier.price : tier.price * 100; // Simplified conversion

      // Check balance
      if (tokenBalances[selectedToken] < priceInToken) {
        alert(`Insufficient ${selectedToken} balance. You need ${priceInToken} ${selectedToken}`);
        setProcessing(false);
        return;
      }

      // Derive PDA for user's pass account
      const [passAccount] = PublicKey.findProgramAddressSync(
        [Buffer.from('pass'), publicKey.toBuffer(), Buffer.from(tier.id)],
        PRIVACY_PASS_PROGRAM_ID
      );

      const transaction = new Transaction();

      if (selectedToken === 'SOL') {
        // SOL payment
        const instruction = SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: new PublicKey('VeiLPooL1111111111111111111111111111111111'), // Treasury
          lamports: priceInToken * web3.LAMPORTS_PER_SOL,
        });
        transaction.add(instruction);
      } else {
        // SPL Token payment
        const mint = selectedToken === 'USDC' ? USDC_MINT : USDT_MINT;
        const userTokenAccount = await getAssociatedTokenAddress(mint, publicKey);
        const treasuryTokenAccount = await getAssociatedTokenAddress(
          mint,
          new PublicKey('VeiLPooL1111111111111111111111111111111111')
        );

        // Check if user has token account
        const accountInfo = await connection.getAccountInfo(userTokenAccount);
        if (!accountInfo) {
          alert(`You don't have a ${selectedToken} account. Please set one up first.`);
          setProcessing(false);
          return;
        }

        // Add SPL transfer instruction (simplified - would use actual SPL transfer in production)
        console.log('Transferring', priceInToken, selectedToken, 'from', userTokenAccount.toBase58());
      }

      // In production, add instruction to mint privacy pass
      console.log('Minting privacy pass:', tier.id, 'to', passAccount.toBase58());

      const signature = await sendTransaction(transaction, connection);
      await connection.confirmTransaction(signature, 'confirmed');

      alert(`✅ Successfully purchased ${tier.name}!\n\nTransaction: ${signature}\n\nYour privacy pass is now active.`);
      
      // Redirect to history
      window.location.href = '/user/history';
    } catch (error) {
      console.error('Purchase error:', error);
      alert('Transaction failed. Please try again.');
    } finally {
      setProcessing(false);
      setSelectedTier(null);
    }
  };

  const getPriceInToken = (tier: PricingTier) => {
    if (selectedToken === 'SOL') return tier.price;
    // Simplified conversion (would use real oracle prices in production)
    return (tier.price * 100).toFixed(2);
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
              <Link href="/user/history" className="text-gray-300 hover:text-white transition-colors">
                My Passes
              </Link>
              <Link href="/explorer" className="text-gray-300 hover:text-white transition-colors">
                Explorer
              </Link>
              <WalletMultiButton />
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-4">Purchase Privacy Pass</h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Choose a plan that fits your needs. All passes include access to our global network of privacy nodes.
          </p>
        </div>

        {publicKey && (
          <div className="mb-8 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400 mb-2">Select Payment Method</p>
                <div className="flex space-x-2">
                  {(['SOL', 'USDC', 'USDT'] as const).map((token) => (
                    <button
                      key={token}
                      onClick={() => setSelectedToken(token)}
                      className={`px-6 py-2 rounded-lg font-medium transition-all ${
                        selectedToken === token
                          ? 'bg-purple-600 text-white'
                          : 'bg-white/5 text-gray-400 hover:bg-white/10'
                      }`}
                    >
                      {token}
                    </button>
                  ))}
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-400 mb-1">Your Balance</p>
                <p className="text-2xl font-bold">
                  {tokenBalances[selectedToken].toFixed(selectedToken === 'SOL' ? 4 : 2)} {selectedToken}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {PRICING_TIERS.map((tier) => (
            <div
              key={tier.id}
              className={`relative bg-white/5 backdrop-blur-sm border rounded-2xl p-6 transition-all hover:scale-105 ${
                tier.popular
                  ? 'border-purple-500 shadow-lg shadow-purple-500/20'
                  : 'border-white/10 hover:border-purple-500/50'
              }`}
            >
              {tier.popular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <span className="bg-gradient-to-r from-purple-600 to-blue-600 px-4 py-1 rounded-full text-xs font-bold">
                    MOST POPULAR
                  </span>
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-2xl font-bold mb-2">{tier.name}</h3>
                <div className="flex items-baseline">
                  <span className="text-4xl font-bold">{getPriceInToken(tier)}</span>
                  <span className="text-xl text-gray-400 ml-2">{selectedToken}</span>
                </div>
                <p className="text-sm text-gray-400 mt-1">{tier.bandwidth} • {tier.duration}</p>
              </div>

              <ul className="space-y-3 mb-6">
                {tier.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start text-sm">
                    <span className="text-green-400 mr-2">✓</span>
                    <span className="text-gray-300">{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handlePurchase(tier)}
                disabled={processing || !publicKey}
                className={`w-full py-3 rounded-lg font-bold transition-all ${
                  tier.popular
                    ? 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700'
                    : 'bg-white/10 hover:bg-white/20'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {processing && selectedTier?.id === tier.id ? 'Processing...' : 'Purchase Now'}
              </button>
            </div>
          ))}
        </div>

        {!publicKey && (
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-6 text-center">
            <p className="text-yellow-200 text-lg font-medium">
              👛 Connect your wallet to purchase a privacy pass
            </p>
          </div>
        )}

        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8">
          <h2 className="text-2xl font-bold mb-6">How It Works</h2>
          <div className="grid md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">1️⃣</span>
              </div>
              <h3 className="font-bold mb-2">Choose Plan</h3>
              <p className="text-sm text-gray-400">Select a privacy pass that matches your bandwidth needs</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">2️⃣</span>
              </div>
              <h3 className="font-bold mb-2">Pay with Crypto</h3>
              <p className="text-sm text-gray-400">Complete payment using SOL, USDC, or USDT tokens</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">3️⃣</span>
              </div>
              <h3 className="font-bold mb-2">Receive Pass</h3>
              <p className="text-sm text-gray-400">Your privacy pass is minted on-chain instantly</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">4️⃣</span>
              </div>
              <h3 className="font-bold mb-2">Browse Privately</h3>
              <p className="text-sm text-gray-400">Use our SDK or extension to route traffic through privacy nodes</p>
            </div>
          </div>
        </div>

        <div className="mt-8 grid md:grid-cols-3 gap-6">
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
            <h3 className="text-xl font-bold mb-3">🔒 Zero-Knowledge</h3>
            <p className="text-sm text-gray-400">
              Your browsing activity is never logged or tracked. Privacy passes are validated without revealing your identity.
            </p>
          </div>
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
            <h3 className="text-xl font-bold mb-3">🌍 Global Network</h3>
            <p className="text-sm text-gray-400">
              Access our worldwide network of high-performance nodes for fast and reliable privacy protection.
            </p>
          </div>
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
            <h3 className="text-xl font-bold mb-3">💰 Crypto-Native</h3>
            <p className="text-sm text-gray-400">
              Pay directly with SOL or stablecoins. No credit cards, no personal information required.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
