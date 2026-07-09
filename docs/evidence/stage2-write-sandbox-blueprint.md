# Positron Stage 2 Write-Sandbox Blueprint / Preflight

## 1. Result

| Classification | Value |
|---|---|
| POSITRON_STAGE2_WRITE_SANDBOX_BLUEPRINT_STATUS | **GREEN_STAGE2_BLUEPRINT_PR_CREATED** |
| POSITRON_STAGE2_STATUS | **STAGE2_PREFLIGHT_DESIGNED_NOT_EXECUTED** |
| Confidence | HIGH |

## 2. Baseline

| Item | Status |
|---|---|
| main HEAD | **4848ae7** (PR #359 merge) |
| PR #353 (Security Remediation) | MERGED |
| PR #354 (Full Real Mode Preflight) | MERGED |
| PR #355 (Stage-1-Blocker-Audit) | MERGED |
| PR #357 (ReadOnly GitHub Adapter) | MERGED |
| PR #358 (Stage-1 ReadOnly Prep) | MERGED |
| PR #359 (Stage-1 ReadOnly Evidence) | MERGED |
| Issue #308 (Full Real Mode) | OPEN |
| Issue #340 (Repo Hygiene) | OPEN |
| Open PRs | 0 |
| Working tree | Clean |

## 3. Stage-1 Evidence (Confirmed)

| Check | Result |
|---|---|
| Stage 1 ReadOnly validated with real token | ✅ 7/7 reads, 0 writes |
| ReadOnly boundary enforced | ✅ 9/9 write methods absent from wrapper |
| Token redaction active | ✅ ghp_ and github_pat_ patterns sanitized |
| Token unset after run | ✅ |
| Token in evidence/logs | ❌ NO |
| All kill-switches at safe defaults | ✅ |
| Stage 2/3 blocked | ✅ |

## 4. Write Path Inventory

| Write Operation | File | Line(s) | Stage-2 Candidate? | Sandbox Requirement |
|---|---|---|---|---|
| createIssueComment | real-adapter.ts | 201-210 | **YES (minimal)** | Sandbox issue only, dedup marker, max 1 per run |
| addIssueLabels | real-adapter.ts | 212-219 | **YES (optional)** | Allowlisted label only |
| removeIssueLabel | real-adapter.ts | 221-236 | NO (Stage 2) | Later stage |
| claimIssue | real-adapter.ts | 238-273 | NO (Stage 2) | composite write: labels + comment |
| createPullRequest | real-adapter.ts | 281-343 | NO | Later stage (Stage 3) |
| mergePullRequest | real-adapter.ts | 431-452 | NO | Later stage (Stage 3) |
| requestReviewers | real-adapter.ts | 454-473 | NO | Later stage |
| closeIssue | real-adapter.ts | 475-487 | NO | Later stage |

### Existing Guards (per operation)

| Write Operation | Adapter-Mode Guard | Kill-Switch Guard | Gate Guard | Admin-Auth Gate |
|---|---|---|---|---|
| createIssueComment | POSITRON_GITHUB_MODE=fake | — | — | Only via POST /api/runs |
| addIssueLabels | POSITRON_GITHUB_MODE=fake | — | — | Only via POST /api/runs |
| mergePullRequest | POSITRON_GITHUB_MODE=fake | POSITRON_MERGE_KILL_SWITCH + POSITRON_ENABLE_MERGE | MERGE gates | Only via POST /api/runs |
| createPullRequest | POSITRON_GITHUB_MODE=fake | — | PR_CREATE gates | Only via POST /api/runs |

### Stage-2 Additional Guard Requirements

For the first Stage 2 Write Sandbox test, additional guards beyond existing kill-switches:

| Guard | Required? | Mechanism |
|---|---|---|
| Sandbox target allowlist | YES | Hardcoded repo + issue number |
| Max writes per run | YES | MaxWritesPerRun = 1 |
| Human approval pre-write | YES | Console prompt before each write |
| Dry-run preview before write | YES | Show operation, target, sanitized body hash |
| Duplicate detection | YES | Check for existing comment with marker before posting |
| Audit logging | YES | Local JSONL with redacted metadata |
| Token scope validation | YES | Verify fine-grained token scope on adapter init |

## 5. Sandbox Target Options

| Option | Description | Risk | Controllability | Recommendation |
|---|---|---|---|---|
| **A: Sandbox Issue in Positron Repo** | Dedicated issue in xxammaxx/Positron with label `positron-stage2-sandbox` | Medium — same repo as production issues | High — explicit issue number allowlist | Acceptable with Owner pre-approval of exact issue number |
| **B: Dedicated Sandbox Repository** | Separate repo xxammaxx/positron-sandbox with fine-grained token | Low — fully isolated from production | Highest — separate repo, no production data | **RECOMMENDED** for first Stage 2 test |

### Recommendation

**Option B preferred** for the first Stage 2 write sandbox test:
- Complete isolation from production repository
- Fine-grained token limited to sandbox repo only
- No risk of accidental production issue/PR modification
- Easy cleanup: delete sandbox repo after test

If Option A must be used:
- Requires new Owner freigabe with exact sandbox issue number
- Issue MUST have label `positron-stage2-sandbox`
- Only allowlisted operations on that specific issue
- Sandbox label MUST be applied by Owner (human), not by Positron runtime

## 6. Recommended Sandbox Design

### Target (Option B)
- Repository: `xxammaxx/positron-sandbox` (to be created by Owner)
- Issue: #1 (first issue in sandbox repo)
- No production issues, PRs, or branches in this repo

### Allowed Operations (first test)
1. `createIssueComment` on sandbox issue #1 — exactly once, with dedup marker

### Optional Allowed (if approved)
2. `addIssueLabels` with exact allowlisted label `positron-stage2-sandbox`

### Forbidden Operations (unchanged)
- removeIssueLabel
- claimIssue
- createPullRequest
- requestReviewers
- mergePullRequest
- closeIssue
- branch create / commit / push / merge
- any non-sandbox target

### Configuration (for later Stage 2 execution — NOT this run)
```json
{
  "stage": "stage2-write-sandbox",
  "allowedRepository": "xxammaxx/positron-sandbox",
  "allowedIssueNumber": 1,
  "allowedOperations": ["createIssueComment"],
  "optionalAllowedOperations": ["addIssueLabels"],
  "allowedLabels": ["positron-stage2-sandbox"],
  "forbiddenOperations": [
    "removeIssueLabel", "claimIssue", "createPullRequest",
    "requestReviewers", "mergePullRequest", "closeIssue",
    "push", "merge"
  ],
  "maxWritesPerRun": 1,
  "requireHumanApproval": true,
  "requireKillSwitchActive": true,
  "requireDryRunPreviewBeforeWrite": true
}
```

## 7. Token Policy Summary

| Permission | Required? | Reason |
|---|---|---|
| Metadata | Read-only | Always granted by GitHub |
| Issues | Read/Write | Required for createIssueComment |
| Pull requests | No access | Not needed for Stage 2 |
| Contents | No access | Not needed for Stage 2 |
| Workflows | No access | Not needed |
| Administration | No access | Not needed |
| Secrets | No access | Not needed |

### Token Lifecycle (for later execution — NOT this run)
1. Owner creates fine-grained token via GitHub UI
2. Token scope: ONLY `xxammaxx/positron-sandbox` (or sandbox target)
3. Token set in local shell ONLY: `export POSITRON_STAGE2_GITHUB_TOKEN=github_pat_...`
4. Token used for exactly ONE write operation
5. Token unset: `unset POSITRON_STAGE2_GITHUB_TOKEN`
6. Token revoked via GitHub UI
7. Token NEVER in .env, NEVER logged, NEVER in evidence

## 8. Audit / Redaction / Logging

| Requirement | Status |
|---|---|
| Pre-write preview showing operation, repo, issue, sanitized body hash | Required |
| No token in preview | Required |
| Human approval prompt before write | Required |
| MaxWritesPerRun = 1 enforced | Required |
| Duplicate detection (existing comment with marker) | Required |
| Local JSONL audit log, redacted | Required |
| No raw API output | Required |
| Kill-switches remain active (POSITRON_ENABLE_PUSH=false, POSITRON_MERGE_KILL_SWITCH=true) | Required |
| Idempotency key for comment | Required |

### Audit Log Schema (proposed)
```json
{
  "timestamp": "ISO8601",
  "operation": "createIssueComment",
  "repository": "xxammaxx/positron-sandbox",
  "issueNumber": 1,
  "bodyHash": "sha256",
  "dryRun": true,
  "humanApproved": true,
  "result": "previewed|executed|blocked|denied"
}
```

## 9. Negative Test Matrix

| Test | Purpose | Expected |
|---|---|---|
| Stage2 policy blocks non-sandbox repo | Prevent scope drift | BLOCK |
| Stage2 policy blocks non-sandbox issue | Prevent accidental target | BLOCK |
| Stage2 policy blocks closeIssue | No destructive write | BLOCK |
| Stage2 policy blocks createPullRequest | No PR creation | BLOCK |
| Stage2 policy blocks mergePullRequest | No merge | BLOCK |
| Stage2 policy allows exactly one sandbox comment preview | Minimal write path | ALLOW_PREVIEW_ONLY |
| Stage2 policy blocks second write in same run | MaxWritesPerRun enforcement | BLOCK |
| Token redaction masks ghp_ and github_pat_ | Secret safety | PASS |
| Audit log contains only safe metadata | Compliance | PASS |
| Duplicate comment detection prevents re-post | Idempotency | BLOCK (duplicate) |
| Kill-switch active blocks writes if not explicitly approved | Safety net | BLOCK |
| POSITRON_ENABLE_PUSH=true not set | No push | BLOCK |
| POSITRON_MERGE_KILL_SWITCH=false not set | Merge blocked | BLOCK |

## 10. Explicit Non-Actions (This Run)

| Action | Executed? |
|---|---|
| Stage 2 write executed | **NO** |
| Real write token used | **NO** |
| GitHub write by Positron runtime | **NO** |
| Push enabled | **NO** |
| Merge kill switch disabled | **NO** |
| Issue close by runtime | **NO** |
| Stage 3 executed | **NO** |
| Token output in any form | **NO** |
| .env read/write | **NO** |

## 11. Go / No-Go

| Stage | Status |
|---|---|
| Stage 0 (Local Fake Mode Baseline) | GO |
| Stage 1 (ReadOnly validated) | GO — validated and documented |
| Stage 2 (Write Sandbox) | **PREFLIGHT DESIGNED — NOT EXECUTED** |
| Stage 3 (Supervised Pilot) | BLOCKED — depends on Stage 2 |

## 12. Recommended Next Step

1. **Review this blueprint PR** — human Owner reviews the Stage 2 write sandbox design
2. **APPROVE FINAL AUDIT** — Owner approves the blueprint for merge
3. **After merge:** Owner creates sandbox repository + fine-grained write token
4. **Then:** `APPROVE POSITRON STAGE 2 WRITE-SANDBOX POLICY IMPLEMENTATION`
5. **Then:** Stage 2 Write Sandbox dry-run execution (separate run)
6. **NOT directly:** Stage 2 write execution without separate approval

## 13. References

- Stage 1 Evidence: `docs/evidence/stage1-readonly-dry-run.md`
- Stage 1 Prep: `docs/evidence/stage1-readonly-validation-prep.md`
- ReadOnly Token Policy: `docs/security/github-readonly-token-policy.md`
- ReadOnly Adapter: `docs/evidence/readonly-github-adapter-capability-layer.md`
- Full Real Mode Preflight: `docs/evidence/full-real-mode-preflight-issue-308.md`
- Known Limitations: `docs/status/known-limitations.md`
- Issue: #308
- ADR: `docs/adr/readonly-github-adapter-capability-layer.md`
