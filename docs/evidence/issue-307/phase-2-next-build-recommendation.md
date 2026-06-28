# Phase 2 Next Build Recommendation — Issue #307

**Timestamp:** 2026-06-27T14:00:00Z

## Candidate Evaluation

### 1. #306 — Backlog Hygiene: Milestones, labels, taxonomy

- **Risk:** GREEN_SAFE
- **Type:** documentation/organization
- **Rationale:** After #307 Docs Sync, the next natural step is organizing the repository governance. Milestones, labels, and taxonomy are the foundation for systematic issue management. This is purely organizational, no code risk.
- **Effort:** LOW (label management, milestone creation, taxonomy document)
- **Dependencies:** None
- **Urgency:** MEDIUM (improves repo navigability)

### 2. #305 — Evidence Portfolio: Automate post-run capability updates

- **Risk:** GREEN_SAFE
- **Type:** automation/documentation
- **Rationale:** Automates the capability/limitation update process that #307 performed manually. Would prevent future documentation drift.
- **Effort:** MEDIUM (automation script, integration with evidence flow)
- **Dependencies:** Requires understanding of evidence structure (now documented in evidence-index.md)
- **Urgency:** MEDIUM (prevents regressions in documentation freshness)

### 3. #304 — Playwright tracing lifecycle flake

- **Risk:** YELLOW
- **Type:** bug fix / E2E stability
- **Rationale:** E2E tracing instability affects CI quality. Technical depth required to debug Playwright tracing lifecycle.
- **Effort:** MEDIUM-HIGH (debugging flaky E2E behavior)
- **Dependencies:** None
- **Urgency:** MEDIUM (advisory-only for now)

### 4. #248 — Display LivingEvidencePortfolio in Operator Dashboard

- **Risk:** GREEN_SAFE
- **Type:** UI enhancement
- **Rationale:** Makes evidence visible in the operator dashboard. User-facing improvement.
- **Effort:** MEDIUM (React component, data integration)
- **Dependencies:** Evidence portfolio structure (now documented)
- **Urgency:** LOW (nice-to-have)

### 5. #251 — API overview #229 endpoint sync

- **Risk:** GREEN_SAFE
- **Type:** documentation
- **Rationale:** Continues documentation work from #307. Full expansion of API endpoints.
- **Effort:** MEDIUM (researching #229 endpoints, documenting)
- **Dependencies:** Understanding of #229 architecture
- **Urgency:** LOW (api-overview has limited sync from #307)

## Recommendation

### PRIMARY: **#306 — Backlog Hygiene**

**Begründung:** After #307 documentation sync, the repo is clean but disorganized. #306 addresses milestones, labels, and taxonomy — the organizational foundation for all future issues. It is GREEN_SAFE, has no dependencies, and improves repo governance immediately. After #306, all new issues can be properly labeled, assigned to milestones, and categorized.

### SECONDARY: **#305 — Evidence Portfolio Automation**

**Begründung:** The documentation sync performed in #307 is now complete, but the process was manual. #305 automates this to prevent future drift. Combined with #306 (Backlog Hygiene), these two issues would put the repo in a strong organizational and automation position.

### For consideration after:
- **#304** if E2E quality is the priority
- **#248** if visible UI progress is desired
- **#251** if documentation expansion continues

## Recommendation Table

| Priority | Issue | Title | Risk | Rationale |
|----------|-------|-------|------|-----------|
| 1 | #306 | Backlog Hygiene | GREEN_SAFE | Foundation for repo governance |
| 2 | #305 | Evidence Portfolio Automation | GREEN_SAFE | Prevents documentation drift |
| 3 | #304 | E2E Tracing Flake Fix | YELLOW | Improves CI quality |
| 4 | #248 | LivingEvidencePortfolio UI | GREEN_SAFE | Visible user improvement |
| 5 | #251 | API Overview Expansion | GREEN_SAFE | Documentation continuity |
