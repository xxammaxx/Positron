# Containerized Deployment MVP — Status

## Last Updated
2026-06-18

## Status: IMPLEMENTED (Ready for Human Approval)

> ⚠️ **Validation Note (2026-06-18):** Dockerfile/Compose static validation PASSED. Proxmox host 192.168.1.136 unreachable. Live `docker compose up --build` NOT executed — Docker Desktop daemon unavailable on validation host. Status: PARTIAL — static validation complete, live container smoke test pending.

## What Changed

### New Capability: Containerized Single-Service Deployment

Positron can now be deployed with a single command:

```bash
docker compose up --build
# → Web UI + API on http://localhost:3000
```

### Architecture

- **Single container** — Server serves Web UI static files + API on one port (3000)
- **SQLite persistence** — Data stored in Docker volume `positron-data`
- **No Redis required** — Demo mode runs inline, no job queue
- **No external dependencies** — Fake adapters, no GitHub token needed
- **Multi-stage build** — TypeScript + Vite built in stage 1, slim runtime in stage 2

### Safety Defaults

| Gate | Default | Effect |
|------|---------|--------|
| Real Run | `false` | No agent execution |
| Tool Gateway | `sealed/disabled` | No tool execution |
| MCP Exposure | `false` | No MCP server |
| Merge Kill Switch | `true` | All merges blocked |
| Auto Merge | `false` | Requires human approval |
| Push | `false` | No remote push |
| Infra State Upsert | `false` | Read-only state |

### What Works After Rollout

- Web UI at http://localhost:3000 (with SPA routing)
- API Health at /api/health
- Infrastructure Gates at /api/infrastructure-gates/status
- Tool Gateway (read-only) at /api/tool-gateway/status
- Safety state at /api/safety
- SQLite data persists in volume across restarts
- All SPA routes: /, /dashboard, /providers, /oversight, /blueprints

### Files Added/Modified

| File | Change |
|------|--------|
| `Dockerfile` (root) | NEW — Multi-stage single-container build |
| `docker-compose.yml` | REWRITTEN — Single service, safe defaults |
| `apps/server/src/index.ts` | MODIFIED — Added static web UI serving |
| `.env.example` | REWRITTEN — Safe defaults, container variables |
| `.dockerignore` | UPDATED — Added DB/SHM/WAL patterns |
| `scripts/healthcheck.js` | NEW — Node.js health/smoke test |
| `scripts/container-smoke-test.sh` | NEW — Bash smoke test |
| `docs/deployment/container-quickstart.md` | NEW — Deployment guide |
| `docs/deployment/container-security.md` | NEW — Security guide |
| `docs/deployment/proxmox-ct120.md` | NEW — CT 120 notes |
| `README.md` | MODIFIED — Updated quickstart |

### Tests

- TypeScript build: PASS (all projects)
- Typecheck: PASS (tsc -b --dry)
- Contract tests: 246/247 PASS (1 pre-existing)
- Full test suite: 2181/2187 PASS (6 pre-existing)
- Secret scan: CLEAN
- DB artifact scan: CLEAN (only in .gitignored dirs)

### Known Limitations (Unchanged)

- No persistent multi-process lock
- adapterSource is scanner-level only
- Security gate is basic (no full secret leakage scan)
- Non-root user in container (good) but no SELinux/AppArmor profiles
- No TLS — uses HTTP only
- No horizontal scaling
- Docker socket not needed (successfully avoided)
