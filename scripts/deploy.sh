#!/bin/bash
set -e

echo "🚀 VeilPool Deployment Script"
echo "=============================="
echo ""

# Check required environment variables
required_vars=("SOLANA_RPC_URL" "REDIS_URL" "PORT")
for var in "${required_vars[@]}"; do
  if [ -z "${!var}" ]; then
    echo "❌ Error: $var environment variable is not set"
    exit 1
  fi
done

echo "✅ Environment variables validated"
echo ""

# Build Anchor programs
echo "📦 Building Anchor programs..."
anchor build
echo "✅ Anchor programs built successfully"
echo ""

# Build routing engine
echo "📦 Building routing engine..."
cd routing-engine
npm install --production=false
npm run build
echo "✅ Routing engine built successfully"
cd ..
echo ""

# Build Next.js app
echo "📦 Building Next.js application..."
cd app
npm install --production=false
npm run build
echo "✅ Next.js app built successfully"
cd ..
echo ""

# Build SDK
echo "📦 Building SDK..."
cd packages/sdk
npm install --production=false
npm run build
echo "✅ SDK built successfully"
cd ../..
echo ""

echo "🎉 Deployment build completed!"
echo ""
echo "Next steps:"
echo "1. Deploy Anchor programs: anchor deploy --provider.cluster mainnet"
echo "2. Start routing engine: cd routing-engine && npm start"
echo "3. Start Next.js app: cd app && npm start"
echo ""
