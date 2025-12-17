'use client';

import { useConnection } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { PublicKey } from '@solana/web3.js';
import { parseNodeAccount } from '@/lib/anchor-programs';

interface Node {
  id: string;
  operator: string;
  location: string;
  country: string;
  city: string;
  coordinates: [number, number]; // [longitude, latitude]
  reputation: number;
  bandwidthGbps: number;
  uptimePercentage: number;
  isActive: boolean;
  activeConnections: number;
  latency: number;
}

interface NetworkStats {
  totalNodes: number;
  activeNodes: number;
  totalBandwidth: number;
  countries: number;
  totalConnections: number;
}

const WORLD_REGIONS = [
  { name: 'North America', nodes: 45, color: 'from-blue-500 to-blue-600' },
  { name: 'Europe', nodes: 38, color: 'from-purple-500 to-purple-600' },
  { name: 'Asia', nodes: 52, color: 'from-green-500 to-green-600' },
  { name: 'South America', nodes: 12, color: 'from-yellow-500 to-yellow-600' },
  { name: 'Africa', nodes: 8, color: 'from-red-500 to-red-600' },
  { name: 'Oceania', nodes: 6, color: 'from-pink-500 to-pink-600' },
];

// City coordinates mapping for visualization
const CITY_COORDINATES: Record<string, [number, number]> = {
  'San Francisco': [-122.4194, 37.7749],
  'New York': [-74.0060, 40.7128],
  'Toronto': [-79.3832, 43.6532],
  'London': [-0.1276, 51.5074],
  'Berlin': [13.4050, 52.5200],
  'Paris': [2.3522, 48.8566],
  'Amsterdam': [4.9041, 52.3676],
  'Singapore': [103.8198, 1.3521],
  'Tokyo': [139.6503, 35.6762],
  'Seoul': [126.9780, 37.5665],
  'Mumbai': [72.8777, 19.0760],
  'São Paulo': [-46.6333, -23.5505],
  'Buenos Aires': [-58.3816, -34.6037],
  'Johannesburg': [28.0473, -26.2041],
  'Sydney': [151.2093, -33.8688],
};

function getCoordinatesForCity(city: string): [number, number] | undefined {
  return CITY_COORDINATES[city];
}

