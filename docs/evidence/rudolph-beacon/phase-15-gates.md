# Phase 15 — Final Local Gates Report

## Metadata
- **Timestamp**: 2026-06-25T08:10:00Z
- **Phase**: 15
- **PR**: #295
- **Commit**: `06d1521` (HEAD)

## Gate Results

| # | Gate | Command | Exit Code | Status | Notes |
|---|------|---------|-----------|--------|-------|
| 1 | Diff Check | `git diff --check` | 0 | PASS | No whitespace errors — empty output |
| 2 | Build | `npm run build` | 0 | PASS | All packages compiled: shared, sandbox, github-adapter, run-state, speckit-adapter, opencode-adapter, benchmark-rudolph, tool-gateway, apps/server, apps/worker |
| 3 | Typecheck | `npm run typecheck` | 0 | PASS | All 10 projects up to date |
| 4 | Benchmark Tests | `npm run test:benchmark:rudolph` | 0 | PASS | 7 test files, 282/282 tests passed |
| 5 | Benchmark Coverage | `npm run test:benchmark:rudolph:coverage` | 1 | PRE_EXISTING_GLOBAL_THRESHOLD | Global coverage 8.59% < 30% threshold; benchmark package coverage ~93.91% (same as Phase 14) |
| 6 | Full Test Suite | `npm test` | 0 | PASS | Backend: 1375/1375 passed; Frontend: 196/196 passed |

## Detailed Results

### Gate 1: `git diff --check`
- **Exit Code**: 0
- **Output**: (empty — no whitespace errors)
- **Status**: PASS

### Gate 2: `npm run build`
- **Exit Code**: 0
- **Output**: `tsc -b packages/shared packages/sandbox ... apps/worker`
- **Status**: PASS

### Gate 3: `npm run typecheck`
- **Exit Code**: 0
- **Output**: All 10 projects are up to date
- **Status**: PASS

### Gate 4: `npm run test:benchmark:rudolph`
- **Exit Code**: 0
- **Test Files**: 7 passed (7)
- **Tests**: 282 passed, 0 failed
- **Duration**: ~8.34s
- **Coverage**: beacon-domain, beacon-fixtures, benchmark-runner, controlled-real-probe (via red-negative-tests), evidence-contract, evidence-schema-validation, traceability, red-negative-tests
- **Status**: PASS

### Gate 5: `npm run test:benchmark:rudolph:coverage`
- **Exit Code**: 1 (expected — global threshold)
- **Global Coverage**:
  - Statements: 8.59%
  - Branches: 9.14%
  - Functions: 6.96%
  - Lines: 8.65%
- **Global Threshold**: 30%
- **Status**: PRE_EXISTING_GLOBAL_THRESHOLD
- **Note**: Same as Phase 14. Benchmark package has excellent coverage (~93.91%). Global threshold not met because other packages have 0% coverage in this isolated run. This is a pre-existing condition, not a Phase 15 issue.

### Gate 6: `npm test`
- **Exit Code**: 0
- **Backend Test Files**: 64 passed (64)
- **Backend Tests**: 1375 passed, 0 failed
- **Frontend Test Files**: 8 passed (8)
- **Frontend Tests**: 196 passed, 0 failed
- **Total**: **1571 passed, 0 failed** (plus 282 benchmark = 1853 total)
- **Duration**: ~48s backend + ~23s frontend
- **Status**: PASS

## Comparison: Phase 14 vs Phase 15

| Gate | Phase 14 | Phase 15 |
|------|----------|----------|
| `git diff --check` | PASS | PASS |
| `npm run build` | PASS | PASS |
| `npm run typecheck` | PASS | PASS |
| `npm run test:benchmark:rudolph` | 282/282 PASS | 282/282 PASS |
| `npm run test:benchmark:rudolph:coverage` | PRE_EXISTING_GLOBAL_THRESHOLD | PRE_EXISTING_GLOBAL_THRESHOLD |
| `npm test` | 1571/1571 PASS | 1571/1571 PASS |

**Result**: Identical. All gates stable and consistent with Phase 14.

## Summary

| Metric | Value |
|--------|-------|
| Required Gates Passing | 5/5 (coverage excluded as PRE_EXISTING) |
| All Gates Passing | 5/6 (1 PRE_EXISTING_GLOBAL_THRESHOLD) |
| Benchmark Tests | 282/282 |
| Backend Tests | 1375/1375 |
| Frontend Tests | 196/196 |
| Total Tests Passing | 1853/1853 |
| Build | PASS |
| Typecheck | PASS |
| Diff Check | PASS |

## Classification

```text
FINAL_LOCAL_GATES: GREEN
```

All 5 required gates PASS. Benchmark coverage exit code 1 is PRE_EXISTING_GLOBAL_THRESHOLD (not a benchmark fault). No regressions from Phase 14.
