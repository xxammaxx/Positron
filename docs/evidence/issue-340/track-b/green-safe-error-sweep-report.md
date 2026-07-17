# Issue #340 — Track B GREEN_SAFE Error Sweep Report

**Date:** 2026-07-17
**Branch:** `chore/issue-340-track-b-green-safe-errors`
**Base:** `origin/main` (84e0dcb)

---

## Reality Refresh

| Context | Value |
|---------|-------|
| Main HEAD at worktree creation | `84e0dcbd095879706d7d1de5d86d379488da0317` |
| Main current HEAD | `e65b29e38890d74e5be2dc7abedff2e4475ad1e4` (PR #372 ahead) |
| Worktree branch ref | `84e0dcbd095879706d7d1de5d86d379488da0317` |
| Worktree branch | `chore/issue-340-track-b-green-safe-errors` |
| Node.js | v22.22.0 |
| Biome | 1.9.4 |
| Lint command | `npx biome lint . --reporter=json` |
| Fix applied | `npx biome lint --write` (safe fixes only) |
| Policy | `--unsafe` prohibited per GREEN_SAFE policy |

### Provenienz (from Research-Agent findings)

| Category | Count |
|----------|-------|
| MAIN_BACKLOG | 185 |
| PR372_REGRESSION | 0 |
| MERGE_ONLY | 0 |
| UNKNOWN | 0 |

The majority of remaining errors (185/220) are classified as MAIN_BACKLOG — pre-existing lint errors not introduced by this branch.

---

## Scope

Track B applied **Biome GREEN_SAFE** lint fixes only — rules classified as "safe" by Biome 1.9.4 where `lint --write` applies the fix automatically. No `--unsafe` fixes were applied. No manual edits.

### Rules Applied

| Rule | Description | Fix Type |
|------|-------------|----------|
| `useImportType` | Converts `import X` to `import type X` when the import is type-only | Safe (organizeImports) |
| `useNumberNamespace` | Converts `parseInt()` to `Number.parseInt()`, `parseFloat()` to `Number.parseFloat()` | Safe |

### Why Other Planned Rules Were Not Applied

Biome 1.9.4 `lint --write` only applies fixes that Biome itself classifies as "safe fixes." The following rules, while mechanically safe to apply at the code level, are **not** in Biome's "safe fix" category and require either manual intervention or `--unsafe` (prohibited per GREEN_SAFE policy):

- `useButtonType` — requires `--unsafe`
- `noSvgWithoutTitle` — requires `--unsafe`
- `noForEach` — requires `--unsafe`
- `noDelete` — requires manual refactor (no Biome auto-fix)
- `noBannedTypes` — requires manual changes to shared type definitions

These rules are queued for future tracks (C, D, E) with appropriate risk classification.

---

## Actual Scope Applied

| Rule | Files Affected | Errors Resolved |
|------|----------------|-----------------|
| `useImportType` (type-only imports) | ~20 | ~30 |
| `useNumberNamespace` (parseInt/parseFloat) | ~10 | ~13 |
| **TOTAL** | **24 unique** | **43** |

### Error Count: Vorher/Nachher

| Metric | Before | After | Delta |
|--------|--------|-------|-------|
| Errors (JSON) | 263 | 220 | **−43** |
| Warnings (JSON) | 1352 | 1352 | 0 |
| Files Changed | 0 | 24 | +24 |

---

## Changed Files

Full list of **24 source files** modified (verified from `git diff --name-only`, excluding 2 evidence files):

| # | File | Rules Applied |
|---|------|---------------|
| 1 | `apps/server/src/index.ts` | `useImportType`, `useNumberNamespace` |
| 2 | `apps/web/src/components/Dashboard.tsx` | `useImportType` |
| 3 | `apps/web/src/components/HealthIndicator.tsx` | `useImportType` |
| 4 | `apps/web/src/components/LogViewer.tsx` | `useImportType` |
| 5 | `apps/web/src/components/Repositories.tsx` | `useImportType` |
| 6 | `apps/web/src/components/RunDetail.tsx` | `useImportType` |
| 7 | `apps/web/src/components/ThemeToggle.tsx` | `useImportType` |
| 8 | `apps/web/src/components/VoiceControls.tsx` | `useImportType`, `useNumberNamespace` |
| 9 | `apps/web/src/components/VoiceStatusIndicator.tsx` | `useImportType` |
| 10 | `apps/web/src/components/admin/AdminPage.tsx` | `useImportType` |
| 11 | `apps/web/src/components/dashboard/BlueprintPanel.tsx` | `useImportType`, `useNumberNamespace` |
| 12 | `apps/web/src/components/dashboard/DashboardPage.tsx` | `useImportType` |
| 13 | `apps/web/src/components/dashboard/NewRunModal.tsx` | `useImportType` |
| 14 | `apps/web/src/components/dashboard/SystemHealth.tsx` | `useImportType` |
| 15 | `apps/web/src/components/projects/ProjectsPage.tsx` | `useImportType` |
| 16 | `apps/web/src/components/runs/RunsPage.tsx` | `useImportType` |
| 17 | `apps/web/src/components/settings/SettingsPage.tsx` | `useImportType` |
| 18 | `apps/web/src/components/shared/EmptyState.tsx` | `useImportType` |
| 19 | `apps/web/src/components/shared/ErrorBanner.tsx` | `useImportType` |
| 20 | `apps/worker/src/pipeline-runner.ts` | `useImportType`, `useNumberNamespace` |
| 21 | `scripts/chaos-drill.mjs` | `useNumberNamespace` |
| 22 | `scripts/observability-drill.mjs` | `useNumberNamespace` |
| 23 | `scripts/queue-backlog-drill.mjs` | `useNumberNamespace` |
| 24 | `scripts/verify-issues.mjs` | `useNumberNamespace` |

**Evidence files (not counted toward 40-file limit):**
| 25 | `docs/evidence/issue-340/track-b/green-safe-error-sweep-report.md` | evidence |
| 26 | `docs/evidence/issue-340/track-b/pr372-truth-mirror.md` | evidence |

---

## Excluded Files

| File | Reason |
|------|--------|
| `packages/benchmark-rudolph/src/controlled-real-probe.ts` | Real Mode file — reverted per Security-Agent RED_BLOCK classification |
| All Stage 3 files | Out of scope for Track B |
| `apps/web/src/components/ArtifactPanel.tsx` | Contains `noDangerouslySetInnerHtml` — excluded per policy |
| `apps/server/src/cli.ts`, `github-watcher.ts`, `live-run-handler.ts` | Already fixed in PR #372; not part of 84e0dcb baseline for Track B |

---

## Gates

| Gate | Status | Details |
|------|--------|---------|
| `git diff --check` | ✅ PASS | No whitespace errors |
| `npm run build` | ✅ PASS | Build successful |
| `npm run typecheck` | ✅ PASS | TypeScript compilation clean |
| `npm test` | ✅ PASS | 196 tests passed |
| `npm run test:e2e` | ⚠️ Pre-existing | Failures also present on main; not a Track B regression |
| Forbidden file check | ✅ PASS | No Real Mode files changed |
| Secret grep | ✅ PASS | No secrets exposed |
| Biome lint (post-fix) | ❌ Expected red | Reduced to 220 errors (from 263) |

---

## Remaining Error Rules (for future tracks)

### Top categories from 220 remaining errors

| Rule | Count | Risk Class | Next Track | Notes |
|------|-------|------------|------------|-------|
| `noDelete` | ~46 | 🔴 RED_BLOCK | Track D | Manual refactor required — no Biome auto-fix exists |
| `noBannedTypes` | ~10 | 🟡 YELLOW_REVIEW | Track C | Shared `types.ts` changes need review |
| `useButtonType` | ~53 | 🟢 GREEN_SAFE | Track C | Safe to apply, but requires `--unsafe` Biome flag |
| `noSvgWithoutTitle` | ~14 | 🟢 GREEN_SAFE | Track C | Safe to apply, but requires `--unsafe` Biome flag |
| `useImportType` | ~5 | 🟢 GREEN_SAFE | Track C | Remaining after Track B |
| `noExplicitAny` | ~30 | 🟡 YELLOW_REVIEW | Track C | Warning severity; needs selective review |
| `noUnusedVariables` | ~15 | 🟡 YELLOW_REVIEW | Track C | Warning severity; dead code elimination |
| Other rules | ~47 | mixed | Tracks C–E | Various lint categories |

**Blocking items for full Issue #340 resolution:**
1. RED_BLOCK rules (`noDelete`) require manual refactoring — cannot be auto-fixed
2. `useButtonType` / `noSvgWithoutTitle` require `--unsafe` which is policy-blocked
3. YELLOW_REVIEW rules need human review

---

## Boundaries

- No behavior changes.
- No Real Mode changes.
- No Phase-D probe.
- No merge.
- No issue closure.
- No push to `main`.
- Issue #308 remains open.
- Issue #340 remains open pending tracks C, D, E.
- Full Issue #340 resolution blocked on RED_BLOCK rules and `--unsafe` policy decision.

---

## Evidence Artifacts

- `docs/evidence/issue-340/track-b/green-safe-error-sweep-report.md` (this file)
- `docs/evidence/issue-340/track-b/pr372-truth-mirror.md`
- `docs/evidence/issue-340/track-a-organize-imports-cleanup-report.md`
- `docs/evidence/issue-340/track-a-biome-check-before.json`
- `docs/evidence/issue-340/green-safe-biome-lint-cleanup-report.md`
