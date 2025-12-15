#!/bin/bash

# VeilPool Complete Deployment Script
# This script deploys all components to Devnet/Mainnet

set -e

echo "========================================"
echo "  VeilPool Complete Deployment Script  "
echo "========================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
CLUSTER="${1:-devnet}"  # devnet or mainnet-beta
DRY_RUN="${2:-false}"

echo -e "${BLUE}Target Cluster: ${CLUSTER}${NC}"
echo -e "${BLUE}Dry Run: ${DRY_RUN}${NC}"
echo ""

# Check prerequisites
echo -e "${YELLOW}Checking prerequisites...${NC}"
command -v anchor >/dev/null 2>&1 || { echo -e "${RED}Error: anchor not found${NC}" >&2; exit 1; }
command -v solana >/dev/null 2>&1 || { echo -e "${RED}Error: solana CLI not found${NC}" >&2; exit 1; }
command -v node >/dev/null 2>&1 || { echo -e "${RED}Error: node not found${NC}" >&2; exit 1; }
command -v pnpm >/dev/null 2>&1 || { echo -e "${RED}Error: pnpm not found${NC}" >&2; exit 1; }

echo -e "${GREEN}✓ All prerequisites met${NC}"
echo ""

# Configure Solana CLI
echo -e "${YELLOW}Configuring Solana CLI for ${CLUSTER}...${NC}"
if [ "$CLUSTER" = "mainnet-beta" ]; then
    solana config set --url https://api.mainnet-beta.solana.com
else
    solana config set --url https://api.devnet.solana.com
fi

# Get wallet balance
BALANCE=$(solana balance | awk '{print $1}')
echo -e "${BLUE}Wallet Balance: ${BALANCE} SOL${NC}"

if (( $(echo "$BALANCE < 10" | bc -l) )); then
    echo -e "${RED}Error: Insufficient balance. Need at least 10 SOL for deployment${NC}"
    if [ "$CLUSTER" = "devnet" ]; then
        echo -e "${YELLOW}Run: solana airdrop 10${NC}"
    fi
    exit 1
fi

# Step 1: Build Anchor Programs
echo -e "\n${YELLOW}========================================${NC}"
echo -e "${YELLOW}Step 1: Building Anchor Programs${NC}"
echo -e "${YELLOW}========================================${NC}"

if [ "$DRY_RUN" = "false" ]; then
    anchor build
    echo -e "${GREEN}✓ Programs built successfully${NC}"
else
    echo -e "${BLUE}[DRY RUN] Would run: anchor build${NC}"
fi

# Step 2: Deploy Programs
echo -e "\n${YELLOW}========================================${NC}"
echo -e "${YELLOW}Step 2: Deploying Programs${NC}"
echo -e "${YELLOW}========================================${NC}"

if [ "$DRY_RUN" = "false" ]; then
    anchor deploy --provider.cluster $CLUSTER
    
    # Extract program IDs
    NODE_REGISTRY_ID=$(solana address -k target/deploy/node_registry-keypair.json)
    PRIVACY_POOL_ID=$(solana address -k target/deploy/privacy_pool-keypair.json)
    PRIVACY_PASS_ID=$(solana address -k target/deploy/privacy_pass-keypair.json)
    VRF_SELECTION_ID=$(solana address -k target/deploy/vrf_selection-keypair.json)
    
    echo -e "${GREEN}✓ Programs deployed successfully${NC}"
    echo -e "${BLUE}Node Registry: ${NODE_REGISTRY_ID}${NC}"
    echo -e "${BLUE}Privacy Pool: ${PRIVACY_POOL_ID}${NC}"
    echo -e "${BLUE}Privacy Pass: ${PRIVACY_PASS_ID}${NC}"
    echo -e "${BLUE}VRF Selection: ${VRF_SELECTION_ID}${NC}"
    
    # Save program IDs
    cat > .env.programs << EOF
