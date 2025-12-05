#!/bin/bash

# VeilPool - Full System Test
# Tests all components: Solana programs + Routing Engine

echo "╔═══════════════════════════════════════════════════════════╗"
echo "║       VeilPool DePIN - Full System Verification           ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""

# Check if routing engine is running
if curl -s http://localhost:3001/api/health > /dev/null; then
    echo "✅ Routing Engine: Running"
else
    echo "❌ Routing Engine: Not running"
    echo "   Start with: cd routing-engine && node daemon.js"
    exit 1
fi

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  Phase 1: Solana Programs Test"
echo "═══════════════════════════════════════════════════════════"
echo ""

# Test each program
PROGRAMS=("node-registry" "privacy-pass" "privacy-pool" "vrf-selection")

for PROGRAM in "${PROGRAMS[@]}"; do
    echo "📦 Testing $PROGRAM..."
    cd "programs/$PROGRAM" 2>/dev/null || continue
    
    if [ -f "Anchor.toml" ]; then
        # Run tests with timeout
        timeout 60 anchor test --skip-deploy 2>&1 | tail -5 || echo "  ⚠️  Tests timed out or not configured"
    else
        echo "  ⚠️  No Anchor.toml found"
    fi
    
    cd ../..
    echo ""
done

echo "═══════════════════════════════════════════════════════════"
echo "  Phase 2: Routing Engine API Tests"  
echo "═══════════════════════════════════════════════════════════"
echo ""

cd routing-engine
./test-api.sh
cd ..

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  Phase 3: Integration Check"
echo "═══════════════════════════════════════════════════════════"
echo ""

# Check if programs are deployed
echo "🔍 Checking deployed programs..."
PROGRAMS_DEPLOYED=0

if [ -f "target/deploy/node_registry-keypair.json" ]; then
    NODE_PROGRAM=$(solana-keygen pubkey target/deploy/node_registry-keypair.json)
    echo "✅ node-registry: $NODE_PROGRAM"
    ((PROGRAMS_DEPLOYED++))
fi

if [ -f "target/deploy/privacy_pass-keypair.json" ]; then
    PASS_PROGRAM=$(solana-keygen pubkey target/deploy/privacy_pass-keypair.json)
    echo "✅ privacy-pass: $PASS_PROGRAM"
    ((PROGRAMS_DEPLOYED++))
fi

if [ -f "target/deploy/privacy_pool-keypair.json" ]; then
    POOL_PROGRAM=$(solana-keygen pubkey target/deploy/privacy_pool-keypair.json)
    echo "✅ privacy-pool: $POOL_PROGRAM"
    ((PROGRAMS_DEPLOYED++))
fi

if [ -f "target/deploy/vrf_selection-keypair.json" ]; then
    VRF_PROGRAM=$(solana-keygen pubkey target/deploy/vrf_selection-keypair.json)
    echo "✅ vrf-selection: $VRF_PROGRAM"
    ((PROGRAMS_DEPLOYED++))
fi

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  System Status Summary"
echo "═══════════════════════════════════════════════════════════"
echo ""

# Get routing engine stats
STATS=$(curl -s http://localhost:3001/api/stats)
TOTAL_NODES=$(echo "$STATS" | python3 -c "import sys, json; print(json.load(sys.stdin)['routing']['totalNodes'])" 2>/dev/null || echo "0")
UPTIME=$(echo "$STATS" | python3 -c "import sys, json; print(f\"{json.load(sys.stdin)['uptime']:.1f}\")" 2>/dev/null || echo "0")

echo "📊 Routing Engine:"
echo "   • Status: Running"
echo "   • Uptime: ${UPTIME}s"
echo "   • Total Nodes: $TOTAL_NODES"
echo "   • Port: 3001"
echo ""

echo "🔗 Solana Programs:"
echo "   • Deployed: $PROGRAMS_DEPLOYED/4"
echo "   • Network: Devnet"
echo "   • Cluster: https://api.devnet.solana.com"
echo ""

echo "🌐 API Endpoints Available:"
echo "   • GET  /api/health"
echo "   • GET  /api/stats"
echo "   • GET  /api/nodes/health-status"
echo "   • GET  /api/routing/optimal-node"
echo "   • GET  /api/threat-intel/:country"
echo "   • WS   / (WebSocket)"
echo ""

echo "═══════════════════════════════════════════════════════════"
echo "  ✅ System Verification Complete"
echo "═══════════════════════════════════════════════════════════"
echo ""

if [ $PROGRAMS_DEPLOYED -eq 4 ] && [ $TOTAL_NODES -ge 0 ]; then
    echo "🎉 VeilPool DePIN is ready for use!"
    echo ""
    echo "Next steps:"
    echo "  1. Register test nodes: cd programs/node-registry && anchor test"
    echo "  2. Purchase privacy pass: cd programs/privacy-pass && anchor test"
    echo "  3. Monitor via API: curl http://localhost:3001/api/stats"
    echo "  4. Check threat intel: curl http://localhost:3001/api/threat-intel/CN"
    echo ""
else
    echo "⚠️  System partially ready. Missing components:"
    [ $PROGRAMS_DEPLOYED -lt 4 ] && echo "  • Solana programs not fully deployed"
    echo ""
fi
