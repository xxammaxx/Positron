# Issue #297 — Root Cause Analysis

## Timestamp
2026-06-27T09:40:00+02:00

## Flake 1: Playwright E2E `ui-workflow-trace.spec.ts` (Issue #297)

### CI Error Description
```
[chromium] › e2e/ui-workflow-trace.spec.ts:46:6
UI Workflow Trace & Network Proof
Full workflow: Blueprint → Demo Run → Run Detail → DONE
- Error: Line 52 — const page: Page = await context.newPage();
- Retry: retry2 (retry0/retry1 passed)
```

### Root Cause Analysis

#### Hypothesis 1: Browser Context Leak Between Retries (PRIMARY)
- **Evidence**: The test creates a `BrowserContext` manually at line 48, but only closes it at line 316 (`await context.close()`)
- **Problem**: If the test throws an exception at any point between line 48 and line 316, the context is NEVER closed
- **Impact**: On retry2, the browser may have accumulated orphaned contexts from retry0/retry1, causing `browser.newContext()` to fail
- **Fix**: Wrap context creation in try/finally with guaranteed cleanup

#### Hypothesis 2: Long Test Timeout (CONTRIBUTING)
- **Evidence**: The test has `timeout: 300_000` (5 minutes) with multiple `waitForTimeout()` calls
- **Impact**: On retries in CI, cumulative test time can exhaust job timeout or browser process resources
- **Fix**: Reduce unnecessary `waitForTimeout()` calls where possible, use `waitForSelector()` or `waitForLoadState()` instead

#### Hypothesis 3: CI Resource Exhaustion (UNLIKELY)
- **Evidence**: Pattern of retry0/retry1 pass, retry2 fail
- **Impact**: After 2 successful test runs, the 3rd Chromium launch may fail due to memory/file descriptor limits
- **Fix**: Explicit browser cleanup at test level

### Root Cause Conclusion
**PRIMARY**: Missing cleanup (no try/finally around context lifecycle) causes browser resource leak between retries.

## Flake 2: Unit Test `deterministic-fixture-agent.test.ts` durationMs (SEPARATE)

### Error Description
```
RT7b: no random values in output (no Math.random, no crypto, no Date.now variance)
AssertionError: expected { durationMs: 0 } to deeply equal { durationMs: 1 }
```

### Root Cause Analysis

#### Identified Root Cause
**Line 100 of `deterministic-fixture-agent.ts`:**
```typescript
const startTime = Date.now();
```
**Lines 106 and 118:**
```typescript
durationMs: Date.now() - startTime,
```

`Date.now()` returns the **actual system time in milliseconds**. The agent's `execute()` method uses real time for `durationMs`, making it non-deterministic.

#### Why It Flakes
- `agent.execute()` is called multiple times in the RT7 tests
- Each call measures `Date.now() - startTime`
- When the machine is fast, this is 0ms; when anything causes a ±1ms delay, it changes
- The RT7 and RT7b tests assert **deep equality** via `toEqual()`, which fails when `durationMs` differs

#### Why It's Inconsistent
The method runs fast enough that `Date.now()` typically returns the same millisecond value for all invocations (0ms duration). But system load, GC pauses, or CPU scheduling can cause it to tick to 1ms, introducing variance.

### Root Cause Conclusion for durationMs
**IDENTIFIED**: The `execute()` method should use **deterministic** duration values from fixture data, not real `Date.now()` measurements.

## Classification

```text
ISSUE_297_ROOT_CAUSE_STATUS: IDENTIFIED
ISSUE_297_DURATIONMS_ROOT_CAUSE_STATUS: IDENTIFIED
```

### Fix Strategy

| Flake | Root Cause | Fix Type |
|-------|-----------|----------|
| E2E context leak | No cleanup guarantee for browser context | Add try/finally for context cleanup |
| durationMs variance | Real `Date.now()` in deterministic fixture | Sum fixture phase durations (deterministic) |
