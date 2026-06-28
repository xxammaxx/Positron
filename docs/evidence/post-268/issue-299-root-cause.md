# Issue #299 — Root Cause Analysis

**Timestamp:** 2026-06-27T08:55:00Z
**Agent:** issue-orchestrator

---

## Error 1: ERR_MODULE_NOT_FOUND for `./decision-manifest.js`

### Root Cause Chain

1. **`.gitignore` blocks `dist/`** — The root `.gitignore` contains `dist/`, preventing build output from being committed normally.
2. **68 dist files were force-added historically** — Some dist files were committed via `git add -f` at an earlier point.
3. **New modules added after force-add** — `decision-manifest.ts`, `evidence-gate.ts`, `github-context-reconciler.ts`, etc. were added to source. Their compiled dist outputs were NOT force-added.
4. **`dist/index.js` references all new modules** — The barrel export includes `export * from './decision-manifest.js'` (line 20) and others. Since `tsc -b` generates `dist/index.js` from `src/index.ts`, the barrel file references modules whose compiled output doesn't exist in git.
5. **CI does not build before testing** — The `tool-gateway-windows` job runs `npm ci` then `npx vitest run` without `npm run build`. The `build-and-test` (Ubuntu) job runs `npm run build` first.
6. **Result:** At runtime, Node.js can't resolve `./decision-manifest.js` from `dist/index.js` because the file is absent.

### Causal Diagram

```
.gitignore → dist/ blocked
    ↓
68 files force-added early
    ↓
New .ts files added, dist/ .js not force-added
    ↓
dist/index.js references new .js files
    ↓
CI checks out commit, no dist/ files for new modules
    ↓
No build step in tool-gateway-windows job
    ↓
ERR_MODULE_NOT_FOUND
```

### Why Ubuntu Passes

The `build-and-test` job runs `npm run build` before `npm test`, which regenerates all dist files including the new ones.

### Why This is Not Windows-Specific

The error would occur on ANY platform if the dist files are absent. It appears Windows-specific only because the `tool-gateway-windows` job lacks the build step.

---

## Error 2: AssertionError repo.test.ts:82

### Root Cause

The test's `makeCall()` helper function defaults `workspaceRoot` to `process.cwd()`. This value varies depending on the directory from which vitest is invoked.

- **From repo root:** `workspaceRoot = C:\Positron` → `path.resolve(root, 'packages')` = `C:\Positron\packages` ✓ exists
- **From package dir:** `workspaceRoot = C:\Positron\packages\tool-gateway` → `path.resolve(pkg, 'packages')` = `C:\Positron\packages\tool-gateway\packages` ✗ does not exist

The CI `tool-gateway-windows` job sets `working-directory: packages/tool-gateway`, placing `process.cwd()` inside the package directory.

### Why Ubuntu Passes

The `build-and-test` job runs `npm test` from the repo root (no `working-directory` override), placing `process.cwd()` at the repo root.

### Why This Appears Windows-Specific

It's NOT Windows-specific — it's CWD-dependent. It appears on Windows because the CI job explicitly uses `working-directory: packages/tool-gateway`. If an Ubuntu job used the same working directory override, it would fail identically.

---

## Classification

```text
ISSUE_299_ROOT_CAUSE_STATUS: IDENTIFIED
```

Two independent root causes identified:
1. **BUILD_GAP:** Missing `npm run build` step in CI + `.gitignore` blocking dist file commits
2. **CWD_DEPENDENCY:** Test assumes `process.cwd()` is repo root in `makeCall()` helper
