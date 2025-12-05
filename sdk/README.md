# VeilPool SDK

TypeScript SDK for interacting with VeilPool's decentralized privacy network.

## Installation

```bash
npm install @veilpool/sdk
```

## Quick Start

### For VPN Users

```typescript
import { createVeilPoolClient } from '@veilpool/sdk';

const client = createVeilPoolClient({
  rpcEndpoint: 'https://api.devnet.solana.com',
  routingEngineUrl: 'http://localhost:3001',
});

// Connect to WebSocket for real-time updates
await client.connectWebSocket();

// Get optimal node for your connection
const decision = await client.getOptimalNode(
  'US-CA-SanFrancisco',
  'www.example.com',
  'balanced'
);

console.log('Selected node:', decision.selectedNode);

// Connect to VPN
const session = await client.connect(
  decision.selectedNode.nodeId,
  'user123'
);

console.log('Connected! Session:', session.sessionId);

// Listen for events
client.on('connected', (session) => {
  console.log('VPN connected:', session);
});

client.on('nodeSwitch', (oldNode, newNode) => {
  console.log('Switched from', oldNode, 'to', newNode);
});

// Disconnect when done
await client.disconnect();
await client.close();
```

### For Node Operators

```typescript
import { createNodeOperatorSDK } from '@veilpool/sdk';
import { Keypair } from '@solana/web3.js';

const wallet = new Wallet(Keypair.generate());

const operator = createNodeOperatorSDK({
  rpcEndpoint: 'https://api.devnet.solana.com',
  routingEngineUrl: 'http://localhost:3001',
  wallet,
});

// Register your node
const txSignature = await operator.registerNode(
  'US',
  'San Francisco',
  1000, // 1 Gbps
  10    // 10 SOL stake
);

console.log('Node registered:', txSignature);

// Send periodic heartbeats
setInterval(async () => {
  await operator.sendHeartbeat('your-node-id');
}, 60000); // Every minute

// Claim earnings
const claimTx = await operator.claimEarnings('your-node-id');
console.log('Earnings claimed:', claimTx);
```

### For Sponsors

```typescript
import { createSponsorSDK } from '@veilpool/sdk';
import { Keypair } from '@solana/web3.js';

const wallet = new Wallet(Keypair.generate());

const sponsor = createSponsorSDK({
  rpcEndpoint: 'https://api.devnet.solana.com',
  routingEngineUrl: 'http://localhost:3001',
  wallet,
});

// Create a privacy pool
const poolTx = await sponsor.createPool(
  'Student Access Fund',
  'Providing free VPN access for students',
  100 // 100 SOL funding
);

console.log('Pool created:', poolTx);

// Add beneficiaries
const beneficiaries = [
  'studentWallet1...',
  'studentWallet2...',
];

const addTx = await sponsor.addBeneficiaries('pool-id', beneficiaries);
console.log('Beneficiaries added:', addTx);
```

## API Reference

### VeilPoolClient

#### Methods

- **`connectWebSocket()`** - Connect to WebSocket for real-time updates
- **`getOptimalNode(userLocation, destination, priority)`** - Get best VPN node
- **`getActiveNodes()`** - List all active nodes
- **`getNodeDetails(nodeId)`** - Get specific node information
- **`reportNodeFailure(nodeId, reason)`** - Report node issues
- **`getThreatIntel(countryCode?)`** - Get threat intelligence data
- **`connect(nodeId, userId)`** - Establish VPN connection
- **`disconnect()`** - Close VPN connection
- **`getCurrentSession()`** - Get current connection session
- **`purchasePass(tier, duration)`** - Buy a privacy pass on-chain
- **`getMyPasses()`** - List user's active passes
- **`getStats()`** - Get routing engine statistics
- **`healthCheck()`** - Check system health
- **`close()`** - Cleanup and close all connections

#### Events

- **`connected`** - Fired when VPN connection established
- **`disconnected`** - Fired when VPN connection terminated
- **`nodeSwitch`** - Fired when switching to different node
- **`error`** - Fired on errors
- **`statsUpdate`** - Fired on periodic stats updates

### NodeOperatorSDK

#### Methods

- **`registerNode(country, city, bandwidth, stakeAmount)`** - Register new VPN node
- **`sendHeartbeat(nodeId)`** - Send node health heartbeat
- **`claimEarnings(nodeId)`** - Claim accumulated earnings
- **`unstake(nodeId, amount)`** - Withdraw staked tokens

### SponsorSDK

#### Methods

- **`createPool(name, description, fundingAmount)`** - Create privacy pool
- **`addBeneficiaries(poolId, beneficiaries)`** - Add beneficiaries to pool
- **`fundPool(poolId, amount)`** - Add more funds to pool

## Configuration

```typescript
interface VeilPoolConfig {
  rpcEndpoint: string;          // Solana RPC endpoint
  routingEngineUrl: string;      // Routing engine API URL
  wallet?: Wallet;               // Solana wallet (for on-chain txs)
  wsEndpoint?: string;           // WebSocket endpoint (optional)
}
```

## Types

All TypeScript types are exported and documented:

```typescript
import {
  VPNNode,
  RoutingDecision,
  ConnectionSession,
  PrivacyPass,
  PrivacyPool,
  ThreatIntelligence,
  NodeMetrics,
  RoutingStats,
} from '@veilpool/sdk';
```

## Error Handling

```typescript
try {
  await client.connect(nodeId, userId);
} catch (error) {
  if (error.message === 'Node not available') {
    // Handle unavailable node
    const decision = await client.getOptimalNode(...);
    await client.connect(decision.selectedNode.nodeId, userId);
  }
}
```

## Advanced Usage

### Custom WebSocket Handling

```typescript
client.on('statsUpdate', (stats) => {
  console.log('Current routing stats:', stats);
  
  // Update your dashboard
  updateDashboard(stats);
});
```

### Node Switching

```typescript
client.on('nodeSwitch', async (oldNode, newNode) => {
  console.log(`Switching from ${oldNode} to ${newNode}`);
  
  // Log switch for analytics
  await analytics.trackNodeSwitch(oldNode, newNode);
});
```

### Monitoring Connection Quality

```typescript
setInterval(async () => {
  const session = client.getCurrentSession();
  
  if (session && session.status === 'connected') {
    const node = await client.getNodeDetails(session.nodeId);
    
    if (node.latency > 200) {
      // High latency, consider switching
      console.warn('High latency detected:', node.latency);
      
      const newDecision = await client.getOptimalNode(...);
      await client.disconnect();
      await client.connect(newDecision.selectedNode.nodeId, userId);
    }
  }
}, 10000); // Check every 10 seconds
```

## Examples

See the `/examples` directory for complete working examples:

- `basic-vpn-client.ts` - Simple VPN client
- `node-operator.ts` - Running a VPN node
- `sponsor-pool.ts` - Creating and managing privacy pools
- `advanced-routing.ts` - Advanced routing strategies

## Development

```bash
# Install dependencies
npm install

# Build SDK
npm run build

# Run tests
npm test

# Watch mode
npm run dev
```

## License

MIT

## Support

- Documentation: https://docs.veilpool.com
- Discord: https://discord.gg/veilpool
- GitHub: https://github.com/veilpool/sdk
