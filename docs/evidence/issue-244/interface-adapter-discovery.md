# Issue #244 — Interface / Adapter Discovery

**Timestamp:** 2026-06-28T10:32:00+02:00
**Agent:** issue-orchestrator
**Source:** Current `main` branch (`c0d3924`)

---

## Discovery Summary

### GitWorkspaceAdapter Interface

**File:** `packages/shared/src/interfaces.ts` (lines 278-290)

**Current methods (on `main`):**
- `prepareWorkspace(input)` ✅
- `getStatus(workspacePath)` ✅
- `getDiff(workspacePath, options?)` ✅
- `getCurrentBranch(workspacePath)` ✅
- `getHeadSha(workspacePath)` ✅
- `validateWorkspacePath(workspacePath)` ✅
- `commit(workspacePath, message)` ✅
- `push(options)` ✅

**Missing methods:**
- `destroyWorkspace(workspacePath)` ❌ NOT IN INTERFACE
- `lockWorkspace(workspacePath, ownerRunId)` ❌ NOT IN INTERFACE
- `unlockWorkspace(workspacePath, ownerRunId)` ❌ NOT IN INTERFACE
- `isLocked(workspacePath)` ❌ NOT IN INTERFACE

**Note:** Issue #244 claims these are at lines 289-296, but they are NOT present in current `main`. They must be ADDED as part of this implementation.

### FakeGitWorkspaceAdapter

**File:** `packages/sandbox/src/fake-adapter.ts` (150 lines)

**Status:** Implements all 8 interface methods. None of the 4 new methods exist.

**Internal state maps:**
- `workspaces: Map<string, PreparedWorkspace>` — runId → workspace data
- `fileStates: Map<string, Map<string, string>>` — runId → file state map
- `workspaceDirty: Map<string, boolean>` — workspacePath → dirty flag
- `workspaceToRunId: Map<string, string>` — workspacePath → runId

**Missing:**
- No `locks` map
- No `destroyed` set
- No `destroyWorkspace()`
- No `lockWorkspace()`
- No `unlockWorkspace()`
- No `isLocked()`

### RealGitWorkspaceAdapter

**File:** `packages/sandbox/src/real-adapter.ts` (241 lines)

**Status:** Implements all 8 interface methods. None of the 4 new methods exist.

**Missing:**
- No workspace root tracking
- No `validateWorkspaceBoundary()`
- No `destroyWorkspace()`
- No `lockWorkspace()`
- No `unlockWorkspace()`
- No `isLocked()`

### RunState Interface

**File:** `packages/run-state/src/state-machine.ts` (line 9-23)

**Current fields:**
- `workspacePath: string | null` ✅ (from Issue #36)

**Missing (claimed by Issue #244):**
- `evidencePath` — NOT present
- `workspaceLocked` — NOT present

### State Machine — CLEANUP Phase

**File:** `packages/run-state/src/state-machine.ts`

**Current CLEANUP status:**
- `CLEANUP: []` exists in `VALID_TRANSITIONS` (line 89) ✅
- No phases transition TO CLEANUP ❌
- No `WorkspaceCleanupFn` type ❌
- No `registerWorkspaceCleanup()` ❌
- No `runCleanup()` ❌
- CLEANUP is in terminal phases list (line 268) ✅
- `isTerminalPhase()` does NOT account for CLEANUP-only transitions ❌

### Server — Pipeline Integration

**File:** `apps/server/src/index.ts`

**Current state:**
- `runFullPipeline()` exists (line 1525) ✅
- No CLEANUP phase transition in pipeline ❌
- No `runCleanup()` call after terminal phases ❌
- No `registerWorkspaceCleanup()` registration ❌

### Worker — Pipeline Integration

**File:** `apps/worker/src/index.ts`, `apps/worker/src/pipeline-runner.ts`

**Current state:** Not examined in detail — worker pipeline may or may not need cleanup wiring.

### Tests

**Workspace cleanup tests:**
- `packages/sandbox/src/__tests__/workspace-cleanup.test.ts` — DOES NOT EXIST ❌

**State machine tests:**
- No cleanup-specific tests exist ❌

---

## Gap Analysis

| Component | Status | Action Required |
|-----------|--------|-----------------|
| Interface methods | Missing | Add 4 new methods to `GitWorkspaceAdapter` |
| Fake adapter | Missing | Implement all 4 methods |
| Real adapter | Missing | Implement all 4 methods + path safety |
| State machine CLEANUP | Partial | Add transitions, cleanupFn, runCleanup |
| Server pipeline wiring | Missing | Wire CLEANUP after terminal phases |
| Worker pipeline wiring | Missing | Wire CLEANUP after terminal phases |
| Tests | Missing | Create comprehensive test suite |

## Classification

```text
ISSUE_244_DISCOVERY_STATUS: PARTIAL
```

**Rationale:** Interface exists but lacks the 4 methods. Both adapters exist but lack implementation. CLEANUP phase skeleton exists but transitions and wiring are missing. No tests exist. This is a greenfield implementation within existing infrastructure.
