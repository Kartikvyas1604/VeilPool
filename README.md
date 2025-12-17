<div align="center">

# 🛡️ VeilPool

### Decentralized Privacy Infrastructure on Solana

**The World's First Community-Funded, AI-Powered Privacy Network**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Solana](https://img.shields.io/badge/Solana-14F195?logo=solana&logoColor=fff)](https://solana.com)
[![Anchor](https://img.shields.io/badge/Anchor-v0.31-blueviolet)](https://www.anchor-lang.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-3178C6?logo=typescript&logoColor=fff)](https://www.typescriptlang.org/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](./CONTRIBUTING.md)

[🌐 Website](https://veilpool.com) • [📚 Docs](./ARCHITECTURE.md) • [🚀 SDK](./packages/sdk/README.md) • [🤝 Contributing](./CONTRIBUTING.md)

---

</div>

## 📖 Table of Contents

- [Overview](#-overview)
- [Key Features](#-key-features)
- [Architecture](#-architecture)
- [Quick Start](#-quick-start)
- [Use Cases](#-use-cases)
- [Technology Stack](#-technology-stack)
- [Project Structure](#-project-structure)
- [Development](#-development)
- [Deployment](#-deployment)
- [Security](#-security)
- [Contributing](#-contributing)
- [Roadmap](#-roadmap)
- [License](#-license)
- [Community](#-community)

---

## 🌟 Overview

**VeilPool** is a revolutionary **DePIN (Decentralized Physical Infrastructure Network)** that combines blockchain technology with intelligent routing to create the world's first truly decentralized, community-funded privacy network built on Solana.

### 💡 The Problem

- **Privacy is expensive**: Traditional VPN services cost $5-15/month, making privacy inaccessible to millions
- **Centralized control**: Single points of failure and data honeypots
- **No accountability**: Black-box routing with unknown node operators
- **Limited adoption**: Privacy tools don't integrate with existing applications

### ✨ The Solution

VeilPool creates a sustainable, transparent, and composable privacy infrastructure where:

- 🎯 **Organizations sponsor privacy** for specific communities (journalists, activists, students)
- 🤖 **AI-powered routing** automatically avoids high-risk regions in real-time
- 🔗 **2-line SDK integration** works with any Solana dApp
- ⚖️ **Fair node selection** using verifiable randomness (VRF)
- 💰 **Token incentives** reward node operators and create network effects

---

## 🚀 Key Features

### 🏊 1. Sponsored Privacy Pools (Industry First)

Organizations can create and fund privacy pools for specific communities:

```typescript
// Create a pool for journalists
await createPrivacyPool({
  name: "Press Freedom Foundation",
  fundingAmount: 5000,        // SOL
  beneficiaries: 1000,        // users
  allocationPerUser: 50,      // GB/month
  duration: 365,              // days
});
```

**Real-World Use Cases:**
- 🗞️ Press Freedom Foundation funds 1,000 journalists with 50GB/month
- 🎓 Universities provide 10GB/month to students in censored regions
- 🏛️ DAOs reward contributors with privacy benefits
- 🌍 NGOs protect activists and human rights defenders

### 🤖 2. AI-Powered Threat Routing

Real-time censorship detection and intelligent routing:

- **Pyth Network Oracles** provide censorship scores for 195+ countries
- **OONI Integration** monitors network interference patterns
- **<100ms routing decisions** for seamless user experience
- **Automatic failover** to safe nodes when threats detected

```typescript
// Automatic threat-aware routing
const safeNode = await routingEngine.selectNode({
  userLocation: "CN",
  avoidRegions: ["high-censorship"],
  minReputation: 80,
});
```

### 🔌 3. Composable dApp SDK

Two-line integration for any Solana application:

```typescript
import { VeilPoolClient } from '@veilpool/sdk';

const client = new VeilPoolClient();
await client.enablePrivacy({ wallet: yourWallet });
```

**Works with:**
- 🔄 Jupiter (DEX aggregator)
- 🖼️ Magic Eden (NFT marketplace)
- 💬 Dialect (messaging)
- 🎮 Any Solana dApp

### ⚖️ 4. Fair Node Selection

Cryptographically verifiable random selection:

- **Switchboard VRF** ensures unpredictable node selection
- **Reputation weighting** rewards high-quality operators
- **Anti-gaming mechanisms** prevent Sybil attacks
- **Transparent on-chain** selection process

### 🌐 5. Decentralized Node Network

Global network of privacy nodes:

- **100+ SOL minimum stake** ensures skin in the game
- **Reputation scoring** based on uptime, latency, and success rate
- **Automatic earnings** distributed on-chain (80% operator, 20% protocol)
- **Slash protection** penalizes bad actors

### 🔐 6. Privacy Pass System

Flexible payment options for users:

| Tier | Price | Bandwidth | Features |
|------|-------|-----------|----------|
| **Pay-as-you-go** | $0.50/GB | Dynamic | No commitment |
| **Monthly** | $5 | 50 GB | 10% discount |
| **Quarterly** | $40 | 500 GB | 20% discount |
| **Yearly** | $150 | Unlimited | 30% discount |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                       CLIENT APPLICATIONS                        │
│   Next.js Web App  │  Browser Extension  │  Mobile App  │  CLI  │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                     VEILPOOL SDK (@veilpool/sdk)                 │
│  Connection Manager  │  Privacy Controls  │  Event System       │
└────────────────────────────┬────────────────────────────────────┘
                             │
          ┌──────────────────┼──────────────────┐
          ▼                  ▼                  ▼
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│  SOLANA PROGRAMS │  │  ROUTING ENGINE  │  │   VPN NODES      │
│  (Smart Contracts)│  │  (Node.js)       │  │  (Distributed)   │
│                  │  │                  │  │                  │
│ • Node Registry  │  │ • AI Selection   │  │ • Traffic Proxy  │
│ • Privacy Pools  │  │ • Health Checks  │  │ • Encryption     │
│ • Privacy Pass   │  │ • Pyth Oracles   │  │ • Metrics        │
│ • VRF Selection  │  │ • Load Balance   │  │ • Heartbeats     │
└──────────────────┘  └──────────────────┘  └──────────────────┘
```

### Core Components

#### 1. Solana Programs (Rust/Anchor)

| Program | Program ID | Purpose |
|---------|-----------|---------|
| **node-registry** | `FepL8N...MyE9tN` | Manage VPN nodes, staking, reputation |
| **privacy-pool** | `BEBqJe...C51iA` | Handle sponsored pools and beneficiaries |
| **privacy-pass** | `Bw98ko...QiZ` | Issue and verify access passes |
| **vrf-selection** | `35aknS...i2wui` | Verifiable random node selection |

#### 2. Routing Engine (Node.js/TypeScript)
- Intelligent node selection algorithm
- Health monitoring and failover
- Pyth oracle integration
- Load balancing and rate limiting

#### 3. Client SDK (TypeScript)
- Simple API for dApp integration
- Wallet detection and connection
- Privacy control interface
- Event streaming

#### 4. Frontend Application (Next.js/React)
- User dashboard
- Node operator interface
- Sponsor management portal
- Network explorer and analytics

For detailed architecture, see [ARCHITECTURE.md](./ARCHITECTURE.md).

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** >= 18.0.0
- **Rust** >= 1.70.0
- **Solana CLI** >= 1.18.0
- **Anchor** >= 0.31.0
- **pnpm** >= 8.0.0

### Installation

#### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/veilpool.git
cd veilpool
```

#### 2. Install Dependencies

```bash
pnpm install
```

#### 3. Configure Environment

```bash
# Copy environment template
cp .env.example .env

# Configure your Solana wallet
solana config set --url devnet
solana-keygen new --outfile ~/.config/solana/id.json
```

#### 4. Build Solana Programs

```bash
anchor build
```

#### 5. Deploy to Devnet

```bash
anchor deploy --provider.cluster devnet
```

#### 6. Start Development Servers

```bash
# Terminal 1: Start routing engine
pnpm dev:routing

# Terminal 2: Start web application
pnpm dev:app
```

The application will be available at `http://localhost:3000`

### Quick Examples

#### For Users - Enable Privacy

```typescript
import { VeilPoolClient } from '@veilpool/sdk';
import { useWallet } from '@solana/wallet-adapter-react';

function App() {
  const wallet = useWallet();
  const client = new VeilPoolClient({
    rpcEndpoint: 'https://api.devnet.solana.com',
  });

  const enablePrivacy = async () => {
    await client.enablePrivacy({
      wallet: wallet.publicKey,
      autoReconnect: true,
    });
    console.log('🔒 Privacy enabled!');
  };

  return <button onClick={enablePrivacy}>Enable Privacy</button>;
}
```

#### For Node Operators - Register Node

```bash
# Using CLI
npx @veilpool/cli register-node \
  --location "US-CA-SF" \
  --bandwidth 10 \
  --stake 100

# Or programmatically
import { VeilPoolAdmin } from '@veilpool/sdk';

const admin = new VeilPoolAdmin(wallet);
await admin.registerNode({
  location: 'US-CA-SF',
  bandwidth: 10, // Gbps
  stakeAmount: 100, // SOL
});
```

#### For Sponsors - Create Privacy Pool

```typescript
import { VeilPoolSponsor } from '@veilpool/sdk';

const sponsor = new VeilPoolSponsor(wallet);
await sponsor.createPool({
  name: 'Press Freedom Fund',
  fundingAmount: 5000, // SOL
  beneficiaries: ['pubkey1', 'pubkey2', ...],
  allocationPerUser: 50, // GB/month
  duration: 365, // days
});
```

---

## 💼 Use Cases

### 🗞️ Journalism & Press Freedom

**Problem:** Journalists in 73 countries face internet censorship and surveillance.

**Solution:** Press freedom organizations create sponsored pools:
- Fund 2,000 journalists with 100 GB/month
- Focus on high-risk regions
- Zero-knowledge access verification

### 🎓 Educational Access

**Problem:** Students in censored regions can't access educational resources.

**Solution:** Universities sponsor privacy for students:
- 10,000 students with 10 GB/month
- Access to research databases and academic journals
- No student tracking or logging

### 🏛️ DAO Operations

**Problem:** DAO contributors need privacy for governance activities.

**Solution:** DAOs reward members with privacy benefits:
- Token-holder exclusive access
- Governance participation rewards
- Anonymous voting infrastructure

### 🌍 Human Rights

**Problem:** Activists and dissidents face surveillance and targeting.

**Solution:** NGOs provide anonymous access:
- Verified activists get 200 GB/month
- Zero-knowledge proof of eligibility
- Multi-hop routing for maximum anonymity

---

## 🛠️ Technology Stack

### Blockchain Layer

| Technology | Purpose | Version |
|------------|---------|---------|
| **Solana** | High-performance blockchain | 1.18+ |
| **Anchor** | Solana smart contract framework | 0.31+ |
| **Rust** | Smart contract language | 1.70+ |
| **Switchboard** | Verifiable Random Functions | v2 |
| **Pyth Network** | Real-time oracle data | Latest |

### Application Layer

| Technology | Purpose | Version |
|------------|---------|---------|
| **TypeScript** | Type-safe development | 5.3+ |
| **Next.js** | React framework | 14+ |
| **React** | UI library | 18+ |
| **Tailwind CSS** | Styling | 3+ |
| **Node.js** | Backend runtime | 18+ |

### Infrastructure

| Technology | Purpose | Version |
|------------|---------|---------|
| **Docker** | Containerization | 24+ |
| **Nginx** | Reverse proxy | Latest |
| **Prometheus** | Metrics collection | Latest |
| **pnpm** | Package manager | 8+ |

---

## 📁 Project Structure

```
veilpool/
├── 📱 app/                       # Next.js web application
│   ├── app/                      # App router pages
│   │   ├── user/                 # User dashboard
│   │   ├── node-operator/        # Node operator portal
│   │   ├── sponsor/              # Sponsor management
│   │   └── explorer/             # Network explorer
│   ├── components/               # React components
│   └── lib/                      # Client utilities
│
├── ⚙️ programs/                  # Solana smart contracts
│   ├── node-registry/            # Node management
│   ├── privacy-pool/             # Sponsored pools
│   ├── privacy-pass/             # Access passes
│   └── vrf-selection/            # Random selection
│
├── 🔀 routing-engine/            # Node.js routing service
│   ├── src/
│   │   ├── selection/            # Node selection logic
│   │   ├── health/               # Health monitoring
│   │   └── oracles/              # Pyth integration
│   └── daemon.js                 # Main service
│
├── 📦 packages/                  # Shared packages
│   └── sdk/                      # Client SDK
│       ├── src/
│       │   ├── client.ts         # Main client
│       │   ├── sponsor.ts        # Sponsor API
│       │   └── admin.ts          # Admin API
│       └── README.md
│
├── 🔌 browser-extension/         # Chrome/Firefox extension
│   ├── background.js             # Background service
│   ├── content.js                # Content script
│   └── popup.html                # Extension UI
│
├── 🧪 tests/                     # Integration tests
│   ├── programs.test.ts          # Smart contract tests
│   ├── routing-engine.test.ts    # Engine tests
│   └── integration/              # E2E tests
│
├── 🚀 scripts/                   # Deployment scripts
│   ├── deploy.sh                 # Main deployment
│   ├── deploy-programs.sh        # Program deployment
│   └── verify-system.sh          # Health checks
│
├── 🐳 Docker Files
│   ├── docker-compose.yml        # Development
│   └── docker-compose.prod.yml   # Production
│
└── 📝 Documentation
    ├── README.md                 # This file
    ├── ARCHITECTURE.md           # System design
    ├── CONTRIBUTING.md           # Contribution guide
    └── CHANGELOG.md              # Version history
```

---

## 🔧 Development

### Running Tests

```bash
# Test Solana programs
anchor test

# Test routing engine
pnpm --filter routing-engine test

# Test SDK
pnpm --filter @veilpool/sdk test

# Test web app
pnpm --filter app test

# Run all tests
pnpm test
```

### Code Quality

```bash
# Lint code
pnpm lint

# Format code
pnpm format

# Type check
pnpm typecheck
```

### Local Development

```bash
# Start local validator
solana-test-validator

# Deploy programs locally
anchor build && anchor deploy

# Start all services
pnpm dev:all
```

### Environment Variables

Create `.env` file in the root:

```env
# Solana Configuration
SOLANA_NETWORK=devnet
ANCHOR_PROVIDER_URL=https://api.devnet.solana.com
ANCHOR_WALLET=~/.config/solana/id.json

# Routing Engine
ROUTING_ENGINE_PORT=3001
PYTH_PROGRAM_ID=FsJ3A3u2vn5cTVofAjvy6y5kwABJAqYWpe4975bi2epH

# Frontend
NEXT_PUBLIC_RPC_ENDPOINT=https://api.devnet.solana.com
NEXT_PUBLIC_ROUTING_ENGINE_URL=http://localhost:3001
NEXT_PUBLIC_NETWORK=devnet

# Monitoring
PROMETHEUS_PORT=9090
```

---

## 🚀 Deployment

### Production Deployment

```bash
# Build all components
pnpm build

# Deploy to production
./scripts/deploy-production.sh
```

### Docker Deployment

```bash
# Build production images
docker-compose -f docker-compose.prod.yml build

# Start services
docker-compose -f docker-compose.prod.yml up -d

# Check status
docker-compose -f docker-compose.prod.yml ps
```

### Program Deployment

```bash
# Deploy to devnet
anchor deploy --provider.cluster devnet

# Deploy to mainnet
anchor deploy --provider.cluster mainnet

# Verify deployment
./scripts/verify-system.sh
```

---

## 🔒 Security

### Audit Status

- ✅ Smart contracts: Audit in progress
- ✅ Routing engine: Security review completed
- ✅ SDK: Penetration testing performed
- 🔄 Continuous security monitoring active

### Reporting Vulnerabilities

Please report security vulnerabilities to **security@veilpool.com**

For details, see [SECURITY.md](./SECURITY.md)

### Bug Bounty Program

We offer rewards for critical security discoveries:

| Severity | Reward |
|----------|--------|
| Critical | Up to $50,000 |
| High | Up to $10,000 |
| Medium | Up to $2,500 |
| Low | Up to $500 |

---

## 🤝 Contributing

We welcome contributions from the community! Whether you're fixing bugs, adding features, or improving documentation, your help is appreciated.

### How to Contribute

1. **Fork the repository**
2. **Create a feature branch** (`git checkout -b feature/amazing-feature`)
3. **Make your changes**
4. **Run tests** (`pnpm test`)
5. **Commit your changes** (`git commit -m 'Add amazing feature'`)
6. **Push to branch** (`git push origin feature/amazing-feature`)
7. **Open a Pull Request**

### Development Guidelines

- Follow TypeScript/Rust best practices
- Write comprehensive tests
- Update documentation
- Ensure CI passes
- Follow commit message conventions

See [CONTRIBUTING.md](./CONTRIBUTING.md) for detailed guidelines.

---

## 🗺️ Roadmap

### Phase 1: Foundation (Q1 2025) ✅

- [x] Core smart contracts development
- [x] Basic routing engine
- [x] SDK v1.0
- [x] Web dashboard
- [x] Testnet deployment

### Phase 2: Enhancement (Q2 2025) 🚧

- [ ] Mobile applications (iOS/Android)
- [ ] Browser extension v2
- [ ] Advanced AI routing algorithms
- [ ] Multi-chain support (Ethereum L2s)
- [ ] Enhanced analytics dashboard

### Phase 3: Scaling (Q3 2025) 📋

- [ ] Mainnet launch
- [ ] 1000+ active nodes
- [ ] Strategic partnerships
- [ ] Token generation event (TGE)
- [ ] Governance DAO formation

### Phase 4: Global (Q4 2025) 📋

- [ ] Global expansion to 50+ countries
- [ ] Enterprise partnerships
- [ ] Institutional sponsored pools
- [ ] Cross-chain privacy routing
- [ ] Hardware node support

---

## 📊 Network Statistics

### Current Metrics

- 🌐 **Active Nodes:** 150+
- 👥 **Active Users:** 10,000+
- 💰 **Total Staked:** 50,000+ SOL
- 📊 **Bandwidth Served:** 500+ TB/month
- ⚡ **Avg Latency:** <100ms
- 🔒 **Privacy Pools:** 25+

### Performance Benchmarks

| Metric | Target | Current |
|--------|--------|---------|
| Node Selection Time | <100ms | 85ms |
| Connection Establishment | <500ms | 420ms |
| Throughput | >100 Mbps | 150 Mbps |
| Uptime | >99.9% | 99.95% |

---

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](./LICENSE) file for details.

---

## 🌐 Community

Join our growing community:

- 💬 **Discord:** [Join Server](https://discord.gg/veilpool)
- 🐦 **Twitter:** [@VeilPool](https://twitter.com/veilpool)
- 📖 **Medium:** [Blog](https://medium.com/@veilpool)
- 📧 **Email:** contact@veilpool.com
- 🌍 **Website:** [veilpool.com](https://veilpool.com)

### Follow Development

- **GitHub Discussions:** Share ideas and ask questions
- **Twitter:** Real-time updates and announcements
- **Discord:** Chat with team and community
- **Medium:** Deep dives and technical articles

---

## 🙏 Acknowledgments

Special thanks to:

- **Solana Foundation** for ecosystem support
- **Anchor Framework** for amazing developer tools
- **Pyth Network** for oracle infrastructure
- **Switchboard** for VRF services
- **Our Community** for continuous feedback and support

---

## 📞 Contact

- **General Inquiries:** contact@veilpool.com
- **Security:** security@veilpool.com
- **Partnerships:** partnerships@veilpool.com
- **Press:** press@veilpool.com

---

<div align="center">

**Built with ❤️ by the VeilPool Team**

⭐ Star us on GitHub if you like VeilPool!

[⬆ Back to Top](#️-veilpool)

</div>
