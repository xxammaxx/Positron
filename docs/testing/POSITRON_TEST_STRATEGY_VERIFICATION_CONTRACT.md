# Positron Test Strategy — Verification Contract

> Version: 1.0.0 | Date: 2026-06-10 | Branch: `chore/vibe-coding-orchestration`
> Scope: `positron-test-strategy-direct-integration`
> Parent Contract: `positron-core` (VIBE_CODING_VERIFICATION_CONTRACT.md)

---

## Contract (Machine-Readable)

```json
{
  "contractVersion": "1.0.0",
  "scope": "positron-test-strategy-direct-integration",
  "sourceOfTruth": "github_repository",
  "issue": {
    "number": 0,
    "title": "Positron Test Strategy — Direct Integration",
    "branch": "chore/vibe-coding-orchestration"
  },
  "requiredGates": [
    "repository_reality_gate",
    "test_layer_matrix",
    "contract_tests_for_new_agentic_artifacts",
    "adapter_conformance_tests",
    "context_manifest_validation",
    "evidence_log_validation",
    "reviewer_agent_contract_validation",
    "browser_e2e_console_network_gate",
    "ci_artifact_gate",
    "security_gate",
    "known_failures_classified",
    "human_approval_required"
  ],
  "optionalGates": [
    "mutation_test_baseline_update",
    "coverage_threshold_ratcheting",
    "accessibility_snapshot_assertions"
  ],
  "forbiddenClaims": [
    "all_tests_green_when_known_failures_exist",
    "mock_adapter_presented_as_production",
    "browser_verified_without_playwright_or_runtime_evidence",
    "security_pass_without_scan_or_reasoned_scope",
    "merge_ready_without_human_approval"
  ],
  "forbiddenOutcomes": [
    "test_regression",
    "secret_leakage",
    "coverage_decrease_below_threshold",
    "ci_gate_bypass",
    "known_failure_reclassification_without_fix"
  ],
  "acceptanceCriteria": [
    "Repository Reality Gate documented and up to date",
    "Test strategy matrix maps to actual repo state",
    "Red tests exist for all new agentic contract types",
    "Known failures classified as FIXABLE or MITIGATABLE",
    "No new test regressions introduced",
    "CI gates run all test layers separately",
    "Evidence artifacts uploaded on failure",
    "Browser E2E tests include console/network error gates",
    "Reviewer-Agent report validates against this contract",
    "Human approval required for merge"
  ],
  "testStrategy": {
    "unitRequired": true,
    "contractRequired": true,
    "safetyRequired": true,
    "propertyRequired": true,
    "e2eRequired": false,
    "redTestsBeforeImplementation": true,
    "frameworks": ["vitest", "playwright", "fast-check", "stryker"],
    "coverageTargets": {
      "global": {"lines": 30, "statements": 30, "functions": 32, "branches": 25},
      "safety": {"lines": 100, "statements": 100, "functions": 100, "branches": 100}
    }
  },
  "mergePolicy": "no_merge_without_evidence",
  "evidenceRequirements": {
    "testReport": true,
    "ciStatus": true,
    "securityScan": true,
    "previewOrRuntimeEvidence": false,
    "reviewerVerdict": true,
    "humanApproval": true
  }
}
```

---

## Gate Definitions

### 1. Repository Reality Gate
- **Check:** `docs/audits/REPOSITORY_REALITY_GATE.md` exists and matches current git state
- **Evidence:** Document with commit hash, test statistics, known failures
- **Blocking:** Yes

### 2. Test Layer Matrix
- **Check:** `docs/testing/POSITRON_TEST_STRATEGY.md` maps all 7 layers to actual configs
- **Evidence:** Layer matrix table with Status/CI Gate/Evidence columns
- **Blocking:** Yes

### 3. Contract Tests for New Agentic Artifacts
- **Check:** Contract test files exist for:
  - Agent Capability Registry (`packages/shared/src/__contracts__/agent-capability-registry.contract.test.ts`)
  - Coding Agent Adapter (`packages/opencode-adapter/src/__contracts__/coding-agent-adapter.contract.test.ts`)
  - Evidence Log (`packages/shared/src/__contracts__/evidence-log.contract.test.ts`)
  - Reviewer Report (`packages/shared/src/__contracts__/reviewer-report.contract.test.ts`)
- **Evidence:** All contract tests pass
- **Blocking:** Yes

### 4. Adapter Conformance Tests
- **Check:** Each adapter has conformance tests against its interface
- **Evidence:** Adapter conformance test report
- **Blocking:** Yes

### 5. Context Manifest Validation
- **Check:** Context manifest type exists and has validation tests
- **Evidence:** Test file: `packages/shared/src/__tests__/context-manifest.test.ts`
- **Blocking:** Yes

### 6. Evidence Log Validation
- **Check:** Evidence log type exists and has structural validation tests
- **Evidence:** Test file: `packages/shared/src/__tests__/evidence-log.test.ts`
- **Blocking:** Yes

### 7. Reviewer-Agent Contract Validation
- **Check:** ReviewReport type exists and verdict rules are testable
- **Evidence:** Test file: `packages/shared/src/__tests__/reviewer-report.test.ts`
- **Blocking:** Yes

### 8. Browser E2E Console/Network Gate
- **Check:** Playwright E2E tests capture console errors and network failures
- **Evidence:** Console/network assertions in E2E test output
- **Blocking:** No (non-blocking until stability window)

### 9. CI Artifact Gate
- **Check:** CI uploads test reports, traces, screenshots on failure
- **Evidence:** `quality-gates.yml` artifact uploads configured
- **Blocking:** Yes

