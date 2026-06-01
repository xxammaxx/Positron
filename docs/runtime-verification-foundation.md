# QA-009 — Runtime Verification & Observability Foundation

> **Status:** Audit Complete &mdash; Foundation Defined  
> **Date:** 2026-06-01  
> **Branch:** `positron/qa-009-runtime-verification-foundation`  
> **Issue:** [#129](https://github.com/xxammaxx/Positron/issues/129)

---

## Executive Summary

Positron besitzt eine solide Basis für Runtime-Beobachtung (strukturierte Events via `storeEvent`, Health-Endpoints, Dashboard-SSE, Basis-Metriken), aber **keine systematische Observability-Infrastruktur** (kein Prometheus-Export, kein Tracing, keine Log-Aggregation, kein Alerting, keine GitHub/OpenCode-Telemetrie).

**Kern-Gaps:**

| Gap | Impact | Priority |
|-----|--------|----------|
| Kein Prometheus-Metrics-Endpoint | Keine automatische Alarmierung, kein Grafana | **HIGH** |
| Kein Structured JSON Logging | Logs nicht maschinenlesbar, keine Aggregation | **HIGH** |
| Kein Distributed Tracing | Keine Latenz-Analyse, keine Bottleneck-Erkennung | MEDIUM |
| Keine GitHub API Telemetrie | Rate-Limits, Fehlerraten unsichtbar | **HIGH** |
| Keine OpenCode Telemetrie | Agenten-Performance nicht messbar | MEDIUM |
| Keine automatische Anomalie-Erkennung | Regressionen werden nur manuell erkannt | MEDIUM |

**Empfehlung:** Fokus auf Prometheus-Export + GitHub-Telemetrie als QA-010 Next Step.

---

## Phase 1 — Observability Audit (Ist-Zustand)

### 1.1 Komponenten-Matrix

| Komponente | Logging | Metrics | Tracing | Health | Alerts |
|------------|:-------:|:-------:|:-------:|:------:|:------:|
| **Server (Express)** | ✅ console | ✅ /api/metrics | ❌ | ✅ /api/health | ❌ |
| **State Machine** | ✅ storeEvent | ❌ | ❌ | — | ❌ |
| **Database (SQLite)** | ❌ | ✅ run counts | ❌ | ⚠️ counts only | ❌ |
| **GitHub Watcher** | ✅ component log | ❌ | ❌ | ❌ | ❌ |
| **BullMQ Queue** | ❌ | ❌ | ❌ | ❌ | ❌ |
| **GitHub Adapter** | ✅ sync results | ❌ | ❌ | ⚠️ fake/real | ❌ |
| **OpenCode Adapter** | ✅ evidence files | ❌ | ❌ | ⚠️ CLI check | ❌ |
| **SpecKit Adapter** | ✅ artifact scan | ❌ | ❌ | ⚠️ CLI check | ❌ |
| **SSE Broadcaster** | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Rate Limiter** | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Background Jobs** | ✅ component log | ❌ | ❌ | ❌ | ❌ |
| **Agent Runs** | ✅ storeEvent | ⚠️ phase counts | ❌ | ❌ | ❌ |
| **Worker (BullMQ)** | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Cancellation/Control** | ✅ storeEvent | ❌ | ❌ | ❌ | ❌ |
| **Safety Gates** | ✅ storeEvent | ⚠️ /api/safety | ❌ | ❌ | ❌ |

**Legende:** ✅ Vorhanden | ⚠️ Teilweise | ❌ Fehlt

### 1.2 Detaillierte Analyse

#### Logging (`apps/server/src/logger.ts`)

```typescript
// Aktuelles Format
[09:20:34.422] [INFO] [Server] Server listening on http://localhost:3000, mode=fake

// Komponenten: Server, Watcher
// Levels: debug, info, warn, error
// Konfiguration: POSITRON_LOG_LEVEL (default: info)
```

**Bewertung:**
- ✅ Einfach, stabil, keine externen Dependencies
- ✅ Component-basierte Filterung
- ❌ Kein strukturiertes JSON — Logs sind für Maschinen nicht parsebar
- ❌ Kein `runId` / `traceId` im Log-Präfix (nur `[Component]`)
- ❌ Ausgabe nur auf stdout — keine Datei, kein Syslog, kein Log-Aggregator
- ❌ Kein `console.error` / `console.warn` Split (alles via `console.log`)
- ❌ Fehlende Felder: `runId`, `issueNumber`, `branch`, `agent`, `durationMs`

#### Event Store (`storeEvent`)

```typescript
// Positron-interner Event-Store (SQLite)
storeEvent({
  id:    crypto.randomUUID(),
  runId: run.id,           // ✅ Korrelation
  phase: current.phase,    // ✅ Phase
  level: 'INFO',           // ✅ Schweregrad
  message: '...',          // ✅ Beschreibung
  payload: {...},          // ✅ Kontext
  createdAt: new Date().toISOString(),
});
```

**Bewertung:**
- ✅ Hervorragende Run-weite Korrelation via `runId`
- ✅ Jeder Phasenübergang + Fehler wird persistiert
- ✅ Payload für strukturierte Metadaten
- ❌ Keine `traceId` für verteilte Korrelation (GitHub API → OpenCode CLI → Server)
- ❌ Kein `durationMs` Feld (muss aus Payload extrahiert werden)

#### Health (`GET /api/health`)

```json
{
  "status": "ok",               // ok | degraded | error
  "adapters": {
    "github": true,             // fake mode → true
    "specKit": true,
    "openCode": true
  },
  "uptime": 1234,               // Sekunden seit Start
  "runs": 42,                   // Anzahl Runs in DB
  "mode": "fake"
}
```

**Bewertung:**
- ✅ Uptime, Adapter-Status, Modus
- ✅ Degradiert-Erkennung für Adapter
- ❌ **Kein DB Health Check** — nur Run-Count, keine DB-Konnektivität
- ❌ **Kein Redis Health Check** — BullMQ Queue Status nicht prüfbar
- ❌ **Kein Worker Health Check** — Worker-Lebendigkeit nicht prüfbar
- ❌ Keine Memory/CPU/Disk Metriken

#### Metrics (`GET /api/metrics`)

```json
{
  "metrics": {
    "runs": { "total": 42, "active": 3, "done": 30, "failed": 5, "blocked": 4 },
    "repositories": { "total": 2 },
    "phaseDistribution": [...],
    "recentFailures": [...],
    "avgRunDurationMs": 45231,
    "timestamp": "2026-06-01T09:00:00.000Z"
  }
}
```

**Bewertung:**
- ✅ Basis-Run-Metriken vorhanden
- ✅ Phasenverteilung
- ✅ Durchschnittliche Run-Dauer
- ❌ **Kein Prometheus-Format** — `/api/metrics` ist JSON, nicht `/metrics` im Prometheus-Format
- ❌ **Keine Histogramme** — keine p50/p95/p99 Latenzen
- ❌ **Keine GitHub API Metriken** — Requests, Fehler, Rate-Limits
- ❌ **Keine OpenCode Metriken** — Command-Dauer, Fehlerraten
- ❌ **Keine Counter-Metriken** (monoton steigend)
- ❌ Run-Dauer nur als Durchschnitt, nicht als Verteilung

#### Rate Limiting (`index.ts`)

```
IP-basierte sliding window: 100 requests / 60s / IP
SSE-Streams sind ausgenommen
```

**Bewertung:**
- ✅ Basis-Rate-Limiting vorhanden
- ❌ Keine Rate-Limit-Metriken (wie viele 429er?)
- ❌ Keine exponierte Statistik

---

## Phase 2 — Critical Runtime Flows

### Flow 1: GitHub Issue → Plan

| Schritt | Start | Ende | Kritischer Fehler | Messpunkt |
|---------|-------|------|-------------------|-----------|
| 1. Issue detect | Watcher poll | Run created | GitHub API down | Poll-Latenz |
| 2. Claim | QUEUED | CLAIMED | Run already claimed | Transition Dauer |
| 3. Repo Sync | REPO_SYNC | ISSUE_CONTEXT | Workspace access | Workspace Prep Dauer |
| 4. Research | ISSUE_CONTEXT | WEB_RESEARCH | Issue fetch failed | Research Doc Größe |
| 5. Specify | WEB_RESEARCH | SPECIFY | SpecKit unavailable | SpecKit CLI Dauer |
| 6. Plan | SPECIFY | PLAN | OpenCode error | OpenCode CLI Dauer |
| 7. Tasks | PLAN | TASKS | Missing artifacts | Task Count |
| 8. Analyze | TASKS | ANALYZE | Artifact scan | Scan Dauer |
| **Ende** | QUEUED | ANALYZE | — | **Total: ~30-120s** |

### Flow 2: Plan → Implement

| Schritt | Start | Ende | Kritischer Fehler | Messpunkt |
|---------|-------|------|-------------------|-----------|
| 9. Review | ANALYZE | REVIEW | Missing artifacts | Artifact Check |
| 10. Implement | REVIEW | IMPLEMENT | Policy block | OpenCode Dauer |
| **Ende** | ANALYZE | IMPLEMENT | — | **Total: ~60-300s** |

### Flow 3: Implement → Review → Merge → Done

| Schritt | Start | Ende | Kritischer Fehler | Messpunkt |
|---------|-------|------|-------------------|-----------|
| 11. Test | IMPLEMENT | TEST | No test commands | Test Dauer |
| 12. Verify | TEST | VERIFY | Test failure | Test Status |
| 13. Commit | VERIFY | COMMIT | No changes made | Commit Size |
| 14. PR Create | COMMIT | PR_CREATE | GitHub API error | PR Number |
| 15. Merge | PR_CREATE | MERGE | Kill-switch / conflict | Merge Dauer |
| 16. Done | MERGE | DONE | — | Run Total |
| **Ende** | IMPLEMENT | DONE | — | **Total: ~120-600s** |

### Flow 4: Failure → Retry

| Schritt | Start | Ende | Kritischer Fehler | Messpunkt |
|---------|-------|------|-------------------|-----------|
| 1. Detect | Any phase | FAILED_TRANSIENT | — | Failure Phase |
| 2. Backoff | — | — | Max retries (3) | Backoff ms |
| 3. Retry | FAILED_TRANSIENT | TEST | Retry fails again | Attempt Count |
| **Ende** | Any phase | TEST or FAILED | — | **Max 3 Attempts** |

### Flow 5: Failure → Cancel

| Schritt | Start | Ende | Kritischer Fehler | Messpunkt |
|---------|-------|------|-------------------|-----------|
| 1. Cancel request | API call | cancelled | DB race condition | Cancel Dauer |
| 2. Signal set | — | ABORT signal | Signal race | — |
| 3. Pipeline stop | executePhase | — | Already at terminal | Previous Phase |
| **Ende** | Any active | cancelled | — | **< 100ms** |

### Flow 6: Resume-by-State

| Schritt | Start | Ende | Kritischer Fehler | Messpunkt |
|---------|-------|------|-------------------|-----------|
| 1. Server restart | — | RESUME signal | Incomplete events | Resume Phase |
| 2. Phase skip | resumeFromEvents | Target phase | — | Skipped Phases |
| **Ende** | Any phase | Target phase | — | — |

---

## Phase 3 — Structured Logging Audit

### 3.1 Aktuelle Log-Korrelation

| Feld | Vorhanden | Mechanismus | Bewertung |
|------|:---------:|-------------|-----------|
| `runId` | ⚠️ | In storeEvent payload; **nicht** im Logger-Präfix | ✅ Für Events; ❌ Für Logs |
| `issueNumber` | ⚠️ | In RunState; **nicht** in Log-Zeilen | ❌ |
| `prNumber` | ❌ | Nach PR_CREATE Phase | ❌ Nur im Event-Payload |
| `branch` | ⚠️ | In RunState; **nicht** in Log-Zeilen | ❌ |
| `agent` | ❌ | Kein Agent-Name in Logs | ❌ |
| `phase` | ⚠️ | In storeEvent; **nicht** im Logger-Präfix | ⚠️ Teilweise |
| `durationMs` | ⚠️ | In OpenCode adapter; **nicht** generisch | ⚠️ Nur OpenCode |
| `traceId` | ❌ | Kein verteilter Trace-Kontext | ❌ |

### 3.2 Logging-Gaps (Fehlende Felder)

**Empfohlenes Log-Format (JSON):**

```json
{
  "timestamp": "2026-06-01T09:20:34.422Z",
  "level": "INFO",
  "component": "Server",
  "message": "Server listening on port 3000",
  "runId": null,
  "issueNumber": null,
  "phase": null,
  "durationMs": null,
  "gitHubRequestId": null
}
```

**Priorisierte Gaps:**

1. **`runId` im Logger** — Aktuell nur in `storeEvent`; `log.info('...')` hat keinen Run-Kontext. Log-Zeilen können keinem Run zugeordnet werden.
2. **`durationMs`** — Keine automatische Laufzeitmessung für Operationen außer OpenCode. 
3. **Structured Output** — Kein JSON-Format. Log-Aggregatoren (Loki, ELK) können nicht mit Text-Logs arbeiten.
4. **`traceId`** — Kein verteilter Tracing-Kontext zwischen Server → GitHub API → OpenCode CLI.

---

## Phase 4 — Metrics Design (Metrik-Katalog)

### 4.1 Workflow-Metriken

| Metrik-Name | Typ | Beschreibung | Labels |
|-------------|-----|-------------|--------|
| `positron_runs_total` | Counter | Total runs started | `repo`, `autonomy_level` |
| `positron_runs_active` | Gauge | Aktuell aktive Runs | — |
| `positron_run_duration_seconds` | Histogram | Run-Gesamtdauer (QUEUED→DONE) | `repo`, `status` |
| `positron_run_phase_duration_seconds` | Histogram | Dauer pro Phase | `phase`, `repo` |
| `positron_run_success_total` | Counter | Erfolgreiche Runs (status=done) | `repo` |
| `positron_run_failure_total` | Counter | Fehlgeschlagene Runs | `repo`, `failure_type` |
| `positron_run_retry_total` | Counter | Retry-Versuche | `repo`, `attempt` |
| `positron_run_cancellation_total` | Counter | Abgebrochene Runs | `repo`, `cancel_source` |
| `positron_runs_blocked` | Gauge | Aktuell blockierte Runs | `repo` |

### 4.2 GitHub-Metriken

| Metrik-Name | Typ | Beschreibung | Labels |
|-------------|-----|-------------|--------|
| `positron_github_api_requests_total` | Counter | GitHub API Requests | `endpoint`, `method`, `status` |
| `positron_github_api_errors_total` | Counter | GitHub API Fehler | `endpoint`, `error_type` |
| `positron_github_api_duration_seconds` | Histogram | GitHub API Latenz | `endpoint` |
| `positron_github_rate_limit_remaining` | Gauge | Rate-Limit verbleibend | `resource` |
| `positron_github_rate_limit_hits_total` | Counter | Rate-Limit Überschreitungen | — |
| `positron_github_sync_total` | Counter | GitHub Sync Operationen | `status` (synced/skipped/failed) |

### 4.3 OpenCode-Metriken

| Metrik-Name | Typ | Beschreibung | Labels |
|-------------|-----|-------------|--------|
| `positron_opencode_command_duration_seconds` | Histogram | OpenCode CLI Dauer | `phase`, `command` |
| `positron_opencode_command_total` | Counter | OpenCode CLI Aufrufe | `phase`, `status` |
| `positron_opencode_command_failures_total` | Counter | OpenCode CLI Fehler | `phase`, `error_type` |

### 4.4 Safety-Metriken

| Metrik-Name | Typ | Beschreibung | Labels |
|-------------|-----|-------------|--------|
| `positron_safety_merge_blocked_total` | Counter | Blockierte Merges | `reason` |
| `positron_safety_push_blocked_total` | Counter | Blockierte Pushes | — |
| `positron_safety_gate_revisions_total` | Counter | Gate-Revisionen (revise) | `phase` |
| `positron_safety_kill_switch_active` | Gauge | Kill-Switch Status (0/1) | — |
| `positron_safety_dry_run_total` | Counter | Dry-Run Entscheidungen | `decision` (WOULD_MERGE/WOULD_BLOCK) |

### 4.5 System-Metriken

| Metrik-Name | Typ | Beschreibung |
|-------------|-----|-------------|
| `positron_server_uptime_seconds` | Gauge | Server Uptime |
| `positron_db_size_bytes` | Gauge | SQLite DB Größe |
| `positron_db_runs_total` | Gauge | Runs in DB |
| `positron_db_events_total` | Gauge | Events in DB |
| `positron_sse_clients_total` | Gauge | Aktive SSE Clients |
| `positron_watcher_polls_total` | Counter | Watcher Polling-Durchläufe |
| `positron_watcher_runs_created_total` | Counter | Vom Watcher erstellte Runs |

---

## Phase 5 — Health Endpoints Audit

| Endpoint | Vorhanden? | Prüft | Bewertung |
|----------|:----------:|-------|-----------|
| `GET /api/health` | ✅ | Adapter-Status, Uptime, Run Count | Gut, aber kein DB/Redis Health |
| `GET /api/adapters/health` | ✅ | Detaillierte Adapter Health | Gut |
| `GET /api/metrics` | ✅ | Run-Metriken, Phasenverteilung | Gut, aber kein Prometheus-Format |
| `GET /api/admin/stats` | ✅ | DB-Statistiken (admin-only) | Gut |
| **DB Health** | ❌ | DB-Konnektivität, WAL-Status, Größe | **Fehlt** |
| **Redis Health** | ❌ | Redis-Konnektivität, Queue-Tiefe | **Fehlt** |
| **Worker Health** | ❌ | Worker-Lebendigkeit | **Fehlt** |
| **GitHub Rate-Limit** | ❌ | Aktuelles Rate-Limit | **Fehlt** |

### Empfohlene Health-Endpoint-Erweiterung

```json
{
  "status": "ok",
  "uptime": 1234,
  "checks": {
    "database": { "status": "ok", "sizeMb": 5.2, "runs": 42 },
    "redis": { "status": "ok", "connected": true },
    "github": { "status": "ok", "rateLimitRemaining": 4990 },
    "opencode": { "status": "ok", "version": "v1.2.3" },
    "speckit": { "status": "ok", "version": "v2.1.0" },
    "watcher": { "status": "running", "lastPoll": "2026-06-01T09:00:00Z" }
  }
}
```

---

## Phase 6 — Minimal Runtime Dashboard (Design)

### 6.1 Prometheus Export

```yaml
# Basis Prometheus-Konfiguration
scrape_configs:
  - job_name: 'positron'
    scrape_interval: 15s
    static_configs:
      - targets: ['localhost:3000']
    metrics_path: '/metrics'          # NEU: Prometheus-Format-Endpoint
```

**Implementierung:** `express-prometheus-middleware` oder manueller `/metrics` Endpoint mit `prom-client`.

### 6.2 Grafana Dashboard — Run Health

```
┌────────────────────────────────────────────────────┐
│  POSITRON — Run Health                    [Last 24h]│
├────────────────────┬───────────────────────────────┤
│                    │                               │
│  ▼ Active Runs: 3  │  Run Duration (p50/p95/p99)   │
│  ✅ Done: 30       │  ████░░░░  p50: 45s           │
│  ❌ Failed: 5      │  ██████░░  p95: 180s          │
│  🚫 Blocked: 4     │  ████████  p99: 300s          │
│  ⏹ Cancelled: 2    │                               │
│                    │                               │
├────────────────────┴───────────────────────────────┤
│  Run Status Timeline (Last 50 runs)                │
│  ▓▓▓▓░░▓▓░░▓░░▓▓▓▓▓▓▓▓▓▓░░░░▓▓░░▓▓▓               │
│   ▓=done ░=failed ░=blocked                        │
├────────────────────────────────────────────────────┤
│  Phase Distribution (Active Runs)                  │
│  IMPLEMENT ████████░░ 3                             │
│  TEST      ████░░░░░░ 1                             │
│  REVIEW    ████░░░░░░ 1                             │
└────────────────────────────────────────────────────┘
```

### 6.3 Grafana Dashboard — Agent Throughput

```
┌────────────────────────────────────────────────────┐
│  POSITRON — Agent Throughput              [Last 7d] │
├────────────────────┬───────────────────────────────┤
│                    │                               │
│  Runs/Hour         │  OpenCode Command Latency      │
│  ▂▃▅▃▂▄▆▃▂         │  specify ████░░ 12s (avg)      │
│                    │  plan     ███░░░ 8s            │
│                    │  tasks    ████░░ 15s           │
│                    │  implement ██████ 90s          │
│                    │                               │
├────────────────────┴───────────────────────────────┤
│  GitHub API Call Volume (Last 24h)                 │
│  GET /repos/.../issues      ████████ 120           │
│  POST /repos/.../comments   ██████░░ 45            │
│  GET /rate_limit            ██░░░░░░ 12            │
│  Rate Limit Remaining: ████████░░ 4890/5000        │
└────────────────────────────────────────────────────┘
```

### 6.4 Grafana Dashboard — Failure Analysis

```
┌────────────────────────────────────────────────────┐
│  POSITRON — Failure Analysis              [Last 7d] │
├────────────────────┬───────────────────────────────┤
│                    │                               │
│  Failure Rate      │  Top Failure Reasons           │
│  ████░░ 12.5%      │  1. Repo sync failed (35%)    │
│                    │  2. OpenCode CLI error (25%)   │
│                    │  3. No changes made (20%)      │
│                    │  4. PR creation failed (15%)   │
│                    │  5. Test failure (5%)          │
│                    │                               │
├────────────────────┴───────────────────────────────┤
│  Retry Rate                                       │
│  ██░░░░ 8% aller Runs haben ≥1 Retry               │
│  █░░░░░ 2% aller Runs haben ≥2 Retries             │
├────────────────────────────────────────────────────┤
│  Safety Gate Status                                │
│  Kill-Switch: 🟢 Inactive                           │
│  Merge Dry-Run: 🟡 Active                           │
│  Push Enabled: 🔴 Disabled                          │
└────────────────────────────────────────────────────┘
```

---

## Phase 7 — Continuous Verification Design

### 7.1 Anomalie-Erkennung

| Anomalie-Typ | Messung | Baseline | Alert-Regel |
|-------------|---------|----------|------------|
| **Erhöhte Fehlerrate** | `rate(positron_run_failure_total[1h])` | < 10% aller Runs | > 20% für 15min |
| **Erhöhte Retry-Rate** | `rate(positron_run_retry_total[1h])` | < 1 Retry/Run | > 2 Retries/Run avg |
| **Ungewöhnliche Laufzeit** | `histogram_quantile(0.95, positron_run_duration_seconds)` | p95 < 300s | p95 > 600s für 30min |
| **Hohe Abbruchrate** | `rate(positron_run_cancellation_total[1h])` | < 5% | > 15% für 30min |
| **GitHub Rate-Limit** | `positron_github_rate_limit_remaining` | > 4000 | < 500 für 5min |
| **OpenCode Fehler** | `rate(positron_opencode_command_failures_total[15m])` | < 10% | > 30% für 10min |
| **Keine aktiven Runs** | `positron_runs_active` | > 0 | == 0 für 30min (Watcher down?) |

### 7.2 Eskalationspfade

```
Level 0 — Dashboard (Info)
  └─ Metrik sichtbar im Grafana Dashboard — keine Aktion

Level 1 — Warning (Grafana Alert → Slack/Teams Webhook)
  └─ Grenzwert überschritten für < 15min
  └─ Kein On-Call — nächster Arbeitstag

Level 2 — Critical (Grafana Alert → PagerDuty/OpsGenie)
  └─ Grenzwert überschritten für > 15min ODER
  └─ Kill-Switch aktiviert ODER
  └─ Server/GitHub nicht erreichbar
  └─ On-Call Engineer wird alarmiert

Level 3 — Emergency (Automatische Aktion)
  └─ Kill-Switch wird automatisch aktiviert bei:
    - GitHub Rate-Limit < 100 requests
    - 5 aufeinanderfolgende FAILED_BLOCKED Runs
    - Datenbank-Korruption erkannt
```

### 7.3 CV-Integration in CI/CD

```yaml
# quality-gates.yml — Future CV Gate
continuous-verification:
  name: '📈 CV Check'
  runs-on: ubuntu-latest
  needs: [test, contracts, mutation-fast]
  steps:
    - name: Check Production Metrics
      run: |
        # Prüft ob Fehlerrate seit Deploy gestiegen ist
        curl -s https://positron.example.com/metrics | \
          promtool check rules cv-alerts.yml
    - name: Compare Against Baseline
      run: |
        # Vergleicht aktuelle Metriken mit Baseline (7d avg)
        npx positron-cv compare --baseline=7d --max-deviation=2.0
```

---

## Phase 8 — Runtime Testability Assessment

### 8.1 Können Runtime-Metriken automatisiert getestet werden?

| Fähigkeit | Status | Mechanismus |
|-----------|:------:|-------------|
| Metrik-Endpoint erreichbar | ✅ | `GET /api/metrics` → 200 |
| Metrik-Werte plausibel | ✅ | `runs.total >= runs.done + runs.failed` |
| Prometheus-Format valide | ❌ | Noch kein Prometheus-Endpoint |
| Counter-Metriken monoton | ❌ | Noch keine Counter-Metriken |
| Histogram-Buckets vorhanden | ❌ | Noch keine Histogramme |

**Empfehlung:** Contract-Test für `/metrics` Endpoint (Prometheus-Format-Validierung).

### 8.2 Können Health-Checks automatisiert getestet werden?

| Fähigkeit | Status | Mechanismus |
|-----------|:------:|-------------|
| Health-Endpoint erreichbar | ✅ | `GET /api/health` → 200 |
| DB Health prüfbar | ❌ | Kein DB Health Check |
| Adapter Health prüfbar | ⚠️ | Fake-Mode: überspringt echte Checks |
| Health in Fake-Mode | ✅ | `mode=fake` → `status=ok` |

**Empfehlung:** DB Health Check hinzufügen (einfaches `SELECT 1`).

### 8.3 Können Regressionen automatisch erkannt werden?

| Fähigkeit | Status |
|-----------|:------:|
| Metrik-Baseline existiert | ❌ (noch keine Produktionsdaten) |
| Abweichung automatisch erkennbar | ❌ (benötigt Prometheus + Grafana) |
| CI-Integration | ❌ (nicht implementiert) |

**Empfehlung:** Sobald Prometheus-Metriken in Produktion laufen (≥ 7 Tage), Baseline definieren und CV-Gate in CI integrieren.

---

## Verbleibende Risiken

1. **Blindflug in Produktion** — Ohne Prometheus/Grafana keine Sichtbarkeit auf Produktionsverhalten. Aktuell nur manuelle Inspektion.
2. **Keine GitHub API Transparenz** — Rate-Limits und API-Fehler sind unsichtbar. Ein Rate-Limit könnte einen ganzen Run-Batch killen.
3. **Keine Latenz-Analyse** — Bottlenecks (langsame OpenCode-Phasen, langsame GitHub API) sind nicht identifizierbar.
4. **Keine automatische Alarmierung** — Fehler werden erst bei manueller Dashboard-Sichtung bemerkt.
5. **Logger nicht maschinenlesbar** — Log-Aggregation (ELK, Loki) erfordert manuelles Parsing.

---

## Empfehlung für QA-010

**QA-010 — Prometheus Metrics Export & GitHub API Telemetry**

Priorisierte Tasks:

1. **Prometheus `/metrics` Endpoint**
   - `prom-client` Bibliothek hinzufügen
   - 15+ Counter/Gauge/Histogram Metriken registrieren
   - Existierende `/api/metrics` nicht ersetzen (parallel betreiben)

2. **GitHub API Telemetry**
   - `GitHubStatusSyncService` um Counter-Metriken erweitern
   - Rate-Limit Monitoring (Header `X-RateLimit-Remaining`)
   - API-Latenz-Histogramme

3. **Structured JSON Logging (optional)**
   - `pino` oder `winston` als Logger-Ersatz evaluieren
   - `runId` automatisch in Log-Kontext injizieren

4. **Grafana Dashboard Provisioning**
   - 3 Dashboards als JSON-Modelle im Repo (`dashboards/`)
   - Docker Compose mit Prometheus + Grafana für lokale Entwicklung

---

## Validierung

```bash
npm run build            # ✅ TypeScript Build
npm run typecheck        # ✅ tsc -b --dry
npm test                 # ✅ 284 Tests (224 server + 60 web)
npm run test:contracts   # ✅ 52 Contract Tests
npm run test:mutation:fast  # ✅ Score 76.39% > break 70
```

---

*Audit erstellt am 2026-06-01 durch QA-009 Runtime Verification Agent.*
*Keine Produktionscode-Änderungen. Reine Analyse und Design.*
