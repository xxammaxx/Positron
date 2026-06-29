# POSITRON NEXT RUN — Issue #308 Phase C3: Post-Probe Readiness and Blocker Split

## Context

Issue #308 is OPEN. Phase C2 controlled local temp workspace probe executed successfully (CONTROLLED_LOCAL_TEMP_PROBE_PASSED). PR #320 merged into main. Phase C2 evidence is now on main. Phase C2b final audit and merge is complete.

This next run is Phase C3: Post-Probe Readiness and Blocker Split.

## Phase C3 Goal

Audit Phase C2 findings and make decisions about what must be resolved before any Phase D (Full Real Mode) probe can be considered. This is a DECISION/PLANNING phase, NOT an execution phase.

## Phase C3 Tasks

### 1. Known Limitations Audit
Review the known limitations documented in Phase C2:

- **onAudit Server Wiring fehlt** — Does this need its own issue before Phase D, or can it be deferred?
- **pre_run/pre_push nicht wired** — Document as intentional non-applicability or create fix issue?
- **MERGE→DONE raw transition** — Does this need a gated transition via its own issue?
- **process-scoped lock** — Is this acceptable for Phase D or does it need a fix?
- **pre-existing dist artifacts** — Create a cleanup issue or document as acceptable tech debt?

### 2. PR #313 Decision
PR #313 (`docs/issue-308: add supervised real-mode readiness audit`) is currently OPEN and Draft. Decide:
- Merge if applicable
- Close if superseded by Phase C2/C2b evidence
- Update if needed

### 3. Phase D Gate Assessment
Evaluate whether Phase D (Full Real Mode probe) is permissible:
- Are all blocking prerequisites resolved?
- Is the risk profile acceptable?
- What additional gates are needed before Phase D?

### 4. Blocker Split
If blockers exist for Phase D, create dedicated issues for each:
- Each blocker gets its own issue
- Issues are linked to #308 as dependencies
- Clear acceptance criteria per blocker

## Phase C3 Scope Restrictions

Phase C3 MAY:
- Create new issues for identified blockers
- Comment on existing issues/PRs
- Audit and analyze Phase C2 evidence
- Make architectural decisions
- Document readiness assessment

Phase C3 MUST NOT:
- Execute any probe (no Phase D)
- Use Full Real Mode
- Use Supervised Real Run
- Execute GitHub writes through pipeline (issue creation via `gh issue create` is allowed as a manual admin action)
- Push, create PR, or merge through pipeline
- Change workflows
- Trigger manual CI
- Use production repo as probe workspace
- Execute any external tools
- Expose secrets or .env contents
- Use CodeRabbit

## Owner Approval Required

```text
APPROVE ISSUE 308 PHASE C3 POST-PROBE READINESS ONLY
```

## Expected Phase C3 Outputs

1. Known limitations disposition document
2. PR #313 decision (merge/close/update)
3. Phase D readiness assessment
4. Blocker issues created (if any)
5. Phase C3 evidence files in `docs/evidence/issue-308/phase-c3-*`
6. Updated status on Issue #308

## Phase C3 Does NOT

- Execute Phase D probe
- Execute Full Real Mode
- Execute Supervised Real Run
- Create any PR through pipeline
- Merge anything through pipeline
- Push anything through pipeline
- Modify workflows
- Trigger CI
- Use production repo as probe
