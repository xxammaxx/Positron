# Issue #299 — Reproduction Report

**Timestamp:** 2026-06-27T08:55:00Z
**Agent:** issue-orchestrator
**OS Context:** WINDOWS_LOCAL

---

## Local Reproduction Attempt

### Environment

- Windows 10, PowerShell 5.1, Node v24.14.0, npm 11.9.0
- Working tree clean, HEAD at `6701f24`
- `packages/shared/dist/decision-manifest.js` exists locally (built from source)

### Error 1: ERR_MODULE_NOT_FOUND

| Step | Command | Result |
|------|---------|--------|
| Build shared package | `npm run build` in `packages/shared` | PASS (dist files generated) |
| Run tool-gateway tests | `npx vitest run` in `packages/tool-gateway` | PASS (15/16 files, only repo.test.ts fails) |

**Verdict:** ERR_MODULE_NOT_FOUND is **NOT REPRODUCED** at current HEAD `6701f24`. The dist files exist because the source is already committed and the build generates them locally. However, the dist files are NOT committed in git (blocked by `.gitignore`), so a fresh `git clone` + `npm ci` without build would reproduce the error.

**Root cause validation:** The CI run was at commit `f8caefa` which lacked the dist files for newer modules. At `f8caefa`, the `git ls-tree` shows only 68 dist files, missing decision-manifest.js and 30+ others. At `6701f24`, the dist is rebuilt and files exist, but they are still not in git.

### Error 2: AssertionError repo.test.ts:82

| Step | Command | Result |
|------|---------|--------|
| Run from package dir | `npx vitest run` in `packages/tool-gateway` | **FAIL** — same error as CI |
| Run from repo root | `npx vitest run` in repo root | PASS |

**Exact reproduction output:**

```
FAIL  src/__tests__/tools/repo.test.ts > repo.list_files > should list files in a subdirectory
AssertionError: expected false to be true // Object.is equality

- Expected
+ Received

- true
+ false

 ❯ src/__tests__/tools/repo.test.ts:82:26
```

**Reproduction command:**
```powershell
Set-Location -LiteralPath "packages\tool-gateway"; npx vitest run
```

**Passing command (from repo root):**
```powershell
npx vitest run
```

### Cross-Platform Verification

- **Ubuntu/root-level tests:** `npm test` from repo root → repo.test.ts passes (build-and-test job `npm run build` first, then root-level vitest)
- **Windows/package-level tests:** `npx vitest run` from `packages/tool-gateway` → repo.test.ts fails
- **Static analysis of test:** The `makeCall()` helper sets `workspaceRoot: process.cwd()` which varies by invocation directory.

## Classification

```text
ISSUE_299_REPRO_STATUS: REPRODUCED_LOCAL (Error 2) + CI_ONLY_REPRODUCED (Error 1 at f8caefa)
```

Error 1 is CI-only at commit `f8caefa` (dist files absent from git). Not reproducible at HEAD because dist is already built locally.
Error 2 is fully reproducible locally when running from `packages/tool-gateway/`.
