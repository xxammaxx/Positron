# Post-299: E2E Tracing Flake — Next Fix-Run Prompt

**Date:** 2026-06-27
**Agent:** issue-orchestrator
**Target Issue:** #304

---

## Prompt for Next Fix Run

Copy the block below and provide it as the instruction for the E2E tracing fix run.

---

```text
# POSITRON FIX RUN — Issue #304: Stabilize Playwright tracing lifecycle in E2E tests

Du bist die ausführende/prüfende KI im Repository `xxammaxx/Positron`.

## Issue

Issue #304: Post-299: Stabilize Playwright tracing lifecycle in E2E tests
URL: https://github.com/xxammaxx/Positron/issues/304

## Root Cause (pre-identified)

**Primary:** Playwright config (`playwright.config.ts` line 52) has `trace: 'retain-on-failure'`, which causes Playwright to automatically start tracing on EVERY test. The test at `e2e/ui-workflow-trace.spec.ts:55` explicitly calls `context.tracing.start({ screenshots: true, snapshots: true })`, which fails because tracing is already active.

**Secondary:** `context.tracing.stop()` at line 253 is inside the `try` block, not `finally`. If any step before Step 13 fails, tracing is never stopped.

## Scope

**PREFERRED FIX (Option A):**
- Remove explicit `context.tracing.start()` call from line 55 of `e2e/ui-workflow-trace.spec.ts`
- Remove or move `context.tracing.stop()` call from line 253 (Step 13)
- If trace artifact (`trace.zip`) saving is needed explicitly, add it to the `finally` block
- Keep global `trace: 'retain-on-failure'` in `playwright.config.ts` unchanged

## Non-Scope (BLOCKED)

- Do NOT change `playwright.config.ts` unless evidence confirms `trace: 'retain-on-failure'` is the wrong approach
- Do NOT delete any test files
- Do NOT disable tracing globally
- Do NOT weaken assertions
- Do NOT increase timeouts broadly
- Do NOT change workflow files (`.github/workflows/`)
- Do NOT trigger manual CI (`gh workflow run`, `gh run rerun`)
- Do NOT push to main directly (use a branch)
- Do NOT merge without approval
- Do NOT reactivate CodeRabbit
- Do NOT touch PR #218 or old PR chains #230-#242

## Requirements

1. Create branch: `positron/issue-304-stabilize-tracing-lifecycle`
2. Implement minimal fix (prefer Option A)
3. Run local gates:
   - `npm run build`
   - `npm run typecheck`
   - `npm test`
4. If Playwright is available locally, run `npx playwright test e2e/ui-workflow-trace.spec.ts`
5. Create DRAFT PR (no merge)
6. Observe automatic CI on PR (do NOT trigger manually)
7. Verify `e2e-playwright` job passes

## Commit Format

```
fix(issue-304): resolve Playwright tracing lifecycle conflict
```

## Result Format

Respond with:
1. What was changed (diff summary)
2. Local gate results
3. CI results (automatic only)
4. PR URL
5. Any remaining issues

## Risk

RISK: YELLOW_VALIDATE
TYPE: e2e reliability / Playwright tracing lifecycle
```

---

## Classification

```
NEXT_RECOMMENDED_FIX: E2E_TRACING_LIFECYCLE
  - Fix the trace lifecycle conflict in e2e/ui-workflow-trace.spec.ts
  - Preferred approach: remove explicit tracing calls, rely on global config
  - Minimal change, no config modification needed
```
