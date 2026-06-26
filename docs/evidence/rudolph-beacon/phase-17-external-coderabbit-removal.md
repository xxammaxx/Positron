# Phase 17 — External CodeRabbit GitHub App Removal Guidance

## Metadata
- **Timestamp**: 2026-06-26T00:00:00Z
- **Scope**: External CodeRabbit GitHub App identification and Owner action documentation

---

## CodeRabbit Presence on PR #295

### Review Evidence
| Aspect | Detail |
|--------|--------|
| GitHub user | `coderabbitai` |
| Author association | NONE (external app) |
| Review type | Commented |
| Actionable comments | 3 |
| Comment IDs | PRR_kwDOSim3Xs8AAAABD-s-vQ |

### Status Check Evidence
| Aspect | Detail |
|--------|--------|
| Check name | `CodeRabbit` |
| Check type | StatusContext (not GitHub CheckRun) |
| Status | SUCCESS |
| Provider | External GitHub App |

---

## Can the AI Remove This?

**NO.** The orchestrator cannot:
- Remove GitHub App installations
- Modify repository Settings → Integrations
- Delete third-party webhooks
- Remove `coderabbitai` bot access

These actions require Owner-level access to GitHub repository settings.

---

## Owner Action Required

```text
OWNER_ACTION_REQUIRED: REMOVE_CODERABBIT_GITHUB_APP
```

### Steps for Owner (xxammaxx)

1. Navigate to: `https://github.com/xxammaxx/Positron/settings/installations`
2. Look for **CodeRabbit** under "Installed GitHub Apps"
3. Click "Configure" → "Uninstall" (or "Remove access")
4. Confirm removal

### Webhook Check (if applicable)

1. Navigate to: `https://github.com/xxammaxx/Positron/settings/hooks`
2. Look for any CodeRabbit-related webhooks
3. Delete if found (CodeRabbit app removal may auto-remove these)

### Verification After Removal

After Owner completes removal:
- CodeRabbit status check should disappear from PR #295
- `coderabbitai` user should no longer appear as a reviewer
- The `CodeRabbit` StatusContext should no longer appear in PR status checks

---

## What the AI CAN Confirm (read-only)

| Check | Method | Result |
|-------|--------|--------|
| No `.coderabbit.yaml` in repo | `git ls-files` | ✅ Confirmed |
| No CodeRabbit in `.github/` | `git grep` | ✅ Confirmed |
| No CodeRabbit in PR templates | Manual review | ✅ Confirmed |
| CodeRabbit as GitHub App | `gh pr view` review author | ✅ Confirmed (`coderabbitai`) |
| CodeRabbit as StatusCheck | `gh pr view` statusCheckRollup | ✅ Confirmed |

---

## Recommendation

**Wait for Owner to complete GitHub App removal before final merge.**

While CodeRabbit is not an active configuration in the repository, the external app can still post comments and run checks on new pushes. Removing it from the repo settings ensures no further automated activity.

If the Owner prefers to keep the app installed but simply ignore its output (decommissioned from workflow), that is also valid — the Phase 17 decommission document makes clear that CodeRabbit findings are no longer decision-relevant.
