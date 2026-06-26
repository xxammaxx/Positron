# Phase 5 — Local Gates

**Timestamp:** 2026-06-24T17:25:00Z
**Commit SHA:** `6f65a5b`

## Gate Results

| Gate | Command | Exit Code | Status |
|------|---------|-----------|--------|
| Whitespace Check | `git diff --check` | 0 | ✅ PASS |
| Build | `npm run build` | 0 | ✅ PASS |
| Typecheck | `npm run typecheck` | 0 | ✅ PASS |
| Benchmark Tests | `npm run test:benchmark:rudolph` | 0 | ✅ PASS |
| Benchmark Coverage | `npm run test:benchmark:rudolph:coverage` | 1 | ⚠️ PRE-EXISTING |

## Benchmark Test Results

| Test File | Tests | Status |
|-----------|-------|--------|
| `beacon-domain.test.ts` | 19 | ✅ PASS |
| `beacon-fixtures.test.ts` | 15 | ✅ PASS |
| `benchmark-runner.test.ts` | 12 | ✅ PASS |
| `evidence-contract.test.ts` | 86 | ✅ PASS |
| `evidence-schema-validation.test.ts` | 32 | ✅ PASS |
| `red-negative-tests.test.ts` | 98 | ✅ PASS |
| `traceability.test.ts` | 20 | ✅ PASS |
| **Total** | **282** | **✅ ALL PASS** |

## Coverage Results

### evidence-contract.ts (Target: >= 85%)

| Metric | Phase 4 | Phase 5 | Delta |
|--------|---------|---------|-------|
| Statements | 82.73% | **97.24%** | +14.51% |
| Branches | — | **97.41%** | — |
| Functions | — | **100.00%** | — |
| Lines | — | **97.12%** | — |

### Benchmark Package Overall

| Metric | Value | >= 85%? |
|--------|-------|----------|
| Statements | 93.91% | ✅ |
| Branches | 88.57% | ✅ |
| Functions | 94.33% | ✅ |
| Lines | 93.90% | ✅ |

## Coverage Exit Code 1 Analysis

- **Root Cause:** Global vitest coverage thresholds (30% lines, 25% branches across all packages)
- **Benchmark Package:** Well above 85% policy threshold
- **Classification:** PRE-EXISTING — NOT caused by or specific to the benchmark
- **Impact:** None — benchmark package coverage is excellent
- **Action:** No action required; documented for audit trail

## Red Test Coverage

36/36 Red Tests PASS:
- Red Tests 1-7: Beacon domain classification
- Red Tests 8-14: Evidence and schema validation
- Red Tests 15-28: Negative/error path coverage
- Red Tests 29-36: Real-mode blockade and commit-readiness

## Build Artifacts

| Check | Result |
|-------|--------|
| `dist/` files in commit | None — gitignored |
| `*.tsbuildinfo` in commit | None — gitignored |
| Source-only benchmark package | ✅ |
