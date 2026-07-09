# Positron Stage 2 Write-Sandbox Policy Implementation Evidence

## 1. Result

| Classification | Value |
|---|---|
| POSITRON_STAGE2_WRITE_SANDBOX_POLICY_IMPL_STATUS | **GREEN_STAGE2_POLICY_IMPL_PR_CREATED** |
| POSITRON_STAGE2_STATUS | **STAGE2_POLICY_IMPLEMENTED_NOT_EXECUTED** |
| Confidence | HIGH |

## 2. Scope

- **Policy implementation:** `packages/github-adapter/src/stage2-write-sandbox-policy.ts` (300+ LOC)
- **Tests:** `packages/github-adapter/src/__tests__/stage2-write-sandbox-policy.test.ts` (700+ LOC, 41 tests)
- **Exports updated:** `packages/github-adapter/src/index.ts`
- **Runtime writes executed:** NO
- **Real token used:** NO
- **GitHub write by Positron runtime:** NO

## 3. Policy Rules Implemented

| Rule | Status | Test |
|---|---|---|
| Sandbox repo allowlist enforcement | ✅ Implemented | blocks non-sandbox repository |
| Sandbox issue allowlist enforcement | ✅ Implemented | blocks non-sandbox issue |
| Operation allowlist (allowed + optional) | ✅ Implemented | blocks non-allowlisted operations |
| Permanently forbidden operations (8 ops) | ✅ Implemented | blocks push, merge, closeIssue, createPR, mergePR, etc. |
| Label allowlist (addIssueLabels) | ✅ Implemented | blocks addIssueLabels with non-allowlisted label |
| MaxWritesPerRun = 1 | ✅ Implemented | blocks second write in same run |
| Human approval requirement | ✅ Implemented | blocks createIssueComment without human approval |
| Pre-write preview requirement | ✅ Implemented | blocks createIssueComment without preview |
| Duplicate detection (idempotency key) | ✅ Implemented | duplicate detection blocks duplicate idempotency key |
| Kill-switch enforcement (push disabled) | ✅ Implemented | kill-switch inactive blocks write preview |
| Kill-switch enforcement (merge blocked) | ✅ Implemented | POSITRON_MERGE_KILL_SWITCH=false blocked |
| Policy disabled = all blocked | ✅ Implemented | blocks all writes when policy is disabled |
| Token redaction in preview | ✅ Implemented | tokenValue always 'REDACTED' |
| Token redaction in audit event | ✅ Implemented | reason redacted via redactValue() |
| Body hash only (no raw text in preview) | ✅ Implemented | preview contains SHA-256 hash, not raw body |

## 4. Negative Tests (41 total)

| # | Test | Result |
|---|---|---|
| 1 | blocks non-sandbox repository | ✅ PASS |
| 2 | blocks non-sandbox issue | ✅ PASS |
| 3 | blocks createIssueComment without preview | ✅ PASS |
| 4 | blocks createIssueComment without human approval | ✅ PASS |
| 5 | blocks second write in same run | ✅ PASS |
| 6 | blocks addIssueLabels with non-allowlisted label | ✅ PASS |
| 7-14 | blocks 8 permanently forbidden operations (removeIssueLabel, claimIssue, createPullRequest, mergePullRequest, requestReviewers, closeIssue, push, merge) | ✅ PASS |
| 15 | keeps token redacted in preview | ✅ PASS |
| 16 | keeps token redacted in audit event | ✅ PASS |
| 17 | allows exactly one sandbox comment preview in fake/preview mode | ✅ PASS |
| 18 | duplicate detection blocks duplicate idempotency key | ✅ PASS |
| 19 | kill-switch inactive blocks write preview | ✅ PASS |
| 20 | POSITRON_ENABLE_PUSH=true blocked (push permanently forbidden) | ✅ PASS |
| 21 | POSITRON_MERGE_KILL_SWITCH=false blocked (merge permanently forbidden) | ✅ PASS |
| — | Additional structural tests (factory, defaults, constants, preview, audit, state management, integration) | ✅ PASS |

## 5. Write Path Inventory

| Operation | Existing Path | Current Guard | New Stage-2 Guard | Test |
|---|---|---|---|---|
| createIssueComment | real-adapter.ts:201-210 | POSITRON_GITHUB_MODE=fake | Stage2 policy allowlist + all gates | 17 (allowed) |
| addIssueLabels | real-adapter.ts:212-219 | POSITRON_GITHUB_MODE=fake | Stage2 policy optional + label allowlist | Allows with label |
| removeIssueLabel | real-adapter.ts:221-236 | POSITRON_GITHUB_MODE=fake | STAGE2_PERMANENTLY_FORBIDDEN | 7-14 (blocked) |
| claimIssue | real-adapter.ts:238-273 | POSITRON_GITHUB_MODE=fake | STAGE2_PERMANENTLY_FORBIDDEN | 7-14 (blocked) |
| createPullRequest | real-adapter.ts:281-343 | POSITRON_GITHUB_MODE=fake | STAGE2_PERMANENTLY_FORBIDDEN | 7-14 (blocked) |
| mergePullRequest | real-adapter.ts:431-452 | POSITRON_MERGE_KILL_SWITCH | STAGE2_PERMANENTLY_FORBIDDEN | 7-14 (blocked) |
| requestReviewers | real-adapter.ts:454-473 | POSITRON_GITHUB_MODE=fake | STAGE2_PERMANENTLY_FORBIDDEN | 7-14 (blocked) |
| closeIssue | real-adapter.ts:475-487 | POSITRON_GITHUB_MODE=fake | STAGE2_PERMANENTLY_FORBIDDEN | 7-14 (blocked) |
| push | sandbox package | POSITRON_ENABLE_PUSH | STAGE2_PERMANENTLY_FORBIDDEN | 20 (blocked) |
| merge | sandbox package | POSITRON_MERGE_KILL_SWITCH | STAGE2_PERMANENTLY_FORBIDDEN | 21 (blocked) |

