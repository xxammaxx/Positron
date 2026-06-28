# Portfolio Gap Discovery — Positron Capability Gap Map

## Target Vision

Positron as local, controlled AI software factory:

```
GitHub Issue / Blueprint
→ Reverse-PRD / Spec
→ Plan
→ Tasks
→ Agent Run / OpenCode / Tool Gateway
→ local Gates
→ Evidence
→ PR
→ Review
→ Merge
→ Portfolio/Status Update
```

## Capability Area Assessment

### 1. GitHub Issue Intake
- **Status:** IMPLEMENTED
- **Covered by:** `packages/github-adapter`, Issue #4 (MVP), Issue #263 (fixture agents)
- **Gap:** None. Issue polling, reading, labeling all functional.
- **Decision:** USE_EXISTING — no new issue needed.

### 2. Reverse-PRD / SpecKit / SDD
- **Status:** PARTIAL
- **Covered by:** `packages/speckit-adapter` (fake adapter functional), Issue #6 (MVP)
- **Gap:** Reverse-PRD from blueprint/issue to formal spec is NOT productized as a runtime feature. SpecKit adapter works in fake mode. Real-mode Speckit CLI integration exists but full reverse-PRD pipeline (Blueprint → Spec → Plan → Tasks) is not an end-to-end automated runtime capability.
- **Decision:** This gap is partially covered by Issue #229 (Spec Kit Sync) and Issue #243 (Agentic Baseline). However, neither #229 nor #243 explicitly calls out "Productize Reverse-PRD pipeline as end-to-end runtime feature." This is a potential new issue.

### 3. Planning / Task Breakdown
- **Status:** PARTIAL
- **Covered by:** `packages/run-state` (phases), `packages/speckit-adapter`
- **Gap:** Phase transitions exist (PLAN, TASKS phases) but the actual plan/task generation is manual or simulated. No automated task breakdown from spec.
- **Decision:** Covered by #229 (Spec Kit Sync → plan/task generation) and #243 (Orchestrator capabilities). USE_EXISTING.

### 4. Agent Runtime / OpenCode Integration
- **Status:** PARTIAL
- **Covered by:** `packages/opencode-adapter` (fake + dry-run modes), Issue #263, #279
- **Gap:** OpenCode integration works in fake/dry-run modes. Full supervised real mode does not exist as end-to-end validated runtime. PR #218 for GATE_APPROVE (#215) is drafted but not merged.
- **Decision:** Covered by #215 (GATE_APPROVE), #243 (Orchestrator). USE_EXISTING.

### 5. Tool Gateway / MCP / Provider Layer
- **Status:** PARTIAL
- **Covered by:** `packages/tool-gateway` (red-team tested), Issue #219, #229
- **Gap:** Tool Gateway has security gates (shell injection, path traversal, secret redaction) but MCP provider bootstrap (Ollama detection, warm-up contracts, provider models) is NOT implemented as runtime. Types exist, runtime pending.
- **Decision:** Covered by #229 (MCP/OpenCode Provider Bootstrap). USE_EXISTING.

### 6. Local Model / Free Model Detection
- **Status:** ISSUE_EXISTS (types only, no runtime)
- **Covered by:** Types in #229/#231, Issue #229
- **Gap:** OpenCode model profile types exist. Provider detection types exist. No runtime implementation to detect and warm up local models (Ollama, LM Studio).
- **Decision:** Covered by #229 ("Free Models" section). USE_EXISTING.

### 7. Workspace Isolation / GitWorkspaceAdapter
- **Status:** PARTIAL (types only, no runtime enforcement)
- **Covered by:** `packages/sandbox`, Issue #244, #243 Phase 1
- **Gap:** Types for workspace lock/cleanup exist. Runtime enforcement (destroyWorkspace, lockWorkspace) is NOT implemented.
- **Decision:** Covered by #244 (`approval:required`). USE_EXISTING.

### 8. Stop/Ask Policy / GATE_APPROVE Runtime Enforcement
- **Status:** ISSUE_EXISTS (policy exists, runtime hook not wired)
- **Covered by:** `packages/sandbox/src/stop-ask-policy.ts`, Issue #213 (policy CLOSED), Issue #215 (runtime hook OPEN), PR #218
- **Gap:** Policy module exists and is tested. GATE_APPROVE hook is NOT wired into execution pipeline. PR #218 exists but not merged.
- **Decision:** Covered by #215. USE_EXISTING.

### 9. GateType Runtime Enforcement
- **Status:** ISSUE_EXISTS (types only, no enforcement)
- **Covered by:** Types in shared, Issue #246
- **Gap:** 8 GateTypes defined but NOT enforced at runtime.
- **Decision:** Covered by #246 (`approval:required`). USE_EXISTING.

