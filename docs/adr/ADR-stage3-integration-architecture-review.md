# ADR: Stage 3 Integration Architecture Review — PR #370

## Status

**Accepted** — July 2026  
Supersedes: `ADR-stage3-remediation-design.md` (implementation review findings)

## Verdict

**PASS_WITH_NOTES** (4.5/5)

The Stage 3 integration is architecturally sound, fail-closed at every gate, and demonstrates defense-in-depth through layered security checks. Two findings (F3, F4) warrant attention before live execution but are not blockers for the current build iteration.

---

## Review Scope

Primary source files in `packages/github-adapter/src/`:

| File | Role | Lines |
|------|------|-------|
| `stage3-runtime-harness.ts` | Multi-phase orchestrator with 3 writer interfaces | 1708 |
| `stage3-approval-binding.ts` | Cryptographic approval binding with SHA-256 chaining | 386 |
| `stage3-base-resolver.ts` | TOCTOU-safe base SHA resolver | 104 |
| `stage3-runtime-safety-probe.ts` | Trusted runtime safety inspection | 177 |
| `stage3-reader-verifier.ts` | Pre-write and post-write read-only verification | 406 |
| `stage3-real-github-bridge.ts` | Restricted GitHub bridge with capability allow/deny lists | 370 |
| `stage3-supervised-pilot-policy.ts` | 20+ gate validation gatekeeper | 869 |
| `stage3-canonical-manifest.ts` | Single source of truth for all Stage 3 values | 228 |

Test suite: **27 tests, all passing** (`stage3-runtime-harness.test.ts`)

---

## 1. Dependency Chain Analysis

### Complete Execution Chain (Live Mode)

```
Phase 0:  Harness-Gate (`this.config.enabled`)                   → BLOCK if disabled
Phase 0a: Idempotency Key Reservation                             → BLOCK if duplicate
Phase 0b: Repository Format Parse (`owner/repo`)                  → BLOCK if invalid
Phase 1a-i:  Mock Bridge Rejection (`bridge.kind !== 'mock'`)    → BLOCK if mock in live
Phase 1a-ii: Approval Text Re-Hashing                             → BLOCK if SHA mismatch
Phase 1a-ii-b: Approval Binding Validation (12+ fields)           → BLOCK if any mismatch
Phase 1a-iii: Runtime Safety Probe (`probe.inspect()`)           → BLOCK if unsafe
Phase 1a-iv: Base SHA Resolution (`checkBaseDrift()`)            → BLOCK if drift
Phase 2:  Policy Validation (createBranch, 20+ gates)             → BLOCK if denied
Phase 3:  Preview Generation                                       → (non-blocking)
Phase 4:  Audit Pre-Write (sink.record)                            → BLOCK if sink fails
Phase 4a: Pre-Write Verification (`verifyPreWrite`, 5 checks)     → BLOCK if failed
Phase 5:  Branch Creation (`branchWriter.createBranch`)           → BLOCK if error
Phase 6:  Policy Validation (commitFile)                           → BLOCK if denied
Phase 7:  File Commit (`fileCommitWriter.commitFile`)             → BLOCK if error
Phase 8:  Policy Validation (createPullRequest)                    → BLOCK if denied
Phase 9:  Draft PR Creation (`pullRequestWriter.createPullRequest`) → BLOCK if error
Phase 10: Post-Write Verification (`verifyPostWrite`, 12 checks)  → BLOCK if failed
Phase 11: Audit Success (final sink.record)                        → BLOCK if sink fails
```

### Verdict: NO STEP IS SKIPPABLE

Every gate failure returns `success: false` immediately. Execution never continues past a failed gate. The only exception is `Phase 3: Preview Generation`, which is informational — it computes the preview regardless but the preview itself doesn't gate execution.

**Partial mutation tracking**: If a write phase succeeds but a subsequent phase fails, the result includes `partialMutation: true` and `currentPhase` indicating where execution stopped. This correctly documents the residual state without claiming success.

---

## 2. No Parallel Write Path

### Can writes occur outside the harness?

