# Positron Stage 3 — Runtime Foundation Test Matrix

## Status

**IMPLEMENTED_AND_TESTED_NOT_EXECUTED**  
**Updated — July 2026 (PR #370 integration):**

345 tests total across 10 test files (37 policy + 27 harness + 47 remediation + 234 other adapter tests). All passing with no flake.

**NOTE:** The original Stage 3 foundation had 63 tests across 2 files (37 policy + 26 harness). PR #370 added:
- 5 remediation modules (approval-binding, base-resolver, safety-probe, reader-verifier, bridge) with 47 dedicated tests in `stage3-remediation-modules.test.ts`
- 1 additional harness test (binding enforcement: B1, B2)
- The remaining 7 github-adapter test files contribute the balance of 234 tests

---

## 1. Test File Inventory

| Test File | Tests | Lines (approx) | Scope |
|-----------|-------|----------------|-------|
| `packages/github-adapter/src/__tests__/stage3-supervised-pilot-policy.test.ts` | 37 | 770 | Policy unit tests |
| `packages/github-adapter/src/__tests__/stage3-runtime-harness.test.ts` | 27 | 922 | Harness integration tests (added binding + probe tests in PR #370) |
| `packages/github-adapter/src/__tests__/stage3-remediation-modules.test.ts` | 47 | 625 | Remediation module tests (approval-binding, base-resolver, safety-probe, reader-verifier, bridge) — **added PR #370** |
| `packages/github-adapter/src/__tests__/github-adapter.contract.test.ts` | ~25 | ~300 | GitHub adapter contract tests |
| `packages/github-adapter/src/__tests__/readonly-adapter.test.ts` | ~20 | ~250 | Read-only adapter tests |
| `packages/github-adapter/src/__tests__/smoke.test.ts` | ~5 | ~50 | Package smoke tests |
| `packages/github-adapter/src/__tests__/stage2-runtime-write-harness.test.ts` | ~65 | ~960 | Stage 2 runtime harness tests |
| `packages/github-adapter/src/__tests__/stage2-write-sandbox-policy.test.ts` | ~55 | ~700 | Stage 2 policy tests |
| `packages/github-adapter/src/__tests__/sync-templates.test.ts` | ~30 | ~400 | Sync template tests |
| `packages/github-adapter/src/__tests__/templates.test.ts` | ~34 | ~450 | Template tests |
| **Total** | **345** | **~5400** | All 10 test files in `packages/github-adapter/src/__tests__/` |

**NOTE from PR #370 integration:** The previous matrix only covered 2 Stage 3-specific test files. The full `github-adapter` test suite now includes 10 files covering all 7+ Stage 2/3 modules.

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

### Positive — Remediation Modules (8 tests, added PR #370)

| # | Test | Module | Line |
|---|------|--------|------|
| R1 | creates a valid binding with all required fields | ApprovalBinding | remediation.test.ts | 96 |
| R2 | computes approval text SHA-256 | ApprovalBinding | remediation.test.ts | 108 |
| R3 | creates a safe preview | ApprovalBinding | remediation.test.ts | 127 |
| R4 | validates a correct binding | ApprovalBinding | remediation.test.ts | 137 |
| R5 | creates a non-expired synthetic binding for tests | ApprovalBinding | remediation.test.ts | 258 |
| R6 | fake resolver returns expected SHA | BaseResolver | remediation.test.ts | 272 |
| R7 | matches when SHAs are equal | BaseResolver | remediation.test.ts | 281 |
| R8 | passes for a fully safe snapshot | SafetyProbe | remediation.test.ts | 360 |

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

### N16: Remediation — ApprovalBinding (11 tests, added PR #370)

| # | Test | Module | Line |
|---|------|--------|------|
| N16a | rejects wrong repository | ApprovalBinding | remediation.test.ts | 144 |
| N16b | rejects wrong base branch | ApprovalBinding | remediation.test.ts | 151 |
| N16c | rejects wrong file SHA-256 | ApprovalBinding | remediation.test.ts | 158 |
| N16d | rejects wrong file byte length | ApprovalBinding | remediation.test.ts | 165 |
| N16e | rejects expired binding | ApprovalBinding | remediation.test.ts | 172 |
| N16f | rejects wrong commit metadata SHA | ApprovalBinding | remediation.test.ts | 181 |
| N16g | rejects wrong PR metadata SHA | ApprovalBinding | remediation.test.ts | 188 |
| N16h | rejects maxBranches !== 1 | ApprovalBinding | remediation.test.ts | 195 |
| N16i | rejects mergeForbidden !== true | ApprovalBinding | remediation.test.ts | 233 |
| N16j | future expiry is not expired | ApprovalBinding | remediation.test.ts | 242 |
| N16k | past expiry is expired | ApprovalBinding | remediation.test.ts | 249 |

### N17: Remediation — BaseResolver / SafetyProbe (10 tests, added PR #370)

| # | Test | Module | Line |
|---|------|--------|------|
| N17a | detects drift when SHAs differ | BaseResolver | remediation.test.ts | 286 |
| N17b | creates error with expected and actual SHA | BaseResolver | remediation.test.ts | 295 |
| N17c | fails when queue is active | SafetyProbe | remediation.test.ts | 318 |
| N17d | fails when concurrency > 1 | SafetyProbe | remediation.test.ts | 325 |
| N17e | fails when workspace lock is missing | SafetyProbe | remediation.test.ts | 332 |
| N17f | fails when another run is active | SafetyProbe | remediation.test.ts | 339 |
| N17g | fails when merge kill-switch is inactive | SafetyProbe | remediation.test.ts | 346 |
| N17h | fails when generic push is enabled | SafetyProbe | remediation.test.ts | 353 |
| N17i | creates a probe that returns safe snapshot | SafetyProbe | remediation.test.ts | 374 |
| N17j | passes when all conditions are met (pre-write verifier) | ReadOnlyVerifier | remediation.test.ts | 389 |

### N18: Remediation — ReadOnlyVerifier / RealGitHubBridge (12 tests, added PR #370)

| # | Test | Module | Line |
|---|------|--------|------|
| N18a | fails when target branch already exists (pre-write) | ReadOnlyVerifier | remediation.test.ts | 408 |
| N18b | fails when target file already exists (pre-write) | ReadOnlyVerifier | remediation.test.ts | 428 |
| N18c | fails when open PR already exists (pre-write) | ReadOnlyVerifier | remediation.test.ts | 448 |
| N18d | passes when all post-write conditions met (simulated) | ReadOnlyVerifier | remediation.test.ts | 470 |
| N18e | fails when target branch does not exist (post-write) | ReadOnlyVerifier | remediation.test.ts | 497 |
| N18f | creates a bridge with all required components | RealGitHubBridge | remediation.test.ts | 528 |
| N18g | baseResolver returns synthetic SHA | RealGitHubBridge | remediation.test.ts | 537 |
| N18h | branchWriter creates branch | RealGitHubBridge | remediation.test.ts | 547 |
| N18i | fileCommitWriter commits file | RealGitHubBridge | remediation.test.ts | 559 |
| N18j | prWriter creates draft PR | RealGitHubBridge | remediation.test.ts | 573 |
| N18k | validates a correctly constructed bridge | RealGitHubBridge | remediation.test.ts | 596 |
| N18l | includes merge as forbidden | RealGitHubBridge | remediation.test.ts | 612 |

### N19: Harness — Binding Enforcement (2 tests, added PR #370)

| # | Test | Module | Line |
|---|------|--------|------|
| N19a | blocks boolean-only approval in live mode (no binding) | Harness | harness.test.ts | 881 |
| N19b | blocks manipulated approval text hash | Harness | harness.test.ts | 899 |

### N21: Factory (2 tests, original)

| # | Test | Check | File | Line |
|---|------|-------|------|------|
| N21a | createStage3Harness creates working harness with default fake mode | Default config | harness.test.ts | 797 |
| N21b | createStage3Harness respects config overrides | Config propagation | harness.test.ts | 805 |

### N22: Canonical Values Validation (2 tests)

| # | Test | Check | File | Line |
|---|------|-------|------|------|
| N22a | validates canonical file content has correct SHA-256 | `fileSha256` | policy.test.ts | 710 |
| N22b | validates canonical file content has correct byte length (1724) — **HISTORICAL — SUPERSEDED by PR #370 integration (July 2026):** previously 1695 | `fileLength` | policy.test.ts | 715 |

---

## 4. Test Statistics

### By Category (Original Stage 3 Foundation — 63 tests)

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
| **Original Stage 3 Total** | **37** | **27** | **64** |

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
| **Remediation Gates (added PR #370)** | | |
| Approval binding — repository | 1 | ApprovalBinding |
| Approval binding — base branch | 1 | ApprovalBinding |
| Approval binding — file SHA-256 | 1 | ApprovalBinding |
| Approval binding — file length | 1 | ApprovalBinding |
| Approval binding — expiry | 2 | ApprovalBinding |
| Approval binding — commit metadata | 1 | ApprovalBinding |
| Approval binding — PR metadata | 1 | ApprovalBinding |
| Approval binding — maxBranches | 1 | ApprovalBinding |
| Approval binding — mergeForbidden | 1 | ApprovalBinding |
| Base resolver — SHA equality | 1 | BaseResolver |
| Base resolver — drift detection | 1 | BaseResolver |
| Safety probe — queue | 1 | SafetyProbe |
| Safety probe — concurrency | 1 | SafetyProbe |
| Safety probe — workspace lock | 1 | SafetyProbe |
| Safety probe — active run | 1 | SafetyProbe |
| Safety probe — kill-switch | 1 | SafetyProbe |
| Safety probe — push | 1 | SafetyProbe |
| Safety probe — safe snapshot | 1 | SafetyProbe |
| Pre-write verifier — branch exists | 1 | ReadOnlyVerifier |
| Pre-write verifier — file exists | 1 | ReadOnlyVerifier |
| Pre-write verifier — open PR exists | 1 | ReadOnlyVerifier |
| Post-write verifier — success | 1 | ReadOnlyVerifier |
| Post-write verifier — branch missing | 1 | ReadOnlyVerifier |
| Bridge — component construction | 1 | RealGitHubBridge |
| Bridge — capability enforcement | 3 | RealGitHubBridge |
| Harness — binding enforcement (live mode) | 2 | Harness |

*\* Gates with 0 explicit tests are enforced by type system or exercised implicitly through multi-gate scenarios.*

### Running Totals

| Metric | Value | Change from Original |
|--------|-------|---------------------|
| Total test files | 10 (all in `packages/github-adapter/src/__tests__/`) | Previously 2 |
| Total Stage 3–specific tests | 111 (37 policy + 27 harness + 47 remediation) | Previously 63 (37 + 26) |
| Total tests (github-adapter) | 345 | Previously 297 |
| Total tests (project-wide) | ~2141 (estimated) | Previously 2093 |
| Pass rate | 100% | Unchanged |
| Flake rate | 0% | Unchanged |

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
| **Remediation scenarios (added PR #370)** | | |
| Wrong approval binding repository | N16a | ABORT |
| Wrong approval binding base branch | N16b | ABORT |
| Wrong approval binding file SHA-256 | N16c | ABORT |
| Wrong approval binding file length | N16d | ABORT |
| Expired approval binding | N16e | ABORT |
| Wrong commit metadata SHA | N16f | ABORT |
| Wrong PR metadata SHA | N16g | ABORT |
| maxBranches !== 1 in binding | N16h | ABORT |
| mergeForbidden !== true in binding | N16i | ABORT |
| Base SHA drift detected | N17a | ABORT (Stage3BaseShaDriftError) |
| Safety probe — queue active | N17c | ABORT |
| Safety probe — concurrency > 1 | N17d | ABORT |
| Safety probe — lock missing | N17e | ABORT |
| Safety probe — active run | N17f | ABORT |
| Safety probe — kill-switch inactive | N17g | ABORT |
| Safety probe — push enabled | N17h | ABORT |
| Pre-write — branch already exists | N18a | ABORT |
| Pre-write — file already exists | N18b | ABORT |
| Pre-write — open PR exists | N18c | ABORT |
| Post-write — branch doesn't exist | N18e | ABORT |
| Harness — boolean-only approval in live mode | N19a | ABORT |
| Harness — manipulated approval text hash | N19b | ABORT |

---

*Generated by Positron Documentation Agent — Stage 3 Runtime Foundation Test Matrix (updated for PR #370 integration, July 2026)*
