# Issue #17 (13.2): Live Production Readiness Initial Assessment

## Current Branch
`positron/issue-17-live-production-readiness` (branched from `positron/issue-16-opencode-real-adapter`)

## Existing Live-E2E Support

| Component | Status | Location |
|-----------|--------|----------|
| Live E2E Config Module | Production-ready, tested (28 tests) | `packages/shared/src/live-e2e.ts` |
| Live E2E Config Tests | All passing | `packages/shared/src/__tests__/live-e2e.test.ts` |
| Live E2E Test Harness | Production-ready, 26 tests | `apps/server/src/__tests__/live-github-e2e.test.ts` |
| Repository Config | Production-ready, tested | `packages/shared/src/repository-config.ts` |
| Live Marker System | Dual markers (live-e2e + run) | `packages/shared/src/live-e2e.ts`, `packages/github-adapter/src/sync-templates.ts` |
| Gate System | 7 safety gates + optional flags | `packages/shared/src/live-e2e.ts` |

## GitHub Live Readiness

- ✅ `RealGitHubAdapter` fully functional
- ✅ `GitHubStatusSyncService` with 6 sync methods
- ✅ Label lifecycle (8 phases) with add/remove
- ✅ Comment creation with deduplication via markers
- ✅ Claiming (label transition + comment)
- ✅ Final status sync (DONE/FAILED/BLOCKED)
- ✅ Issue #1 created in `xxammaxx/positron-e2e-test` with `positron:ready` label
- ⚠️ 404s on DELETE for labels that don't exist yet (expected — no-op)

## Spec Kit Adapter Live Readiness

- ✅ `RealSpecKitAdapter` health check: FOUND (CLI at `/home/xxammaxx/.local/bin/specify`)
- ✅ `detectArtifacts` works in detect-only mode
- ✅ `initialize` correctly skipped in detect-only mode
- ✅ `specify version` output parsed successfully
- ⚠️ `specify init` not tested in live path (needs `POSITRON_ENABLE_REAL_SPECKIT_TESTS`)

## OpenCode Adapter Live Readiness

- ✅ `RealOpenCodeAdapter` health check: FOUND (CLI at `/home/xxammaxx/.opencode/bin/opencode`)
- ✅ `runSlashCommand` correctly skipped in detect-only mode
- ✅ `runImplement` dry-run functional
- ⚠️ Dry-run needs `POSITRON_ENABLE_OPENCODE_DRY_RUN` to execute actual prompt

## Orchestrator Live Path Status

- ✅ Service-level E2E covers all adapters individually
- ⚠️ Orchestrator-level E2E (`runFullPipeline` loop) not yet live-tested
- ✅ Service composition verified: all adapters + sync service work together in test

## Missing Pieces

1. **Orchestrator-level Live E2E** — `runFullPipeline` not run against real GitHub
2. **Real Spec Kit Init** — `specify init` not tested in live path (out of scope for this issue)
3. **Real OpenCode Slash Command** — `opencode run --command speckit.*` not tested (out of scope)
4. **PR Creation** — Not yet implemented (Issue #17 scope)

## Test-First Plan

1. ✅ Fix `prepareWorkspace` interface mismatch
2. ✅ Add Spec Kit adapter health/detect to live E2E
3. ✅ Add OpenCode adapter health/dry-run to live E2E
4. ✅ Run live read-only (10 tests)
5. ✅ Run live write with ALLOW_WRITE (16 tests)
6. ✅ Fix secret redaction key length
7. ✅ Re-run with fix — ALL 26 TESTS PASS
8. Write production readiness report
9. Document results

## Live Test Summary

| Suite | Tests | Result |
|-------|-------|--------|
| Read-Only | 4 | ✅ PASS |
| Spec Kit Adapter | 3 | ✅ PASS |
| OpenCode Adapter | 3 | ✅ PASS |
| Write — Claiming | 4 | ✅ PASS |
| Write — Workspace | 2 | ✅ PASS |
| Write — Spec Kit on Workspace | 2 | ✅ PASS |
| Write — OpenCode on Workspace | 1 | ✅ PASS |
| Write — Test Detection/Execution | 2 | ✅ PASS |
| Write — Status Sync | 1 | ✅ PASS |
| Write — Label Verification | 1 | ✅ PASS |
| Write — Deduplication | 1 | ✅ PASS |
| Write — Unicode/ASCII/Redaction | 1 | ✅ PASS |
| Write — Result Summary | 1 | ✅ PASS |
| **TOTAL** | **26** | **✅ ALL PASS** |
