# CodeRabbit Audit Report

**Issue:** #165 — Phase 2 Hardening
**Date:** 2026-06-04
**Status:** UNVERIFIED (App not installed)

---

## Investigation Summary

| Check | Result | Evidence |
|-------|--------|----------|
| `.coderabbit.yaml` exists | ✅ VERIFIED | File present at repo root (65 lines, valid YAML) |
| GitHub App installed on repo | ❌ NOT INSTALLED | API: `GET /repos/xxammaxx/Positron/installation` → 401 |
| GitHub App on user account | ❌ CANNOT VERIFY | API: `GET /user/installations` → 403 (needs app token) |
| CodeRabbit check runs on PR #175 | ❌ NONE FOUND | 6 GitHub Actions checks, 0 CodeRabbit checks |
| CodeRabbit check runs on PR #176 | ❌ NONE FOUND | PR just created, no checks yet |
| Webhooks configured | ❌ NONE | `GET /repos/.../hooks` returns empty array |
| Repo visibility | ⚠️ PRIVATE | `GET /repo` → `"private": true` |

## Detailed Findings

### 1. Configuration File (VERIFIED)

`.coderabbit.yaml` exists and is properly formatted:

```yaml
language: en-US
early_access: false
reviews:
  profile: assertive
  request_changes_workflow: false
  auto_review:
    enabled: true
    drafts: false
  tools:
    eslint: true
    semgrep: true
    actionlint: true
    gitleaks: true
chat:
  auto_reply: true
```

The configuration requests auto-review on all PRs and enables multiple analysis tools. However, the configuration file is meaningless without the GitHub App installed.

### 2. GitHub App Installation (UNVERIFIED)

The API endpoint `/repos/xxammaxx/Positron/installation` returns HTTP 401 (`A JSON web token could not be decoded`). This response typically means:

- **No GitHub App is installed** on the repository
- OR the personal access token lacks the required permissions

The `/user/installations` endpoint returns HTTP 403, which requires a GitHub App bearer token — this confirms the personal access token (`gh` CLI) cannot query App installations.

### 3. PR Check Runs (VERIFIED)

On commit `2231ddd` (latest on PR #175), the following checks exist:

| Check | Provider | Status |
|-------|----------|--------|
| `build-and-test` | GitHub Actions | ✅ success |
| `e2e-playwright` | GitHub Actions | ❌ failure |
| `Analyze JavaScript/TypeScript` | GitHub Actions (CodeQL) | ❌ failure |
| `mutation-fast` | GitHub Actions | ✅ success |
| `observability-config-check` | GitHub Actions | ✅ success |
| `Semgrep Scan` | GitHub Actions | ✅ success |
| **CodeRabbit** | — | **NOT PRESENT** |

Zero CodeRabbit check runs on any PR. No `coderabbit` or `coderabbitai` app name appears in any check run.

### 4. Webhook Configuration (VERIFIED)

The repository has **zero configured webhooks**. CodeRabbit operates as a GitHub App, not a webhook, so this is expected but confirms no alternative integration is active.

### 5. Repository Visibility (VERIFIED)

The repository is **PRIVATE** (`"private": true`). This is relevant because:

- CodeRabbit's **free tier** may only support **public repositories**
- The [CodeRabbit pricing page](https://coderabbit.ai/pricing) states: "Free forever for open-source/public repositories"
- Private repos may require a paid plan or a trial

## Root Cause Analysis

**Primary hypothesis:** CodeRabbit is **NOT installed** as a GitHub App on the `xxammaxx/Positron` repository. The `.coderabbit.yaml` file was created in Phase 1 but the App installation step was never completed.

**Secondary factor:** Even if the App were installed, the **private repository** status may require a paid CodeRabbit plan. The free tier is documented as "open-source/public repositories only."

## Recommended Actions

1. **Verify App installation:** Go to https://github.com/apps/coderabbit-ai → Configure → Check if `xxammaxx/Positron` is listed under "Repository access"
2. **Install if missing:** If not installed, click "Install" and grant access to `xxammaxx/Positron`
3. **Check plan eligibility:** If private repos require a paid plan, either:
   - Use CodeRabbit's free trial (14 days for private repos)
   - Make the repository public (if acceptable)
   - Accept that CodeRabbit is unavailable and update documentation
4. **Post-install verification:** After installation, create a test PR to verify CodeRabbit posts a review
5. **Update `.coderabbit.yaml`:** If private repo support is confirmed, no changes needed

## Blockers

| Blocker | Impact | Resolution |
|---------|--------|------------|
| No App installation | CodeRabbit reviews cannot occur | Manual GitHub admin action required |
| Private repository | May require paid plan | Check CodeRabbit pricing/terms |
| Cannot verify via API | Automated verification impossible | Requires manual GitHub UI check |

## Evidence

- `.coderabbit.yaml`: File exists at `/home/xxammaxx/Schreibtisch/Positron/.coderabbit.yaml`
- API response `/installation`: `{"message":"A JSON web token could not be decoded"}`
- API response `/hooks`: `[]` (empty array)
- Check runs on `2231ddd`: 6 GitHub Actions, 0 CodeRabbit (verified via `gh api /repos/.../check-runs`)
- Repo visibility: `"private": true` (verified via `gh api /repos/...`)

---

**Conclusion:** CodeRabbit is configured but **NOT actually operational**. The Layer 1 code review gate remains **UNVERIFIED** until the App is installed and produces at least one review on a PR.
