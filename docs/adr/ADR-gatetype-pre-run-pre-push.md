# ADR — GateType applicability for `pre_run` and `pre_push`

## Status

Accepted — July 2026

## Context

`pre_run` and `pre_push` are defined as valid `GateType` values in `packages/shared/src/types.ts`. Both appear in `ALL_GATE_TYPES` and have fake evaluators registered through `registerFakeGateEvaluators()` in `packages/run-state/src/gate-evaluator.ts`.

However, neither gate is currently required by any phase in `PHASE_GATE_REQUIREMENTS`.

Current canonical phase gate map (from `gate-evaluator.ts:148-157`):

```text
COMMIT    → pre_write, evidence_required
PR_CREATE → pre_pr, evidence_required
MERGE     → pre_merge, security, human_approval
DONE      → evidence_required
```

Current push control:

- Push is controlled by the `POSITRON_ENABLE_PUSH` environment variable.
- Push happens inline within the COMMIT handler.
- There is no separate PUSH phase in the pipeline.

This created an architectural ambiguity: are `pre_run` and `pre_push` applicable to Positron's pipeline now, or are they reserved for future use?

Issue #323 resolves that ambiguity.

## Decision

Adopt `pre_push` as a runtime gate for push-capable workflows.

Keep `pre_run` reserved for future use.

### `pre_push`

`pre_push` should be wired before any action that can push to a remote Git repository.

It must validate, at minimum:

- explicit owner approval,
- target branch,
- no direct push to `main`,
- push kill-switch state,
- scope boundaries,
- evidence availability,
- auditability.

Implementation may use one of two safe approaches:

1. Add `pre_push` to an appropriate phase requirement if push becomes a distinct phase or phase-level operation.
2. Evaluate `pre_push` inline in the COMMIT handler immediately before the push block.

Until implementation is completed, `POSITRON_ENABLE_PUSH` remains the hard kill-switch.

### `pre_run`

`pre_run` remains a valid but reserved `GateType`.

It is intentionally not required by any current phase.

Reason: a true pre-run gate has a bootstrapping problem. It needs to run before the pipeline starts, but the current gate system evaluates gates during pipeline phase transitions. Positron currently handles pre-run safety through the external Reality Refresh / operator approval protocol.

`pre_run` may become active later if Positron gains a native run-initialization phase or external gate evaluation layer.

## Rationale

1. `pre_push` maps to a concrete risk.

Push is one of the highest-risk operations in Positron because it can write to a remote repository. A proper gate should protect push-capable workflows with the same rigor as commit, PR creation, merge, and DONE completion.

2. `pre_run` is not a good fit for the current phase-transition gate model.

A gate that runs before the run starts needs an evaluator outside the current pipeline lifecycle. Adding it now would either be misleading or require a broader orchestration redesign.

3. The decision removes ambiguity.

No GateType remains unknown:

- `pre_push` is applicable and should be wired next.
- `pre_run` is reserved/future by design.

4. The decision supports Issue #308 readiness.

Phase-D limited probes remain supervised and push-restricted. Full Real Mode and push-capable workflows require a later `pre_push` implementation before any push permissions are expanded.

## Consequences

### Positive

- Push-capable workflows get a clear required safety direction.
- `pre_run` no longer appears accidentally forgotten; it is explicitly reserved.
- Issue #323's architecture decision requirement is satisfied.
- Future implementation can focus on `pre_push` without reopening the `pre_run` debate.

### Negative / Tradeoffs

- `pre_push` still requires a separate implementation run.
- `pre_run` remains a defined-but-unwired GateType.
- The COMMIT handler may gain additional gate evaluation complexity when `pre_push` is implemented.

## Follow-up

Required next implementation track:

- Wire `pre_push` before any remote push operation.
- Keep `POSITRON_ENABLE_PUSH` as the hard kill-switch.
- Add tests for:
  - push allowed only when `pre_push` passes,
  - missing/failed `pre_push` blocks push,
  - direct push to `main` remains blocked,
  - no push occurs without explicit owner approval.

Not required now:

- No `pre_run` implementation.
- No push enablement.
- No Real Mode authorization.
- No Phase-D probe authorization.

## Non-Goals

This ADR does not authorize:

- Real Mode,
- Phase-D probe execution,
- push enablement,
- merge automation,
- branch deletion,
- provider/MCP write expansion,
- `pre_run` wiring.
