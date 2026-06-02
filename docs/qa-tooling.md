# QA Tooling Guide

## Overview

This guide tracks E2E Playwright promotion status and review notes.

## QA-031: E2E Suite Stabilization Notes

- E2E stays optional until enough stable CI evidence exists on `main`.
- The Quality Gates workflow is present on the QA-030 branch and not yet merged to `main`.
- QA-031 stabilization fixes are not on `main`.
- Main-branch validation still shows E2E failures.

---

## QA-032: E2E Stability Window Review (2026-06-02)

### Decision

**E2E remains OPTIONAL (non-blocking).** Promotion to blocking is deferred.

### Rationale

| Criterion | Required | Actual | Met? |
|-----------|----------|--------|------|
| Consecutive stable CI runs | ≥5 | 0 | ❌ |
| Zero flakes | ✓ | N/A | N/A |
| Stable runtime | ✓ | N/A | N/A |
| Artifacts present | ✓ | N/A | N/A |
| QA-031 fixes on main | ✓ | Not merged | ❌ |

The e2e-playwright CI job has **never executed** because:
1. The `quality-gates.yml` workflow (containing the e2e-playwright job) was created on the QA-030 branch (`c4caf78`) but **never merged to main**.
2. QA-031 E2E stabilization commits are not on main — E2E tests show 3 failures on main.
3. Only 1 Quality Gates CI run exists in GitHub Actions history (from qa-008 branch, FAILURE state).

### CI History

| Run | Commit | E2E-Ergebnis | Laufzeit | Flake | Artifact |
| --- | ------ | ------------ | -------: | ----- | -------- |
| N/A | N/A | Kein E2E-CI-Run existiert | N/A | N/A | N/A |

Total e2e-playwright CI job executions: **0**

### Prerequisites for Promotion

Before E2E can be considered for promotion to blocking:
1. **QA-030 and QA-031 branches must be merged to main**
2. Quality Gates workflow must trigger **at least 5 consecutive CI runs**
3. All 5 runs must have **green** e2e-playwright job results
4. **Zero flakes** across all 5 runs
5. **Stable E2E runtime** across all 5 runs

### Current Status

- **E2E CI Job:** Exists in `quality-gates.yml` (on QA-030 branch), NOT on main
- **E2E CI Runs Executed:** 0
- **Stability Window:** NOT STARTED — begins after QA-030/031 merge to main
- **Promotion Status:** BLOCKED — insufficient CI data
- **E2E Job Configuration:** `continue-on-error: true` (optional), well-configured with fake/safety env, chromium install, artifact upload

### Local Validation (main branch, 2026-06-02)

| Check | Ergebnis |
| ----- | -------- |
| Build | ✅ Green |
| Typecheck | ✅ Green |
| Unit Tests (208 tests) | ✅ Green |
| E2E Tests (23 tests) | ⚠️ 3 failures (QA-031 fixes not on main) |
| Docker Compose Config | ✅ Valid |

### Next Review

- **Trigger:** After 5+ consecutive stable e2e-playwright CI runs on main
- **Expected:** ~2 weeks after QA-030 and QA-031 are merged
- **Reviewer:** QA-033 or later
- **Attention:** Watch for IPv4/IPv6 ECONNREFUSED issues, rate limiter bypass, and UI element selector changes

### Troubleshooting

- **E2E fails on CI but passes locally:** Check for IPv4/IPv6 `ECONNREFUSED ::1:3001` — ensure server binds to `0.0.0.0` or `127.0.0.1`
- **Artifacts missing:** The workflow uses `if-no-files-found: warn` — verify playwright-report and test-results directories exist after test run
- **Rate limiting (429):** Ensure `VITEST=true` bypass is active in the rate limiter middleware