| Path | Exists? | Can it perform full Stage 3 sequence? |
|------|---------|--------------------------------------|
| `RealGitHubAdapter.createPullRequest()` | YES (public API) | NO — no `createBranch()` or `commitFile()` on `RealGitHubAdapter` |
| `RealGitHubAdapter.mergePullRequest()` | YES (public API) | NO — merge is forbidden in Stage 3, and no branch/commit methods exist |
| `Stage3RealGitHubBridge` (live factory) | NOT exported from `index.ts` | N/A — cannot be imported |
| `Stage3RuntimeHarness.execute()` | YES (public API, exported) | YES — the ONLY path |

**Key findings:**

1. **`RealGitHubAdapter` lacks `createBranch()` and `commitFile()`**. The grep confirmed only `createPullRequest` (line 281) and `mergePullRequest` (line 431). There is no way to create branches or commit files through the general adapter interface.

2. **`createStage3RealGitHubBridge` is NOT exported from `index.ts`**. Only `createMockStage3Bridge` and `verifyBridgeCapabilities` are exported. This is a deliberate safety mechanism — the live bridge factory requires explicit wiring and cannot be accidentally instantiated by consumers of the package.

3. **The `GitHubAdapter` interface defines `createPullRequest()`** (general-purpose, non-draft-capable) which bypasses the harness. However, without branch/commit methods, a standalone PR creation has no practical write impact since there is no branch to serve as the PR head.

4. **`mergePullRequest()` on `RealGitHubAdapter`** is a residual concern — this method exists on the general-purpose adapter and is NOT gated by any Stage 3 policy. It is a general security concern (same as Stage 2) and does not enable a full Stage 3 sequence to bypass the harness.

### Verdict: No full bypass path exists. The harness is the sole path for a complete branch→commit→PR sequence.

---

## 3. Coupling Analysis

### Dependency Graph

```
stage3-canonical-manifest.ts  ←── zero internal dependencies (node:crypto only)
         ↑
         │ imports
         │
stage3-approval-binding.ts    ←── node:crypto only (zero Positron deps)
stage3-base-resolver.ts       ←── zero dependencies
stage3-runtime-safety-probe.ts ←── zero internal dependencies
stage3-reader-verifier.ts     ←── zero internal dependencies
         ↑
         │ imports types
         │
stage3-supervised-pilot-policy.ts  ←── @positron/shared (redactValue), manifest
         ↑
         │ imports
         │
stage3-runtime-harness.ts     ←── @positron/shared, all stage3-* modules
         ↑
         │ imports types
         │
stage3-real-github-bridge.ts  ←── harness types, reader-verifier types, base-resolver types
```

### Module Cohesion Assessment

| Module | Cohesion | Notes |
|--------|----------|-------|
| `canonical-manifest` | HIGH | Single responsibility: define byte-exact constants |
| `approval-binding` | HIGH | Single responsibility: cryptographic binding + validation |
| `base-resolver` | HIGH | Single responsibility: TOCTOU-safe SHA resolution |
| `safety-probe` | HIGH | Single responsibility: trusted runtime inspection |
| `reader-verifier` | HIGH | Single responsibility: pre/post-write verification |
| `bridge` | MEDIUM | Defines both transport interface and bridge implementation — could be split |
| `policy` | HIGH | Single responsibility: validation gatekeeper |
| `harness` | HIGH | Single responsibility: orchestration |

### Forbidden Capabilities

The bridge's `verifyBridgeCapabilities()` function (line 346) checks at runtime that the bridge object exposes ONLY 6 allowed keys: `kind`, `baseResolver`, `branchWriter`, `fileCommitWriter`, `prWriter`, `readOnlyVerifier`.

**Forbidden capabilities (NEVER exposed by the bridge):**
merge, delete-branch, add-labels, remove-labels, close-issue, request-reviewers, workflow-dispatch, create-release, update-repository-settings, arbitrary-file-update

**Finding F1 (minor):** `verifyBridgeCapabilities()` uses `Object.keys()` for property enumeration, which does not detect methods added via prototype chain, Symbol keys, or Proxy-based interception. A sophisticated adversary could construct an object that passes this check while exposing hidden capabilities. For the current trust model (all code is trusted, the threat is bugs/accidents, not malicious code), this is adequate.

