# Reviewer-Agent Contract

> Version: 1.0.0-draft | Status: PROPOSED | Date: 2026-06-10
> Related: ADR-001, VIBE_CODING_ORCHESTRATION.md

---

## Purpose

Definiert den formalen Contract für den Positron Reviewer-Agenten. Der Reviewer prüft Änderungen nicht nur stilistisch, sondern validiert gegen den Verification Contract. Ausgabe ist ein maschinenlesbarer Report.

---

## Core Principle

> Der Reviewer-Agent validiert nicht Meinungen, sondern Fakten: Wurde das Issue erfüllt? Stimmen Spec und Implementierung überein? Sind alle Gates grün?

---

## Reviewer-Agent Interface

```typescript
interface ReviewerAgent {
  review(input: ReviewInput): Promise<ReviewReport>;
}

interface ReviewInput {
  runId: string;
  issue: {
    number: number;
    title: string;
    body: string;
  };
  specification: {
    path: string;
    acceptanceCriteria: string[];
  };
  verificationContract: {
    requiredGates: string[];
    forbiddenOutcomes: string[];
  };
  implementation: {
    diffSummary: DiffSummary;
    filesChanged: FileChange[];
    agentType: string;
    agentCapabilities: string[];
  };
  evidence: {
    testReport: TestReport;
    ciStatus: CiStatus;
    securityScan: SecurityScanReport;
    previewScreenshot?: string;
    previewUrl?: string;
    agentLogs?: string[];
  };
}
```

---

## Review Checklist (Mandatory)

### 1. Issue Fulfilment
- [ ] Issue title/body understood and addressed?
- [ ] All acceptance criteria from specification met?
- [ ] No feature creep beyond issue scope?
- [ ] Issue labels match implementation (bug → fix, feature → add)?

**Scoring:** Pass if ALL criteria met. Fail if any criterion unmet.

### 2. Spec-Implementation Alignment
- [ ] Specification exists and was used during implementation?
- [ ] Plan covers all spec items?
- [ ] Tasks correspond to implemented changes?
- [ ] No implementation without corresponding task?

**Scoring:** Pass if ALL criteria met. Warning if spec is partial.

### 3. Red-Test Verification
- [ ] Red tests were written BEFORE implementation?
- [ ] Red tests failed before code changes (evidence required)?
- [ ] Red tests cover the acceptance criteria?
- [ ] Red tests are in correct test framework?

**Scoring:** Blocking fail if red tests missing or untested.

### 4. Implementation Quality
- [ ] All tests pass (green)?
- [ ] New tests added for new code?
- [ ] No test regressions (existing tests still pass)?
- [ ] Lint and typecheck pass?
- [ ] Build succeeds?
- [ ] Coverage thresholds met?

**Scoring:** Pass if all green. Fail if any blocking quality gate fails.

### 5. Security Surface
- [ ] No secrets in code, comments, logs? (Secret scan: 0 findings)
- [ ] No dependency vulnerabilities? (npm audit: 0 critical)
- [ ] No unsafe shell commands? (sudo, rm -rf outside workspace)
- [ ] No hardcoded credentials?
- [ ] File paths within allowed scope?

**Scoring:** Blocking fail if any security finding.

### 6. Mock/Demo Code Detection
- [ ] No fake adapter used in production code path?
- [ ] No mock implementations in production exports?
- [ ] Demo-only features clearly separated?
- [ ] `isFake: true` / `isMock: true` / `isDemo: true` flags correct?

**Scoring:** Blocking fail if mock/fake/demo in production path.

### 7. UI Verification (if applicable)
- [ ] Preview screenshot captured?
- [ ] Preview URL accessible?
- [ ] No visible regressions in UI?
- [ ] Console error count acceptable?
- [ ] Network errors acceptable?

**Scoring:** Blocking fail if UI changes without preview evidence.

### 8. Evidence Integrity
- [ ] All evidence artifacts exist and are accessible?
- [ ] Artifact hashes match recorded values?
- [ ] Timestamps are consistent (evidence after implementation)?
- [ ] No fabricated or placeholder evidence?
- [ ] CI status is genuine (linked CI run exists)?

**Scoring:** Blocking fail if evidence missing or inconsistent.

### 9. Reviewer Comment Validation
- [ ] Evidence Log contains all required sections?
- [ ] Claims in Evidence Log are supported by artifacts?
- [ ] No unsupported claims ("100% tested" without coverage report)?
- [ ] No vendor hallucinations?

**Scoring:** Warning if unsupported claims.

