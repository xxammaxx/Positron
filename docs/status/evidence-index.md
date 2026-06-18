# Positron — Evidence Index

**Date:** 2026-06-17
**Scope:** Index of all evidence sources verifying Positron's current state

---

## Test Results

| Evidence | Count | Status | How to Verify |
|----------|-------|--------|--------------|
| Contract Tests | 140/140 | ✅ PASS | `npm run test:contracts` |
| Unit/Integration Tests | 2108/2111 | ✅ PASS (3 pre-existing) | `npm test` |
| TypeScript Build | — | ✅ PASS | `npm run build` |
| Typecheck | — | ✅ PASS | `npm run typecheck` |
| Safety Coverage | 100% | ✅ PASS | `npm run coverage:safety` |
| Secret Scan | — | ✅ PASS | grep patterns for secrets |

---

## API Endpoints

| Endpoint | Method | Status | Location |
|----------|--------|--------|----------|
| `/api/health` | GET | ✅ Operational | Server index.ts |
| `/api/infrastructure-gates/status` | GET | ✅ Operational | Server index.ts line 4713 |
| `/api/infrastructure-state/status` | GET | ✅ Operational | Infrastructure routes line 61 |
| `/api/infrastructure-state/provider-detection` | POST | ⚠️ Disabled by default | Infrastructure routes line 88 |
| `/api/infrastructure-state/model-profile` | POST | ⚠️ Disabled by default | Infrastructure routes line 127 |
| `/api/infrastructure-state/speckit-sync` | POST | ⚠️ Disabled by default | Infrastructure routes line 166 |
| `/api/infrastructure-state/mcp-warmup-evidence` | POST | ⚠️ Disabled by default | Infrastructure routes line 205 |
| `/api/tool-gateway/status` | GET | ✅ Operational | Server index.ts |
| `/api/tool-gateway/tools` | GET | ✅ Operational | Server index.ts |
| `/api/oversight/questions` | GET | ✅ Operational | Server index.ts |
| `/api/oversight/questions/:id` | GET | ✅ Operational | Server index.ts |
| `/api/oversight/questions/:id/answer` | POST | ✅ Operational | Server index.ts |
| `/api/oversight/questions/:id/pause-run` | POST | ✅ Operational | Server index.ts |
| `/api/oversight/questions/:id/abort-run` | POST | ✅ Operational | Server index.ts |
| `/api/oversight/attention` | GET | ✅ Operational | Server index.ts |
| `/api/blueprints/validate` | POST | ✅ Operational | Server index.ts |
| `/api/blueprints/import` | POST | ✅ Operational | Server index.ts |
| `/api/blueprints/:id` | GET | ✅ Operational | Server index.ts |
| `/api/blueprints/:id/create-run-plan` | POST | ✅ Operational | Server index.ts |
| `/api/blueprints/:id/start-run` | POST | ✅ Operational | Server index.ts |
| `/api/blueprints/:id/handoff` | GET | ✅ Operational | Server index.ts |

---

## Browser Routes

| Route | Page | Status | Evidence File |
|-------|------|--------|--------------|
| `/` | DashboardPage | ✅ Renders | `apps/web/src/components/dashboard/DashboardPage.tsx` |
| `/runs` | RunsPage | ✅ Renders | `apps/web/src/components/runs/RunsPage.tsx` |
| `/evidence` | EvidencePage | ✅ Renders | `apps/web/src/components/evidence/EvidencePage.tsx` |
| `/repos` | Repositories | ✅ Renders | `apps/web/src/components/Repositories.tsx` |
| `/settings` | SettingsPage | ✅ Renders | `apps/web/src/components/settings/SettingsPage.tsx` |
| `/admin` | AdminPage | ✅ Renders | `apps/web/src/components/admin/AdminPage.tsx` |
| `/providers` | ProvidersPage | ✅ Renders | `apps/web/src/pages/ProvidersPage.tsx` |
| `/oversight` | OversightPage | ✅ Renders | `apps/web/src/pages/OversightPage.tsx` |
| `/blueprints` | BlueprintLauncherPage | ✅ Renders | `apps/web/src/pages/BlueprintLauncherPage.tsx` |

---

## Build & CI

| Evidence | Status | How to Verify |
|----------|--------|--------------|
| TypeScript Build | ✅ PASS | `npm run build` — `tsc -b` all packages |
| Typecheck | ✅ PASS | `npm run typecheck` — no TS errors |
| Docker Compose Build | ⚠️ PARTIAL | Dockerfile/Compose static validation passed; live `docker compose up --build` NOT executed (Docker Desktop daemon unavailable on validation host 2026-06-18) |

---

## Committed Fixes (Issue #229)

| Fix | Commit | Details |
|-----|--------|---------|
| Blueprint Pipeline Handoff Redaction | `c437bde` | Evidence redaction in `blueprint-pipeline-handoff.ts` — secret paths, raw markdown removed from evidence output |
| CT120 Fixture Privacy Improvement | `d29d06b` | Safe, redacted infrastructure state fixture for CT 120 container with NO secrets, NO private paths, NO fake PASS values |

---

## Infrastructure State Source Files

| Module | Path | Purpose |
|--------|------|---------|
| Infrastructure State Store | `packages/shared/src/infrastructure-state-store.ts` | Store interfaces, types, validation, in-memory adapter, aggregator binding |
| Infrastructure Gates | `packages/shared/src/infrastructure-gates.ts` | Gate kinds, individual gate evaluators, central aggregator |
| Infrastructure State Upsert | `packages/shared/src/infrastructure-state-upsert.ts` | Safe upsert logic with validation |
| Infrastructure State Routes | `apps/server/src/infrastructure/infrastructure-state-routes.ts` | Express router for state upsert endpoints |
| SQLite Store Adapter | `apps/server/src/infrastructure/infrastructure-state-store-sqlite.ts` | SQLite-backed store implementation |
| Store Factory | `apps/server/src/infrastructure/create-stores-for-server.ts` | Server startup store factory with mode resolution |
| CT120 Fixture | `apps/server/src/infrastructure/__fixtures__/ct120-safe-infrastructure-state.ts` | Safe, redacted test fixture for CT 120 |

---

## Evidence Aggregation

All evidence is aggregated in `docs/qa/layer-7-evidence-aggregation.md` for the full quality gate view.

---

*This document is part of the Issue #229 MVP Finalization effort.*
