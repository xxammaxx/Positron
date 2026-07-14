# Positron Stage 3 — Runtime Foundation Implementation

## Status

**IMPLEMENTED_AND_TESTED_NOT_EXECUTED**

- Implementation complete: Stage 3 Policy + Harness with 19+ validation gates.
- 63 new tests passing (37 policy + 26 harness).
- Fake mode operational; live path wired via spy writers.
- No real GitHub token used; no sandbox branch created.

---

## 1. Architecture: 3-Layer Pattern with Dependency Injection

```
┌──────────────────────────────────────────────────────────────────┐
│                  Stage3RuntimeHarness                            │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  Orchestrator (11 phases)                                  │  │
│  │  • Preflight → Policy → Preview → Audit → Branch →        │  │
│  │    Commit → PR → Verify → Success                          │  │
│  └────────────────────────────────────────────────────────────┘  │
│                        │ injects                                 │
│                        ▼                                         │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  Stage3SupervisedPilotPolicy                               │  │
│  │  • 19+ validation gates                                    │  │
│  │  • Pure validation — NO writes                             │  │
│  │  • State tracking (counters, idempotency)                  │  │
│  └────────────────────────────────────────────────────────────┘  │
│                        │ calls via DI                            │
│                        ▼                                         │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  3 Narrow Writer Interfaces                                │  │
│  │  • Stage3BranchWriter     (createBranch)                   │  │
│  │  • Stage3FileCommitWriter (commitFile)                     │  │
│  │  • Stage3PullRequestWriter (createPullRequest)             │  │
│  └────────────────────────────────────────────────────────────┘  │
│                        │ writes to                               │
│                        ▼                                         │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  Stage3AuditSink (optional)                                │  │
│  └────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

**Key design decisions:**

- **Layer 1 (Policy)**: Pure validation — no side effects, no tokens, no I/O.
- **Layer 2 (Harness)**: Multi-phase orchestrator — connects policy to writers, manages state, handles partial failures.
- **Layer 3 (Writers)**: Narrow interfaces injected via constructor — enables testing with spies/adapters.

---

## 2. Component Inventory

| Component | File Path | Lines | Purpose |
|-----------|-----------|-------|---------|
| `Stage3SupervisedPilotPolicy` | `packages/github-adapter/src/stage3-supervised-pilot-policy.ts` | 795 | Policy validation with 19+ gates |
| `Stage3RuntimeHarness` | `packages/github-adapter/src/stage3-runtime-harness.ts` | 722 | Multi-phase orchestrator |
| Policy Test Suite | `packages/github-adapter/src/__tests__/stage3-supervised-pilot-policy.test.ts` | 765 | 37 tests for policy |
| Harness Test Suite | `packages/github-adapter/src/__tests__/stage3-runtime-harness.test.ts` | 592 | 26 tests for harness |

---

## 3. Gate Inventory (19+ Gates)

All gates are enforced by `Stage3SupervisedPilotPolicy.validate()`.

### Policy Gates (Gates 0–1)

| # | Gate Name | Description | Fail Message |
|---|-----------|-------------|-------------|
| 0 | `policyEnabled` | Policy must be enabled. All writes blocked when disabled. | `Stage 3 policy is not enabled` |
| 1 | `operationAllowlist` | Only `createBranch`, `commitFile`, `createPullRequest` allowed. | `Operation '...' is not allowed in Stage 3` |

### Repository Gates (Gates 2–3)

| # | Gate Name | Description | Fail Message |
|---|-----------|-------------|-------------|
| 2 | `forbiddenRepository` | `xxammaxx/Positron` unconditionally forbidden. Checked **before** allowlist. | `Repository '...' is unconditionally forbidden` |
| 3 | `repositoryAllowlist` | Only `xxammaxx/positron-sandbox` is allowed. | `Repository '...' is not allowlisted` |

### Branch Gates (Gates 4–5, for `createBranch`)

| # | Gate Name | Description | Fail Message |
|---|-----------|-------------|-------------|
| 4 | `baseBranchRequired` / `baseBranchAllowlist` | Only `main` is allowed as base. | `Base branch '...' is not allowlisted` |
| 5 | `targetBranchRequired` / `targetBranchAllowlist` | Only `positron/issue-308-stage3-pilot` allowed. | `Target branch '...' is not allowlisted` |

### File Gates (Gates 6–11, for `commitFile`)

| # | Gate Name | Description | Fail Message |
|---|-----------|-------------|-------------|
| 6 | `filePathRequired` / `filePathAllowlist` | Only `stage3/positron-supervised-pilot.md` allowed. | `File path '...' is not allowlisted` |
| 7 | `fileContentRequired` | File content must be provided. | `File content not provided` |
| 7b | `tokenInInput` | Token patterns detected in input → rejected before hash/length check. | `Raw token pattern detected in input` |
| 8 | `fileSha256` | SHA-256 must match `0a97795f...`. Checked **before** length. | `SHA-256 mismatch` |
| 9 | `fileLength` | UTF-8 byte length must be 1695. Checked after SHA-256. | `File length ... ≠ expected 1695` |
| 10 | `commitMessage` | Must match `feat(issue-308): stage 3 supervised real mode pilot`. | `Commit message mismatch` |
| 11 | `commitBody` | Must match the canonical commit body with SHA-256 binding. | `Commit body mismatch` |

### PR Gates (Gates 12–14, for `createPullRequest`)

| # | Gate Name | Description | Fail Message |
|---|-----------|-------------|-------------|
| 12 | `prTitleRequired` / `prTitle` | Must match canonical PR title. | `PR title mismatch` |
| 13 | `prBody` | Must match canonical PR body. | `PR body mismatch` |
| 14 | `draftPr` | PR must be created as Draft. | `PR draft flag not set` |

### Quantity Limits (Gate 15, per operation)

| # | Gate Name | Limit | Fail Message |
|---|-----------|-------|-------------|
| 15a | `branchCount` | Max 1 branch per run | `Max branches per run (1) already reached` |
| 15b | `fileWriteCount` | Max 1 file write per run | `Max file writes per run (1) already reached` |
| 15c | `commitCount` | Max 1 commit per run | `Max commits per run (1) already reached` |
| 15d | `pullRequestCount` | Max 1 PR per run | `Max PRs per run (1) already reached` |

### Process Safety Gates (Gate 16)

| # | Gate Name | Requirement | Fail Message |
|---|-----------|-------------|-------------|
| 16a | `queueDisabled` | `POSITRON_DISABLE_QUEUE=true` | `Queue is active — must be disabled` |
| 16b | `singleProcess` | `maxConcurrency=1` | `Concurrency > 1 detected` |
| 16c | `workspaceLock` | Workspace lock acquired | `Workspace lock not acquired` |
| 16d | `noOtherActiveRun` | No other run active | `Another run is active` |
| 16e | `mergeKillSwitch` | `POSITRON_MERGE_KILL_SWITCH=true` | `POSITRON_MERGE_KILL_SWITCH is not active` |
| 16f | `pushDisabled` | `POSITRON_ENABLE_PUSH=false` | `POSITRON_ENABLE_PUSH is true` |

### Human Gates (Gates 17–18)

| # | Gate Name | Requirement | Fail Message |
|---|-----------|-------------|-------------|
| 17 | `humanApproval` | Owner approval must be granted | `Human approval is required` |
| 18 | `prewritePreview` | Preview must be generated before writes | `Preview not generated` |

### Idempotency Gate (Gate 19)

| # | Gate Name | Description | Fail Message |
|---|-----------|-------------|-------------|
| 19 | `idempotencyKey` / `duplicateKey` | Key required; duplicate from different run blocked | `Idempotency key not provided` / `Duplicate idempotency key detected` |

---

## 4. Writer Interface Contracts

### Stage3BranchWriter

```typescript
interface Stage3BranchWriter {
  createBranch(input: {
    owner: string;
    repo: string;
    branch: string;
    fromBranch: string;
  }): Promise<{ ref: string; sha: string }>;
}
```

### Stage3FileCommitWriter

```typescript
interface Stage3FileCommitWriter {
  commitFile(input: {
    owner: string;
    repo: string;
    branch: string;
    filePath: string;
    content: string;
    message: string;
    commitBody?: string;
  }): Promise<{ sha: string; url: string }>;
}
```

### Stage3PullRequestWriter

```typescript
interface Stage3PullRequestWriter {
  createPullRequest(input: {
    owner: string;
    repo: string;
    title: string;
    head: string;
    base: string;
    body: string;
    draft: boolean;
  }): Promise<{
    id?: number;
    number?: number;
    url?: string;
    createdAt?: string;
    draft?: boolean;
  }>;
}
```

**Design constraints:**
- All three interfaces are **narrow** — minimum parameters needed for each operation.
- All return structured results — no raw API objects, no tokens.
- Tested with spy implementations in 6 positive live-mode harness tests.

---

## 5. Execution Flow (11-Phase Sequence)

The `Stage3RuntimeHarness.execute()` method implements exactly 11 phases:

```
Phase  0:  Harness gate (enabled check)
Phase 0a:  Idempotency key reservation (reserveRunKey)
Phase 0b:  Owner/repo parsing
Phase  1:  Preflight (set current phase)
Phase  2:  Policy Validation — createBranch
Phase  3:  Preview Generation (token-free)
Phase  4:  Audit Pre-Write
Phase  5:  Branch Creation (fake or live)
Phase  6:  Policy Validation — commitFile
Phase  7:  File Commit (fake or live)
Phase  8:  Policy Validation — createPullRequest
Phase  9:  Draft PR Creation (fake or live)
Phase 10:  Read-only Verification (simulated in fake mode)
Phase 11:  Audit Success / Failure
```

**Partial failure handling:**
- If branch creation fails → no commit, no PR (partialMutation=true)
- If commit fails after branch → branch exists but no PR (partialMutation=true)
- If PR fails after commit → branch + commit exist but no PR (partialMutation=true)
- No auto-retry, no false success, no continuing to next phase.

---

## 6. Canonical Values Binding

All values from `docs/evidence/issue-308/stage3-supervised-pilot-approval-package.md` are bound in `STAGE3_CANONICAL` and `STAGE3_DEFAULT_CONFIG`.

| Canonical Field | Value | Source |
|----------------|-------|--------|
| Repository | `xxammaxx/positron-sandbox` | Approval Package §1 |
| Base Branch | `main` | Approval Package §2 |
| Target Branch | `positron/issue-308-stage3-pilot` | Approval Package §2 |
| File Path | `stage3/positron-supervised-pilot.md` | Approval Package §3 |
| File SHA-256 | `0a97795fdc21740548b4d02cc4b0dd0538afa0d2917390c84671a94b3089c823` | Approval Package §3 |
| File Length | 1695 bytes (UTF-8) | Approval Package §3 (code-aligns to 1695) |
| Commit Message | `feat(issue-308): stage 3 supervised real mode pilot` | Approval Package §4 |
| Commit Body | Multi-line body with sandbox marker description | Approval Package §4 |
| PR Title | `feat(issue-308): Stage 3 supervised real mode pilot — sandbox marker` | Approval Package §5 |
| PR Body | Full canonical body with file SHA-256 binding | Approval Package §5 |
| Forbidden Repository | `xxammaxx/Positron` | Approval Package §1 |
| Draft Required | `true` | Approval Package §5 |

---

## 7. Process Safety Model (7 Gates)

All seven process safety conditions are validated as a single `Stage3ProcessSafety` struct passed to the policy:

```typescript
interface Stage3ProcessSafety {
  queueDisabled: boolean;
  singleProcess: boolean;
  workspaceLockAcquired: boolean;
  noOtherActiveRun: boolean;
  mergeKillSwitchActive: boolean;
  pushDisabled: boolean;
  // safetyMissing (implicit — if struct is null, gate 16 fails)
}
```

| Gate | Env/State | Fails if |
|------|-----------|----------|
| Queue disabled | `POSITRON_DISABLE_QUEUE=true` | queueDisabled=false |
| Single process | `maxConcurrency=1` | singleProcess=false |
| Workspace lock | Process-scoped lock acquired | workspaceLockAcquired=false |
| No other active run | No concurrent Stage 3 runs | noOtherActiveRun=false |
| Merge kill-switch | `POSITRON_MERGE_KILL_SWITCH=true` | mergeKillSwitchActive=false |
| Push disabled | `POSITRON_ENABLE_PUSH=false` | pushDisabled=false |
| Safety struct missing | Input validation | processSafety=null |

---

## 8. Quantity Model (4 Limits)

All four quantity limits are enforced per-run (per idempotency key):

| Quantity | Max | Tracking |
|----------|-----|----------|
| Branches | 1 | `branchCount` counter |
| Files written | 1 | `fileWriteCount` counter |
| Commits | 1 | `commitCount` counter (increments with fileWriteCount) |
| Pull Requests | 1 | `pullRequestCount` counter |

---

## 9. Idempotency Model

- **Reservation**: `reserveRunKey()` reserves a key for a multi-phase run.
- **Reuse**: Same key reused across all 3 policy validations in one run is allowed.
- **Blocking**: Key already used by a **different run** → blocked with `duplicateKey` gate.
- **Missing key**: Required — missing key → blocked with `idempotencyKey` gate.
- **Reset**: `policy.reset()` clears all keys; tested with harness reset between runs.

---

## 10. Token Lifecycle

- **NEVER** stored in policy or harness.
- **REDACTED** in all outputs: `tokenValue: 'REDACTED'` in Preview and AuditEvent.
- **Redacted in error messages**: `redactValue()` from `@positron/shared` strips `ghp_` and `github_pat_` patterns.
- **Token detection in input**: `_containsTokenPattern()` rejects file content containing token patterns before hash/length checks (Gate 7b).

---

## 11. Evidence References

- **Approval Package**: `docs/evidence/issue-308/stage3-supervised-pilot-approval-package.md`
- **Policy Source**: `packages/github-adapter/src/stage3-supervised-pilot-policy.ts` (795 lines)
- **Harness Source**: `packages/github-adapter/src/stage3-runtime-harness.ts` (722 lines)
- **Policy Tests**: `packages/github-adapter/src/__tests__/stage3-supervised-pilot-policy.test.ts` (765 lines, 37 tests)
- **Harness Tests**: `packages/github-adapter/src/__tests__/stage3-runtime-harness.test.ts` (592 lines, 26 tests)
- **Test Matrix**: `docs/evidence/issue-308/stage3-runtime-foundation-test-matrix.md`

---

*Generated by Positron Documentation Agent — Stage 3 Runtime Foundation Implementation*
