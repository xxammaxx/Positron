# Track E1 — `noArrayIndexKey` Implementation Report

**Issue:** #340
**Track:** E1 — `lint/suspicious/noArrayIndexKey`
**Date:** 2026-07-22

---

## 1. Source of Truth

| Field | Value |
|---|---|
| **AUTHORIZED_BASE_SHA** | `67064a85e76f4998d3d5e983cf96e745d8a543df` |
| **BASE_TREE** | `2ba0c767e5052ff1aef5c999b3e7a621e7bed2f0` |
| **INITIAL_IMPLEMENTATION_COMMIT** | `d846d7cbfc30fb90d85ddb8d440a1f8f9f2a7276` |
| **REVIEW_GAP_FIX_COMMIT** | `22f757bcf5926617e9a0a93759a56a89090617e9` |
| **PRE_DOCUMENTATION_CLOSURE_HEAD** | `286ce90b597d5d979ba3314e63359b2856285c91` |
| **FINAL_PR_HEAD_SOURCE_OF_TRUTH** | GitHub PR #384 metadata and the exact-head closure comment posted after push |
| **SELF_REFERENTIAL_SHA_EMBEDDED** | NO |
| **BIOME_VERSION** | 1.9.4 |

---

## 2. Baseline (7 diagnostics)

| # | File | Line | Key | Category |
|---|---|---|---|---|
| E1-S1 | `dashboard/RecentActivity.tsx` | 28 | `key={i}` | SKELETON |
| E1-S2 | `dashboard/StatusSummary.tsx` | 17 | `key={i}` | SKELETON |
| E1-S3 | `shared/LoadingSkeleton.tsx` | 16 | `key={i}` | SKELETON (table) |
| E1-S4 | `shared/LoadingSkeleton.tsx` | 48 | `key={i}` | SKELETON (text) |
| E1-S5 | `runs/RunsPage.tsx` | 116 | `key={i}` | SKELETON |
| E1-D1 | `projects/ProjectsPage.tsx` | 116 | `key={i}` | DATA_LIST (blockers) |
| E1-D2 | `projects/ProjectsPage.tsx` | 157 | `key={i}` | DATA_LIST (nextRecommendedRuns) |

**SKELETON: 5 | DATA_LIST: 2 | TOTAL: 7**

---

## 3. Key Strategy

| Strategy | Sites | Mechanism |
|---|---|---|
| **Fixed skeleton slot groups** | 3 (RecentActivity, StatusSummary, RunsPage) | Named `as const` string arrays — compile-time stable keys |
| **Localized skeleton suppressions** | 2 (LoadingSkeleton table + text) | `// biome-ignore lint/suspicious/noArrayIndexKey:` with rationale comment |
| **Duplicate-safe content keys** | 2 (ProjectsPage blockers + nextRecommendedRuns) | `createStableTextItems()` — deterministic, position-independent, per-value occurrence counter via `JSON.stringify([value, occurrence])` |

```text
FIXED_SKELETON_SLOT_GROUPS:  3
DYNAMIC_SKELETON_SUPPRESSIONS: 2
DATA_LIST_LOCATIONS:          2
COMPOUND_INDEX_KEYS:          0
RANDOM_KEYS:                  0
```

---

## 4. Changed Files

| # | File | Change |
|---|---|---|
| 1 | `apps/web/src/components/dashboard/RecentActivity.tsx` | +12/−2: Added `RECENT_ACTIVITY_SKELETON_SLOTS` constant (4 slots), replaced index map with slot iteration |
| 2 | `apps/web/src/components/dashboard/StatusSummary.tsx` | +12/−2: Added `STATUS_SUMMARY_SKELETON_SLOTS` constant (4 slots), same pattern |
| 3 | `apps/web/src/components/shared/LoadingSkeleton.tsx` | +6/−1: Added 2 `biome-ignore` suppressions with rationale on table/text skeleton rows |
| 4 | `apps/web/src/components/projects/ProjectsPage.tsx` | +36/−8: Added `StableTextItem` interface and `createStableTextItems()` helper; updated blockers and nextRecommendedRuns rendering |
| 5 | `apps/web/src/components/runs/RunsPage.tsx` | +16/−4: Added `RUNS_PAGE_SKELETON_SLOTS` constant (8 slots), same pattern |
| 6 | `apps/web/src/__tests__/track-e1-no-array-index-key.test.tsx` | +390: 19 focused tests covering helper correctness, rendering integrity, and skeleton counts |
| 7 | `docs/evidence/issue-340/track-e1/no-array-index-key-report.md` | This file |

