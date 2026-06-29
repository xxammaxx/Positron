# Issue #308 Phase D Readiness Recheck — Issue #324 Assessment

**Generated:** 2026-06-29T14:06:00+02:00
**Issue:** #324 — Evaluate persistent workspace lock for multi-process safety

## Issue #324 Context

| Field | Value |
|-------|-------|
| Number | 324 |
| State | OPEN |
| Title | Issue #308 Follow-up: Evaluate persistent workspace lock for multi-process safety |
| Risk | YELLOW_VALIDATE |
| Type | technical-debt / runtime-safety |
| Priority | P2 |

### Description
Workspace lock from #244 is process-scoped. In multi-process scenarios (parallel agent runs, concurrent temp workspaces), this lock cannot prevent cross-process collisions. Before Phase D, this risk should be evaluated and documented.

### Acceptance Criteria
1. Multi-process collision risk documented
2. If mitigated: persistent lock tested and working
3. If accepted: documented rationale and accepted risk level
4. Tests green

## Code Discovery

`git grep` for lock/workspace patterns found:

- `state-machine.ts:183-218`: Workspace cleanup lifecycle (process-scoped)
- `registerWorkspaceCleanup` — process-scoped callback
- `runWorkspaceCleanup` — process-scoped execution
- No persistent lockfile, no advisory lock, no cross-process coordination found
- Lock is in-memory only, scoped to the Node.js process

## Phase-D Impact Analysis

### For Current Scope (Approval Package Only)
No workspace operations occur — no lock needed. **NOT BLOCKING.**

### For Future Limited Probe (Option A/B: Single-Process)
A single-process probe (one Node.js process, one temp workspace) does NOT need cross-process locking. The process-scoped lock is sufficient. **NOT BLOCKING** if the probe is guaranteed single-process.

### For Future Multi-Process Scenarios
If Phase D later involves parallel agent runs or multiple concurrent temp workspaces, the process-scoped lock becomes insufficient. Cross-process collisions could:
- Delete another process's workspace
- Write to another process's temp directory
- Corrupt audit logs

## Decision

```text
ISSUE_324_PHASE_D_IMPACT: NOT_BLOCKING_SINGLE_PROCESS
```

**Rationale:**
- Current scope: no workspace operations → NOT BLOCKING
- Future limited probe: single-process guarantee → NOT BLOCKING
- Multi-process scenarios: would be BLOCKING, but not in current scope
- Explicit single-process constraint must be documented as a hard boundary for any probe

## Required Mitigation for Later Probe

```text
MITIGATION: Any Phase D probe must:
1. Explicitly declare SINGLE_PROCESS mode
2. Document that no parallel Positron runs exist
3. Use unique temp directory names (timestamp-based) to avoid collision even if constraint violated
4. Log process PID in audit entries
```

## Recommendation

Keep #324 OPEN. Accept single-process constraint for limited probe scope. Document as YELLOW_VALIDATE for multi-process future. Do not gate Phase D approval package.
