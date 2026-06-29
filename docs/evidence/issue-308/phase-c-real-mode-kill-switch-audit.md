# Issue #308 Phase C — Real-Mode Kill-Switch / Env Gate Audit

**Generated:** 2026-06-29T10:00:00+02:00
**Mode:** Phase C Readiness Recheck — NO Real Mode
**Caution:** No `.env` files read. Code/docs/tests only.

---

## Audit Scope

Verify that real-mode kill-switches are properly implemented, that real mode defaults to blocked, and that no single env variable suffices to enable dangerous operations.

---

## Kill-Switch Inventory

### POSITRON_ENABLE_REAL_SPECKIT
**Purpose:** Enables real Speckit adapter execution.
**Default:** false (not set = FakeSpecKitAdapter)
**Code:** `apps/server/src/index.ts:215-225`
```typescript
const mode = process.env['POSITRON_SPECKIT_MODE'] ?? 'fake';
if (mode === 'real') {
    return new RealSpecKitAdapter();
}
return new FakeSpecKitAdapter();
```
**Verification:** ✅ Single env var required. Default is safe.

### POSITRON_OPENCODE_MODE
**Purpose:** Enables real OpenCode adapter execution.
**Default:** false (not set = FakeOpenCodeAdapter)
**Code:** `apps/server/src/index.ts:228-239`
```typescript
const mode = process.env['POSITRON_OPENCODE_MODE'] ?? 'fake';
if (mode === 'real') {
    return new RealOpenCodeAdapter();
}
return new FakeOpenCodeAdapter();
```
**Verification:** ✅ Single env var required. Default is safe.

### POSITRON_WORKSPACE_ROOT
**Purpose:** Enables RealGitWorkspaceAdapter (real git operations).
**Default:** not set = FakeGitWorkspaceAdapter
**Code:** `apps/server/src/index.ts:195-204`
```typescript
if (process.env['POSITRON_WORKSPACE_ROOT']) {
    adapter = new RealGitWorkspaceAdapter();
} else {
    adapter = new FakeGitWorkspaceAdapter();
}
```
**Verification:** ✅ Defaults to fake. Production warns if not set.

### POSITRON_ENABLE_PUSH
**Purpose:** Allows git push operations.
**Default:** false (not set = push blocked)
**Code:** `apps/server/src/index.ts:1072`, `packages/sandbox/src/commit-policy.ts:75-76`
```typescript
const pushAllowed = process.env.POSITRON_ENABLE_PUSH === 'true';
```
**Verification:** ✅ Push blocked by default. Tests verify: `commit-policy.test.ts:107`

### POSITRON_ENABLE_MERGE
**Purpose:** Allows git merge operations.
**Default:** false (not set = merge blocked)
**Code:** `apps/server/src/index.ts:1263`
```typescript
const mergeAllowed = process.env.POSITRON_ENABLE_MERGE === 'true';
```
**Verification:** ✅ Merge blocked by default.

### POSITRON_MERGE_KILL_SWITCH
**Purpose:** Emergency brake — overrides POSITRON_ENABLE_MERGE.
**Default:** ACTIVE (only set to 'false' disables it)
**Code:** `apps/server/src/index.ts:1265`, `packages/opencode-adapter/src/dry-run-agent.ts:161`
```typescript
const mergeKillSwitch = process.env.POSITRON_MERGE_KILL_SWITCH !== 'false';
```
**Verification:** ✅ Active by default. Even if POSITRON_ENABLE_MERGE=true, kill-switch blocks.

### POSITRON_MERGE_DRY_RUN
**Purpose:** Forces merge to be evaluated but never executed.
**Default:** not set = real merge possible (if other gates pass)
**Code:** `apps/server/src/index.ts:1264`
```typescript
const mergeDryRun = process.env.POSITRON_MERGE_DRY_RUN === 'true';
```
**Verification:** ✅ When set, merge is dry-run only.

