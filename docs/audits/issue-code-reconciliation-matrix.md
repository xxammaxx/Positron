# Issue-Code Reconciliation Matrix

## Summary

| Metric | Count |
|--------|-------|
| Total Issues | 172 |
| Open Issues | 15 |
| Closed Issues | 157 |
| Total PRs | 113 |
| Open PRs | 15 |
| Merged PRs | 81 |
| Closed (unmerged) PRs | 17 |

---

## Open Issues — Detailed Reconciliation

### #211: docs: GitHub repo polish with verified screenshots and project presentation

| Field | Value |
|-------|-------|
| State | OPEN |
| Labels | documentation, enhancement |
| Fachlicher Bereich | Documentation, GitHub metadata, README, screenshots |
| Relevante Dateien | README.md, docs/screenshots/, .github/ |
| Relevante Tests | None (docs-only) |
| Relevante PRs | None directly; #252 (GitHub Repo Polish) closed recently covers templates/badges |
| Relevante Evidence | #252 closed COMPLETED 2026-06-23 |
| Aktueller Code-Status | README exists, screenshots in docs/screenshots/, templates via #252 |
| Abgleich-Ergebnis | MATCH_PARTIAL — #252 handled templates/badges, but README overhaul + fresh screenshots + quickstart verification remain |
| Confidence | 0.68 |
| Risiko-Level | YELLOW_REVIEW |
| Empfohlene Aktion | COMMENT_ONLY — consolidate with #252, clarify remaining scope |
| Begründung | #252 (recently closed) covered CODE_OF_CONDUCT, PR templates, issue templates, milestones, badges — significant overlap. Remaining: README rewrite, fresh screenshots, quickstart paths. Not safe to close automatically; scope needs clarification. |

---

### #215: Safety: Integrate Stop/Ask Policy via GATE_APPROVE runtime hook

| Field | Value |
|-------|-------|
| State | OPEN |
| Labels | (none visible) |
| Fachlicher Bereich | Safety, Runtime Enforcement |
| Relevante Dateien | packages/sandbox/src/stop-ask-policy.ts (exists), GATE_APPROVE hook (unknown status) |
| Relevante Tests | Safety coverage claimed 100/100/100/100 |
| Relevante PRs | **PR #218** — OPEN, MERGEABLE, not merged. Comment says "Task Completed" |
| Relevante Evidence | PR #218 code ready but unmerged |
| Aktueller Code-Status | Policy module exists, GATE_APPROVE hook code in PR #218 branch |
| Abgleich-Ergebnis | MATCH_PARTIAL — code exists in PR #218 but not on main |
| Confidence | 0.72 |
| Risiko-Level | YELLOW_REVIEW |
| Empfohlene Aktion | COMMENT_ONLY — PR #218 is MERGEABLE but unmerged. Human decision needed: merge or close PR. |
| Begründung | The implementation exists in PR #218 (MERGEABLE). The issue is correctly OPEN because the PR is not merged. The "Task Completed" comment is misleading — the task is done but the PR is not on main. Owner needs to decide: merge PR #218 → close issue, or close PR → reassess issue. |

---

### #224: feat(tool-gateway): Dashboard and Server integration for Tool Monitoring (US-8)

