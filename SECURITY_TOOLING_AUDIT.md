# Security Tooling Audit Report

**Issue:** #165 — Phase 2 Hardening
**Date:** 2026-06-04
**Status:** PARTIALLY VERIFIED (Code Scanning disabled)

---

## Investigation Summary

| Tool | Status | Evidence |
|------|--------|----------|
| Semgrep SAST | ✅ VERIFIED | Workflow runs, produces SARIF, artifact uploaded |
| CodeQL Code Scanning | ⚠️ PARTIALLY VERIFIED | Workflow runs, analysis step fails |
| Code Scanning (GitHub) | ❌ NOT ENABLED | API: `GET /code-scanning/alerts` → 403 "not enabled" |
| SARIF Upload (to GitHub) | ❌ NOT FUNCTIONAL | Upload step fails silently (no backend) |
| SARIF Upload (as artifact) | ✅ VERIFIED | Artifact `semgrep-sarif.zip` saved successfully |
| Dependabot Alerts | ❌ DISABLED | API: `GET /dependabot/alerts` → 403 "disabled" |
| Security Tab | ❌ NOT ACCESSIBLE | URL `/security` → 404 |

## Detailed Findings

### 1. Semgrep SAST (VERIFIED)

**Workflow:** `.github/workflows/semgrep.yml`
**Status:** Running on PR #175. The scan step succeeds. The SARIF upload step was fixed (made non-failing in Block 1).

**Last run (ID 26933552900):**
- Semgrep scan: ✅ completed
- SARIF artifact: ✅ `semgrep-sarif.zip` (512 bytes, ID 7404028670)
- SARIF upload to Code Scanning: ⚠️ Skipped (non-failing after Block 1 fix)
- Root cause for upload failure: `Resource not accessible by integration` — Code Scanning not enabled

**Artifact evidence:** SARIF file is saved as a CI artifact (retention: 7 days), but cannot be consumed by GitHub Code Scanning because the feature is disabled.

### 2. CodeQL Code Scanning (PARTIALLY VERIFIED)

**Workflow:** `.github/workflows/codeql.yml`
**Status:** Running on PR #175. Initialization and Autobuild succeed. Analysis step fails.

**Last run (ID 26933552916):**
| Step | Status |
|------|--------|
| Initialize CodeQL | ✅ success |
| Autobuild | ✅ success |
| Perform CodeQL Analysis | ❌ failure |
| Upload SARIF as artifact | ✅ success |

**Root cause for analysis failure:** The autobuild step runs `npm run build` which was failing due to TypeScript compilation errors (missing OTel/Sentry module declarations). This was fixed in Block 1 (`env.d.ts` added). The next CI run should succeed for the build step.

However, even if the analysis completes, the **SARIF results cannot be uploaded** to GitHub Code Scanning because the feature is disabled.

### 3. GitHub Code Scanning (NOT ENABLED)

**API Evidence:**
```
GET /repos/xxammaxx/Positron/code-scanning/alerts → 403
"Code scanning is not enabled for this repository.
Please enable code scanning in the repository settings."
```

```
GET /repos/xxammaxx/Positron/code-scanning/analyses → 403
"Code scanning is not enabled for this repository."
```

**Impact:**
- SARIF uploads from Semgrep and CodeQL are silently discarded
- No Code Scanning alerts appear in the Security tab
- The Security tab (`/security`) returns 404
- Merge blocking based on Code Scanning findings is impossible

### 4. Dependabot Alerts (DISABLED)

**API Evidence:**
```
GET /repos/xxammaxx/Positron/dependabot/alerts → 403
"Dependabot alerts are disabled for this repository.
This API operation needs the 'admin:repo_hook' scope."
```

**Impact:**
- No automated vulnerability alerts for npm dependencies
- The `npm audit` output in CI (9 vulnerabilities: 5 moderate, 3 high, 1 critical) has no automated tracking

### 5. CI Workflow Permissions

**Semgrep workflow permissions:**
```yaml
permissions:
  security-events: write
  contents: read
```

**CodeQL workflow permissions:**
```yaml
permissions:
  security-events: write
  contents: read
  actions: read
```

Both workflows request `security-events: write` — this is correct and sufficient for SARIF uploads once Code Scanning is enabled.

### 6. Repository Security Posture

| Aspect | Status |
|--------|--------|
| Repository visibility | Private |
| Code Scanning | Not enabled |
| Dependabot alerts | Disabled |
| Dependabot security updates | Unknown (likely disabled) |
| Secret scanning | Unknown (likely disabled for private repos without Advanced Security) |
| Branch protection | Unknown |

## CI Verification Automation

A CI check that verifies Security Tab / Code Scanning status is **theoretically possible** but **not practical**:

- The `code-scanning/alerts` API requires Code Scanning to be enabled (cannot query if disabled)
- No GitHub API endpoint reports "is code scanning enabled?" directly
- A workaround would be to check if `GET /code-scanning/alerts` returns 403 vs 200, but this requires a token with appropriate permissions

**Recommendation:** Create a manual checklist item rather than an automated CI check. The Security Tab activation is a one-time repo configuration task.

## Blockers

| Blocker | Impact | Resolution |
|---------|--------|------------|
| Code Scanning not enabled | SARIF uploads fail silently | Enable in Repo Settings → Security → Code Scanning |
| Dependabot disabled | No automated dependency alerts | Enable in Repo Settings → Security → Dependabot |
| Private repository | May limit free feature availability | Check GitHub Free plan limits for private repos |
| `admin:repo_hook` scope missing | Cannot verify Dependabot via API | Run `gh auth refresh -s admin:repo_hook` |

## Recommended Actions

1. **Enable Code Scanning:** Repo Settings → Security → Code scanning → Enable (free for public repos, may require GitHub Advanced Security for private repos)
2. **Enable Dependabot:** Repo Settings → Security → Dependabot alerts → Enable
3. **Enable Dependabot security updates:** Repo Settings → Security → Dependabot security updates → Enable
4. **After enabling:** Trigger a workflow run on PR #175 to verify SARIF uploads succeed
5. **Document:** If private repo limitations prevent free use, document the constraint and accept artifact-only SARIF storage

---

**Conclusion:** The SAST tooling (Semgrep, CodeQL) is **configured and running**. However, the GitHub-native security features (Code Scanning, Dependabot) are **disabled**, rendering the SARIF uploads ineffective. The tooling is PARTIALLY VERIFIED — CI workflows execute but cannot deliver results to their intended destination.
