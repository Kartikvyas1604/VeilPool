# @veilpool/sdk

**Official TypeScript SDK for VeilPool - Add privacy to any Solana dApp in 2 lines of code.**

[![NPM Version](https://img.shields.io/npm/v/@veilpool/sdk)](https://www.npmjs.com/package/@veilpool/sdk)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue)](https://www.typescriptlang.org/)

## 🚀 Quick Start

### Installation

```bash
npm install @veilpool/sdk
# or
pnpm add @veilpool/sdk
# or
yarn add @veilpool/sdk
```

### 2-Line Integration

```typescript
import { VeilPool } from '@veilpool/sdk';

const veilpool = new VeilPool({ network: 'devnet' });
await veilpool.enablePrivacy({ userId: wallet.publicKey });
// Done! All traffic now routed through privacy network
```

---

## 📖 Complete API Reference

### Constructor

```typescript
const veilpool = new VeilPool(config: VeilPoolConfig);
```

**VeilPoolConfig:**
```typescript
interface VeilPoolConfig {
  rpcUrl?: string;                    // Solana RPC endpoint (default: devnet)
  network: 'mainnet-beta' | 'devnet'; // Solana cluster
  routingEngineUrl?: string;          // Routing engine API (default: localhost:3001)
  programId?: PublicKey;              // Override program IDs (advanced)
}
```

**Example:**
```typescript
const veilpool = new VeilPool({
  network: 'mainnet-beta',
  rpcUrl: 'https://api.mainnet-beta.solana.com',
  routingEngineUrl: 'https://routing.veilpool.network'
});
```

---

### enablePrivacy()

**Enable privacy mode for a user**

```typescript
await veilpool.enablePrivacy(options: PrivacyOptions): Promise<ConnectionStatus>
```

**PrivacyOptions:**
```typescript
interface PrivacyOptions {
  userId: PublicKey;           // User's wallet public key
  userLocation?: string;       // Optional: 'US-CA', 'UK-London' (auto-detected if omitted)
  autoReconnect?: boolean;     // Auto-reconnect on disconnect (default: true)
  bandwidth?: number;          // Required bandwidth in GB (default: 1)
}
```

**Returns:**
```typescript
interface ConnectionStatus {
  connected: boolean;
  node?: NodeInfo;
  bandwidthRemaining: number;  // GB remaining in pass
  nodeId?: string;
  latency?: number;            // milliseconds
}
```

**Example:**
```typescript
const status = await veilpool.enablePrivacy({
  userId: wallet.publicKey,
  userLocation: 'US-NY',
  autoReconnect: true,
  bandwidth: 5  // Request 5 GB allocation
});

console.log(`Connected to ${status.node.location} with ${status.latency}ms latency`);
```

---

### getOptimalNode()

**Get best node for user's location (doesn't connect)**

```typescript
await veilpool.getOptimalNode(userLocation?: string): Promise<NodeInfo>
```

**NodeInfo:**
```typescript
interface NodeInfo {
  id: string;                  // Node operator public key
  location: string;            // 'US-CA-SanFrancisco'
  latency: number;             // milliseconds
  reputation: number;          // 0-100 score
  pricePerGb: number;          // USDC per GB
  bandwidth: number;           // Available Gbps
  endpoint: string;            // IP:Port for connection
}
```

**Example:**
```typescript
const node = await veilpool.getOptimalNode('UK-London');
console.log(`Best node: ${node.location} (${node.latency}ms, ${node.reputation}/100)`);
```

---

### connectToNode()

**Manually connect to specific node**

```typescript
await veilpool.connectToNode(nodeId: string): Promise<void>
```

**Example:**
```typescript
// User selects from list
const nodes = await veilpool.getActiveNodes();
const selectedNode = nodes[0];

await veilpool.connectToNode(selectedNode.id);
console.log('Connected to custom node');
```

---

### disconnect()

**Disconnect from current node**

```typescript
veilpool.disconnect(): void
```

**Example:**
```typescript
veilpool.disconnect();
console.log('Privacy mode disabled');
```

---

### monitorConnection()

**Real-time connection monitoring**

```typescript
await veilpool.monitorConnection(callback: (status: ConnectionStatus) => void): Promise<void>
```

**Example:**
```typescript
await veilpool.monitorConnection((status) => {
  if (!status.connected) {
    console.log('Connection lost!');
  } else {
    console.log(`Latency: ${status.latency}ms, Remaining: ${status.bandwidthRemaining}GB`);
  }
});
```

---

### Event System

**Subscribe to connection events**

```typescript
veilpool.on('connected', (node: NodeInfo) => void);
veilpool.on('disconnected', (reason: string) => void);
veilpool.on('error', (error: Error) => void);
veilpool.on('bandwidthLow', (remaining: number) => void);  // <10% remaining
```

**Example:**
```typescript
veilpool.on('connected', (node) => {
  console.log(`🔒 Privacy enabled via ${node.location}`);
});

veilpool.on('bandwidthLow', (remaining) => {
  alert(`Only ${remaining}GB remaining! Purchase more.`);
});

veilpool.on('error', (error) => {
  console.error('Privacy error:', error.message);
});
```

---

## 🎯 Usage Examples

### Example 1: Simple Integration

```typescript
import { VeilPool } from '@veilpool/sdk';
import { useWallet } from '@solana/wallet-adapter-react';

function PrivacyToggle() {
  const { publicKey } = useWallet();
  const [enabled, setEnabled] = useState(false);
  
  const veilpool = useRef(new VeilPool({ network: 'devnet' }));

  const togglePrivacy = async () => {
    if (enabled) {
      veilpool.current.disconnect();
      setEnabled(false);
    } else {
      await veilpool.current.enablePrivacy({ userId: publicKey });
      setEnabled(true);
    }
  };

  return (
    <button onClick={togglePrivacy}>
      {enabled ? '🔒 Privacy ON' : '🔓 Privacy OFF'}
    </button>
  );
}
```

---

### Example 2: Node Selection UI

```typescript
import { VeilPool } from '@veilpool/sdk';

function NodeSelector() {
  const [nodes, setNodes] = useState<NodeInfo[]>([]);
  const veilpool = new VeilPool({ network: 'devnet' });

  useEffect(() => {
    // Fetch available nodes
    veilpool.getActiveNodes().then(setNodes);
  }, []);

  const selectNode = async (node: NodeInfo) => {
    await veilpool.connectToNode(node.id);
    toast.success(`Connected to ${node.location}`);
  };

  return (
    <div className="grid gap-4">
      {nodes.map(node => (
        <Card key={node.id} onClick={() => selectNode(node)}>
          <CardHeader>
            <CardTitle>{node.location}</CardTitle>
            <Badge>{node.reputation}/100</Badge>
          </CardHeader>
          <CardContent>
            <p>Latency: {node.latency}ms</p>
            <p>Price: ${node.pricePerGb}/GB</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
```

---

### Example 3: Real-time Monitoring

```typescript
import { VeilPool } from '@veilpool/sdk';

function ConnectionMonitor() {
  const [status, setStatus] = useState<ConnectionStatus | null>(null);
  const veilpool = new VeilPool({ network: 'devnet' });

  useEffect(() => {
    veilpool.monitorConnection(setStatus);
    return () => veilpool.disconnect();
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className={`w-3 h-3 rounded-full ${status?.connected ? 'bg-green-500' : 'bg-red-500'}`} />
        <span>{status?.connected ? 'Connected' : 'Disconnected'}</span>
      </div>
      
      {status?.connected && (
        <>
          <div>
            <Label>Node Location</Label>
            <p className="text-lg font-medium">{status.node?.location}</p>
          </div>
          
          <div>
            <Label>Latency</Label>
            <p className="text-lg font-medium">{status.latency}ms</p>
          </div>
          
          <div>
            <Label>Bandwidth Remaining</Label>
            <Progress value={(status.bandwidthRemaining / 100) * 100} />
            <p className="text-sm text-muted-foreground">{status.bandwidthRemaining} GB</p>
          </div>
        </>
      )}
    </div>
  );
}
```

---

### Example 4: Auto-Purchase on Low Balance

```typescript
import { VeilPool } from '@veilpool/sdk';

function AutoRefillManager() {
  const veilpool = new VeilPool({ network: 'devnet' });

  useEffect(() => {
    veilpool.on('bandwidthLow', async (remaining) => {
      if (remaining < 5) {  // Less than 5 GB
        const confirmed = confirm('Low bandwidth! Purchase 100 GB for $50?');
        if (confirmed) {
          await purchasePass(100);  // Your purchase logic
          toast.success('Purchased 100 GB!');
        }
      }
    });
  }, []);

  return <div>Auto-refill enabled</div>;
}
```

---

## 🔧 Advanced Configuration

### Custom Program IDs

```typescript
const veilpool = new VeilPool({
  network: 'mainnet-beta',
  programId: new PublicKey('YourCustomProgramId...')
});
```

### Error Handling

```typescript
try {
  await veilpool.enablePrivacy({ userId: wallet.publicKey });
} catch (error) {
  if (error instanceof InsufficientBalanceError) {
    // Redirect to purchase page
    router.push('/user/purchase');
  } else if (error instanceof NoNodesAvailableError) {
    // Show maintenance message
    toast.error('Service temporarily unavailable');
  } else {
    // Generic error
    console.error('Privacy error:', error);
  }
}
```

---

## 🐛 Troubleshooting

### Issue: "Failed to fetch optimal node"
**Cause:** Routing engine not reachable  
**Solution:** Check `routingEngineUrl` is correct and service is running

### Issue: "Insufficient balance"
**Cause:** User doesn't have privacy pass  
**Solution:** Check pass account exists with `getPassAccount(userId)`

### Issue: "Connection timeout"
**Cause:** Selected node is offline  
**Solution:** SDK auto-retries with fallback nodes. Check node status.

---

## 📚 TypeScript Types

```typescript
// All exported types
export { 
  VeilPool,
  VeilPoolConfig,
  PrivacyOptions,
  ConnectionStatus,
  NodeInfo,
  InsufficientBalanceError,
  NoNodesAvailableError,
  ConnectionTimeoutError
};
```

---

## 🤝 Support

- **Documentation:** [https://docs.veilpool.network](https://docs.veilpool.network)
- **Discord:** [Join Community](https://discord.gg/veilpool)
- **GitHub Issues:** [Report Bug](https://github.com/Kartikvyas1604/VeilPool/issues)
- **Email:** support@veilpool.network

---

## 📄 License

MIT © VeilPool Team

---

**Ready to add privacy to your dApp?**

```bash
npm install @veilpool/sdk
```
