# Phase 10 — Local Gates Report

## Metadata
- **Timestamp:** 2026-06-24T20:25:00+02:00
- **Phase:** 10
- **Clean Commit Chain:** `1221716` → `c9e3cd1` (both descendants of remote HEAD `368c9c0`)

## Gate Results

| # | Gate | Exit Code | Status | Notes |
|---|------|-----------|--------|-------|
| 1 | `git diff --check` | 0 | ✅ PASS | No whitespace issues |
| 2 | `npm run build` | 0 | ✅ PASS | All projects compiled (incl. benchmark-rudolph) |
| 3 | `npm run typecheck` | 0 | ✅ PASS | All projects up to date |
| 4 | `npm run test:benchmark:rudolph` | 0 | ✅ PASS | 282/282 tests (7 files) |
| 5 | `npm run test:benchmark:rudolph:coverage` | 1 | ⚠️ PRE-EXISTING | Global threshold 30% not met (pre-existing), benchmark line coverage: **93.9%** |
| 6 | `npm test` (full) | 0 | ✅ PASS | 1571/1571 tests (64 backend + 8 frontend = 72 files) |

## Benchmark Coverage Detail

| Metric | Benchmark Package | Global |
|--------|------------------|--------|
| Statements | 93.91% | 8.59% |
| Branches | 88.57% | 9.14% |
| Functions | 94.33% | 6.96% |
| Lines | 93.9% | 8.65% |

**Classification:** Exit code 1 is `PRE_EXISTING_GLOBAL_THRESHOLD` — NOT introduced by the benchmark package. The benchmark package itself exceeds all internal quality thresholds.
