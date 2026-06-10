# Vibe Coding Verification Contract

> Version: 1.0.0 | Status: PROPOSED | Date: 2026-06-10
> Related: ADR-001, VIBE_CODING_ORCHESTRATION.md

---

## Purpose

Definiert den maschinenlesbaren Verification Contract, der VOR jeder Implementierung aus der Specification abgeleitet wird. Der Contract dient als "Source of Truth" für alle nachfolgenden Gates und als Prüfgrundlage für den Reviewer-Agenten.

---

## Contract Schema

```json
{
  "$schema": "https://positron.dev/schemas/verification-contract-v1.json",
  "contractVersion": "1.0.0",
  "scope": "vibe-coding-orchestration",
  "issue": {
    "number": 0,
    "title": "",
    "url": ""
  },
  "sourceOfTruth": "github",
  "requiredGates": [],
  "optionalGates": [],
  "forbiddenOutcomes": [],
  "acceptanceCriteria": [],
  "testStrategy": {
    "unitRequired": true,
    "integrationRequired": false,
    "e2eRequired": false,
    "redTestsBeforeImplementation": true
  },
  "mergePolicy": "no_merge_without_evidence",
  "evidenceRequirements": {
    "testReport": true,
    "ciStatus": true,
    "securityScan": true,
    "previewOrRuntimeEvidence": true,
    "reviewerVerdict": true,
    "humanApproval": true
  }
}
```

---

## Global Verification Contract (Positron Core)

Der folgende Contract gilt für alle Positron-Runs:

```json
{
  "contractVersion": "1.0.0",
  "scope": "positron-core",
  "sourceOfTruth": "github",
  "requiredGates": [
    "repository_reality_gate",
    "agent_capability_contract",
    "adapter_contract",
    "worktree_or_sandbox_isolation",
    "red_tests_or_test_plan",
    "ci_status",
    "security_scan",
    "preview_or_runtime_evidence",
    "reviewer_agent_verdict",
    "human_approval"
  ],
  "forbiddenClaims": [
    "productivity_guarantee_without_evidence",
    "vendor_capability_without_source",
    "mock_adapter_presented_as_production",
    "green_status_without_test_or_preview_evidence"
  ],
  "acceptanceCriteria": [
    "Repository reality gate completed before any changes",
    "Agent capabilities declared via Capability Registry",
    "All adapters implement CodingAgentAdapter interface",
    "Worktree isolation verified per agent run",
    "Red tests exist and fail before implementation",
    "All CI gates green (or non-blocking failures documented)",
    "Security scan shows zero blocking findings",
    "Preview screenshot or runtime log captured",
    "Reviewer-Agent verdict is 'pass'",
    "Human approval recorded for merge operations"
  ],
  "testStrategy": {
    "unitRequired": true,
    "contractRequired": true,
    "safetyCoverageGate": 100,
    "globalCoverageFloor": 30
  },
  "mergePolicy": "no_merge_without_evidence",
  "evidenceRequirements": {
    "testReport": true,
    "ciStatus": true,
    "securityScan": true,
    "previewOrRuntimeEvidence": true,
    "reviewerVerdict": true,
    "humanApproval": true
  }
}
```

---

## Per-Issue Contract Template

Jeder Positron-Run erzeugt einen Issue-spezifischen Contract:

```json
{
  "contractVersion": "1.0.0",
  "scope": "issue-N-short-description",
  "sourceOfTruth": "github",
  "parentContract": "positron-core",
  "requiredGates": [
    "ci_status",
    "security_scan"
  ],
  "forbiddenOutcomes": [
    "test_regression",
    "secret_leakage",
    "coverage_decrease"
  ],
  "acceptanceCriteria": [
    "Beschreibung des erwarteten Verhaltens"
  ],
  "testStrategy": {
    "unitRequired": true,
    "testFramework": "vitest",
    "testFilePattern": "**/src/__tests__/*.test.ts",
    "redTestsMustFailBeforeImplementation": true
  },
  "mergePolicy": "no_merge_without_all_gates_green"
}
```

