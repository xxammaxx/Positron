# Phase 2 — Next Positron Prompt

## Recommended Next Run

```
POSITRON NEXT RUN — Review PR #329 and prepare Issue #308 Phase D Approval Package
```

## Context
The Linux Mint machine migration is **GREEN_COMPLETED**. The new Linux Mint machine is now the active build machine. GitHub remains Source of Truth. The old machine is no longer canonical.

## Recommended Sequence (for next run)

### 1. PR #329 Final Audit
- PR Title: `docs(issue-308): reassess Phase D readiness after onAudit wiring`
- Number: #329
- Status: OPEN, Draft, MERGEABLE
- Assessment: Should be audited and prepared for merge

### 2. Issue #322 Closure
- Issue: #322 (Wire ToolGateway onAudit into runtime)
- Status: OPEN
- PR #328 already merged for this work
- Recommendation: Close as completed

### 3. PR #313 Closure
- PR: #313 (supervised real-mode readiness audit)
- Status: OPEN, Draft, MERGEABLE, STALE (2+ days)
- Assessment: Likely obsolete; PR #329 supersedes it
- Recommendation: Close without merge

### 4. Issue #308 Phase D Approval Package
- Issue: #308 ([RESEARCH] Supervised Full Real Mode pilot)
- Status: OPEN, P1, approval:decision-needed
- Task: Prepare the final approval package (NOT execute Phase D probe)

## Owner Approval Texts Required

For the next run, the Owner should provide (one or more):

```text
APPROVE MERGE PR 329 AFTER FINAL AUDIT
APPROVE CLOSE ISSUE 322 AS COMPLETED
APPROVE CLOSE OBSOLETE PR 313
APPROVE ISSUE 308 PHASE D APPROVAL PACKAGE ONLY
```

## Prohibited in Next Run
- ❌ No Phase D probe execution
- ❌ No Real Mode activation
- ❌ No Controlled/Supervised Real Run
- ❌ No pipeline writes
- ❌ No Issue #308 closure
- ❌ No workflow changes
- ❌ No force push
- ❌ No branch deletion
- ❌ No auto/squash/rebase merge

## Current State for Next Run

### PRs
| PR | State | Mergeable | Assessment |
|----|-------|-----------|------------|
| #329 | OPEN, Draft | MERGEABLE | Ready for review/merge |
| #313 | OPEN, Draft | MERGEABLE | Likely obsolete, close |

### Issues
| Issue | State | Assessment |
|-------|-------|------------|
| #308 | OPEN | Phase D approval package needed |
| #322 | OPEN | Closure recommended (PR #328 merged) |

### Repository
- **main HEAD:** 19c7e105 (post-#330 merge)
- **Migration:** GREEN_COMPLETED
- **Build:** GREEN (1858/1858 tests)
- **Secret/Env:** CLEAN
- **Linux Mint:** VERIFIED as active build machine
