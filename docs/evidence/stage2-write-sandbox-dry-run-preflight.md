# Positron Stage 2 Write-Sandbox Dry-Run Preflight

## 1. Result

| Classification | Value |
|---|---|
| POSITRON_STAGE2_DRY_RUN_PREFLIGHT_STATUS | **GREEN_STAGE2_DRY_RUN_PREFLIGHT_PR_CREATED** |
| POSITRON_STAGE2_STATUS | **STAGE2_DRY_RUN_PREFLIGHT_READY_NOT_EXECUTED** |
| Confidence | HIGH |

## 2. Sandbox Target Verification

| Field | Expected | Actual | Status |
|---|---|---|---|
| Sandbox repo | `xxammaxx/positron-sandbox` | `xxammaxx/positron-sandbox` | ✅ VERIFIED |
| Repo visibility | PRIVATE | PRIVATE | ✅ VERIFIED |
| Sandbox issue | #1 | #1 | ✅ VERIFIED |
| Issue state | OPEN | OPEN | ✅ VERIFIED |
| Issue title | Positron Stage 2 Write Sandbox | Positron Stage 2 Write Sandbox | ✅ VERIFIED |
| Sandbox label | `positron-stage2-sandbox` | `positron-stage2-sandbox` | ✅ VERIFIED |

**POSITRON_STAGE2_SANDBOX_TARGET_VERIFY_STATUS: VERIFIED**

## 3. Token Scope for Later Dry Run

### Fine-Grained GitHub Token Requirements

| Permission | Scope | Required? | Status |
|---|---|---|---|
| Metadata | Read-only | Always granted | ✅ |
| Issues | Read and write | Required for createIssueComment | ✅ |
| Contents | No access | Must NOT have | ✅ |
| Pull requests | No access | Must NOT have | ✅ |
| Administration | No access | Must NOT have | ✅ |
| Workflows | No access | Must NOT have | ✅ |
| Secrets | No access | Must NOT have | ✅ |
| Actions | No access | Must NOT have | ✅ |
| Codespaces | No access | Must NOT have | ✅ |
| Packages | No access | Must NOT have | ✅ |

### Token Repository Scope

| Field | Value |
|---|---|
| Repository access | Only selected repositories |
| Allowed repository | `xxammaxx/positron-sandbox` |
| Production repo access | None |

### Token Lifecycle Rules

| Rule | Value |
|---|---|
| Token type | Fine-grained GitHub PAT (`github_pat_...`) |
| Max expiry | 7 days |
| Env var name | `POSITRON_STAGE2_GITHUB_TOKEN` |
| Storage | Local shell only — NO .env, NO commit, NO file |
| Revocation | Immediately after dry run |
| Positron runtime | Never manages token lifecycle |

### Pre-Flight Checks (Before Real Stage-2 Execution)

- [ ] Token is fine-grained with Issues read/write ONLY
- [ ] Token has access ONLY to `xxammaxx/positron-sandbox`
- [ ] Token is NOT hardcoded in any file
- [ ] Token is set as `POSITRON_STAGE2_GITHUB_TOKEN`
- [ ] `POSITRON_ENABLE_PUSH=true` is NOT set
- [ ] `POSITRON_MERGE_KILL_SWITCH` is active
- [ ] No `.env` file in workspace root
- [ ] Kill-switch verified active
- [ ] Push disabled

### Token Scope Status: DEFINED — NOT CREATED, NOT USED

No token was created or used during this preflight.

## 4. Pre-write Preview Without Write

### Target Configuration

```json
{
  "allowedRepository": "xxammaxx/positron-sandbox",
  "allowedIssueNumber": 1,
  "operation": "createIssueComment",
  "allowedLabels": ["positron-stage2-sandbox"],
  "maxWritesPerRun": 1,
  "requireHumanApproval": true,
  "requirePreWritePreview": true,
  "requireDuplicateDetection": true,
  "requireKillSwitchActive": true
}
```

### Preview Output Summary

| Field | Value |
|---|---|
| Operation | `createIssueComment` |
| Repository | `xxammaxx/positron-sandbox` |
| Issue number | 1 |
| Body SHA-256 | `48be36a2eccb9dc4a1e90c336cbec0045a13e44048d56dfcac83da5d228f371e` |
| Body length | 215 |
| Idempotency key | `e2cab0b797a942a0` |
| Max writes per run | 1 |
| Write count before | 0 |
| Approved | false (approval required) |
| Token value | `REDACTED` |
| Write executed | **NO** |
| Real token used | **NO** |

### Planned Comment Body (for later approval)

```
Positron Stage 2 write-sandbox validation comment.

This is the only allowlisted Stage 2 write for this dry run.
Repository: xxammaxx/positron-sandbox
Issue: #1
Operation: createIssueComment
Stage 3 remains blocked.
```

## 5. Preview Safety Verification

| Check | Result |
|---|---|
| `tokenValue` always `REDACTED` | ✅ PASS |
| No raw body in preview | ✅ PASS |
| Body hash present (SHA-256, 64 chars) | ✅ PASS |
| Body length present (215) | ✅ PASS |
| No `ghp_` in preview | ✅ PASS |
| No `github_pat_` in preview | ✅ PASS |
| No `Bearer` in preview | ✅ PASS |
| No `Authorization` header in preview | ✅ PASS |
| No `ghp_` in audit event | ✅ PASS |
| No `github_pat_` in audit event | ✅ PASS |
| No `Authorization` in audit event | ✅ PASS |
| Write count remains at 0 | ✅ PASS |
| Idempotency key registered for preview only | ✅ PASS |

## 6. Negative Checks (41 Tests)

