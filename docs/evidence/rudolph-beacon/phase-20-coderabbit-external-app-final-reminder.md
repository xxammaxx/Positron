# Phase 20 — CodeRabbit External App Final Removal Reminder

## Metadata
- **Timestamp:** 2026-06-26T06:40:00Z
- **Phase:** 20 — Final Cleanup nach Rudolph Beacon Closure
- **Orchestrator:** issue-orchestrator (deepseek-v4-pro)
- **References:** Phase 17 decommission (`5494851`), Phase 19 reminder

## Core Principle (unchanged since Phase 17)

```text
CodeRabbit ist decommissioned.
CodeRabbit ist kein Gate.
CodeRabbit ist keine Entscheidungsgrundlage.
CodeRabbit darf nur historisch erwähnt werden.
```

## Current Status

| Level | Status | Detail |
|-------|--------|--------|
| Repo-intern (Code) | DECOMMISSIONED | Keine `.coderabbit.yaml`, keine `.coderabbit.yml` Dateien im Repo |
| Repo-intern (History) | DECOMMISSIONED | Commit `5494851` (`chore(issue-279): decommission CodeRabbit from PR 295 workflow`) |
| Repo-intern (Config) | CLEAN | Keine `coderabbit.yaml` unter `.github/` |
| Repo-intern (Workflow) | CLEAN | CodeRabbit ist kein erforderlicher Check |
| Externe GitHub App | UNKNOWN | KI hat keinen Zugriff auf Repository Settings → GitHub Apps |
| Externe Webhooks | UNKNOWN | KI hat keinen Zugriff auf Repository Settings → Webhooks |

## What the AI CAN do (already done in Phase 17)
- [x] Remove all repo-internal CodeRabbit config files
- [x] Document decommission in git history
- [x] Stop treating CodeRabbit reviews as gates
- [x] Stop treating CodeRabbit comments as blockers
- [x] Remove CodeRabbit from PR workflow requirements

## What the AI CANNOT do (requires Owner)
- [ ] Navigate to GitHub Repository Settings → Integrations → GitHub Apps
- [ ] Uninstall/remove the CodeRabbit GitHub App (`coderabbitai`)
- [ ] Remove CodeRabbit webhooks from Repository Settings → Webhooks
- [ ] Manage GitHub App permissions at organization level

## Owner Action Required

### Step-by-Step Guide for External App Removal

#### Step 1: Open Repository Settings
```
https://github.com/xxammaxx/Positron/settings
```

#### Step 2: Check GitHub Apps
1. Navigate to **Settings** → **Integrations** → **GitHub Apps**
2. Look for **"CodeRabbit"** or **"coderabbit"** or **"coderabbitai"**
3. If found:
   - Click on the App name
   - Click **"Uninstall"** or **"Remove"** or **"Revoke access"**
   - Confirm the removal

#### Step 3: Check Webhooks
1. Navigate to **Settings** → **Webhooks**
2. Look for any webhook with "CodeRabbit" or "coderabbit" in the URL or name
3. If found:
   - Click on the webhook
   - Scroll to bottom
   - Click **"Delete webhook"**
   - Confirm the deletion

#### Step 4: Verify (Optional)
After removal, you can request a verification run that checks:
- No CodeRabbit checks appear on PRs
- No CodeRabbit webhooks remain
- No CodeRabbit GitHub App is listed under Integrations

#### Step 5: Document (Optional)
If you complete the external removal, a follow-up evidence file can record:
```text
CODERABBIT_EXTERNAL_APP_STATUS: REMOVED_BY_OWNER
```

## Impact of NOT Removing the External App

The external CodeRabbit GitHub App, if still installed:
- May still post automated PR review comments
- May still run status checks (that are NOT required gates)
- Does NOT affect repository functionality
- Does NOT block merges (no branch protection rule depends on it)
- Is purely advisory and can be ignored per the Phase 17 decommission

## Relationship to Repository Operations

| Concern | Status |
|---------|--------|
| Does CodeRabbit block merges? | NO (decommissioned) |
| Does CodeRabbit affect CI? | NO (advisory-only, per Issue #268) |
| Does CodeRabbit affect local gates? | NO (local gates are source of truth) |
| Does CodeRabbit affect this Phase 20 run? | NO |
| Does CodeRabbit need to be removed for the repo to work? | NO |
| Is CodeRabbit removal a blocker for Rudolph Beacon closure? | NO |

## Classification

```text
CODERABBIT_EXTERNAL_APP_STATUS: OWNER_ACTION_REQUIRED
```

**Reasoning:** The AI has decommissioned CodeRabbit repo-internally (Phase 17) and has no access to GitHub Repository Settings. The external GitHub App removal is a Settings-level action that requires the repository Owner to navigate to Settings → Integrations → GitHub Apps. This can be done at any time and is not blocking any current or future repository operations.

## Historical Note

CodeRabbit was used in early phases of the Rudolph Beacon PR workflow. In Phase 17, it was fully decommissioned as a decision-making entity. All subsequent phases (18, 19, 20) treat CodeRabbit as historical only. The Phase 20 final cleanup marks the complete end of the CodeRabbit era in this repository.
