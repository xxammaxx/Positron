# Target GitHub Status Intake — Linux Mint

## Open Pull Requests

| PR | Title | State | Draft | Mergeable | Branch | Updated |
|----|-------|-------|-------|-----------|--------|---------|
| #329 | docs(issue-308): reassess Phase D readiness after onAudit wiring | OPEN | YES | MERGEABLE | docs/issue-308-phase-d-readiness-after-322 | 2026-06-29T12:36:11Z |
| #313 | docs(issue-308): add supervised real-mode readiness audit | OPEN | YES | MERGEABLE | docs/issue-308-readiness-audit | 2026-06-27T19:42:34Z |

## Key Issues

| Issue | Title | Labels | Updated |
|-------|-------|--------|---------|
| #308 | [RESEARCH] Supervised Full Real Mode pilot | enhancement, architecture, P1, approval:decision-needed, safety | 2026-06-29T12:12:16Z |
| #322 | Wire ToolGateway onAudit into server/worker runtime | (none) | 2026-06-29T12:12:24Z |
| #326 | Owner Action: Remove/disable CodeRabbit | (none) | 2026-06-29T09:12:45Z |
| #325 | Cleanup: dist artifacts | (none) | 2026-06-29T09:11:30Z |
| #324 | Evaluate workspace lock | (none) | 2026-06-29T09:11:24Z |
| #323 | Decide pre_run/pre_push GateType | (none) | 2026-06-29T09:11:10Z |
| #321 | Gate MERGE→DONE with evidence_required | (none) | 2026-06-29T09:11:10Z |

## Assessment

### PR #329
- **Status:** OPEN, Draft, MERGEABLE
- **Content:** Phase D readiness recheck after #322 onAudit wiring
- **Decision:** READY_FOR_LIMITED_PHASE_D_APPROVAL_PACKAGE
- **Recommendation:** Next review/merge candidate. Contains only docs/evidence, no code changes.

### PR #313
- **Status:** OPEN, Draft, MERGEABLE
- **Content:** Original #308 readiness audit from June 27
- **Assessment:** Likely OBSOLETE. Superseded by PR #317 (merged), PR #329 (current), and subsequent Phase B/C/D work.
- **Recommendation:** Close as obsolete with owner approval.

### Issue #308
- **Status:** OPEN
- **Phase D decision:** READY_FOR_LIMITED_PHASE_D_APPROVAL_PACKAGE
- **Next step:** Owner review of PR #329, then Phase D approval package.

### Issue #322
- **Status:** OPEN (closure recommended)
- **PR #328:** MERGED — onAudit wiring implemented and on main
- **Assessment:** All 4 acceptance criteria met. Recommended for closure.
- **Action:** NOT closing in this run. Owner action required.

### Other Open Issues
13 additional open issues (#321-#326, #304, #251, #250, #249, #248, #247, #243, #229, #224, #211). All are pre-existing and not impacted by this migration.

## Classification

All information is fresh from GitHub API. No local state was used for issue/PR assessment.
