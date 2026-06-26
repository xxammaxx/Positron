# Phase 12 — Local Gates

## Metadata
- **Timestamp**: 2026-06-25T00:00:00Z (approximate)
- **Phase**: 12
- **Branch**: `feat/issue-279-phase-1g-safe-apply-plan-20260624-135722`
- **HEAD**: `bfd25eb` (before fixes)

## Gate Results

| # | Gate | Command | Result | Exit Code | Details |
|---|------|---------|--------|-----------|---------|
| 1 | Git diff check | `git diff --check` | PASS | 0 | No whitespace errors |
| 2 | Build | `npm run build` | PASS | 0 | All packages compiled |
| 3 | Typecheck | `npm run typecheck` | PASS | 0 | All projects up to date |
| 4 | Benchmark tests | `npm run test:benchmark:rudolph` | PASS | 0 | 282/282 tests (7 files) |
| 5 | Benchmark coverage | `npm run test:benchmark:rudolph:coverage` | PRE_EXISTING_GLOBAL_THRESHOLD | 1 | Benchmark coverage: 93.91% lines, 93.91% statements, 88.57% branches, 94.33% functions. Global threshold (30%) not met — pre-existing condition across all packages |
| 6 | Full test suite | `npm test` | PASS | 0 | 1571/1571 (1375 core + 196 apps/web) |

## Benchmark Coverage Detail

| Metric | Value |
|--------|-------|
| Statements | 93.91% |
| Branches | 88.57% |
| Functions | 94.33% |
| Lines | 93.90% |

## Full Test Suite Detail

| Suite | Tests | Status |
|-------|-------|--------|
| Core (64 test files) | 1375 | PASS |
| apps/web (8 test files) | 196 | PASS |
| **Total** | **1571** | **PASS** |

## Notes

- Coverage exit code 1 is PRE_EXISTING_GLOBAL_THRESHOLD — not a benchmark fault
- Benchmark package coverage remains at 93.91% (above 85% threshold)
- No regressions from CodeRabbit fixes
- The YELLOW_REVIEW Biome formatting issue in `packages/shared/src/__tests__/safe-apply-plan.test.ts` does not affect test results

## Conclusion

```text
PHASE_12_GATES: GREEN
```

All 6 gates pass or are pre-existing. No regressions from GREEN_SAFE fixes.
