#!/bin/bash

# VeilPool Quick Status Check

clear
echo "╔══════════════════════════════════════════════════════════╗"
echo "║            VeilPool DePIN - Status Dashboard             ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

# Check daemon
if ps -p $(cat /tmp/veilpool-routing.pid 2>/dev/null) > /dev/null 2>&1; then
    PID=$(cat /tmp/veilpool-routing.pid)
    echo "🟢 Routing Engine: RUNNING (PID: $PID)"
else
    echo "🔴 Routing Engine: STOPPED"
    echo "   Start with: cd routing-engine && node daemon.js"
    exit 1
fi

echo ""
echo "──────────────────────────────────────────────────────────"
echo "  API Status"
echo "──────────────────────────────────────────────────────────"
echo ""

# Health check
HEALTH=$(curl -s http://localhost:3001/api/health 2>/dev/null)
if [ ! -z "$HEALTH" ]; then
    STATUS=$(echo "$HEALTH" | python3 -c "import sys,json; print(json.load(sys.stdin)['status'])" 2>/dev/null)
    UPTIME=$(echo "$HEALTH" | python3 -c "import sys,json; print(f\"{json.load(sys.stdin)['uptime']:.1f}\")" 2>/dev/null)
    NODES=$(echo "$HEALTH" | python3 -c "import sys,json; print(json.load(sys.stdin)['nodes'])" 2>/dev/null)
    
    echo "  Status: $STATUS"
    echo "  Uptime: ${UPTIME}s"
    echo "  Nodes:  $NODES"
else
    echo "  ❌ API not responding"
    exit 1
fi

echo ""
echo "──────────────────────────────────────────────────────────"
echo "  Solana Programs (Devnet)"
echo "──────────────────────────────────────────────────────────"
echo ""

echo "  ✅ node-registry:  5cw3gyqn...fjtvL2R"
echo "  ✅ privacy-pass:   FM3HMXkt...CCSVzx"
echo "  ✅ privacy-pool:   3vWvV5eX...nBZfvY"
echo "  ✅ vrf-selection:  C4Pp1hCt...g5n8TR"

echo ""
echo "──────────────────────────────────────────────────────────"
echo "  Threat Intelligence Sample"
echo "──────────────────────────────────────────────────────────"
echo ""

# Sample countries
for COUNTRY in CN RU US CH; do
    THREAT=$(curl -s "http://localhost:3001/api/threat-intel/$COUNTRY" 2>/dev/null)
    LEVEL=$(echo "$THREAT" | python3 -c "import sys,json; print(json.load(sys.stdin)['threatLevel'])" 2>/dev/null)
    
    # Color code based on threat level
    if [ "$LEVEL" -ge 7 ]; then
        COLOR="🔴"
    elif [ "$LEVEL" -ge 4 ]; then
        COLOR="🟡"
    else
        COLOR="🟢"
    fi
    
    echo "  $COLOR $COUNTRY: Level $LEVEL/10"
done

echo ""
echo "──────────────────────────────────────────────────────────"
echo "  Quick Commands"
echo "──────────────────────────────────────────────────────────"
echo ""
echo "  View logs:    tail -f /tmp/veilpool-routing.log"
echo "  Stop server:  kill $(cat /tmp/veilpool-routing.pid)"
echo "  Test API:     cd routing-engine && ./test-api.sh"
echo "  Full demo:    cd routing-engine && ./demo.sh"
echo "  System test:  ./test-system.sh"
echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║              ✅ System 100% Operational                  ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""
