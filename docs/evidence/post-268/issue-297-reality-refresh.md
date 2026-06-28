# Issue #297 — Reality Refresh

## Timestamp
2026-06-27T09:37:00+02:00

## Current State

| Field | Value |
|-------|-------|
| Branch | `main` |
| Local HEAD | `34e0445164086557970f7446965fe8a32d0cf090` |
| Remote main HEAD | `34e0445164086557970f7446965fe8a32d0cf090` |
| Working Tree | CLEAN (no uncommitted changes) |
| `git status --porcelain` | (empty) |

## Issue Status

| Issue | State | Title |
|-------|-------|-------|
| #297 | OPEN | Post-268: Stabilize flaky Playwright E2E test |
| #298 | CLOSED | Post-268: Fix Biome JSON formatting warnings |
| #299 | OPEN | Post-268: Fix Windows runner module resolution |

## PR Status

| PR | State | Merged | Title |
|----|-------|--------|-------|
| #300 | MERGED | 2026-06-27T06:57:52Z | fix(issue-298): format CI evidence JSON files |
| #301 | MERGED | 2026-06-27T07:28:58Z | fix(post-268): format Issue 298 evidence summary |

## Policy Checks

| Check | Status |
|-------|--------|
| CodeRabbit decommissioned | ✅ YES — not active |
| No secrets in tree | ✅ Confirmed |
| No push-protection warnings | ✅ None |
| Working tree clean | ✅ Yes |
| Branch is `main` | ✅ Yes |
| Local HEAD = Remote HEAD | ✅ Yes |

## Known Flakes

### Flake 1: Playwright E2E (Issue #297)
- **Test**: `e2e/ui-workflow-trace.spec.ts:46` — `Full workflow: Blueprint → Demo Run → Run Detail → DONE`
- **CI Evidence**: Run #28280831642, `e2e-playwright` job, 25/26 passed
- **Error**: Line 52 — `const page: Page = await context.newPage();` on retry2
- **Pattern**: retry0/retry1 pass, retry2 fails

### Flake 2: Unit Test durationMs Variance (SEPARATE - NOT #297)
- **Test**: `packages/opencode-adapter/src/__tests__/deterministic-fixture-agent.test.ts`
- **Root cause**: `execute()` method uses `Date.now()` for `durationMs` in `buildReport()`
- **Reproduced**: Yes — RT7b test failed on run 2/5 due to `durationMs: 1` vs `durationMs: 0`
- **Classification**: Separate pre-existing flake, NOT part of Issue #297

## Classification

```text
ISSUE_297_REALITY_STATUS: CURRENT
```

**Reasoning**: The repository is in a clean, current state. Issue #297 correctly identifies the E2E flake. A separate `durationMs` unit test flake was also discovered and documented.
