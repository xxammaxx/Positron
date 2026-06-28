# Issue #297 — Local Gates

## Timestamp
2026-06-27T09:46:00+02:00

## Pre-Commit Gates

### 1. `git diff --check`
```
(output empty — no whitespace errors)
```
✅ **PASS**

### 2. `npm run build`
```
> positron@0.1.0 build
> tsc -b packages/shared packages/sandbox packages/github-adapter packages/run-state packages/speckit-adapter packages/opencode-adapter packages/benchmark-rudolph packages/tool-gateway apps/server apps/worker
```
✅ **PASS** (0 errors)

### 3. `npm run typecheck`
```
Project 'packages/opencode-adapter/tsconfig.json' would build (changed)
All other projects up to date
```
✅ **PASS** (no type errors, only needs build)

### 4. `npm test` (Full Suite)
```
Root: 64 test files, 1375 tests — all passed
Web: 8 test files, 196 tests — all passed
Total: 1571 tests — all passed
```
✅ **PASS**

### 5. `npx biome format .` 
(Skipped — advisory only per CONTRIBUTING.md)

### 6. No secrets check
```
No .env files changed
No token patterns in changed files
```
✅ **PASS**

### 7. No workflow changes
```
Verified: no files in .github/workflows/ changed
```
✅ **PASS**

## Changed Files

| File | Change Type | Lines |
|------|------------|-------|
| `e2e/ui-workflow-trace.spec.ts` | Bug fix (E2E cleanup) | +8, -4 |
| `packages/opencode-adapter/src/deterministic-fixture-agent.ts` | Bug fix (determinism) | +11, -4 |

## Classification

```text
ISSUE_297_LOCAL_GATES: GREEN
```

All mandatory gates passed. No pre-existing failures. No regressions introduced.
