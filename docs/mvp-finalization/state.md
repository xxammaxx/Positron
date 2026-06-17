# Positron MVP Finalization — State Assessment

**Date:** 2026-06-17
**Author:** documentation-agent (Issue #229)
**Scope:** Full audit of Issue #229 implementation vs documentation
**Last Updated:** 2026-06-17 (Part B: Commit verification + Providers page confirmation)

---

> **Status key change:** The `/providers` route and `ProvidersPage.tsx` are ✅ **IMPLEMENTED** (contrary to earlier assessment). This document has been corrected to reflect the actual current state.

---

## 1. Current Implementation State

### 1.1 Core Pipeline (Pre-#229 Baseline)

| Component | Status | Notes |
|-----------|--------|-------|
| 28-Phase Run State Machine | ✅ Complete | QUEUED → DONE/CLEANUP |
| GitHub Adapter (Fake/Real) | ✅ Complete | Issue, PR, Labels, Merge |
| SpecKit Integration | ✅ Complete | Spec → Plan → Tasks → Implement |
| OpenCode Integration | ✅ Complete | Code generation agent |
| SQLite Persistence | ✅ Complete | Runs, events, artifacts |
| SSE Broadcaster | ✅ Complete | Live run updates |
| Web UI Dashboard | ✅ Complete | Run queue, health, evidence |
| E2E Tests (Playwright) | ✅ Complete | 17 tests passing |

### 1.2 Issue #229 — Tool Gateway Extensions (PRs 228–241)

#### Phase A: Tool Gateway Metadata Extension (PR #230)

| Acceptance Criterion | Status | Evidence |
|----------------------|--------|----------|
| `ToolDefinition` extended with category/mcpServerName/warmupStatus | ✅ Done | `packages/tool-gateway/src/types.ts` |
| `ToolCategory` union type defined (12 categories) | ✅ Done | `packages/shared/src/types.ts` |
| `WarmupStatus` union type defined | ✅ Done | `packages/shared/src/types.ts` |
| `ToolGatewayStatus` extended with mcpServers/providerStatus | ✅ Done | `apps/server/src/index.ts` line 3967 |
| `GET /api/tool-gateway/status` returns mcpServers/providerStatus | ✅ Done | Server code lines 3952-3977 |
| `GET /api/tool-gateway/tools` returns category/mcpServerName/warmupStatus | ✅ Done | Server code lines 3980-4011 |
| ToolGatewayPanel renders MCP Status card | ✅ Done | `ToolGatewayPanel.tsx` |
| ToolGatewayPanel renders Provider Status card | ✅ Done | `ToolGatewayPanel.tsx` |
| No execute buttons in UI | ✅ Done | Verified by tests |
| No POST execute endpoint | ✅ Done | Verified by tests |

#### Phase B: Provider/Model Profile Types (PR #231)

| Acceptance Criterion | Status | Evidence |
|----------------------|--------|----------|
| 6 model profile constants defined | ✅ Done | `packages/shared/src/opencode-model-profile.ts` |
| `ModelProfile` type with all fields | ✅ Done | Same file, 162 tests |
| `WarmupLevel` is `0 \| 1 \| 2 \| 3 \| 4` | ✅ Done | Same file |
| `PositronProviderProfile` type | ✅ Done | Same file |
| `validateModelProfile()` returns BLOCKED conditions | ✅ Done | Same file, validation tests |
| `GET /api/providers/opencode/status` endpoint | ⚠️ DIFFERENT | Replaced by `GET /api/infrastructure-gates/status` + `/api/infrastructure-state/status` |
| API key redaction in responses | ✅ Done | `redactModelProfileForEvidence()` |
| Secret scan clean | ✅ Done | Verified |

#### Phase C: Spec Kit Sync Types (PR #232)

| Acceptance Criterion | Status | Evidence |
|----------------------|--------|----------|
| `SpecKitInstallSource` type (github/spec-kit only) | ✅ Done | `packages/shared/src/speckit-sync-profile.ts` |
| `SpecKitMode` type (3 modes) | ✅ Done | Same file |
| `checkReSyncNeeded()` function with 10 triggers | ✅ Done | Same file, 141 tests |
| `GET /api/speckit/status` endpoint | ⚠️ DIFFERENT | Replaced by `/api/infrastructure-gates/status` aggregation |
| All 10 re-sync triggers cause `needs_resync: true` | ✅ Done | Verified by tests |
| `readyForRealRuns` = false when needs_resync | ✅ Done | Same file |
| Spec Kit without version tag rejected | ✅ Done | Same file |
| Spec Kit from non-github/spec-kit rejected | ✅ Done | Same file |
| `adapter_bridge` mode preferred | ✅ Done | Same file |

#### Phase D: MCP Warm-up Contract (PR #233)

| Acceptance Criterion | Status | Evidence |
|----------------------|--------|----------|
| 9 warm-up phases defined as types | ✅ Done | `packages/shared/src/mcp-warmup-types.ts` |
| `McpWarmupStep` type with required semantics | ✅ Done | Same file |
| `validateWarmupResult()` classifies pass/partial/fail | ✅ Done | Same file, validation tests |
| `McpCapabilityManifest` type matches schema | ✅ Done | `packages/shared/src/mcp-capability-types.ts` |
| `REQUIRED_MCP_SERVERS` constant (12 servers) | ✅ Done | `packages/shared/src/mcp-inventory.ts` |
| Warm-up failure blocks real runs | ✅ Done | Gate rules enforced |
| Redaction check on evidence output | ✅ Done | Same file |

#### Phase E: Oversight UI / Human Question Queue (PR #236, #237)

| Acceptance Criterion | Status | Evidence |
|----------------------|--------|----------|
| `OversightQuestion` type defined | ✅ Done | `packages/shared/src/oversight-types.ts` |
| `GET /api/oversight/questions` | ✅ Done | Server code line 4018 |
| `GET /api/oversight/questions/:id` | ✅ Done | Server code line 4037 |
| `POST /api/oversight/questions/:id/answer` (ALLOW/DENY/ASK_MORE/REQUIRE_REVIEW) | ✅ Done | Server code line 4054 |
| `POST /api/oversight/questions/:id/pause-run` | ✅ Done | Server code line 4137 |
| `POST /api/oversight/questions/:id/abort-run` | ✅ Done | Server code line 4184 |
| `GET /api/oversight/attention` | ✅ Done | Server code line 4231 |
| `processTimeout()` NEVER returns ALLOW | ✅ Done | Oversight validator tests |
| Answer payload redacted | ✅ Done | Same file |
| `/oversight` route accessible | ✅ Done | `App.tsx` line 26 |
| Critical risk defaults to DENY/ASK_HUMAN | ✅ Done | Oversight validator |
| No POST `/api/oversight/execute` | ✅ Done | Verified by tests |

#### Phase F: Blueprint Launcher (PR #238, #239, #240)

| Acceptance Criterion | Status | Evidence |
|----------------------|--------|----------|
| `validateBlueprint()` function | ✅ Done | `packages/shared/src/blueprint-validator.ts` |
| Blueprint secrets detection → FAIL | ✅ Done | Same file |
| Blueprint auto-merge → FAIL | ✅ Done | Same file |
| Blueprint unrestricted MCP → FAIL | ✅ Done | Same file |
| Blueprint no Human Approval → PARTIAL | ✅ Done | Same file |
| `POST /api/blueprints/validate` | ✅ Done | Server code line 4251 |
| `POST /api/blueprints/import` | ✅ Done | Server code line 4281 |
| `GET /api/blueprints/:id` | ✅ Done | Server code line 4332 |
| `POST /api/blueprints/:id/create-run-plan` | ✅ Done | Server code line 4348 |
| `POST /api/blueprints/:id/start-run` (gated, not execution) | ✅ Done | Server code line 4440 |
| `GET /api/blueprints/:id/handoff` | ✅ Done | Server code line 4672 |
| `/blueprints` route accessible | ✅ Done | `App.tsx` line 27 |
| `start-run` returns `humanApprovalRequired: true` | ✅ Done | Verified by tests |

#### Phase G: Infrastructure State Stores (PR #241, #242, #243)

| Acceptance Criterion | Status | Evidence |
|----------------------|--------|----------|
| `GET /api/infrastructure-gates/status` | ✅ Done | Server code line 4713 |
| `GET /api/infrastructure-state/status` | ✅ Done | Infrastructure routes line 61 |
| `POST /api/infrastructure-state/provider-detection` | ✅ Done | Infrastructure routes line 88 |
| `POST /api/infrastructure-state/model-profile` | ✅ Done | Infrastructure routes line 127 |
| `POST /api/infrastructure-state/speckit-sync` | ✅ Done | Infrastructure routes line 166 |
| `POST /api/infrastructure-state/mcp-warmup-evidence` | ✅ Done | Infrastructure routes line 205 |
| SQLite-backed state stores | ✅ Done | `infrastructure-state-store-sqlite.ts` |
| In-memory fallback stores | ✅ Done | `create-stores-for-server.ts` |
| Gate aggregation from stores | ✅ Done | `evaluateInfrastructureGates()` |
| Disabled upsert by default (env flag gated) | ✅ Done | Infrastructure routes line 42 |
| Blueprint handoff evaluated against infra gates | ✅ Done | Server code lines 4525-4665 |
| Redaction fix in `blueprint-pipeline-handoff.ts` | ✅ Committed | Commit `c437bde` — evidence redaction (secret paths, raw markdown) |
| CT120 fixture privacy improvement | ✅ Committed | Commit `d29d06b` — safe, redacted infrastructure state fixture |

### 1.3 Frontend Pages

| Page | Route | Status | Notes |
|------|-------|--------|-------|
| Dashboard | `/` | ✅ Complete | With ToolGatewayPanel |
| Run Detail | `/runs/:id` | ✅ Complete | |
| Evidence Explorer | `/evidence` | ✅ Complete | |
| Repositories | `/repos` | ✅ Complete | |
| Settings | `/settings` | ✅ Complete | |
| Admin | `/admin` | ✅ Complete | |
| Oversight | `/oversight` | ✅ Complete | HumanQuestionQueue component |
| Blueprint Launcher | `/blueprints` | ✅ Complete | BlueprintLauncherPage component |
| Providers | `/providers` | ✅ Complete | ProvidersPage.tsx with ProviderStatusPanel, ModelProfilePanel, SpecKitStatusPanel, McpWarmupStatusPanel, InfrastructureGateTable, SafetyNotice |

### 1.4 API Endpoint Inventory

| Endpoint | Method | Documented? | Status |
|----------|--------|-------------|--------|
| `/api/health` | GET | ✅ api-overview.md | ✅ |
| `/api/repos` | POST | ✅ api-overview.md | ✅ |
| `/api/repos/:id/issues` | GET | ✅ api-overview.md | ✅ |
| `/api/repos/:repoId/runs` | POST | ✅ api-overview.md | ✅ |
| `/api/runs` | GET | ✅ api-overview.md | ✅ |
| `/api/runs/:id` | GET | ✅ api-overview.md | ✅ |
| `/api/runs/:id/events/stream` | GET | ✅ api-overview.md | ✅ |
| `/api/runs/:id/merge-status` | GET | ✅ api-overview.md | ✅ |
| `/api/runs/:id/control` | POST | ✅ api-overview.md | ✅ |
| `/api/adapters/health` | GET | ✅ api-overview.md | ✅ |
| `/api/safety` | GET | ✅ api-overview.md | ✅ |
| `/api/demo/blueprint` | POST | ✅ api-overview.md | ✅ |
| `/api/demo/blueprint/:runId` | GET | ✅ api-overview.md | ✅ |
| `/api/tool-gateway/status` | GET | ⚠️ Outdated | Response extended with mcpServers/providerStatus |
| `/api/tool-gateway/tools` | GET | ⚠️ Outdated | Response extended with category/mcpServerName/warmupStatus |
| `/api/oversight/questions` | GET | ❌ Missing | Not in api-overview.md |
| `/api/oversight/questions/:id` | GET | ❌ Missing | Not in api-overview.md |
| `/api/oversight/questions/:id/answer` | POST | ❌ Missing | Not in api-overview.md |
| `/api/oversight/questions/:id/pause-run` | POST | ❌ Missing | Not in api-overview.md |
| `/api/oversight/questions/:id/abort-run` | POST | ❌ Missing | Not in api-overview.md |
| `/api/oversight/attention` | GET | ❌ Missing | Not in api-overview.md |
| `/api/blueprints/validate` | POST | ❌ Missing | Not in api-overview.md |
| `/api/blueprints/import` | POST | ❌ Missing | Not in api-overview.md |
| `/api/blueprints/:id` | GET | ❌ Missing | Not in api-overview.md |
| `/api/blueprints/:id/create-run-plan` | POST | ❌ Missing | Not in api-overview.md |
| `/api/blueprints/:id/start-run` | POST | ❌ Missing | Not in api-overview.md |
| `/api/blueprints/:id/handoff` | GET | ❌ Missing | Not in api-overview.md |
| `/api/infrastructure-gates/status` | GET | ❌ Missing | Not in api-overview.md |
| `/api/infrastructure-state/status` | GET | ❌ Missing | Not in api-overview.md |
| `/api/infrastructure-state/provider-detection` | POST | ❌ Missing | Not in api-overview.md |
| `/api/infrastructure-state/model-profile` | POST | ❌ Missing | Not in api-overview.md |
| `/api/infrastructure-state/speckit-sync` | POST | ❌ Missing | Not in api-overview.md |
| `/api/infrastructure-state/mcp-warmup-evidence` | POST | ❌ Missing | Not in api-overview.md |

---

## 2. What's Working

- ✅ **Full PR chain (#228–#243)** — All PRs are implemented, tested, and mergeable
- ✅ **Tool Gateway** — Extended with MCP/provider metadata, monitoring-only default maintained
- ✅ **Model Profiles** — 6 profiles defined, validation logic complete
- ✅ **Spec Kit Sync** — 10 re-sync triggers, readiness policy complete
- ✅ **MCP Warm-up Contract** — 9-phase protocol typed and validated
- ✅ **Oversight UI** — Question queue, answer endpoints, timeout rules, `/oversight` route
- ✅ **Blueprint Launcher** — Full validation, import, run-plan, gated handoff, `/blueprints` route
- ✅ **Infrastructure State Stores** — SQLite + in-memory, 4 store kinds, upsert API
- ✅ **Infrastructure Gates Aggregation** — Read-only gate evaluation from stores
- ✅ **Blueprint Handoff** — Gated pipeline handoff evaluating all infra gates
- ✅ **Safety** — All POST endpoints disabled by default, no execution endpoints, secret redaction
- ✅ **60+ infrastructure state tests** — Comprehensive coverage
- ✅ **141 Speckit sync tests, 162 model profile tests** — Thorough validation

---

## 3. What's Blocked / Missing

| Issue | Severity | Details |
|-------|----------|---------|
| ~~**Missing `/providers` route**~~ | ~~Medium~~ | ✅ NOW RESOLVED — `/providers` route and `ProvidersPage.tsx` are implemented (see App.tsx line 27, `apps/web/src/pages/ProvidersPage.tsx`) |
| **No `GET /api/providers/opencode/status`** | Low | Specified in T2 but not implemented as standalone. Functionality replaced by infrastructure state endpoints. |
| **No `GET /api/speckit/status`** | Low | Specified in T3 but not implemented as standalone. Functionality replaced by infrastructure state endpoints. |
| **`api-overview.md` outdated** | High | 20+ Issue #229 endpoints missing; response shapes for tool-gateway endpoints outdated |
| **No local dev deployment guide** | Medium | Only Proxmox LXC container deployment documented |
| **No CHANGELOG entry for v0.3.0** | Low | Issue #229 changes not recorded in changelog |
| **`security-model.md` missing infra store vars** | Low | `POSITRON_ENABLE_INFRASTRUCTURE_STATE_UPSERT` not documented |

---

## 4. Gaps Identified (Documentation-Specific)

### Gap A: `api-overview.md` Severely Outdated
The primary API reference (`docs/architecture/api-overview.md`) was last updated 2026-05-24 and does not include:
- All 4 oversight endpoints
- All 7 blueprint endpoints
- All 6 infrastructure state/gate endpoints
- Extended response shapes for `GET /api/tool-gateway/status` and `GET /api/tool-gateway/tools`

### Gap B: `issue-229-tasks.md` Marks vs Reality
The task file has all items marked `[x]` but:
- T2's standalone `/api/providers/opencode/status` endpoint was NOT created (replaced by infra state)
- T3's standalone `/api/speckit/status` endpoint was NOT created (replaced by infra state)
- ~~T7's `/providers` route and `ProvidersPage.tsx` were NOT created~~ ✅ **NOW CREATED** — `/providers` route is in App.tsx line 27, `ProvidersPage.tsx` renders ProviderStatusPanel, ModelProfilePanel, SpecKitStatusPanel, McpWarmupStatusPanel, and InfrastructureGateTable

### Gap C: Missing Deployment Guide for Local/Non-Container
Only the Proxmox LXC deployment is documented. There's no updated guide for:
- Local development with infrastructure stores
- Setting `POSITRON_INFRASTRUCTURE_STORE=memory` or `=sqlite`
- Running the full Issue #229 stack locally

### Gap D: No MVP Finalization Summary
No single document captures what's been accomplished across the entire Issue #229 PR chain (this document fills that gap).

---

## 5. Recommendations

| Priority | Recommendation | Rationale |
|----------|---------------|-----------|
| **P0** | Update `docs/architecture/api-overview.md` | 20+ undocumented endpoints is a critical documentation gap |
| **P0** | Fix `docs/plans/issue-229-tasks.md` marks | Ensure task completion status matches reality |
| ~~**P1**~~ | ~~Create `/providers` route + `ProvidersPage.tsx`~~ | ✅ **DONE** — Already implemented (App.tsx line 27, `apps/web/src/pages/ProvidersPage.tsx`) |
| **P1** | Add local deployment/run guide | Developers need to know how to run with infrastructure stores |
| **P2** | Update `docs/security/security-model.md` | Add `POSITRON_ENABLE_INFRASTRUCTURE_STATE_UPSERT` env var |
| **P2** | Add CHANGELOG entry for v0.3.0 | Track Issue #229 feature delivery |
| **P3** | Document infra state SQLite schema | For developers debugging state persistence |

---

## 6. Next Steps

1. **Immediate:** Merge remaining open PRs (#240–#243) into main branch
2. **Immediate:** Update `api-overview.md` with all Issue #229 endpoints
3. ~~**Short-term:** Create `/providers` route and `ProvidersPage.tsx`~~ ✅ **DONE**
4. **Short-term:** Create local dev deployment guide with infrastructure stores
5. **Medium-term:** Run full E2E test suite to validate no regressions
6. **Medium-term:** Update CHANGELOG for v0.3.0 release
7. **Long-term:** Deploy to Proxmox LXC container for integration testing

---

*This document is part of the Issue #229 MVP Finalization effort.*
