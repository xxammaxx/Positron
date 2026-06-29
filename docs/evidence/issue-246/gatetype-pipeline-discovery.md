# Issue #246 — GateType / Pipeline Discovery

## Timestamp
2026-06-29T07:25:00Z

## Summary

GateType, GateResult, and GateLayerResult are **NOT defined** anywhere in the current codebase. The issue references lines 299-333 of `types.ts`, but the current file has only 179 lines. These types need to be created as part of #246 implementation.

The state machine and pipeline loops currently use raw `transition()` calls without any gate evaluation. The MERGE phase has manually coded gate checks (hardcoded, not using a GateType abstraction), but no other phase does.

## Type Definitions — Current State

### `packages/shared/src/types.ts` (179 lines)
- Defines: `Phase` (28 values), `TerminalPhase`, `FailurePhase`, `RunStatus`, `AutonomyLevel`, `EventLevel`, `PositronLabel`
- Has: `ALL_PHASES`, `isValidPhase()`, `isTerminalPhase()`, `isFailurePhase()`, `parsePhase()`, `parseRunStatus()`, `PHASE_LABELS`, `safeJsonParse()`
- **MISSING**: `GateType`, `GateResult`, `GateLayerResult`

### `packages/shared/src/interfaces.ts` (368 lines)
- Database interfaces, GitHub adapter interfaces, Git workspace interfaces
- **MISSING**: Gate-related interfaces

### `packages/shared/src/local-gate-runner.ts`
- Defines `LocalGateResult`, `LocalGateReport` — these are for local build/test gates, NOT the same as the runtime GateType system

## State Machine — Current State

### `packages/run-state/src/state-machine.ts` (391 lines)
- `VALID_TRANSITIONS` — Map of Phase → allowed next phases
- `transition()` — Raw transition, checks VALID_TRANSITIONS only, no gate evaluation
- `canTransition()` — Boolean check on phase validity
- `createRun()` — Creates new RunState
- `markFailed()` — Creates failure states
- `retry()` — Retry from FAILED_TRANSIENT
- `resumeFromEvents()` — Resume from event history
- `isTerminalPhase()` — Terminal phase check
- `isFailurePhase()` — Failure phase check
- **#244 additions**: `WorkspaceCleanupFn`, `registerWorkspaceCleanup()`, `runCleanup()`, `getWorkspaceCleanupFn()`
- **MISSING**: GateType, GateEvaluator registry, evaluateGates, tryTransitionWithGates, PHASE_GATE_REQUIREMENTS

### `packages/run-state/src/index.ts` (33 lines)
- Exports: `VALID_TRANSITIONS`, `createRun`, `canTransition`, `transition`, `markFailed`, `retry`, `resumeFromEvents`, `isTerminalPhase`, `isFailurePhase`, cleanup functions
- **MISSING**: Gate-related exports

### GATE_APPROVE Integration
- `GATE_APPROVE` is a valid Phase in VALID_TRANSITIONS with transitions to: `['COMMIT', 'MERGE', 'DONE']`
- The server pipeline checks signals at each loop iteration, and `GATE_APPROVE` can be entered via the gate-approve hook

### CLEANUP Integration
- `CLEANUP` is a valid Phase, terminal
- Transitions from: `DONE`, `FAILED_BLOCKED`, `FAILED_UNSAFE`
- Triggers `runCleanup()` in both server and worker pipelines

## Gate Approve Hook — Current State

### `packages/sandbox/src/gate-approve.ts` (189 lines)
- `GateApproveInput` — Extends StopAskRequest with optional runId
- `GateApproveResult` — Structured result with allowed, decision, risk, reason, category, humanApprovalRequired, requiredEvidence, nextPhase, events
- `gateApproveAction()` — Evaluates through Stop/Ask policy, returns structured result
- This is a **complementary** system to what #246 needs. #246's GateType enforcement is a **pre-transition** gate, while gateApproveAction is a **per-action** policy hook.

## Tool Gateway

### `packages/tool-gateway/`
- Has `requiresAuditLog` enforcement from #245
- Has test annotation: "No GateType layer enforcement (#246 excluded)"
- Acknowledges #246 is not yet implemented

## Server Pipeline

### `apps/server/src/index.ts`
- `executePhase()` — Handles each phase with raw `transition()` calls
- `runFullPipeline()` — Main loop (max 20 steps), signal checking (abort/paused/resume/retry), fix-loop
- MERGE phase has hardcoded gate checks (Auto-Merge, Kill-Switch, Run Status, Test Evidence, Branch, PR Open, Mergeable) — these are NOT using GateType abstraction
- All transitions use raw `transition()` with no gate evaluation

## Worker Pipeline

### `apps/worker/src/pipeline-runner.ts` (1498 lines)
- `executePhase()` — Mirror of server's phase executor with raw `transition()` calls
- `runPipeline()` — Main loop (max 20 steps), signal checking, fix-loop
- MERGE phase has hardcoded gate checks — same pattern as server
- All transitions use raw `transition()` with no gate evaluation

## Existing Tests

### `packages/run-state/src/__tests__/`
- `smoke.test.ts` — Basic smoke test
- `state-machine.contract.test.ts` — Contract tests
- `state-machine.property.test.ts` — Property-based tests
- `state-machine.test.ts` — Unit tests for state machine
- **MISSING**: Gate enforcement tests, GateEvaluator tests

## File Classification

### GREEN_SAFE (can be freely modified for #246)
| File | Reason |
|------|--------|
| `packages/shared/src/types.ts` | Add GateType, GateResult, GateLayerResult types |
| `packages/run-state/src/state-machine.ts` | Add GateEvaluator registry, evaluateGates, tryTransitionWithGates, PHASE_GATE_REQUIREMENTS |
| `packages/run-state/src/index.ts` | Export new gate functions |
| `packages/run-state/src/__tests__/gate-enforcement.test.ts` | New test file |
| `docs/evidence/issue-246/*` | Evidence documents |

### YELLOW_REVIEW (needs careful integration)
| File | Reason |
|------|--------|
| `apps/server/src/index.ts` | Wire gated transitions at COMMIT, PR_CREATE, MERGE, DONE phases |
| `apps/worker/src/pipeline-runner.ts` | Same wiring in worker pipeline |
| `packages/shared/src/interfaces.ts` | May need GateContext type |

### RED_HOLD (must NOT be modified)
| File | Reason |
|------|--------|
| `apps/web/*` | UI scope — #246 explicitly excludes |
| `.github/workflows/*` | Workflow scope excluded |
| `packages/sandbox/src/gate-approve.ts` | #215 work — complement, don't modify |
| `packages/sandbox/src/stop-ask-policy.ts` | #215 work — complement |
| `packages/tool-gateway/*` | #245 work — complement, annotation acknowledges #246 needed |

## Classification

**ISSUE_246_DISCOVERY_STATUS: COMPLETE**

All relevant code has been scanned. GateType, GateResult, GateLayerResult are not defined anywhere. The state machine has no gate evaluation. Both server and worker pipelines use raw transitions. The MERGE phase has ad-hoc gate checks that would benefit from the GateType abstraction. All prerequisite types (#215 GATE_APPROVE, #244 cleanup, #245 audit log) are in place and will be preserved.