### POSITRON_ENABLE_DRY_RUN (OpenCode adapter)
**Purpose:** Enables dry-run agent for OpenCode operations.
**Default:** false (test env exception)
**Code:** `packages/opencode-adapter/src/dry-run-agent.ts:207`
```typescript
if (NODE_ENV !== 'test' && POSITRON_ENABLE_DRY_RUN !== 'true') {
    throw new Error('Dry-run agent disabled');
}
```
**Verification:** ✅ Needs explicit opt-in.

### --yolo Flag
**Purpose:** Would bypass approval gates.
**Status:** BLOCKED — not implemented. No `--yolo` handling in code. Tests verify no bypass vectors.
**Verification:** ✅ Not present, not used.

---

## Multi-Layer Blocking Architecture

For a full real-mode run to execute, ALL of these must be true:

| Layer | Env Var | Default | Real Mode Needs |
|-------|---------|---------|-----------------|
| Speckit | `POSITRON_SPECKIT_MODE=real` | fake | ✅ |
| OpenCode | `POSITRON_OPENCODE_MODE=real` | fake | ✅ |
| Workspace | `POSITRON_WORKSPACE_ROOT=...` | fake | ✅ |
| Push | `POSITRON_ENABLE_PUSH=true` | blocked | ✅ |
| Merge | `POSITRON_ENABLE_MERGE=true` | blocked | ⚠️ (not for probe) |
| Kill Switch | `POSITRON_MERGE_KILL_SWITCH=false` | active | ⚠️ (not for probe) |

**Key insight:** Even if one layer is mistakenly enabled, downstream blocks remain. This is defense-in-depth.

---

## Test Coverage

| Test | File | Status |
|------|------|--------|
| Push blocked without POSITRON_ENABLE_PUSH | commit-policy.test.ts:107 | ✅ PASS |
| Merge killed by POSITRON_MERGE_KILL_SWITCH | dry-run-agent.test.ts:245 | ✅ PASS |
| Branch delete blocked by KILL_SWITCH | dry-run-agent.test.ts:254 | ✅ PASS |
| No human_approved_real in fake evaluators | gate-assembly.test.ts:368 | ✅ PASS |
| Fake adapter used by default | smoke.test.ts, fake-adapter.ts | ✅ PASS |

---

## Assessment

| Question | Answer |
|----------|--------|
| Real Mode default false? | ✅ YES — all adapters default to fake |
| `HUMAN_APPROVED_REAL=true` alone sufficient? | ❌ NO — multiple env vars needed |
| `POSITRON_ENABLE_REAL=true` alone sufficient? | ❌ NO — individual adapters need their own vars |
| Push and Merge separately blocked? | ✅ YES — POSITRON_ENABLE_PUSH + POSITRON_ENABLE_MERGE |
| Merge Kill Switch default safe? | ✅ YES — active unless explicitly disabled |
| Tests for env combinations? | ✅ YES — gate-assembly, commit-policy, dry-run-agent |
| Runtime paths that bypass env gates? | ❌ NONE found |
| `--yolo` blocked? | ✅ YES — not implemented |
| Missing env → blocking? | ✅ YES — all checks are fail-closed |
| Secrets from env logged? | ❌ NO — env reading is done for checks only |

---

## Classification

```text
REAL_MODE_KILL_SWITCH_STATUS: READY
```

**Justification:** Multi-layer defense-in-depth. All dangerous operations are blocked by default. No single env var enables full real mode. Push, merge, and branch-delete have separate, independently-blocked controls. Kill-switch overrides even merge permission. `--yolo` does not exist. All tests verify fail-closed behavior.

**Limitations noted:**
- `HUMAN_APPROVED_REAL` is referenced as a concept but has no code-level enforcement (it's a documentation/process concept)
- Individual adapter mode variables (`POSITRON_SPECKIT_MODE`, `POSITRON_OPENCODE_MODE`) use different naming conventions