---

## ReviewReport Structure

```typescript
interface ReviewReport {
  verdict: 'pass' | 'changes_requested' | 'fail';

  blockingFindings: ReviewFinding[];
  nonBlockingFindings: ReviewFinding[];

  checklistResults: {
    issueFulfilment: 'pass' | 'fail' | 'partial';
    specAlignment: 'pass' | 'fail' | 'warning';
    redTestVerification: 'pass' | 'fail' | 'not_applicable';
    implementationQuality: 'pass' | 'fail';
    securitySurface: 'pass' | 'fail';
    mockDetection: 'pass' | 'fail' | 'not_applicable';
    uiVerification: 'pass' | 'fail' | 'not_applicable';
    evidenceIntegrity: 'pass' | 'fail';
  };

  evidenceChecked: string[];
  missingEvidence: string[];

  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  humanApprovalRequired: boolean;

  summary: string;
  recommendations: string[];

  reviewedAt: string;
  reviewedBy: string; // "review-agent" or agent version
}

interface ReviewFinding {
  id: string;
  severity: 'blocking' | 'warning' | 'info';
  category: string; // one of the checklist categories
  description: string;
  location?: string; // file path or evidence reference
  recommendation: string;
}
```

---

## Verdict Rules

| Verdict | Condition |
|---------|-----------|
| **pass** | All checklist items pass. Zero blocking findings. |
| **changes_requested** | One or more blocking findings. Implementation must be revised. |
| **fail** | Critical security or evidence integrity failure. Run cannot proceed. |

---

## Human Approval Trigger Rules

`humanApprovalRequired: true` when:

1. `riskLevel >= high` (any blocking security finding)
2. `verdict === 'fail'` (requires human override)
3. Agent `trustTier >= 2` (e.g., Devin cloud agent)
4. Protected files modified (`.env`, `package-lock.json`, `docker-compose.yml`)
5. Merge target is `main`/`master`
6. `POSITRON_ENABLE_MERGE` is `false` (human must manually merge)
7. First run for a new agent type (unfamiliar agent)

---

## JSON Output Example

```json
{
  "verdict": "pass",
  "blockingFindings": [],
  "nonBlockingFindings": [
    {
      "id": "REV-W001",
      "severity": "warning",
      "category": "implementationQuality",
      "description": "Coverage decreased from 35% to 34% in auth module",
      "location": "apps/server/src/auth.ts",
      "recommendation": "Add test for new timeout configuration path"
    }
  ],
  "checklistResults": {
    "issueFulfilment": "pass",
    "specAlignment": "pass",
    "redTestVerification": "pass",
    "implementationQuality": "pass",
    "securitySurface": "pass",
    "mockDetection": "pass",
    "uiVerification": "not_applicable",
    "evidenceIntegrity": "pass"
  },
  "evidenceChecked": [
    "test_report",
    "ci_status",
    "security_scan",
    "diff_summary"
  ],
  "missingEvidence": [],
  "riskLevel": "low",
  "humanApprovalRequired": false,
  "summary": "All gates pass. One non-blocking coverage warning.",
  "recommendations": [
    "Add unit test for LOGIN_TIMEOUT_MS env var handling"
  ],
  "reviewedAt": "2026-06-10T14:30:00Z",
  "reviewedBy": "review-agent v1.0"
}
```

---

## Integration Points

1. **Pipeline:** Nach IMPLEMENT + TEST vor PR_CREATE
2. **Gate:** ReviewReport.verdict === 'pass' → PR_CREATE; 'changes_requested' → IMPLEMENT (Fix Loop); 'fail' → FAILED_BLOCKED
3. **UI:** ReviewReport wird im Quality Panel angezeigt
4. **Evidence Log:** ReviewReport wird in den finalen Evidence-Kommentar eingebettet
5. **Current State:** Der `review-agent` Skill existiert als "Allowed Skill #2" im Skills-Inventory. Der formale Contract ist NEU.

---

## Existing Integration

Positron hat bereits einen `review-agent` als Subagent-Typ registriert:
- `docs/security/external-skills-inventory.md`: "review-agent — Code-Qualitätsprüfung — Read-only — niemals schreibend"
- AGENTS.md: "review-agent is leaf node — never delegates to others"

Dieser Contract erweitert den bestehenden Agenten um:
1. Formale Checkliste mit Scoring
2. Maschinenlesbarem ReviewReport-Schema
3. Integration in die Pipeline-Steuerung
4. Evidence-Validierung gegen Verification Contract
