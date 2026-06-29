# Phase C3 — Existing Issue / PR Dedupe Audit

## Audit Summary

A comprehensive search of open and closed issues/PRs was performed to deduplicate the 7 known limitations (L1–L7) against the existing issue tracker.

## Search Queries

| Topic | Search Method |
|-------|--------------|
| onAudit / audit wiring / ToolGateway audit | `gh issue list` + keyword matching |
| MERGE DONE transition / GateType DONE | `gh issue list` + keyword matching |
| pre_run / pre_push | `gh issue list` + keyword matching |
| workspace lock / persistent lock | `gh issue list` + keyword matching |
| dist artifacts / build artifacts | `gh issue list` + keyword matching |
| CodeRabbit / coderabbitai | `gh issue list` + keyword matching |
| PR #313 / readiness audit | `gh pr list` + PR view |

## Results: Existing Follow-up Issues

### Open Issues (State: OPEN, Limit: 100)

Six issues (#321–#326) were found that exactly match the follow-up candidates:

| Issue | Title | Covers Limitation |
|-------|-------|-------------------|
| #321 | "Issue #308 Follow-up: Gate MERGE->DONE transition with evidence_required" | L3: MERGE→DONE |
| #322 | "Issue #308 Follow-up: Wire ToolGateway onAudit into server/worker runtime" | L1: onAudit |
| #323 | "Issue #308 Follow-up: Decide and document pre_run/pre_push GateType applicability" | L2: pre_run/pre_push |
| #324 | "Issue #308 Follow-up: Evaluate persistent workspace lock for multi-process safety" | L4: workspace lock |
| #325 | "Cleanup: Resolve pre-existing dist artifacts in working tree" | L5: dist artifacts |
| #326 | "Owner Action: Remove or fully disable CodeRabbit external app for Positron" | L7: CodeRabbit |

All six issues are **OPEN** and contain:
- Clear scope definitions
- Non-scope constraints
- Acceptance criteria
- Risk classification
- References to Issue #308

### Closed Issues — No Duplicates Found

No closed issue exists that:
- Duplicates any of #321–#326
- Resolves the same limitation and was merged to main
- Would make a new issue redundant

### PR #313 (L6)

PR #313 is a Draft PR, not an issue. It covers the original #308 readiness audit and is now stale. It does not require a new GitHub Issue — only a decision (close/keep/label) by Owner.

### Other Open Issues Related to #308

| Issue | Title | Relation |
|-------|-------|----------|
| #308 | Master validation issue | Parent issue, OPEN |
| #247 | Add Trace and Eval Aggregation | Related P1 enhancement |
| #248 | Display LivingEvidencePortfolio in Dashboard | GREEN_SAFE, unrelated |
| #249 | Auto-Populate Infrastructure State Stores | P1, unrelated |
| #250 | CT-120 Browser Evidence Smoke Test | SAFE, unrelated |
| #251 | Update api-overview.md | P2, unrelated |
| #211 | GitHub repo polish | P2, unrelated |
| #224 | Tool Monitoring Dashboard/Server | Unrelated |
| #229 | MCP/OpenCode Provider Bootstrap | Epic, unrelated |
| #243 | Agentic/Vibe-Coding Baseline 2026 | Epic, unrelated |
| #304 | Stabilize Playwright tracing | Post-299, unrelated |

None of these duplicate or conflict with the follow-up needs.

## Dedupe Rules Applied

1. ✅ **No new issue** if a matching open issue exists → L1–L5, L7 matched to #321–326.
2. ✅ **No new issue** if a closed issue already fixed on main → No closed matches.
3. ✅ **New issue only** if real gap, clear AC, no matching tracker → No gaps found.
4. ✅ **PR #313** not closed — Owner action only. Decision package prepared separately.

## PRs Search (State: CLOSED, Limit: 100)

Searched closed PRs for MERGE/DONE, onAudit, workspace lock, etc.:
- PR #316 (merge of #246): Addresses GateType layers but not specifically MERGE→DONE gating.
- PR #314 (merge of #244): Implements workspace cleanup but with process-scoped lock (L4).
- PR #315 (merge of #245): Implements audit enforcement but without server onAudit wiring (L1).
- No closed PR addresses any of L1–L7 as a complete fix.

## Classification

```text
ISSUE_308_PHASE_C3_DEDUPE_STATUS: CLEAN
```

**Rationale:** All 7 known limitations are covered by existing trackers:
- L1–L5, L7: Issues #321–#326 (all OPEN, well-scoped, with ACs)
- L6: PR #313 (draft, stale, Owner action)

No new issues are needed. No duplicate or obsolete trackers exist. The existing tracker set is complete and non-redundant. No closed issue/PR already resolves any limitation on main.