| Check | Expected | Result |
|---|---|---|
| Non-sandbox repository | BLOCK | ✅ Test 1 PASS |
| Non-sandbox issue | BLOCK | ✅ Test 2 PASS |
| Missing preview | BLOCK | ✅ Test 3 PASS |
| Missing human approval | BLOCK | ✅ Test 4 PASS |
| Second write in same run | BLOCK | ✅ Test 5 PASS |
| Non-allowlisted label | BLOCK | ✅ Test 6 PASS |
| removeIssueLabel | BLOCK (permanently forbidden) | ✅ Test 7-14 PASS |
| claimIssue | BLOCK (permanently forbidden) | ✅ Test 7-14 PASS |
| createPullRequest | BLOCK (permanently forbidden) | ✅ Test 7-14 PASS |
| mergePullRequest | BLOCK (permanently forbidden) | ✅ Test 7-14 PASS |
| requestReviewers | BLOCK (permanently forbidden) | ✅ Test 7-14 PASS |
| closeIssue | BLOCK (permanently forbidden) | ✅ Test 7-14 PASS |
| push | BLOCK (permanently forbidden) | ✅ Test 7-14 PASS |
| merge | BLOCK (permanently forbidden) | ✅ Test 7-14 PASS |
| Token redacted in preview | ✅ REDACTED | ✅ Test 15 PASS |
| Token redacted in audit | ✅ REDACTED | ✅ Test 16 PASS |
| Duplicate idempotency key | BLOCK | ✅ Test 18 PASS |
| Kill-switch inactive | BLOCK | ✅ Test 19 PASS |
| POSITRON_ENABLE_PUSH set | BLOCK | ✅ Test 20 PASS |
| POSITRON_MERGE_KILL_SWITCH off | BLOCK | ✅ Test 21 PASS |
| Policy disabled | BLOCK all writes | ✅ PASS |
| Read-only adapter tests | 26/26 | ✅ PASS |

## 7. Later Human Approval String

The following exact string must be provided by the Owner for the later real Stage 2 single-comment dry run:

```text
APPROVE POSITRON STAGE 2 WRITE-SANDBOX SINGLE COMMENT DRY RUN

ALLOW_REAL_STAGE2_TOKEN_USE: YES
ALLOW_EXACTLY_ONE_GITHUB_ISSUE_COMMENT_BY_POSITRON_RUNTIME: YES
ALLOW_REPOSITORY: xxammaxx/positron-sandbox
ALLOW_ISSUE_NUMBER: 1
ALLOW_OPERATION: createIssueComment
ALLOW_MAX_WRITES: 1
ALLOW_COMMENT_BODY_SHA256: 48be36a2eccb9dc4a1e90c336cbec0045a13e44048d56dfcac83da5d228f371e
ALLOW_IDEMPOTENCY_KEY: e2cab0b797a942a0

DENY_LABEL_CHANGE: YES
DENY_PR_CREATE: YES
DENY_PUSH: YES
DENY_MERGE: YES
DENY_ISSUE_CLOSE: YES
DENY_STAGE3: YES
```

**This approval string is documented only — NOT used in this preflight.**

## 8. Explicit Non-Actions

| Action | Executed? |
|---|---|
| Stage 2 write executed | **NO** |
| Real Stage 2 token used | **NO** |
| Positron runtime write executed | **NO** |
| GitHub API write executed | **NO** |
| Stage 2 dry run | **NO** |
| Label changed | **NO** |
| PR created by runtime | **NO** |
| Push by runtime | **NO** |
| Merge by runtime | **NO** |
| Issue close by runtime | **NO** |
| Stage 3 | **NO** |
| Full Real Mode | **NO** |

## 9. Go / No-Go

| Stage | Status |
|---|---|
| Stage 0 (Local Fake Mode Baseline) | GO — validated |
| Stage 1 (ReadOnly) | GO — validated and documented |
| Stage 2 (Write Sandbox) | **PREFLIGHT READY — NOT EXECUTED** |
| Stage 3 (Supervised Pilot) | BLOCKED — depends on Stage 2 |

## 10. What Can Positron Do Now?

- Stage 2 Write-Sandbox Policy is implemented and tested (41 tests, all passing)
- Sandbox target is created and verified (`xxammaxx/positron-sandbox`, issue #1)
- Pre-write preview is generated and verified safe
- Token scope for later dry run is defined
- Human approval string is defined
- All negative checks pass (forbidden operations blocked, token redaction verified)
- Stage 2 remains **NOT executed**

## 11. What Remains Blocked?

- Real Stage 2 token (not yet created)
- Real Stage 2 write dry run
- Positron Runtime write
- Label change
- Push
- Merge
- Issue close
- Stage 3
- Full Real Mode

## 12. Next Step

```
APPROVE FINAL AUDIT AND MERGE POSITRON STAGE 2 WRITE-SANDBOX DRY-RUN PREFLIGHT PR <number>
```

After merge, and only after separate explicit Owner approval:

```
APPROVE POSITRON STAGE 2 WRITE-SANDBOX SINGLE COMMENT DRY RUN
```

**Not directly: Stage 3. Not directly: Full Real Mode.**

## 13. References

- Stage 2 Blueprint: `docs/evidence/stage2-write-sandbox-blueprint.md`
- Stage 2 Policy Implementation: `docs/evidence/stage2-write-sandbox-policy-implementation.md`
- Stage 2 Sandbox Target: `docs/evidence/stage2-sandbox-target.md`
- Stage 2 Token Policy: `docs/security/github-stage2-write-sandbox-token-policy.md`
- Stage 1 Evidence: `docs/evidence/stage1-readonly-dry-run.md`
- Full Real Mode Preflight: `docs/evidence/full-real-mode-preflight-issue-308.md`
- Known Limitations: `docs/status/known-limitations.md`
- Issue: #308
