# Issue #299 — Fix Report

**Timestamp:** 2026-06-27T08:59:00Z
**Agent:** issue-orchestrator

---

## Changes Implemented

### Fix 1: CI Workflow — Add Build Step

**File:** `.github/workflows/quality-gates.yml`
**Change:** Added `npm run build` step to `tool-gateway-windows` job, between "Install dependencies" and "Run Tool Gateway tests".

```yaml
- name: Build dependencies
  run: npm run build
```

**Why this is minimal:**
- 1-line addition to an existing CI job
- Matches existing pattern in `build-and-test` job (which already has `npm run build`)
- No new dependencies, no restructuring
- The root `npm run build` uses `tsc -b` project references which efficiently builds only changed packages

**Why it addresses the Windows-specific error:**
- The `tool-gateway-windows` job lacked a build step, relying on pre-committed dist files
- `.gitignore` blocks `dist/` from normal commits; some files were force-added but new modules were not
- Adding `npm run build` ensures TypeScript compilation generates all dist files before tests run

**Why Linux/Ubuntu is not regressed:**
- The `build-and-test` (Ubuntu) job is unchanged — it already has `npm run build`
- No shared code paths are modified
- The build is idempotent: running it twice produces the same output

**Why no workflow restructuring was needed:**
- The build step fits naturally in the existing step sequence
- No changes to timing, concurrency, or job dependencies

---

### Fix 2: Test — Deterministic workspaceRoot

**File:** `packages/tool-gateway/src/__tests__/tools/repo.test.ts`
**Change:** Replaced `workspaceRoot: process.cwd()` with `workspaceRoot: REPO_ROOT` where `REPO_ROOT` is computed from the test file's known location.

```typescript
import path from 'node:path';

// repo.test.ts is at packages/tool-gateway/src/__tests__/tools/repo.test.ts
// Going up 5 levels reaches the repo root
const REPO_ROOT = path.resolve(__dirname, '..', '..', '..', '..', '..');

function makeCall(overrides: Partial<ToolCall> = {}): ToolCall {
    return {
        ...
        workspaceRoot: REPO_ROOT,
        ...overrides,
    };
}
```

**Why this is minimal:**
- 2 lines added (import + constant), 1 line changed (default value)
- No test logic changed — same assertions, same arguments
- `__dirname` is already used in other test files (e.g., `prompt-standard.contract.test.ts`)
- The `REPO_ROOT` constant is computed once at module load

**Why it addresses the Windows-specific error:**
- Previously, `workspaceRoot` defaulted to `process.cwd()` which varies by invocation directory
- When `tool-gateway-windows` CI runs from `packages/tool-gateway/`, the CWD is the package directory
- `path.resolve(packageDir, 'packages')` → non-existent directory → `result.success = false`
- Now, `workspaceRoot` is always the repo root, making the test deterministic

**Why Linux/Ubuntu is not regressed:**
- The test passes on both platforms (verified locally on Windows, CI on Ubuntu)
- `__dirname` + `path.resolve` is cross-platform
- All other tests continue to pass

**Why no assertion was weakened:**
- The assertion `expect(result.success).toBe(true)` is unchanged
- The test still validates the same behavior: listing files in the `packages/` subdirectory
- Only the workspaceRoot computation was made deterministic

---

## Files Changed

| File | Type | Lines |
|------|------|-------|
| `.github/workflows/quality-gates.yml` | CI workflow | +2 |
| `packages/tool-gateway/src/__tests__/tools/repo.test.ts` | Test | +4, -1 |

---

## Classification

```text
ISSUE_299_FIX_STATUS: IMPLEMENTED
```

Both fixes are minimal, evidence-backed, and verified locally.
