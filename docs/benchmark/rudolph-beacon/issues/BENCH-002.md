# BENCH-002 — Deterministic Scan Simulator

## Summary
Implement a seed-based deterministic beacon scan simulator that produces identical results for identical inputs.

## Acceptance Criteria

- [x] `simulateBeaconScan(seed, nowIso)` exists and returns `BeaconScanResult`
- [x] Same seed + same nowIso = identical result (proven by test)
- [x] Different seed = different but valid result
- [x] Unknown beacon ID → classified as error in `notFound` array (never silently ignored)
- [x] No `Math.random()` — uses `seededHash` for deterministic variation
- [x] No system time — `nowIso` is injected
- [x] No network/hardware dependency
- [x] Scan result contains evidence-capable metadata (seed, scannedAt, warnings)

## Test Coverage
- `packages/benchmark-rudolph/src/__tests__/beacon-fixtures.test.ts` — 15 tests
- Red Tests covered: #6 (same seed = identical result), #7 (unknown beacon → error)

## Implementation
- `packages/benchmark-rudolph/src/beacon-fixtures.ts`

## Status: DONE
Confidence: 0.90
