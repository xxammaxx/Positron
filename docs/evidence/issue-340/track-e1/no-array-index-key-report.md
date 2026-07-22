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
| **IMPLEMENTATION_HEAD** | `67064a85e76f4998d3d5e983cf96e745d8a543df` (uncommitted changes on top) |
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
| 6 | `apps/web/src/__tests__/track-e1-no-array-index-key.test.tsx` | +408: 19 focused tests covering helper correctness, rendering integrity, and skeleton counts |
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
# Result: 0 diagnostics
```

---

## 6. Tests

| Test Suite | Tests | Passed | Failed |
|---|---|---|---|
| **Focused E1 tests** | 19 | 19 | 0 |
| **Web tests** (`@positron/web`) | 349 | 349 | 0 |
| **Full repo tests** | 2121 | 2121 | 0 |

Test categories covered:
- `createStableTextItems`: unique keys, value preservation, order, duplicates, reorder stability, determinism, triple duplicates, empty, frozen input
- `ProjectsPage` rendering: no duplicate-key warnings, both duplicate blockers rendered, both duplicate runs rendered, order preservation
- Skeleton rendering: 5 sites (4 rows RecentActivity, 4 cards StatusSummary, table 4 rows, text 5 rows, RunsPage 8 rows)

---

## 7. Gates

| Gate | Exit | Result |
|---|---|---|
| `git diff --check` | 0 | PASS |
| `npm run build` | 0 | PASS |
| `npm run typecheck` | 0 | PASS |
| `npm test --workspace @positron/web` | 0 | PASS (349/349) |
| `npm test` | 0 | PASS (2121/2121) |
| `npm run test:e2e` | 0 | PASS (26 passed) |

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
