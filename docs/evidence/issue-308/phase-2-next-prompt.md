# Issue #308 Phase B — Fake/Dry-Run Gate Assembly Validation

**Generated:** 2026-06-29T08:15:00+02:00
**Type:** Next Prompt for separate Positron run
**Requires:** Approval `APPROVE ISSUE 308 PHASE B FAKE GATE ASSEMBLY ONLY`

---

## Copyable Prompt

```
# POSITRON NEXT RUN — Issue #308 Phase B: Fake/Dry-Run Gate Assembly Validation

Du bist die prüfende/bauende KI im Repository:

```
xxammaxx/Positron
https://github.com/xxammaxx/Positron
```

## Ausgangslage

Die Phase 2 Readiness Recheck für #308 ist abgeschlossen:

```text
ISSUE_308_READINESS_DECISION: READY_FOR_PHASE_B_FAKE_GATE_ASSEMBLY
Blockers #215/#244/#245/#246: CLOSED, code auf main (HEAD: 00fecb8)
Tests: 1793/1793 PASS
Lokale Gates: GREEN
Real Mode: BLOCKED_BY_DEFAULT
```

## Ziel dieses Runs

Erstelle einen **Fake/Dry-Run Gate Assembly Integration Test**, der alle Safety Gates des Positron-Pipelines gemeinsam in einem kontrollierten Test-Harness validiert.

## Explizite Owner-Freigabe

Der Owner gibt nur folgende begrenzte Freigabe:

```
APPROVE ISSUE 308 PHASE B FAKE GATE ASSEMBLY ONLY
```

## Was dieser Run DARF

1. Fake Adapters verwenden (FakeGitWorkspaceAdapter, FakeOpenCodeAdapter, FakeSpecKitAdapter)
2. `registerFakeGateEvaluators()` aufrufen
3. Einen dry-run Pipeline-Durchlauf simulieren
4. Jeden GateType einzeln und in Kombination testen
5. Test-Code in `packages/run-state/src/__tests__/` schreiben
6. Mock `onAudit` Callback für Audit-Enforcement-Tests verwenden
7. Test-Only Run Summary erstellen
8. Evidence-Artefakte in `docs/evidence/issue-308/phase-b/` ablegen
9. Lokale Gates ausführen
10. Draft PR für Evidence erstellen
11. Completion Comment auf #308 posten

## Was dieser Run NICHT darf

- Kein Real Mode
- Keine Real-Mode-Env setzen (HUMAN_APPROVED_REAL, POSITRON_ENABLE_REAL)
- Keine echten externen Tools ausführen
- Keine echten GitHub-API-Calls
- Keine PR-Erstellung per Real Mode
- Kein Merge
- Keine Workflow-Änderungen
- Keine manuelle CI
- Kein CodeRabbit
- Keine Secrets
- Keine `.env`-Inhalte
- Kein Force Push
- Keine Branch-Löschung

## Aufgabe 1 — Gate Assembly Test Suite

Erstelle eine Test-Suite, die alle Gates in der korrekten Pipeline-Reihenfolge validiert:

### 1.1 Phase Transition Gates

Teste `tryTransitionWithGates()` für jede definierte Transition:

- QUEUED → CLAIMED (no gates required)
- CLAIMED → SPECIFY (no gates required)
- VERIFY → COMMIT (pre_write, evidence_required)
- COMMIT → PR_CREATE (pre_pr, evidence_required)
- PR_CREATE → MERGE (pre_merge, security, human_approval)
- DONE → CLEANUP (terminal sink)

### 1.2 Missing Evaluator Test

- Entferne einen evaluator via `clearGateEvaluators()`
- Versuche `tryTransitionWithGates()` → muss BLOCKED sein
- Verifiziere, dass die Blocking-Failure den korrekten GateType nennt
- Registriere evaluator neu → muss wieder PASS sein

### 1.3 Security Non-Override Test

- Registriere einen `security` evaluator der FAIL returned
- Versuche `tryTransitionWithGates()` für MERGE
- Verifiziere, dass NICHT zu GATE_APPROVE geroutet wird (security fail ist final)
- Verifiziere, dass human_approval den security fail NICHT überschreiben kann

### 1.4 Human Approval → GATE_APPROVE Test

- Registriere einen `human_approval` evaluator der FAIL returned
- Versuche `tryTransitionWithGates()` für MERGE
- Verifiziere, dass die Phase auf GATE_APPROVE gesetzt wird
- Verifiziere, dass es sich um eine Pause (nicht Block) handelt

### 1.5 GateType Count Test

- Verifiziere, dass ALL_GATE_TYPES genau 8 Einträge hat
- Verifiziere, dass `registerFakeGateEvaluators()` alle 8 registriert
- Verifiziere, dass `gateEvaluatorCount()` nach Registrierung 8 ist

### 1.6 PHASE_GATE_REQUIREMENTS Test

- Verifiziere, dass COMMIT `pre_write` + `evidence_required` erfordert
- Verifiziere, dass PR_CREATE `pre_pr` + `evidence_required` erfordert
- Verifiziere, dass MERGE `pre_merge` + `security` + `human_approval` erfordert
- Verifiziere, dass DONE `evidence_required` erfordert

### 1.7 Audit Enforcement Integration Test

- Konfiguriere Tool mit `requiresAuditLog: true`
- Führe Tool ohne `onAudit` callback aus → BLOCKED mit AUDIT_LOG_MISSING
- Konfiguriere `onAudit` callback → Ausführung erfolgreich
- Konfiguriere `onAudit` callback der wirft → BLOCKED

### 1.8 Workspace Cleanup Lifecycle Test

- Erstelle Fake-Workspace
- Locke Workspace
- Verifiziere `isLocked` = true
- Führe destroyWorkspace aus → lock wird freigegeben
- Verifiziere `isLocked` = false
- Verifiziere, dass CLEANUP Phase als terminal gilt

## Aufgabe 2 — Lokale Gates

```
git diff --check
npm run build
npm run typecheck
npm test
```

## Aufgabe 3 — Evidence

Erstelle:

```
docs/evidence/issue-308/phase-b/gate-assembly-test-results.md
docs/evidence/issue-308/phase-b/gate-coverage-matrix.md
docs/evidence/issue-308/phase-b/limitations-impact-assessment.md
docs/evidence/issue-308/phase-b/gates.md
docs/evidence/issue-308/phase-b/summary.json
docs/evidence/issue-308/phase-b/report.md
```

## Aufgabe 4 — Draft PR

Branch: `test/issue-308-phase-b-gate-assembly`

Commit: `test(issue-308): add fake/dry-run gate assembly validation`

Draft PR gegen main.

## Aufgabe 5 — Completion Comment auf #308

Poste Ergebnis-Zusammenfassung mit Link zum Draft PR.

## Ergebnisformat

Antworte mit:

1. Kurzfazit (GREEN/YELLOW/RED/UNKNOWN)
2. Anzahl neuer Tests
3. Gate Coverage Matrix
4. Lokale Gates Ergebnisse
5. Commit/PR Status
6. Verbleibende Risiken
7. Nächster Schritt (Phase C readiness assessment)
```

---

## Owner Pre-Check Before Running This Prompt

1. ✅ Verify Phase 2 Readiness Recheck is complete
2. ✅ Verify `ISSUE_308_READINESS_DECISION: READY_FOR_PHASE_B_FAKE_GATE_ASSEMBLY`
3. ✅ Verify this prompt contains NO Real Mode instructions
4. ✅ Verify this prompt contains NO external tool execution
5. Copy this prompt into a fresh Positron run
