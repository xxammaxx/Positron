# Rudolph Beacon — Phase 11: Local Gates

## Timestamp

2026-06-24T20:36:00Z

## Gate Results

| Gate | Command | Exit Code | Status | Notes |
|------|---------|-----------|--------|-------|
| Whitespace Check | `git diff --check` | 0 | PASS | No whitespace issues |
| Build | `npm run build` | 0 | PASS | All packages compiled successfully |
| Type Check | `npm run typecheck` | 0 | PASS | All 10 projects up to date |
| Benchmark Tests | `npm run test:benchmark:rudolph` | 0 | PASS | 282/282 PASS, 7 test files |
| Benchmark Coverage | `npm run test:benchmark:rudolph:coverage` | 1 | PRE_EXISTING_GLOBAL_THRESHOLD | Benchmark package: 93.91% (excellent). Global threshold 30% not met — pre-existing issue, NOT caused by benchmark |
| Full Test Suite | `npm test` | 0 | PASS | 1571/1571 PASS (1375 backend + 196 frontend) |

## Benchmark Coverage Detail

```
packages/benchmark-rudolph/src/
  beacon-domain.ts        100.00%  (all branches, lines, functions)
  benchmark-runner.ts      88.49%  (complex branching)
  controlled-real-probe.ts 93.44%  (real-mode safety paths)
  evidence-contract.ts     97.24%  (validation logic)
  traceability.ts          87.87%  (mapping logic)
  Overall:                 93.91%
```

## Global Coverage Threshold

```
Statements  : 8.59%  (threshold: 30%) — FAIL
Branches    : 9.14%  (threshold: 25%) — FAIL
Functions   : 6.96%  (threshold: 32%) — FAIL
Lines       : 8.65%  (threshold: 30%) — FAIL
```

This is **PRE_EXISTING_GLOBAL_THRESHOLD**: the global threshold applies across ALL packages including `apps/server` and `apps/web` which have ~0% coverage currently. The benchmark package itself has 93.91% coverage. RT-27 specifically validates that exit code 1 from global threshold is not misclassified as a benchmark fault.

## Test Count Comparison

| Phase | Total Tests | Benchmark | Frontend |
|-------|-------------|-----------|----------|
| Phase 10 | 1571 | 282 | 196 |
| Phase 11 | 1571 | 282 | 196 |
| Delta | 0 | 0 | 0 |

No test regression. Same pass count.

## Classification

```text
LOCAL_GATES_STATUS: GREEN
```

All required gates pass. Only global coverage threshold is below required levels (pre-existing, documented, not caused by this PR).
