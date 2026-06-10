# Positron Gate Matrix — CI / Security / Evidence Gates

<!-- INTERNAL -->
**Date:** 2026-06-09
**Diataxis:** Reference
**Extends:** `docs/workflows/qualitaetspruefung.md` (Quality Gate Matrix for Phase Transitions)
**Audience:** DevOps, CI engineers, agent developers

---

## Overview

This document extends the [Quality Gate Matrix](../workflows/qualitaetspruefung.md) (which covers phase-to-phase transitions within the Positron state machine) with CI, Security, Evidence, and Fleet-model gates that operate at the system level. These gates are enforced by CI workflows, git hooks, shell policies, and agent permission rules — not by the state machine itself.

---

## Gate Categories

| Category | Enforcement Layer | Examples |
|---|---|---|
| **Phase Gates** | State machine (`VALID_TRANSITIONS`) | `REVIEW → IMPLEMENT` requires spec/plan/tasks |
| **CI Gates** | GitHub Actions workflows | `verify-issues`, `docs-quality` |
| **Security Gates** | Secret scan, dependency audit, policy check | `ghp_*` detection, `npm audit` |
| **Evidence Gates** | Constitution Article IV, agent rules | GitHub comment, test report, diff summary |
| **Human Gates** | UI GateControls, `GATE_APPROVE` / `GATE_REVISE` phases | Approve / Revise / Abort |
| **Fleet Gates** | Documented sub-gates (RED_TESTS, Sandbox Preview, Reviewer-Agent) | Contract-level checks within phases |

---

## Complete Gate Matrix

| Gate | Zweck | Trigger | Blockiert? | Test / Workflow | Evidence | Fehlerverhalten | Owner |
|---|---|---|---|---|---|---|---|
| **Phase: Valid Transition** | Kein Phasen-Skip | Jeder `transition()` Aufruf | ✅ Ja | `canTransition()` in `state-machine.ts` | `RunEvent` mit Level GATE | Run bleibt in aktueller Phase | run-state |
| **Phase: Spec Exists** | spec.md vor IMPLEMENT | `REVIEW → IMPLEMENT` | ✅ Ja | Speckit artifact scanner | `spec.md` SHA256 | `FAILED_BLOCKED` | speckit-adapter |
| **Phase: Tests Bestanden** | Kein Commit ohne gruene Tests | `TEST → VERIFY` | ✅ Ja | `vitest run` | Test-Report | `FAILED_TRANSIENT` (max 3x) | run-state |
| **Phase: Diff-Groeße** | Keine Monster-Diffs | `IMPLEMENT → TEST` | ⚠️ Warn | Diff line count ≤ `MAX_DIFF_SIZE` (400) | Diff summary | Warnung im Log | run-state |
| **CI: Issue Verification** | Geschlossene Issues validieren | Push zu main, PR close, Schedule | ⚠️ Warn | `.github/workflows/verify-issues.yml` | `reports/issue-verification-*.json` | Issue label: `positron:failed` | CI |
| **CI: Docs Quality** | Docs-Build, Lint, Secrets | Push mit Docs-Änderungen | ✅ Ja | `.github/workflows/docs-quality.yml` | MkDocs Build Log | Build fehlgeschlagen → kein Merge | CI |
| **CI: Unit/Integration Tests** | Kein Regression | `npm test` (lokal + CI geplant) | ✅ Ja | `vitest run` (per package) | TAP/JUnit report | `FAILED_TRANSIENT` | Developer |
| **CI: E2E Tests** | Visuelle Regression | `npm run test:e2e` | ✅ Ja | `playwright test` | Screenshots, DOM diff | Test fehlgeschlagen | Developer |
| **CI: TypeCheck** | Kein TS-Fehler | `npm run typecheck` | ✅ Ja | `tsc -b --dry` | Compiler output | Build blockiert | Developer |
| **CI: Lint** | Code-Style | `npm run lint` (lokal) | ⚠️ Warn | `eslint` | Lint report | Offen — kein CI-Workflow | Developer |
| **Security: Secret Scan** | Keine Tokens in Code/Docs | Docs-Quality CI, Pre-commit geplant | ✅ Ja | Regex: `ghp_*`, `sk-*`, `github_pat_*` | Secret Detection Log | ❌ Fehler → Block | CI / Security |
| **Security: Dependency Audit** | Keine bekannten CVEs | Geplant (CI-Workflow) | ⚠️ Warn | `npm audit` | Audit JSON | Warnung bei HIGH/CRITICAL | CI |
| **Security: SAST** | Code-Analyse | Geplant | ⚠️ Warn | TBD | SAST report | Warnung | Security |
| **Security: Trust-Tier Check** | Keine Tier-0-Tools mit Write | Agent startup, policy gate | ✅ Ja | `speckit-policy.ts`, `opencode-policy.ts` | Policy Violation Log | ❌ Block + `FAILED_UNSAFE` | Agent policy |
| **Security: Command Allowlist** | Nur erlaubte Bash-Befehle | Autonomous Mode, `bash:` permission | ✅ Ja | OpenCode permission profile | Command log | Befehl abgelehnt (`deny`) | opencode-adapter |
| **Evidence: GitHub Comment** | Sichtbare Spur im Issue | Jede Phase (Constitution Art. I) | ✅ Ja | GitHub MCP `create_issue_comment` | GitHub comment timestamp | `FAILED_BLOCKED` (wenn API nicht erreichbar) | github-adapter |
| **Evidence: Test Report** | Testergebnisse dokumentiert | `COMMIT → PR_CREATE` | ✅ Ja | Artifact: `test-report.md` | Test-Report | Kein Commit ohne Report | run-state |
| **Evidence: Diff Summary** | Aenderungen dokumentiert | `VERIFY → COMMIT` | ✅ Ja | `git diff --stat` | Diff summary | Kein Commit ohne Diff | sandbox |
| **Evidence: Evidence Log** | Session-Audit | Run-Ende (`DONE` / `FAILED_*`) | ✅ Ja | `docs/agent/*_EVIDENCE_LOG.md` | Evidence Log Markdown | Ohne Log kein `DONE` | orchestration |
| **Human: GATE_APPROVE** | Menschliche Freigabe | `COMMIT → PR_CREATE` | ✅ Ja | `GateControls.tsx` Approve button | RunEvent mit Level HUMAN | Run bleibt in `COMMIT` | Human / UI |
| **Human: GATE_REVISE** | Aenderungswunsch | `COMMIT → GATE_REVISE` | ✅ Ja | `GateControls.tsx` Revise button | RunEvent mit Level HUMAN | Zurueck zu `IMPLEMENT` oder `REVIEW` | Human / UI |
| **Human: Merge Kill Switch** | Notfall-Block | `PR_CREATE → MERGE` | ✅ Ja | `POSITRON_MERGE_KILL_SWITCH` env | RunEvent: `BLOCKED_MERGE` | Merge blockiert | Admin |
| **Fleet: RED_TESTS** | Tests vor Code | `ANALYZE → REVIEW` | ⚠️ Warn | Manuell / Agent | Red Test Definition im Contract | Warnung wenn keine Red Tests | Developer |
| **Fleet: Sandbox Preview** | Aenderungen sichtbar | `VERIFY` | ⚠️ Warn | Diff, Preview-URL, Screenshot | Preview-Artefakte | Warnung wenn fehlt | sandbox |
| **Fleet: Reviewer-Agent** | Code-Review | `VERIFY → COMMIT` | ⚠️ Warn | `review-agent` subagent (read-only) | Reviewer Report | Bei FAIL: Rueckkehr zu IMPLEMENT | review-agent |
| **Fleet: Evidence Comment** | Strukturierter Abschluss | `COMMIT` | ✅ Ja | GitHub Issue Comment | Comment mit Test/Diff/Risiken | Ohne Comment kein `PR_CREATE` | orchestration |