```text
SOURCE_FILES_CHANGED:    5
TEST_FILES_CHANGED:      1
EVIDENCE_FILES_CHANGED:  1
MAXIMUM_CHANGED_FILES:   7
CONFIG_FILES_CHANGED:    0
```

---

## 5. Diagnostics — After

### 5.1 Targeted noArrayIndexKey

```text
TARGETED_BEFORE:  7
TARGETED_AFTER:   0
REPO_WIDE_AFTER:  0
INTRODUCED:       0
```

Verified via:
```bash
npx biome lint apps/web/src/components/dashboard/RecentActivity.tsx \
  apps/web/src/components/dashboard/StatusSummary.tsx \
  apps/web/src/components/shared/LoadingSkeleton.tsx \
  apps/web/src/components/projects/ProjectsPage.tsx \
  apps/web/src/components/runs/RunsPage.tsx \
  --only=lint/suspicious/noArrayIndexKey
# Result: 0 diagnostics

npx biome lint . --only=lint/suspicious/noArrayIndexKey
# Result: 0 diagnostics (errors=0, warnings=0)
```

### 5.2 Full Diagnostic Matrix — BASE vs HEAD

Exact biome lint comparison of the 5 changed source files at BASE SHA (`67064a85`) vs HEAD (`286ce90b`), plus the new test file:

#### BASE (`67064a85`) — 5 source files

| # | Category | Severity | File |
|---|---|---|---|
| 0 | `lint/suspicious/noArrayIndexKey` | warning | `dashboard/StatusSummary.tsx` |
| 1 | `lint/suspicious/noArrayIndexKey` | warning | `shared/LoadingSkeleton.tsx` |
| 2 | `lint/suspicious/noArrayIndexKey` | warning | `shared/LoadingSkeleton.tsx` |
| 3 | `lint/suspicious/noArrayIndexKey` | warning | `dashboard/RecentActivity.tsx` |
| 4 | `lint/suspicious/noArrayIndexKey` | warning | `projects/ProjectsPage.tsx` |
| 5 | `lint/suspicious/noArrayIndexKey` | warning | `projects/ProjectsPage.tsx` |
| 6 | `lint/complexity/noForEach` | **error** | `runs/RunsPage.tsx` |
| 7 | `lint/a11y/useKeyWithClickEvents` | **error** | `runs/RunsPage.tsx` |
| 8 | `lint/suspicious/noAssignInExpressions` | **error** | `runs/RunsPage.tsx` |
| 9 | `lint/suspicious/noArrayIndexKey` | warning | `runs/RunsPage.tsx` |

```text
BASE_CHANGED_SOURCE_DIAGNOSTICS: 10 (7 noArrayIndexKey warnings + 3 pre-existing errors)
```

#### HEAD (`286ce90b`) — 5 source files

| # | Category | Severity | File |
|---|---|---|---|
| 0 | `lint/complexity/noForEach` | **error** | `runs/RunsPage.tsx` |
| 1 | `lint/a11y/useKeyWithClickEvents` | **error** | `runs/RunsPage.tsx` |
| 2 | `lint/suspicious/noAssignInExpressions` | **error** | `runs/RunsPage.tsx` |

```text
HEAD_CHANGED_SOURCE_DIAGNOSTICS: 3 (all 3 pre-existing, unchanged from BASE)
```

#### HEAD — New test file

```text
NEW_TEST_FILE_DIAGNOSTICS: 0
```

#### Resolution

```text
HEAD_INTRODUCED_DIAGNOSTICS: 0
TARGETED_NO_ARRAY_INDEX_KEY: 0  (all 7 resolved)
REPO_WIDE_NO_ARRAY_INDEX_KEY: 0
```

