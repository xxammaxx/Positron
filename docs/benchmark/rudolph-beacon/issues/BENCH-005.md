# BENCH-005 — Dry-Run Safety

## Summary
Verify that risky actions are correctly blocked by the `OpenCodeDryRunAgent` integration and that the benchmark respects kill switches.

## Acceptance Criteria

- [x] Git push → blocked in dry-run mode
- [x] `gh pr create` → blocked in dry-run mode
- [x] Git merge → blocked in dry-run mode
- [x] Git worktree add → blocked in dry-run mode
- [x] Read-only operations (git status, npm test, gh issue view) → allowed/simulated
- [x] Kill switches (`POSITRON_ENABLE_PUSH`, `POSITRON_MERGE_KILL_SWITCH`) are not bypassed
- [x] Write actions to controlled paths (`.positron/evidence/`) → simulated
- [x] Write actions outside controlled paths → blocked
- [x] Evidence names blocked actions with reasons
- [x] `npm install` → blocked

## Test Coverage
- `packages/benchmark-rudolph/src/__tests__/benchmark-runner.test.ts` — includes Red Test #12
- Red Tests covered: #12 (dry-run blocks push/PR/merge), #13 (conclusion not GREEN without evidence)

## Integration Points
- `OpenCodeDryRunAgent` from `packages/opencode-adapter`
- `DeterministicFixtureAgent` from `packages/opencode-adapter`
- `ExecutionMode` from `packages/shared`

## Status: DONE
Confidence: 0.90