### Verdict: Low coupling, high cohesion. Dependencies are acyclic and directional.

---

## 4. Discriminated Union Design

### Type Design

```typescript
export interface Stage3FakeHarnessInput extends Stage3HarnessInputBase {
  mode: 'fake';
  humanApproved?: boolean;       // optional — defaults to true in harness
  previewGenerated?: boolean;    // optional — defaults to true in harness
  processSafety?: Stage3ProcessSafety;  // optional — defaults to all-safe
  approvalBinding?: Stage3ApprovalBinding;  // optional for fake mode
}

export interface Stage3LiveHarnessInput extends Stage3HarnessInputBase {
  mode: 'live';
  approvalText: string;                       // REQUIRED — re-hashed for integrity
  approvalBinding: Stage3ApprovalBinding;      // REQUIRED — cryptographically validated
  runtimeSafetyProbe: Stage3RuntimeSafetyProbe; // REQUIRED — trusted inspection
  baseResolver: Stage3BaseResolver;            // REQUIRED — TOCTOU protection
  readOnlyVerifier: Stage3ReadOnlyVerifier;     // REQUIRED — pre/post verification
  branchWriter: Stage3BranchWriter;             // REQUIRED — DI
  fileCommitWriter: Stage3FileCommitWriter;     // REQUIRED — DI
  pullRequestWriter: Stage3PullRequestWriter;   // REQUIRED — DI
  auditSink: Stage3AuditSink;                  // REQUIRED — fail-closed
  bridge?: Stage3RealGitHubBridge;              // optional but checked if present
}

export type Stage3HarnessInput = Stage3FakeHarnessInput | Stage3LiveHarnessInput;
```

### Mode Confusion Analysis

| Confusion scenario | Can it happen? | Defense |
|---|---|---|
| Pass `mode: 'live'` without approvalBinding | TypeScript compile error | `approvalBinding` is required (non-optional) in `Stage3LiveHarnessInput` |
| Pass `mode: 'live'` with synthetic approvalBinding | TypeScript allows it | Runtime: approval text re-hashing fails (synthetic hash ≠ real hash) |
| Pass `mode: 'fake'` expecting real writes | Harness simulates all writes | No real network calls in fake mode |
| Runtime override of mode via `as any` | TypeScript allows `as any` | Runtime: `isLive = input.mode === 'live'`; fake mode provides no writers, live mode checks all gates |
| Supply fake mode input object to live mode | TypeScript compile error | The discriminated union prevents mixing |
| Runtime mutation of input object after validation | Possible in JS | Phase 1a checks happen atomically within `execute()` — no async gaps between checks and writes that could be exploited by modifying the input reference |

### Verdict: Sound design. The TypeScript discriminated union provides compile-time safety, and runtime checks provide defense-in-depth.

---

## 5. TOCTOU Analysis

### Protection Layers

```
 Layer 1: Base Resolver (Phase 1a-iv)
   input.baseResolver.resolveBase({ branch: 'main' })
   → checkBaseDrift(resolved, approvalBinding.expectedBaseSha)
   → BLOCK if drift detected
   → resolvedBaseSha stored for later use
   
 Layer 2: Pre-Write Verification (Phase 4a)
   verifyPreWrite(verifier, { expectedBaseSha: resolvedBaseSha })
   → reads default branch SHA AGAIN via verifier.repository.getDefaultBranch()
   → compares against resolvedBaseSha (the SHA from Layer 1)
   → BLOCK if drift occurred between Layer 1 and Layer 2
   
 Layer 3: GitHub API (Phase 5)
   branchWriter.createBranch({ expectedSourceSha: resolvedBaseSha })
   → GitHub's createRef API call uses exact SHA
   → GitHub rejects if SHA is not a valid ref target
```

### TOCTOU Window Analysis

