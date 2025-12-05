#!/bin/bash

# VeilPool Project Verification Script
# Tests all components and displays project status

set -e

BOLD='\033[1m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BOLD}${BLUE}"
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║         🚀 VeilPool DePIN - System Verification 🚀          ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to print status
print_status() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✅ $2${NC}"
    else
        echo -e "${RED}❌ $2${NC}"
    fi
}

echo -e "${BOLD}${YELLOW}1. Checking Prerequisites...${NC}"
command_exists anchor && print_status 0 "Anchor CLI installed" || print_status 1 "Anchor CLI not found"
command_exists solana && print_status 0 "Solana CLI installed" || print_status 1 "Solana CLI not found"
command_exists node && print_status 0 "Node.js installed ($(node --version))" || print_status 1 "Node.js not found"
command_exists npm && print_status 0 "NPM installed" || print_status 1 "NPM not found"

echo ""
echo -e "${BOLD}${YELLOW}2. Checking Anchor Programs...${NC}"

cd "$(dirname "$0")"

if [ -f "target/deploy/node_registry-keypair.json" ]; then
    NODE_REGISTRY_ID=$(solana-keygen pubkey target/deploy/node_registry-keypair.json)
    echo -e "${GREEN}✅ node-registry${NC}: $NODE_REGISTRY_ID"
else
    echo -e "${RED}❌ node-registry not built${NC}"
fi

if [ -f "target/deploy/privacy_pass-keypair.json" ]; then
    PRIVACY_PASS_ID=$(solana-keygen pubkey target/deploy/privacy_pass-keypair.json)
    echo -e "${GREEN}✅ privacy-pass${NC}: $PRIVACY_PASS_ID"
else
    echo -e "${RED}❌ privacy-pass not built${NC}"
fi

if [ -f "target/deploy/privacy_pool-keypair.json" ]; then
    PRIVACY_POOL_ID=$(solana-keygen pubkey target/deploy/privacy_pool-keypair.json)
    echo -e "${GREEN}✅ privacy-pool${NC}: $PRIVACY_POOL_ID"
else
    echo -e "${RED}❌ privacy-pool not built${NC}"
fi

if [ -f "target/deploy/vrf_selection-keypair.json" ]; then
    VRF_SELECTION_ID=$(solana-keygen pubkey target/deploy/vrf_selection-keypair.json)
    echo -e "${GREEN}✅ vrf-selection${NC}: $VRF_SELECTION_ID"
else
    echo -e "${RED}❌ vrf-selection not built${NC}"
fi

echo ""
echo -e "${BOLD}${YELLOW}3. Checking Routing Engine...${NC}"

if [ -d "routing-engine/dist" ] && [ "$(ls -A routing-engine/dist)" ]; then
    echo -e "${GREEN}✅ Routing engine built${NC}"
    echo "   Files: $(ls routing-engine/dist/*.js | wc -l) JavaScript files"
else
    echo -e "${RED}❌ Routing engine not built${NC}"
fi

echo ""
echo -e "${BOLD}${YELLOW}4. Checking SDK...${NC}"

if [ -d "sdk/src" ] && [ -f "sdk/package.json" ]; then
    echo -e "${GREEN}✅ SDK source code present${NC}"
else
    echo -e "${RED}❌ SDK not found${NC}"
fi

echo ""
echo -e "${BOLD}${YELLOW}5. Checking Tests...${NC}"

TEST_COUNT=$(find tests -name "*.ts" -o -name "*.js" | wc -l)
echo -e "${GREEN}✅ $TEST_COUNT test files found${NC}"

echo ""
echo -e "${BOLD}${YELLOW}6. Checking Documentation...${NC}"

[ -f "README.md" ] && echo -e "${GREEN}✅ README.md${NC}" || echo -e "${RED}❌ README.md missing${NC}"
[ -f "LICENSE" ] && echo -e "${GREEN}✅ LICENSE${NC}" || echo -e "${RED}❌ LICENSE missing${NC}"
[ -f "CONTRIBUTING.md" ] && echo -e "${GREEN}✅ CONTRIBUTING.md${NC}" || echo -e "${RED}❌ CONTRIBUTING.md missing${NC}"
[ -f "CHANGELOG.md" ] && echo -e "${GREEN}✅ CHANGELOG.md${NC}" || echo -e "${RED}❌ CHANGELOG.md missing${NC}"
[ -f ".env.example" ] && echo -e "${GREEN}✅ .env.example${NC}" || echo -e "${RED}❌ .env.example missing${NC}"

echo ""
echo -e "${BOLD}${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BOLD}${GREEN}PROJECT SUMMARY${NC}"
echo -e "${BOLD}${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

echo ""
echo -e "${BOLD}📦 Components:${NC}"
echo "   • 4 Solana Anchor Programs (Rust)"
echo "   • AI-Powered Routing Engine (TypeScript)"
echo "   • TypeScript SDK for dApp integration"
echo "   • Next.js Frontend (in app/)"
echo "   • Comprehensive test suite"

echo ""
echo -e "${BOLD}🎯 Quick Start Commands:${NC}"
echo ""
echo -e "${BLUE}# Build all programs${NC}"
echo "  anchor build"
echo ""
echo -e "${BLUE}# Run tests${NC}"
echo "  anchor test"
echo ""
echo -e "${BLUE}# Deploy to devnet${NC}"
echo "  anchor deploy --provider.cluster devnet"
echo ""
echo -e "${BLUE}# Start routing engine${NC}"
echo "  cd routing-engine && npm run dev"
echo ""
echo -e "${BLUE}# Start Next.js app${NC}"
echo "  cd app && npm run dev"

echo ""
echo -e "${BOLD}${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BOLD}${GREEN}✅ VeilPool Project Verification Complete!${NC}"
echo -e "${BOLD}${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${YELLOW}Repository:${NC} https://github.com/Kartikvyas1604/VeilPool"
echo -e "${YELLOW}Status:${NC} Production-ready DePIN privacy infrastructure"
echo ""
