# Incident Runbook: Positron Server Down

**Alert:** `PositronServerDown` | **Severity:** Critical | **Component:** server

## Meaning

The Positron server is not responding to Prometheus scrapes. This means `/metrics` is unreachable.

## Possible Causes

1. Server process crashed or was killed (OOM, SIGKILL)
2. Port conflict — another process using port 3000
3. Network issue — firewall, iptables, Docker network
4. Uncaught exception in server startup
5. Dependency failure (SQLite DB corruption, filesystem full)

## Immediate Checks

```bash
# 1. Check if server process is running
ps aux | grep "node.*apps/server" | grep -v grep

# 2. Check server port
lsof -i :3000 || ss -tlnp | grep 3000

# 3. Check recent server logs
journalctl -u positron --since "5 minutes ago"
# Or: tail -f apps/server/logs/*.log

# 4. Try health endpoint
curl -s http://localhost:3000/api/health | jq .
```

## Diagnostic Commands

```bash
# Check disk space
df -h /tmp /var/lib/positron

# Check DB integrity
sqlite3 apps/server/.positron/runs/positron.db "PRAGMA integrity_check;"

# Restart server
systemctl restart positron
# Or: npm start
```

## Dashboard Panels

- **Runtime Health** → Server Uptime stat (shows 0 or missing)
- **Grafana** → Positron Runtime Dashboard, top-left panel

## Metrics

- `up{job="positron-server"}` — should be 1
- `positron_server_uptime_seconds` — resets on restart

## Safe Countermeasures

1. Restart the server: `systemctl restart positron` or `npm start`
2. If OOM: increase memory, check for memory leaks
3. If port conflict: change `PORT` env var, kill conflicting process
4. If DB corruption: restore from backup, then restart

## Escalation

1. First: Developer checks server health (5 min)
2. Second: Ops engineer checks system resources (15 min)
3. Third: On-call engineer restores from backup (30 min)

## When to Clear

Alert clears automatically when `up` returns to 1. Verify:
- `GET /api/health` returns `{"status": "ok"}`
- `GET /metrics` returns Prometheus metrics
- Grafana shows uptime > 0
