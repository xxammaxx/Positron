# Post-299: E2E Tracing Flake — Created Issue

**Date:** 2026-06-27
**Agent:** issue-orchestrator

## Issue Details

| Property | Value |
|----------|-------|
| Issue number | #304 |
| Title | Post-299: Stabilize Playwright tracing lifecycle in E2E tests |
| URL | https://github.com/xxammaxx/Positron/issues/304 |
| Labels | `bug`, `testing`, `qa`, `approval:not-required` |
| Risk | YELLOW_VALIDATE |
| Type | e2e reliability / Playwright tracing lifecycle |

## Issue Body Summary

- Documents the `tracing.start: Tracing has been already started` error
- Identifies root cause: Playwright global `trace: 'retain-on-failure'` config conflicts with explicit `context.tracing.start()` in test
- Proposes 3 fix approaches (Option A preferred: remove explicit tracing calls)
- Explicitly separates from #297 and #299
- Defines non-scope (no workflow changes, no test deletion, no manual CI, etc.)
- Risk classification: YELLOW_VALIDATE

## Classification

```
E2E_TRACING_ISSUE_STATUS: CREATED
  - Issue #304 created 2026-06-27
  - No existing issue was suitable for merge
  - Scoped to Playwright tracing lifecycle only
```