| Gap | Window | Protection |
|-----|--------|------------|
| Between resolver (Phase 1a-iv) and pre-write verify (Phase 4a) | Policy validation + preview + audit (Phases 2-4) | Layer 2 re-checks |
| Between pre-write verify (Phase 4a) and branch creation (Phase 5) | None — synchronous | Layer 3 (API-level) |
| During branch creation API call | Network latency (~100-500ms) | Layer 3 (API-level) — GitHub's createRef is atomic |

### Finding F2 (minor): The base resolver and pre-write verifier use potentially different API endpoints to read the base branch SHA:
- `baseResolver.resolveBase()` → implementation-defined
- `verifier.repository.getDefaultBranch()` → returns `{ name, sha }`

If these go through different caching layers or GitHub shards, they could return different SHAs. However, in practice both hit the same GitHub REST API and the synchronous execution path means this is extremely unlikely. Documented for awareness.

### Verdict: TOCTOU protection is present through three independent layers. The approach is sound for the single-process supervised pilot.

---

## 6. Fail-Closed Analysis

### Gate Map

| Gate | Phase | Failure Action | Write Occurred? |
|------|-------|---------------|-----------------|
| `harness-gate` | 0 | Return false | No |
| `preflight` (duplicate key) | 0a | Return false | No |
| `preflight` (invalid repo) | 0b | Return false | No |
| `preflight-security` (mock bridge) | 1a-i | Return false | No |
| `preflight-security` (approval hash) | 1a-ii | Return false | No |
| `preflight-security` (binding validation) | 1a-ii-b | Return false | No |
| `preflight-security` (safety probe) | 1a-iii | Return false | No |
| `preflight-security` (base drift) | 1a-iv | Return false | No |
| `policy-branch` | 2 | Return false | No |
| `audit-pre-write` | 4 | Return false | No |
| `pre-write-verify` | 4a | Return false | No |
| `create-branch` (audit fail) | 5 | Return false, `partialMutation: true` | **YES — branch created** |
| `create-branch` (adapter error) | 5 | Return false | No (error before write) |
| `policy-commit` | 6 | Return false, `partialMutation: true` | **YES — branch created** |
| `commit-file` (audit fail) | 7 | Return false, `partialMutation: true` | **YES — branch + file** |
| `commit-file` (adapter error) | 7 | Return false, `partialMutation: true` | **YES — branch created** (commit may or may not have occurred) |
| `policy-pr` | 8 | Return false, `partialMutation: true` | **YES — branch + commit** |
| `create-pr` (audit fail) | 9 | Return false, `partialMutation: true` | **YES — branch + commit + PR** |
| `create-pr` (adapter error) | 9 | Return false, `partialMutation: true` | **YES — branch + commit** |
| `verify` (post-write fail) | 10 | Return false, `allOpsExecuted: true` | **YES — all 3 writes** |
| `verify` (audit fail) | 10 | Return false | **YES — all 3 writes** |
| `audit-success` (final audit fail) | 11 | Return false, `auditIntegrityBroken: true` | **YES — all 3 writes** |

### Finding F3 (important): Audit sink is a single point of failure.

The implementation deviates from the original ADR (`ADR-stage3-runtime-foundation.md`, Section 5.8) which stated:

> "The audit sink is fire-and-forget within the harness. If `sink.record()` throws, the error is caught and swallowed — it must not block the write path."

The current implementation makes ALL audit sink failures **blocking** (fail-closed). Specifically:
- Phase 4: Pre-write audit failure → BLOCK (before any writes — safe)
- Phase 5: Post-branch audit failure → BLOCK (`partialMutation: true`) — **branch already exists**
- Phase 7: Post-commit audit failure → BLOCK (`partialMutation: true`) — **branch + commit exist**
- Phase 9: Post-PR audit failure → BLOCK (`partialMutation: true`) — **all three exist**
- Phase 11: Final audit failure → BLOCK (`auditIntegrityBroken: true`) — **all three exist**

**Trade-off**: Making the audit sink blocking provides stronger guarantees (no un-audited writes silently succeed), but makes the audit sink a SPOF. If the audit sink is unavailable (network partition, disk full, DB crash), a fully successful write sequence will be reported as a failure, even though the GitHub mutations are complete and verified.

