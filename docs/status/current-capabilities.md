# Positron — Current Capabilities

**Date:** 2026-06-17
**Scope:** Documented capabilities of the Positron system as of Issue #229 MVP Finalization

---

## Core Pipeline

| Capability | Details |
|------------|---------|
| **28-Phase Run State Machine** | QUEUED → CLAIMED → SPECIFY → PLAN → TASKS → IMPLEMENT → REVIEW → MERGE → DONE → CLEANUP. ~17 execution phases in a happy-path run. |
| **Real-Time SSE Dashboard** | Live run updates via Server-Sent Events, run queue management, attention metrics, system health indicators. |
| **Evidence Explorer** | Browse artifacts, test results, screenshots, and logs from every pipeline phase. Write-back support for evidence redaction. |
| **GitHub Integration (Fake/Real Modes)** | Issue, PR, label, and merge operations. Fake mode for testing, Real mode for actual GitHub access. |
| **SpecKit Integration** | Spec → Plan → Tasks → Implement workflow via Spec Kit CLI adapter. |
| **OpenCode Integration** | Code generation via OpenCode CLI adapter. |
| **SQLite Persistence** | Runs, events, artifacts persisted to SQLite (better-sqlite3). |
| **Redis + BullMQ Worker Queue** | Production pipeline execution via BullMQ worker with inline fallback. |

---

## Infrastructure Gates & Providers Dashboard

| Capability | Details |
|------------|---------|
| **8 Infrastructure Gates** | `provider_detection`, `model_profile`, `model_warmup`, `speckit_sync`, `mcp_warmup`, `tool_gateway`, `human_approval`, `security` |
| **Providers Page** | `/providers` route with ProviderStatusPanel, ModelProfilePanel, SpecKitStatusPanel, McpWarmupStatusPanel, InfrastructureGateTable, SafetyNotice |
| **Provider Detection Store** | OpenCode binary detection evidence (version, path, runtime status) — read-only |
| **Model Profile Store** | 6 model profile constants with validation, WarmupLevel (0-4), `validateModelProfile()` |
| **SpecKit Sync Store** | Install source validation, 10 re-sync triggers, mode selection (github/spec-kit only) |
| **MCP Warm-up Evidence Store** | 9-phase warm-up protocol, McpCapabilityManifest, REQUIRED_MCP_SERVERS (12 servers) |
| **Infrastructure Gate Aggregation** | Read-only gate evaluation from stores with overall/pass/partial/fail status |
| **Blueprint Handoff** | Gated pipeline handoff evaluating all infrastructure gates before any execution |

---

## Oversight & Safety

| Capability | Details |
|------------|---------|
| **Oversight UI** | `/oversight` route with human question queue, approval decisions (ALLOW/DENY/ASK_MORE/REQUIRE_REVIEW) |
| **Question Queue API** | GET/POST endpoints for oversight questions, pause-run, abort-run |
| **Timeout Safety** | `processTimeout()` NEVER returns ALLOW — only DENY or PAUSE |
| **Critical Risk Default** | Critical risk questions default to DENY/ASK_HUMAN |
| **Secret Redaction** | API keys, GITHUB_TOKEN masked in logs and evidence |
| **Rate Limiting** | 100 requests/minute per IP |
| **Audit Trail** | Every agent decision logged with timestamps + evidence hashes |

---

## Blueprint Launcher

| Capability | Details |
|------------|---------|
| **Blueprint Validation** | `POST /api/blueprints/validate` — validates blueprint structure, secrets detection, auto-merge checks |
| **Blueprint Import** | `POST /api/blueprints/import` — imports a validated blueprint |
| **Run Plan Creation** | `POST /api/blueprints/:id/create-run-plan` — creates an execution plan from a blueprint |
| **Gated Start-Run** | `POST /api/blueprints/:id/start-run` — evaluates all gates, produces a pipeline handoff (does NOT execute) |
| **Handoff Retrieval** | `GET /api/blueprints/:id/handoff` — retrieve latest pipeline handoff with gate status |

---

## Tool Gateway (Monitoring-Only)

| Capability | Details |
|------------|---------|
| **Tool Gateway Status** | `GET /api/tool-gateway/status` — returns gateway status, MCP servers, provider status |
| **Tool Listing** | `GET /api/tool-gateway/tools` — returns tool definitions with category, mcpServerName, warmupStatus |
| **12 Tool Categories** | ToolDefinition extended with category/mcpServerName/warmupStatus |
| **Sealed/No Execution** | No execute buttons in UI, no POST execute endpoint — monitoring only |

---

## Infrastructure State API

| Capability | Details |
|------------|---------|
| **GET /api/infrastructure-gates/status** | Read-only gate evaluation aggregation from all stores |
| **GET /api/infrastructure-state/status** | Read-only infrastructure state status with runtime indicator |
| **POST /api/infrastructure-state/provider-detection** | Upsert provider detection evidence (DISABLED by default) |
| **POST /api/infrastructure-state/model-profile** | Upsert model profile (DISABLED by default) |
| **POST /api/infrastructure-state/speckit-sync** | Upsert Spec Kit sync state (DISABLED by default) |
| **POST /api/infrastructure-state/mcp-warmup-evidence** | Upsert MCP warm-up evidence (DISABLED by default) |
| **SQLite or In-Memory Stores** | Configurable via `POSITRON_INFRASTRUCTURE_STORE` env var |
| **Validation + Redaction** | All store values validated and redacted before storage |

---

## Test Coverage

| Test Suite | Count | Status |
|------------|-------|--------|
| Contract Tests | 140/140 | ✅ PASS |
| Unit/Integration Tests | 2108/2111 | ✅ PASS (3 pre-existing failures: Windows-specific + timeout) |
| TypeScript Build | — | ✅ PASS |
| Typecheck | — | ✅ PASS |
| Safety Coverage | 100% | ✅ PASS |
| Secret Scan | — | ✅ PASS |

---

## Frontend Routes

| Route | Page | Status |
|-------|------|--------|
| `/` | DashboardPage | ✅ Complete |
| `/runs` | RunsPage | ✅ Complete |
| `/runs/:id` | RunDetail | ✅ Complete |
| `/evidence` | EvidencePage | ✅ Complete |
| `/repos` | Repositories | ✅ Complete |
| `/settings` | SettingsPage | ✅ Complete |
| `/admin` | AdminPage | ✅ Complete |
| `/providers` | ProvidersPage | ✅ Complete |
| `/oversight` | OversightPage | ✅ Complete |
| `/blueprints` | BlueprintLauncherPage | ✅ Complete |

---

*This document is part of the Issue #229 MVP Finalization effort. See `known-limitations.md` for what Positron CANNOT do yet.*
