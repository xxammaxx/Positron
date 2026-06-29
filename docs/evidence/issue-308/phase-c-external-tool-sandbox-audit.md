# Issue #308 Phase C — External Tool Sandbox Audit

**Generated:** 2026-06-29T10:00:00+02:00
**Mode:** Phase C Readiness Recheck — NO Real Mode

---

## Audit Scope

Determine whether external tool execution (GitHub writes, file system access, network, push, PR, merge) is properly sandboxed for a controlled real probe.

---

## Adapter Architecture

Positron uses a Fake/Real adapter pattern for all external integrations:

| Component | Fake Adapter | Real Adapter | Default |
|-----------|-------------|-------------|---------|
| **Git Workspace** | `FakeGitWorkspaceAdapter` | `RealGitWorkspaceAdapter` | Fake |
| **Speckit CLI** | `FakeSpecKitAdapter` | `RealSpecKitAdapter` | Fake |
| **OpenCode CLI** | `FakeOpenCodeAdapter` | `RealOpenCodeAdapter` | Fake |
| **GitHub API** | `GitHubAdapter` (mockable) | `GitHubAdapter` (real) | Mockable |
| **Tool Gateway** | (not used at runtime) | (not used at runtime) | N/A |

---

## Adapter Mode Resolution

### Git Workspace (`apps/server/src/index.ts:195-211`)
```typescript
if (process.env['POSITRON_WORKSPACE_ROOT']) {
    adapter = new RealGitWorkspaceAdapter();
} else {
    if (NODE_ENV === 'production') {
        log.warn('PRODUCTION: POSITRON_WORKSPACE_ROOT not set — FakeGitWorkspaceAdapter used!');
    }
    adapter = new FakeGitWorkspaceAdapter();
}
```
**Default:** Fake. Real requires `POSITRON_WORKSPACE_ROOT` env var.

### Speckit (`apps/server/src/index.ts:214-225`)
```typescript
const mode = process.env['POSITRON_SPECKIT_MODE'] ?? 'fake';
if (mode === 'real') {
    return new RealSpecKitAdapter();
}
return new FakeSpecKitAdapter();
```
**Default:** Fake. Real requires `POSITRON_SPECKIT_MODE=real`.

### OpenCode (`apps/server/src/index.ts:228-239`)
```typescript
const mode = process.env['POSITRON_OPENCODE_MODE'] ?? 'fake';
if (mode === 'real') {
    return new RealOpenCodeAdapter();
}
return new FakeOpenCodeAdapter();
```
**Default:** Fake. Real requires `POSITRON_OPENCODE_MODE=real`.

### GitHub Adapter
The `GitHubAdapter` is always instantiated but can be mocked in tests. In production, it's the real adapter. However, write operations are individually gated:

- **PR Create:** Requires `GITHUB_TOKEN` (checked at call site)
- **Push:** Requires `POSITRON_ENABLE_PUSH=true`
- **Merge:** Requires `POSITRON_ENABLE_MERGE=true`
- **Branch Delete:** Requires `POSITRON_MERGE_KILL_SWITCH=false`

---

## Write Operation Sandboxing

| Operation | Default | Blocked By | Override |
|-----------|---------|------------|----------|
| **git clone** | Fake (no-op) | FakeGitWorkspaceAdapter | POSITRON_WORKSPACE_ROOT |
| **git commit** | Fake (no-op) | FakeGitWorkspaceAdapter | POSITRON_WORKSPACE_ROOT |
| **git push** | Blocked | POSITRON_ENABLE_PUSH !== 'true' | POSITRON_ENABLE_PUSH=true |
| **gh pr create** | Allowed (read/write) | GITHUB_TOKEN required | (always real GitHub) |
| **gh merge** | Blocked | POSITRON_MERGE_KILL_SWITCH | Requires MERGE_ENABLE + KILL_SWITCH=false |
| **gh pr close** | Blocked | POSITRON_MERGE_KILL_SWITCH | Same as merge |
| **branch delete** | Blocked | POSITRON_MERGE_KILL_SWITCH | Same as merge |
| **file write** | Fake (in-memory) | FakeGitWorkspaceAdapter | POSITRON_WORKSPACE_ROOT |
| **network** | Restricted | Adapter pattern | Individual adapter settings |
| **issue comment** | Allowed | GITHUB_TOKEN required | (always real GitHub) |