### 10. Security Gate
- **Check:** No secrets in test files, no security regressions
- **Evidence:** Existing secret-manager safety tests pass
- **Blocking:** Yes

### 11. Known Failures Classified
- **Check:** Each known failure is documented as FIXABLE or MITIGATABLE
- **Evidence:** Known failure section in `REPOSITORY_REALITY_GATE.md`
- **Blocking:** No (documentation-only)

### 12. Human Approval Required
- **Check:** Merge cannot proceed without human approval
- **Evidence:** Human approval recorded in Evidence Log
- **Blocking:** Yes

---

## Gate Validation Matrix

| # | Gate | Implementation Status | Evidence |
|---|------|----------------------|----------|
| 1 | Repository Reality Gate | ✅ DONE | `docs/audits/REPOSITORY_REALITY_GATE.md` |
| 2 | Test Layer Matrix | ✅ DONE | `docs/testing/POSITRON_TEST_STRATEGY.md` |
| 3 | Agentic Contract Tests | 🔴 PENDING | Red test files to create |
| 4 | Adapter Conformance | 🔴 PENDING | Conformance tests to create |
| 5 | Context Manifest Validation | 🔴 PENDING | Type + test to create |
| 6 | Evidence Log Validation | 🔴 PENDING | Type + test to create |
| 7 | Reviewer Contract Validation | 🔴 PENDING | Type + test to create |
| 8 | Browser E2E Console/Network | 🟡 EXISTING (partial) | E2E tests capture, no assert |
| 9 | CI Artifact Gate | 🟡 EXISTING (partial) | Artifacts uploaded, no evidence gate job |
| 10 | Security Gate | 🟡 EXISTING (partial) | Safety tests exist, agentic gates missing |
| 11 | Known Failures Classified | ✅ DONE | `REPOSITORY_REALITY_GATE.md` |
| 12 | Human Approval Required | 🔴 PENDING | Evidence log to implement |

---

## Red Test Requirement

Before any implementation code is written for the new agentic contracts, **red tests MUST exist and fail**. The following red test files will be created:

### Red Tests for Agent Capability Registry
```typescript
// packages/shared/src/__contracts__/agent-capability-registry.contract.test.ts
// Tests:
// - Invalid capability is rejected
// - Adapter without riskLevel is rejected
// - Adapter without trustTier is rejected
// - Adapter claims capability but provides no evidence
// - Fake adapter cannot run in Production profile
```

### Red Tests for Adapter Contracts
```typescript
// packages/opencode-adapter/src/__contracts__/coding-agent-adapter.contract.test.ts
// Tests:
// - Every adapter must implement CodingAgentAdapter
// - Real/Fake adapters must be clearly distinguishable
// - Adapter must not write unredacted secrets in logs/evidence
// - Adapter must return typed errors
// - Adapter must provide reproducible evidence
```

### Red Tests for Context Manifest
```typescript
// packages/shared/src/__tests__/context-manifest.test.ts
// Tests:
// - Manifest without sourceOfTruth is rejected
// - Manifest with secret-like values is rejected or redacted
// - Manifest without token budget is rejected
// - Manifest without Freshness/Ownership/Confidence is rejected
// - Hot/Warm/Cold context is separated
```

### Red Tests for Evidence Log
```typescript
// packages/shared/src/__tests__/evidence-log.test.ts
// Tests:
// - Evidence without test proof is rejected
// - Evidence without root cause on fix is rejected
// - Evidence with "green" claim despite failing tests is rejected
// - Evidence with mock-as-production claim is rejected
// - Evidence without human approval status is rejected
```

### Red Tests for Reviewer Report
```typescript
// packages/shared/src/__tests__/reviewer-report.test.ts
// Tests:
// - Reviewer must not give PASS when verification contract is missing
// - Reviewer must not give PASS when tests are missing
// - Reviewer must not give PASS when security gate is missing
// - Reviewer must distinguish Blocking vs Non-Blocking findings
```

### Red Tests for Vibe-Coding Pipeline
```typescript
// packages/shared/src/__tests__/pipeline-profile.test.ts
// Tests:
// - Pipeline must not allow merge without evidence
// - Pipeline must not allow merge without human approval
// - Pipeline must distinguish Mock/Demo/Real profiles
// - Pipeline must define rollback/abort points
```

---

## Forbidden Claims (Test Strategy Specific)

| Claim | Required Evidence |
|-------|-------------------|
| "All tests green" | Must note known failures count |
| "Mock adapter is production" | NEVER allowed |
| "Browser verified" | Playwright trace/screenshot required |
| "Security pass" | Safety test results + secret scan |
| "Merge ready" | All 12 gates + human approval |
| "Contract complete" | All contract tests pass |
| "Evidence complete" | Evidence log with all artifacts |

---

## Contract Validation Pipeline

```
1. Repository Reality Gate captured
   ↓
2. Test Strategy document created (THIS DOCUMENT)
   ↓
3. Verification Contract defined (THIS DOCUMENT)
   ↓
4. Red Tests written (must FAIL — types don't exist yet)
   ↓
5. Shared types implemented (packages/shared/src/)
   ↓
6. Red Tests → Green Tests (types now exist)
   ↓
7. CI Gates enhanced
   ↓
8. Known Failures fixed/classified
   ↓
9. Evidence documents created
   ↓
10. Reviewer-Agent validates against this contract
   ↓
11. Human Approval Gate
   ↓
12. Evidence Log posted
```

---

*Verification contract created 2026-06-10.*