---

## Forbidden Claims (Global)

Folgende Behauptungen sind in Positron-Runs NIEMALS ohne Beleg erlaubt:

| Claim | Required Evidence |
|-------|-------------------|
| "Produktivitätssteigerung um X%" | Messbare Metrik mit Vorher/Nachher-Vergleich |
| "Agent Y kann Feature Z" | Capability-Deklaration mit Testnachweis |
| "Funktioniert" (ohne Test/Preview) | Test-Report oder Preview-Screenshot |
| "Sicher" (ohne Security Scan) | Security-Scan-Report mit 0 Blocking Findings |
| "Mock-Adapter ist produktiv" | NIEMALS erlaubt — Mock ≠ Production |
| "Vendor X behauptet Y" | Als "Vendor Claim" markiert, nicht als Fakt |
| "Compatibel mit Tool Z" | Integrationstest oder Contract-Test |

---

## Contract Validation Pipeline

```
1. Spec erstellt
   ↓
2. Verification Contract aus Spec abgeleitet
   ↓
3. Human review des Contracts (GATE_APPROVE)
   ↓
4. Red Tests gegen Contract geschrieben
   ↓
5. Agent implementiert gegen Contract
   ↓
6. Green Tests validieren Contract-Erfüllung
   ↓
7. Reviewer-Agent prüft gegen Contract
   ↓
8. Contract-Erfüllung im Evidence Log dokumentiert
```

---

## Contract Enforcement

### Compile-Time
- TypeScript-Types für Contract-Struktur in `packages/shared/src/`

### Runtime
- `validateContract(contract: VerificationContract): ValidationResult`
- Prüft: Schema-Validität, Gate-Definitionen, Acceptance-Criteria-Format

### Test-Time
- Contract-Tests: `contract.requiredGates.every(gate => gateHasEvidence(gate))`

### Merge-Time
- `no_merge_without_evidence`: Merge-Service prüft Evidence vor Merge

---

## Example: Issue-spezifischer Contract

```json
{
  "contractVersion": "1.0.0",
  "scope": "issue-42-fix-login-timeout",
  "sourceOfTruth": "github",
  "parentContract": "positron-core",
  "requiredGates": [
    "ci_status",
    "security_scan",
    "preview_screenshot"
  ],
  "forbiddenOutcomes": [
    "test_regression",
    "secret_leakage",
    "coverage_decrease_below_30"
  ],
  "acceptanceCriteria": [
    "Login timeout after 30 seconds instead of 60 seconds",
    "Timeout value configurable via LOGIN_TIMEOUT_MS environment variable",
    "If LOGIN_TIMEOUT_MS is not set, default to 30000ms",
    "Existing authentication tests still pass"
  ],
  "testStrategy": {
    "unitRequired": true,
    "testFramework": "vitest",
    "testFilePattern": "apps/server/src/__tests__/auth.test.ts",
    "redTestsMustFailBeforeImplementation": true,
    "coverageTarget": "maintain or increase"
  },
  "mergePolicy": "no_merge_without_all_gates_green",
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

## Relation to Other Contracts

- **Agent Capability Registry:** Agent muss `test_run` Capability haben → by Contract
- **Adapter Contracts:** Adapter implementiert `CodingAgentAdapter` → by Contract
- **Reviewer-Agent Contract:** Reviewer prüft gegen diesen Contract → by Reference
- **Evidence Log:** Enthält Contract-Erfüllungsstatus → by Reference

---

## Implementation Path

1. `VerificationContract` Type in `packages/shared/src/`
2. `validateContract()` in `packages/shared/src/`
3. Contract-Erzeugung in SPECIFY-Phase (`packages/speckit-adapter/`)
4. Contract-Speicherung als Run-Artefakt
5. Contract-Validierung in VERIFY-Phase
6. UI-Anzeige des Contracts im Quality Panel
