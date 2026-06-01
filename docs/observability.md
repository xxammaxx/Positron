# Positron Observability Guide (QA-013)

## Overview

Positron exposes Prometheus-compatible metrics via `GET /metrics`. This guide covers local setup with Prometheus, Grafana, and alerting.

## Quick Start

```bash
# 1. Start the Positron server
npm run dev
# or: npm start

# 2. Start observability stack (separate terminal)
docker compose -f docker-compose.observability.yml up

# 3. Access dashboards
# Grafana: http://localhost:3001 (admin/admin)
# Prometheus: http://localhost:9090
```

## Architecture

```
┌──────────────┐     scrape /metrics     ┌─────────────┐     query     ┌──────────┐
│  Positron    │ ◄────────────────────── │ Prometheus   │ ────────────► │ Grafana  │
│  Server:3000 │                         │ :9090        │              │ :3001    │
└──────────────┘                         └──────┬───────┘              └──────────┘
                                                │ alert rules
                                                ▼
                                          ┌──────────┐
                                          │ Alert    │
                                          │ Manager  │
                                          └──────────┘
```

## Metrics Reference

### Runtime Health

| Metric | Type | Description |
|--------|------|-------------|
| `positron_server_uptime_seconds` | Gauge | Server uptime |
| `positron_runs_active` | Gauge | Currently active runs |

### Run Lifecycle

| Metric | Type | Description |
|--------|------|-------------|
| `positron_runs_total` | Counter | Total runs by status |
| `positron_run_duration_seconds` | Histogram | Run duration (10s-3600s buckets) |
| `positron_run_failures_total` | Counter | Failures by failure_type |
| `positron_retries_total` | Counter | Retry attempts |
| `positron_cancellations_total` | Counter | Cancelled runs |

### GitHub API Telemetry

| Metric | Type | Description |
|--------|------|-------------|
| `positron_github_api_requests_total` | Counter | API requests by method, outcome |
| `positron_github_api_failures_total` | Counter | Failures by method, error_kind |
| `positron_github_api_duration_seconds` | Histogram | Request duration |
| `positron_github_rate_limit_hits_total` | Counter | Rate limit events |

### OpenCode Telemetry

| Metric | Type | Description |
|--------|------|-------------|
| `positron_opencode_command_total` | Counter | Commands by type, outcome |
| `positron_opencode_command_duration_seconds` | Histogram | Command duration |
| `positron_opencode_command_failures_total` | Counter | Failures by type, error_kind |

### Safety Gates

| Metric | Type | Description |
|--------|------|-------------|
| `positron_blocked_merges_total` | Counter | Blocked merges by reason |
| `positron_blocked_pushes_total` | Counter | Blocked pushes |
| `positron_gate_revisions_total` | Counter | Gate revision decisions |

### Queue / Worker (QA-012)

| Metric | Type | Description |
|--------|------|-------------|
| `positron_queue_jobs_total` | Counter | Jobs processed |
| `positron_queue_jobs_active` | Gauge | Currently active jobs |
| `positron_queue_jobs_waiting` | Gauge | Jobs waiting |
| `positron_queue_jobs_completed_total` | Counter | Completed jobs |
| `positron_queue_jobs_failed_total` | Counter | Failed jobs |
| `positron_queue_job_duration_seconds` | Histogram | Job duration |
| `positron_queue_job_retries_total` | Counter | Job retries |
| `positron_queue_worker_up` | Gauge | Worker status (0/1) |
| `positron_queue_redis_up` | Gauge | Redis status (0/1) |

## Dashboards

### Positron Runtime (import from `observability/grafana/dashboards/positron-runtime.json`)

5 sections, 21 panels:

