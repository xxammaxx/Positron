# Issue #321 — MERGE→DONE Evidence Gate Report

## Reality Refresh

| Feld | Erwartung | Aktuell | Status |
|------|-----------|---------|--------|
| Working tree | clean | clean | PASS |
| Branch | main | main | PASS |
| HEAD | a4973846 or later | a4973846 | PASS |
| HEAD vs origin/main | synchronized | a4973846 == a4973846 | PASS |
| Issue #321 | OPEN | OPEN | PASS |
| Issue #308 | OPEN | OPEN | PASS |
| Issue #323 | OPEN | OPEN | PASS |
| Issue #324 | OPEN | OPEN | PASS |
| Open PRs | none | none (0) | PASS |
| Dangerous env vars | none | none | PASS |
| Node version | v22+ | v22.22.0 | PASS |
| npm version | 10+ | 10.9.4 | PASS |

## Scope

### Problem
MERGE→DONE transitions used raw `transition(current, 'DONE', ...)` instead of `tryTransitionWithGates()`. This bypassed the `evidence_required` gate defined in `PHASE_GATE_REQUIREMENTS.DONE: ['evidence_required']`.

### Acceptance Criteria
1. DONE without evidence is BLOCKED
2. Existing MERGE logic is preserved
3. Positive path: evidence present → DONE allowed
4. Negative path: evidence missing → DONE blocked
5. Tests pass for both paths

## Raw DONE Transition Audit

### Server (apps/server/src/index.ts) — 10 sites

| # | Line Before | Context | Action |
|---|-------------|---------|--------|
| S1 | ~1275 | No branch | Migrated to `tryTransitionWithGates` |
| S2 | ~1294 | No open PR | Migrated to `tryTransitionWithGates` |
| S3 | ~1308 | PR not open | Migrated to `tryTransitionWithGates` |
| S4 | ~1437 | Dry-run | Migrated to `tryTransitionWithGates` |
| S5 | ~1450 | Kill-switch | Migrated to `tryTransitionWithGates` |
| S6 | ~1459 | Merge not allowed | Migrated to `tryTransitionWithGates` |
| S7 | ~1468 | Status not active | Migrated to `tryTransitionWithGates` |
| S8 | ~1530 | Merge success | Migrated to `tryTransitionWithGates` |
| S9 | ~1537 | Not mergeable | Migrated to `tryTransitionWithGates` |
| S10 | ~1554 | Merge failed | Migrated to `tryTransitionWithGates` |

### Worker (apps/worker/src/pipeline-runner.ts) — 10 sites

| # | Line Before | Context | Action |
|---|-------------|---------|--------|
| W1 | ~1007 | No branch | Migrated to `tryTransitionWithGates` |
| W2 | ~1025 | No open PR | Migrated to `tryTransitionWithGates` |
| W3 | ~1030 | PR not open | Migrated to `tryTransitionWithGates` |
| W4 | ~1143 | Dry-run | Migrated to `tryTransitionWithGates` |
| W5 | ~1152 | Kill-switch | Migrated to `tryTransitionWithGates` |
| W6 | ~1162 | Merge not allowed | Migrated to `tryTransitionWithGates` |
| W7 | ~1171 | Status not active | Migrated to `tryTransitionWithGates` |
| W8 | ~1220 | Merge success | Migrated to `tryTransitionWithGates` |
| W9 | ~1227 | Not mergeable | Migrated to `tryTransitionWithGates` |
| W10 | ~1247 | Merge failed | Migrated to `tryTransitionWithGates` |

### Verified Safe (not a bypass)

| File | Line | Context | Status |
|------|------|---------|--------|
| worker/pipeline-runner.ts | ~1447 | `safeSync(..., 'DONE', ...)` | Sync label, not state transition |
| server/index.ts | ~4078 | `'DONE',` in ALL_PHASES_LIST | Array literal, not transition |

## Design

### Chosen Approach
At the top of each `case 'MERGE':` block, a single `doneGateCtx: GateEvaluationContext` is defined with `targetPhase: 'DONE'` and `gateTypes: getRequiredGates('DONE')`. All 10 DONE transitions in the block reuse this context via `tryTransitionWithGates(current, 'DONE', message, level, null, doneGateCtx)`.

### Why not `phaseRequiresGates` guard
`tryTransitionWithGates()` internally handles empty gate arrays by falling through to raw `transition()`. No guard needed — the function is self-documenting.

## Safety Behavior

| Scenario | Expected | Result | Evidence |
|---|---|---|---|
| Evidence present (fake evaluator) | DONE allowed | ok: true, phase: 'DONE' | gate-assembly.test.ts:826 |
| Evidence missing (no evaluator) | DONE blocked | ok: false, blockingFailure: evidence_required | gate-assembly.test.ts:837 |
| Gate evaluator error | DONE blocked | ok: false | gate-assembly.test.ts:519 (preexisting) |

## Tests

| Gate | Command | Exit | Result |
|---|---|---:|---|
| Whitespace | git diff --check | 0 | PASS |
| Build | npm run build | 0 | PASS |
| Typecheck (server) | npx tsc --noEmit -p apps/server/tsconfig.json | 0 | PASS |
| Typecheck (worker) | npx tsc --noEmit -p apps/worker/tsconfig.json | 0 | PASS |
| Root tests | npm test | 0 | 1692 passed (73 files) |
| Web tests | npm test --workspace apps/web | 0 | 196 passed (8 files) |
| Gate assembly | npx vitest run gate-assembly.test.ts | 0 | 48 passed |
| Gate enforcement | npx vitest run gate-enforcement.test.ts | 0 | 38 passed |
| State machine | npx vitest run state-machine.test.ts | 0 | 54 passed |
| State machine contract | npx vitest run state-machine.contract.test.ts | 0 | all passed |
| State machine property | npx vitest run state-machine.property.test.ts | 0 | all passed |
| Sandbox gate-approve | npx vitest run gate-approve.test.ts | 0 | 33 passed |
| Server gate-approve handler | npx vitest run gate-approve-handler.test.ts | 0 | 25 passed |

### New Regression Tests Added (#321-specific)

| Test | Purpose |
|------|---------|
| DONE is in PHASE_GATE_REQUIREMENTS with evidence_required | Verify gate mapping |
| DONE transition via tryTransitionWithGates with evidence passes | Positive path |
| DONE transition via tryTransitionWithGates without evidence is blocked | Negative path |
| phaseRequiresGates returns true for DONE | API correctness |
| getRequiredGates for DONE returns non-empty array | API correctness |

## Boundaries

- No Real Mode executed.
- No Phase-D probe executed.
- No merge executed.
- Issue #308 not closed.
- Issue #321 not closed.
- No push to main.
- No branch deletion.
- No workflow changes.
- No secrets.
- No `.env` read.
- No remote CI intentionally triggered.

## Files Changed

| File | Lines |
|------|-------|
| apps/server/src/index.ts | +21 / -21 |
| apps/worker/src/pipeline-runner.ts | +21 / -21 |
| packages/run-state/src/__tests__/gate-assembly.test.ts | +52 |

## Risks

| Risiko | Status | Empfehlung |
|--------|--------|------------|
| `doneGateCtx.phase` uses `current.phase` at context creation | Safe — always MERGE at that point | No action needed |
| Fake evaluator required for tests to pass | `registerFakeGateEvaluators()` already covers this | Already handled |
| Dist files not regenerated | Pre-existing pattern | Follow dist artifact hygiene (#325) |

## Next Step

PR created for Issue #321. Owner review required before merge.
