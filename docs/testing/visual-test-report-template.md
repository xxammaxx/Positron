---
title: Visual Test Report Template — MCP Hybrid Test Architecture
date: 2026-05-25
author: Positron Team
is_template: true
status: draft
---

# Visual Test Observation Report

> **Run ID:** <!-- Unique run identifier -->
> **Issue / Feature:** <!-- GitHub issue number or feature name -->
> **Date:** <!-- Execution date -->
> **Observer:** <!-- Agent or human who ran the visual test -->

---

## 1. Test Identification

| Field | Value |
|-------|-------|
| **Visual Test Evidence** | `HEADED` / `HEADLESS` |
| **Browser** | Chromium / Firefox / WebKit |
| **Viewport** | <!-- e.g. 1280x720, 375x667 (mobile) --> |
| **PW_HEADED** | `1` / `0` |
| **PW_SLOWMO** | <!-- ms delay, if any --> |
| **Command** | <!-- exact Playwright command run --> |

**Command used:**

```bash
PW_HEADED=1 npx playwright test <path-to-visual-test-file> --project=chromium
```

---

## 2. Observed Flow

<!--
Step-by-step description of what was observed during the headed/headless run.
Include timestamp or time-offset references if video was recorded.
-->

| Step # | UI State / Interaction | Expected Outcome | Observed Outcome | Match? |
|--------|------------------------|------------------|------------------|--------|
| 1 | | | | YES / NO / PARTIAL |
| 2 | | | | |
| 3 | | | | |
| ... | | | | |

**Evidence gate:** Any `NO` or `PARTIAL` match MUST have a corresponding screenshot or video frame attached.

---

## 3. Result

**Overall visual test verdict:** `PASS` / `FAIL` / `PARTIAL`

**Reason for verdict:**

<!--
If FAIL or PARTIAL, describe the visual discrepancy:
  - Layout shift
  - Missing element
  - Wrong colour / font / spacing
  - Animation glitch
  - Console error during render
  - Responsive breakpoint misalignment
-->

---

## 4. Artifacts

<!--
All visual evidence MUST be captured and registered in the artifact manifest.
-->

### 4.1 Screenshots

| Screenshot | Path | Description | Taken At (Step) |
|------------|------|-------------|-----------------|
| Full page | | | |
| Element | | | |
| Diff (if baseline) | | | |

### 4.2 Video

| Field | Value |
|-------|-------|
| Video path | |
| Duration | |
| File size | |
| Recording mode | `retain-on-failure` / `on` |

### 4.3 Trace

| Field | Value |
|-------|-------|
| Trace path | |
| Trace viewer link | <!-- if uploaded --> |
| Trace contents | Network / Console / DOM snapshots |

### 4.4 Logs

| Log | Path | Content Summary |
|-----|------|-----------------|
| Browser console | | |
| Network requests | | |
| Server logs | | |

**Artifact manifest path:** <!-- relative path to the artifact-manifest.json for this run -->

---

## 5. Manual Observations

<!--
Human-readable observations that automated assertions cannot capture:
  - Visual polish
  - Animation smoothness
  - Loading states
  - Accessibility (keyboard navigation, focus order, screen reader output)
  - Hover / focus styles
  - Responsive layout at breakpoints
-->

### 5.1 Visual Polish

### 5.2 Animation & Transitions

### 5.3 Accessibility

### 5.4 Responsive Behaviour

### 5.5 Loading & Empty States

### 5.6 Error State Rendering

---

## 6. Automated Assertions Present

<!--
List all Playwright/Vitest assertions that validated behaviour during this visual test.
This confirms that the report is not purely manual — code-level checks exist.
-->

| Assertion | File:Line | What It Checks | Passing? |
|-----------|-----------|----------------|----------|
| `expect(page.locator(...)).toBeVisible()` | `e2e/...spec.ts:42` | Element X is rendered | YES / NO |
| `expect(page).toHaveScreenshot()` | `e2e/...spec.ts:55` | Visual regression vs baseline | YES / NO |
| `expect(consoleLogs).toEqual([])` | `e2e/...spec.ts:60` | No console errors | YES / NO |
| | | | |

**Visual baseline files referenced:**

| Baseline | Path | Status |
|----------|------|--------|
| | | `new` / `matched` / `diff` |

---

## Verification

- [ ] Headed/headless mode is documented
- [ ] Browser and viewport are specified
- [ ] Every `NO` or `PARTIAL` has an artifact attachment
- [ ] Automated assertions are listed with pass/fail status
- [ ] Screenshots, video, and trace paths are valid
- [ ] Manual observations are filled in (not empty)
- [ ] This report is linked from the GitHub issue / PR
