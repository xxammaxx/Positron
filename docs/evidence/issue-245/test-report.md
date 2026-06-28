# Test Report — Issue #245

**Generated:** 2026-06-28T00:00:00Z  
**Orchestrator:** issue-orchestrator (deepseek-v4-pro)

## Test Results Summary

| Category | Files | Tests | Status |
|----------|-------|-------|--------|
| All Packages | 69 | 1559 | ✅ ALL PASSED |
| Web App | 8 | 196 | ✅ ALL PASSED |
| **Total** | **77** | **1755** | ✅ ALL PASSED |

## Audit Enforcement Tests (New)

### gateway.test.ts — Gate 9 Unit Tests

| # | Test | Status |
|---|------|--------|
| 1 | Block when requiresAuditLog is true and no onAudit callback | ✅ PASS |
| 2 | Allow when requiresAuditLog is true and onAudit succeeds | ✅ PASS |
| 3 | Block when onAudit throws | ✅ PASS |
| 4 | NOT block when requiresAuditLog is not set | ✅ PASS |
| 5 | NOT reach audit gate when earlier gate blocks (disabled gateway) | ✅ PASS |

### audit-enforcement.test.ts — Red/Negative Tests

| # | Test | Status |
|---|------|--------|
| 1 | Block write tool with requiresAuditLog when no audit callback configured | ✅ PASS |
| 2 | Block destructive tool with requiresAuditLog when no audit callback configured | ✅ PASS |
| 3 | Allow write tool with requiresAuditLog when audit callback succeeds | ✅ PASS |
| 4 | Block tool when audit callback throws | ✅ PASS |
| 5 | Call audit callback BEFORE tool execution | ✅ PASS |
| 6 | NOT call tool handler when audit gate blocks | ✅ PASS |
| 7 | NOT block read-only tool without requiresAuditLog | ✅ PASS |
| 8 | Block read-only tool WITH requiresAuditLog when no audit callback | ✅ PASS |
| 9 | Allow read-only tool with requiresAuditLog when audit callback succeeds | ✅ PASS |
| 10 | Block at Gate 1 (disabled) even when audit callback is configured | ✅ PASS |
| 11 | Block sealed registry tool at Gate 3 when not found | ✅ PASS |
| 12 | Block unapproved human_required tool when audit passes (Gate 6 priority) | ✅ PASS |
| 13 | Block schema validation failures when audit is configured (Gate 2 priority) | ✅ PASS |
| 14 | Pass call context to audit callback for evidence creation | ✅ PASS |
| 15 | Not expose tool arguments in block reason when audit fails | ✅ PASS |
| 16 | Not reference GateType layers in block reasons | ✅ PASS |
| 17 | Set evidenceEventId from pre-execution audit when onEvidence not configured | ✅ PASS |
| 18 | Allow post-execution evidence to override pre-execution audit ID | ✅ PASS |
| 19 | Allow tool without requiresAuditLog even when onAudit is configured | ✅ PASS |
| 20 | Handle undefined requiresAuditLog same as false | ✅ PASS |

## Existing Tests (No Regressions)

All 1735 pre-existing tests continue to pass. Key categories verified:
- GatewayService 8-gate pipeline ✅
- Scanner security validation ✅
- Registry operations and sealing ✅
- Red-team: path traversal, secret leakage, phase violation, egress, autonomy, approval, shell injection, tool poisoning ✅
- Hardening fixes including evidence generation ✅
- All built-in tools (repo, tests, github, evidence) ✅
- Sandbox policies (stop-ask, commit, opencode) ✅
- Shared utilities (secret manager, decision manifest, safe-apply-plan) ✅
- Server observability ✅
- Web UI components (voice, dashboard, pipeline, blueprint) ✅

## Classification

```text
ISSUE_245_TEST_STATUS: GREEN
```