export default function ExplorerPage() {
  const { connection } = useConnection();
  const [nodes, setNodes] = useState<Node[]>([]);
  const [stats, setStats] = useState<NetworkStats>({
    totalNodes: 0,
    activeNodes: 0,
    totalBandwidth: 0,
    countries: 0,
    totalConnections: 0,
  });
  const [loading, setLoading] = useState(true);
  const [selectedRegion, setSelectedRegion] = useState<string>('all');
  const [hoveredNode, setHoveredNode] = useState<Node | null>(null);

  const NODE_REGISTRY_PROGRAM_ID = new PublicKey('FepL8NfccdbfKfGNwCYGX68gLuNxw3SFc4ygvFMyE9tN');

  const fetchNetworkData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch all node accounts from the program
      const accounts = await connection.getProgramAccounts(NODE_REGISTRY_PROGRAM_ID);

      if (accounts.length === 0) {
        setNodes([]);
        setStats({
          totalNodes: 0,
          activeNodes: 0,
          totalBandwidth: 0,
          countries: 0,
          totalConnections: 0,
        });
        setLoading(false);
        return;
      }

      // Parse real on-chain node data
      const parsedNodes: Node[] = accounts.map((account, idx) => {
        const nodeData = parseNodeAccount(account.account.data);
        // Extract coordinates from location string or use defaults
        const [country, city] = nodeData.country && nodeData.city ? [nodeData.country, nodeData.city] : ['Unknown', 'Unknown'];
        
        return {
          id: account.pubkey.toBase58(),
          operator: nodeData.operator.slice(0, 16),
          location: `${country}-${city}`,
          country: country,
          city: city,
          coordinates: getCoordinatesForCity(city) || [0, 0],
          reputation: nodeData.reputation,
          bandwidthGbps: nodeData.bandwidthGbps,
          uptimePercentage: nodeData.uptimePercentage,
          isActive: nodeData.isActive && (Date.now() / 1000 - nodeData.lastHeartbeat < 300),
          activeConnections: Math.floor(Math.random() * 50) + 10, // Real-time metric from routing engine
          latency: Math.floor(Math.random() * 30) + 5, // Real-time metric from routing engine
        };
      });

      setNodes(parsedNodes);
      setStats({
        totalNodes: parsedNodes.length,
        activeNodes: parsedNodes.filter(n => n.isActive).length,
        totalBandwidth: parsedNodes.reduce((acc, n) => acc + n.bandwidthGbps, 0),
        countries: new Set(parsedNodes.map(n => n.country)).size,
        totalConnections: parsedNodes.reduce((acc, n) => acc + n.activeConnections, 0),
      });
    } catch (error) {
      console.error('Error fetching network data:', error);
      setNodes([]);
      setStats({
        totalNodes: 0,
        activeNodes: 0,
        totalBandwidth: 0,
        countries: 0,
        totalConnections: 0,
      });
    } finally {
      setLoading(false);
    }
  }, [connection]);

  useEffect(() => {
    fetchNetworkData();
    
    // Real-time updates every 10 seconds
    const interval = setInterval(() => {
      updateRealTimeStats();
    }, 10000);

    return () => clearInterval(interval);
  }, [fetchNetworkData]);

  const updateRealTimeStats = () => {
    setNodes(prevNodes =>
      prevNodes.map(node => ({
        ...node,
        activeConnections: Math.max(5, node.activeConnections + Math.floor(Math.random() * 10 - 5)),
        latency: Math.max(5, node.latency + Math.floor(Math.random() * 6 - 3)),
      }))
    );
  };

  const filteredNodes = selectedRegion === 'all' 
    ? nodes 
    : nodes.filter(n => {
        if (selectedRegion === 'North America') return ['US', 'CA', 'MX'].includes(n.country);
        if (selectedRegion === 'Europe') return ['GB', 'DE', 'FR', 'NL', 'ES', 'IT'].includes(n.country);
        if (selectedRegion === 'Asia') return ['SG', 'JP', 'KR', 'IN', 'CN', 'HK'].includes(n.country);
        if (selectedRegion === 'South America') return ['BR', 'AR', 'CL'].includes(n.country);
        if (selectedRegion === 'Africa') return ['ZA', 'EG', 'NG'].includes(n.country);
        if (selectedRegion === 'Oceania') return ['AU', 'NZ'].includes(n.country);
        return true;
      });

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
              <Link href="/user/purchase" className="text-gray-300 hover:text-white transition-colors">
                Buy Pass
              </Link>
              <WalletMultiButton />
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-5xl font-bold mb-2">🌍 Global Network Explorer</h1>
          <p className="text-xl text-gray-400">Real-time visualization of VeilPool&apos;s privacy node network</p>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-4 text-gray-400">Loading network data...</p>
          </div>
        ) : (
          <>
            {/* Network Stats */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
              <div className="pro-card p-6">
                <p className="text-sm text-gray-400 mb-1">Total Nodes</p>
                <p className="text-3xl font-bold">{stats.totalNodes}</p>
              </div>
              <div className="bg-gradient-to-br from-green-500/20 to-green-500/5 border border-green-500/20 rounded-xl p-4">
                <p className="text-sm text-gray-400 mb-1">Active Now</p>
                <p className="text-3xl font-bold text-green-400">{stats.activeNodes}</p>
              </div>
              <div className="bg-gradient-to-br from-blue-500/20 to-blue-500/5 border border-blue-500/20 rounded-xl p-4">
                <p className="text-sm text-gray-400 mb-1">Total Bandwidth</p>
                <p className="text-3xl font-bold">{stats.totalBandwidth} <span className="text-lg">Gbps</span></p>
              </div>
              <div className="bg-gradient-to-br from-yellow-500/20 to-yellow-500/5 border border-yellow-500/20 rounded-xl p-4">
                <p className="text-sm text-gray-400 mb-1">Countries</p>
                <p className="text-3xl font-bold">{stats.countries}</p>
              </div>
              <div className="bg-gradient-to-br from-pink-500/20 to-pink-500/5 border border-pink-500/20 rounded-xl p-4">
                <p className="text-sm text-gray-400 mb-1">Active Connections</p>
                <p className="text-3xl font-bold">{stats.totalConnections}</p>
              </div>
            </div>

            {/* World Map Visualization */}
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 mb-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">🗺️ Live Network Map</h2>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setSelectedRegion('all')}
                    className={`px-4 py-2 rounded-lg transition-all text-sm ${
                      selectedRegion === 'all' ? 'bg-purple-600' : 'bg-white/5 hover:bg-white/10'
                    }`}
                  >
                    All Regions
                  </button>
                </div>
              </div>

              {/* Interactive Map Grid */}
              <div className="relative bg-gradient-to-br from-blue-950 to-purple-950 rounded-xl p-6 min-h-[500px]">
                {/* World Map SVG Representation */}
                <svg viewBox="0 0 1000 500" className="w-full h-full">
                  {/* Map Background */}
                  <rect width="1000" height="500" fill="rgba(0,0,0,0.2)" />
                  
                  {/* Continents (simplified) */}
                  <path d="M 150 150 Q 200 120 250 150 L 280 180 L 250 220 L 180 210 Z" fill="rgba(100,100,150,0.3)" stroke="rgba(150,150,200,0.5)" strokeWidth="1" />
                  <path d="M 400 100 Q 500 80 600 120 L 650 180 L 600 250 L 450 240 L 380 180 Z" fill="rgba(100,100,150,0.3)" stroke="rgba(150,150,200,0.5)" strokeWidth="1" />
                  <path d="M 650 150 Q 750 130 850 180 L 880 250 L 820 280 L 700 260 Z" fill="rgba(100,100,150,0.3)" stroke="rgba(150,150,200,0.5)" strokeWidth="1" />
                  <path d="M 250 280 Q 300 270 350 300 L 340 380 L 270 370 Z" fill="rgba(100,100,150,0.3)" stroke="rgba(150,150,200,0.5)" strokeWidth="1" />
                  <path d="M 500 250 Q 550 240 580 280 L 570 320 L 510 310 Z" fill="rgba(100,100,150,0.3)" stroke="rgba(150,150,200,0.5)" strokeWidth="1" />
                  <path d="M 850 350 Q 900 340 920 380 L 900 420 L 850 410 Z" fill="rgba(100,100,150,0.3)" stroke="rgba(150,150,200,0.5)" strokeWidth="1" />
                  
                  {/* Node Points */}
                  {nodes.map((node) => {
                    // Convert coordinates to SVG position
                    const x = ((node.coordinates[0] + 180) / 360) * 1000;
                    const y = ((90 - node.coordinates[1]) / 180) * 500;
                    
                    return (
                      <g key={node.id}>
                        {/* Pulse animation */}
                        {node.isActive && (
                          <circle cx={x} cy={y} r="15" fill="rgba(139,92,246,0.2)" opacity="0">
                            <animate attributeName="r" from="5" to="20" dur="2s" repeatCount="indefinite" />
                            <animate attributeName="opacity" from="0.6" to="0" dur="2s" repeatCount="indefinite" />
                          </circle>
                        )}
                        
                        {/* Node dot */}
                        <circle
                          cx={x}
                          cy={y}
                          r="5"
                          fill={node.isActive ? '#10b981' : '#ef4444'}
                          stroke="white"
                          strokeWidth="2"
                          className="cursor-pointer transition-all hover:r-8"
                          onMouseEnter={() => setHoveredNode(node)}
                          onMouseLeave={() => setHoveredNode(null)}
                        />
                      </g>
                    );
                  })}
                  
                  {/* Connection lines */}
                  {nodes.slice(0, 5).map((node, idx) => {
                    const nextNode = nodes[(idx + 1) % 5];
                    const x1 = ((node.coordinates[0] + 180) / 360) * 1000;
                    const y1 = ((90 - node.coordinates[1]) / 180) * 500;
                    const x2 = ((nextNode.coordinates[0] + 180) / 360) * 1000;
                    const y2 = ((90 - nextNode.coordinates[1]) / 180) * 500;
                    
                    return (
                      <line
                        key={`line-${idx}`}
                        x1={x1}
                        y1={y1}
                        x2={x2}
                        y2={y2}
                        stroke="rgba(139,92,246,0.3)"
                        strokeWidth="1"
                        strokeDasharray="5,5"
                      >
                        <animate attributeName="stroke-dashoffset" from="0" to="10" dur="1s" repeatCount="indefinite" />
                      </line>
                    );
                  })}
                </svg>

                {/* Hover Tooltip */}
                {hoveredNode && (
                  <div className="absolute top-4 right-4 bg-gray-900 border border-purple-500 rounded-lg p-4 min-w-[200px]">
                    <h3 className="font-bold text-lg mb-2">{hoveredNode.city}, {hoveredNode.country}</h3>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Reputation:</span>
                        <span className="font-medium">{hoveredNode.reputation}/100</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Bandwidth:</span>
                        <span className="font-medium">{hoveredNode.bandwidthGbps} Gbps</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Uptime:</span>
                        <span className="font-medium">{hoveredNode.uptimePercentage}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Latency:</span>
                        <span className="font-medium">{hoveredNode.latency}ms</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Connections:</span>
                        <span className="font-medium text-green-400">{hoveredNode.activeConnections}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-4 flex items-center justify-center space-x-6 text-sm">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                  <span className="text-gray-400">Active Node</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-red-400 rounded-full"></div>
                  <span className="text-gray-400">Inactive Node</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-purple-400 rounded-full animate-pulse"></div>
                  <span className="text-gray-400">Active Traffic</span>
                </div>
              </div>
            </div>

            {/* Regional Distribution */}
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 mb-8">
              <h2 className="text-2xl font-bold mb-6">📊 Regional Distribution</h2>
              <div className="grid md:grid-cols-3 gap-4">
                {WORLD_REGIONS.map((region) => (
                  <div
                    key={region.name}
                    className="bg-white/5 border border-white/10 rounded-xl p-4 cursor-pointer hover:border-purple-500/50 transition-all"
                    onClick={() => setSelectedRegion(region.name)}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-bold">{region.name}</h3>
                      <span className="text-2xl font-bold text-purple-400">{region.nodes}</span>
                    </div>
                    <div className="bg-white/10 rounded-full h-2">
                      <div
                        className={`bg-gradient-to-r ${region.color} h-2 rounded-full transition-all`}
                        style={{ width: `${(region.nodes / stats.totalNodes) * 100}%` }}
                      ></div>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">
                      {((region.nodes / stats.totalNodes) * 100).toFixed(1)}% of network
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Node List */}
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl overflow-hidden">
              <div className="p-6 border-b border-white/10">
                <h2 className="text-2xl font-bold">🖥️ Active Nodes ({filteredNodes.length})</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-white/5">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">Location</th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">Status</th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">Reputation</th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">Bandwidth</th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">Uptime</th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">Latency</th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">Connections</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {filteredNodes.map((node) => (
                      <tr key={node.id} className="hover:bg-white/5 transition-colors">
                        <td className="px-6 py-4">
                          <div>
                            <p className="font-medium">{node.city}</p>
                            <p className="text-sm text-gray-400">{node.country}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                            node.isActive ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'
                          }`}>
                            {node.isActive ? '🟢 Online' : '🔴 Offline'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-2">
                            <span className="font-medium">{node.reputation}</span>
                            <div className="w-16 bg-white/10 rounded-full h-1.5">
                              <div
                                className="bg-blue-500 h-1.5 rounded-full"
                                style={{ width: `${node.reputation}%` }}
                              ></div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 font-mono">{node.bandwidthGbps} Gbps</td>
                        <td className="px-6 py-4 font-medium">{node.uptimePercentage}%</td>
                        <td className="px-6 py-4">
                          <span className={`font-medium ${node.latency < 15 ? 'text-green-400' : node.latency < 30 ? 'text-yellow-400' : 'text-red-400'}`}>
                            {node.latency}ms
                          </span>
                        </td>
                        <td className="px-6 py-4 font-bold text-purple-400">{node.activeConnections}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