NODE_REGISTRY_PROGRAM_ID=${NODE_REGISTRY_ID}
PRIVACY_POOL_PROGRAM_ID=${PRIVACY_POOL_ID}
PRIVACY_PASS_PROGRAM_ID=${PRIVACY_PASS_ID}
VRF_SELECTION_PROGRAM_ID=${VRF_SELECTION_ID}
CLUSTER=${CLUSTER}
EOF
    
    echo -e "${GREEN}✓ Program IDs saved to .env.programs${NC}"
else
    echo -e "${BLUE}[DRY RUN] Would deploy programs to ${CLUSTER}${NC}"
fi

# Step 3: Initialize Programs
echo -e "\n${YELLOW}========================================${NC}"
echo -e "${YELLOW}Step 3: Initializing Programs${NC}"
echo -e "${YELLOW}========================================${NC}"

if [ "$DRY_RUN" = "false" ]; then
    # Initialize Node Registry
    echo -e "${BLUE}Initializing Node Registry...${NC}"
    anchor run initialize-node-registry
    
    # Initialize Privacy Pass
    echo -e "${BLUE}Initializing Privacy Pass...${NC}"
    anchor run initialize-privacy-pass
    
    echo -e "${GREEN}✓ Programs initialized${NC}"
else
    echo -e "${BLUE}[DRY RUN] Would initialize all programs${NC}"
fi

# Step 4: Deploy Routing Engine
echo -e "\n${YELLOW}========================================${NC}"
echo -e "${YELLOW}Step 4: Building Routing Engine${NC}"
echo -e "${YELLOW}========================================${NC}"

cd routing-engine
if [ "$DRY_RUN" = "false" ]; then
    pnpm install
    pnpm build
    
    # Create production env file
    cat > .env.production << EOF
SOLANA_RPC_URL=https://api.${CLUSTER}.solana.com
NODE_REGISTRY_PROGRAM_ID=${NODE_REGISTRY_ID}
PYTH_ENDPOINT=https://hermes.pyth.network
REDIS_URL=redis://localhost:6379
PORT=3001
LOG_LEVEL=info
EOF
    
    echo -e "${GREEN}✓ Routing engine built${NC}"
else
    echo -e "${BLUE}[DRY RUN] Would build routing engine${NC}"
fi
cd ..

# Step 5: Build SDK
echo -e "\n${YELLOW}========================================${NC}"
echo -e "${YELLOW}Step 5: Building SDK${NC}"
echo -e "${YELLOW}========================================${NC}"

cd sdk
if [ "$DRY_RUN" = "false" ]; then
    pnpm install
    pnpm build
    
    # Publish to npm if mainnet
    if [ "$CLUSTER" = "mainnet-beta" ]; then
        echo -e "${YELLOW}Ready to publish SDK to npm?${NC}"
        read -p "Continue? (y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            pnpm publish --access public
            echo -e "${GREEN}✓ SDK published to npm${NC}"
        fi
    fi
    
    echo -e "${GREEN}✓ SDK built${NC}"
else
    echo -e "${BLUE}[DRY RUN] Would build SDK${NC}"
fi
cd ..

# Step 6: Build Frontend
echo -e "\n${YELLOW}========================================${NC}"
echo -e "${YELLOW}Step 6: Building Frontend${NC}"
echo -e "${YELLOW}========================================${NC}"

cd app
if [ "$DRY_RUN" = "false" ]; then
    pnpm install
    
    # Create production env file
    cat > .env.production << EOF
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.${CLUSTER}.solana.com
NEXT_PUBLIC_NODE_REGISTRY_PROGRAM_ID=${NODE_REGISTRY_ID}
NEXT_PUBLIC_PRIVACY_POOL_PROGRAM_ID=${PRIVACY_POOL_ID}
NEXT_PUBLIC_PRIVACY_PASS_PROGRAM_ID=${PRIVACY_PASS_ID}
NEXT_PUBLIC_VRF_SELECTION_PROGRAM_ID=${VRF_SELECTION_ID}
NEXT_PUBLIC_ROUTING_ENGINE_URL=https://api.veilpool.com
NEXT_PUBLIC_CLUSTER=${CLUSTER}
EOF
    
    pnpm build
    
    echo -e "${GREEN}✓ Frontend built${NC}"
    echo -e "${BLUE}Deploy to Vercel: vercel --prod${NC}"
