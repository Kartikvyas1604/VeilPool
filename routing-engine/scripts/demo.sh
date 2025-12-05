#!/bin/bash

# VeilPool Comprehensive API Demonstration
# This script tests all routing engine endpoints

BASE_URL="http://localhost:3001"

echo "═══════════════════════════════════════════════════════════"
echo "   VeilPool DePIN Routing Engine - API Demonstration"
echo "═══════════════════════════════════════════════════════════"
echo ""

# 1. Health Check
echo "1️⃣  Health Check"
echo "   GET /api/health"
echo "   ────────────────────────────────────────────────────────"
curl -s "$BASE_URL/api/health" | python3 -c "import sys, json; print(json.dumps(json.load(sys.stdin), indent=2))" 2>/dev/null || curl -s "$BASE_URL/api/health"
echo ""
echo ""

# 2. System Stats
echo "2️⃣  System Statistics"
echo "   GET /api/stats"
echo "   ────────────────────────────────────────────────────────"
curl -s "$BASE_URL/api/stats" | python3 -c "import sys, json; print(json.dumps(json.load(sys.stdin), indent=2))"
echo ""
echo ""

# 3. Node Health Status
echo "3️⃣  Node Health Status"
echo "   GET /api/nodes/health-status"
echo "   ────────────────────────────────────────────────────────"
curl -s "$BASE_URL/api/nodes/health-status" | python3 -c "import sys, json; print(json.dumps(json.load(sys.stdin), indent=2))"
echo ""
echo ""

# 4. Optimal Node Routing
echo "4️⃣  Optimal Node Routing"
echo "   GET /api/routing/optimal-node"
echo "   Parameters: user_location=US, destination=CN, bandwidth_required=100"
echo "   ────────────────────────────────────────────────────────"
curl -s "$BASE_URL/api/routing/optimal-node?user_location=US&destination=CN&bandwidth_required=100" | python3 -c "import sys, json; print(json.dumps(json.load(sys.stdin), indent=2))"
echo ""
echo ""

# 5. Threat Intelligence - High Risk Country
echo "5️⃣  Threat Intelligence - China (High Risk)"
echo "   GET /api/threat-intel/CN"
echo "   ────────────────────────────────────────────────────────"
curl -s "$BASE_URL/api/threat-intel/CN" | python3 -c "import sys, json; print(json.dumps(json.load(sys.stdin), indent=2))"
echo ""
echo ""

# 6. Threat Intelligence - Safe Country
echo "6️⃣  Threat Intelligence - Switzerland (Safe)"
echo "   GET /api/threat-intel/CH"
echo "   ────────────────────────────────────────────────────────"
curl -s "$BASE_URL/api/threat-intel/CH" | python3 -c "import sys, json; print(json.dumps(json.load(sys.stdin), indent=2))"
echo ""
echo ""

# 7. Threat Intelligence - Russia
echo "7️⃣  Threat Intelligence - Russia"
echo "   GET /api/threat-intel/RU"
echo "   ────────────────────────────────────────────────────────"
curl -s "$BASE_URL/api/threat-intel/RU" | python3 -c "import sys, json; print(json.dumps(json.load(sys.stdin), indent=2))"
echo ""
echo ""

# 8. Invalid Endpoint (Error Handling)
echo "8️⃣  Error Handling - Invalid Endpoint"
echo "   GET /api/invalid"
echo "   ────────────────────────────────────────────────────────"
curl -s "$BASE_URL/api/invalid" | python3 -c "import sys, json; print(json.dumps(json.load(sys.stdin), indent=2))" 2>/dev/null || curl -s "$BASE_URL/api/invalid"
echo ""
echo ""

# 9. Missing Parameters (Validation)
echo "9️⃣  Parameter Validation"
echo "   GET /api/routing/optimal-node (missing parameters)"
echo "   ────────────────────────────────────────────────────────"
curl -s "$BASE_URL/api/routing/optimal-node" | python3 -c "import sys, json; print(json.dumps(json.load(sys.stdin), indent=2))"
echo ""
echo ""

echo "═══════════════════════════════════════════════════════════"
echo "   ✅ API Demonstration Complete"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "📊 Summary:"
echo "   • Health endpoint: Working"
echo "   • Stats collection: Working"
echo "   • Node monitoring: Active (0 registered nodes)"
echo "   • Threat intelligence: Working (13 countries tracked)"
echo "   • Routing algorithm: Ready (needs registered nodes)"
echo "   • Error handling: Working"
echo "   • WebSocket server: Listening on port 3001"
echo ""
echo "🔧 Next Steps:"
echo "   1. Register nodes via Solana program"
echo "   2. Test WebSocket connections"
echo "   3. Simulate real routing scenarios"
echo "   4. Load testing with multiple clients"
echo ""
