# Vibe Coding Orchestration — Pipeline Profile & Execution Model

> Version: 1.0.0-draft | Status: PROPOSED | Date: 2026-06-10
> Related: ADR-001, AGENT_CAPABILITY_REGISTRY.md, ADAPTER_CONTRACTS.md

---

## Purpose

Definiert das **Vibe-Coding-Pipeline-Profil**: einen erweiterten Positron-Pipeline-Modus, der nicht nur Code generiert, sondern Qualität durch verpflichtende Gates erzwingt. Das Profil ist eine Konfigurationsschicht über der bestehenden 28-phasigen State Machine.

---

## Core Principle

> Vibe Coding baut nur dann zuverlässig funktionierende Software, wenn jeder KI-Schritt durch Repo-Kontext, Tests, Preview, Review, Security-Gates und Evidence abgesichert wird.

Positron orchestriert diesen Prozess. Der Agent schreibt Code — Positron verifiziert das Ergebnis.

---

## Pipeline Profile: Vibe-Coding

### Full Execution Sequence (15 Steps)

```
1.  ISSUE_READ         → GitHub Issue lesen und Claim setzen
2.  REPO_CONTEXT       → Repository-Kontext laden (Deps, Struktur, bestehende Tests)
3.  CONTEXT_MANIFEST   → Context Manifest für Agenten erzeugen
4.  SPEC_DERIVE        → Spec aus Issue ableiten oder prüfen
5.  VERIFICATION_CONTRACT → Prüfbaren Verification Contract erzeugen
6.  RED_TESTS          → Red Tests schreiben (müssen vor Implementierung FAILen)
7.  AGENT_CODE         → Coding-Agent ausführen (Code-Änderungen)
8.  GREEN_TESTS        → Tests ausführen (müssen nach Implementierung passen)
9.  SECURITY_GATES     → Secret Scan, Dependency Audit, SAST
10. CI_GATES           → Lint, Typecheck, Build, Coverage
11. SANDBOX_PREVIEW    → Anwendung im Sandbox starten
12. REVIEWER_AGENT     → Reviewer-Agent gegen Verification Contract validieren
13. HUMAN_APPROVAL     → Human Approval Gate (UI mit allen Evidences)
14. EVIDENCE_COMMENT   → Strukturierten Evidence-Kommentar im Issue posten
15. PR_MERGE           → PR erstellen/aktualisieren und nach Gates mergen
```

### Gate Definitions

| Step | Gate Type | Blocking | Redo on Fail | Evidence Required |
|------|-----------|----------|--------------|-------------------|
| 1. ISSUE_READ | Data | Yes | Retry 1x | Issue body + labels |
| 2. REPO_CONTEXT | Data | Yes | Retry 1x | Dependency graph |
| 3. CONTEXT_MANIFEST | Data | Yes | Retry 1x | Manifest JSON |
| 4. SPEC_DERIVE | Quality | Yes | Retry 2x | Spec document |
| 5. VERIFICATION_CONTRACT | Quality | Yes | Retry 1x | Contract JSON |
| 6. RED_TESTS | Quality | Yes | Retry 0x | Test failure output |
| 7. AGENT_CODE | Execution | Yes | Retry 2x | Diff, agent logs |
| 8. GREEN_TESTS | Quality | Yes | Retry 3x (Fix Loop) | Test report |
| 9. SECURITY_GATES | Security | Yes | Blocked | Scan reports |
| 10. CI_GATES | Quality | Yes | Blocked | CI logs |
| 11. SANDBOX_PREVIEW | Visual | Yes | Retry 1x | Screenshot/URL |
| 12. REVIEWER_AGENT | Quality | Optional* | N/A | Review report |
| 13. HUMAN_APPROVAL | Human | Yes | N/A | Approval event |
| 14. EVIDENCE_COMMENT | Documentation | Yes | N/A | GitHub comment |
| 15. PR_MERGE | Release | Conditional** | N/A | Merge result |

\* Reviewer-Agent: Blockierend wenn `risk_level >= high`  
\*\* PR_MERGE: Nur wenn `POSITRON_ENABLE_MERGE=true` UND alle Gates grün

---

## Context Manifest Specification

Vor jedem Agenten-Lauf erzeugt Positron ein Context Manifest:

```json
{
  "manifestVersion": "1.0.0",
  "runId": "uuid",
  "issue": {
    "number": 42,
    "title": "Fix login timeout",
    "body": "...",
    "labels": ["bug", "high-priority"]
  },
  "repository": {
    "owner": "xxammaxx",
    "repo": "Positron",
    "defaultBranch": "main",
    "dependencies": {
      "runtime": "node >= 22",
      "packages": ["express@5", "react@19", "vitest@3"]
    }
  },
  "context": {
    "affectedModules": ["apps/server/src/auth.ts"],
    "existingTests": ["apps/server/src/__tests__/auth.test.ts"],
    "constitution": ".specify/memory/constitution.md",
    "securityPolicies": ["SECURITY.md", ".opencode/policies/"]
  },
  "specification": {
    "path": ".positron/runs/{runId}/spec.md",
    "verificationContract": ".positron/runs/{runId}/contract.json"
  },
  "workspace": {
    "path": "/tmp/positron-workspaces/{runId}",
    "branch": "positron/issue-42-fix-login-timeout",
    "isolation": "worktree"
  },
  "agent": {
    "type": "opencode",
    "capabilities": ["repo_read", "code_write", "test_run"],
    "trustTier": 1,
    "riskLevel": "medium"
  },
  "evidenceRequirements": [
    "test_report",
    "diff_summary",
    "ci_status",
    "preview_screenshot"
  ]
}
```

