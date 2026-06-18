#!/usr/bin/env bash
# Positron Container Smoke Test
# Verifies containerized Positron deployment works correctly.
#
# Usage:
#   bash scripts/container-smoke-test.sh [--keep-running]

set -euo pipefail

KEEP_RUNNING=false
if [[ "${1:-}" == "--keep-running" ]]; then
  KEEP_RUNNING=true
fi

BASE_URL="${POSITRON_SMOKE_URL:-http://localhost:3000}"
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

PASS=0
FAIL=0

check_json() {
  local name="$1"
  local url="$2"
  local jq_filter="$3"
  local expected="${4:-}"
  
  local resp
  resp=$(curl -fsS -m 10 "$url" 2>/dev/null) || {
    echo -e "${RED}[FAIL]${NC} $name — request failed"
    FAIL=$((FAIL + 1))
    return
  }
  
  local actual
  actual=$(echo "$resp" | jq -r "$jq_filter" 2>/dev/null) || {
    echo -e "${RED}[FAIL]${NC} $name — JSON parse failed"
    FAIL=$((FAIL + 1))
    return
  }
  
  if [[ -n "$expected" ]]; then
    if [[ "$actual" == "$expected" ]]; then
      echo -e "${GREEN}[PASS]${NC} $name = $actual"
      PASS=$((PASS + 1))
    else
      echo -e "${RED}[FAIL]${NC} $name — expected '$expected', got '$actual'"
      FAIL=$((FAIL + 1))
    fi
  else
    echo -e "${GREEN}[PASS]${NC} $name = $actual"
    PASS=$((PASS + 1))
  fi
}

check_status() {
  local name="$1"
  local url="$2"
  
  local code
  code=$(curl -fsS -o /dev/null -w '%{http_code}' -m 10 "$url" 2>/dev/null) || {
    echo -e "${RED}[FAIL]${NC} $name — request failed"
    FAIL=$((FAIL + 1))
    return
  }
  
  if [[ "$code" -ge 200 && "$code" -lt 400 ]]; then
    echo -e "${GREEN}[PASS]${NC} $name — HTTP $code"
    PASS=$((PASS + 1))
  else
    echo -e "${RED}[FAIL]${NC} $name — HTTP $code"
    FAIL=$((FAIL + 1))
  fi
}

echo "==========================================="
echo " Positron Container Smoke Test"
echo " Base URL: $BASE_URL"
echo "==========================================="
echo ""

# ── 1. Health ──
echo "── Health ──"
check_json "API Health" "$BASE_URL/api/health" ".status"
check_json "Health mode" "$BASE_URL/api/health" ".mode" "fake"

# ── 2. Infrastructure Gates ──
echo ""
echo "── Infrastructure Gates ──"
check_json "Infra gates status" "$BASE_URL/api/infrastructure-gates/status" ".status"
check_json "Runtime started" "$BASE_URL/api/infrastructure-gates/status" ".runtimeStarted" "false"

# ── 3. Tool Gateway ──
echo ""
echo "── Tool Gateway ──"
check_json "Gateway enabled" "$BASE_URL/api/tool-gateway/status" ".gatewayEnabled" "false"
check_json "Gateway sealed" "$BASE_URL/api/tool-gateway/status" ".sealed" "true"
check_json "Runtime active" "$BASE_URL/api/tool-gateway/status" ".runtimeActive" "false"

# ── 4. Safety ──
echo ""
echo "── Safety ──"
check_json "Kill switch active" "$BASE_URL/api/safety" ".killSwitch" "true"

# ── 5. Web UI routes ──
echo ""
echo "── Web UI Routes ──"
check_status "Web root (/) " "$BASE_URL/"
check_status "Dashboard (/dashboard)" "$BASE_URL/dashboard"
check_status "Providers (/providers)" "$BASE_URL/providers"
check_status "Oversight (/oversight)" "$BASE_URL/oversight"
check_status "Blueprints (/blueprints)" "$BASE_URL/blueprints"

# ── 6. Tool Gateway tools ──
echo ""
echo "── Tool Gateway ──"
check_status "Tools list" "$BASE_URL/api/tool-gateway/tools"

echo ""
echo "==========================================="
echo " Results: ${GREEN}$PASS PASS${NC}, ${RED}$FAIL FAIL${NC}"
echo "==========================================="

# ── 7. Docker compose down (unless --keep-running) ──
if [[ "$KEEP_RUNNING" == "false" ]]; then
  echo ""
  echo "Stopping containers..."
  docker compose down --volumes 2>/dev/null || true
  echo "Containers stopped."
fi

if [[ "$FAIL" -gt 0 ]]; then
  echo ""
  echo -e "${RED}SMOKE TEST FAILED${NC}"
  exit 1
fi

echo ""
echo -e "${GREEN}SMOKE TEST PASSED${NC}"
exit 0
