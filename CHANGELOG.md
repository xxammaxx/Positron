# Positron Changelog

## v0.1.0-rc.1 — Release Candidate (2026-05-24)

**Status:** Production-ready für Testrepos und explizit freigegebene Low-Risk-Repos.

### Issues 1–19: Core Foundation (2026-05-21–23)

| # | Issue | Status |
|---|-------|--------|
| 1 | Projekt-Grundgerüst — Monorepo, npm Workspaces, TypeScript | ✅ |
| 2 | Shared Package — Typen, Interfaces, Konstanten | ✅ |
| 3 | Datenbank-Schema — SQLite Tabellen, Migrationen | ✅ |
| 4 | GitHub Adapter — Issue-Polling, Label-Management, Octokit | ✅ |
| 5 | Run-State-Machine — 20 Phasen, Übergänge, Event-Logging | ✅ |
| 6 | Spec Kit Adapter Stub | ✅ |
| 7 | Web-Recherche-Integration | ✅ |
| 8 | Server-Kern — Express, API, Run-Dispatcher | ✅ |
| 9 | Web UI — React Dashboard mit Issue-Queue + Run-Pipeline | ✅ |
| 10 | Code Coverage — Vitest v8, Thresholds, CI Workflow | ✅ |
| 11 | Unicode/Umlaut Policy | ✅ |
| 12 | Evidence Templates — GitHub Status Sync | ✅ |
| 13 | E2E Real GitHub Issue-to-Run Validation | ✅ |
| 14 | MVP Live Validation Hardening | ✅ |
| 15 | Spec Kit Real Adapter | ✅ |
| 16 | OpenCode Real Adapter | ✅ |
| 17 | Live Production Readiness — 26 LIVE E2E Tests PASS | ✅ |
| 18 | PR Creation Adapter | ✅ |
| 19 | Commit/Push Policy — Branch Guard, Safe Git Delivery | ✅ |

### Issues 20–32: Auto-Merge + Operator Dashboard (2026-05-24)

| # | Issue | Status |
|---|-------|--------|
| 20 | Auto-Merge mit Safety Gates + Idempotenz | ✅ |
| 21 | Merge-Gate-Integration — 6 Gates | ✅ |
| 22 | Operator Dashboard — Basis-Cockpit | ✅ |
| 23-24 | Orchestrator Live E2E | ✅ |
| 25-27 | Push-Gated Pipeline + Fix-Loop + Spec Kit Init | ✅ |
| 28 | Operator Dashboard Enhancement — 21 Phasen | ✅ |
| 29 | SSE Real-Time Run Updates | ✅ |
| 30 | Run-Control Backend — Pause/Abort/Resume/Retry | ✅ |
| 31 | Fix-Loop Enhancement — Smart Retry + Backoff | ✅ |
| 32 | Reviewer-Automation | ✅ |

### Issues 33–39: Release Hardening + Dogfood Validation

| # | Issue | Status |
|---|-------|--------|
| 33 | Release Candidate Hardening + Production Runbook | ✅ |
| 34 | First Real Repository Dogfood Run (PUSH=OFF) | ✅ BLOCKED |
| 35 | Second Dogfood Run (Path Bug) | ✅ BLOCKED |
| 36 | Fix Workspace Path Propagation | ✅ |
| 37 | Third Dogfood Run (Policy + No Commits) | ✅ BLOCKED |
| 38 | Dogfood Fixture Change Provider | ✅ |
| 39 | Fourth Dogfood Run — PR Creation 🎉 | ✅ DONE |

### Issues 40–44: External Repo + Auto-Merge + Safety Baseline

| # | Issue | Status |
|---|-------|--------|
| 40 | First External Repo Dogfood | ✅ DONE |
| 41 | Auto-Merge Dry-Run — 7 Gates | ✅ WOULD_BLOCK |
| 42 | Auto-Merge Gate Readiness — Mergeability Polling | ✅ WOULD_MERGE |
| 43 | **Auto-Merge Live Test — PR #6 merged** 🎉 | ✅ MERGED |
| 44 | Production Safety Baseline | ✅ |

### Issues 45–48: Policy + Isolation + Release

| # | Issue | Status |
|---|-------|--------|
| 45 | Repository Onboarding Policy + Risk Classification | ✅ |
| 46 | Low-Risk Repository Onboarding Template | ✅ |
| 47 | Agent Environment Isolation + Skill Quarantine | ✅ |
| 48 | **Finalize Positron v0.1.0-rc.1 Release** | ✅ |

### Key Metrics (v0.1.0-rc.1)

| Metric | Value |
|--------|-------|
| Total Issues | 48 |
| Tests | **395** (all passing) |
| Playwright E2E | 23 tests |
| Build | Clean (TypeScript strict) |
| Web Bundle | 224 KB JS + 19 KB CSS |
| Packages | 7 |
| Apps | 2 (server, web) |
| Phases | 21 (QUEUED → FAILED_UNSAFE) |
| Merge Gates | 7 (with Dry-Run) |
| Safety Profiles | 4 (Observe → Autonomous) |
| Repo Risk Levels | 4 (Test → Critical) |

### Validated Pipeline

```
Issue → CLAIMED → REPO_SYNC → ISSUE_CONTEXT → SPECIFY
→ PLAN → TASKS → IMPLEMENT → TEST → COMMIT → PUSH
→ PR_CREATE → DRY-RUN (WOULD_MERGE) → MERGE → DONE
```

Validated against: `xxammaxx/positron-external-test`, PR #6, Merge Commit `67a6ab1f`.

### Safety Defaults (Production)

```bash
POSITRON_MERGE_KILL_SWITCH=true  # All merges blocked
POSITRON_ENABLE_MERGE=false      # Auto-merge disabled
POSITRON_ENABLE_PUSH=false       # Push disabled
POSITRON_ENABLE_FIX_LOOP=false   # Auto-retry disabled
POSITRON_MERGE_DRY_RUN=true      # Merge simulation
```

### Documentation (v0.1.0-rc.1)

- `docs/release/v0.1.0-rc.1.md` — Release Report
- `docs/operations/production-runbook.md` — Production Runbook
- `docs/operations/production-safety-baseline.md` — Safety Baseline
- `docs/operations/auto-merge-safety-runbook.md` — Auto-Merge Safety
- `docs/security/threat-model.md` — Threat Model (10 threats)
- `docs/security/agent-environment-isolation.md` — Agent Isolation
- `docs/security/external-skills-inventory.md` — Skill Classification
- `docs/configuration/env-reference.md` — 25+ Env Vars
- `docs/configuration/repository-profiles.md` — Repo Profiles
- `.env.example` — Safe Defaults

