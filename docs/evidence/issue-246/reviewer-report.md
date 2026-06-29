# Issue #246 — Reviewer Report

## Implementation Summary

This PR implements runtime enforcement of GateType layers in the pipeline loop, as specified in Issue #246. The 8 GateTypes (pre_run, pre_write, pre_push, pre_pr, pre_merge, evidence_required, security, human_approval) are now runtime-enforced before phase transitions.

## Key Changes

### 1. GateType Definitions (`packages/shared/src/types.ts`)
- Added `GateType` union type with 8 values
- Added `ALL_GATE_TYPES` constant array
- Added `GateResult` and `GateLayerResult` interfaces

### 2. Gate Evaluator System (`packages/run-state/src/gate-evaluator.ts` — NEW)
- `GateEvaluatorFn` type for evaluator functions
- `registerGateEvaluator()` / `clearGateEvaluators()` / `hasGateEvaluator()` for registry management
- `registerFakeGateEvaluators()` for explicit fake mode registration
- `evaluateGates()` — evaluates all required gates with structured results
- `tryTransitionWithGates()` — gated transition that blocks on failure
- `PHASE_GATE_REQUIREMENTS` — maps target phases to required gate types
- `getRequiredGates()` / `phaseRequiresGates()` — helper functions

### 3. Pipeline Wiring
- Server (`apps/server/src/index.ts`): Gated transitions at VERIFY→COMMIT, COMMIT→PR_CREATE, PR_CREATE→MERGE
- Worker (`apps/worker/src/pipeline-runner.ts`): Same gate wiring
- Both register fake evaluators at startup

### 4. Tests (`gate-enforcement.test.ts` — NEW)
- 38 tests covering all gate enforcement scenarios
- Security invariants: security fail cannot be overridden by human approval
- Missing evaluator → blocking failure (no fake PASS)
- All phase mappings verified

## Reviewer Checklist

- [x] Was #246 narrowly implemented? **YES** — only GateType enforcement, no scope creep
- [x] Was PR #255 used only as reference? **YES** — PR #255 CLOSED, not merged, not modified
- [x] Was no #308 Real Mode executed? **YES** — no real mode env vars set
- [x] Is missing evaluator treated as BLOCK, not PASS? **YES** — tested
- [x] Is security fail not overridden by human approval? **YES** — tested and code-enforced
- [x] Are gate failures enforced before transitions? **YES** — tryTransitionWithGates blocks
- [x] Are #215/#244/#245 preserved? **YES** — no changes to those modules
- [x] Are tests green? **YES** — 1597/1597 pass
- [x] Is security audit clean? **YES** — 20/20 checks pass
- [x] Is the PR merge-ready after review? **YES** — pending owner review

## Files Changed
```
packages/shared/src/types.ts              (+35 lines)
packages/shared/src/interfaces.ts         (+15 lines)
packages/run-state/src/gate-evaluator.ts  (NEW, ~300 lines)
packages/run-state/src/index.ts           (+11 lines)
packages/run-state/src/__tests__/gate-enforcement.test.ts (NEW, ~380 lines)
apps/server/src/index.ts                  (+30 lines)
apps/worker/src/index.ts                  (+3 lines)
apps/worker/src/pipeline-runner.ts        (+30 lines)
docs/evidence/issue-246/*                 (NEW, 11 files)
```
