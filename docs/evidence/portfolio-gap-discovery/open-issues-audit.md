# Portfolio Gap Discovery — Open Issues Audit

## Summary

14 open issues total. All read in full.

## Per-Issue Classification

### #304 — Post-299: Stabilize Playwright tracing lifecycle in E2E tests
- **Type:** Bug fix / Test reliability
- **Labels:** bug, qa, testing, approval:not-required
- **Updated:** 2026-06-27
- **Covers:** E2E tracing fix (specific to Playwright config conflict)
- **Classification:** GREEN_BUILD
- **Note:** Clear, scoped, actionable. Already has root cause analysis. READY for implementation.
- **Dedupe:** NOT a duplicate. Specific to the tracing.start double-start issue distinct from #297 (timing flake).

### #251 — Update api-overview.md with All Issue #229 Endpoints
- **Type:** Documentation
- **Labels:** documentation, P2, approval:not-required
- **Updated:** 2026-06-17
- **Covers:** API documentation sync
- **Classification:** GREEN_BUILD
- **Note:** Safe documentation task. Scope: add #229 endpoints to api-overview.md. But note: api-overview.md is STALE overall (see repo-docs-audit). This issue may need scope expansion to cover all post-v0.1.0 endpoints.

### #250 — Add CT-120 Browser Evidence Smoke Test for All Dashboard Routes
- **Type:** Testing / QA
- **Labels:** P2, qa, testing, frontend, approval:not-required
- **Updated:** 2026-06-17
- **Covers:** Browser-based smoke testing
- **Classification:** GREEN_BUILD
- **Note:** Safe E2E smoke test addition. Prerequisite: Playwright tracing fix (#304) to avoid false failures.

### #249 — Auto-Populate Infrastructure State Stores on Server Startup
- **Type:** Feature / Architecture
- **Labels:** infrastructure, architecture, P1, approval:decision-needed
- **Updated:** 2026-06-17
- **Covers:** State store initialization
- **Classification:** YELLOW_VALIDATE
- **Note:** Needs decision before implementation. Has `approval:decision-needed` label.

### #248 — Display LivingEvidencePortfolio in Operator Dashboard
- **Type:** Feature / UI
- **Labels:** enhancement, P1, frontend, ui, approval:not-required
- **Updated:** 2026-06-17
- **Covers:** Evidence portfolio UI rendering
- **Classification:** GREEN_BUILD
- **Note:** Good low-risk feature. Already has approval:not-required. Covers Gap #5 (Portfolio update loop) partially — display aspect only, not automation.

### #247 — Add Trace and Eval Aggregation to runFullPipeline
- **Type:** Feature / Architecture
- **Labels:** enhancement, architecture, P1, approval:required
- **Updated:** 2026-06-17
- **Covers:** Trace/eval aggregation runtime
- **Classification:** YELLOW_VALIDATE
- **Note:** Needs owner approval. Part of the feedback flywheel.

### #246 — Enforce GateType Layers in Pipeline Loop
- **Type:** Safety / Runtime
- **Labels:** enhancement, architecture, P0, approval:required
- **Updated:** 2026-06-18
- **Covers:** GateType runtime enforcement
- **Classification:** YELLOW_VALIDATE
- **Note:** Critical safety feature. P0 but needs approval.

### #245 — Enforce requiresAuditLog in Tool Gateway Runtime
- **Type:** Safety / Runtime
- **Labels:** enhancement, architecture, P0, approval:required
- **Updated:** 2026-06-18
- **Covers:** Audit log enforcement
- **Classification:** YELLOW_VALIDATE
- **Note:** Critical safety feature. P0 but needs approval.

### #244 — Implement Runtime Workspace Cleanup for GitWorkspaceAdapter
- **Type:** Safety / Runtime
- **Labels:** enhancement, architecture, P0, approval:required
- **Updated:** 2026-06-18
- **Covers:** Workspace cleanup/locking
- **Classification:** YELLOW_VALIDATE
- **Note:** Critical isolation feature. P0 but needs approval.

### #243 — Agentic/Vibe-Coding Baseline 2026
- **Type:** Epic / Architecture
- **Labels:** enhancement, architecture, epic
- **Updated:** 2026-06-18
- **Covers:** Multi-phase orchestrator capabilities (worktrees, MCP permissions, hooks, trace/eval, dashboard)
- **Classification:** YELLOW_VALIDATE
- **Note:** EPIC. Very broad scope. May need split into smaller issues. Already partially implemented (types/interfaces, but not runtime enforcement). Issues #244–#248 are already sub-issues of this. Covers many of the capability gaps.

### #229 — MCP/OpenCode Provider Bootstrap
- **Type:** Epic / Architecture
- **Labels:** enhancement, app:server, app:web, architecture, P1, epic
- **Updated:** 2026-06-23
- **Covers:** Tool Gateway, MCP, OpenCode provider, Spec Kit sync, Oversight UI, Blueprint Launcher, Architecture Scanner
- **Classification:** YELLOW_VALIDATE
- **Note:** EPIC. Very broad scope. Old PR chain (#230-#242) blocked. Rebuild underway via #279 (CLOSED). MANY sub-capabilities here. May need to be split into actionable follow-ups.

### #224 — feat(tool-gateway): Dashboard and Server integration for Tool Monitoring (US-8)
- **Type:** Feature / Integration
- **Labels:** (none)
- **Updated:** 2026-06-15
- **Covers:** Tool monitoring UI
- **Classification:** YELLOW_VALIDATE
- **Note:** Unlabeled. Part of the #229 ecosystem. May be superseded or need refresh.

### #215 — Safety: Integrate Stop/Ask Policy via GATE_APPROVE runtime hook
- **Type:** Safety / Runtime
- **Labels:** enhancement, architecture
- **Updated:** 2026-06-15
- **Covers:** Runtime safety enforcement
- **Classification:** YELLOW_VALIDATE
- **Note:** PR #218 exists for this. Needs merge decision. Critical for Full Real Mode safety.

### #211 — docs: GitHub repo polish with verified screenshots and project presentation
- **Type:** Documentation / Presentation
- **Labels:** documentation, qa, github, ui, good first impression
- **Updated:** 2026-06-14
- **Covers:** Repo presentation, screenshots, README, templates
- **Classification:** GREEN_BUILD
- **Note:** Safe presentation task. But NOTE: #252 (repo polish) is CLOSED — some work may already be done. Need to check overlap.

## Summary Counts

| Classification | Count | Issues |
|---------------|-------|--------|
| GREEN_BUILD | 5 | #304, #251, #250, #248, #211 |
| YELLOW_VALIDATE | 8 | #249, #247, #246, #245, #244, #243, #229, #224, #215 |
| RED_HOLD | 0 | — |
| RESEARCH_ONLY | 0 | — |
| OWNER_ACTION_ONLY | 0 | — |
| ARCHIVE | 0 | — |
| STALE | 0 | — |
| NEEDS_SPLIT | 1 | #243 (epic with sub-issues already), #229 (epic) |

## Key Observations

1. **Broad epics need splitting:** #229 and #243 are very broad and could benefit from dedicated issue splitting into smaller GREEN_BUILD tasks.
2. **P0/P1 issues blocked:** #244, #245, #246, #247 are tagged `approval:required` — they need owner decision before anyone can work on them.
3. **PR #218 for #215 exists:** The GATE_APPROVE implementation is drafted but not merged.
4. **No pure documentation backlog:** #251 is the only documentation-specific issue, but api-overview.md is stale beyond just #229 endpoints.
