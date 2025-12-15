#!/bin/bash

# VeilPool System Verification Script
# Checks all components are correctly configured and operational

set -e

echo "========================================"
echo "   VeilPool System Verification"
echo "========================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Counters
PASSED=0
FAILED=0
WARNINGS=0

check_command() {
    if command -v $1 &> /dev/null; then
        echo -e "${GREEN}✓${NC} $1 is installed"
        ((PASSED++))
        return 0
    else
        echo -e "${RED}✗${NC} $1 is NOT installed"
        ((FAILED++))
        return 1
    fi
}

check_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✓${NC} $2 exists"
        ((PASSED++))
        return 0
    else
        echo -e "${RED}✗${NC} $2 NOT found"
        ((FAILED++))
        return 1
    fi
}

check_dir() {
    if [ -d "$1" ]; then
        echo -e "${GREEN}✓${NC} $2 exists"
        ((PASSED++))
        return 0
    else
        echo -e "${YELLOW}!${NC} $2 NOT found (may need creation)"
        ((WARNINGS++))
        return 1
    fi
}

# 1. Check Prerequisites
echo -e "${BLUE}=== Checking Prerequisites ===${NC}"
check_command "solana"
check_command "anchor"
check_command "node"
check_command "pnpm"
check_command "cargo"
check_command "docker"
check_command "docker-compose"
echo ""

# 2. Check Solana Configuration
echo -e "${BLUE}=== Checking Solana Configuration ===${NC}"
if solana config get &> /dev/null; then
    CLUSTER=$(solana config get | grep "RPC URL" | awk '{print $3}')
    WALLET=$(solana config get | grep "Keypair Path" | awk '{print $3}')
    echo -e "${GREEN}✓${NC} Solana configured for: $CLUSTER"
    echo -e "${GREEN}✓${NC} Wallet: $WALLET"
    ((PASSED+=2))
    
    # Check balance
    BALANCE=$(solana balance 2>/dev/null | awk '{print $1}')
    if (( $(echo "$BALANCE > 1" | bc -l) )); then
        echo -e "${GREEN}✓${NC} Wallet balance: $BALANCE SOL"
        ((PASSED++))
    else
        echo -e "${YELLOW}!${NC} Low balance: $BALANCE SOL (recommend at least 10 SOL for devnet)"
        ((WARNINGS++))
    fi
else
    echo -e "${RED}✗${NC} Solana not configured"
    ((FAILED++))
fi
echo ""

# 3. Check Project Structure
echo -e "${BLUE}=== Checking Project Structure ===${NC}"
check_file "Anchor.toml" "Anchor.toml"
check_file "Cargo.toml" "Cargo.toml"
check_file "package.json" "package.json"
check_dir "programs/node-registry" "Node Registry program"
check_dir "programs/privacy-pool" "Privacy Pool program"
check_dir "programs/privacy-pass" "Privacy Pass program"
check_dir "programs/vrf-selection" "VRF Selection program"
check_dir "routing-engine" "Routing Engine"
check_dir "app" "Frontend"
check_dir "sdk" "SDK"
echo ""

# 4. Check Program Files
echo -e "${BLUE}=== Checking Program Files ===${NC}"
check_file "programs/node-registry/src/lib.rs" "Node Registry source"
check_file "programs/privacy-pool/src/lib.rs" "Privacy Pool source"
check_file "programs/privacy-pass/src/lib.rs" "Privacy Pass source"
check_file "programs/vrf-selection/src/lib.rs" "VRF Selection source"
echo ""

