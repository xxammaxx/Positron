# Issue #244 — PR #255 Salvage Audit

**Timestamp:** 2026-06-28T10:32:00+02:00
**Agent:** issue-orchestrator
**Source:** PR #255 (CLOSED, NOT MERGED, head: `positron/issue-243-p0-runtime-safety`)

---

## PR #255 Overview

PR #255 was a large combined PR that attempted to implement Issues #243, #244, #245, and #246 simultaneously, along with UI, Oversight, Blueprint Launcher, MCP warmup, and infrastructure state store changes. It was closed without merging.

## File Classification

### Files Belonging to #244 (Workspace Cleanup)

| File | Description | Salvageable? |
|------|-------------|-------------|
| `packages/sandbox/src/fake-adapter.ts` (L152-224) | destroyWorkspace, lockWorkspace, unlockWorkspace, isLocked | ✅ Full |
| `packages/sandbox/src/real-adapter.ts` (L261-359) | Same + validateWorkspaceBoundary, path safety | ✅ Full |
| `packages/sandbox/src/__tests__/workspace-cleanup.test.ts` | 13 test cases for fake adapter cleanup/locking | ✅ Full |
| `packages/shared/src/interfaces.ts` (L289-296) | Interface extension with 4 new methods | ✅ Full |
| `packages/run-state/src/state-machine.ts` (L168-211, L298-308, L501-508) | CLEANUP phase, cleanupFn, registerWorkspaceCleanup, runCleanup, isTerminalPhase update, CLEANUP transitions | ✅ Full |
| `packages/run-state/src/index.ts` (L6-7) | Cleanup function exports | ✅ Full |

### Files Belonging to #245 (requiresAuditLog Enforcement)

| File | Description |
|------|-------------|
| `packages/shared/src/approval-gates.ts` | Gate evaluation logic |
| `packages/shared/src/__tests__/approval-gates.test.ts` | Gate tests |
| `packages/run-state/src/__tests__/gate-enforcement.test.ts` | Gate enforcement tests |
| `packages/run-state/src/__tests__/state-machine.property.test.ts` | State machine property tests |

These files contain `requiresAuditLog` enforcement logic that must NOT be ported.

### Files Belonging to #246 (GateType Layers)

| File | Description |
|------|-------------|
| `packages/run-state/src/__tests__/state-machine.contract.test.ts` | Contract test changes |
| Various gate evaluation changes in state-machine.ts | Gate layer enforcement |

### Files with UI/Provider/Oversight/Blueprint Scope

| File | Description |
|------|-------------|
| `apps/web/src/App.tsx` | React app changes |
| `apps/web/src/components/dashboard/*` | Dashboard components |
| `apps/web/src/components/oversight/*` | Oversight UI components |
| `apps/web/src/pages/BlueprintLauncherPage.tsx` | Blueprint Launcher |
| `apps/web/src/pages/OversightPage.tsx` | Oversight page |
| `apps/web/src/pages/ProvidersPage.tsx` | Provider dashboard |
| `apps/web/src/types.ts` | Frontend types |
| `apps/server/src/oversight/*` | Oversight backend |
| `apps/server/src/infrastructure/*` | Infrastructure stores |
| `apps/server/src/__tests__/blueprint-handoff.test.ts` | Blueprint tests |
| `apps/server/src/__tests__/oversight.test.ts` | Oversight tests |

### Files with Infrastructure/Docs/Misc Scope

Many additional files in `packages/shared/src/`, `docs/`, `apps/worker/`, etc. that are NOT #244-scoped.

## Commit 90b5155 Analysis

Commit `90b5155` (`fix(issue-243): wire runtime gates into orchestrator and worker`) is the HEAD of PR #255 and contains the final state of all changes including:
- Server `runCleanup` wiring in `apps/server/src/index.ts`
- Worker cleanup wiring in `apps/worker/src/index.ts` and `apps/worker/src/pipeline-runner.ts`

This commit shows how CLEANUP was wired into `runFullPipeline` and `runPipeline`, which is valuable reference for understanding the integration pattern. However, the actual wiring code also touches #245/#246 gate logic, so only the cleanup-specific portions are salvageable.

## Code Quality Assessment

### Fake Adapter Implementation (PR #255)
- **Quality:** Good. Methods are idempotent, ownership-validated, and well-documented.
- **Safety:** Empty path and root path rejection. Lock ownership validated.
- **Issues:** No boundary checks for path traversal (acceptable for fake adapter).

### Real Adapter Implementation (PR #255)
- **Quality:** Good. `validateWorkspaceBoundary` provides comprehensive path safety.
- **Safety:** Empty, root, outside-workspace, and `..` traversal all blocked. Uses `path.resolve()` and `path.normalize()`.
- **Lock mechanism:** In-process only (Map), documented as process-scoped. Lockfile mentioned in code but not implemented.
- **Issues:** No actual lockfile implementation — uses in-memory Map. This is consistent with PR #255 being a combined effort where persistent locking was deferred.

### Test File (PR #255)
- **Quality:** Good. 13 test cases covering destroy, lock, unlock, isLocked for fake adapter.
- **Gaps:** No tests for RealGitWorkspaceAdapter cleanup/locking. No CLEANUP phase integration tests.
- **Salvageable:** Core fake adapter tests are directly reusable.

### State Machine Changes (PR #255)
- **Quality:** Clean. `WorkspaceCleanupFn`, `registerWorkspaceCleanup`, `runCleanup` are minimal and focused.
- **CLEANUP transitions:** DONE, FAILED_BLOCKED, FAILED_UNSAFE → CLEANUP.
- **isTerminalPhase:** Updated to treat phases that only go to CLEANUP as terminal.
- **Issues:** None — these changes are #244-pure.

## Salvage Recommendation

```text
PR_255_SALVAGE_STATUS: USE_AS_REFERENCE_ONLY
```

**Policy:** PR #255 is NEVER to be merged directly. Selected #244-only portions may be ported to a fresh branch on current `main`.

**Safe to port:**
1. `packages/shared/src/interfaces.ts` — Add 4 new methods to `GitWorkspaceAdapter`
2. `packages/sandbox/src/fake-adapter.ts` — Add destroyWorkspace/lockWorkspace/unlockWorkspace/isLocked
3. `packages/sandbox/src/real-adapter.ts` — Add same + validateWorkspaceBoundary
4. `packages/sandbox/src/__tests__/workspace-cleanup.test.ts` — Port and extend
5. `packages/run-state/src/state-machine.ts` — Add CLEANUP transition wiring + cleanup functions
6. `packages/run-state/src/index.ts` — Add cleanup exports

**Must NOT port:**
- Any #245 requiresAuditLog enforcement
- Any #246 GateType layer enforcement  
- Any UI, Oversight, Blueprint, Provider Dashboard code
- Any infrastructure state store code
- Any MCP warmup code
- Any workflow changes
- Any docs changes beyond minimal #244 documentation

**Porting strategy:** Fresh implementation on `main` using PR #255 as reference, NOT cherry-pick.
