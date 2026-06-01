# Incident Runbook: Redis Down

**Alert:** `RedisDown` | **Severity:** Critical | **Component:** redis

## Meaning

Positron's BullMQ queue cannot reach Redis. Queue operations are degraded — new jobs cannot be enqueued and existing jobs cannot be processed.

## Possible Causes

1. Redis service is stopped or crashed
2. Redis port (6379) blocked by firewall
3. Wrong Redis URL in `POSITRON_REDIS_URL`
4. Network partition between server and Redis
5. Memory exhaustion in Redis (maxmemory reached)

## Immediate Checks

```bash
# 1. Check Redis process
ps aux | grep redis-server | grep -v grep

# 2. Check Redis connectivity
redis-cli ping
# Expected: PONG

# 3. Check Redis memory
redis-cli INFO memory | grep used_memory_human

# 4. Check env variable
echo $POSITRON_REDIS_URL
# Default: redis://localhost:6379

# 5. Check queue metric
curl -s http://localhost:3000/metrics | grep positron_queue_redis_up
```

## Diagnostic Commands

```bash
# Check Redis status
systemctl status redis

# Restart Redis
systemctl restart redis

# Check Redis logs
journalctl -u redis --since "5 minutes ago"
```

## Dashboard Panels

- **Grafana** → Positron Runtime → Queue/Worker section → Redis stat (shows DOWN)

## Metrics

- `positron_queue_redis_up` — 0 means unreachable
- `positron_queue_jobs_waiting` — may grow as jobs accumulate

## Safe Countermeasures

1. Restart Redis: `systemctl restart redis` or `docker compose restart redis`
2. If memory exhausted: increase `maxmemory` or evict unused keys
3. If connectivity issue: verify firewall rules for port 6379
4. Fallback: Positron server falls back to inline execution when Redis is unavailable

## Escalation

1. First: Developer checks Redis connectivity (5 min)
2. Second: Ops engineer restarts Redis pod (15 min)
3. Third: Infrastructure team investigates network (30 min)

## When to Clear

Alert clears when `positron_queue_redis_up` returns to 1. Verify:
- `redis-cli ping` returns PONG
- `curl -s http://localhost:3000/metrics | grep queue_redis_up` shows 1
