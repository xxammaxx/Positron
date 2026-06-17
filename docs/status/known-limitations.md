# Positron — Known Limitations

**Date:** 2026-06-17
**Scope:** Capabilities explicitly NOT implemented or intentionally disabled as of Issue #229 MVP Finalization

---

## Execution Limitations

| Limitation | Details | Why |
|------------|---------|-----|
| **No OpenCode coding run without human approval** | All pipeline handoffs require `humanApprovalRequired: true`. No autonomous coding runs. | Safety — prevents unmonitored code generation |
| **No MCP real run without warm-up + allowlist** | MCP warm-up validation gates block execution until warm-up evidence is stored and passes | Safety — ensures MCP servers are properly vetted |
| **No Spec Kit runtime without human approval** | Spec Kit operations require human oversight questions | Safety — Spec Kit changes can affect entire system |
| **Tool Gateway sealed/read-only** | No POST execute endpoint, no execute buttons in UI | Safety — monitoring only until explicitly enabled |
| **No auto-merge, no push to main** | `POSITRON_MERGE_KILL_SWITCH=true`, `POSITRON_ENABLE_PUSH=false` by default | Safety — prevents uncontrolled repository changes |
| **No production autonomy** | All execution is gated; no autonomous production runs | Design constraint — MVP requires human-in-the-loop |

---

## Infrastructure Store Limitations

| Limitation | Details |
|------------|---------|
| **Stores must be populated via API** | Infrastructure state stores are NOT auto-populated on startup. Data must be upserted via POST endpoints. |
| **POST endpoints disabled by default** | All `/api/infrastructure-state/*` POST endpoints require `POSITRON_ENABLE_INFRASTRUCTURE_STATE_UPSERT=true` env var |
| **No auto-detection on startup** | The system does not automatically detect OpenCode binary, model profiles, Spec Kit state, or MCP warm-up on startup |
| **CT 120 server not fully operational** | The CT 120 (positron-dev Debian 12 Proxmox container) fixture exists but requires store population before full functioning |

---

## Test Limitations

| Limitation | Details |
|------------|---------|
| **3 pre-existing test failures** | 2108/2111 unit tests pass. 3 failures are Windows-specific path issues or timeout-related — not safety-critical. Tracked separately. |
| **E2E tests non-blocking** | Playwright E2E tests (25 tests) are non-blocking for merges due to JSX build dependency |
| **Biome format diffs** | 314 formatting differences accepted as non-blocking risk |
| **Biome lint diagnostics** | 901 lint warnings accepted as non-blocking risk |

---

## Documentation Limitations

| Limitation | Details |
|------------|---------|
| **api-overview.md outdated** | Does not include 20+ Issue #229 endpoints (oversight, blueprints, infrastructure state) |
| **No local dev deployment guide** | Only Proxmox LXC container deployment documented; no guide for running with infrastructure stores locally |
| **security-model.md missing infra store vars** | `POSITRON_ENABLE_INFRASTRUCTURE_STATE_UPSERT` env var not documented |
| **No CHANGELOG entry for v0.3.0** | Issue #229 changes not yet recorded in changelog |

---

## What's Deliberately Not Implemented

| Feature | Reason |
|---------|--------|
| Standalone `/api/providers/opencode/status` | Replaced by `/api/infrastructure-gates/status` aggregation |
| Standalone `/api/speckit/status` | Replaced by `/api/infrastructure-gates/status` aggregation |
| Real MCP tool execution | Post-MVP; requires warm-up + allowlist + human approval flow to be fully exercised |
| SonarQube integration | Requires maintained CI instance |
| Cloud observability (Sentry/OTEL) | Deferred; console logging sufficient for MVP |
| PostgreSQL support | SQLite sufficient for MVP; PostgreSQL is optional post-MVP |

---

*This document is part of the Issue #229 MVP Finalization effort. See `current-capabilities.md` for what Positron CAN do.*