**Recommendation**: This is acceptable for the supervised single-process pilot where an operator is present. For Stage 4 (automated mode), consider making post-write audit failures advisory (log + continue) rather than blocking, while keeping pre-write audit failures as blocking gates.

### Finding F4 (important): Post-write audit failures cannot roll back writes.

When the audit sink fails AFTER a write phase (e.g., after branch creation), the harness correctly marks the result with `partialMutation: true` and returns `success: false`. However, the GitHub mutations (branch, commit, PR) are irreversible from the harness's perspective.

**Documented limitation**: No auto-rollback mechanism exists. Cleanup of partial mutations is the operator's responsibility. This is acknowledged in the existing ADR and is consistent with the design philosophy.

### Edge Cases

| Scenario | Behavior | Verdict |
|----------|----------|---------|
| Approval binding with invalid `expiresAt` date | `isApprovalExpired()` returns `true` for `NaN` dates | ✅ Fail-closed |
| Safety probe throws exception | Caught in harness, returns `success: false` | ✅ Fail-closed |
| Pre-write verifier throws exception | Caught in `verifyPreWrite()`, returns `passed: false` | ✅ Fail-closed |
| Post-write verifier throws exception | Caught in `verifyPostWrite()`, returns `passed: false` | ✅ Fail-closed |
| Branch writer throws non-Error object | `String(error ?? 'Unknown adapter error')` fallback | ✅ Handled gracefully |
| No audit sink configured in live mode | `_emitAudit()` returns `false` → BLOCK at Phase 4 | ✅ Fail-closed |
| `Object.keys()` on bridge returns unexpected keys | `verifyBridgeCapabilities()` returns `valid: false` | ✅ Detection exists |

### Verdict: All 23 gates are fail-closed. No gate allows execution to proceed on failure.

---

## 7. Additional Architectural Observations

### 7.1 Execution Lock During Run

`Stage3SupervisedPilotPolicy` implements an execution lock (`_executionLocked`) that is set when `reserveRunKey()` is called (line 707). While locked:
- `updateConfig()` throws if called (line 786-789)
- `reset()` throws if called (line 794-796)

This prevents configuration mutation during an active run — a defense against TOCTOU on configuration.

### 7.2 Token Pattern Detection

`_containsTokenPattern()` in the policy (lines 865-869) rejects file content containing raw token patterns (`ghp_*`, `github_pat_*`, `gho_*`). This is an additional defense against accidentally writing tokens to the sandbox repository. The check runs at Gate 7b, BEFORE the SHA-256 and length checks.

### 7.3 Live Bridge Factory Not Exported

`createStage3RealGitHubBridge` is defined (line 243 of bridge) but NOT exported from `index.ts`. Only `createMockStage3Bridge` and `verifyBridgeCapabilities` are exported. This is a deliberate safety mechanism:
- The live bridge cannot be instantiated by consumers of the `@positron/github-adapter` package.
- For live execution, explicit wiring is required (either modifying exports or constructing the bridge internally).
- This prevents accidental live mode execution through package consumers.

### 7.4 All Canonical Values from Single Source

`stage3-canonical-manifest.ts` is the single source of truth for all Stage 3 values. The policy re-exports through `STAGE3_CANONICAL` for backward compatibility. No other file independently defines canonical values.

### 7.5 Writer Interfaces Are Harness-Specific

The three writer interfaces (`Stage3BranchWriter`, `Stage3FileCommitWriter`, `Stage3PullRequestWriter`) are defined in `stage3-runtime-harness.ts` — NOT in `adapter.ts`. This follows the Interface Segregation Principle:
- The harness declares exactly what it needs.
- The bridge implements these interfaces (not the full `GitHubAdapter`).
- `GitHubAdapter` remains unchanged (no Stage 3 methods added).

---

## 8. Comparison with ADR-stage3-remediation-design.md

The remediation ADR specified 5 tasks. Below is the implementation status:

