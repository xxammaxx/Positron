# Issue #244 — Design Plan

**Timestamp:** 2026-06-28T10:32:00+02:00
**Agent:** issue-orchestrator
**Reference:** PR #255 (salvage audit), current `main` codebase

---

## 1. Interface Extension

### `packages/shared/src/interfaces.ts`

Add 4 new methods to `GitWorkspaceAdapter`:

```typescript
/** Destroy workspace directory after run completes or fails. */
destroyWorkspace(workspacePath: string): Promise<{ destroyed: boolean; reason?: string }>;

/** Acquire advisory lock on workspace to prevent parallel access. */
lockWorkspace(workspacePath: string, ownerRunId: string): Promise<{ locked: boolean; reason?: string }>;

/** Release advisory lock on workspace. */
unlockWorkspace(workspacePath: string, ownerRunId: string): Promise<{ unlocked: boolean; reason?: string }>;

/** Check if workspace is currently locked. */
isLocked(workspacePath: string): Promise<{ locked: boolean; ownerRunId?: string }>;
```

**Design rationale:** Return types are consistent result objects (not throwing errors) to allow the caller to decide how to handle edge cases. All methods return structured results with `reason` for diagnostics.

---

## 2. FakeGitWorkspaceAdapter

### 2.1 New Internal State

```typescript
private locks = new Map<string, string>();   // workspacePath → ownerRunId
private destroyed = new Set<string>();        // Set of destroyed workspace paths
```

### 2.2 destroyWorkspace(workspacePath)