else
    echo -e "${BLUE}[DRY RUN] Would build frontend${NC}"
fi
cd ..

# Step 7: Run Tests
echo -e "\n${YELLOW}========================================${NC}"
echo -e "${YELLOW}Step 7: Running Integration Tests${NC}"
echo -e "${YELLOW}========================================${NC}"

if [ "$DRY_RUN" = "false" ] && [ "$CLUSTER" = "devnet" ]; then
    echo -e "${BLUE}Running integration tests...${NC}"
    anchor test --skip-deploy --skip-build
    echo -e "${GREEN}✓ All tests passed${NC}"
else
    echo -e "${BLUE}[DRY RUN] Would run integration tests${NC}"
fi

# Step 8: Verification
echo -e "\n${YELLOW}========================================${NC}"
echo -e "${YELLOW}Step 8: Verification${NC}"
echo -e "${YELLOW}========================================${NC}"

if [ "$DRY_RUN" = "false" ]; then
    # Verify programs are deployed
    echo -e "${BLUE}Verifying program deployments...${NC}"
    solana program show ${NODE_REGISTRY_ID}
    
    # Create verification report
    cat > deployment-report.md << EOF
# VeilPool Deployment Report

**Date:** $(date)
**Cluster:** ${CLUSTER}
**Deployer:** $(solana address)

## Deployed Programs

### Node Registry
- Program ID: \`${NODE_REGISTRY_ID}\`
- Solana Explorer: https://explorer.solana.com/address/${NODE_REGISTRY_ID}?cluster=${CLUSTER}

### Privacy Pool
- Program ID: \`${PRIVACY_POOL_ID}\`
- Solana Explorer: https://explorer.solana.com/address/${PRIVACY_POOL_ID}?cluster=${CLUSTER}

### Privacy Pass
- Program ID: \`${PRIVACY_PASS_ID}\`
- Solana Explorer: https://explorer.solana.com/address/${PRIVACY_PASS_ID}?cluster=${CLUSTER}

### VRF Selection
- Program ID: \`${VRF_SELECTION_ID}\`
- Solana Explorer: https://explorer.solana.com/address/${VRF_SELECTION_ID}?cluster=${CLUSTER}

## Services

- **Frontend:** Ready for deployment to Vercel
- **Routing Engine:** Built and ready to run
- **SDK:** Built and ready for publishing

## Next Steps

1. Start routing engine: \`cd routing-engine && pnpm start\`
2. Deploy frontend to Vercel: \`cd app && vercel --prod\`
3. Register test nodes using the node operator dashboard
4. Create test privacy pools
5. Monitor logs and metrics

## Verification Commands

\`\`\`bash
# Check program accounts
solana program show ${NODE_REGISTRY_ID}

# View program logs
solana logs ${NODE_REGISTRY_ID}

# Check balance
solana balance
\`\`\`

---
Generated by VeilPool deployment script
EOF
    
    echo -e "${GREEN}✓ Deployment report saved to deployment-report.md${NC}"
fi

# Summary
echo -e "\n${GREEN}======================================${NC}"
echo -e "${GREEN}   Deployment Complete! 🚀${NC}"
echo -e "${GREEN}======================================${NC}"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo -e "  1. Start routing engine: ${YELLOW}cd routing-engine && pnpm start${NC}"
echo -e "  2. Deploy frontend: ${YELLOW}cd app && vercel --prod${NC}"
echo -e "  3. View deployment report: ${YELLOW}cat deployment-report.md${NC}"
echo ""

if [ "$CLUSTER" = "mainnet-beta" ]; then
    echo -e "${RED}⚠️  MAINNET DEPLOYMENT - Please verify everything carefully!${NC}"
    echo -e "${YELLOW}Consider running on devnet first for final testing${NC}"
fi