| Task | Specified | Implemented | Status |
|------|-----------|------------|--------|
| 1: Canonical Manifest | Create `stage3-canonical-manifest.ts` | ✅ Implemented (228 lines) | DONE |
| 2: Approval Binding | Replace `humanApproved: boolean` with `Stage3ApprovalBinding` | ✅ Implemented (386 lines, 12+ validation fields) | DONE |
| 3: Base Resolver (TOCTOU) | Create `Stage3BaseResolver` with drift detection | ✅ Implemented (104 lines) | DONE |
| 4: Runtime Safety Probe | Replace self-asserted booleans with trusted probe | ✅ Implemented (177 lines, `Stage3RuntimeSafetyProbe.inspect()`) | DONE |
| 5: Bridge Adapter | Create `Stage3RealGitHubBridge` with 8 interfaces | ✅ Implemented (370 lines, mock + real factories) | DONE |

### Implemented Beyond Specification

| Feature | Specified? | Notes |
|---------|-----------|-------|
| Pre-Write Verification (`verifyPreWrite`) | Not in 5-task spec | ✅ Implemented — checks repo exists, base SHA, target branch absence, file absence, no open PR |
| Post-Write Verification (`verifyPostWrite`) | Not in 5-task spec | ✅ Implemented — checks 12 conditions after writes |
| Bridge capability allow/deny lists | Mentioned as design principle | ✅ Implemented — `STAGE3_ALLOWED_CAPABILITIES` and `STAGE3_FORBIDDEN_CAPABILITIES` with runtime verification |
| Execution lock (`_executionLocked`) | Not specified | ✅ Implemented — prevents config/state changes during active runs |
| Token pattern detection in file content | Not specified | ✅ Implemented — `_containsTokenPattern()` rejects `ghp_*` etc. |

### Deviations from Specification

| Area | ADR Specified | Actual Implementation | Impact |
|------|--------------|----------------------|--------|
| Audit sink behavior | Fire-and-forget (failures swallowed) | Blocking (fail-closed) — audit failures block execution | **Stronger security, SPOF risk** |
| Live bridge export | Should be exported for wiring | `createStage3RealGitHubBridge` NOT exported | **Adds safety, requires manual wiring** |
| `Stage3GitHubTransport` | 9 methods, flat transport interface | Implemented with 9 methods, not interface-segregated | Minor — transport is DI-injected, not publicly exposed |
| Pre/post-write verifiers | Not specified in 5 tasks | Implemented as `reader-verifier` module | **Positive addition** — defense-in-depth |

---

## 9. Architecture Review Checklist

| Check | Status | Notes |
|-------|--------|-------|
| New dependency justified | ✅ PASS | Only `node:crypto` (built-in) and `@positron/shared` (existing). No new npm deps. |
| Module coupling acceptable | ✅ PASS | Acyclic dependency graph, low coupling, high cohesion. |
| Data flow documented and secure | ✅ PASS | Token never enters policy/harness/audit. File content enters policy for hash only. Audit events are token-free. |
| Error handling strategy consistent | ✅ PASS | All errors produce structured `Stage3HarnessResult` with `success: false`. No raw exceptions propagate. |
| Scaling bottlenecks identified | ✅ PASS | Single-process enforcement is intentional. Limits of 1 per operation type. No DB/network contention. |
| Security boundaries clearly defined | ✅ PASS | Policy is pure validation. Harness orchestrates, never touches network. Token boundary at adapter injection. |
| Testing strategy adequate | ✅ PASS | 27 tests covering happy path, negative cases, partial mutations, and mode isolation. Tests use mock bridges only. |

---

## 10. Recommendations

### Before Live Execution (PR merge gate)

1. **F3 (Audit SPOF)**: Document that audit sink unavailability will cause false failure reports for otherwise successful writes. Ensure the operator's runbook covers this scenario.

2. **F4 (Partial mutation cleanup)**: Document the cleanup procedure for each partial mutation state:
   - `branch created, no commit` → delete branch manually
   - `branch + commit, no PR` → delete branch manually
   - `branch + commit + PR, audit broken` → PR exists, verify manually

