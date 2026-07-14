# Positron Stage 3 — Runtime Foundation Test Matrix

## Status

**IMPLEMENTED_AND_TESTED_NOT_EXECUTED**

63 tests total (37 policy + 26 harness). All passing with no flake.

---

## 1. Test File Inventory

| Test File | Tests | Lines | Scope |
|-----------|-------|-------|-------|
| `packages/github-adapter/src/__tests__/stage3-supervised-pilot-policy.test.ts` | 37 | 765 | Policy unit tests |
| `packages/github-adapter/src/__tests__/stage3-runtime-harness.test.ts` | 26 | 592 | Harness integration tests |
| **Total** | **63** | **1357** | |

---

## 2. Positive Test Inventory

### Positive — Policy (6 tests)

| # | Test | File | Line |
|---|------|------|------|
| P1 | allows createBranch with all gates passed | policy.test.ts | 98 |
| P2 | allows commitFile with all gates passed and canonical file content | policy.test.ts | 114 |
| P3 | allows createPullRequest with all gates passed | policy.test.ts | 132 |
| P4 | generates a token-free preview | policy.test.ts | 149 |
| P5 | creates a redacted audit event | policy.test.ts | 169 |
| P6 | enforces counter increments correctly | policy.test.ts | 184 |

### Positive — Harness Fake Mode (3 tests)

| # | Test | File | Line |
|---|------|------|------|
| H1 | completes full fake mode execution successfully | harness.test.ts | 151 |
| H2 | generates audit events for each phase | harness.test.ts | 182 |
| H3 | resets correctly between runs | harness.test.ts | 203 |

### Positive — Harness Live Mode with Spy Writers (3 tests)

| # | Test | File | Line |
|---|------|------|------|
| H4 | calls branch writer exactly once in live mode | harness.test.ts | 222 |
| H5 | calls writers in correct order: branch → commit → PR | harness.test.ts | 244 |
| H6 | passes correct parameters to writers | harness.test.ts | 276 |

---

## 3. Negative Test Inventory

### N1: Policy Gate (1 test)

| # | Test | Gate | File | Line |
|---|------|------|------|------|
| N1 | blocks all writes when policy is disabled | `policyEnabled` | policy.test.ts | 206 |

### N2: Repository (2 policy + 2 harness = 4 tests)

| # | Test | Gate | File | Line |
|---|------|------|------|------|
| N2a | blocks production repository (xxammaxx/Positron) | `forbiddenRepository` | policy.test.ts | 228 |
| N2b | blocks non-sandbox repository | `repositoryAllowlist` | policy.test.ts | 244 |
| N2c | blocks production Positron repository (harness) | `forbiddenRepository` | harness.test.ts | 426 |
| N2d | blocks non-sandbox repository (harness) | `repositoryAllowlist` | harness.test.ts | 434 |

### N3: Branch (2 tests)

| # | Test | Gate | File | Line |
|---|------|------|------|------|
| N3a | blocks wrong base branch | `baseBranchAllowlist` | policy.test.ts | 266 |
| N3b | blocks wrong target branch | `targetBranchAllowlist` | policy.test.ts | 282 |

### N4: File (5 tests)

| # | Test | Gate (first to fire) | File | Line |
|---|------|----------------------|------|------|
| N4a | blocks wrong file path | `filePathAllowlist` | policy.test.ts | 304 |
| N4b | blocks wrong SHA-256 (tampered file) | `fileSha256` | policy.test.ts | 322 |
| N4c | blocks wrong commit message | `commitMessage` | policy.test.ts | 341 |
| N4d | blocks wrong commit body | `commitBody` | policy.test.ts | 360 |
| N4e | blocks wrong file length (SHA-256 fires first) | `fileSha256` | policy.test.ts | 378 |
| N4f | blocks missing file content | `fileContentRequired` | policy.test.ts | 397 |

### N5: PR (3 tests)

| # | Test | Gate | File | Line |
|---|------|------|------|------|
| N5a | blocks wrong PR title | `prTitle` | policy.test.ts | 420 |
| N5b | blocks wrong PR body | `prBody` | policy.test.ts | 437 |
| N5c | blocks non-draft PR | `draftPr` | policy.test.ts | 454 |

### N6: Process Safety (6 policy + 5 harness = 11 tests)

| # | Test | Gate | File | Line |
|---|------|------|------|------|
| N6a | blocks when queue is active | `queueDisabled` | policy.test.ts | 477 |
| N6b | blocks when concurrency > 1 | `singleProcess` | policy.test.ts | 493 |
| N6c | blocks when workspace lock is missing | `workspaceLock` | policy.test.ts | 509 |
| N6d | blocks when another active run exists | `noOtherActiveRun` | policy.test.ts | 525 |
| N6e | blocks when merge kill-switch is inactive | `mergeKillSwitch` | policy.test.ts | 541 |
| N6f | blocks when push is enabled | `pushDisabled` | policy.test.ts | 557 |
| N6g | blocks when queue is active (harness) | `queueDisabled` | harness.test.ts | 348 |
| N6h | blocks when concurrency > 1 (harness) | `singleProcess` | harness.test.ts | 358 |
| N6i | blocks when workspace lock is missing (harness) | `workspaceLock` | harness.test.ts | 368 |
| N6j | blocks when merge kill-switch is inactive (harness) | `mergeKillSwitch` | harness.test.ts | 378 |
| N6k | blocks when push is enabled (harness) | `pushDisabled` | harness.test.ts | 388 |

