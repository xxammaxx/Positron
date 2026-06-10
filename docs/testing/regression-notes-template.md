---
title: Regression Notes Template — MCP Hybrid Test Architecture
date: 2026-05-25
author: Positron Team
is_template: true
status: draft
---

# Regression Notes

> **Bug Reference:** <!-- GitHub issue URL or issue number -->
> **Severity:** <!-- CVSS vector string + score, e.g. CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:H (7.5) -->
> **Reported by:** <!-- Agent or human who identified the bug -->
> **Date:** <!-- Date of bug identification -->
> **Root cause classification:** <!-- Logic error / Spec gap / Integration failure / Environment / Regression -->

---

## 1. Bug Reference

| Field | Value |
|-------|-------|
| GitHub Issue | `#<number>` |
| Title | |
| Affected module(s) | |
| Introduced in | <!-- commit SHA or iteration tag --> |
| State machine phase | <!-- if applicable --> |
| Environment | <!-- where the bug was observed --> |

### 1.1 Bug Description

<!--
Clear, concise description of the bug, including:
  - What was expected
  - What actually happened
  - Under what conditions the bug manifests
-->

### 1.2 CVSS Vector

```
CVSS:3.1/...
```

**Severity score:** <!-- 0.0–10.0 -->

**Evidence for severity:** <!-- Link to PoC reproduction, log evidence, impact analysis -->

---

## 2. Reproduction Steps

<!--
Exact steps to reproduce the bug. Must be reproducible by another agent or human
in a clean environment. Include setup, input, commands, and expected vs actual output.
-->

### 2.1 Preconditions

- <!-- e.g. Server running with fake adapters -->
- <!-- e.g. Issue #42 registered -->
- <!-- e.g. Environment variables set -->

### 2.2 Steps

```bash
# Step 1 — Setup
$ npx vitest run <path-to-test> --reporter=verbose
```

```bash
# Step 2 — Trigger
$ curl -X POST http://localhost:3000/api/repos/repo-1/runs \
  -H "Content-Type: application/json" \
  -d '{"issueNumber": 42, "autonomyLevel": 2}'
```

1. <!-- Or describe step-by-step if not command-driven -->
2.
3.

### 2.3 Expected Result

### 2.4 Actual Result

### 2.5 Log Evidence

```
<!-- Paste relevant log excerpts, stack traces, or error messages here -->
```

---

## 3. Failing Test Before Fix

<!--
This is the critical evidence gate: the test that demonstrates the bug BEFORE any fix is applied.
The test MUST fail when run against the unmodified codebase.
-->

**Test file:** <!-- path to the test -->

**Test content (or link):**

```typescript
// Paste the failing test code here
// or provide a permalink to the file on GitHub
```

**Command to reproduce failure:**

```bash
npx vitest run <path-to-test-file> -t "<test-name>"
```

**Output showing failure:**

```
<excerpt from test output — must include the assertion error and stack trace>
```

**Evidence gate — FAIL CONFIRMED:** <!-- Check once the failure is observed -->

- [ ] Test fails on unmodified code
- [ ] Error message matches expected failure
- [ ] Screenshot / log attached

---

## 4. Fix Applied

<!--
Document the fix that was applied. Include:
  - What was changed
  - Why this change fixes the bug
  - Link to the commit/PR
-->

### 4.1 Change Description

### 4.2 Files Modified

| File | Change |
|------|--------|
| | |
| | |

### 4.3 Commit / PR Reference

```
commit <sha>
Branch: positron/issue-<n>-<slug>
```

### 4.4 Fix Justification

<!--
Explain why the change is correct:
  - Root cause analysis
  - Why the previous code was wrong
  - Why the new code is correct
  - What other impacts the change might have
-->

---

## 5. Passing Test After Fix

<!--
The same test (from section 3) now passes against the fixed codebase.
This is the closing evidence gate.
-->

**Command to verify pass:**

```bash
npx vitest run <path-to-test-file> -t "<test-name>"
```

**Output showing pass:**

```
<excerpt from test output — must show ✓ or PASS>
```

**Evidence gate — PASS CONFIRMED:** <!-- Check once the pass is observed -->

- [ ] Same test passes on fixed code
- [ ] No new failures introduced (full suite run)
- [ ] `npm test` passes

---

## 6. Linked Regression Test

<!--
For every bug fix, a regression test MUST be added to prevent recurrence.
If the existing failing test is sufficient as a permanent regression test,
it should be added to the regular test suite.
-->

### 6.1 Regression Test Details

| Field | Value |
|-------|-------|
| Test file | |
| Test name | |
| Suite type | `unit` / `integration` / `e2e` |
| Purpose | |
| Added in commit | |

### 6.2 Test Code

```typescript
// Copy the regression test code here, or link to the file
```

### 6.3 Coverage Confirmation

- [ ] Regression test covers the exact bug scenario
- [ ] Regression test covers related edge cases
- [ ] Regression test is integrated into the CI suite
- [ ] All existing tests still pass with regression test added

---

## Verification

- [ ] Bug reference and CVSS are documented
- [ ] Reproduction steps are exact and reproducible
- [ ] Failing test evidence is attached (section 3)
- [ ] Fix is documented with commit reference (section 4)
- [ ] Passing test evidence is attached (section 5)
- [ ] Regression test is added and verified (section 6)
- [ ] Full `npm test` passes
- [ ] This regression note is linked from the GitHub issue / PR
