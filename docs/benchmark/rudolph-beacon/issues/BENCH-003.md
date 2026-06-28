# BENCH-003 — Evidence Contract

## Summary
Define and test the machine-readable evidence contract schema for benchmark runs, including secret redaction and conclusion logic.

## Acceptance Criteria

- [x] `RudolphBenchmarkRunSummary` type exists with all required fields
- [x] Result contains runId, executionMode, benchmarkIssues, tests, errors, conclusion
- [x] Result contains NO secrets (redaction tested)
- [x] Secret patterns (ghp_*, sk-*, etc.) are detected and redacted
- [x] `determineConclusionStatus` correctly classifies GREEN/YELLOW/RED/UNKNOWN
- [x] `createIssueResult` creates valid UNKNOWN_EVIDENCE defaults
- [x] `createCommandResult` creates valid command records

## Test Coverage
- `packages/benchmark-rudolph/src/__tests__/evidence-contract.test.ts` — 21 tests
- Red Tests covered: #8 (executionMode present), #9 (no fake secrets), #10 (missing evidence → UNKNOWN), #11 (DONE without evidence forbidden), #14 (no GREEN without evidence)

## Implementation
- `packages/benchmark-rudolph/src/evidence-contract.ts`

## Status: DONE
Confidence: 0.90
