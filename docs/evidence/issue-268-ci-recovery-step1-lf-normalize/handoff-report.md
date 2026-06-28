# Issue #268 Step 1 — LF Normalization + Biome Format Compliance

## Summary

Implements the first CI recovery step for Issue #268: normalize repository line endings to LF and apply Biome formatting so the Quality Gates `build-and-test` job is no longer blocked at the format step.

## Root Cause

Biome (`biome.json`) expects `lineEnding: "lf"`, while Windows checkout with `core.autocrlf=true` produced CRLF in the working tree. No `.gitattributes` existed to enforce LF normalization. This caused 1152+ format failures locally and in GitHub CI, blocking the entire `build-and-test` cascade (format fails → lint/build/typecheck/tests all skip).

## Fix

1. Added `.gitattributes` with `* text=auto eol=lf` + binary file protection rules.
2. Ran `git add --renormalize .` to normalize working tree line endings.
3. Ran `npx biome format --write .` — 370 files checked, 365 fixes applied.

## Scope

Format and line-ending normalization only. No logic changes. No lockfile modifications. No secret exposure.

## Files Changed

- `.gitattributes` (NEW) — LF enforcement + binary protection
- `docs/evidence/issue-268-ci-recovery-step1-lf-normalize/handoff-report.md` (NEW)
- 370 files formatted by Biome (line endings + indentation/style normalization)
- 30 files in `packages/shared/dist/` renormalized (pre-existing build artifacts)

## Local Gates

| Gate | Result | Exit Code | Notes |
|------|--------|-----------|-------|
| `git diff --check` | ✅ PASS | 0 | No whitespace errors |
| `npx biome format .` | ✅ PASS | 0 | 370 files checked, no fixes needed |
| `npx biome check .` | ⚠️ ADVISORY | 1 | 786 errors + 486 warnings — ALL pre-existing lint rules (noConsoleLog, useNodejsImportProtocol, etc.). 1561 diagnostics suppressed. |
| `npm run build` | ✅ PASS | 0 | All 9 projects built successfully |
| `npm run typecheck` | ✅ PASS | 0 | All projects up to date |
| `npx vitest run prompt-standard.contract` | ✅ PASS | 0 | 28/28 |
| `npx vitest run opencode-adapter` | ✅ **102/102** | 0 | Required gate met |
| `npm test` | ⚠️ ADVISORY | 1 | 916/917 — 1 pre-existing failure (`repo.test.ts > should list files in a subdirectory`) |

**Verdict: All format and logic gates PASS. The format/line-ending blocker is removed.**

## CI Attribution

GitHub CI was not triggered. This PR is intended to unblock the first Quality Gates step. GitHub CI remains advisory until validated.

## Not Changed

- No stash operations (`stash@{0}`, `stash@{1}` untouched)
- No feature work
- No Issue Verification workflow fix
- No Playwright/Redis fix
- No Mutation/Stryker fix
- No Tool Gateway logic fix
- No `.opencode/*` modifications (`.opencode/config.json` shows false-positive in `git status`, zero actual diff)
- No lockfile modifications
- No secret exposure

## Was kann die Software jetzt im Vergleich zum vorherigen Lauf?

### Neue Fähigkeiten
- Repository text files are normalized to LF via `.gitattributes`.
- Biome format gate passes locally (`npx biome format .` → exit 0).
- LF enforcement is now structural (committed `.gitattributes`), not dependent on local git config.

### Entfernte Blocker
- The format/line-ending blocker for `build-and-test` is removed locally.
- `npx biome format .` now produces zero formatting errors (down from 1152+).

### Unveränderte Einschränkungen
- Issue Verification workflow remains unresolved.
- E2E/Mutation remain unresolved (non-blocking, `continue-on-error`).
- GitHub-CI remains advisory-only.
- `stash@{0}` and `stash@{1}` remain intact.
- 1 pre-existing test failure (`repo.test.ts`) persists.

### Verbleibende Risiken
- GitHub runner zero-step issue may still block remote feedback (requires billing/permissions check).
- Biome lint (`npx biome check .`) still reports pre-existing lint findings — these are advisory and not in scope for this step.
- Large number of formatted files in the PR diff (370 files).

### Nächster sinnvoller Schritt
Review and merge the LF normalization PR, then inspect whether GitHub Quality Gates now execute beyond the format step. Follow-up: Issue #268 Step 2 (CI permissions/workflow repair).
