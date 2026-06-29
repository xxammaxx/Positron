# Source Working Tree Audit — Positron Migration Run A

## Classification

```text
POSITRON_MIGRATION_SOURCE_REALITY_STATUS: CURRENT
```

## Working Tree Status

```text
CLEAN
```

`git status --porcelain` returned **no output** — no modified, staged, or untracked files.

## Untracked Files

```text
NONE
```

`git ls-files --others --exclude-standard` returned no output.

## Modified Files

```text
NONE
```

## Staged Files

```text
NONE
```

## Stashes

```
stash@{0}: On positron/issue-215-gate-approve-stop-ask: pre-merge-stash
stash@{1}: On positron/workspace-policy-no-sibling-worktrees: safety: dirty tree before clean workspace policy pr
stash@{2}: On positron/issue-229-pr3-speckit-sync-types: stash: doc modification from spec phase
```

**Classification:** `PRE_EXISTING_STASHES` — DO NOT TRANSFER. These stashes are on long-closed branches and are only retained for historical reference. The new machine should not need them.

## Pre-Existing Dist Artifacts

Tracked dist files in `packages/shared/dist/`:
- `__tests__/secret-manager.test.*` (4 files)
- `__tests__/smoke.test.*` (4 files)
- `constants.*` (4 files)
- `index.*` (6 files = 3 .js/.d.ts/.map pairs)
- `interfaces.*` (4 files)
- And more...

**Classification:** `PRE_EXISTING_DIST_ARTIFACT` — DO NOT TRANSFER as build dependency, only document. Tracked in Issue #325.

## Node Modules

44 `node_modules` directories present (expected for monorepo).
**Classification:** `DO_NOT_TRANSFER` — fresh `npm ci` on new machine.

## Classification of Every Change

Since working tree is CLEAN, no per-file classification needed.

## Dist/Build Artifacts

- No `dist/` directory in project root
- Pre-existing tracked dist: `packages/shared/dist/` (Issue #325)
- Dist dirs in `.opencode/node_modules/`: third-party, no concern

## Known Local Specialties

- PowerShell 5.1 (Windows)
- Node v24.14.0, npm 11.9.0
- Git 2.47.0.windows.1
- Windows 10/11
- `.env` file at `apps/server/.env` (gitignored, contains local-only secrets)

## Summary

| Category | Status |
|----------|--------|
| Working Tree | CLEAN |
| Untracked | 0 |
| Modified | 0 |
| Staged | 0 |
| Stashes | 3 (PRE_EXISTING, do not transfer) |
| Dist Artifacts | PRE_EXISTING_TRACKED in packages/shared/dist/ |
| .env files | 2 (.env.example safe, apps/server/.env gitignored) |
