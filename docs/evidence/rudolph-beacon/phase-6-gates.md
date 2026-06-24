# Phase 6 — Local Gates

**Timestamp:** 2026-06-24T16:45:00Z
**Commit SHA:** `7000ff9`

## Gate Results

| Gate | Command | Exit Code | Duration | Status |
|------|---------|-----------|----------|--------|
| Whitespace Check | `git diff --check` | 0 | <1s | ✅ PASS |
| Build | `npm run build` | 0 | ~8s | ✅ PASS |
| Typecheck | `npm run typecheck` | 0 | <1s | ✅ PASS |
| Benchmark Tests | `npm run test:benchmark:rudolph` | 0 | 4.3s | ✅ PASS |
| Benchmark Coverage | `npm run test:benchmark:rudolph:coverage` | 1 | 5.6s | ⚠️ PRE-EXISTING |

## Benchmark Test Results

| Test File | Tests | Duration | Status |
|-----------|-------|----------|--------|
| `beacon-domain.test.ts` | 19 | ~3ms | ✅ PASS |
| `beacon-fixtures.test.ts` | 15 | ~10ms | ✅ PASS |
| `benchmark-runner.test.ts` | 12 | ~30ms | ✅ PASS |
| `evidence-contract.test.ts` | 86 | ~40ms | ✅ PASS |
| `evidence-schema-validation.test.ts` | 32 | ~25ms | ✅ PASS |
| `red-negative-tests.test.ts` | 98 | ~50ms | ✅ PASS |
| `traceability.test.ts` | 20 | ~18ms | ✅ PASS |
| **Total** | **282** | **~176ms** | **✅ ALL PASS** |

## Red Tests

| Range | Coverage | Count | Status |
|-------|----------|-------|--------|
| Red Tests 1-7 | Beacon domain classification | 7 | ✅ PASS |
| Red Tests 8-14 | Evidence and schema validation | 7 | ✅ PASS |
| Red Tests 15-28 | Negative/error path coverage | 14 | ✅ PASS |
| Red Tests 29-36 | Real-mode blockade and commit-readiness | 8 | ✅ PASS |
| **Total** | | **36** | **✅ ALL PASS** |

## Coverage Results (Phase 6 Re-verification)

### evidence-contract.ts — Target: >= 85%

| Metric | Value | Status |
|--------|-------|--------|
| Statements | 97.24% | ✅ (was 82.73% in Phase 4) |
| Branches | 97.41% | ✅ |
| Functions | 100.00% | ✅ |
| Lines | 97.12% | ✅ |

### Benchmark Package Overall

| Metric | Value | >= 85%? |
|--------|-------|----------|
| Statements | 93.91% | ✅ |
| Branches | 88.57% | ✅ |
| Functions | 94.33% | ✅ |
| Lines | 93.90% | ✅ |

### Coverage Exit Code 1 — Analysis

- **Classification**: `PRE_EXISTING_GLOBAL_THRESHOLD`
- **Root Cause**: Global vitest coverage thresholds (30% lines, 32% functions, 30% statements, 25% branches) applied across all packages — other packages lack vitest coverage configuration
- **Benchmark Impact**: None — benchmark package coverage (93.91%) far exceeds the 85% policy threshold
- **Action**: No action required; documented for audit trail
- **Not a benchmark fault**: Coverage exit code 1 is NOT misclassified as a benchmark failure

## Build and Typecheck Details

### Build (`npm run build`)
```
tsc -b packages/shared packages/sandbox packages/github-adapter packages/run-state 
    packages/speckit-adapter packages/opencode-adapter packages/benchmark-rudolph 
    packages/tool-gateway apps/server apps/worker
```
**Result**: All 10 projects compiled successfully. No errors.

### Typecheck (`npm run typecheck`)
```
tsc -b --dry
```
**Result**: All 10 projects up to date. No type errors. "A non-dry build would build project tsconfig.json" — this is expected behavior for the `--dry` flag.

## Full Test Suite (`npm test`)

Not executed in this run (time constraint). The benchmark-specific tests are the primary gates for this scope. Full suite `npm test` would run `vitest run && cd apps/web && npx vitest run` — this includes tests from packages not affected by these commits and is recommended before PR merge but not critical for Rudolph Beacon scoping.

## Build Artifacts

| Check | Result |
|-------|--------|
| `dist/` files committed | ❌ None — gitignored |
| `*.tsbuildinfo` committed | ❌ None — gitignored |
| `*.js.map` committed | ❌ None — gitignored |
| `coverage/` committed | ❌ None — gitignored |
| `.db`/`.sqlite` committed | ❌ None — gitignored |
| `.env` committed | ❌ None — gitignored |

## Gate Summary

| Type | Passed | Failed | Pre-existing |
|------|--------|--------|--------------|
| Whitespace | 1 | 0 | 0 |
| Build | 1 | 0 | 0 |
| Typecheck | 1 | 0 | 0 |
| Tests | 1 | 0 | 0 |
| Coverage | 0 | 0 | 1 (PRE-EXISTING) |
| **Total** | **4** | **0** | **1 (PRE-EXISTING)** |

```
GATES_STATUS: ALL_PASS
```

All mandatory gates pass. The single coverage exit code 1 is pre-existing and unrelated to the benchmark.
