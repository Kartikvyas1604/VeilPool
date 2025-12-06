# VeilPool Browser Extension

Decentralized VPN browser extension powered by Solana blockchain.

## Features

- 🔐 **Privacy-First**: Route traffic through decentralized nodes
- ⛓️ **Blockchain-Powered**: Privacy passes validated on Solana
- 🌍 **Global Network**: Access nodes worldwide
- ⚡ **Zero-Knowledge**: No tracking, no logs
- 🎯 **Smart Routing**: VRF-based node selection

## Installation

### Chrome/Edge

1. Clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked"
5. Select the `browser-extension` folder

### Firefox

1. Clone this repository
2. Open Firefox and navigate to `about:debugging#/runtime/this-firefox`
3. Click "Load Temporary Add-on"
4. Select the `manifest.json` file in the `browser-extension` folder

## Usage

1. **Connect Wallet**: Click "Connect Wallet" to link your Solana wallet
2. **Purchase Pass**: Visit [veilpool.io/purchase](https://veilpool.io/purchase) to buy a privacy pass
3. **Connect**: Click the connect button to enable privacy routing
4. **Browse**: All your traffic is now routed through VeilPool's privacy network

## Architecture

```
┌─────────────┐
│   Popup UI  │
└──────┬──────┘
       │
       ↓
┌─────────────────────┐
│ Background Worker   │
├─────────────────────┤
│ - Pass Validation   │
│ - Node Selection    │
│ - Proxy Config      │
│ - Data Tracking     │
└──────┬──────────────┘
       │
       ↓
┌─────────────────────┐
│  Solana Blockchain  │
├─────────────────────┤
│ - Privacy Passes    │
│ - Node Registry     │
│ - VRF Selection     │
└─────────────────────┘
```

## Development

```bash
# Build extension
cd browser-extension

# For production, you would minify and bundle:
# npm install
# npm run build
```

## Privacy Pass Validation

The extension validates privacy passes on-chain:

1. Derives PDA for user's pass account
2. Checks expiration timestamp
3. Verifies remaining bandwidth
4. Confirms active status

## Node Selection

Uses VRF (Verifiable Random Function) for secure node selection:

1. Fetches registered nodes from NODE_REGISTRY_PROGRAM_ID
2. Filters by reputation, region, and availability
3. Selects node using VRF for unpredictability
4. Measures actual latency before connecting

## Proxy Configuration

Routes traffic through selected node:

```javascript
{
  mode: 'fixed_servers',
  rules: {
    singleProxy: {
      scheme: 'https',
      host: 'node-proxy.veilpool.io',
      port: 8080
    }
  }
}
```

## Security

- ✅ No plaintext passwords stored
- ✅ Wallet integration via Solana wallet adapter
- ✅ On-chain pass validation
- ✅ Encrypted proxy connections
- ✅ Zero-knowledge architecture

## Permissions

Required permissions:

- `proxy`: Configure browser proxy settings
- `webRequest`: Track data usage
- `storage`: Store connection state
- `tabs`: Open VeilPool website
- `notifications`: Connection status alerts

## Support

- Website: [veilpool.io](https://veilpool.io)
- Docs: [docs.veilpool.io](https://docs.veilpool.io)
- Discord: [discord.gg/veilpool](https://discord.gg/veilpool)

## License

MIT
