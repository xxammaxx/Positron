# Issue #308 Phase 2 — Scope Re-Interpretation

**Generated:** 2026-06-29T08:15:00+02:00
**Mode:** READ-ONLY RECHECK — NO Real Mode

---

## Original Issue #308 Scope

From the issue body, #308 defines 4 phases:
1. **Phase 1: Gate Assembly** — Verify all safety gates work in real pipeline context
2. **Phase 2: Controlled Real Run** — Run through pipeline with gate interceptions verified
3. **Phase 3: Supervised Real Run** — Execute a safe, reviewable change with human approval
4. **Phase 4: Failure Mode Validation** — Test denial, timeout, workspace lock, missing env

## Reality Check: What Changed

Since the original issue was created:
- All 4 blockers (#215, #244, #245, #246) are now CLOSED and code is on main
- PR #218 is MERGED (GATE_APPROVE hook)
- PR #316 is MERGED (GateType enforcement)
- The safety infrastructure is significantly more mature than when #308 was written

## Re-Interpreted Phase Breakdown

### Phase A — Readiness Recheck ✅ (THIS RUN)

**Status:** CURRENT RUN

Scope:
- Reality refresh
- Blocker closure audit
- Runtime safety discovery
- Kill-switch audit
- Integration test readiness
- Local gates
- Readiness decision

Result: Evidence documents + Readiness classification.

### Phase B — Fake/Dry-Run Gate Assembly Validation 🟡 (NEXT, if ready)

**Status:** NOT YET EXECUTED

Scope (safe — no Real Mode):
- Use existing fake adapters and fake gate evaluators
- Run a test harness that exercises all gates together
- Verify GateType enforcement in dry-run pipeline
- Verify audit enforcement in controlled test
- Verify workspace cleanup lifecycle
- Verify GATE_APPROVE hook integration
- No Real-Mode Env set
- No real external tools
- No PR creation
- No merge
- No workflow changes
- No manual CI

Evidence: Gate assembly validation report, gate-by-gate test results.

### Phase C — Controlled Local Real-Mode Probe 🔴 (BLOCKED)

**Status:** REQUIRES SEPARATE OWNER APPROVAL

Must remain blocked in this run. Requires:
- Explicit owner approval for Controlled Real Mode
- `HUMAN_APPROVED_REAL=true`
- `POSITRON_ENABLE_REAL=true`
- All kill-switches verified active
- Server `onAudit` wiring completed (#245 limitation)
- `pre_run` / `pre_push` GateType wiring decision

### Phase D — Supervised Real Run 🔴 (BLOCKED)

**Status:** REQUIRES SEPARATE OWNER APPROVAL

Must remain blocked in this run. Requires Phase C completion + additional approval.

### Phase E — Failure Mode Validation 📋 (PLAN ONLY)

**Status:** NOT YET PLANNED

Topics to cover:
- Timeout scenarios
- Deny responses
- Missing environment variables
- Workspace lock conflicts
- Audit failure paths
- Missing gate evaluator
- Gate approval rejection
- Push/merge rejection
- Kill-switch active

---

## Safe/NOT Safe Boundary

| Activity | Phase B | Phase C | Phase D |
|----------|---------|---------|---------|
| Run fake adapters | ✅ | ✅ | ✅ |
| Run fake gate evaluators | ✅ | ✅ | ✅ |
| Run dry-run pipeline | ✅ | ✅ | ✅ |
| Set Real-Mode Env | ❌ | ✅ (with approval) | ✅ (with approval) |
| Execute real external tools | ❌ | ✅ (with approval) | ✅ (with approval) |
| Create real PR | ❌ | ❌ | ✅ (with approval) |
| Merge | ❌ | ❌ | ❌ |
| Run manual CI | ❌ | ❌ | ❌ |
| Modify workflows | ❌ | ❌ | ❌ |

---

## Classification

```text
ISSUE_308_SCOPE_STATUS: READY_FOR_PHASE_B
```

Phase A (this run) is complete. Phase B (fake/dry-run Gate Assembly Validation) can proceed safely with the existing fake adapters, fake gate evaluators, and dry-run infrastructure — no Real Mode required. Phase C and D remain blocked pending separate owner approval and completion of known limitations (#245 server wiring, #246 pre_run/pre_push wiring).