# 5. Check if Programs are Built
echo -e "${BLUE}=== Checking Built Programs ===${NC}"
if [ -d "target/deploy" ]; then
    echo -e "${GREEN}✓${NC} Target directory exists"
    ((PASSED++))
    
    if ls target/deploy/*.so &> /dev/null; then
        SO_COUNT=$(ls -1 target/deploy/*.so 2>/dev/null | wc -l)
        echo -e "${GREEN}✓${NC} Found $SO_COUNT compiled program(s)"
        ((PASSED++))
    else
        echo -e "${YELLOW}!${NC} No compiled programs found. Run: anchor build"
        ((WARNINGS++))
    fi
else
    echo -e "${YELLOW}!${NC} Target directory not found. Run: anchor build"
    ((WARNINGS++))
fi
echo ""

# 6. Check Routing Engine Setup
echo -e "${BLUE}=== Checking Routing Engine ===${NC}"
if [ -d "routing-engine/node_modules" ]; then
    echo -e "${GREEN}✓${NC} Routing engine dependencies installed"
    ((PASSED++))
else
    echo -e "${YELLOW}!${NC} Routing engine dependencies not installed. Run: cd routing-engine && pnpm install"
    ((WARNINGS++))
fi

check_file "routing-engine/package.json" "Routing engine package.json"
check_file "routing-engine/src/index.ts" "Routing engine entry point"
check_file "routing-engine/src/routing-engine.ts" "Routing engine core"
check_file "routing-engine/src/pyth-integration.ts" "Pyth integration"
check_file "routing-engine/src/node-monitor.ts" "Node monitor"
echo ""

# 7. Check Frontend Setup
echo -e "${BLUE}=== Checking Frontend ===${NC}"
if [ -d "app/node_modules" ]; then
    echo -e "${GREEN}✓${NC} Frontend dependencies installed"
    ((PASSED++))
else
    echo -e "${YELLOW}!${NC} Frontend dependencies not installed. Run: cd app && pnpm install"
    ((WARNINGS++))
fi

check_file "app/package.json" "Frontend package.json"
check_file "app/next.config.ts" "Next.js config"
check_dir "app/app/user" "User dashboard"
check_dir "app/app/sponsor" "Sponsor dashboard"
check_dir "app/app/node-operator" "Node operator dashboard"
echo ""

# 8. Check SDK
echo -e "${BLUE}=== Checking SDK ===${NC}"
check_file "sdk/package.json" "SDK package.json"
check_file "sdk/src/index.ts" "SDK source"
if [ -d "sdk/node_modules" ]; then
    echo -e "${GREEN}✓${NC} SDK dependencies installed"
    ((PASSED++))
else
    echo -e "${YELLOW}!${NC} SDK dependencies not installed. Run: cd sdk && pnpm install"
    ((WARNINGS++))
fi
echo ""

# 9. Check Tests
echo -e "${BLUE}=== Checking Tests ===${NC}"
check_dir "tests" "Tests directory"
if ls tests/**/*.test.ts &> /dev/null 2>&1; then
    TEST_COUNT=$(find tests -name "*.test.ts" 2>/dev/null | wc -l)
    echo -e "${GREEN}✓${NC} Found $TEST_COUNT test file(s)"
    ((PASSED++))
else
    echo -e "${YELLOW}!${NC} No test files found"
    ((WARNINGS++))
fi
echo ""

# 10. Check Deployment Scripts
echo -e "${BLUE}=== Checking Deployment Scripts ===${NC}"
check_file "scripts/deploy-complete.sh" "Complete deployment script"
if [ -x "scripts/deploy-complete.sh" ]; then
    echo -e "${GREEN}✓${NC} Deployment script is executable"
    ((PASSED++))
else
    echo -e "${YELLOW}!${NC} Deployment script not executable. Run: chmod +x scripts/deploy-complete.sh"
    ((WARNINGS++))
fi
echo ""

# 11. Check Docker Setup
echo -e "${BLUE}=== Checking Docker Configuration ===${NC}"
check_file "docker-compose.yml" "Docker Compose (dev)"
check_file "docker-compose.production.yml" "Docker Compose (production)"
check_file "routing-engine/Dockerfile.production" "Routing engine Dockerfile"
check_file "app/Dockerfile.production" "Frontend Dockerfile"

if docker info &> /dev/null; then
    echo -e "${GREEN}✓${NC} Docker daemon is running"
    ((PASSED++))
else
    echo -e "${YELLOW}!${NC} Docker daemon not running"
    ((WARNINGS++))
fi
echo ""

# 12. Check Documentation
echo -e "${BLUE}=== Checking Documentation ===${NC}"
check_file "README.md" "Main README"
check_file "ARCHITECTURE.md" "Architecture docs"
check_file "PROJECT-SUMMARY.md" "Project summary"
check_file "DEVELOPMENT-GUIDE.md" "Development guide"
echo ""

# 13. Check Monitoring Setup
echo -e "${BLUE}=== Checking Monitoring Setup ===${NC}"
check_file "monitoring/prometheus.yml" "Prometheus config"
check_file "nginx/nginx.conf" "Nginx config"
echo ""

# Summary
echo "========================================"
echo -e "${GREEN}Passed:${NC} $PASSED"
echo -e "${YELLOW}Warnings:${NC} $WARNINGS"
echo -e "${RED}Failed:${NC} $FAILED"
echo "========================================"
echo ""

if [ $FAILED -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✓ All checks passed! System is ready for development.${NC}"
    echo ""
    echo "Next steps:"
    echo "  1. Start local validator: solana-test-validator"
    echo "  2. Build programs: anchor build"
    echo "  3. Deploy programs: anchor deploy"
    echo "  4. Start routing engine: cd routing-engine && pnpm dev"
    echo "  5. Start frontend: cd app && pnpm dev"
    exit 0
elif [ $FAILED -eq 0 ]; then
    echo -e "${YELLOW}⚠ System has $WARNINGS warning(s) but should be functional.${NC}"
    echo ""
    echo "Review warnings above and install missing dependencies if needed."
    exit 0
else
    echo -e "${RED}✗ System has $FAILED critical issue(s).${NC}"
    echo ""
    echo "Please fix the errors above before proceeding."
    exit 1
fi