3. **Live bridge export**: Before live execution, decide whether to:
   - (a) Export `createStage3RealGitHubBridge` from `index.ts`, or
   - (b) Keep it internal and wire it explicitly in the execution script.

4. **F1 (Bridge property check)**: Before general-purpose use (Stage 4), strengthen `verifyBridgeCapabilities()` to check prototypes and prevent Proxy/Symbol-based evasion. Not a concern for the supervised single-process pilot.

### Before Stage 4 (Generalized/Automated Mode)

5. **Audit sink resilience**: Add configurable audit behavior (`failOpen` vs `failClosed`) for post-write phases.
6. **Auto-rollback**: Implement cleanup of partial mutations (delete orphaned branch if commit/PR fails).
7. **Multi-process lock**: Resolve Issue #324 for distributed lock detection, as documented in `runtime-safety-probe.ts`.

---

## 11. Consequences

### Positive

- **Defense in depth**: 3 layers of TOCTOU protection, 20+ policy gates, cryptographic approval binding, trusted runtime probe, pre/post-write verification.
- **Fail-closed everywhere**: No gate allows execution to proceed on failure.
- **Clean separation**: Stage 3 modules are independent from Stage 2, with no shared mutable state.
- **Capability-constrained bridge**: The bridge exposes exactly 4 writer methods and 5 reader methods. No merge, delete, label, or workflow operations.
- **Testable**: 27 passing tests cover all phases, modes, and error paths.

### Negative / Trade-offs

- **Audit sink SPOF**: Post-write audit failures block execution even after successful writes. A trade-off between audit integrity and operational availability.
- **No auto-rollback**: Orphaned branches/PRs from partial mutations require manual cleanup.
- **Live bridge not publicly connectable**: Requires internal wiring for live execution — deliberate safety mechanism that adds friction.
- **Single-process only**: Concurrency protection is process-scoped (not distributed), as documented in Issue #324.

### Security Impact

- **Positive**: Cryptographic approval binding replaces insecure boolean flag.
- **Positive**: TOCTOU protection prevents base branch drift between approval and execution.
- **Positive**: Trusted runtime probe replaces self-asserted safety booleans.
- **Neutral**: Live path exists in code but cannot be wired through public exports.
- **Neutral**: `mergePullRequest()` on `RealGitHubAdapter` remains a general concern (not Stage 3 specific).

---

## 12. Evidence

- **Test results**: 27/27 tests passing in `stage3-runtime-harness.test.ts`
- **Grep: `RealGitHubAdapter` write methods**: Only `createPullRequest` (line 281) and `mergePullRequest` (line 431) — no `createBranch()` or `commitFile()`
- **Grep: Live bridge export**: `createStage3RealGitHubBridge` NOT found in `index.ts` — only `createMockStage3Bridge` exported
- **ADR references**: Supersedes findings from `ADR-stage3-remediation-design.md` Tasks 1-5

---

## Appendix: Gate Inventory

