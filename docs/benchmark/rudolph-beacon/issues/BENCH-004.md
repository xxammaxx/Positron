# BENCH-004 — Traceability / Loop-Prevention

## Summary
Implement traceability mapping from benchmark requirements to tests, files, and evidence with enforcement rules against false DONE claims.

## Acceptance Criteria

- [x] `buildTraceabilityMap` maps issue IDs to trace entries (spec, tests, files, evidence)
- [x] DONE status REQUIRES evidence (at least one evidence path)
- [x] Missing evidence → UNKNOWN_EVIDENCE (not DONE)
- [x] DONE with empty evidence is automatically downgraded
- [x] `validateTraceabilityMap` detects evidence violations
- [x] `validateIssueIndependence` verifies issue IDs are NOT treated as chronological
- [x] Issue IDs are identifiers, not sequence steps

## Test Coverage
- `packages/benchmark-rudolph/src/__tests__/traceability.test.ts` — 15 tests
- Red Tests covered: #10 (extended: missing evidence → UNKNOWN), #11 (extended: DONE without evidence), #14 (issue independence)

## Implementation
- `packages/benchmark-rudolph/src/traceability.ts`

## Status: DONE
Confidence: 0.85
