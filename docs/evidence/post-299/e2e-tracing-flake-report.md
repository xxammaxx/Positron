# Post-299: E2E Tracing Flake — Triage Report

**Date:** 2026-06-27
**Agent:** issue-orchestrator
**Status:** GREEN — Triage complete, follow-up issue created

---

## Executive Summary

After Issue #299 (Windows module resolution) was closed and PR #303 merged, a separate E2E failure persists in the advisory CI checks:

```
tracing.start: Tracing has been already started
```

This was triaged as an independent issue — not related to #297 (browser context cleanup) or #299 (Windows module resolution).

## Root Cause

**Primary:** `playwright.config.ts` line 52 sets `trace: 'retain-on-failure'`, causing Playwright to automatically start tracing on every browser context. The test at `e2e/ui-workflow-trace.spec.ts:55` explicitly calls `context.tracing.start()`, which fails because tracing is already active.

**Secondary:** `context.tracing.stop()` is hidden inside Step 13 of the test (line 253), not in the `finally` block. If any step before Step 13 fails, tracing is never stopped.

## Evidence

- **CI confirmation:** 3 consecutive main-branch CI runs failed with identical error
- **Deterministic:** Error occurs on ALL attempts (initial + 2 retries)
- **Isolation:** Other 25 E2E tests pass; only `ui-workflow-trace.spec.ts` fails
- **Local gates:** All pass (build, typecheck, 1571 tests)
- **No existing issue:** Searched all open/closed issues — no prior report of this specific error

## Actions Taken

1. Reality refresh confirmed — all prior issues closed, working tree clean
2. CI logs analyzed — root cause identified, independently verified
3. Existing issues scanned — no match found
4. **Issue #304 created:** "Post-299: Stabilize Playwright tracing lifecycle in E2E tests"
5. Next fix-run prompt prepared
6. Local gates verified GREEN

## Proposed Fix (for next run)

**Option A (preferred):** Remove explicit `context.tracing.start()` and `context.tracing.stop()` from the test, rely on global `trace: 'retain-on-failure'` config. This is a 2-line removal with zero risk.

## Risk Assessment

```
RISK: YELLOW_VALIDATE
- Fix is minimal (2-line removal)
- No test logic changes
- No config changes
- No workflow changes
- Needs CI verification on PR (automatic only)
```