| Field | Value |
|-------|-------|
| State | OPEN |
| Labels | (none) |
| Fachlicher Bereich | Tool Gateway, Dashboard, Server |
| Relevante Dateien | packages/tool-gateway/, apps/server/, apps/web/ |
| Relevante Tests | Tool Gateway tests (PASS) |
| Relevante PRs | **PR #228** — OPEN, CONFLICTING. Base of #229 PR chain |
| Relevante Evidence | PR #228 is CONFLICTING, chain analysis confirms |
| Aktueller Code-Status | Tool Gateway foundation exists (PR #220 merged), dashboard integration not on main |
| Abgleich-Ergebnis | MATCH_PARTIAL — blocked by PR #228 CONFLICTING status |
| Confidence | 0.70 |
| Risiko-Level | YELLOW_REVIEW |
| Empfohlene Aktion | COMMENT_ONLY — depends on #279 rebuild decision |
| Begründung | The PR implementing this (#228) is CONFLICTING and part of the stale #229 chain. Issue #279 proposes rebuilding on current main. Should not be closed until #279 clarifies the path forward. |

---

### #229: MCP/OpenCode Provider Bootstrap: Tool Gateway + Free Models + Spec Kit Sync + Oversight UI + Blueprint Launch

| Field | Value |
|-------|-------|
| State | OPEN |
| Labels | architecture, blueprint, enhancement |
| Fachlicher Bereich | Architecture, MCP, OpenCode, Tool Gateway |
| Relevante Dateien | Multiple across all packages |
| Relevante Tests | 917/917 core tests pass on main (without #229 changes) |
| Relevante PRs | **PR chain #230-#242** (13 stacked PRs, all OPEN, all MERGEABLE individually but sequentially dependent). Base PR #228 is CONFLICTING |
| Relevante Evidence | Chain analysis in Issue #279 body: base broken, dist contamination, docs overlap |
| Aktueller Code-Status | All #229 code lives in the unmerged PR chain. Main has the Tool Gateway foundation (PR #220) but no #229 additions. |
| Abgleich-Ergebnis | STALE_ISSUE — superseded by #279 |
| Confidence | 0.92 |
| Risiko-Level | YELLOW_REVIEW |
| Empfohlene Aktion | COMMENT_ONLY — mark as superseded, link to #279. Do NOT close automatically (13 PRs still open). |
| Begründung | Issue #279 explicitly supersedes #229. The PR chain is stale and broken at the base. However, closing #229 before resolving the 13 dependent PRs would create confusion. Owner needs to decide: close PRs #230-#242 → then close #229. |

---

### #243: Agentic/Vibe-Coding Baseline 2026: Multi-Phase Orchestrator Capabilities

| Field | Value |
|-------|-------|
| State | OPEN |
| Labels | architecture, enhancement, P0 |
| Fachlicher Bereich | Agent Isolation, MCP Permissions, Gates, Trace/Eval, Dashboard |
| Relevante Dateien | packages/shared/src/interfaces.ts, packages/sandbox/, packages/run-state/ |
| Relevante Tests | 917/917 core tests pass |
| Relevante PRs | None directly; sub-issues #244-#249 reference this |
| Relevante Evidence | ADR-001 exists on vibe-coding branch; LivingEvidencePortfolio type defined in shared/types.ts |
| Aktueller Code-Status | Multi-phase: Phase 1 interfaces declared, Phase 5 types defined. No runtime implementations (via sub-issues #244-#247 which require approval) |
| Abgleich-Ergebnis | MATCH_NOT_DONE — correctly open, active epic |
| Confidence | 0.95 |
| Risiko-Level | GREEN_SAFE |
| Empfohlene Aktion | NO_ACTION — active, well-scoped, correctly open |
| Begründung | This is an epic-level issue with well-defined phases and sub-issues. Some type definitions exist, but runtime implementation is blocked on sub-issue approvals. Correctly open. |

---

### #244: [APPROVAL REQUIRED] Implement Runtime Workspace Cleanup for GitWorkspaceAdapter

| Field | Value |
|-------|-------|
| State | OPEN |
| Labels | P1, security, sandbox, approval:required |
| Fachlicher Bereich | Sandbox, Workspace Cleanup |
| Relevante Dateien | packages/shared/src/interfaces.ts:289-296 (interface declared), packages/sandbox/src/fake-adapter.ts, packages/sandbox/src/real-adapter.ts |
| Relevante Tests | None for the 4 new methods |
| Relevante PRs | None |
| Relevante Evidence | Interface declared but NOT implemented |
| Aktueller Code-Status | destroyWorkspace/lockWorkspace/unlockWorkspace/isLocked declared in interface only. No implementations. |
| Abgleich-Ergebnis | MATCH_NOT_DONE — waiting for approval |
| Confidence | 0.95 |
| Risiko-Level | **RED_HOLD** |
| Empfohlene Aktion | NO_ACTION — explicitly requires owner approval before implementation |
| Begründung | Issue body explicitly states: "Dieses Issue darf nicht umgesetzt werden, bevor der Repository Owner ausdrücklich zugestimmt hat." Risk: workspace data loss, race conditions. Do not touch. |

---

### #245: [APPROVAL REQUIRED] Enforce requiresAuditLog in Tool Gateway Runtime

| Field | Value |
|-------|-------|
| State | OPEN |
| Labels | approval:required, P1, security, tool-gateway |
| Fachlicher Bereich | Tool Gateway, Audit Logging |
| Relevante Dateien | packages/tool-gateway/ |
| Relevante Tests | Tool Gateway red-team tests pass |
| Relevante PRs | None |
| Relevante Evidence | Audit trail enforcer skill exists but runtime enforcement missing |
| Aktueller Code-Status | Audit logging exists in skill/prompt layer, not in Tool Gateway runtime |
| Abgleich-Ergebnis | MATCH_NOT_DONE — waiting for approval |
| Confidence | 0.90 |
| Risiko-Level | **RED_HOLD** |
| Empfohlene Aktion | NO_ACTION — explicitly requires owner approval |
| Begründung | Runtime enforcement of audit logging requires owner approval. Risk: wrong enforcement could break tool gateway or create false positives. Do not touch. |

---

### #246: [APPROVAL REQUIRED] Enforce GateType Layers in Pipeline Loop

| Field | Value |
|-------|-------|
| State | OPEN |
| Labels | approval:required, P1, security |
| Fachlicher Bereich | Pipeline, Gate Enforcement |
| Relevante Dateien | packages/run-state/ |
| Relevante Tests | State machine property tests pass |
| Relevante PRs | None |
| Relevante Evidence | Gate types defined, runtime enforcement missing |
| Aktueller Code-Status | Not implemented |
| Abgleich-Ergebnis | MATCH_NOT_DONE — waiting for approval |
| Confidence | 0.90 |
| Risiko-Level | **RED_HOLD** |
| Empfohlene Aktion | NO_ACTION — explicitly requires owner approval |
| Begründung | Runtime gate enforcement changes pipeline behavior. Risk: could block legitimate pipelines. Do not touch. |

---

### #247: [APPROVAL REQUIRED] Add Trace and Eval Aggregation to runFullPipeline

| Field | Value |
|-------|-------|
| State | OPEN |
| Labels | approval:required, P1, enhancement |
| Fachlicher Bereich | Pipeline, Trace, Evaluation |
| Relevante Dateien | packages/run-state/, apps/server/ |
| Relevante Tests | 917/917 core tests pass |
| Relevante PRs | None |
| Relevante Evidence | Trace/eval concept exists in #243 Phase 4 |
| Aktueller Code-Status | Not implemented |
| Abgleich-Ergebnis | MATCH_NOT_DONE — waiting for approval |
| Confidence | 0.90 |
| Risiko-Level | **RED_HOLD** |
| Empfohlene Aktion | NO_ACTION — explicitly requires owner approval |
| Begründung | Trace/eval aggregation changes pipeline behavior. Risk: could impact performance or create data collection issues. Do not touch. |

---

### #248: [SAFE] Display LivingEvidencePortfolio in Operator Dashboard

| Field | Value |
|-------|-------|
| State | OPEN |
| Labels | enhancement, P1, frontend, approval:not-required |
| Fachlicher Bereich | Frontend, Dashboard, Evidence Display |
| Relevante Dateien | packages/shared/src/types.ts:393-416 (type defined), apps/server/src/ (no endpoint yet), apps/web/ (no component yet) |
| Relevante Tests | None for LivingEvidencePortfolio |
| Relevante PRs | None |
| Relevante Evidence | LivingEvidencePortfolio type exists in shared types. No server endpoint or frontend component. |
| Aktueller Code-Status | Type only — no implementation |
| Abgleich-Ergebnis | MATCH_NOT_DONE — correctly open, well-scoped |
| Confidence | 0.92 |
| Risiko-Level | **GREEN_SAFE** |
| Empfohlene Aktion | NO_ACTION — safe task, correctly open, keep as-is |
| Begründung | Well-scoped SAFE task with clear acceptance criteria. No owner approval needed. Type exists, implementation missing. Keep open for future work. |

---

### #249: [DECISION NEEDED] Auto-Populate Infrastructure State Stores on Server Startup

| Field | Value |
|-------|-------|
| State | OPEN |
| Labels | P2, server, infrastructure |
| Fachlicher Bereich | Server Startup, Infrastructure State |
| Relevante Dateien | apps/server/, packages/shared/ |
| Relevante Tests | Server tests pass |
| Relevante PRs | None |
| Relevante Evidence | Infrastructure state types exist in shared |
| Aktueller Code-Status | Not implemented |
| Abgleich-Ergebnis | MISSING_EVIDENCE — owner decision needed |
| Confidence | 0.55 |
| Risiko-Level | **YELLOW_REVIEW** |
| Empfohlene Aktion | COMMENT_ONLY — needs owner decision on auto-population strategy |
| Begründung | The issue title says "[DECISION NEEDED]" — cannot proceed without owner decision. Auto-population strategy has architectural implications. |

---

### #250: [SAFE] Add CT-120 Browser Evidence Smoke Test for All Dashboard Routes

| Field | Value |
|-------|-------|
| State | OPEN |
| Labels | P2, qa, testing, frontend, approval:not-required |
| Fachlicher Bereich | Testing, Playwright, Dashboard |
| Relevante Dateien | playwright.config.ts, e2e/, docs/screenshots/ |
| Relevante Tests | Playwright E2E exists (25 tests) but non-blocking |
| Relevante PRs | None |
| Relevante Evidence | 10 frontend routes documented in current-capabilities.md. CT-120 server status: "not fully operational" per known-limitations. |
| Aktueller Code-Status | No CT-120 specific smoke test |
| Abgleich-Ergebnis | MATCH_NOT_DONE — correctly open, well-scoped |
| Confidence | 0.90 |
| Risiko-Level | **GREEN_SAFE** |
| Empfohlene Aktion | NO_ACTION — safe task, keep open |
| Begründung | Well-scoped SAFE test task. Depends on CT-120 server availability. No owner approval needed. Keep open. |

---

### #251: [SAFE] Update api-overview.md with All Issue #229 Endpoints

| Field | Value |
|-------|-------|
| State | OPEN |
| Labels | documentation, P2, approval:not-required |
| Fachlicher Bereich | Documentation, API |
| Relevante Dateien | docs/architecture/api-overview.md (last updated 2026-05-24) |
| Relevante Tests | None (docs-only) |
| Relevante PRs | None |
| Relevante Evidence | 18+ new endpoints from #229 PR chain not documented. But #279 may change the API surface. |
| Aktueller Code-Status | api-overview.md is outdated. But #229 endpoints only exist in unmerged PRs. |
| Abgleich-Ergebnis | MISSING_EVIDENCE — depends on #279 outcome |
| Confidence | 0.50 |
| Risiko-Level | **YELLOW_REVIEW** |
| Empfohlene Aktion | COMMENT_ONLY — defer until #279 clarifies the API surface |
| Begründung | Documenting #229 endpoints now would be wasted effort if #279 rebuilds differently. The endpoints only exist in the PR chain, not on main. Defer until #279 resolves. |

---

### #268: CI Recovery: diagnose and repair systemic Quality Gates / Issue Verification failures

| Field | Value |
|-------|-------|
| State | OPEN |
| Labels | bug, P0, ci |
| Fachlicher Bereich | CI/CD, GitHub Actions |
| Relevante Dateien | .github/workflows/, .gitattributes |
| Relevante Tests | Local gates pass (917/917). GitHub-CI fails (runner quota). |
| Relevante PRs | PR #269 (LF normalization, merged). PR #278 (closeout docs, merged). |
| Relevante Evidence | Known limitations doc confirms CI is advisory-only. Root cause: runner quota/billing for private repo. |
| Aktueller Code-Status | Workflow YAML is correct. Issue is infrastructure (runner quota), not code. |
| Abgleich-Ergebnis | MATCH_PARTIAL — root cause identified (runner quota), but resolution requires external action |
| Confidence | 0.95 |
| Risiko-Level | **GREEN_SAFE** |
| Empfohlene Aktion | NO_ACTION — active tracker for known limitation, correctly open |
| Begründung | This is an active tracker for a known infrastructure limitation. It should remain open until the owner resolves the runner quota issue. No code changes needed. |

---

### #279: Replacement: rebuild Issue #229 architecture chain on current main

| Field | Value |
|-------|-------|
| State | OPEN |
| Labels | architecture, enhancement, P0 |
| Fachlicher Bereich | Architecture, Rebuild |
| Relevante Dateien | All packages |
| Relevante Tests | 917/917 core tests pass (baseline) |
| Relevante PRs | None yet |
| Relevante Evidence | Chain analysis documented in issue body. Main is stable (917/917 tests). Old chain is stale. |
| Aktueller Code-Status | No #279 code written yet. |
| Abgleich-Ergebnis | MATCH_NOT_DONE — active, correctly open |
| Confidence | 0.95 |
| Risiko-Level | **GREEN_SAFE** |
| Empfohlene Aktion | NO_ACTION — active, well-scoped, correctly open |
| Begründung | This is the active replacement for #229. Well-scoped with clear goals. Keep open. |

---

## Closed Issues — Spot Check

### Audit of 40 most recently closed issues

All recently closed issues (checked: #252, #205, #253, #254, #276, #274, #272, #270, #266, #263, #223, #222, #221, #219, #216) have:
- **COMPLETED** or **NOT_PLANNED** state reasons
- Appropriate linked PRs where code was involved
- No contradictory open PRs or pending reviews
- Consistent with local code/test state

### NOT_PLANNED Issues (3 total)

| Issue | Title | Assessment |
|-------|-------|------------|
| #205 | SDD-/Fleet-/OpenCode-/Kontext-Engineering-Erkenntnisse | Correctly NOT_PLANNED — superseded by current architecture |
| #206 | build-and-test biome v2 migration + format fixes | Correctly NOT_PLANNED — addressed by #268/#269 |
| #209 | Android On-Device SLM/ASR Architecture Pack | Correctly NOT_PLANNED — out of scope for current project |

**No closed issues require reopening.**

---

## Cross-Reference: PR to Issue Mapping

### Open PRs without corresponding open issues (potential gap)

| PR | Title | Status | Assessment |
|----|-------|--------|------------|
| #218 | feat(safety): integrate Stop/Ask policy | OPEN, MERGEABLE | Links to issue #215 (OPEN) — correct |
| #228 | feat(tool-gateway): dashboard monitoring | OPEN, CONFLICTING | Links to issue #224 (OPEN) — correct |
| #230-#242 | feat(issue-229): ... | OPEN, all MERGEABLE | Links to issue #229 (OPEN) — correct |

### Merged PRs with potentially open linked Issues

| PR | Issue | Issue Status | Assessment |
|----|-------|-------------|------------|
| #267 | #266 | CLOSED (COMPLETED) | Correct |
| #227 | #223 | CLOSED (COMPLETED) | Correct |
| #226 | #222 | CLOSED (COMPLETED) | Correct |
| #225 | #221 | CLOSED (COMPLETED) | Correct |

**No gaps found: merged PRs correspond to closed issues, open PRs correspond to open issues.**

---

## Issue Overlap / Potential Duplicates

| Pair | Relationship | Recommendation |
|------|-------------|----------------|
| #211 ↔ #252 | Overlap on repo polish scope | #252 (CLOSED) handled templates/badges; #211 has broader README/screenshots scope. Different enough to keep separate. |
| #229 ↔ #279 | Explicit supersede | #279 explicitly replaces #229. Once #279 progresses, #229 should be closed. |
| #243 ↔ #248 | Epic/sub-task | #248 (LivingEvidencePortfolio) is Phase 5 of #243. Correctly kept as separate trackable issue. |
| #243 ↔ #244-#247 | Epic/sub-task | #244-#247 are Phase 1-4 sub-issues of #243, blocked on approval. Correct structure. |
