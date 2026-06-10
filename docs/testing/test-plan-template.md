---
title: Test Plan Template — MCP Hybrid Test Architecture
date: 2026-05-25
author: Positron Team
is_template: true
status: draft
---

# Test Plan

> **Issue/Feature:** <!-- Reference to the GitHub issue or spec this plan covers -->
> **Spec Source:** <!-- Link to `.specify/` spec, plan, tasks, or issue comment -->
> **Author:** <!-- Person or agent creating this plan -->
> **Date:** <!-- Creation date -->

---

## 1. Context

<!--
Brief description of the feature or bug being tested.
Include references to:
  - Acceptance criteria from the spec
  - The state-machine phase(s) involved
  - Whether this is Vitest (unit/integration), Playwright (E2E), or both
-->

**Feature summary:**

**Related spec/issue:**

**Test scope:** `unit` / `integration` / `e2e` / `hybrid` (strikethrough as needed)

**State machine phases under test:**

---

## 2. User Journeys

<!-- Numbered list of happy-path journeys a user or agent takes through the system. Each journey is a complete end-to-end scenario that must pass for feature completion. -->

| # | Journey | Expected Result | Priority |
|---|---------|----------------|----------|
| 1 | | | P0 / P1 / P2 |
| 2 | | | |
| 3 | | | |

**Evidence gate:** All P0 journeys must produce a passing test artifact (Vitest assertion or Playwright trace).

---

## 3. Edge Cases

<!--
Unusual but valid inputs, boundary conditions, race conditions, state-machine transition limits.
Each edge case must link to a concrete test.
-->

| # | Edge Case | Expected Behavior | Validation Method |
|---|-----------|-------------------|-------------------|
| 1 | | | Unit / Integration / E2E |
| 2 | | | |
| 3 | | | |

---

## 4. Negative Tests

<!--
What should NOT happen. Invalid inputs, unauthorised state transitions, missing dependencies.
Each negative test MUST confirm that the system fails safely and reports the correct error.
-->

| # | Negative Scenario | Expected Error / Safeguard | Evidence |
|---|-------------------|----------------------------|----------|
| 1 | | | |
| 2 | | | |
| 3 | | | |

---

## 5. Security Risks

<!--
Based on the security model (see `docs/security/security-model.md`):
  - Branch policy violations
  - Force-push attempts
  - Kill-switch bypass
  - Adapter mode confusion (fake vs real)
  - Secret leakage in logs
  - MCP trust-tier violations
-->

| # | Risk | Mitigation | Test Method |
|---|------|------------|-------------|
| 1 | | | |
| 2 | | | |

**Evidence gate:** Each security risk requires a dedicated test with a documented pass condition.

---

## 6. Affected Modules

<!--
List the packages/modules that this test plan exercises.
Use the module names from the project architecture (see `docs/architecture/README.md`).
-->

- [ ] `apps/web` — React/Vite/Tailwind Frontend
- [ ] `apps/server` — Node.js/Express/TypeScript Backend
- [ ] `packages/github-adapter` — GitHub API
- [ ] `packages/speckit-adapter` — Spec Kit CLI
- [ ] `packages/opencode-adapter` — OpenCode CLI
- [ ] `packages/run-state` — State Machine
- [ ] `packages/sandbox` — Git Worktrees
- [ ] `packages/shared` — Types, Utilities
- [ ] Other: <!-- specify -->

**Dependency graph impact** (list modules that call or are called by affected modules):

---

## 7. Visible Test Steps

<!--
Numbered steps a human or agent executes to reproduce the test scenario.
For Vitest: the `npm test` or `npx vitest run` command and the specific test file path.
For Playwright: the `npx playwright test` command, headed/headless mode, and the test file path.
-->

**Vitest commands:**

```bash
# Unit / Integration
npx vitest run <path-to-test-file>
```

**Playwright commands:**

```bash
# Headless (default)
npx playwright test <path-to-e2e-test>

# Headed (for visual evidence)
PW_HEADED=1 npx playwright test <path-to-e2e-test>
```

**Manual inspection steps** (if applicable):

1.
2.
3.

---

## 8. Test Data Requirements

<!--
All test data, fixtures, mocks, and database state needed.
If the test uses fake adapters (default), note which adapters are faked.

Document:
  - Fixture files needed
  - GitHub mock data (issue numbers, comments, labels)
  - SQLite in-memory database configuration
  - Environment variables required
-->

| Data Item | Source / Fixture | Notes |
|-----------|------------------|-------|
| | | |
| | | |
| | | |

**Adapter mode:** All fake (default) / Mixed: `___` / Real: `___`

---

## Approval

<!-- Checked off when the test plan is reviewed and approved. -->

- [ ] Plan reviewed against acceptance criteria
- [ ] All P0 journeys have test coverage
- [ ] Security risks have matching tests
- [ ] Edge cases are enumerated
- [ ] Test data requirements are satisfied
- [ ] Plan approved by: <!-- name / agent signature -->