The 3 remaining errors (`noForEach`, `useKeyWithClickEvents`, `noAssignInExpressions` in `RunsPage.tsx`) are **pre-existing** at BASE and unchanged by this PR. They belong to the general repo Biome backlog tracked in Issue #340.

---

## 6. Tests

All test results verified locally at code HEAD `286ce90b`:

| Test Suite | Tests | Passed | Failed |
|---|---|---|---|
| **Focused E1 tests** | 19 | 19 | 0 |
| **Web tests** (`@positron/web`) | 349 | 349 | 0 |
| **Full repo tests** | 2121 | 2121 | 0 |
| **E2E (Playwright)** | 26 | 26 | 0 |

Local gate exits:

```text
BUILD_EXIT:      0 (npm run build)
TYPECHECK_EXIT:  0 (npm run typecheck)
DIFF_CHECK_EXIT: 0 (git diff --check)
```

---

## 7. Gates

### First CI Run (#29912525824) — Initial Commit `d846d7c`

The first CI workflow on the initial commit `d846d7c` failed at the **Format check (Biome)** step because the test file and two source files had formatting drift. Build, Typecheck, and Unit Test jobs were skipped.

```text
WORKFLOW_RUN:       29912525824
WORKFLOW_CONCLUSION: failure
FORMAT_CHECK:       FAIL
LINT:               SKIPPED (not reached)
BUILD:              SKIPPED (not reached)
TYPECHECK:          SKIPPED (not reached)
UNIT_TESTS:         SKIPPED (not reached)
```

### Second CI Run (#29913783527) — Review Gap Fix Head `286ce90b`

After formatting fixes in commit `22f757b`, format check passes. Lint fails due to **pre-existing repo backlog** (unrelated to this PR). Build, Typecheck, and Unit Test jobs are skipped after lint failure by workflow design.

```text
WORKFLOW_RUN:       29913783527
WORKFLOW_CONCLUSION: failure
FORMAT_CHECK:       PASS
LINT:               FAIL
LINT_FAILURE_CLASS: PRE_EXISTING_REPO_BACKLOG
BUILD:              SKIPPED_AFTER_LINT_FAILURE
TYPECHECK:          SKIPPED_AFTER_LINT_FAILURE
UNIT_TESTS:         SKIPPED_AFTER_LINT_FAILURE
E2E_PLAYWRIGHT:     PASS
MUTATION_FAST:      PASS
MUTATION_SAFETY:    PASS
TOOL_GATEWAY_WINDOWS: PASS
OBSERVABILITY_CONFIG: PASS
```

### Local Gates (verified at `286ce90b`)

| Gate | Exit | Result |
|---|---|---|
| `git diff --check` | 0 | PASS |
| `npm run build` | 0 | PASS |
| `npm run typecheck` | 0 | PASS |
| `npm test --workspace @positron/web` | 0 | PASS (349/349) |
| `npm test` | 0 | PASS (2121/2121) |
| `npm run test:e2e` | 0 | PASS (26/26) |
| `npx biome format .` | 0 | PASS |

---

## 8. Agent Verdicts

| Agent | Verdict |
|---|---|
| **EXPLORE_AGENT** | PASS |
| **ARCHITECTURE_AGENT** | PASS |
| **SECURITY_AGENT** | PASS |
| **QA_AGENT** | PASS |
| **REVIEWER_AGENT** | PASS |

---

## 9. Compliance

```text
REAL_MODE_EXECUTED:       NO
STAGE3_LIVE_EXECUTED:     NO
VISIBLE_UI_TEXT_CHANGED:  NO
API_CALLS_CHANGED:        NO
BIOME_CONFIG_CHANGED:     NO
LIST_ORDER_CHANGED:       NO
SKELETON_COUNTS_CHANGED:  NO
SECURITY_LOGIC_CHANGED:   NO
EXTERNAL_WRITE_ADDED:     NO
```

---

## 10. Remaining Backlog

The general repo-wide Biome lint still fails due to unrelated backlog (noConsoleLog, noNonNullAssertion, useLiteralKeys, etc.). This track only addressed `noArrayIndexKey`.

```text
MERGE_AUTHORIZED:         NO
ISSUE340_CLOSED:          NO
```
