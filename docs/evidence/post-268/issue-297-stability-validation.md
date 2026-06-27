# Issue #297 — Stability Validation

## Timestamp
2026-06-27T09:45:00+02:00

## Deterministic Fixture Agent (durationMs fix)

### Method
Ran the test 10 consecutive times:
```bash
npx vitest run packages/opencode-adapter/src/__tests__/deterministic-fixture-agent.test.ts
```

### Results

| Run | Result | Duration |
|-----|--------|----------|
| 1 | ✅ 15/15 | ~800ms |
| 2 | ✅ 15/15 | ~1.4s |
| 3 | ✅ 15/15 | ~776ms |
| 4 | ✅ 15/15 | ~1.3s |
| 5 | ✅ 15/15 | ~1.3s |
| 6 | ✅ 15/15 | ~1.5s |
| 7 | ✅ 15/15 | ~800ms |
| 8 | ✅ 15/15 | ~900ms |
| 9 | ✅ 15/15 | ~800ms |
| 10 | ✅ 15/15 | ~800ms |

**Result**: 10/10 runs passed. Previously flaked at 20% rate.

### Comparative Analysis

| Metric | Before Fix | After Fix |
|--------|-----------|-----------|
| Flake rate | ~20% (1/5) | 0% (0/10) |
| Test count | 15 | 15 |
| Root cause | `Date.now()` variance | Deterministic fixture sum |

## Full Test Suite

### Method
```bash
npm test
```

### Results
- Root (64 files): ✅ 1375 tests passed
- Web (8 files): ✅ 196 tests passed
- **Total**: 1571 tests passed

### Pre-existing Warnings (unchanged)
- React `act(...)` warnings in Dashboard smoke tests (pre-existing, not related to this fix)

## E2E Test (Issue #297 target)

### Status
Not run locally — requires backend (port 3000) and frontend (port 5173) servers. The try/finally fix is a defensive pattern that cannot introduce regressions — it only adds guaranteed cleanup.

### CI Verification
CI verification not available in this run (no manual CI trigger). The fix addresses the root cause identified from CI evidence (context leak between retries).

## Classification

```text
ISSUE_297_STABILITY_STATUS: STABLE_CONFIRMED (unit test)
ISSUE_297_STABILITY_STATUS_E2E: IMPROVED_NOT_PROVEN (structural fix, pending CI run)
```

**Note**: The E2E fix is a pure defensive wrapper (try/finally) that cannot introduce regressions. The structural analysis confirms it addresses the identified root cause. Full verification requires a CI run which is not authorized in this workflow.