### 10. Audit Log Runtime Enforcement
- **Status:** ISSUE_EXISTS (types only, no enforcement)
- **Covered by:** Skills (audit-trail-enforcer), Issue #245
- **Gap:** `requiresAuditLog` flag exists but NOT enforced at runtime for all tool calls.
- **Decision:** Covered by #245 (`approval:required`). USE_EXISTING.

### 11. Trace / Eval / Feedback Flywheel
- **Status:** ISSUE_EXISTS (types only, no aggregation)
- **Covered by:** Types in shared, Issue #247
- **Gap:** Trace capture, eval aggregation, and feedback loop (red tests generation, recurring error classification) types exist but NOT implemented as runtime.
- **Decision:** Covered by #247 (`approval:required`). USE_EXISTING.

### 12. Evidence Portfolio / Living Portfolio
- **Status:** PARTIAL
- **Covered by:** `docs/evidence/` directories exist. Issue #248, #253
- **Gap:** Evidence is manually collected per run. Living Portfolio update is NOT automated. Dashboard display of portfolio data is NOT implemented. #253 (CLOSED) aimed to update portfolio docs but current docs are still stale.
- **Decision:** Covered by #248 (display) and #253 (CLOSED — update task). Gap: automated post-run portfolio update. This is a potential new issue.

### 13. Operator Dashboard / Web Cockpit
- **Status:** PARTIAL
- **Covered by:** `apps/web` (React/Vite), Issue #22, #27, #248, #229
- **Gap:** Dashboard exists with SSE, run queue, basic UI. But: no LivingEvidencePortfolio display, no run control (pause/abort via API exists but UI may not be fully functional), no Gate status display, no Architecture Scanner UI.
- **Decision:** Partially covered by #248 (Portfolio display), #229 (Oversight UI), #224 (Tool Monitoring). USE_EXISTING for specific gaps. But: no single issue for "make the dashboard a usable operator cockpit." Potential new issue.

### 14. Blueprint Launcher
- **Status:** ISSUE_EXISTS (not implemented)
- **Covered by:** Issue #229 (Blueprint Launcher section)
- **Gap:** Blueprint Launcher for validated Markdown-driven runs is specified but not implemented. Types may exist from old #229 PR chain but no runtime.
- **Decision:** Covered by #229. USE_EXISTING.

### 15. Architecture Scanner
- **Status:** ISSUE_EXISTS (not implemented)
- **Covered by:** Issue #229 (Architecture Scanner section), Issue #279 Phase 1
- **Gap:** Architecture Scanner to document integration points is specified but not implemented.
- **Decision:** Covered by #229. USE_EXISTING.

### 16. Sandbox / Safety / Secret Handling
- **Status:** IMPLEMENTED (good coverage)
- **Covered by:** `packages/sandbox`, `packages/tool-gateway` red-team tests, Issue #213, #219
- **Gap:** Secret redaction, shell injection blocking, path traversal prevention all implemented and tested.
- **Decision:** USE_EXISTING — no new issue needed.

