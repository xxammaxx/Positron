# Traceability Contract — Rudolph Beacon

## Purpose
Every benchmark claim must be traceable to specific tests, source files, and evidence artifacts. No claim without evidence.

## Traceability Map Schema

```json
{
  "benchmark": "rudolph-beacon",
  "issues": {
    "BENCH-001": {
      "spec": "docs/benchmark/rudolph-beacon/issues/BENCH-001.md",
      "tests": ["packages/benchmark-rudolph/src/__tests__/beacon-domain.test.ts"],
      "files": ["packages/benchmark-rudolph/src/beacon-domain.ts"],
      "evidence": [".positron/evidence/test-run-001-fixture-BENCH-001.json"],
      "status": "DONE",
      "confidence": 0.95
    }
  }
}
```

## Enforcement Rules

### Rule 1: DONE Requires Evidence
A benchmark issue MUST NOT have status `DONE` if `evidencePaths` is empty.
Violation → automatically downgraded to `UNKNOWN_EVIDENCE`.

### Rule 2: Issue Independence
Issue IDs (BENCH-001, BENCH-002, ...) are identifiers, NOT sequential steps.
BENCH-003 may be DONE while BENCH-001 is UNKNOWN_EVIDENCE.
This prevents "batch processing" where all issues are marked identically without individual evaluation.

### Rule 3: Confidence > 0
A DONE issue with `confidence: 0` is invalid. Confidence of 0 means no evidence exists.

### Rule 4: BLOCKED Issues Document Blockers
A BLOCKED issue must have evidence documenting what blocked it.

## Validation
The `validateTraceabilityMap()` function enforces these rules programmatically.
The `validateIssueIndependence()` function checks that issues are not batch-processed.

## Traceability File
The live traceability map is maintained at:
`docs/benchmark/rudolph-beacon/traceability-map.json`