| # | Gate Name | Location | Fail-Closed? |
|---|-----------|----------|-------------|
| 0 | Harness enabled | Harness Phase 0 | ✅ |
| 0a | Idempotency key unique | Harness Phase 0a | ✅ |
| 0b | Repository format valid | Harness Phase 0b | ✅ |
| 1 | Bridge kind check (live) | Harness Phase 1a-i | ✅ |
| 2 | Approval text hash match | Harness Phase 1a-ii | ✅ |
| 3 | Approval binding version | ApprovalBinding validate | ✅ |
| 4 | Repository match | ApprovalBinding validate | ✅ |
| 5 | Base branch match | ApprovalBinding validate | ✅ |
| 6 | Target branch match | ApprovalBinding validate | ✅ |
| 7 | File path match | ApprovalBinding validate | ✅ |
| 8 | File length match | ApprovalBinding validate | ✅ |
| 9 | File SHA-256 match | ApprovalBinding validate | ✅ |
| 10 | Commit metadata match | ApprovalBinding validate | ✅ |
| 11 | PR metadata match | ApprovalBinding validate | ✅ |
| 12 | Quantity limits (max=1) | ApprovalBinding validate | ✅ |
| 13 | Merge forbidden | ApprovalBinding validate | ✅ |
| 14 | Binding not expired | ApprovalBinding isApprovalExpired | ✅ |
| 15 | Safety probe: queue disabled | validateSafetySnapshot | ✅ |
| 16 | Safety probe: concurrency=1 | validateSafetySnapshot | ✅ |
| 17 | Safety probe: workspace lock | validateSafetySnapshot | ✅ |
| 18 | Safety probe: no other run | validateSafetySnapshot | ✅ |
| 19 | Safety probe: merge kill-switch | validateSafetySnapshot | ✅ |
| 20 | Safety probe: push disabled | validateSafetySnapshot | ✅ |
| 21 | Base SHA drift | Harness Phase 1a-iv | ✅ |
| 22 | Policy: operation allowlist | Policy Gate 1 | ✅ |
| 23 | Policy: forbidden repository | Policy Gate 2 | ✅ |
| 24 | Policy: repository allowlist | Policy Gate 3 | ✅ |
| 25 | Policy: base branch allowlist | Policy Gate 4 | ✅ |
| 26 | Policy: target branch allowlist | Policy Gate 5 | ✅ |
| 27 | Policy: file path allowlist | Policy Gate 6 | ✅ |
| 28 | Policy: file content present | Policy Gate 7 | ✅ |
| 29 | Policy: token pattern check | Policy Gate 7b | ✅ |
| 30 | Policy: file SHA-256 check | Policy Gate 8 | ✅ |
| 31 | Policy: file length check | Policy Gate 9 | ✅ |
| 32 | Policy: commit message match | Policy Gate 10 | ✅ |
| 33 | Policy: commit body match | Policy Gate 11 | ✅ |
| 34 | Policy: PR title match | Policy Gate 12 | ✅ |
| 35 | Policy: PR body match | Policy Gate 13 | ✅ |
| 36 | Policy: draft PR enforcement | Policy Gate 14 | ✅ |
| 37 | Policy: quantity limits | Policy Gate 15 | ✅ |
| 38 | Policy: human approval | Policy Gate 17 | ✅ |
| 39 | Policy: pre-write preview | Policy Gate 18 | ✅ |
| 40 | Policy: duplicate detection | Policy Gate 19 | ✅ |
| 41 | Pre-write audit sink | Harness Phase 4 | ✅ |
| 42 | Pre-write: repo exists | verifyPreWrite | ✅ |
| 43 | Pre-write: base SHA match | verifyPreWrite | ✅ |
| 44 | Pre-write: target branch absent | verifyPreWrite | ✅ |
| 45 | Pre-write: target file absent | verifyPreWrite | ✅ |
| 46 | Pre-write: no open PR | verifyPreWrite | ✅ |
| 47 | Post-branch audit sink | Harness Phase 5 | ✅ |
| 48 | Post-commit audit sink | Harness Phase 7 | ✅ |
| 49 | Post-PR audit sink | Harness Phase 9 | ✅ |
| 50 | Post-write: target branch exists | verifyPostWrite | ✅ |
| 51 | Post-write: branch base SHA | verifyPostWrite | ✅ |
| 52 | Post-write: exactly one commit | verifyPostWrite | ✅ |
| 53 | Post-write: exactly one file | verifyPostWrite | ✅ |
| 54 | Post-write: file path exact | verifyPostWrite | ✅ |
| 55 | Post-write: file size exact | verifyPostWrite | ✅ |
| 56 | Post-write: file SHA exact | verifyPostWrite | ✅ |
| 57 | Post-write: commit message exact | verifyPostWrite | ✅ |
| 58 | Post-write: draft PR exists | verifyPostWrite | ✅ |
| 59 | Post-write: PR base exact | verifyPostWrite | ✅ |
| 60 | Post-write: PR head exact | verifyPostWrite | ✅ |
| 61 | Post-write: no merge | verifyPostWrite | ✅ |
| 62 | Post-verify audit sink | Harness Phase 10 | ✅ |
| 63 | Final audit sink | Harness Phase 11 | ✅ |

**Total: 64 independent gates. All fail-closed.**