| Section | Panels | Metrics Used |
|---------|--------|-------------|
| Runtime Health | Server Uptime, Active Runs, Runs/Failures, Duration p50/p95/p99 | `server_uptime_seconds`, `runs_active`, `runs_total`, `run_duration_seconds` |
| Pipeline Health | Failures by Type, Retry Rate, Cancellations | `run_failures_total`, `retries_total`, `cancellations_total` |
| Adapter Health | GitHub Requests, GitHub Latency p95, Rate Limit Hits, OpenCode Commands, OpenCode Duration p95 | `github_api_*`, `opencode_command_*` |
| Safety Gates | Blocked Merges, Blocked Pushes, Gate Revisions | `blocked_merges_total`, `blocked_pushes_total`, `gate_revisions_total` |
| Queue / Worker | Queue Waiting, Queue Active, Completed/Failed, Job Duration p95, Worker, Redis | `queue_jobs_*`, `queue_worker_up`, `queue_redis_up` |

## Alert Rules

Defined in `observability/prometheus/alerts.yml`.

### Critical (5 rules)

| Alert | Condition |
|-------|-----------|
| PositronServerDown | `up{job="positron-server"} == 0` |
| RedisDown | `positron_queue_redis_up == 0` |
| WorkerDown | `positron_queue_worker_up == 0` |
| HighRunFailureRate | Failure rate > 30% |
| QueueBacklogCritical | > 50 waiting jobs |

### Warning (5 rules)

| Alert | Condition |
|-------|-----------|
| GitHubRateLimitHit | Rate limit events detected |
| HighOpenCodeFailureRate | OpenCode failure rate > 25% |
| HighRetryRate | Retry rate elevated |
| LongRunDuration | p95 duration > 10min |
| QueueBacklogGrowing | Waiting jobs increasing |

**⚠️ Thresholds are initial estimates. Calibrate with production data before relying on them.**

## Known Limitations

1. **No production baseline** — Alert thresholds are estimates and need calibration after 7+ days of live data.
2. **Worker metrics via server** — Queue stats are collected by the server polling BullMQ. The worker process itself does not expose its own `/metrics` endpoint.
3. **No Alertmanager integration** — Alert rules are defined but Alertmanager (notifications to Slack/PagerDuty) is not configured. See Prometheus Alertmanager docs.
4. **Docker dependency** — Prometheus and Grafana run in Docker. For non-Docker setups, install `prometheus` and `grafana` directly.
5. **Authentication** — Grafana uses default `admin/admin` credentials. Change for production.

## Local Validation

```bash
# 1. All tests must pass
npm run build && npm run typecheck && npm test

# 2. Validate Prometheus config (if promtool installed)
promtool check config observability/prometheus/prometheus.yml
promtool check rules observability/prometheus/alerts.yml

# 3. Validate Docker Compose
docker compose -f docker-compose.observability.yml config

# 4. Check YAML structure
python3 -c "import yaml; yaml.safe_load(open('observability/prometheus/prometheus.yml'))" && echo "OK"
```

## File Inventory

```
observability/
├── prometheus/
│   ├── prometheus.yml          # Scrape configuration
│   └── alerts.yml              # Alert rules (10 alerts)
├── grafana/
│   ├── dashboards/
│   │   └── positron-runtime.json  # Main dashboard (21 panels)
│   └── provisioning/
│       ├── datasources/
│       │   └── prometheus.yml     # Auto-configure Prometheus datasource
│       └── dashboards/
│           └── dashboards.yml     # Auto-load dashboards
├── docker-compose.observability.yml  # Docker Compose profile
└── docs/
    └── observability.md             # This document
```

## Security

- No secrets, tokens, or credentials in any configuration file.
- No PII in metric labels — only controlled vocabulary (`status`, `outcome`, `error_kind`, `phase`).
- No high-cardinality labels (`runId`, `issueTitle`, `branchName`).
- Grafana default password (`admin/admin`) should be changed for production.
- Network isolation via Docker bridge network.

## Troubleshooting

| Symptom | Check |
|---------|-------|
| Grafana shows "No data" | Verify Prometheus can reach Positron: `curl http://server:3000/metrics` |
| Prometheus target down | Ensure `extra_hosts` mapping works: check `host.docker.internal` or `host-gateway` |
| No queue metrics | Redis must be running. Queue metrics show 0 when Redis is unavailable. |
| Dashboard not loaded | Check provisioning config paths in `observability/grafana/provisioning/` |
