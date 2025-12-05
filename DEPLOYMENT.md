# VeilPool Deployment Guide

Complete guide for deploying VeilPool to production.

## Prerequisites

- Solana CLI 1.18.18+
- Anchor 0.31.1+
- Node.js 20+
- Docker 24+
- Redis 7+

## Local Development

```bash
# Clone and setup
git clone https://github.com/veilpool/veilpool.git
cd veilpool && npm install

# Start validator
solana-test-validator

# Deploy programs
anchor build && anchor deploy

# Start Redis
docker-compose up -d redis

# Start routing engine
cd routing-engine && npm run dev
```

## Devnet Deployment

```bash
# Configure Solana
solana config set --url https://api.devnet.solana.com

# Deploy programs
anchor deploy --provider.cluster devnet

# Deploy routing engine
docker-compose -f docker-compose.prod.yml up -d
```

## Mainnet Deployment

See comprehensive guide at https://docs.veilpool.com/deployment

## Monitoring

- Prometheus: http://localhost:9090/metrics
- Grafana: http://localhost:3000
- Health: http://localhost:3001/api/health