---

## Gate Severity Legend

| Symbol | Bedeutung | Verhalten |
|---|---|---|
| ✅ Ja | Blocking | Uebergang / Merge blockiert bis Check gruen |
| ⚠️ Warn | Warning | Uebergang moeglich, Warnung protokolliert |
| ❌ Fehler | Blocking + Error | Wie Blocking, aber ohne Retry — menschliches Eingreifen erforderlich |

---

## CI Workflow Coverage

| Workflow | Abgedeckte Gates | Status |
|---|---|---|
| `verify-issues.yml` | Evidence: Issue Integrity | ✅ Implementiert |
| `docs-quality.yml` | CI: Docs Quality, Security: Secret Scan, Evidence: MkDocs Build | ✅ Implementiert |
| *(geplant)* `test.yml` | CI: Unit/Integration Tests, CI: E2E Tests | ⚠️ Geplant |
| *(geplant)* `security-scan.yml` | Security: SAST, Security: Dependency Audit | ⚠️ Geplant |
| *(geplant)* `lint.yml` | CI: Lint | ⚠️ Geplant |

---

## Related Documents

- [Quality Gates (Phase Transitions)](../workflows/qualitaetspruefung.md)
- [Orchestration Workflow](../workflows/orchestrierung.md)
- [Verification Contract](../reference/verification-contract.md)
- [SDD/Fleet Architecture](../architecture/POSITRON_SDD_FLEET_ARCHITECTURE.md)
- [State Machine Mapping](../architecture/POSITRON_STATE_MACHINE_MAPPING.md)
- [Agent Isolation](../security/agent-environment-isolation.md)
