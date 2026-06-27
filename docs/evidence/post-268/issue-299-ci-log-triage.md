# Issue #299 — CI Log & Error Triage

**Timestamp:** 2026-06-27T08:55:00Z
**Agent:** issue-orchestrator
**Source:** GH Actions Run #28280831642, Job `tool-gateway-windows` (ID: 83796143339)

---

## Error 1: ERR_MODULE_NOT_FOUND (×8)

### Exact Error

```
Error: Cannot find module './decision-manifest.js'
imported from D:/a/Positron/Positron/packages/shared/dist/index.js

Serialized Error: { code: 'ERR_MODULE_NOT_FOUND' }
```

### Stack Trace

```
❯ ../shared/src/index.ts:20:1   → export * from './decision-manifest.js';
❯ src/gateway.ts:5:1           → import { redactSecrets } from '@positron/shared';
```

### Affected Test Files (8 suites fail entirely)

1. `src/__tests__/gateway.test.ts`
2. `src/__tests__/red/approval-bypass.test.ts`
3. `src/__tests__/red/autonomy-violation.test.ts`
4. `src/__tests__/red/egress-violation.test.ts`
5. `src/__tests__/red/hardening-fixes.test.ts`
6. `src/__tests__/red/path-traversal.test.ts`
7. `src/__tests__/red/phase-violation.test.ts`
8. `src/__tests__/red/secret-leakage.test.ts`

All import from `@positron/shared` which requires `./decision-manifest.js` from `dist/`.

### Root Cause Analysis

- **`dist/decision-manifest.js` does NOT exist in the git tree at the checked-out commit `f8caefa`.**
- `dist/` is listed in `.gitignore`. Some dist files (68) were force-added to git previously.
- New modules (decision-manifest, evidence-gate, github-context-reconciler, etc.) were added to source but their compiled dist files were NOT force-added.
- The `tool-gateway-windows` CI job does NOT run `npm run build` before tests (unlike the `build-and-test` Ubuntu job which does).
- Therefore, the required dist files are absent at runtime.

### Comparative Analysis

| Aspect | Ubuntu (build-and-test) | Windows (tool-gateway-windows) |
|--------|------------------------|-------------------------------|
| Runs `npm run build` | YES | NO |
| Dist files available | Generated at build | Only pre-committed (stale) |
| Module resolution | Works | Fails for new modules |

## Error 2: AssertionError (×1)

### Exact Error

```
AssertionError: expected false to be true // Object.is equality
 ❯ src/__tests__/tools/repo.test.ts:82:26

- Expected: true
+ Received: false
```

### Affected Test

`src/__tests__/tools/repo.test.ts` > `repo.list_files` > `should list files in a subdirectory`

### Test Code

```typescript
it('should list files in a subdirectory', async () => {
    const call = makeCall({
        toolId: 'repo.list_files',
        arguments: { directory: 'packages' },
    });
    const result = await repoListFilesHandler(call);
    expect(result.success).toBe(true);  // Line 82 — FAILS
});
```

### Root Cause Analysis

The `makeCall()` helper defaults `workspaceRoot` to `process.cwd()`. When running from the repo root (`C:\Positron`), `path.resolve(repoRoot, 'packages')` resolves correctly and the test passes. When running from the package directory (`packages/tool-gateway/`), `path.resolve('.../tool-gateway', 'packages')` resolves to a non-existent directory, and `fs.readdir()` throws, causing `result.success` to be `false`.

### Comparative Analysis

| Aspect | Ubuntu (repo root) | Windows (package dir) |
|--------|-------------------|----------------------|
| CWD | Repo root | `packages/tool-gateway/` |
| workspaceRoot | Repo root | Package directory |
| `path.resolve(ws, 'packages')` | Valid path | Invalid path |
| Test result | PASS | FAIL |

### Validity

- The `repo.test.ts` does NOT import from `@positron/shared`, so it is NOT affected by Error 1.
- The repo handler (`repoListFilesHandler`) logic is correct — the test's default workspaceRoot is wrong.
- This is NOT a Windows-only issue — it would fail on ANY OS when run from the package directory.

## Classification

```text
WINDOWS_FAILURE_CLASS: MODULE_RESOLUTION (Error 1) + ASSERTION_MISMATCH (Error 2)
```

Error 1 is actually a BUILD_GAP / GITIGNORE anomaly, not a Windows-specific module resolution bug.
Error 2 is a TEST_CONFIGURATION issue (CWD-dependent workspaceRoot default).

```text
ISSUE_299_CI_TRIAGE_STATUS: CONFIRMED
```

Both errors confirmed via CI log analysis. Error 1 is partially resolved at HEAD (subsequent merges brought up-to-date source), but the root issue (dist files not committed / no build step) persists between git checkouts. Error 2 is fully reproducible.
