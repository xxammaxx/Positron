# Positron Stage 2 Sandbox Target

## 1. Result

| Classification | Value |
|---|---|
| POSITRON_STAGE2_SANDBOX_TARGET_STATUS | **GREEN_SANDBOX_TARGET_CREATED** |
| POSITRON_STAGE2_STATUS | **STAGE2_TARGET_CREATED_NOT_EXECUTED** |
| Confidence | HIGH |

## 2. Selected Target

| Field | Value |
|---|---|
| Sandbox repository | `xxammaxx/positron-sandbox` |
| Sandbox issue | #1 |
| Sandbox label | `positron-stage2-sandbox` |
| Repo visibility | PRIVATE |
| Allowed operation | `createIssueComment` |
| Optional operation | `addIssueLabels` |
| Max writes per run | 1 |
| Stage 2 executed | NO |
| Real Stage 2 token used | NO |
| Positron runtime write executed | NO |

## 3. Why Dedicated Sandbox Repository

- Isolates Stage 2 writes from production Positron issues and PRs.
- Allows narrow fine-grained token scope (only `xxammaxx/positron-sandbox`).
- Simplifies cleanup (delete sandbox repo after validation).
- Reduces blast radius to zero on production data.
- Aligned with Stage 2 Write-Sandbox Blueprint Option B recommendation.

## 4. Future Stage-2 Dry-Run Inputs

```json
{
  "allowedRepository": "xxammaxx/positron-sandbox",
  "allowedIssueNumber": 1,
  "allowedOperations": ["createIssueComment"],
  "optionalAllowedOperations": ["addIssueLabels"],
  "allowedLabels": ["positron-stage2-sandbox"],
  "maxWritesPerRun": 1,
  "requireHumanApproval": true,
  "requirePreWritePreview": true,
  "requireDuplicateDetection": true,
  "requireKillSwitchActive": true,
  "requirePushDisabled": true,
  "requireMergeKillSwitchActive": true
}
```

## 5. Sandbox Setup Actions (by Developer, not Positron Runtime)

| Action | Target | Result |
|---|---|---|
| Create sandbox repo | `xxammaxx/positron-sandbox` (PRIVATE) | Created |
| Create allowlisted label | `positron-stage2-sandbox` | Created |
| Create sandbox issue | #1 "Positron Stage 2 Write Sandbox" | Created |

All GitHub operations in this phase were performed by the Developer via `gh` CLI.
No Positron runtime performed any GitHub write.

## 6. Explicit Non-Actions

| Action | Executed? |
|---|---|
| Stage 2 write executed | **NO** |
| Real Stage 2 token used | **NO** |
| GitHub write by Positron runtime | **NO** |
| Push enabled | **NO** |
| Merge kill switch disabled | **NO** |
| Issue close | **NO** |
| Stage 3 | **NO** |

## 7. Next Step

**UPDATE 2026-07-10**: Dry-run preflight completed. See `docs/evidence/stage2-write-sandbox-dry-run-preflight.md`.

```
APPROVE FINAL AUDIT AND MERGE POSITRON STAGE 2 WRITE-SANDBOX DRY-RUN PREFLIGHT PR <number>
```

After merge, and only after separate explicit Owner approval:
```
APPROVE POSITRON STAGE 2 WRITE-SANDBOX SINGLE COMMENT DRY RUN
```

Not directly:
Stage 2 Write Dry Run.

## 8. References

- Stage 2 Dry-Run Preflight: `docs/evidence/stage2-write-sandbox-dry-run-preflight.md`
- Stage 2 Blueprint: `docs/evidence/stage2-write-sandbox-blueprint.md`
- Stage 2 Policy Implementation: `docs/evidence/stage2-write-sandbox-policy-implementation.md`
- Stage 2 Token Policy: `docs/security/github-stage2-write-sandbox-token-policy.md`
- Stage 1 Evidence: `docs/evidence/stage1-readonly-dry-run.md`
- Full Real Mode Preflight: `docs/evidence/full-real-mode-preflight-issue-308.md`
- Known Limitations: `docs/status/known-limitations.md`
- Issue: #308
