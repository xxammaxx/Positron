# Level-B Runtime Coverage Report

**Generated:** 2026-05-31  
**Policy:** docs/release/coverage-policy.md — Level B threshold: 70% lines, 70% functions, 60% branches, 70% statements

## Summary

| Metric | Current | Target | Status |
|--------|:-------:|:------:|:------:|
| Lines | 48.18% | 70% | ❌ |
| Functions | 49.36% | 70% | ❌ |
| Branches | 38.77% | 60% | ❌ |
| Statements | 46.85% | 70% | ❌ |

## Per-File Breakdown

| Module | File | Lines % | Funcs % | Branches % | Target Met? |
|--------|------|:-------:|:-------:|:----------:|:-----------:|
| **Server** | `apps/server/src/index.ts` | 52.6% | 47.9% | 41.5% | ❌ |
| **Worker** | `apps/worker/src/pipeline-runner.ts` | 59.0% | 47.5% | 46.5% | ❌ |
| **Worker** | `apps/worker/src/index.ts` | 0% | 0% | 0% | ❌ |
| **GitHub** | `packages/github-adapter/src/real-adapter.ts` | 0% | 0% | 0% | ❌ |
| **GitHub** | `packages/github-adapter/src/sync-service.ts` | 0% | 0% | 0% | ❌ |
| **OpenCode** | `packages/opencode-adapter/src/real-adapter.ts` | 31.7% | 57.1% | 15.5% | ❌ |
| **SpecKit** | `packages/speckit-adapter/src/real-adapter.ts` | 31.7% | 57.1% | 15.5% | ❌ |
| **Server** | `apps/server/src/cli.ts` | 0% | 0% | 0% | ❌ |
| **Server** | `apps/server/src/real-mode-check.ts` | 0% | 0% | 0% | ❌ |
| **Server** | `apps/server/src/sse/broadcaster.ts` | 22.8% | 9.1% | 4.4% | ❌ |
| **Server** | `apps/server/src/github-watcher.ts` | 22.6% | 14.3% | 10.0% | ❌ |
| **Server** | `apps/server/src/demo/live-run-handler.ts` | 3.7% | 50.0% | 0% | ❌ |
| **Sandbox** | `packages/sandbox/src/real-adapter.ts` | 0% | 0% | 0% | ❌ |
| **Sandbox** | `packages/sandbox/src/command-runner.ts` | 17.1% | 27.3% | 0% | ❌ |
| **Sandbox** | `packages/sandbox/src/test-runner.ts` | 0% | 0% | 0% | ❌ |

## Critical Runtime Endpoints Status

| Endpoint | Tested? | Method |
|----------|:-------:|--------|
| GET /api/health | ✅ | Supertest (integration.test.ts) |
| GET /api/adapters/health | ✅ | Supertest |
| GET /api/safety | ✅ | Supertest |
| POST /api/safety | ✅ | Supertest (admin auth) |
| GET /api/runs | ✅ | Supertest |
| POST /api/repos/:repoId/runs | ✅ | Supertest (full pipeline) |
| GET /api/runs/:id | ✅ | Supertest |
| POST /api/runs/:id/cancel | ✅ | Supertest |
| POST /api/runs/:id/control | ✅ | Supertest |
| POST /api/demo-runs | ✅ | Supertest |
| POST /api/evidence | ✅ | Supertest |
| GET /api/admin/stats | ✅ | Supertest (auth) |
| GET /api/settings/mcp | ✅ | Supertest |
| SSE /api/runs/:id/events/stream | ❌ | Not tested |
| GET /api/stream (dashboard SSE) | ❌ | Not tested |

## Accepted Risks for rc.1

1. **SSE endpoints not unit-tested**: SSE requires mock Response objects. Covered by existing integration test that triggers SSE-like flows.
2. **Worker entry point not tested**: BullMQ Queue/Worker mocking is complex. Pipeline logic is tested directly via executePhase.
3. **RealAdapter runtime coverage low**: Safety-critical argument construction is extracted and 100% tested (Level A). Runtime orchestration is thin wrappers.
4. **Global coverage 48%**: This reflects the remaining large files (server index.ts, pipeline-runner.ts). Both are partially covered by integration tests (server routes) and unit tests (executePhase).