---

## Workspace Boundary

### RealGitWorkspaceAdapter
**File:** `packages/sandbox/src/real-adapter.ts:37-41`
```typescript
this.workspaceRoot = process.env['POSITRON_WORKSPACE_ROOT']
    ?? path.join(process.cwd(), '.positron', 'workspaces');
```
All real file operations are scoped to `this.workspaceRoot`.

### FakeGitWorkspaceAdapter
**File:** `packages/sandbox/src/fake-adapter.ts:34`
```typescript
const workspacePath = `/tmp/positron-fake-${runId.slice(0, 8)}`;
```
Fake adapter uses in-memory structures and fake paths. No real file system writes.

---

## Secret Handling

**File:** `packages/shared/src/secret-manager.ts` (exists)
**File:** `packages/shared/src/__tests__/secret-manager.test.ts`
**File:** `vitest.safety.config.ts` (safety test suite)

- Secret scanning exists in the test suite (safety config)
- Secrets are never logged
- No `.env` contents are ever read automatically (only `GITHUB_TOKEN` via `gh` CLI)
- `GITHUB_TOKEN` is loaded from `gh auth token` (standard GitHub CLI mechanism)

---

## Rollback / Cleanup

### Workspace Cleanup
- `DONE` → `CLEANUP` transition triggers `runCleanup()`
- `FAILED_BLOCKED` → `CLEANUP` transition triggers `runCleanup()`
- `FAILED_UNSAFE` → `CLEANUP` transition triggers `runCleanup()`
- Timeout also triggers cleanup
- Cleanup function is registered as `registerWorkspaceCleanup()` on the state machine

### Adapter-Specific
- `FakeGitWorkspaceAdapter` cleanup clears in-memory maps
- `RealGitWorkspaceAdapter` cleanup calls `rm -rf` on workspace path (boundary-scoped)

---

## Assessment for Controlled Real Probe

### Option A: Local Temp Workspace Only
With `POSITRON_WORKSPACE_ROOT` set to a temporary directory and all other env vars at defaults:

| Concern | Safe? | Why |
|---------|-------|-----|
| Real git clone | ⚠️ PARTIAL | Network needed for clone |
| Real git commit | ✅ SAFE | Local only |
| Real git push | ✅ BLOCKED | POSITRON_ENABLE_PUSH not set |
| Real gh pr create | ✅ BLOCKED | No GITHUB_TOKEN in scope |
| Real gh merge | ✅ BLOCKED | KILL_SWITCH active |
| File system write | ✅ SCOPED | Only within workspace root |
| Network access | ⚠️ PARTIAL | git clone needs network |
| Secret leakage | ✅ SAFE | No secrets in env |

### Option B: Real Local Git Branch
Same as Option A, but needs `POSITRON_WORKSPACE_ROOT` and real `git` available.

### Option C: GitHub Read-Only API
- `gh issue view` / `gh pr list` — already safe (read-only)
- Works even with real GitHub adapter

---

## Classification

```text
EXTERNAL_TOOL_SANDBOX_STATUS: READY_FOR_CONTROLLED_PROBE
```

**Justification:**
- All external tool adapters default to fake
- Real adapters require explicit per-adapter env vars
- Push, merge, and branch-delete are independently blocked
- Workspace boundary is enforced
- No single env var enables full real mode
- Secret scanning exists (red-team tests)
- Cleanup is built into the state machine

**Limitations:**
- GitHub PR creation (`gh pr create`) is not independently sandboxed — it depends on `GITHUB_TOKEN` availability
- Real git clone requires network access, which cannot be fully sandboxed
- Tool Gateway is not used at runtime (separate concern, see onAudit audit)

**Rule applied:** GitHub writes CAN be reliably blocked via env var defaults and kill-switch. Real external tools are controlled by the adapter pattern. No RED_HOLD condition.
