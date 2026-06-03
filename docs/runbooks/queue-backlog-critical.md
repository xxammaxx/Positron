# Incident Runbook: Queue Backlog Critical / Growing

**Alerts:** `QueueBacklogCritical`, `QueueBacklogGrowing` | **Severity:** Critical / Warning | **Component:** queue

## Meaning

`QueueBacklogCritical`: More than 50 jobs are waiting in the `positron-pipeline` queue.

`QueueBacklogGrowing`: The number of waiting jobs is steadily increasing.

## Possible Causes

1. Worker is down or not processing (check `WorkerDown` alert first)
2. Workers cannot keep up with incoming job rate
3. Jobs are stuck — each job takes too long, blocking the worker
4. Redis performance issue — slow job dequeuing
5. Worker concurrency too low for job volume

## Immediate Checks

```bash
# 1. Check worker status
curl -s http://localhost:3000/metrics | grep positron_queue_worker_up

# 2. Check queue depth
curl -s http://localhost:3000/metrics | grep -E "queue_jobs_waiting|queue_jobs_active"

# 3. Check job duration
curl -s http://localhost:3000/metrics | grep positron_queue_job_duration

# 4. Check if jobs are failing
curl -s http://localhost:3000/metrics | grep positron_queue_jobs_failed_total
```

## Diagnostic Commands

```bash
# Check worker logs
journalctl -u positron-worker --since "5 minutes ago" | tail -30

# Check if any jobs are stalled
redis-cli ZRANGE "bull:positron-pipeline:stalled" 0 -1 WITHSCORES

# Check worker concurrency (in apps/worker/src/index.ts)
grep "concurrency" apps/worker/src/index.ts
```

## Dashboard Panels

- **Grafana** → Positron Runtime → Queue/Worker section
- Queue Waiting panel (shows current waiting count)
- Job Duration p95 panel

## Metrics

- `positron_queue_jobs_waiting` — current backlog
- `positron_queue_worker_up` — workers connected
- `positron_queue_job_duration_seconds` — how long jobs take
- `positron_queue_jobs_failed_total` — failure rate

## Safe Countermeasures

1. **Start additional workers**: increase `concurrency` in worker config or start more worker processes
2. **Pause incoming jobs**: stop the watcher (`POSITRON_ENABLE_WATCHER=false`) to reduce incoming job rate
3. **Clear stalled jobs**: find and remove stalled job entries in Redis (only if jobs are confirmed dead)
4. **Increase worker concurrency**: edit `apps/worker/src/index.ts` → `concurrency: 4`

## Escalation

1. First: Developer checks worker status and queue depth (5 min)
2. Second: Ops engineer starts additional workers (15 min)
3. Third: Platform team if Redis is bottleneck (30 min)

## When to Clear

- `QueueBacklogCritical`: waiting jobs < 50 for 5 minutes
- `QueueBacklogGrowing`: waiting job count stabilizes or decreases
