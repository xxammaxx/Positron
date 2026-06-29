# Issue #308 Phase C — MERGE→DONE Transition Audit

**Generated:** 2026-06-29T10:00:00+02:00
**Mode:** Phase C Readiness Recheck — NO Real Mode

---

## Audit Scope

Determine whether MERGE→DONE uses gated transition (`tryTransitionWithGates`) or raw transition (`transition`), and whether evidence requirements are enforced.

---

## State Machine Definition

**File:** `packages/run-state/src/state-machine.ts:78`

```typescript
VALID_TRANSITIONS = {
    // ...
    MERGE: ['DONE'],
    // ...
};
```

MERGE → DONE is a valid transition.

---

## PHASE_GATE_REQUIREMENTS for DONE

**File:** `packages/run-state/src/gate-evaluator.ts:148-157`

```typescript
PHASE_GATE_REQUIREMENTS = {
    // ...
    DONE: ['evidence_required'],
};
```

DONE requires `evidence_required` gate. This gate should ensure evidence artifacts exist before marking a run as DONE.

---

## Server Pipeline: MERGE→DONE Usage

**File:** `apps/server/src/index.ts` — the `runPhase()` function handles the `MERGE` case:

All 6 DONE transitions from MERGE use raw `transition()`:

| Line | Scenario | Function Used |
|------|----------|---------------|
| 1270 | No branch → DONE | `transition(current, 'DONE', ...)` |
| 1289 | No open PR → DONE | `transition(current, 'DONE', ...)` |
| 1303 | PR not open → DONE | `transition(current, 'DONE', ...)` |
| 1432 | Dry-run result → DONE | `transition(current, 'DONE', ...)` |
| 1445 | Kill-switch active → DONE | `transition(current, 'DONE', ...)` |
| 1549 | Merge failed → DONE | `transition(current, 'DONE', ...)` |

**None of these use `tryTransitionWithGates()`.**

The `evidence_required` gate defined in `PHASE_GATE_REQUIREMENTS['DONE']` is NEVER evaluated during MERGE→DONE transitions.

---

## Gated Transition Pattern (for comparison)

For COMMIT, PR_CREATE, and MERGE entry, the server uses:

```typescript
if (phaseRequiresGates('MERGE')) {
    result = tryTransitionWithGates(current, 'MERGE', ...);
} else {
    result = transition(current, 'MERGE', ...);
}
```

But for DONE, there is NO equivalent check. The `phaseRequiresGates('DONE')` check is never performed.

---

## Worker Pipeline

**File:** `apps/worker/src/pipeline-runner.ts`

The worker has similar patterns — MERGE→DONE uses raw `transition()`.

---

## Is This a Real Gap?

### When MERGE executes fully:
If merge is actually performed (real mode only, with all env vars set), the pipeline transitions to DONE, bypassing the `evidence_required` gate.

### When merge is skipped (no-merge scenario):
The controlled probe scope for #308 explicitly prohibits merge. In a no-merge scenario:
- The pipeline would never reach the MERGE phase
- PR_CREATE → DONE would be the actual transition path
- PR_CREATE → DONE is also not explicitly gated for `evidence_required` (PHASE_GATE_REQUIREMENTS only gates entry INTO DONE, not from specific sources)

### Can DONE be reached without evidence?
Yes. Both `transition()` (raw) and `tryTransitionWithGates()` (gated but never called for DONE) allow DONE without the `evidence_required` gate. However, the `evidence_required` gate is a run-state gate that would need an evaluator registered for it — currently only the fake evaluator exists.

---

## Assessment

| Question | Answer |
|----------|--------|
| MERGE→DONE uses raw `transition()`? | ✅ YES — all 6 paths |
| `evidence_required` checked before DONE? | ❌ NO — never called via `tryTransitionWithGates` |
| Manual gate logic covers this? | ❌ NO — no manual evidence gate |
| Can DONE be reached without evidence? | ✅ YES |
| Can DONE after merge proceed without final gate? | ✅ YES |
| Relevant for Controlled Real Probe? | ⚠️ PARTIAL — only if probe design includes transition to DONE |
| Must Phase C create fix issue? | ✅ YES — for future real-mode safety |

---

## Classification

```text
MERGE_DONE_TRANSITION_STATUS: ACCEPTABLE_FOR_NO_MERGE_PROBE
```

**Justification:**
- The controlled probe scope for #308 explicitly prohibits merge.
- Without merge, the MERGE→DONE path is never exercised.
- For a local temp workspace probe, the pipeline would end before MERGE.
- However, for any future real-mode run that includes merge: **this is a gap** that needs a dedicated fix issue.

**Rule applied:** Since #308 Non-Scope says "No merge", MERGE→DONE raw transition does NOT block. But a follow-up issue to add `tryTransitionWithGates` for all DONE transitions is recommended.

**Note:** Even without merge, the PR_CREATE→DONE path (for PR-only runs) should ideally be gated, but this is a separate consideration for a future enhancement.