### 17. CI / Local Gates / Remote Advisory CI
- **Status:** IMPLEMENTED
- **Covered by:** Issue #268 (CLOSED), Issue #270, `.opencode/policies/ci-policy.md`
- **Gap:** Local gates are mandatory. GitHub Actions is advisory-only. Policy is documented. CI repair (#296) resolved zero-step/runner-quota issues.
- **Decision:** USE_EXISTING — no new issue needed.

### 18. E2E Browser Evidence
- **Status:** PARTIAL (1 flake remains)
- **Covered by:** `e2e/` Playwright tests (25/26 pass), Issue #304, Issue #250
- **Gap:** Tracing lifecycle flake (#304). CT-120 smoke test (#250) not yet implemented.
- **Decision:** Covered by #304 and #250. USE_EXISTING.

### 19. Documentation / API Overview / Changelog
- **Status:** STALE
- **Covered by:** Issue #251, #211, #254 (CLOSED)
- **Gap:** README badges stale. current-capabilities.md stale. known-limitations.md stale. api-overview.md incomplete. CHANGELOG v0.2.0/v0.3.0 files missing. Evidence index missing.
- **Decision:** Partially covered by #251 (api-overview) and #211 (repo polish). But current scope of #251 only covers #229 endpoints, not the broader documentation staleness. #211 covers README screenshots/presentation. This is a potential new issue for comprehensive documentation sync.

### 20. Repo Hygiene / Templates / Release Hygiene
- **Status:** PARTIAL
- **Covered by:** Issue #252 (CLOSED), Issue #211 (OPEN)
- **Gap:** Issue templates added. PR template added. CODE_OF_CONDUCT added. But: README badges still stale. No milestones defined. No release process for v0.2.0+.
- **Decision:** Covered by #211 partially. Gap: milestone definition and release hygiene beyond #211 scope. Potential new issue.

### 21. Full Real Mode / Supervised Real Runs
- **Status:** PARTIAL (controlled probe only)
- **Covered by:** Issue #279 (Rudolph Beacon — CLOSED), Issue #215
- **Gap:** Controlled real-mode probe exists (5-gate check). Full supervised real mode with actual OpenCode tool execution is NOT implemented. Requires GATE_APPROVE (#215) and all P0 safety gates (#244-#246).
- **Decision:** This is a future capability dependent on completing #215 and #244-#246. No dedicated "Full Real Mode Validation" issue exists. Potential new issue.

### 22. Multi-Agent / Parallel Run Safety
- **Status:** ISSUE_EXISTS (specified, not implemented)
- **Covered by:** Issue #243 Phase 1 (no parallel writes to same workspace)
- **Gap:** Multi-agent coordination and parallel run safety is specified in #243 but not implemented.
- **Decision:** Covered by #243. USE_EXISTING.

### 23. Home-Lab / CT-120 Deployment Readiness
- **Status:** ISSUE_EXISTS (not validated)
- **Covered by:** Issue #250 (CT-120 Browser Evidence Smoke Test)
- **Gap:** CT-120 deployment path is NOT validated end-to-end. Smoke test exists as an issue but not implemented.
- **Decision:** Covered by #250. USE_EXISTING.

### 24. User-facing Product UX
- **Status:** PARTIAL
- **Covered by:** `apps/web`, Issue #211, #248
- **Gap:** Basic UI exists but lacks polish. No operator-focused workflow. No onboarding experience. No clear "what can Positron do for me" UX.
- **Decision:** Covered by #211 (repo polish), #248 (portfolio display). USE_EXISTING. But: broader UX story is not captured in any single issue.

## Summary Matrix

| # | Capability | Status | Covered By Issue | Gap | Action |
|---|-----------|--------|-----------------|-----|--------|
| 1 | GitHub Issue Intake | IMPLEMENTED | N/A | None | USE_EXISTING |
| 2 | Reverse-PRD / SpecKit | PARTIAL | #229, #243 | Runtime pipeline not productized | CREATE_NEW (candidate) |
| 3 | Planning / Task Breakdown | PARTIAL | #229, #243 | Automated gen missing | USE_EXISTING |
| 4 | Agent Runtime / OpenCode | PARTIAL | #215, #243 | Supervised real mode | USE_EXISTING |
| 5 | Tool Gateway / MCP | PARTIAL | #229 | Runtime bootstrap pending | USE_EXISTING |
| 6 | Local Model Detection | ISSUE_EXISTS | #229 | Runtime pending | USE_EXISTING |
| 7 | Workspace Isolation | ISSUE_EXISTS | #244 | Runtime enforcement | USE_EXISTING |
| 8 | GATE_APPROVE | ISSUE_EXISTS | #215, PR #218 | Runtime hook pending | USE_EXISTING |
| 9 | GateType Enforcement | ISSUE_EXISTS | #246 | Runtime pending | USE_EXISTING |
| 10 | Audit Log Enforcement | ISSUE_EXISTS | #245 | Runtime pending | USE_EXISTING |
| 11 | Trace/Eval Flywheel | ISSUE_EXISTS | #247 | Aggregation pending | USE_EXISTING |
| 12 | Evidence Portfolio | PARTIAL | #248, #253 | Auto-update missing | CREATE_NEW (candidate) |
| 13 | Operator Dashboard | PARTIAL | #248, #229, #224 | No holistic cockpit UX | CREATE_NEW (candidate) |
| 14 | Blueprint Launcher | ISSUE_EXISTS | #229 | Not implemented | USE_EXISTING |
| 15 | Architecture Scanner | ISSUE_EXISTS | #229 | Not implemented | USE_EXISTING |
| 16 | Sandbox / Safety | IMPLEMENTED | N/A | None | USE_EXISTING |
| 17 | CI / Local Gates | IMPLEMENTED | N/A | None | USE_EXISTING |
| 18 | E2E Browser Evidence | PARTIAL | #304, #250 | Tracing flake | USE_EXISTING |
| 19 | Documentation / Changelog | STALE | #251, #211 | Comprehensive sync needed | CREATE_NEW (candidate) |
| 20 | Repo Hygiene | PARTIAL | #211 | Milestones, badges, release | CREATE_NEW (candidate) |
| 21 | Full Real Mode | PARTIAL | #215, #244-#246 | Dependent | CREATE_NEW (candidate) |
| 22 | Multi-Agent Safety | ISSUE_EXISTS | #243 | Not implemented | USE_EXISTING |
| 23 | CT-120 Deployment | ISSUE_EXISTS | #250 | Not validated | USE_EXISTING |
| 24 | Product UX | PARTIAL | #211, #248 | Broader UX story | USE_EXISTING |
