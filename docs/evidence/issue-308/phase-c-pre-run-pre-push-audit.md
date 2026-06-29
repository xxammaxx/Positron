# Issue #308 Phase C — pre_run / pre_push GateType Wiring Audit

**Generated:** 2026-06-29T10:00:00+02:00
**Mode:** Phase C Readiness Recheck — NO Real Mode

---

## Audit Scope

Determine whether `pre_run` and `pre_push` GateTypes are defined, registered, and productive-wired in the pipeline routing logic.

---

## GateType Definitions

**File:** `packages/shared/src/types.ts:190-205`

```typescript
| 'pre_run'       // line 190
| 'pre_push'      // line 192
| 'pre_merge'     // line 194
```

Both `pre_run` and `pre_push` are defined as valid `GateType` union members. All 8 gate types appear in the `ALL_GATE_TYPES` array (lines 201-205).

---

## Gate Evaluator Registration

**File:** `packages/run-state/src/gate-evaluator.ts:184-200`

`registerFakeGateEvaluators()` registers fake-PASS evaluators for all 8 gate types:

```typescript
registerGateEvaluator('pre_run', () => fakePass('pre_run'));    // line 192
registerGateEvaluator('pre_push', () => fakePass('pre_push'));  // line 194
registerGateEvaluator('pre_merge', () => fakePass('pre_merge')); // line 196
```

✅ Both `pre_run` and `pre_push` get fake evaluators registered (for test environments).

---

## PHASE_GATE_REQUIREMENTS — Critical Finding

**File:** `packages/run-state/src/gate-evaluator.ts:148-157`

```typescript
export const PHASE_GATE_REQUIREMENTS = {
    COMMIT:    ['pre_write', 'evidence_required'],
    PR_CREATE: ['pre_pr', 'evidence_required'],
    MERGE:     ['pre_merge', 'security', 'human_approval'],
    DONE:      ['evidence_required'],
};
```

**`pre_run` is NOT in `PHASE_GATE_REQUIREMENTS`.** No phase transition requires `pre_run`.

**`pre_push` is NOT in `PHASE_GATE_REQUIREMENTS`.** No phase transition requires `pre_push`.

---

## Pipeline Integration

### pre_run
- Defined as GateType: ✅ YES
- Registered by `registerFakeGateEvaluators()`: ✅ YES
- In `PHASE_GATE_REQUIREMENTS`: ❌ NO
- Wired into any phase transition: ❌ NO
- Tests for missing evaluator at pre_run: ✅ YES (gate-assembly.test.ts:365-367)

**Assessment:** `pre_run` is defined but never enforced at any pipeline phase. Its evaluator would block if required and missing (verified by test), but no phase requires it.

### pre_push
- Defined as GateType: ✅ YES
- Registered by `registerFakeGateEvaluators()`: ✅ YES
- In `PHASE_GATE_REQUIREMENTS`: ❌ NO
- Wired into any phase transition: ❌ NO
- Alternative enforcement: ✅ YES (`POSITRON_ENABLE_PUSH` env var in COMMIT handler)
- Tests for missing evaluator at pre_push: ✅ Covered by gate-assembly (all 8 types)

**Assessment:** `pre_push` is defined but never enforced via gate evaluation. Push is instead controlled by `POSITRON_ENABLE_PUSH` env variable in the COMMIT handler (`apps/server/src/index.ts:1072`). This is an alternative control mechanism that works.

---

## Is There a Push Phase?

The current pipeline design does NOT have a separate PUSH phase. Push happens inside the COMMIT phase handler:

```typescript
// apps/server/src/index.ts:1072
const pushAllowed = process.env.POSITRON_ENABLE_PUSH === 'true';
// ...
if (pushAllowed) {
    await workspace.push(...);
    pushResult = ', pushed';
} else {
    pushResult = ', push skipped (POSITRON_ENABLE_PUSH not set)';
}
```

After commit+push, the transition is directly to PR_CREATE (via `tryTransitionWithGates` with `pre_pr` and `evidence_required` gates).

---

## Test Coverage

| Test | File | Status |
|------|------|--------|
| pre_run evaluator registered | gate-assembly.test.ts:121 | ✅ PASS |
| pre_push evaluator registered | gate-assembly.test.ts:121-122 | ✅ PASS |
| pre_run missing evaluator blocks | gate-assembly.test.ts:365-367 | ✅ PASS |
| All 8 gate types in ALL_GATE_TYPES | gate-enforcement.test.ts:574-577 | ✅ PASS |
| Push blocked by POSITRON_ENABLE_PUSH | commit-policy.test.ts:107-119 | ✅ PASS |

---

## Implications for Controlled Real Probe

### pre_run
`pre_run` is NOT a blocking gap. It's defined and registrable but not required by any phase. If a future probe phase needs pre-run validation, the gate type exists and can be added to `PHASE_GATE_REQUIREMENTS`.

### pre_push
`pre_push` is NOT a blocking gap. Push is enforced by `POSITRON_ENABLE_PUSH` env var which defaults to false (push blocked). The gate type exists as a future option but is currently redundant with the env-based check.

---

## Classification

```text
PRE_RUN_PRE_PUSH_WIRING_STATUS: NOT_APPLICABLE_WITH_REASON
```

**Reason:** Both `pre_run` and `pre_push` are defined and have fake evaluators but are:
- NOT required by any phase in `PHASE_GATE_REQUIREMENTS`
- `pre_run` has no equivalent alternative enforcement
- `pre_push` is alternatively enforced by `POSITRON_ENABLE_PUSH` env var (default: blocked)

**For Controlled Real Probe:** Not blocking. Push is blocked by default via `POSITRON_ENABLE_PUSH`. `pre_run` is a future-phase gate that can be wired if needed.
