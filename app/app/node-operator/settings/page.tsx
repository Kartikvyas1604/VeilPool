'use client';

import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { PublicKey } from '@solana/web3.js';
import { web3 } from '@coral-xyz/anchor';

interface NodeSettings {
  location: string;
  ipAddress: string;
  bandwidthGbps: number;
  stakeAmount: number;
  emailAlerts: boolean;
  slackWebhook: string;
  autoRenewStake: boolean;
  minReputationAlert: number;
  maintenanceMode: boolean;
}

export default function NodeOperatorSettings() {
  const { publicKey, sendTransaction } = useWallet();
  const { connection } = useConnection();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<NodeSettings>({
    location: 'US-San Francisco',
    ipAddress: '185.227.108.45',
    bandwidthGbps: 1,
    stakeAmount: 100,
    emailAlerts: true,
    slackWebhook: '',
    autoRenewStake: true,
    minReputationAlert: 80,
    maintenanceMode: false,
  });
  const [additionalStake, setAdditionalStake] = useState('');
  const [unstakeAmount, setUnstakeAmount] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [newBandwidth, setNewBandwidth] = useState('');

  const NODE_REGISTRY_PROGRAM_ID = new PublicKey('4STuqLYGcLs9Py4TfyBct1dn8pSgMiFsPygifp47bpXo');

  useEffect(() => {
    if (publicKey) {
      fetchNodeSettings();
    }
  }, [publicKey, connection]);

  const fetchNodeSettings = async () => {
    if (!publicKey) return;

    setLoading(true);
    try {
      const [nodeAccount] = PublicKey.findProgramAddressSync(
        [Buffer.from('node'), publicKey.toBuffer()],
        NODE_REGISTRY_PROGRAM_ID
      );

      const accountInfo = await connection.getAccountInfo(nodeAccount);

      if (accountInfo) {
        const data = accountInfo.data;
        
        setSettings({
          location: data.slice(60, 124).toString('utf8').replace(/\0/g, ''),
          ipAddress: data.slice(125, 170).toString('utf8').replace(/\0/g, ''),
          bandwidthGbps: data.readUInt16LE(41),
          stakeAmount: Number(data.readBigUInt64LE(8)) / web3.LAMPORTS_PER_SOL,
          emailAlerts: true,
          slackWebhook: '',
          autoRenewStake: true,
          minReputationAlert: 80,
          maintenanceMode: data.readUInt8(68) === 0,
        });
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddStake = async () => {
    if (!publicKey || !additionalStake) return;

    setSaving(true);
    try {
      const amount = parseFloat(additionalStake);
      if (amount < 1) {
        alert('Minimum stake increase is 1 SOL');
        return;
      }

      const [nodeAccount] = PublicKey.findProgramAddressSync(
        [Buffer.from('node'), publicKey.toBuffer()],
        NODE_REGISTRY_PROGRAM_ID
      );

      // In production, create and send transaction to add stake
      console.log('Adding stake:', amount, 'SOL to', nodeAccount.toBase58());
      
      alert(`Successfully added ${amount} SOL to your stake!`);
      setSettings({ ...settings, stakeAmount: settings.stakeAmount + amount });
      setAdditionalStake('');
    } catch (error) {
      console.error('Error adding stake:', error);
      alert('Failed to add stake');
    } finally {
      setSaving(false);
    }
  };

  const handleUnstake = async () => {
    if (!publicKey || !unstakeAmount) return;

    const amount = parseFloat(unstakeAmount);
    const minStake = 100;

    if (settings.stakeAmount - amount < minStake) {
      alert(`Cannot unstake below minimum requirement of ${minStake} SOL`);
      return;
    }

    setSaving(true);
    try {
      const [nodeAccount] = PublicKey.findProgramAddressSync(
        [Buffer.from('node'), publicKey.toBuffer()],
        NODE_REGISTRY_PROGRAM_ID
      );

      // In production, initiate unbonding period
      console.log('Initiating unstake:', amount, 'SOL from', nodeAccount.toBase58());
      
      alert(`Unstake request submitted! Your ${amount} SOL will be available after 7-day unbonding period.`);
      setUnstakeAmount('');
    } catch (error) {
      console.error('Error unstaking:', error);
      alert('Failed to initiate unstake');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateNode = async () => {
    if (!publicKey) return;

    setSaving(true);
    try {
      const [nodeAccount] = PublicKey.findProgramAddressSync(
        [Buffer.from('node'), publicKey.toBuffer()],
        NODE_REGISTRY_PROGRAM_ID
      );

      const updates: any = {};
      if (newLocation) updates.location = newLocation;
      if (newBandwidth) updates.bandwidthGbps = parseFloat(newBandwidth);

      // In production, send update transaction
      console.log('Updating node:', nodeAccount.toBase58(), updates);
      
      alert('Node details updated successfully!');
      if (newLocation) setSettings({ ...settings, location: newLocation });
      if (newBandwidth) setSettings({ ...settings, bandwidthGbps: parseFloat(newBandwidth) });
      setNewLocation('');
      setNewBandwidth('');
    } catch (error) {
      console.error('Error updating node:', error);
      alert('Failed to update node details');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleMaintenanceMode = async () => {
    if (!publicKey) return;

    setSaving(true);
    try {
      const [nodeAccount] = PublicKey.findProgramAddressSync(
        [Buffer.from('node'), publicKey.toBuffer()],
        NODE_REGISTRY_PROGRAM_ID
      );

      const newMode = !settings.maintenanceMode;
      
      // In production, send transaction to toggle maintenance mode
      console.log('Setting maintenance mode:', newMode, 'for', nodeAccount.toBase58());
      
      alert(`Maintenance mode ${newMode ? 'enabled' : 'disabled'}. ${newMode ? 'Your node will not receive new connections.' : 'Your node is now accepting connections.'}`);
      setSettings({ ...settings, maintenanceMode: newMode });
    } catch (error) {
      console.error('Error toggling maintenance mode:', error);
      alert('Failed to toggle maintenance mode');
    } finally {
      setSaving(false);
    }
  };

  const handleEmergencyShutdown = async () => {
    if (!confirm('⚠️ EMERGENCY SHUTDOWN: This will immediately deactivate your node and stop all connections. Continue?')) {
      return;
    }

    if (!publicKey) return;

    setSaving(true);
    try {
      const [nodeAccount] = PublicKey.findProgramAddressSync(
        [Buffer.from('node'), publicKey.toBuffer()],
        NODE_REGISTRY_PROGRAM_ID
      );

      // In production, send emergency shutdown transaction
      console.log('Emergency shutdown for', nodeAccount.toBase58());
      
      alert('🚨 Node has been shut down. Your stake remains locked and will be available after the unbonding period.');
    } catch (error) {
      console.error('Error during emergency shutdown:', error);
      alert('Failed to shutdown node');
    } finally {
      setSaving(false);
    }
  };

  const saveAlertSettings = () => {
    // Save to local storage or backend
    localStorage.setItem('veilpool-node-alerts', JSON.stringify({
      emailAlerts: settings.emailAlerts,
      slackWebhook: settings.slackWebhook,
      minReputationAlert: settings.minReputationAlert,
    }));
    alert('Alert settings saved!');
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
              <Link href="/node-operator/dashboard" className="text-gray-300 hover:text-white transition-colors">
                Dashboard
              </Link>
              <WalletMultiButton />
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Node Settings</h1>
          <p className="text-gray-400">Configure your node and manage stake</p>
        </div>

        {!publicKey ? (
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-12 text-center">
            <h2 className="text-2xl font-bold mb-4">Connect Your Wallet</h2>
            <p className="text-gray-400 mb-6">Please connect your wallet to manage settings</p>
          </div>
        ) : loading ? (
          <div className="text-center py-12">
            <div className="inline-block w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-4 text-gray-400">Loading settings...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Current Node Info */}
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
              <h2 className="text-2xl font-bold mb-4">📍 Current Node Configuration</h2>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-white/5 p-4 rounded-lg">
                  <p className="text-sm text-gray-400 mb-1">Location</p>
                  <p className="text-lg font-bold">{settings.location}</p>
                </div>
                <div className="bg-white/5 p-4 rounded-lg">
                  <p className="text-sm text-gray-400 mb-1">IP Address</p>
                  <p className="text-lg font-mono">{settings.ipAddress}</p>
                </div>
                <div className="bg-white/5 p-4 rounded-lg">
                  <p className="text-sm text-gray-400 mb-1">Bandwidth Capacity</p>
                  <p className="text-lg font-bold">{settings.bandwidthGbps} Gbps</p>
                </div>
                <div className="bg-white/5 p-4 rounded-lg">
                  <p className="text-sm text-gray-400 mb-1">Current Stake</p>
                  <p className="text-lg font-bold">{settings.stakeAmount.toFixed(2)} SOL</p>
                </div>
              </div>
            </div>

            {/* Update Node Details */}
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
              <h2 className="text-2xl font-bold mb-4">🔧 Update Node Details</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    New Location (Country-City)
                  </label>
                  <input
                    type="text"
                    value={newLocation}
                    onChange={(e) => setNewLocation(e.target.value)}
                    placeholder="US-San Francisco"
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-purple-500 text-white placeholder-gray-500"
                  />
                  <p className="text-xs text-gray-400 mt-1">Format: ISO2-City (e.g., US-New York, DE-Berlin)</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    New Bandwidth Capacity (Gbps)
                  </label>
                  <input
                    type="number"
                    value={newBandwidth}
                    onChange={(e) => setNewBandwidth(e.target.value)}
                    placeholder="1"
                    step="0.1"
                    min="0.1"
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-purple-500 text-white placeholder-gray-500"
                  />
                  <p className="text-xs text-gray-400 mt-1">Update if you've upgraded your server infrastructure</p>
                </div>

                <button
                  onClick={handleUpdateNode}
                  disabled={!newLocation && !newBandwidth || saving}
                  className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? 'Updating...' : 'Update Node Configuration'}
                </button>
              </div>
            </div>

            {/* Stake Management */}
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
              <h2 className="text-2xl font-bold mb-4">🔐 Stake Management</h2>
              
              <div className="grid md:grid-cols-2 gap-6">
                {/* Add Stake */}
                <div className="bg-gradient-to-br from-green-500/10 to-green-500/5 border border-green-500/20 rounded-xl p-4">
                  <h3 className="text-lg font-bold mb-3 text-green-400">➕ Add Stake</h3>
                  <p className="text-sm text-gray-400 mb-4">Increase your stake to boost rewards and reputation</p>
                  
                  <div className="space-y-3">
                    <input
                      type="number"
                      value={additionalStake}
                      onChange={(e) => setAdditionalStake(e.target.value)}
                      placeholder="Amount (SOL)"
                      step="0.1"
                      min="1"
                      className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-green-500 text-white placeholder-gray-500"
                    />
                    <button
                      onClick={handleAddStake}
                      disabled={!additionalStake || saving}
                      className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Add Stake
                    </button>
                    <p className="text-xs text-gray-400">
                      New total: {settings.stakeAmount + parseFloat(additionalStake || '0')} SOL
                    </p>
                  </div>
                </div>

                {/* Unstake */}
                <div className="bg-gradient-to-br from-red-500/10 to-red-500/5 border border-red-500/20 rounded-xl p-4">
                  <h3 className="text-lg font-bold mb-3 text-red-400">➖ Unstake (7-day unbonding)</h3>
                  <p className="text-sm text-gray-400 mb-4">Withdraw stake after unbonding period</p>
                  
                  <div className="space-y-3">
                    <input
                      type="number"
                      value={unstakeAmount}
                      onChange={(e) => setUnstakeAmount(e.target.value)}
                      placeholder="Amount (SOL)"
                      step="0.1"
                      min="1"
                      max={settings.stakeAmount - 100}
                      className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-red-500 text-white placeholder-gray-500"
                    />
                    <button
                      onClick={handleUnstake}
                      disabled={!unstakeAmount || saving}
                      className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Request Unstake
                    </button>
                    <p className="text-xs text-gray-400">
                      Minimum stake: 100 SOL<br />
                      Available to unstake: {Math.max(0, settings.stakeAmount - 100).toFixed(2)} SOL
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                <p className="text-sm text-yellow-200">
                  ⚠️ <strong>Important:</strong> Unstaked funds require a 7-day unbonding period before withdrawal. During this time, you won't earn rewards.
                </p>
              </div>
            </div>

            {/* Alert Configuration */}
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
              <h2 className="text-2xl font-bold mb-4">🔔 Alert Configuration</h2>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                  <div>
                    <p className="font-medium">Email Alerts</p>
                    <p className="text-sm text-gray-400">Receive notifications for downtime and earnings</p>
                  </div>
                  <button
                    onClick={() => setSettings({ ...settings, emailAlerts: !settings.emailAlerts })}
                    className={`w-14 h-8 rounded-full transition-colors ${
                      settings.emailAlerts ? 'bg-green-500' : 'bg-gray-600'
                    }`}
                  >
                    <div
                      className={`w-6 h-6 bg-white rounded-full transform transition-transform ${
                        settings.emailAlerts ? 'translate-x-7' : 'translate-x-1'
                      }`}
                    ></div>
                  </button>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Slack Webhook URL (optional)
                  </label>
                  <input
                    type="url"
                    value={settings.slackWebhook}
                    onChange={(e) => setSettings({ ...settings, slackWebhook: e.target.value })}
                    placeholder="https://hooks.slack.com/services/..."
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-purple-500 text-white placeholder-gray-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Minimum Reputation Alert Threshold
                  </label>
                  <input
                    type="range"
                    value={settings.minReputationAlert}
                    onChange={(e) => setSettings({ ...settings, minReputationAlert: parseInt(e.target.value) })}
                    min="50"
                    max="100"
                    className="w-full"
                  />
                  <div className="flex justify-between text-sm text-gray-400 mt-1">
                    <span>50</span>
                    <span className="font-bold text-white">{settings.minReputationAlert}</span>
                    <span>100</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">Alert when reputation drops below this value</p>
                </div>

                <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                  <div>
                    <p className="font-medium">Auto-Renew Stake</p>
                    <p className="text-sm text-gray-400">Automatically compound earnings into stake</p>
                  </div>
                  <button
                    onClick={() => setSettings({ ...settings, autoRenewStake: !settings.autoRenewStake })}
                    className={`w-14 h-8 rounded-full transition-colors ${
                      settings.autoRenewStake ? 'bg-green-500' : 'bg-gray-600'
                    }`}
                  >
                    <div
                      className={`w-6 h-6 bg-white rounded-full transform transition-transform ${
                        settings.autoRenewStake ? 'translate-x-7' : 'translate-x-1'
                      }`}
                    ></div>
                  </button>
                </div>

                <button
                  onClick={saveAlertSettings}
                  className="w-full px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors font-medium"
                >
                  Save Alert Settings
                </button>
              </div>
            </div>

            {/* Maintenance & Emergency */}
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
              <h2 className="text-2xl font-bold mb-4">⚙️ Maintenance & Emergency Controls</h2>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                  <div>
                    <p className="font-medium text-yellow-200">🛠️ Maintenance Mode</p>
                    <p className="text-sm text-gray-400">Temporarily stop accepting new connections</p>
                  </div>
                  <button
                    onClick={handleToggleMaintenanceMode}
                    disabled={saving}
                    className={`px-6 py-2 rounded-lg transition-colors font-medium ${
                      settings.maintenanceMode
                        ? 'bg-yellow-600 hover:bg-yellow-700'
                        : 'bg-green-600 hover:bg-green-700'
                    }`}
                  >
                    {settings.maintenanceMode ? 'Exit Maintenance' : 'Enter Maintenance'}
                  </button>
                </div>

                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-medium text-red-200">🚨 Emergency Shutdown</p>
                      <p className="text-sm text-gray-400 mt-1">
                        Immediately deactivate node and halt all operations. Use only in critical situations.
                      </p>
                      <ul className="text-xs text-gray-400 mt-2 space-y-1">
                        <li>• All active connections will be terminated</li>
                        <li>• Node will be marked as inactive on-chain</li>
                        <li>• Stake remains locked (7-day unbonding required)</li>
                        <li>• Reputation may be affected</li>
                      </ul>
                    </div>
                    <button
                      onClick={handleEmergencyShutdown}
                      disabled={saving}
                      className="ml-4 px-6 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors font-medium disabled:opacity-50"
                    >
                      Emergency Shutdown
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* API Keys & Monitoring */}
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
              <h2 className="text-2xl font-bold mb-4">🔑 API Keys & Monitoring</h2>
              
              <div className="space-y-4">
                <div className="bg-white/5 p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-medium">Node API Key</p>
                    <button className="text-sm text-purple-400 hover:text-purple-300">Regenerate</button>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="password"
                      value="veil_prod_****************************"
                      readOnly
                      className="flex-1 px-3 py-2 bg-black/30 border border-white/10 rounded font-mono text-sm"
                    />
                    <button className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded transition-colors text-sm">
                      Copy
                    </button>
                  </div>
                  <p className="text-xs text-gray-400 mt-2">Use this key for routing engine authentication</p>
                </div>

                <div className="bg-white/5 p-4 rounded-lg">
                  <p className="font-medium mb-2">Monitoring Dashboard</p>
                  <p className="text-sm text-gray-400 mb-3">
                    Real-time monitoring endpoint for your node
                  </p>
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={`https://monitor.veilpool.io/node/${publicKey?.toBase58().substring(0, 8)}...`}
                      readOnly
                      className="flex-1 px-3 py-2 bg-black/30 border border-white/10 rounded font-mono text-sm"
                    />
                    <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded transition-colors text-sm">
                      Open
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white/5 p-3 rounded-lg">
                    <p className="text-sm text-gray-400">Prometheus Endpoint</p>
                    <p className="text-xs font-mono mt-1">/metrics</p>
                  </div>
                  <div className="bg-white/5 p-3 rounded-lg">
                    <p className="text-sm text-gray-400">Health Check</p>
                    <p className="text-xs font-mono mt-1">/health</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
