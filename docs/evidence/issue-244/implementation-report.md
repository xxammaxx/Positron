# Issue #244 — Implementation Report

**Timestamp:** 2026-06-28T11:04:00+02:00
**Agent:** issue-orchestrator
**Branch:** feat/issue-244-runtime-workspace-cleanup

---

## Files Changed

| File | Change | Lines |
|------|--------|-------|
| `packages/shared/src/interfaces.ts` | Added 4 lifecycle methods to `GitWorkspaceAdapter` | +16 |
| `packages/sandbox/src/fake-adapter.ts` | Added destroyWorkspace, lockWorkspace, unlockWorkspace, isLocked | +78 |
| `packages/sandbox/src/real-adapter.ts` | Added same + validateWorkspaceBoundary, constructor | +118 |
| `packages/sandbox/src/__tests__/workspace-cleanup.test.ts` | New: 28 test cases | +266 |
| `packages/run-state/src/state-machine.ts` | Added WorkspaceCleanupFn, registerWorkspaceCleanup, runCleanup, CLEANUP transitions, updated isTerminalPhase | +67 |
| `packages/run-state/src/index.ts` | Added cleanup function exports | +6 |
| `packages/run-state/src/__tests__/state-machine.contract.test.ts` | Updated isTerminalPhase consistency check for CLEANUP | +2 |
| `packages/run-state/src/__tests__/state-machine.property.test.ts` | Updated arb definitions and test for CLEANUP transitions | +12 |
| `apps/server/src/index.ts` | Import registerWorkspaceCleanup/runCleanup; register cleanup in resolveWorkspaceAdapter; call runCleanup before terminal returns | +35 |
| `apps/worker/src/index.ts` | Import registerWorkspaceCleanup; register cleanup in resolveWorkspaceAdapter | +10 |
| `apps/worker/src/pipeline-runner.ts` | Import runCleanup; call runCleanup before terminal returns | +22 |

**Total: 11 files changed, ~632 lines added**

## Implementation Summary

### 1. Interface Extension
Added 4 methods to `GitWorkspaceAdapter`:
- `destroyWorkspace(workspacePath)` → `{ destroyed, reason? }`
- `lockWorkspace(workspacePath, ownerRunId)` → `{ locked, reason? }`
- `unlockWorkspace(workspacePath, ownerRunId)` → `{ unlocked, reason? }`
- `isLocked(workspacePath)` → `{ locked, ownerRunId? }`

### 2. FakeGitWorkspaceAdapter
- In-memory lock tracking via `Map<string, string>` (workspacePath → ownerRunId)
- Destroyed set for idempotent destroy
- Path validation: empty, whitespace, root rejected
- Lock ownership validation
- Idempotent lock (same owner re-lock) and unlock (already unlocked)

### 3. RealGitWorkspaceAdapter
- `validateWorkspaceBoundary()` private method:
  - Rejects empty/whitespace paths
  - Rejects root path
  - Rejects paths outside workspace root
  - Rejects `..` path traversal
- `destroyWorkspace()` calls `fs.rmSync(resolved, { recursive: true, force: true })` after boundary check
- `lockWorkspace/unlockWorkspace/isLocked` — same implementation as fake adapter
- Lock is process-scoped (documented limitation)
- Constructor accepts workspace root from env or default

### 4. State Machine
- `WorkspaceCleanupFn` type: `(workspacePath, runId) => Promise<{ cleaned, reason? }>`
- `registerWorkspaceCleanup(fn)` — registers global cleanup function
- `runCleanup(run)` — calls registered function, handles errors
- `getWorkspaceCleanupFn()` — for testing
- CLEANUP transitions: DONE → CLEANUP, FAILED_BLOCKED → CLEANUP, FAILED_UNSAFE → CLEANUP
- `isTerminalPhase()` updated: phases with only CLEANUP transition are still terminal

### 5. Pipeline Integration
- **Server:** `resolveWorkspaceAdapter()` registers adapter.destroyWorkspace as cleanup
- **Server:** `runFullPipeline()` calls `runCleanup()` before terminal returns (DONE/FAILED)
- **Worker:** `resolveWorkspaceAdapter()` registers adapter.destroyWorkspace as cleanup
- **Worker:** `runPipeline()` calls `runCleanup()` before terminal returns
- Cleanup failures are logged (not silently swallowed)

### 6. Non-Scope Assurance
- ❌ No #245 requiresAuditLog enforcement
- ❌ No #246 GateType layer enforcement
- ❌ No #308 Full Real Mode
- ❌ No UI changes
- ❌ No workflow changes
- ❌ No manual CI trigger
- ❌ No PR #255 merge or reactivation

## Classification

```text
ISSUE_244_IMPLEMENTATION_STATUS: IMPLEMENTED
```

All acceptance criteria met. Tests pass. Build passes. No regressions.
