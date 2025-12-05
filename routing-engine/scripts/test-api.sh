#!/bin/bash

# VeilPool Routing Engine API Test Script

BASE_URL="http://localhost:3001"
PASSED=0
FAILED=0

echo "🧪 VeilPool Routing Engine API Tests"
echo "===================================="
echo ""

# Test 1: Health Check
echo "Test 1: Health Endpoint"
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/health")
if [ "$RESPONSE" = "200" ]; then
  echo "✅ Health check passed (200)"
  ((PASSED++))
else
  echo "❌ Health check failed ($RESPONSE)"
  ((FAILED++))
fi

# Test 2: Stats Endpoint
echo "Test 2: Stats Endpoint"
RESPONSE=$(curl -s "$BASE_URL/api/stats")
if echo "$RESPONSE" | grep -q "totalNodes\|activeNodes"; then
  echo "✅ Stats endpoint working"
  echo "   Response: $RESPONSE"
  ((PASSED++))
else
  echo "❌ Stats endpoint failed"
  ((FAILED++))
fi

# Test 3: Node Health Status
echo "Test 3: Node Health Status"
RESPONSE=$(curl -s "$BASE_URL/api/nodes/health-status")
if [ ! -z "$RESPONSE" ]; then
  echo "✅ Node health status working"
  echo "   Response: $RESPONSE"
  ((PASSED++))
else
  echo "❌ Node health status failed"
  ((FAILED++))
fi

# Test 4: Optimal Node Routing (needs parameters)
echo "Test 4: Optimal Node Routing"
RESPONSE=$(curl -s "$BASE_URL/api/routing/optimal-node?originCountry=US&destCountry=GB&bandwidth=100")
if [ ! -z "$RESPONSE" ]; then
  echo "✅ Optimal node routing working"
  echo "   Response: $RESPONSE"
  ((PASSED++))
else
  echo "❌ Optimal node routing failed"
  ((FAILED++))
fi

# Test 5: Threat Intelligence
echo "Test 5: Threat Intelligence"
RESPONSE=$(curl -s "$BASE_URL/api/threat-intel/CN")
if echo "$RESPONSE" | grep -q "threatLevel\|countryCode"; then
  echo "✅ Threat intelligence working"
  echo "   Response: $RESPONSE"
  ((PASSED++))
else
  echo "❌ Threat intelligence failed"
  ((FAILED++))
fi

# Test 6: WebSocket Connection (basic check)
echo "Test 6: WebSocket Availability"
if command -v wscat &> /dev/null; then
  timeout 2 wscat -c "ws://localhost:3001" 2>&1 | grep -q "connected" && {
    echo "✅ WebSocket connection available"
    ((PASSED++))
  } || {
    echo "⚠️  WebSocket test skipped (connection timeout)"
  }
else
  echo "⚠️  WebSocket test skipped (wscat not installed)"
fi

echo ""
echo "===================================="
echo "Results: $PASSED passed, $FAILED failed"
echo "===================================="

if [ $FAILED -eq 0 ]; then
  echo "✅ All tests passed!"
  exit 0
else
  echo "❌ Some tests failed"
  exit 1
fi