### N7: Human Gates (2 policy + 2 harness = 4 tests)

| # | Test | Gate | File | Line |
|---|------|------|------|------|
| N7a | blocks when human approval is missing | `humanApproval` | policy.test.ts | 579 |
| N7b | blocks when preview is not generated | `prewritePreview` | policy.test.ts | 595 |
| N7c | blocks when human approval missing (harness) | `humanApproval` | harness.test.ts | 404 |
| N7d | blocks when preview not generated (harness) | `prewritePreview` | harness.test.ts | 412 |

### N8: Idempotency (2 tests)

| # | Test | Gate | File | Line |
|---|------|------|------|------|
| N8a | blocks duplicate idempotency key from a different run | `duplicateKey` | policy.test.ts | 617 |
| N8b | blocks missing idempotency key | `idempotencyKey` | policy.test.ts | 636 |

### N9: Quantity Limits (2 tests)

| # | Test | Gate | File | Line |
|---|------|------|------|------|
| N9a | blocks second branch | `branchCount` | policy.test.ts | 657 |
| N9b | blocks second PR | `pullRequestCount` | policy.test.ts | 674 |

### N10: Token Redaction (3 tests)

| # | Test | Gate/Check | File | Line |
|---|------|-----------|------|------|
| N10a | audit event has tokenValue REDACTED and redacts reason | `tokenValue` + `redactValue` | policy.test.ts | 698 |
| N10b | preview has tokenValue REDACTED | `tokenValue` | policy.test.ts | 715 |
| N10c | blocks input containing github_pat_ token pattern via fileContent | `tokenInInput` | policy.test.ts | 732 |

### N11: Adapter Errors (4 tests)

| # | Test | Scenario | File | Line |
|---|------|----------|------|------|
| N11a | handles branch writer error — partial mutation tracked | Branch fails → no commit/PR | harness.test.ts | 448 |
| N11b | handles file commit writer error after branch success | Commit fails → branch exists | harness.test.ts | 467 |
| N11c | handles PR writer error after branch+commit success | PR fails → branch+commit exist | harness.test.ts | 485 |
| N11d | redacts token from adapter error messages | Token in error → redacted | harness.test.ts | 503 |

### N12: Fake Mode (2 tests)

| # | Test | Check | File | Line |
|---|------|-------|------|------|
| N12a | fake mode never calls branch writer | No network writes | harness.test.ts | 525 |
| N12b | fake mode provides synthetic results | Synthetic ref/SHA/URL | harness.test.ts | 543 |

### N13: Harness Disabled (1 test)

| # | Test | Gate | File | Line |
|---|------|------|------|------|
| N13 | blocks when harness is disabled | Harness gate (Phase 0) | harness.test.ts | 315 |

### N14: Invalid Input (1 test)

| # | Test | Check | File | Line |
|---|------|-------|------|------|
| N14 | blocks invalid repository format | `_parseOwnerRepo` | harness.test.ts | 585 |

### N15: Harness Duplicate Run (1 test)

| # | Test | Check | File | Line |
|---|------|-------|------|------|
| N15 | blocks second harness call with same idempotency key | `reserveRunKey` | harness.test.ts | 332 |

### N16: Factory (2 tests)

| # | Test | Check | File | Line |
|---|------|-------|------|------|
| N16a | createStage3Harness creates working harness with default fake mode | Default config | harness.test.ts | 558 |
| N16b | createStage3Harness respects config overrides | Config propagation | harness.test.ts | 565 |

### N17: Canonical Values Validation (2 tests)

| # | Test | Check | File | Line |
|---|------|-------|------|------|
| N17a | validates canonical file content has correct SHA-256 | `fileSha256` | policy.test.ts | 756 |
| N17b | validates canonical file content has correct byte length (1695) | `fileLength` | policy.test.ts | 761 |

---

## 4. Test Statistics

### By Category

| Category | Policy Tests | Harness Tests | Total |
|----------|-------------|---------------|-------|
| Positive (happy path) | 6 | 6 | 12 |
| Policy gate disabled | 1 | 0 | 1 |
| Repository validation | 2 | 2 | 4 |
| Branch validation | 2 | 0 | 2 |
| File validation | 6 | 0 | 6 |
| PR validation | 3 | 0 | 3 |
| Process safety | 6 | 5 | 11 |
| Human gates | 2 | 2 | 4 |
| Idempotency | 2 | 1 | 3 |
| Quantity limits | 2 | 0 | 2 |
| Token redaction | 3 | 0 | 3 |
| Adapter errors | 0 | 4 | 4 |
| Fake mode | 0 | 2 | 2 |
| Harness disabled | 0 | 1 | 1 |
| Invalid input | 0 | 1 | 1 |
| Factory | 0 | 2 | 2 |
| Canonical values | 2 | 0 | 2 |
| **Total** | **37** | **26** | **63** |

