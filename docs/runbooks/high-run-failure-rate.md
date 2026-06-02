# Incident Runbook: High Run Failure Rate

**Alerts:** `HighRunFailureRate`, `HighRetryRate`, `LongRunDuration` | **Severity:** Critical / Warning | **Component:** pipeline

## Meaning

More than 30% of runs are failing (`HighRunFailureRate`), or the retry rate is elevated (`HighRetryRate`), or runs are taking too long (`LongRunDuration`).

## Possible Causes

1. **External dependency failure**: GitHub API down, OpenCode CLI broken
2. **Resource exhaustion**: Disk full, memory low, CPU saturated
3. **Configuration error**: Wrong repo settings, invalid tokens
4. **Code regression**: Recent change broke pipeline logic
5. **Rate limiting**: GitHub or OpenCode rate limits hit
6. **Issue content**: Malformed issue body causing parser errors

## Immediate Checks

```bash
# 1. Check failure types
curl -s http://localhost:3000/metrics | grep positron_run_failures_total

# 2. Check OpenCode failure rate
curl -s http://localhost:3000/metrics | grep positron_opencode_command_failures_total

# 3. Check GitHub API failures
curl -s http://localhost:3000/metrics | grep positron_github_api_failures_total

# 4. Check recent run events
curl -s http://localhost:3000/api/admin/stats | jq .

# 5. Check server logs for error patterns
grep -i "error\|fail\|blocked" apps/server/logs/*.log | tail -30
```

## Diagnostic Commands

```bash
# Check which phases fail most
curl -s http://localhost:3000/api/metrics | jq '.metrics.recentFailures'

# Check disk space
df -h

# Check GitHub rate limit
curl -s -H "Authorization: token $GITHUB_TOKEN" \
  https://api.github.com/rate_limit | jq '.rate.remaining'
```

## Dashboard Panels

- **Grafana** → Positron Runtime → Pipeline Health section
- Failures by Type panel shows which failure types are occurring
- Retry Rate panel shows retry frequency

## Metrics

- `positron_run_failures_total{failure_type="..."}` — check which type
- `positron_opencode_command_failures_total` — if OpenCode is the cause
- `positron_github_api_failures_total` — if GitHub API is the cause
- `positron_retries_total` — retry frequency

## Safe Countermeasures

1. If all failures have same `failure_type`: investigate that specific component
2. If GitHub-related: check token validity, rate limits
3. If OpenCode-related: check CLI installation, version, permissions
4. Pause new runs until root cause is fixed: use Positron Dashboard to cancel active runs
5. Enable fix loops if disabled: set `POSITRON_ENABLE_FIX_LOOP=true`

## Escalation

1. First: Developer checks dashboard and recent failures (10 min)
2. Second: Pipeline owner investigates root cause (30 min)
3. Third: Platform team if infrastructure-related (1 hour)

## When to Clear

- `HighRunFailureRate`: failure rate drops below 30% for 5 consecutive minutes
- `HighRetryRate`: retry rate returns to baseline
- `LongRunDuration`: p95 duration drops below 10 minutes
