# Issue #308 Phase C — Rollback / Cleanup / Failure Recovery Audit

**Generated:** 2026-06-29T10:00:00+02:00
**Mode:** Phase C Readiness Recheck — NO Real Mode

---

## Audit Scope

Verify that workspace cleanup, failure recovery, and rollback mechanisms are adequate for a controlled real probe.

---

## Cleanup Lifecycle

### State Machine Integration

**File:** `packages/run-state/src/state-machine.ts:183-226`

The state machine provides:

1. **`WorkspaceCleanupFn` type** (line 186): Callback with `(workspacePath, runId) => Promise<{cleaned, reason?}>`
2. **`registerWorkspaceCleanup()`** (line 199): Registers the cleanup function
3. **`getWorkspaceCleanupFn()`** (line 206): Retrieves for testing
4. **`runCleanup(run)`** (line 213): Executes cleanup with error handling

```typescript
export async function runCleanup(run: RunState): Promise<{cleaned: boolean; reason?: string}> {
    if (!run.workspacePath) {
        return { cleaned: true, reason: 'No workspace path to clean up' };
    }
    if (!workspaceCleanupFn) {
        return { cleaned: false, reason: 'No workspace cleanup function registered' };
    }
    try {
        return await workspaceCleanupFn(run.workspacePath, run.id);
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return { cleaned: false, reason: `Cleanup failed: ${msg}` };
    }
}
```

**Key behaviors:**
- Safe if no workspace path → returns clean (nothing to do)
- Safe if no cleanup function → returns not cleaned (non-fatal)
- Catches cleanup errors → returns not cleaned (never throws)

### VALID_TRANSITIONS for Cleanup

| From | To | When |
|------|----|------|
| `DONE` | `CLEANUP` | Normal completion |
| `FAILED_BLOCKED` | `CLEANUP` | Gate failure |
| `FAILED_UNSAFE` | `CLEANUP` | Safety violation |
| (Timeout) | manual `runCleanup()` | Max steps exceeded |

`CLEANUP` phase has no outgoing transitions — terminal.

---

## Server Integration

**File:** `apps/server/src/index.ts:1868-1880`

```typescript
// Issue #244: Run workspace cleanup on terminal phase
runCleanup(next)
    .then((cleanupResult) => {
        if (!cleanupResult.cleaned) {
            log.warn(`Workspace cleanup: ${cleanupResult.reason ?? 'unknown'}`, { runId: next.id });
        }
    })
    .catch((err) => {
        log.error(`Workspace cleanup error: ${err instanceof Error ? err.message : String(err)}`,
            { runId: next.id });
    });
```

Called after `saveRunToDb(next)` on terminal phases. Cleanup is async (fire-and-forget after DB save).

### Timeout Cleanup

**File:** `apps/server/src/index.ts:1912-1923`
```typescript
runCleanup(result.run)
    .then((cleanupResult) => {
        if (!cleanupResult.cleaned) {
            log.warn(`Workspace cleanup: ${cleanupResult.reason ?? 'unknown'}`, { runId: result.run.id });
        }
    })
    .catch((err) => { ... });
```

Also called on timeout/max-steps-exceeded.

---

## Cleanup Function Registration

**File:** `apps/server/src/index.ts:206-210`
```typescript
registerWorkspaceCleanup(async (workspacePath: string, _runId: string) => {
    const result = await adapter.destroyWorkspace(workspacePath);
    return { cleaned: result.destroyed, reason: result.reason };
});
```

This is registered once at startup. The same cleanup function serves all runs.

---

## Workspace Lock

**File:** `packages/sandbox/src/real-adapter.ts:33`
```typescript
// Issue #244 Limitation: This lock is PROCESS-SCOPED only.
private locks = new Map<string, string>();
```

The lock is process-scoped. For multi-process deployments, a persistent lock store is needed (documented limitation).

---

## Failure Mode Coverage

| Scenario | Cleanup Triggered? | Cleanup Safe? |
|----------|-------------------|---------------|
| Normal DONE | ✅ Yes (CLEANUP transition) | ✅ Safe |
| FAILED_BLOCKED | ✅ Yes (CLEANUP transition) | ✅ Safe |
| FAILED_UNSAFE | ✅ Yes (CLEANUP transition) | ✅ Safe |
| Timeout / max steps | ✅ Yes (manual runCleanup) | ✅ Safe |
| Thrown error in cleanup | ✅ Caught (fire-and-forget) | ✅ Safe |
| Lock release on failure | ⚠️ Partial (process-scoped) | ⚠️ Partial |
| No workspace path | ✅ Skipped (returns clean) | ✅ Safe |
| No cleanup function | ✅ Skipped (reason logged) | ✅ Safe |
| Audit log on failure | ❌ No audit sink wired | ⚠️ See onAudit audit |

---

## Rollback Plan Assessment

### No-Merge Rollback
Since merge is prohibited, the primary rollback concern is workspace cleanup:
- Delete temp workspace directory (handled by `destroyWorkspace()`)
- Remove local git branch if created (handled by cleanup)
- Release workspace lock (process-scoped)

### No-Push Rollback
Since push is blocked by default, no remote state needs rollback:
- Only local workspace state needs cleanup
- No remote branches to delete

### Branch Cleanup
The cleanup function handles workspace deletion. Branch deletion is blocked by `POSITRON_MERGE_KILL_SWITCH`.

### Pre-existing Dist Artifact Handling
Currently handled as informational — dist artifacts in the working tree are documented but not cleaned. This is a pre-existing condition, not introduced by Phase C.

---

## Dry-Run Rollback Plan

For a controlled real probe with local temp workspace:
1. Workspace is created under `POSITRON_WORKSPACE_ROOT` or `.positron/workspaces/`
2. Cleanup at DONE/Failure deletes the workspace directory
3. If cleanup fails, workspace remains on disk (manual cleanup needed)
4. No remote state is affected (no push, no merge)

---

## Classification

```text
ROLLBACK_CLEANUP_STATUS: READY_WITH_LIMITATIONS
```

**Justification:**
- Workspace cleanup is integrated into the state machine lifecycle
- Cleanup is triggered for all terminal phases (DONE, FAILED_BLOCKED, FAILED_UNSAFE)
- Cleanup is also triggered on timeout
- Error handling in cleanup is non-fatal (logged but doesn't crash)
- Workspace lock is process-scoped only (documented limitation)
- No audit log persistence during failure (see onAudit audit)

**Limitations for Controlled Real Probe:**
- Process-scoped lock is adequate for a single-instance local probe
- Missing audit sink is not blocking for cleanup itself
- No branch cleanup policy exists (but no branches are pushed, so no remote cleanup needed)