## 6. Preview / Audit / Redaction

| Requirement | Status |
|---|---|
| Token redaction in preview | ✅ `tokenValue: 'REDACTED'` always |
| Token redaction in audit event | ✅ via `redactValue()` from @positron/shared |
| Body hash only (SHA-256), no raw text in preview | ✅ `bodyHash` + `bodyLength` only |
| No raw API output in audit | ✅ no `rawResponse`, `headers`, `authorizationHeader` fields |
| No full comment text in audit | ✅ only `bodyHash` |

## 7. Integration Point

The policy is designed as a standalone validatable module. Integration into the adapter write path requires:

1. Before any `RealGitHubAdapter` write method, call `policy.validate(params)`
2. If `validate()` returns `allowed: false`, throw/reject with the reason
3. If `validate()` returns `allowed: true`, proceed with the Octokit call
4. After successful write, call `policy.recordWrite(idempotencyKey)`
5. Audit events must be generated for both `allowed_preview` and `blocked` results

The full integration is deferred to a subsequent PR to keep this change scoped and reviewable.

## 8. Gates

| Gate | Exit | Result |
|---|---|---|
| typecheck | npm run typecheck | ✅ PASS |
| build | npm run build | ✅ PASS |
| stage2 policy tests | 41 tests | ✅ 41/41 PASS |
| readonly adapter tests | 26 tests | ✅ 26/26 PASS |
| full test suite | 1967 tests | ✅ 1967/1967 PASS |
| git diff --check | no whitespace errors | ✅ CLEAN |
| security scan | no real tokens | ✅ CLEAN |

## 9. Explicit Non-Actions

| Action | Executed? |
|---|---|
| Stage 2 write executed | **NO** |
| Real write token used | **NO** |
| GitHub write by Positron runtime | **NO** |
| GitHub read probe executed | **NO** |
| Push enabled | **NO** |
| Merge kill switch disabled | **NO** |
| Issue close by runtime | **NO** |
| Stage 3 executed | **NO** |
| Merge executed | **NO** |
| Token output in any form | **NO** |
| .env read/write | **NO** |

## 10. Go / No-Go

| Stage | Status |
|---|---|
| Stage 0 (Local Fake Mode Baseline) | GO |
| Stage 1 (ReadOnly validated) | GO — validated and documented |
| Stage 2 (Write Sandbox Policy) | **POLICY IMPLEMENTED — NOT EXECUTED** |
| Stage 3 (Supervised Pilot) | BLOCKED — depends on Stage 2 |

## 11. What Can Positron Do Now?

- Stage 2 Write-Sandbox Policy exists as a technical, testable module
- Sandbox allowlist is enforceable at runtime (not just documented)
- Pre-write preview generation is testable
- Redacted audit events are testable
- 41 negative/positive tests prove the policy blocks risky writes
- All existing tests (1967) continue to pass
- Stage 2 is still **not executed** — only the policy layer exists

## 12. What Remains Blocked?

- Real write token (POSITRON_STAGE2_GITHUB_TOKEN)
- Real GitHub write operation
- Stage 2 write dry run
- Push
- Merge
- Issue close
- Stage 3

## 13. Recommended Next Step

1. **Review this PR** — human Owner reviews the Stage 2 policy implementation
2. **APPROVE FINAL AUDIT AND MERGE** — Owner approves merge
3. **After merge:** `APPROVE POSITRON STAGE 2 SANDBOX TARGET CREATION / SELECTION`
4. **Then:** Stage 2 Write Sandbox dry-run execution (separate run with real token)
5. **NOT directly:** Full real mode or Stage 3

## 14. References

- Stage 2 Blueprint: `docs/evidence/stage2-write-sandbox-blueprint.md`
- Stage 2 Token Policy: `docs/security/github-stage2-write-sandbox-token-policy.md`
- Stage 1 Evidence: `docs/evidence/stage1-readonly-dry-run.md`
- Full Real Mode Preflight: `docs/evidence/full-real-mode-preflight-issue-308.md`
- Known Limitations: `docs/status/known-limitations.md`
- Issue: #308
- PR: TBD
