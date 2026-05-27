# Functional Data Audit — Issue #65

## Goal

Document all available data sources for the Positron UI after Issue #55 (UI/UX Quality Pass) and verify which data flows are real vs. derived vs. mocked.

## Data Sources

### Backend API (apps/server/src/index.ts)

| Endpoint | Method | Purpose | Status |
|----------|--------|---------|--------|
| `GET /api/health` | GET | System health check | ✅ Real |
| `GET /api/metrics` | GET | Run metrics (active/completed/failed/total) | ✅ Real |
| `GET /api/runs` | GET | List runs with filtering | ✅ Real |
| `GET /api/runs/:id` | GET | Single run detail | ✅ Real |
| `GET /api/runs/:id/events` | GET | Run events | ✅ Real |
| `GET /api/runs/:id/events/stream` | GET | SSE event stream | ✅ Real |
| `POST /api/runs` | POST | Create new run | ✅ Real |
| `POST /api/runs/:id/control` | POST | Pause/abort/resume/retry | ✅ Real |
| `POST /api/runs/:id/cancel` | POST | Cancel run | ✅ Real |
| `GET /api/evidence` | GET | Evidence aggregation | ✅ Real |
| `GET /api/settings/mcp` | GET | Masked MCP configuration | ✅ Real |
| `GET /api/settings/test-modes` | GET | Test modes from package.json | ✅ Real |
| `GET /api/safety` | GET | Safety gate status | ✅ Real |
| `POST /api/demo/live-run` | POST | Create demo run | ⚠️ Stub (#66) |
| `POST /api/evidence` | POST | Save evidence | 🔜 Planned |

### Frontend API Client (apps/web/src/api.ts)

| Method | Backend Endpoint | Status |
|--------|-----------------|--------|
| `api.getHealth()` | `GET /api/health` | ✅ Connected |
| `api.getMetrics()` | `GET /api/metrics` | ✅ Connected |
| `api.getRuns(filter)` | `GET /api/runs` | ✅ Connected |
| `api.getRun(id)` | `GET /api/runs/:id` | ✅ Connected |
| `api.getRunEvents(id)` | `GET /api/runs/:id/events` | ✅ Connected |
| `api.createRun(data)` | `POST /api/runs` | ✅ Connected |
| `api.controlRun(id, action)` | `POST /api/runs/:id/control` | ✅ Connected |
| `api.cancelRun(id)` | `POST /api/runs/:id/cancel` | ✅ Connected |
| `api.getEvidence(runId?)` | `GET /api/evidence` | ✅ Connected |
| `api.getMcpSettings()` | `GET /api/settings/mcp` | ✅ Connected |
| `api.getTestModes()` | `GET /api/settings/test-modes` | ✅ Connected |
| `api.getSafety()` | `GET /api/safety` | ✅ Connected |

## UI Component Data Flow

### DashboardPage
| Card/Component | Data Source | Real/Mock | Notes |
|---------------|-------------|-----------|-------|
| StatusSummary | `api.getMetrics()` | ✅ Real | Active/Completed/Failed/Total |
| EvidenceSummary | `api.getEvidence()` | ✅ Real | Uses summary mode |
| AttentionQueue | `api.getRuns()` | ✅ Real | Filters active/blocked |
| RecentActivity | `api.getRuns()` | ✅ Real | Sorted by date, top 5 |
| BlueprintPanel | None | ✅ Static | Demo blueprint UI |
| SystemHealth | `api.getHealth()` | ✅ Real | Server/API/Database status |
| NewRunModal | `api.createRun()` | ✅ Real | Creates run from issue URL |

### EvidencePage
| Section | Data Source | Status |
|---------|-------------|--------|
| Summary cards | `api.getEvidence()` (aggregated) | ✅ Real |
| Evidence table | `api.getEvidence()` (detail) | ✅ Real |
| Filters | Client-side filtering | ✅ Real |

### RunsPage
| Section | Data Source | Status |
|---------|-------------|--------|
| Run list | `api.getRuns()` | ✅ Real |
| Status summary | Derived from runs | ✅ Real |
| Search/filter | Client-side | ✅ Real |

### SettingsPage
| Section | Data Source | Status |
|---------|-------------|--------|
| Safety Gates | `api.getSafety()` | ✅ Real |
| MCP Servers | `api.getMcpSettings()` | ✅ Real |
| Test Modes | `api.getTestModes()` | ✅ Real |

### RunDetail
| Section | Data Source | Status |
|---------|-------------|--------|
| Run info | `api.getRun(id)` | ✅ Real |
| Events | `api.getRunEvents(id)` | ✅ Real |
| SSE stream | `GET /api/runs/:id/events/stream` | ✅ Real |
| Cancel | `api.cancelRun(id)` | ✅ Real |

## Remaining Mock/Stub Areas

| Area | Current | Target |
|------|---------|--------|
| SSE live evidence updates | RunDetail events poll/SSE | Full SSE (#66) |
| Dashboard SSE polling | 5s interval | SSE push (#66) |
| Demo live-run endpoint | Stub (#66 dependency) | Full implementation (#66) |
| Admin/bulk actions | Not available | Future |
| Evidence write-back | Not available | Future |

## Data Volume Estimates

| Metric | Estimate |
|--------|----------|
| Runs per repo per day | 5-50 |
| Events per run | 10-500 |
| Evidence artifacts per run | 3-20 |
| Concurrent SSE clients | 1-10 |
| API response time (p95) | < 200ms |