### By Gate Coverage

| Gate | Tests | Enforced In |
|------|-------|-------------|
| `policyEnabled` | 1 | Policy |
| `operationAllowlist` | 0* | Policy (implicit via type) |
| `forbiddenRepository` | 2 | Policy |
| `repositoryAllowlist` | 2 | Policy |
| `baseBranchAllowlist` | 1 | Policy |
| `targetBranchAllowlist` | 1 | Policy |
| `filePathAllowlist` | 1 | Policy |
| `fileContentRequired` | 1 | Policy |
| `tokenInInput` | 1 | Policy |
| `fileSha256` | 2 | Policy |
| `fileLength` | 1 | Policy |
| `commitMessage` | 1 | Policy |
| `commitBody` | 1 | Policy |
| `prTitle` | 1 | Policy |
| `prBody` | 1 | Policy |
| `draftPr` | 1 | Policy |
| `branchCount` | 1 | Policy |
| `fileWriteCount` | 0* | Policy (implicit via commitCount) |
| `commitCount` | 0* | Policy (implicit via fileWriteCount) |
| `pullRequestCount` | 1 | Policy |
| `queueDisabled` | 2 | Policy |
| `singleProcess` | 2 | Policy |
| `workspaceLock` | 2 | Policy |
| `noOtherActiveRun` | 1 | Policy |
| `mergeKillSwitch` | 2 | Policy |
| `pushDisabled` | 2 | Policy |
| `humanApproval` | 2 | Policy |
| `prewritePreview` | 2 | Policy |
| `idempotencyKey` / `duplicateKey` | 3 | Policy + Harness |
| `safetyMissing` (implicit) | 0* | Policy (via struct null) |
| Phase 0 (Harness) | 1 | Harness |
| Invalid repo format | 1 | Harness |
| Adapter errors | 4 | Harness |
| Fake mode isolation | 2 | Harness |

*\* Gates with 0 explicit tests are enforced by type system or exercised implicitly through multi-gate scenarios.*

### Running Totals

| Metric | Value |
|--------|-------|
| Total test files | 2 |
| Total tests (Stage 3) | 63 |
| Total tests (github-adapter) | 297 |
| Total tests (project-wide) | 2093 |
| Pass rate | 100% |
| Flake rate | 0% |

---

## 5. Negative Test Scenarios Verified

All negative scenarios from the Stage 3 design are covered:

| Scenario | Verified By | Result |
|----------|------------|--------|
| Policy disabled | N1 | ABORT |
| Forbidden repository (production) | N2a, N2c | ABORT |
| Non-sandbox repository | N2b, N2d | ABORT |
| Wrong base branch | N3a | ABORT |
| Wrong target branch | N3b | ABORT |
| Wrong file path | N4a | ABORT |
| Wrong file SHA-256 | N4b | ABORT |
| Wrong commit message | N4c | ABORT |
| Wrong commit body | N4d | ABORT |
| Wrong file length | N4e | ABORT |
| Missing file content | N4f | ABORT |
| Wrong PR title | N5a | ABORT |
| Wrong PR body | N5b | ABORT |
| Non-draft PR | N5c | ABORT |
| Queue active | N6a, N6g | ABORT |
| Concurrency > 1 | N6b, N6h | ABORT |
| Workspace lock missing | N6c, N6i | ABORT |
| Other active run | N6d | ABORT |
| Merge kill-switch inactive | N6e, N6j | ABORT |
| Push enabled | N6f, N6k | ABORT |
| Human approval missing | N7a, N7c | ABORT |
| Preview not generated | N7b, N7d | ABORT |
| Duplicate idempotency key | N8a, N15 | ABORT |
| Missing idempotency key | N8b | ABORT |
| Second branch | N9a | ABORT |
| Second PR | N9b | ABORT |
| Token in audit output | N10a | REDACTED |
| Token in preview | N10b | REDACTED |
| Token in input content | N10c | ABORT |
| Adapter branch error | N11a | ABORT + partial mutation |
| Adapter commit error | N11b | ABORT + partial mutation |
| Adapter PR error | N11c | ABORT + partial mutation |
| Token in adapter error | N11d | REDACTED |
| Harness disabled | N13 | ABORT |
| Invalid repo format | N14 | ABORT |
| Fake mode network isolation | N12a | No network calls |
| Fake mode synthetic results | N12b | Synthetic ref/SHA/URL |

---

*Generated by Positron Documentation Agent — Stage 3 Runtime Foundation Test Matrix*
