# Vibe Coding Evidence Log Template

> Version: 1.0.0 | Status: PROPOSED | Date: 2026-06-10
> Usage: Generated per run, posted as GitHub Issue comment

---

## Purpose

Der Evidence Log ist der abschließende Beleg, dass ein Positron-Run alle Qualitätsgates durchlaufen hat. Er wird als strukturierter GitHub-Kommentar im Issue gepostet und enthält alle Verweise auf Artefakte, Testergebnisse und Entscheidungen.

---

## Template (GitHub Comment Format)

```markdown
## Positron Run Complete

### Run Summary
| Field | Value |
|-------|-------|
| Run ID | `{runId}` |
| Branch | `{branch}` |
| Agent | `{agentType}` v{agentVersion} |
| Pipeline Profile | vibe-coding |
| Autonomy Level | {autonomyLevel} |
| Started | {startedAt} |
| Completed | {completedAt} |
| Duration | {duration} |
| Attempt | {attempt}/{maxAttempts} |

### Gate Results

| Gate | Status | Evidence |
|------|--------|----------|
| 🔍 Issue Context | ✅ PASS | Issue #{number} — "{title}" |
| 📦 Repository Context | ✅ PASS | {affectedModules} modules analyzed |
| 📋 Context Manifest | ✅ PASS | `{manifestPath}` |
| 📝 Specification | ✅ PASS | `{specPath}` ({lineCount} lines) |
| 🔒 Verification Contract | ✅ PASS | `{contractPath}` |
| 🔴 Red Tests | ✅ PASS | {redTestsCount} tests FAILING (expected) |
| 🤖 Agent Code | ✅ PASS | {filesChanged} files, +{insertions}/-{deletions} |
| 🟢 Green Tests | ✅ PASS | {passed}/{total} tests passing |
| 🛡️ Security Scan | ✅ PASS | 0 secrets, 0 critical vulns |
| 🔧 CI Gates | ✅ PASS | Lint ✅ Typecheck ✅ Build ✅ Coverage {pct}% |
| 🖥️ Sandbox Preview | ✅ PASS | [Preview URL]({previewUrl}) |
| 👁️ Reviewer Agent | ✅ PASS | `{reviewVerdict}` — {blockingCount} blocking, {nonBlockingCount} non-blocking |
| 👤 Human Approval | ✅ APPROVED | Approved by {approver} at {approvedAt} |
| 📄 Evidence Comment | ✅ POSTED | This comment |

### Files Changed
```
{git diff --stat output}
```

### Test Results
```
{test command}: {passed}/{total} passed
Duration: {testDuration}ms
Coverage: {coveragePercent}%
```

### Security
- Secret scan: {findings} findings (0 allowed)
- Dependency audit: {vulnCount} vulnerabilities ({critical} critical)
- SAST (Semgrep): {semgrepFindings} findings

### Preview
- URL: {previewUrl}
- Screenshot: [View]({screenshotUrl})
- Console errors: {consoleErrorCount}
- Network errors: {networkErrorCount}

### Reviewer-Agent Report
```json
{
  "verdict": "pass",
  "blockingFindings": [],
  "nonBlockingFindings": [],
  "evidenceChecked": ["test_report", "ci_status", "security_scan", "preview"],
  "missingEvidence": [],
  "riskLevel": "low",
  "humanApprovalRequired": true
}
```

### Architecture Decisions
| Decision | Rationale |
|----------|-----------|
| {decision} | {rationale} |

### Merge Status
- PR: #{prNumber} — {prUrl}
- Mergeable: {mergeable}
- Kill-switch: {killSwitchState}
- Decision: {mergeDecision}

---

### Evidence Artifacts
| Artifact | Path | Size | Hash |
|----------|------|------|------|
| Test Report | `{testReportPath}` | {size} | sha256:{hash} |
| Diff | `{diffPath}` | {size} | sha256:{hash} |
| Preview Screenshot | `{screenshotPath}` | {size} | sha256:{hash} |
| Security Scan | `{securityScanPath}` | {size} | sha256:{hash} |
| CI Logs | `{ciLogsUrl}` | — | — |

---

## Evidence Requirements Checklist

For a run to be considered COMPLETE, all required evidence items must be present:

- [ ] Test report artifact exists and shows pass status
- [ ] Diff summary is posted
- [ ] CI status is green (or non-blocking failures documented)
- [ ] Security scan completed with no blocking findings
- [ ] Preview URL/screenshot captured (if UI changes)
- [ ] Reviewer-Agent verdict posted
- [ ] Human approval event recorded (if required)
- [ ] All artifacts have valid SHA-256 hashes
- [ ] No secrets found in any artifact
- [ ] Merge decision documented

---

## JSON Schema (for machine consumption)

```json
{
  "$schema": "https://positron.dev/schemas/evidence-log-v1.json",
  "runId": "uuid",
  "issueNumber": 0,
  "branch": "positron/issue-N-slug",
  "agent": {
    "type": "opencode",
    "version": "1.15.5",
    "capabilities": ["repo_read", "code_write"]
  },
  "timing": {
    "startedAt": "ISO8601",
    "completedAt": "ISO8601",
    "durationMs": 0
  },
  "gates": [
    {
      "name": "test_run",
      "status": "pass",
      "evidence": {
        "passed": 42,
        "total": 42,
        "durationMs": 3400,
        "artifactPath": ".positron/runs/{runId}/evidence/test-report.json"
      }
    }
  ],
  "reviewerVerdict": {
    "verdict": "pass",
    "blockingFindings": 0,
    "nonBlockingFindings": 0,
    "riskLevel": "low",
    "humanApprovalRequired": false
  },
  "artifacts": [
    {
      "kind": "test-report",
      "path": ".positron/runs/{runId}/evidence/test-report.json",
      "sha256": "abc123...",
      "sizeBytes": 1234
    }
  ],
  "humanApproval": {
    "required": true,
    "approved": true,
    "approvedBy": "username",
    "approvedAt": "ISO8601"
  },
  "merge": {
    "prNumber": 0,
    "prUrl": "",
    "mergeable": true,
    "merged": false,
    "blockers": []
  }
}
```

---

## Posting Rules

1. **Always** post the Evidence Log as a GitHub Issue comment
2. **Never** post secrets or tokens (redacted before posting)
3. **Always** include artifact hashes for integrity verification
4. **Always** include the full gate matrix with pass/fail status
5. **Link** to CI runs, preview URLs, and artifact files
6. **Mark** any missing evidence clearly (do not claim "pass" without evidence)

---

## Relation to Other Systems

- **Audit Trail** (`.opencode/logs/audit/`): Raw tool-call logs → aggregated in Evidence Log
- **GitHubStatusSync** (`packages/github-adapter/`): Posts this comment via the sync service
- **Test Report** (`packages/sandbox/`): Test results feed into the Evidence Log
- **Playwright Evidence** (L4): Screenshots and traces referenced in Evidence Log
- **Prometheus Metrics**: Run success/failure feeds into observability stack