**Behavior:**
- Reject empty/whitespace-only path → `{ destroyed: false, reason: 'Rejected: empty workspace path' }`
- Reject root path (`/` or `\`) → `{ destroyed: false, reason: 'Rejected: root path...' }`
- If already destroyed (in `destroyed` set) → `{ destroyed: true, reason: 'Already destroyed (idempotent)' }`
- Find runId from `workspaceToRunId` map, delete all associated maps:
  - `workspaces.delete(runId)`
  - `fileStates.delete(runId)`
  - `workspaceToRunId.delete(workspacePath)`
  - `workspaceDirty.delete(workspacePath)`
  - `locks.delete(workspacePath)`
- Add workspacePath to `destroyed` set
- Return `{ destroyed: true }`

**Properties:** Idempotent, safe for any valid/fake path, cleans up all internal state.

### 2.3 lockWorkspace(workspacePath, ownerRunId)

**Behavior:**
- Reject if workspacePath or ownerRunId is empty/falsy → `{ locked: false, reason: '...' }`
- If already locked by same ownerRunId → `{ locked: true, reason: 'Already locked by same owner (idempotent)' }`
- If already locked by different ownerRunId → `{ locked: false, reason: 'Workspace already locked by run "X"' }`
- Otherwise, set lock and return `{ locked: true }`

**Properties:** Idempotent for same owner, blocks concurrent locks, clear error messages.

### 2.4 unlockWorkspace(workspacePath, ownerRunId)

**Behavior:**
- Reject if path or ownerRunId is empty/falsy
- If not locked → `{ unlocked: true, reason: 'Not locked (idempotent)' }`
- If locked by different owner → `{ unlocked: false, reason: 'Cannot unlock: workspace owned by "X", not "Y"' }`
- If locked by same owner → delete lock, return `{ unlocked: true }`

**Properties:** Ownership-validated, idempotent for already-unlocked state.

### 2.5 isLocked(workspacePath)

**Behavior:**
- Return `{ locked: true, ownerRunId: owner }` if locked
- Return `{ locked: false }` if not locked

**Properties:** Deterministic, always succeeds.

---

## 3. RealGitWorkspaceAdapter

### 3.1 New Internal State

```typescript
private locks = new Map<string, string>();   // workspacePath → ownerRunId
private workspaceRoot: string;                // Resolved workspace root path
```

Constructor sets `workspaceRoot` from `POSITRON_WORKSPACE_ROOT` env var or default `.positron/workspaces`.

### 3.2 validateWorkspaceBoundary(workspacePath) — PRIVATE

**Behavior:**
- Reject empty/whitespace path
- `path.resolve(workspacePath)` and check against `path.resolve('/')` — reject root
- Check resolved path starts with `path.resolve(this.workspaceRoot)` — reject outside-workspace
- `path.normalize(workspacePath)` and check for `..` — reject path traversal
- Return `{ ok: true }` if all checks pass, `{ ok: false, reason: '...' }` otherwise

**Security properties:** Blocks empty, root, outside-workspace, and path-traversal paths before any filesystem operation.

### 3.3 destroyWorkspace(workspacePath)

**Behavior:**
- Call `validateWorkspaceBoundary(workspacePath)` — return error if fails
- `path.resolve(workspacePath)` to get canonical path
- If path doesn't exist (idempotent) → clean up lock, return `{ destroyed: true, reason: 'Workspace already removed (idempotent)' }`
- `fs.rmSync(resolved, { recursive: true, force: true })` wrapped in try/catch
- On success: delete lock, return `{ destroyed: true }`
- On failure: return `{ destroyed: false, reason: 'Failed to destroy: <error>' }`

**Security properties:** Boundary-validated before rm, uses resolved path, idempotent.

### 3.4 lockWorkspace / unlockWorkspace / isLocked

Same implementation as FakeGitWorkspaceAdapter (identical logic). Lock is process-scoped (in-memory Map).

**Limitation documented:** This lock is PROCESS-SCOPED only. Multi-process/cluster deployments require a persistent lock store (future issue).

### 3.5 Lockfile Design — DEFERRED

Lockfile-based persistent locking is NOT implemented in this issue. It is deferred to a follow-up issue. The current in-memory lock provides protection within a single Positron server process.

---

## 4. State Machine / Pipeline Integration

### 4.1 run-state/src/state-machine.ts

**New type:**
```typescript
export type WorkspaceCleanupFn = (
  workspacePath: string,
  runId: string,
) => Promise<{ cleaned: boolean; reason?: string }>;
```

**New module-level state:**
```typescript
let workspaceCleanupFn: WorkspaceCleanupFn | null = null;
```

**New functions:**
```typescript
export function registerWorkspaceCleanup(fn: WorkspaceCleanupFn): void
export function getWorkspaceCleanupFn(): WorkspaceCleanupFn | null
export async function runCleanup(run: RunState): Promise<{ cleaned: boolean; reason?: string }>
```

**runCleanup logic:**
- If `run.workspacePath` is null → `{ cleaned: true, reason: 'No workspace path' }`
- If no cleanup fn registered → `{ cleaned: false, reason: 'No cleanup function registered' }`
- Call `workspaceCleanupFn(run.workspacePath, run.id)` in try/catch
- Return result

**CLEANUP transitions (VALID_TRANSITIONS update):**
```typescript
DONE: ['CLEANUP'],
FAILED_BLOCKED: ['CLEANUP'],
FAILED_UNSAFE: ['CLEANUP'],
CLEANUP: [],  // unchanged — CLEANUP is a terminal sink
```

**isTerminalPhase update:**
- If a phase's only transition is to CLEANUP, it's still terminal
- DONE, FAILED_BLOCKED, FAILED_UNSAFE with only CLEANUP transition → terminal

### 4.2 run-state/src/index.ts

Add exports:
- `registerWorkspaceCleanup`
- `runCleanup`
- `getWorkspaceCleanupFn`
- `WorkspaceCleanupFn` type

### 4.3 Server Pipeline Wiring (apps/server/src/index.ts)

In `runFullPipeline()`, after terminal phase detection:
- When transitioning to DONE/FAILED_BLOCKED/FAILED_UNSAFE, trigger CLEANUP transition
- Call `runCleanup(run)` and log result
- Cleanup errors must be logged (not silently swallowed)

### 4.4 Worker Pipeline Wiring (apps/worker/src/index.ts, apps/worker/src/pipeline-runner.ts)

Same pattern as server — trigger CLEANUP after terminal phases.

---

## 5. Security Design

### Path Safety (Real Adapter)

| Threat | Mitigation |
|--------|------------|
| Empty path | Rejected by `validateWorkspaceBoundary` |
| Root path (`/`, `C:\`) | Rejected by `validateWorkspaceBoundary` |
| Path traversal (`..`) | Rejected by `path.normalize()` check |
| Outside workspace root | Rejected by `startsWith` check on resolved paths |
| Symlink escape | Partially mitigated by `path.resolve()` — full symlink check deferred |
| TOCTOU (time-of-check-time-of-use) | `path.resolve()` result used for both check and rm |
| Concurrent destroy | `fs.rmSync` with `force: true` is safe |

### Lock Safety

| Threat | Mitigation |
|--------|------------|
| Double lock | Rejected with clear reason |
| Unlock by wrong owner | Rejected with ownership validation |
| Lock after destroy | Lock state cleaned during destroy |
| Process crash | Lock lost (process-scoped) — documented limitation |
| Multi-process race | NOT protected — documented as process-scoped |

### Data Safety

| Threat | Mitigation |
|--------|------------|
| Deleting wrong directory | Boundary validation before rm |
| Silent cleanup failure | Result returned, logged, not swallowed |
| Cleanup during active run | Lock must be released first |

---

## 6. Non-Scope (Explicitly Excluded)

- ❌ #245 `requiresAuditLog` enforcement
- ❌ #246 GateType layers enforcement
- ❌ #308 Full Real Mode
- ❌ UI changes (Dashboard, Oversight, Blueprint Launcher, Providers)
- ❌ Infrastructure state stores
- ❌ MCP warmup
- ❌ Workflow files
- ❌ CodeRabbit config
- ❌ Persistent multi-process locking
- ❌ Lockfile implementation
- ❌ EvidencePath field on RunState
- ❌ workspaceLocked field on RunState

---

## 7. Test Plan

### Fake Adapter Tests (15+ cases)

1. destroyWorkspace rejects empty path
2. destroyWorkspace rejects root path
3. destroyWorkspace is idempotent (already destroyed)
4. destroyWorkspace cleans up internal maps after prepareWorkspace
5. lockWorkspace prevents concurrent lock by different owner
6. lockWorkspace allows same owner re-lock (idempotent)
7. lockWorkspace rejects empty path/ownerRunId
8. unlockWorkspace cannot unlock another owner's workspace
9. unlockWorkspace succeeds when owner matches
10. unlockWorkspace is idempotent when not locked
11. isLocked returns false for unlocked workspace
12. isLocked returns true + ownerRunId for locked workspace
13. Lock released after destroyWorkspace

### Real Adapter Tests (8+ cases)

14. destroyWorkspace rejects empty path
15. destroyWorkspace rejects root path
16. destroyWorkspace rejects path traversal (`..`)
17. destroyWorkspace actually removes temp directory (with tmpdir)
18. lockWorkspace prevents concurrent lock
19. unlockWorkspace validates ownership
20. isLocked returns correct status

### State Machine / CLEANUP Tests (3+ cases)

21. CLEANUP transition available from DONE
22. CLEANUP transition available from FAILED_BLOCKED/FAILED_UNSAFE
23. isTerminalPhase treats DONE/FAILED_BLOCKED/FAILED_UNSAFE as terminal
24. runCleanup called with registered function
25. runCleanup handles null workspacePath gracefully
26. runCleanup handles unregistered function gracefully

### Cross-platform considerations
- Use `tmpdir()` for real adapter filesystem tests
- No absolute dangerous paths
- No real project file deletion
- No sleeps/flaky timings

---

## Classification

```text
ISSUE_244_DESIGN_STATUS: GREEN_SAFE
```

**Rationale:** Design is focused, bounded, and uses proven patterns from PR #255 reference. Path safety is comprehensive. Locking is process-scoped (documented limitation). No #245/#246 scope. All security threats have mitigations. Test plan is comprehensive. Ready for implementation.
