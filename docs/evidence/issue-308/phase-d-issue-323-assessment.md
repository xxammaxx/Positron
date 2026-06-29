# Issue #308 Phase D Readiness Recheck — Issue #323 Assessment

**Generated:** 2026-06-29T14:06:00+02:00
**Issue:** #323 — Decide and document pre_run/pre_push GateType applicability

## Issue #323 Context

| Field | Value |
|-------|-------|
| Number | 323 |
| State | OPEN |
| Title | Issue #308 Follow-up: Decide and document pre_run/pre_push GateType applicability |
| Risk | GREEN_SAFE or YELLOW_VALIDATE (depending on decision) |
| Type | architecture / validation |
| Priority | P2 |

### Description
`pre_run` and `pre_push` exist as GateType enum values but are NOT wired into `PHASE_GATE_REQUIREMENTS`. Before Phase D, a clear decision is needed: are these gate types applicable to Positron's pipeline, or should they be documented as future/optional?

### Acceptance Criteria
1. Explicit decision documented (YES or NO)
2. If YES: tests green for runtime wiring
3. If NO: ADR or doc explaining why not applicable
4. No UNKNOWN gate types remain

## Code Discovery

`git grep` for `pre_run|pre_push|PHASE_GATE_REQUIREMENTS` found:

- GateType enum values `pre_run` and `pre_push` exist but are NOT in `PHASE_GATE_REQUIREMENTS`
- `gate-evaluator.ts:148`: `PHASE_GATE_REQUIREMENTS` maps COMMIT→[pre_write, pre_pr], MERGE→[pre_push, pre_write], PR_CREATE→[pre_write, pre_pr], DONE→[]
- `pre_run` is used in test suite as a test gate type, not runtime-wired
- `pre_push` is in PHASE_GATE_REQUIREMENTS[MERGE] but only as array entry, no evaluator registered

## Phase-D Impact Analysis

### For Current Scope (Approval Package Only)
`pre_run`/`pre_push` are NOT applicable to an approval-package-only scope. No run, no push — nothing to gate.

### For Future Limited Probe (Option A/B)
- **No push** will occur (explicitly prohibited)
- **No real pipeline run** — only local temp workspace with no-op tools
- `pre_push` is irrelevant because push is forbidden
- `pre_run` would only matter if a full pipeline loop is executed, which is not in scope

### For Future Full Real Mode
- `pre_push` becomes relevant when push operations are possible
- `pre_run` becomes relevant when full pipeline loops are executed
- Decision should be made before those phases

## Decision

```text
ISSUE_323_PHASE_D_IMPACT: NOT_BLOCKING_IF_NO_PUSH
```

**Rationale:**
- Current scope explicitly prohibits push → `pre_push` irrelevant
- Current scope explicitly prohibits pipeline run → `pre_run` irrelevant
- Phase D limited probe (Option A/B) prohibits both push and full pipeline runs
- Must be decided before any push-capable or full-pipeline Phase D/Full Real Mode
- Can be explicitly scoped out

## Scope-Out Rule

```text
EXCLUSION: Issue #323 pre_run/pre_push GateType decisions are excluded from Phase D readiness assessment because:
1. Current scope is approval-package-only (no run, no push)
2. Candidate probe scope explicitly prohibits push and full pipeline runs
3. pre_run/pre_push only matter when actual runs/pushes occur
```

## Recommendation

Keep #323 OPEN. Priority remains P2 (architecture decision). Document as GREEN_SAFE for no-push scopes, YELLOW_VALIDATE for push-capable scopes.
