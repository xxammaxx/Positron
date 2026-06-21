# Issue #272 — Tool-Gateway repo.list_files Test Fix Handoff

## Summary

Fixes the local-ci test failure in `packages/tool-gateway/src/__tests__/tools/repo.test.ts`.

## Root Cause

The test `should list files in a subdirectory` used `directory: 'src'`, resolved against the repository workspace root `C:\Positron`. The root-level `src` directory does not exist (`Test-Path "C:\Positron\src"` → `False`), so the handler correctly returned `{ success: false }`.

The handler code (`packages/tool-gateway/src/tools/repo.ts:131-132`) resolves the directory against `call.workspaceRoot` via `path.resolve()` and returns `{ success: false }` for non-existent directories — this is correct production behavior.

## Fix

Changed the test fixture directory from `src` to an existing workspace-root subdirectory: `packages`.

```diff
- arguments: { directory: 'src' },
+ arguments: { directory: 'packages' },
```

## Scope

Changed:
- `packages/tool-gateway/src/__tests__/tools/repo.test.ts` (line 78, 1 character change)
- `docs/evidence/issue-272-tool-gateway-repo-list-files-01/handoff-report.md` (this file)

Not changed:
- Production Tool Gateway code
- GitHub workflows
- Stashes (stash@{0} and stash@{1} remain intact)
- `.opencode/*`
- Biome lint backlog
- Property-test timeout backlog

## Local Gates

| Gate | Command | Exit | Result |
|------|---------|------|--------|
| Diff check | `git diff --check` | 0 | PASS |
| Format | `npx biome format .` | 0 | PASS (370 files, no fixes) |
| Targeted test | `npx vitest run packages/tool-gateway/src/__tests__/tools/repo.test.ts` | 0 | **9/9 PASS** |
| Full test | `npm test` | 1 | 3 failed / 914 passed (improved from 4/913) |
| Build | `npm run build` | 0 | PASS |
| Typecheck | `npm run typecheck` | 0 | PASS (dry, all projects up to date) |
| Lint advisory | `npx biome check .` | 1 | Pre-existing lint backlog (786 errors, 486 warnings) — OUT OF SCOPE |

## CI Policy

Local gates are source of truth. GitHub Actions remains advisory-only and was not rerun.

## Acceptance Criteria

- [x] Root cause documented (this issue)
- [x] Fix applied: `directory: 'src'` → `directory: 'packages'` in `repo.test.ts` line 78
- [x] `npx vitest run packages/tool-gateway/src/__tests__/tools/repo.test.ts` passes: 9/9
- [x] `npm test` result documented (3 failed / 914 passed)
- [x] No stash apply/pop/drop
- [x] No GitHub-CI reruns
- [x] GitHub-CI remains advisory-only

## Was kann die Software jetzt im Vergleich zum vorherigen Lauf?

### Neue Fähigkeiten
- The `repo.list_files` subdirectory test now uses a valid fixture path (`packages/`).
- The targeted Tool Gateway test passes locally (9/9).

### Entfernte Blocker
- The confirmed `repo.list_files` test fixture mismatch (`src` → `packages`) is resolved.

### Unveränderte Einschränkungen
- GitHub-CI remains advisory-only.
- Biome lint backlog (786 errors, 486 warnings) remains out of scope.
- Property-test timeouts (3 remaining failures in `secret-manager.property.test.ts`) remain out of scope.
- `stash@{0}` and `stash@{1}` remain intact and unmodified.

### Verbleibende Risiken
- 3 pre-existing property-test timeout failures in `packages/shared/src/__tests__/secret-manager.property.test.ts` remain.
- PR needs human review before merge.

### Nächster sinnvoller Schritt
Review and merge the Issue #272 PR after separate human approval.
