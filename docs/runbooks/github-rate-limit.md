# Incident Runbook: GitHub Rate Limit Hit

**Alert:** `GitHubRateLimitHit` | **Severity:** Warning | **Component:** github

## Meaning

Positron has hit GitHub's API rate limit. API requests are being throttled or rejected.

## Possible Causes

1. Too many API requests in a short period (normal limit: 5000/hour for authenticated users)
2. Secondary rate limit triggered (burst protection)
3. Unauthenticated requests (limit: 60/hour)
4. Token scope too broad or token invalid
5. Infinite retry loop causing request amplification

## Immediate Checks

```bash
# 1. Check rate limit status (requires token)
curl -s -H "Authorization: token $GITHUB_TOKEN" \
  https://api.github.com/rate_limit | jq '.rate'

# 2. Check Positron metrics
curl -s http://localhost:3000/metrics | grep positron_github_rate_limit_hits_total

# 3. Check GitHub API request volume
curl -s http://localhost:3000/metrics | grep positron_github_api_requests_total
```

## Diagnostic Commands

```bash
# Check remaining rate limit
curl -s -H "Authorization: token $GITHUB_TOKEN" \
  https://api.github.com/rate_limit | jq '.resources.core'

# Check when rate limit resets
curl -s -H "Authorization: token $GITHUB_TOKEN" \
  https://api.github.com/rate_limit | \
  jq '.resources.core.reset | strftime("%Y-%m-%d %H:%M:%S")'

# Check which endpoints are being hit most
curl -s http://localhost:3000/metrics | grep "github_api_requests_total" | sort
```

## Dashboard Panels

- **Grafana** → Positron Runtime → Adapter Health section
- GitHub Rate Limit Hits panel
- GitHub API Requests panel (check volume)

## Metrics

- `positron_github_rate_limit_hits_total{rate_limit_type="primary"}`
- `positron_github_rate_limit_hits_total{rate_limit_type="secondary"}`
- `positron_github_api_requests_total` — request volume

## Safe Countermeasures

1. **Wait for rate limit reset**: check the reset time, wait until then
2. **Reduce API calls**: pause the watcher, cancel non-critical runs
3. **Verify token**: check `GITHUB_TOKEN` validity and scope
4. **Check for retry loops**: high retry count + API calls = amplification

## Escalation

1. First: Developer checks rate limit status (2 min)
2. Second: Wait for rate limit reset (usually < 1 hour)
3. Third: Contact GitHub support if rate limit is unexpected

## When to Clear

Alert clears when no new rate limit hits are detected for 5 minutes. Verify:
- `rate(positron_github_rate_limit_hits_total[5m]) == 0`
- GitHub API requests are succeeding (`outcome="success"`)
