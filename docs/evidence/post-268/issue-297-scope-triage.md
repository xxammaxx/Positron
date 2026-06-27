# Issue #297 — Scope Triage

## Timestamp
2026-06-27T09:38:00+02:00

## Issue #297 Description Analysis

Issue #297 is titled "Post-268: Stabilize flaky Playwright E2E test" and specifically describes:

- **Test file**: `e2e/ui-workflow-trace.spec.ts:46`
- **Error**: `const page: Page = await context.newPage();` at line 52
- **CI context**: Only fails on retry2 (retry0 and retry1 pass)
- **Pattern**: 25/26 E2E tests pass in CI

## DurationMs Flake Analysis

The `deterministic-fixture-agent.test.ts` durationMs flake:

| Aspect | Detail |
|--------|--------|
| Test file | `packages/opencode-adapter/src/__tests__/deterministic-fixture-agent.test.ts` |
| Root cause line | `deterministic-fixture-agent.ts:100` — `const startTime = Date.now()` |
| Why flaky | `Date.now()` produces real-time measurements, not deterministic values |
| Failing assertion | RT7b: `expect(results[i]).toEqual(first)` — deep equality fails when durationMs differs |
| Reproduced | Yes — failed on run 2/5 |

### Is durationMs part of Issue #297?

**NO.** Issue #297 explicitly describes a **Playwright E2E** test flake in `e2e/ui-workflow-trace.spec.ts`. The `durationMs` issue is in a **unit test** (`packages/opencode-adapter/src/__tests__/deterministic-fixture-agent.test.ts`).

These are:
1. Different test frameworks (Playwright vs Vitest)
2. Different test files
3. Different root causes (CI timing vs code-level non-determinism)
4. Different fix strategies

## Need for Issue Split?

The `durationMs` flake is a **separate, pre-existing** flake that should be tracked as its own issue.

### Proposed Split

| Issue | Scope | Status |
|-------|-------|--------|
| #297 | Stabilize Playwright E2E test `ui-workflow-trace.spec.ts` | Keep as-is |
| NEW | Fix deterministic-fixture-agent `durationMs` non-determinism | Create follow-up |

## Classification

```text
ISSUE_297_SCOPE_STATUS: MULTIPLE_FLAKES
```

**Detail**: Two independent flakes exist. Issue #297 correctly scopes the Playwright E2E flake. A separate follow-up issue is needed for the unit test `durationMs` non-determinism.

## Recommendation

1. Fix Issue #297 (E2E) as scoped — this run
2. Document `durationMs` flake as follow-up — separate issue
3. Do NOT combine both fixes into one PR
