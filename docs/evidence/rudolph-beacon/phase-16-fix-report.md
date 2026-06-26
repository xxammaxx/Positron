# Phase 16 — Fix Report

## Metadata
- **Timestamp**: 2026-06-25T09:30:00Z
- **Phase**: 16
- **PR**: #295
- **Scope**: GREEN_SAFE CodeRabbit advisory fixes only

---

## Fix Summary

| # | Comment ID | File | Change | Verified |
|---|-----------|------|--------|----------|
| 1 | 3471772857 | `ISSUE_279_ALIGNMENT.md:83` | "171 Tests, 28 Red Tests" → "282 Tests, 36 Red Tests" | ✅ |
| 2 | 3471772864 | `phase-11-owner-decision-package.md:12` | "Draft" → "OPEN (isDraft: false)" | ✅ |
| 3 | 3471772871 | `beacon-fixtures.ts:229` | `Date.now() - startTime` → `seededHash(seed, idsToScan.length) * 50` + removed unused `startTime` | ✅ |
| 4 | 3471772899 | `controlled-real-probe.ts:375-383` | FORBIDDEN_PATTERNS broadened to catch all `.env.*` variants + `.env.example` exception | ✅ |
| 5 | 3471990901 | `phase-13-push-report.md:23` | `` ``` `` → `` ```text `` (MD040) | ✅ |

---

## Fix Details

### Fix 1: Benchmark Counts (Docs)

**File**: `docs/benchmark/rudolph-beacon/ISSUE_279_ALIGNMENT.md`
**Change**: Line 83 — Updated benchmark test counts to match current evidence.
```diff
-| `packages/benchmark-rudolph/src/__tests__/` | 171 Tests, 28 Red Tests |
+| `packages/benchmark-rudolph/src/__tests__/` | 282 Tests, 36 Red Tests |
```
**Verification**: `npm run test:benchmark:rudolph` confirms 282 tests pass (including 36 red-negative tests). Counts match Phase 7+ evidence.

### Fix 2: PR Status (Docs)

**File**: `docs/evidence/rudolph-beacon/phase-11-owner-decision-package.md`
**Change**: Line 12 — Updated PR status to match live state.
```diff
-PR: #295 — Draft
+PR: #295 — OPEN (isDraft: false)
```
**Verification**: `gh pr view 295 --json isDraft` confirms `"isDraft":false`.

### Fix 3: Deterministic durationMs (Code)

**File**: `packages/benchmark-rudolph/src/beacon-fixtures.ts`
**Changes**:
1. Removed `const startTime = Date.now();` (line 175) — no longer needed
2. Changed `durationMs: Date.now() - startTime` → `durationMs: Math.round(seededHash(seed, idsToScan.length) * 50)`

**Rationale**: The function `simulateBeaconScan()` contract states "Same seed + same nowIso = identical result". `Date.now()` violates this contract. The fix uses `seededHash()` which is already used for deterministic battery/rssi variation, ensuring fully deterministic output.

**Verification**: `Red Test 6 — Deterministic scan: same seed = identical result` passes (282/282 all benchmark tests pass).

### Fix 4: Broaden FORBIDDEN_PATTERNS (Code)

**File**: `packages/benchmark-rudolph/src/controlled-real-probe.ts`
**Changes**:
1. Changed regex from `/\.env$/`, `/\.env\.local$/` → `/(^|\/)\.env(\.[^/]+)?$/`
2. Added `.env.example` exception in `checkCommitReadiness()`
3. Updated comment to document the change

**Rationale**: The original denylist only caught exact `.env` and `.env.local` files. Common variants like `.env.production`, `.env.test`, `.env.staging` would pass through. The broader regex catches all `.env.*` variants while explicitly allowing `.env.example` (which is committed in this repo).

**Verification**: `Red Test 36 — Commit-readiness rejects build/secret artifacts` passes (282/282 all benchmark tests pass). Manual test: `.env.example` is explicitly allowed, `.env.production` would be blocked.

### Fix 5: MD040 Language Tag (Docs)

**File**: `docs/evidence/rudolph-beacon/phase-13-push-report.md`
**Change**: Line 23 — Added `text` language identifier to fenced code block.
```diff
-```
+```text
 9b4f488 fix(issue-279): format safe apply plan test for CodeRabbit
 ```
```
**Verification**: markdownlint MD040 satisfied. No content change.

---

## NOT FIXED — YELLOW_REVIEW (3 items)

| # | Comment ID | File | Reason |
|---|-----------|------|--------|
| 6 | 3471772867 | `phase-6-commit-audit.md` | Historical evidence document; re-computing counts from Phase 6 commits requires forensic validation |
| 7 | 3471772869 | `phase-8-owner-approval-options.md` | Touches approval/safety semantics (env var requirements) |
| 8 | 3471772893 | `controlled-real-probe.ts:310` | Design decision: YELLOW vs BLOCKED for schema validation failures |

These require Owner review and are documented in the CodeRabbit audit.

---

## Test Verification

| Test Suite | Result |
|------------|--------|
| `npm run test:benchmark:rudolph` | 282/282 PASS ✅ |
| `Red Test 6 — Deterministic scan` | PASS ✅ |
| `Red Test 36 — Commit-readiness` | PASS ✅ |
| All 7 benchmark test files | PASS ✅ |

Full `npm test` to follow in Phase 16 gates.

---

## Classification

```text
FIX_STATUS: 5_FIXED_3_OWNER_REVIEW
```
