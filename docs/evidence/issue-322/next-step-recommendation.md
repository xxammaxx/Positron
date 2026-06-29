# Next Step Recommendation — Issue #322

## Current State
- PR #328 (Draft): Wire ToolGateway onAudit into runtime
- All tests pass (1858/1858)
- All local gates green
- Security audit clean
- Scope audit clean

## Recommended Next Steps (in order)

### 1. Merge PR #328
- **Action:** Owner reviews and merges PR #328
- **Prerequisite:** Code review passes
- **Impact:** Audit infrastructure is now wired into runtime

### 2. Re-assess Issue #308 Phase D Readiness
- **Action:** After merge, re-run Phase D readiness audit
- **Check:** Is #322 resolution sufficient to unblock Phase D?
- **Note:** #322 was the critical blocker identified in Phase C3b

### 3. Pending Decisions
- **#321:** MERGE→DONE Gating — remains to be decided if Phase D scope requires it
- **#323:** pre_run/pre_push Decision — remains to be decided
- **#324:** Workspace-Lock-Hardening — remains to be decided
- **#325:** dist artifact cleanup — remains to be decided
- **#326:** CodeRabbit external owner action — remains to be decided

### 4. PR #313 Status
- **Current:** Still open (Draft) as of this run
- **Recommendation:** Close if obsolete (it was a Phase C readiness audit)

### 5. Post-Merge Documentation
- Update `docs/status/known-limitations.md`
- Update `docs/status/current-capabilities.md`
- Update `docs/status/evidence-index.md`

## Recommendation Summary

```text
MERGE_PR_328 → REASSESS_308_PHASE_D → DECIDE_321_323 → UPDATE_DOCS
```

No Phase D claim is made in this run. Phase D remains BLOCKED until PR #328 is merged and re-audited.