---

## Verification Contract Specification

Vor der Implementierung erzeugt:

```json
{
  "scope": "issue-42-fix-login-timeout",
  "sourceOfTruth": "github",
  "acceptanceCriteria": [
    "Login timeout nach 30s statt 60s",
    "Timeout-Wert konfigurierbar via env var",
    "Bestehende Tests passen weiterhin"
  ],
  "requiredGates": [
    "repository_context",
    "red_tests",
    "ci_status",
    "security_scan",
    "preview_screenshot",
    "reviewer_agent_verdict",
    "human_approval"
  ],
  "forbiddenOutcomes": [
    "test_regression",
    "secret_leakage",
    "main_branch_modification",
    "mock_code_in_production"
  ],
  "mergePolicy": "no_merge_without_all_gates_green"
}
```

---

## Fix-Loop Policy (Vibe-Coding specific)

```
IMPLEMENT → TEST → FAIL → Revise (max 3 loops)
  ├── Loop 1: Agent gets test failure + diff → another attempt
  ├── Loop 2: Agent gets test failure + more context → another attempt
  ├── Loop 3: Agent gets test failure + full error → FINAL attempt
  └── Loop 4: BLOCKED → Human intervention required
```

Erweiterte Fix-Loop-Regeln für Vibe-Coding:
- Agent wechseln erlaubt (z.B. OpenCode → Claude Code) wenn Loop 2 fehlschlägt
- Agent-Kombination: Ein Agent analysiert Fehler, anderer implementiert Fix
- Evidence-Pflicht: Jeder Loop dokumentiert was geändert wurde und warum

---

## Sandbox Preview Gate

### Requirements
1. Anwendung wird im isolierten Workspace gestartet
2. Playwright macht Screenshot der Startseite
3. Preview-URL wird im Issue/PR dokumentiert
4. Bei UI-Änderungen: Vorher/Nachher-Screenshot-Vergleich
5. Browser Console wird auf Fehler geprüft
6. Netzwerk-Fehler werden erfasst

### Implementation Plan
- Nutzt bestehende `playwright.config.ts` Infrastruktur (L4 Browser Evidence)
- Erweitert um Preview-Start im Workspace
- Fügt Preview-URL in `GitHubStatusSyncInput.evidence` ein

---

## Agent Execution Rules

1. **Isolation:** Jeder Agent läuft im eigenen Workspace
2. **Branch Safety:** Kein Agent arbeitet auf `main`
3. **Capability Match:** Agent muss benötigte Capabilities deklarieren
4. **Timeout:** Jeder Agent hat Timeout (default: 5 min)
5. **Output Capture:** CLI-Output wird als Evidence gespeichert
6. **Secret Redaction:** Output wird vor Speicherung redigiert
7. **Cleanup:** Workspace wird nach Run aufgeräumt (CLEANUP-Phase)

---

## Integration with Existing Positron

### Phase Mapping

| Vibe-Coding Step | Positron Phase | Notes |
|-----------------|----------------|-------|
| 1. ISSUE_READ | QUEUED → CLAIMED → ISSUE_CONTEXT | Bestehende Phasen |
| 2. REPO_CONTEXT | REPO_SYNC | Bestehende Phase |
| 3. CONTEXT_MANIFEST | Neu (in SPECIFY) | Neue Artefakt-Erzeugung |
| 4. SPEC_DERIVE | SPECIFY | Bestehende Phase |
| 5. VERIFICATION_CONTRACT | Neu (in SPECIFY) | Neues Artefakt |
| 6. RED_TESTS | TEST (vor IMPLEMENT) | Neue Gate-Logik |
| 7. AGENT_CODE | IMPLEMENT | Bestehende Phase, jetzt multi-agent |
| 8. GREEN_TESTS | TEST | Bestehende Phase |
| 9. SECURITY_GATES | VERIFY | Neue Security-Scan-Integration |
| 10. CI_GATES | VERIFY | Erweitert um Preview |
| 11. SANDBOX_PREVIEW | Neu (in VERIFY) | Neue Phase oder Sub-Phase |
| 12. REVIEWER_AGENT | REVIEW | Erweitert um Contract-Validierung |
| 13. HUMAN_APPROVAL | GATE_APPROVE | Bestehende Phase |
| 14. EVIDENCE_COMMENT | COMMIT / PR_CREATE | Bestehende Phase (GitHubStatusSync) |
| 15. PR_MERGE | MERGE → DONE | Bestehende Phase |

---

## Configuration

```yaml
# .positron/profiles/vibe-coding.yml (geplant)
profile: vibe-coding
version: "1.0"
pipeline:
  requireRedTests: true
  requirePreview: true
  requireReviewerAgent: true
  requireHumanApproval: true
  maxFixLoops: 3
gates:
  security:
    secretScan: blocking
    dependencyAudit: blocking
    sast: non-blocking
  quality:
    lint: blocking
    typecheck: blocking
    testCoverageGlobal: 30%  # ratcheting
    testCoverageSafety: 100%  # hard gate
  preview:
    requireScreenshot: true
    requireConsoleCheck: true
    timeout: 30000
agents:
  default: opencode
  fallback: human-operator
  allowedAgents: [opencode, codex, claude-code]
evidence:
  requireTestReport: true
  requireDiffSummary: true
  requireCiLink: true
  requirePreviewScreenshot: true
```
