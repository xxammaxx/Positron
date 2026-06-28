# Issue #266 Windows /tmp Bug Fix — Handoff

## Summary

Fixes the pre-existing Windows-only `/tmp` path bug in `real-adapter.test.ts`.

## Root Cause

Hardcoded POSIX `/tmp` paths were used in tests. On Windows this resolved to invalid or unintended paths such as `C:\tmp\evidence-conflict-test`, causing `ENOENT` errors.

## Fix

Replaced hardcoded `/tmp` usage with OS-portable temp directory handling using Node's `os.tmpdir()` and `path.join(...)`. The file already imported both `os` and `path`, so no new imports were required.

### Changes Made

| Line | Before | After |
|------|--------|-------|
| 194 | `new RealOpenCodeAdapter('/tmp/evidence')` | `new RealOpenCodeAdapter(path.join(os.tmpdir(), 'evidence'))` |
| 208 | `new RealOpenCodeAdapter('/tmp/evidence')` | `new RealOpenCodeAdapter(path.join(os.tmpdir(), 'evidence'))` |
| 222 | `new RealOpenCodeAdapter('/tmp/evidence')` | `new RealOpenCodeAdapter(path.join(os.tmpdir(), 'evidence'))` |
| 241 | `new RealOpenCodeAdapter('/tmp/evidence')` | `new RealOpenCodeAdapter(path.join(os.tmpdir(), 'evidence'))` |
| 248 | `new RealOpenCodeAdapter('/tmp/evidence')` | `new RealOpenCodeAdapter(path.join(os.tmpdir(), 'evidence'))` |
| 253 | `new RealOpenCodeAdapter('/tmp/evidence')` | `new RealOpenCodeAdapter(path.join(os.tmpdir(), 'evidence'))` |
| 263 | `new RealOpenCodeAdapter('/tmp/evidence')` | `new RealOpenCodeAdapter(path.join(os.tmpdir(), 'evidence'))` |
| 265 | `path.join('/tmp', 'evidence-conflict-test')` | `path.join(os.tmpdir(), 'opencode-evidence-conflict-test')` |
| 353 | `new RealOpenCodeAdapter('/tmp/evidence')` | `new RealOpenCodeAdapter(path.join(os.tmpdir(), 'evidence'))` |

## Scope

**Changed:**
- `packages/opencode-adapter/src/__tests__/real-adapter.test.ts`

**Not changed:**
- production adapter implementation (`real-adapter.ts`)
- Issue #263 agents (`deterministic-fixture-agent.ts`, `dry-run-agent.ts`)
- stashes (stash@{0}, stash@{1} remain intact)
- GitHub CI configuration
- `.opencode/` directory
- `docs/status/`
- `apps/`, `scripts/`, `dist/`

## Local Gates

| Gate | Result | Exit Code |
|------|--------|-----------|
| `git diff --check` | Clean (no output) | 0 |
| `real-adapter.test.ts` | 30/30 passed | 0 |
| `opencode-adapter suite` (6 files) | 102/102 passed | 0 |
| `deterministic-fixture-agent.test.ts` | 15/15 passed | 0 |
| `dry-run-agent.test.ts` | 31/31 passed | 0 |
| `prompt-standard.contract.test.ts` | 28/28 passed | 0 |
| `npm run typecheck` | All projects build cleanly | 0 |

## Safety

- No stash apply/pop/drop
- No production logic changes
- No GitHub writes except final PR creation
- Only test file modified
- Existing `os.tmpdir()` usage (lines 39, 185, 289) already established the pattern

## Was kann die Software jetzt im Vergleich zum vorherigen Lauf?

### Neue Fähigkeiten
- `real-adapter.test.ts` now runs fully on Windows (30/30 tests pass)

### Entfernte Blocker
- The pre-existing Windows `/tmp` test failure (`ENOENT: C:\tmp\evidence-conflict-test`) is fixed

### Unveränderte Einschränkungen
- GitHub CI remains advisory-only
- Lint/E2E/Mutation remain out of scope
- stash@{0} and stash@{1} remain intact
- No production logic changes

### Verbleibende Risiken
- Any remaining pre-existing CI failures not related to this issue

### Nächster sinnvoller Schritt
Review and merge the Issue #266 PR after human approval.
