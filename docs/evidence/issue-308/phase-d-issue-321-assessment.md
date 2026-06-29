# Issue #308 Phase D Readiness Recheck — Issue #321 Assessment

**Generated:** 2026-06-29T14:06:00+02:00
**Issue:** #321 — Gate MERGE→DONE transition with evidence_required

## Issue #321 Context

| Field | Value |
|-------|-------|
| Number | 321 |
| State | OPEN |
| Title | Issue #308 Follow-up: Gate MERGE->DONE transition with evidence_required |
| Risk | YELLOW_VALIDATE |
| Type | runtime-safety |
| Priority | P1 |

### Description
MERGE→DONE phase transition uses `raw transition()` instead of `tryTransitionWithGates()`. This means DONE can be reached without evidence verification. Phase D and Full Real Mode require this to be gated.

### Acceptance Criteria
1. DONE without evidence is BLOCKED
2. Existing MERGE logic is preserved
3. Positive path: evidence present → DONE allowed
4. Negative path: evidence missing → DONE blocked
5. Tests pass for both paths

## Code Discovery

`git grep` for MERGE→DONE transition patterns found:

- `gate-enforcement.test.ts:471`: "uses raw transition for non-gated phases (no PHASE_GATE_REQUIREMENTS entry)" — confirms DONE phase has no gate requirements
- `state-machine.ts:86`: `GATE_APPROVE: ['COMMIT', 'MERGE', 'DONE']` — DONE is reachable from GATE_APPROVE
- `gate-evaluator.ts:148`: `PHASE_GATE_REQUIREMENTS` — no DONE entry exists (raw transition)

## Phase-D Impact Analysis

### For Current Scope (Approval Package Only)
Since this scope does NOT include any merge or probe execution, MERGE→DONE raw transition is **NOT BLOCKING**. No merge will happen, no DONE transition will be tested.

### For Future Limited Probe (Option A/B)
A local temp workspace probe would NOT involve any merge or DONE transition. The probe would only demonstrate:
- GatewayService routing
- Audit sink writing
- Workspace cleanup

MERGE→DONE is irrelevant for a no-merge, no-push probe.

### For Future Full Real Mode
MERGE→DONE gating becomes critical. DONE without evidence verification is a safety gap for any real pipeline run that produces a merge.

## Decision

```text
ISSUE_321_PHASE_D_IMPACT: NOT_BLOCKING_IF_NO_MERGE
```

**Rationale:**
- Current scope (approval package only): no merge, no DONE transition → NOT BLOCKING
- Future limited probe (Option A/B): no merge, no DONE transition → NOT BLOCKING
- Must be resolved before any merge-capable Phase D or Full Real Mode
- Can be explicitly scoped out: "No merge, therefore MERGE→DONE not applicable"

## Scope-Out Rule

```text
EXCLUSION: Issue #321 MERGE→DONE gating is excluded from Phase D readiness assessment because:
1. Current scope is approval-package-only (no merge)
2. Candidate probe scope explicitly prohibits merge
3. #321 must be resolved before any merge-capable real run, but is not blocking for readiness
```

## Recommendation

Keep #321 OPEN. Track as YELLOW_VALIDATE for future merge-capable phases. Do not gate Phase D approval package on #321 resolution.
