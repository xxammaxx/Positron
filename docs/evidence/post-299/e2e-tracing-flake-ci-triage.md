# Post-299: E2E Tracing Flake — CI/Log Triage

**Date:** 2026-06-27
**Agent:** issue-orchestrator
**Run Type:** Read-only CI log analysis

---

## Affected CI Job

| Property | Value |
|----------|-------|
| Job name | `e2e-playwright` |
| Job ID (latest) | 83807759736 |
| Run ID (latest) | 28285161940 |
| Conclusion | FAILURE |
| Failing step | "Run E2E tests" (step 8) |
| Command | `npm run test:e2e` → `playwright test` |

## Exact Error

```
Error: tracing.start: Tracing has been already started

  53 |
  54 |   try {
> 55 |     await context.tracing.start({ screenshots: true, snapshots: true });
     |                           ^
  56 |
  57 |     const page: Page = await context.newPage();
  58 |

    at /home/runner/work/Positron/Positron/e2e/ui-workflow-trace.spec.ts:55:26
```

## Affected Test

| Property | Value |
|----------|-------|
| File | `e2e/ui-workflow-trace.spec.ts` |
| Test name | `UI Workflow Trace & Network Proof › Full workflow: Blueprint → Demo Run → Run Detail → DONE` |
| Line | 55 |
| API call | `context.tracing.start()` |
| Test mode | `serial` |
| Worker count | 1 |

## Error Pattern Across Retries

All three attempts (initial + Retry #1 + Retry #2) fail with the **identical** error at the **same line**. This means:
- The error is deterministic, not intermittent
- The tracing is already active BEFORE the explicit `context.tracing.start()` call
- This is NOT a cleanup-between-retries issue — it fails on the first attempt too

## Root Cause Analysis

### Primary Cause: Global Playwright trace mode conflict

**Playwright config (`playwright.config.ts` line 52):**
```typescript
trace: 'retain-on-failure',
```

This global setting causes Playwright to **automatically start tracing** on every test's browser context. When line 55 of the test attempts to explicitly call `context.tracing.start()`, the context already has tracing active from the framework-level automatic tracing.

### Secondary Issue: Tracing stop is not in finally

**Test file (`e2e/ui-workflow-trace.spec.ts`):**
- `context.tracing.start()` at line 55 — inside `try` block
- `context.tracing.stop()` at line 253 — inside `try` block (Step 13), NOT in `finally`
- `context.close()` at line 322 — in `finally` block, but does NOT stop tracing

Even if the global config conflict were resolved, any test failure between line 55 and line 253 would leave tracing unstopped, potentially causing issues on retries.

### Independence from Prior Issues

| Issue | Status | Independent? |
|-------|--------|-------------|
| #297 (Browser context cleanup flake) | CLOSED | YES — #297 was about context leaks between retries causing `retry2` failures. This is a tracing lifecycle conflict that fails on first attempt. |
| #299 (Windows module resolution) | CLOSED | YES — #299 was a TypeScript/path resolution issue causing `build-and-test` to fail. This is a Playwright tracing issue in `e2e-playwright`. |

## Error Location in Test Lifecycle

- **When:** At test start (line 55), immediately after context creation (line 50-52) and before any page navigation
- **Worker:** Single worker, 26 tests total, this is the only test that explicitly calls `context.tracing.start()`
- **Other tests:** 25 pass, only this one fails

## Classification

```
E2E_TRACING_FAILURE_CLASS: TRACE_LIFECYCLE
  - Global Playwright `trace: 'retain-on-failure'` config
    auto-starts tracing, conflicting with explicit `context.tracing.start()`

E2E_TRACING_TRIAGE_STATUS: CONFIRMED
  - Error reproduced consistently across multiple CI runs
  - Root cause identified: Playwright config vs test code conflict
  - Fails on all 3 attempts (initial + 2 retries)
```
