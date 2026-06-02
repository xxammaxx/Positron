# Positron Alert-to-Runbook Mapping

## Critical Alerts

| Alert | Severity | Runbook |
|-------|----------|---------|
| PositronServerDown | critical | [positron-server-down.md](docs/runbooks/positron-server-down.md) |
| RedisDown | critical | [redis-down.md](docs/runbooks/redis-down.md) |
| WorkerDown | critical | [worker-down.md](docs/runbooks/worker-down.md) |
| HighRunFailureRate | critical | [high-run-failure-rate.md](docs/runbooks/high-run-failure-rate.md) |
| QueueBacklogCritical | critical | [queue-backlog-critical.md](docs/runbooks/queue-backlog-critical.md) |

## Warning Alerts

| Alert | Severity | Runbook |
|-------|----------|---------|
| GitHubRateLimitHit | warning | [github-rate-limit.md](docs/runbooks/github-rate-limit.md) |
| HighOpenCodeFailureRate | warning | [high-opencode-failure-rate.md](docs/runbooks/high-opencode-failure-rate.md) |
| HighRetryRate | warning | [high-run-failure-rate.md](docs/runbooks/high-run-failure-rate.md) |
| LongRunDuration | warning | [high-run-failure-rate.md](docs/runbooks/high-run-failure-rate.md) |
| QueueBacklogGrowing | warning | [queue-backlog-critical.md](docs/runbooks/queue-backlog-critical.md) |
| QueueBacklogCriticalDrill | warning | [queue-backlog-critical.md](docs/runbooks/queue-backlog-critical.md) |

## Escalation Summary

| Level | Time | Action |
|-------|------|--------|
| **Level 1** | 5–10 min | Developer checks dashboard, runs diagnostic commands |
| **Level 2** | 15–30 min | Ops engineer investigates root cause, restarts services |
| **Level 3** | 1+ hour | Platform/infrastructure team investigates systemic issues |

## Routing

- **Critical** alerts → `critical-webhook` receiver (immediate, `group_wait: 10s`)
- **Warning** alerts → `warning-webhook` receiver (batched, `group_wait: 30s`)
- **Inhibit**: Critical alert for same alertname suppresses Warning
