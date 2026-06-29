# Issue #308 Phase B — Next Prompt (Finalized Phase 2b)

**Generated:** 2026-06-29T08:20:00+02:00
**Mode:** FINAL AUDIT & MERGE — NO Real Mode
**Type:** Copyable prompt for next Positron run

---

## Copyable Prompt

```
# POSITRON NEXT RUN — Issue #308 Phase B: Fake/Dry-Run Gate Assembly Validation

Du bist die prüfende KI im Repository:

```
xxammaxx/Positron
https://github.com/xxammaxx/Positron
```

## Ausgangslage

Issue #308 Phase 2 Readiness Recheck ist abgeschlossen und gemerged:

```text
ISSUE_308_READINESS_DECISION: READY_FOR_PHASE_B_FAKE_GATE_ASSEMBLY
Blockers #215/#244/#245/#246: CLOSED, code auf main
PR #317: MERGED (readiness recheck evidence on main)
Tests: 1793/1793 PASS
Lokale Gates: GREEN
Real Mode: BLOCKED_BY_DEFAULT
```

## Ziel dieses Runs

Ein End-to-End Fake/Dry-Run Gate Assembly Test beweist, dass Stop/Ask, GATE_APPROVE, Workspace Cleanup, requiresAuditLog, GateType Enforcement, Kill-Switches, Secret Guardrails und Evidence-Erzeugung gemeinsam funktionieren.

## Explizite Owner-Freigabe (VORAUSSETZUNG)

```
APPROVE ISSUE 308 PHASE B FAKE GATE ASSEMBLY ONLY
```

## Erlaubt

1. Fake Adapters (FakeGitWorkspaceAdapter, FakeOpenCodeAdapter, FakeSpecKitAdapter)
2. `registerFakeGateEvaluators()` für alle 8 GateTypes
3. Mock `onAudit` Callback für Audit Enforcement
4. Dry-Run Pipeline simulieren
5. Test-Code in `packages/run-state/src/__tests__/` schreiben
6. Evidence-Artefakte in `docs/evidence/issue-308/phase-b/` ablegen
7. Lokale Gates ausführen
8. Draft PR für Evidence erstellen
9. Completion Comment auf #308 posten

## Verboten

- Kein Real Mode
- Keine Real-Mode-Env setzen (HUMAN_APPROVED_REAL, POSITRON_ENABLE_REAL)
- Keine echten externen Tools ausführen
- Keine echten GitHub-API-Calls
- Keine PR-Erstellung per Real Mode Pipeline
- Kein Merge
- Keine Workflow-Änderungen
- Keine manuelle CI
- Kein CodeRabbit
- Keine Secrets
- Keine `.env`-Inhalte
- Kein Force Push
- Keine Branch-Löschung

## Testanforderungen

### 1. Gate Coverage: Alle Phases + GateTypes
### 2. Missing Evaluator → BLOCKED
### 3. Security Fail → Non-Overridable
### 4. Human Approval Fail → GATE_APPROVE Pause
### 5. Audit Enforcement → Fail-Closed
### 6. Workspace Cleanup → Terminal Sink
### 7. Kill-Switches → Alle Default BLOCKED
### 8. Secret Guardrails → Erkennung + Redaction
### 9. End-to-End Pipeline → COMMIT→PR_CREATE→MERGE→DONE→CLEANUP

## Ergebnisformat

1. Kurzfazit (GREEN/YELLOW/RED/UNKNOWN)
2. Anzahl neuer Tests + Coverage-Matrix
3. Lokale Gates Ergebnisse
4. Evidence-Commit/PR Status
5. Verbleibende Risiken
6. Nächster Schritt (Phase C Readiness)
```

---

## Owner Pre-Check vor Ausführung

1. ✅ Phase 2 Readiness Recheck auf main (PR #317 MERGED)
2. ✅ `ISSUE_308_READINESS_DECISION: READY_FOR_PHASE_B_FAKE_GATE_ASSEMBLY`
3. ✅ Prompt enthält KEINE Real Mode Anweisungen
4. ✅ Prompt enthält KEINE externen Tool-Ausführungen
5. ⬜ Owner muss `APPROVE ISSUE 308 PHASE B FAKE GATE ASSEMBLY ONLY` bestätigen
