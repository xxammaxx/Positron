---
title: Test Result Template — MCP Hybrid Test Architecture
date: 2026-05-25
author: Positron Team
is_template: true
status: draft
---

# Test Execution Result

> **Run ID:** <!-- Unique run identifier from the SQLite run store -->
> **Issue / Feature:** <!-- GitHub issue number or feature name -->
> **Test Plan Ref:** <!-- Link to the corresponding test-plan-template document -->
> **Executed by:** <!-- Agent or human who ran the tests -->
> **Date:** <!-- Execution date -->

---

## 1. Run Summary

<!--
High-level outcome of this test execution.
Must include the overall verdict: PASS / FAIL / PARTIAL.
-->

| Metric | Value |
|--------|-------|
| **Verdict** | `PASS` / `FAIL` / `PARTIAL` |
| Total tests | |
| Passed | |
| Failed | |
| Partial (warnings) | |
| Skipped | |
| Duration | |
| Exit code | |

**Evidence gate:** Verdict MUST be supported by the artifact manifest (see `artifact-manifest-template.json`).

---

## 2. Tests Executed

<!--
Detailed table of every test that was part of this execution.
Include file path, test name (vitest `describe > test` or Playwright `test`), and result.
-->

| # | Test File | Test Name | Result | Duration | Notes |
|---|-----------|-----------|--------|----------|-------|
| 1 | | | PASS / FAIL / SKIP | | |
| 2 | | | | | |
| 3 | | | | | |
| ... | | | | | |

**Required attachments for FAIL results:**
- Stack trace or error message
- Screenshot (Playwright) or assertion dump (Vitest)
- Log excerpt showing the failure point

---

## 3. PASS / FAIL / PARTIAL Detail

<!--
For each non-passing result, explain:
  - What failed
  - Why it failed (root cause, not symptom)
  - Whether the failure is pre-existing, introduced by this change, or intermittent
-->

### 3.1 Failures

| Test | Error | Root Cause | Classification |
|------|-------|------------|----------------|
| | | | Pre-existing / Introduced / Flaky |

### 3.2 Partial Results (Warnings)

| Test | Warning | Impact | Mitigation |
|------|---------|--------|------------|
| | | | |

### 3.3 Skipped Tests

| Test | Reason for Skip | Blocking Issue |
|------|-----------------|----------------|
| | | |

---

## 4. Commands Run

<!--
Exact shell commands executed, in order.
This MUST be reproducible by another agent or human.
-->

```bash
# Example — replace with actual commands
$ npm test
```

```bash
# If Vitest was run separately:
$ npx vitest run apps/server/src/__tests__/integration.test.ts
```

```bash
# If Playwright was run:
$ PW_HEADED=0 npx playwright test e2e/specs/example.spec.ts
```

**Environment variables active during test run:**

```
POSITRON_DB_PATH=:memory:
POSITRON_GITHUB_MODE=fake
POSITRON_SPECKIT_MODE=fake
POSITRON_OPENCODE_MODE=fake
# ... add all relevant env vars
```

---

## 5. Environment

| Property | Value |
|----------|-------|
| OS | |
| Node.js version | |
| npm version | |
| Git commit (HEAD) | |
| Branch | |
| CI / Local | |
| Vitest version | |
| Playwright version | |
| Browser (if E2E) | |
| Headed / Headless | |

---

## 6. Artifacts

<!--
References to all artifacts produced during this test run.
Artifacts MUST be registered in the artifact manifest (see `artifact-manifest-template.json`).
-->

| Artifact Type | Path | SHA256 | Description |
|---------------|------|--------|-------------|
| Report | | | |
| Log | | | |
| Screenshot | | | |
| Video | | | |
| Trace | | | |

**Artifact manifest path:** <!-- relative path to the artifact-manifest.json for this run -->

---

## 7. Observations

<!--
Free-form notes from the test runner:
  - Unexpected behaviour not caught by assertions
  - Performance anomalies
  - Console warnings or deprecation notices
  - Flaky test patterns observed
  - Suggestions for improving test coverage
-->

### 7.1 Unexpected Behaviour

### 7.2 Performance Notes

### 7.3 Console / Log Warnings

### 7.4 Recommendations

---

## Verification

<!--
Pre-completion checklist before this result document is considered final.
-->

- [ ] All FAIL results have documented root cause
- [ ] All SKIP results reference a blocking issue
- [ ] Artifacts are referenced and paths are valid
- [ ] Commands are reproducible exactly as written
- [ ] Environment section is complete
- [ ] This result is linked from the GitHub issue / PR
