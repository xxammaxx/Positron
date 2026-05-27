#!/usr/bin/env bash
# Dogfood Test v0.1 — Issue #94
# Testet Positron mit dem eigenen Repository (RealGitWorkspaceAdapter)
set -e
echo "🐕 Dogfood Test — Positron testet Positron"
echo ""
echo "1. Health Check..."
curl -s http://localhost:3000/api/health | python3 -m json.tool 2>/dev/null | head -5
echo ""

echo "2. Runs Count..."
COUNT=$(curl -s http://localhost:3000/api/runs?limit=1 | python3 -c "import sys,json; print(json.load(sys.stdin).get('total',0))" 2>/dev/null || echo "0")
echo "   Aktuelle Runs: $COUNT"
echo ""

echo "3. Evidence..."
curl -s http://localhost:3000/api/evidence | python3 -c "import sys,json; s=json.load(sys.stdin).get('summary',{}); print(f\"   {s.get('totalArtifacts',0)} artifacts, {s.get('testEvents',0)} test events\")" 2>/dev/null
echo ""

echo "4. Settings..."
curl -s http://localhost:3000/api/settings/mcp | python3 -c "import sys,json; s=json.load(sys.stdin).get('servers',[]); print(f\"   {len(s)} MCP servers\")" 2>/dev/null
echo ""

echo "5. Admin Stats..."
curl -s http://localhost:3000/api/admin/stats | python3 -c "import sys,json; d=json.load(sys.stdin); r=d['runs']; print(f\"   Runs: {r['total']} total | Events: {d['events']} | Artifacts: {d['artifacts']} | DB: {d['dbSizeMb']} MB\")" 2>/dev/null
echo ""

echo "6. Web UI..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5173)
echo "   HTTP $HTTP_CODE"
echo ""

echo "✅ Dogfood Test abgeschlossen"
echo ""
echo "⚠️  Für echten Workspace-Test: POSITRON_WORKSPACE_ROOT setzen + GITHUB_MODE=real"
