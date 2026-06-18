# Positron Container Quickstart

> **Safe Demo Mode:** Positron starts without secrets, real runs, or tool execution. Perfect for local evaluation and homelab deployment.

## One-Command Start

```bash
docker compose up --build
```

Or if using Podman:

```bash
podman compose up --build
```

## Expected URLs

After the container starts (first build takes ~2-3 minutes):

| Service | URL |
|---------|-----|
| **Web UI** | http://localhost:3000 |
| **API Health** | http://localhost:3000/api/health |
| **Infrastructure Gates** | http://localhost:3000/api/infrastructure-gates/status |
| **Tool Gateway Status** | http://localhost:3000/api/tool-gateway/status |
| **Dashboard** | http://localhost:3000/dashboard |
| **Providers** | http://localhost:3000/providers |
| **Oversight** | http://localhost:3000/oversight |
| **Blueprints** | http://localhost:3000/blueprints |

## Verify Health

```bash
# Quick health check
curl http://localhost:3000/api/health

# Full smoke test
node scripts/healthcheck.js --smoke

# Or use the bash smoke test script
bash scripts/container-smoke-test.sh
```

## What Works Out of the Box

- **Web UI** — React/Vite dashboard with SSE real-time updates
- **API** — All read-only endpoints available
- **Health** — Adapter status, uptime, run count
- **Infrastructure Gates** — Status aggregation (all gates show not_checked in demo mode)
- **Tool Gateway** — Status monitoring (sealed/disabled by default)
- **SQLite** — Persistent data in `positron-data` Docker volume
- **Safety Endpoint** — Kill switch and safety toggle status

## What Is Disabled by Default

| Feature | Status | Reason |
|---------|--------|--------|
| Real Run Execution | ❌ Disabled | `POSITRON_ENABLE_REAL_RUN=false` |
| Tool Gateway Execute | ❌ Sealed | `POSITRON_ENABLE_TOOL_GATEWAY=false` |
| MCP Exposure | ❌ Disabled | `POSITRON_MCP_EXPOSE_ENABLED=false` |
| Auto Merge | ❌ Blocked | `POSITRON_MERGE_KILL_SWITCH=true` |
| Push to Remote | ❌ Disabled | `POSITRON_ENABLE_PUSH=false` |
| Fix Loops | ❌ Disabled | `POSITRON_ENABLE_FIX_LOOP=false` |
| Infrastructure State Upserts | ❌ Disabled | `POSITRON_ENABLE_INFRASTRUCTURE_STATE_UPSERT=false` |

## Data Persistence

SQLite data is stored in the named Docker volume `positron-data` mounted at `/app/data`:

```bash
# Inspect the volume
docker volume inspect positron-data

# Backup the database
docker run --rm -v positron-data:/data alpine cp /data/positron.db /backup/
```

## Stopping

```bash
# Stop and remove container (keeps volume)
docker compose down

# Stop and remove container + volume (deletes all data)
docker compose down --volumes
```

## Environment Variables

All environment variables have safe defaults in the Dockerfile. For a complete reference, see `.env.example`.

Override any variable in `docker-compose.yml`:

```yaml
environment:
  - POSITRON_MODE=fake
  - POSITRON_GITHUB_MODE=fake
  # Add custom overrides here
```

## Next Steps

1. **Explore the Dashboard** — http://localhost:3000
2. **Check Gates** — http://localhost:3000/api/infrastructure-gates/status
3. **For real runs** — See [Container Security Guide](container-security.md) for required configuration
4. **For Proxmox/CT 120** — See [Proxmox Deployment Notes](proxmox-ct120.md)

## Troubleshooting

### Port 3000 already in use

```bash
# Change the port in docker-compose.yml:
ports:
  - "3001:3000"  # Map to different host port
```

### Container fails to start

```bash
# Check logs
docker compose logs

# Check health
docker inspect positron --format='{{json .State.Health}}' | jq
```

### Database corruption / need fresh start

```bash
docker compose down --volumes
docker compose up --build
```

### Web UI shows 404

The server automatically serves static files from `apps/web/dist`. If this directory is missing, rebuild:

```bash
docker compose build --no-cache
docker compose up
```
