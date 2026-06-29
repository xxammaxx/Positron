# Issue #308 Phase D Readiness Recheck — Follow-up / Issue Action Plan

**Generated:** 2026-06-29T14:06:00+02:00

## Immediate Actions (Owner)

### 1. Review This Evidence Set
- **What:** Review all 15 evidence documents in this recheck
- **Why:** Verify findings, classifications, and the readiness decision
- **PR:** Draft PR will be created with this evidence

### 2. Close Issue #322 (Recommended)
- **Why:** All 4 acceptance criteria met, PR #328 merged, post-merge verification clean
- **Approval needed:** `APPROVE CLOSE ISSUE 322 AS COMPLETED`
- **What happens:** Issue #322 transitions from OPEN to CLOSED

### 3. Close PR #313 as Obsolete (Recommended)
- **Why:** Stale draft (2 days), all claims superseded by 6 subsequent merged PRs
- **Approval needed:** `APPROVE CLOSE OBSOLETE PR 313`
- **What happens:** PR #313 transitions from OPEN to CLOSED

### 4. Approve Phase D Approval Package (If Decision Accepted)
- **Why:** Phase D readiness is confirmed for limited scope
- **Approval needed:** `APPROVE ISSUE 308 PHASE D APPROVAL PACKAGE ONLY`
- **What happens:** Next Positron run can create a detailed, executable probe plan

## Open Issues Status

| Issue | Current State | After #322 | Recommended Action |
|-------|--------------|------------|-------------------|
| #308 Phase D | OPEN | READY_FOR_LIMITED_APPROVAL_PACKAGE | Keep OPEN, await owner review |
| #322 onAudit Wiring | OPEN | VERIFIED on main | CLOSE (with owner approval) |
| #321 MERGE→DONE | OPEN | NOT_BLOCKING for no-merge scope | Keep OPEN, P1 for merge-capable phases |
| #323 pre_run/pre_push | OPEN | NOT_BLOCKING for no-push scope | Keep OPEN, P2 architecture decision |
| #324 Workspace Lock | OPEN | NOT_BLOCKING single-process | Keep OPEN, P2 for multi-process |
| #325 Dist Artifacts | OPEN | Tree clean, GREEN_SAFE | Keep OPEN, separate cleanup |
| #326 CodeRabbit | OPEN | NON_GATE, owner action | Keep OPEN, owner action only |

## Next Build Candidate

### Recommendation: Phase D Approval Package Finalization

If the Owner approves `APPROVE ISSUE 308 PHASE D APPROVAL PACKAGE ONLY`, the next Positron run should:

1. **Finalize the approval package** with explicit, executable steps for a controlled local temp probe
2. **Define the exact tool to route** through GatewayService
3. **Specify exact verification criteria** for audit sink, cleanup, and safety
4. **Create a copyable prompt** for the probe execution run
5. **NOT execute the probe** — only prepare the package

### After Approval Package: Controlled Local Temp Probe

Once the approval package is finalized and separately approved (`APPROVE ISSUE 308 PHASE D CONTROLLED LOCAL TEMP PROBE AFTER APPROVAL PACKAGE`):

1. Create temp workspace outside production repo
2. Route no-op tool through GatewayService with onAudit
3. Verify audit sink writes, fail-closed behavior, and cleanup
4. No GitHub writes, no push, no merge, no production repo

## Required Owner Approval Texts

| Action | Approval Text |
|--------|---------------|
| Close Issue #322 | `APPROVE CLOSE ISSUE 322 AS COMPLETED` |
| Close PR #313 | `APPROVE CLOSE OBSOLETE PR 313` |
| Phase D Approval Package | `APPROVE ISSUE 308 PHASE D APPROVAL PACKAGE ONLY` |

**None of these actions will be executed in this run.**
**Approval texts must be issued in separate, explicit Owner commands.**

## Blockers for Full Phase D Probe

| Blocker | Status | Resolution Path |
|---------|--------|----------------|
| #321 MERGE→DONE | Required before any merge-capable run | Implement evidence-gated DONE transition |
| #323 pre_run/pre_push | Required before any push-capable run | Architecture decision (ADR) |
| #324 Multi-process lock | Required before parallel runs | Persistent lockfile or advisory lock |
| GatewayService full routing | Required before all-tool-gateway | Route all tools through gateway |

## Timeline

| Phase | Status | Next Step |
|-------|--------|-----------|
| Phase A (Blocker Audit) | ✅ COMPLETE | Evidence on main |
| Phase B (Gate Assembly) | ✅ COMPLETE | 1836/1836 tests PASS |
| Phase B2 (Merge) | ✅ COMPLETE | Evidence on main |
| Phase C (Readiness) | ✅ COMPLETE | Evidence on main |
| Phase C2 (Temp Probe) | ✅ COMPLETE | Probe PASSED |
| Phase C2b (Merge) | ✅ COMPLETE | Evidence on main |
| Phase C3 (Post-Probe) | ✅ COMPLETE | Blockers split, #322 identified |
| Phase C3b (Merge) | ✅ COMPLETE | Evidence on main |
| #322 (onAudit Wiring) | ✅ COMPLETE | Code on main, tests PASS |
| #322 Phase 2 (Merge) | ✅ COMPLETE | PR #328 merged |
| **Phase D (Recheck)** | **✅ COMPLETE (this run)** | **READY_FOR_LIMITED_APPROVAL_PACKAGE** |
| Phase D (Approval Package) | ⏳ AWAITING OWNER | Next run after approval |
| Phase D (Probe) | ⏳ AWAITING PACKAGE | After approval package |

## What the Owner Should Know

1. **#322 is done.** The onAudit wiring is on main, tested, and verified. This was the critical Phase D blocker.
2. **Phase D readiness is confirmed** for a limited, no-merge, no-push approval package scope.
3. **No probe has been executed.** This run was strictly documentation, analysis, and evidence collection.
4. **Three owner actions are recommended** (see above). None are urgent — all can be reviewed at the Owner's pace.
5. **The next safe step is the approval package finalization.** This does NOT execute anything — it's a planning document.
