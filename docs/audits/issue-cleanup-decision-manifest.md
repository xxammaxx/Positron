# Issue Cleanup Decision Manifest

## Mode: DRY_RUN_DECISION_AUDIT
## Date: 2026-06-23

---

## Summary

| Risk Class | Count | Notes |
|-----------|-------|-------|
| GREEN_SAFE | 5 | Issues #243, #248, #250, #268, #279 — all correctly open, no action needed |
| YELLOW_REVIEW | 6 | Issues #211, #215, #224, #229, #249, #251 — need human review before any action |
| RED_HOLD | 4 | Issues #244, #245, #246, #247 — explicitly require owner approval |
| UNKNOWN | 0 | No issues with insufficient information |
| **Total** | **15** | All open issues analyzed |

---

## GREEN_SAFE — 5 Actions (all NO_ACTION)

These issues are correctly open, well-scoped, and require no changes.

### ACT-002: Issue #268 — CI Recovery tracker
- **Type:** NO_ACTION
- **Confidence:** 0.95
- **Evidence:** Workflow YAML correct; root cause is runner quota (infrastructure). Known limitations doc confirms.
- **Recommendation:** DO_NOT_APPLY — active tracker, keep open.

### ACT-003: Issue #279 — Replacement rebuild
- **Type:** NO_ACTION
- **Confidence:** 0.95
- **Evidence:** Chain analysis documented. Main stable at 917/917 tests.
- **Recommendation:** DO_NOT_APPLY — active task, keep open.

### ACT-001: Issue #243 — Vibe-Coding Baseline epic
- **Type:** NO_ACTION
- **Confidence:** 0.95
- **Evidence:** ADR-001, type definitions, sub-issues correctly structured.
- **Recommendation:** DO_NOT_APPLY — active epic, keep open.

### ACT-004: Issue #248 — LivingEvidencePortfolio display
- **Type:** NO_ACTION
- **Confidence:** 0.92
- **Evidence:** Type exists in shared/types.ts. No implementation yet.
- **Recommendation:** DO_NOT_APPLY — well-scoped SAFE task, keep open.

### ACT-005: Issue #250 — CT-120 Smoke Test
- **Type:** NO_ACTION
- **Confidence:** 0.90
- **Evidence:** 10 routes documented, Playwright exists, no CT-120 test.
- **Recommendation:** DO_NOT_APPLY — well-scoped SAFE task, keep open.

---

## YELLOW_REVIEW — 6 Actions (all COMMENT_ONLY or deferred)

These issues need human review. No automatic action is safe.

### ACT-008: Issue #229 — Superseded by #279
- **Type:** COMMENT_ONLY
- **Confidence:** 0.92
- **Why not automatic:** 13 dependent PRs still open. Cannot close issue until PRs are resolved.
- **Recommendation:** DO_NOT_APPLY — add comment linking to #279.

### ACT-006: Issue #215 — PR #218 MERGEABLE but unmerged
- **Type:** COMMENT_ONLY
- **Confidence:** 0.72
- **Why not automatic:** Code exists in PR #218 but not on main. "Task Completed" comment is misleading.
- **Recommendation:** DO_NOT_APPLY — owner must decide: merge PR or close it.

### ACT-009: Issue #211 — Partially done by #252
- **Type:** COMMENT_ONLY
- **Confidence:** 0.68
- **Why not automatic:** Overlap with #252 (recently closed). Remaining scope unclear.
- **Recommendation:** DO_NOT_APPLY — consolidate with #252, clarify remaining scope.

### ACT-007: Issue #224 — PR #228 CONFLICTING
- **Type:** COMMENT_ONLY
- **Confidence:** 0.70
- **Why not automatic:** Depends on #279 rebuild decision. PR is stale.
- **Recommendation:** DO_NOT_APPLY — wait for #279 path decision.

### ACT-010: Issue #249 — Owner decision needed
- **Type:** COMMENT_ONLY
- **Confidence:** 0.55
- **Why not automatic:** Architectural decision required for auto-population strategy.
- **Recommendation:** DO_NOT_APPLY — cannot proceed without owner decision.

### ACT-011: Issue #251 — Depends on #279
- **Type:** COMMENT_ONLY
- **Confidence:** 0.50
- **Why not automatic:** Documenting #229 endpoints that may change in #279 is wasted work.
- **Recommendation:** DO_NOT_APPLY — defer until #279 clarifies API surface.

---

## RED_HOLD — 4 Actions (all NO_ACTION)

These issues explicitly require owner approval. MUST NOT be touched.

### ACT-012: Issue #244 — Runtime Workspace Cleanup
- **Risk:** Workspace data loss, race conditions
- **Blocked by:** Owner approval required
- **Recommendation:** DO_NOT_APPLY

### ACT-013: Issue #245 — Enforce requiresAuditLog
- **Risk:** Wrong enforcement could break tool gateway
- **Blocked by:** Owner approval required
- **Recommendation:** DO_NOT_APPLY

### ACT-014: Issue #246 — Enforce GateType Layers
- **Risk:** Could block legitimate pipelines
- **Blocked by:** Owner approval required
- **Recommendation:** DO_NOT_APPLY

### ACT-015: Issue #247 — Trace and Eval Aggregation
- **Risk:** Performance impact, data collection issues
- **Blocked by:** Owner approval required
- **Recommendation:** DO_NOT_APPLY

---

## UNKNOWN — 0 Actions

No issues have insufficient information for classification.

---

## Proposed New Issues: 0

No new issues are proposed. All current gaps are tracked by existing open issues (#211, #268, #279).

---

## Closed Issues Audit

All 157 closed issues were spot-checked. No closed issues require reopening. The 3 NOT_PLANNED issues (#205, #206, #209) are correctly classified.
