# Incident Runbook: Worker Down

**Alert:** `WorkerDown` | **Severity:** Critical | **Component:** worker

## Meaning

No BullMQ workers are connected to the `positron-pipeline` queue. Runs are NOT being processed.

## Possible Causes

1. Worker process (`apps/worker`) is not running
2. Worker crashed due to unhandled exception
3. Redis connection lost (check `RedisDown` alert first)
4. Worker stuck on a long-running job (lock not released)
5. Worker was manually stopped

## Immediate Checks

```bash
# 1. Check worker process
ps aux | grep "node.*apps/worker" | grep -v grep

# 2. Check worker logs
journalctl -u positron-worker --since "5 minutes ago"

# 3. Check queue state
curl -s http://localhost:3000/metrics | grep -E "queue_jobs_waiting|queue_worker_up"

# 4. Check Redis connectivity first if RedisDown is also firing
```

## Diagnostic Commands

```bash
# Start worker manually
npm run worker

# Check running jobs via BullMQ dashboard (if available)
# Or inspect Redis keys
redis-cli KEYS "bull:positron-pipeline:*" | head -20

# Check for stalled jobs
redis-cli ZRANGE "bull:positron-pipeline:active" 0 -1 WITHSCORES
```

## Dashboard Panels

- **Grafana** → Positron Runtime → Queue/Worker section → Worker stat (shows DOWN)
- **Queue/Worker** → Queue Waiting (likely growing)

## Metrics

- `positron_queue_worker_up{queue="positron-pipeline"}` — 0 means no workers
- `positron_queue_jobs_waiting` — growing when workers are down

## Safe Countermeasures

1. Start the worker: `npm run worker` or `systemctl start positron-worker`
2. If worker keeps crashing: check worker logs for the specific error
3. If Redis is also down: fix Redis first (see `redis-down.md`)
4. Restart a stuck worker: kill the worker process, then restart

## Escalation

1. First: Developer starts worker (5 min)
2. Second: Ops engineer investigates worker crash logs (15 min)
3. Third: Platform team investigates BullMQ/Redis (30 min)

## When to Clear

Alert clears when `positron_queue_worker_up` returns to 1. Verify:
- Worker process is running (`ps aux | grep worker`)
- Worker logs show "Listening on queue"
- Queue waiting jobs are being processed
