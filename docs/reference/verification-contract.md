# Verification Contract

Datum: 2026-06-09
Status: Draft
Diataxis: Reference

## Überblick

Der **Verification Contract** ist ein formales Dokument, das vor der Implementierung
(Phase `IMPLEMENT`) definiert, was genau implementiert wird und wie der Erfolg gemessen
wird. Er stellt sicher, dass Spec, Plan und Tasks in einer prüfbaren Form vorliegen.

## Contract-Konzept

Ein Verification Contract enthält:

- **spec-hash:** SHA256-Hash der finalen Spezifikation
- **acceptance-criteria:** Alle Akzeptanzkriterien aus der Spec (maschinenlesbar)
- **test-commands:** Die genauen Befehle, die zum Testen ausgeführt werden
- **red-tests:** Tests, die vor der Implementierung geschrieben werden und zunaechst fehlschlagen muessen (RED phase)
- **sandbox-preview:** Erwartete Artefakte der Sandbox-Preview (Diff, Preview-URL, Datei-Liste)
- **security-checks:** Erforderliche Security-Gate-Ergebnisse (Secret Scan, Dependency Audit, SAST)
- **reviewer-agent:** Erwartete Reviewer-Agent-Dimensionen und Mindest-Score
- **ci-checks:** Liste der CI-Workflows, die gruen sein muessen
- **human-approval:** Gate fuer menschliche Freigabe (APPROVE / REVISE / ABORT)
- **success-definition:** Formale Definition, wann der Contract als erfüllt gilt

## Contract-Lebenszyklus

Der Contract durchläuft drei Phasen:

```
Erstellen (nach TASKS) → Prüfen (nach IMPLEMENT) → Erfüllen (nach TEST)
```

### 1. Erstellen (Create)

Nach Abschluss der TASKs-Phase wird der Contract erstellt. Er referenziert:

- `spec.md` (finale Version)
- `plan.md` (Implementierungsplan)
- `tasks.md` (Aufgabenliste)

```markdown
## Verification Contract — Run #42

### Spezifikation
- spec: `spec.md` (SHA256: a1b2c3d4...)
- plan: `plan.md`
- tasks: `tasks.md`

### Acceptance Criteria
1. [ ] POST /api/runs/:id/cancel returns 200 on success
2. [ ] Run transitions to CLEANUP phase after cancel
3. [ ] Completed run returns 409 Conflict

### Test Commands
```bash
cd apps/server && npx vitest run -- tests/routes/run-cancel.test.ts
```

### Success Definition
All acceptance criteria checked, all tests pass with exit code 0.
```

### 2. Prüfen (Verify)

Nach Abschluss der IMPLEMENT-Phase wird der Contract geprüft:

1. Stimmt der spec-hash noch mit der aktuellen Spec überein?
2. Sind alle Artefakte (spec, plan, tasks) unverändert?
3. Wurden alle im Plan definierten Tasks umgesetzt?

```typescript
// packages/run-state/src/contract-verifier.ts (Beispiel-Struktur)
export interface VerificationContract {
  specHash: string;
  acceptanceCriteria: AcceptanceCriterion[];
  testCommands: TestCommand[];
  successDefinition: SuccessDefinition;
}

export interface ContractVerificationResult {
  valid: boolean;
  specUnchanged: boolean;
  allCriteriaCovered: boolean;
  testsDefined: boolean;
  errors: string[];
}
```

### 3. Erfüllen (Fulfill)

Nach der TEST-Phase wird der Contract als erfüllt markiert:

1. Alle Tests bestanden (exit code 0)
2. Alle Acceptance Criteria erfüllt
3. Evidence dokumentiert (Test-Report, Coverage-Report)

```markdown
### Erfüllungsbericht — Run #42

Spec unverändert: [OK]
Test-Ergebnis: [OK] (12/12 passed)
Acceptance Criteria:
  1. [OK] POST /api/runs/:id/cancel returns 200
  2. [OK] Run transitions to CLEANUP
  3. [OK] Completed run returns 409

Contract: [OK] ERFÜLLT
```

## Beispiele

### Contract-Erstellung (nach TASKS)

```markdown
# Verification Contract

## Metadaten
- **Run-ID:** run-42
- **Issue:** #42 — Cancel Run API
- **Erstellt:** 2026-06-09T10:00:00Z
- **Phase:** TASKS → IMPLEMENT

## Spec-Referenz
- Datei: `.specify/run-42/spec.md`
- SHA256: `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`
- Plan: `.specify/run-42/plan.md`
- Tasks: `.specify/run-42/tasks.md`

## Acceptance Criteria (maschinenlesbar)

```json
[
  {
    "id": "AC-1",
    "description": "POST /api/runs/:id/cancel returns 200 on success",
    "verification": "http_status_code(200)"
  },
  {
    "id": "AC-2",
    "description": "Run transitions to CLEANUP phase after successful cancel",
    "verification": "run_phase_equals('CLEANUP')"
  },
  {
    "id": "AC-3",
    "description": "Already completed run returns 409 Conflict",
    "verification": "http_status_code(409)"
  }
]
```

## Test Commands

```bash
# Unit-Tests für Cancel-API
cd apps/server && npx vitest run -- tests/routes/run-cancel.test.ts

# Integrationstest
cd apps/server && npx vitest run -- tests/integration/run-lifecycle.test.ts
```

## Success Definition

Der Contract gilt als erfüllt, wenn:

1. Alle Acceptance Criteria (AC-1 bis AC-3) in den Tests abgedeckt sind
2. Alle Tests mit Exit-Code 0 bestehen
3. Die `spec.md` seit Erstellung des Contracts unverändert ist

## Contract unterzeichnen (simuliert)

```yaml
signed_by: "Positron Verification Agent"
signed_at: "2026-06-09T10:00:00Z"
spec_hash_match: true
```

## Fleet-Erweiterungen (SDD/Fleet/OpenCode Transfer)

Die folgenden Felder erweitern den Verification Contract um Konzepte aus dem Fleet-Orchestrierungsmodell und dem SDD-Test-First-Ansatz:

### RED_TESTS (Test-First)

Vor der IMPLEMENT-Phase muessen Tests geschrieben werden, die zunaechst fehlschlagen (RED). Der Contract dokumentiert die erwarteten Red Tests:

```markdown
## Red Tests (Phase: ANALYZE → REVIEW)

| Test | Erwartetes Ergebnis (RED) | Gruen nach | Datei |
|---|---|---|---|
| `POST /api/runs/:id/cancel` → 200 | ❌ 404 (Route nicht implementiert) | IMPLEMENT | `cancel-sse.test.ts` |
| Cancel in-progress run | ❌ `phase !== 'CLEANUP'` | IMPLEMENT | `cancel-sse.test.ts` |
| Cancel completed run → 409 | ❌ 200 (keine Conflict-Pruefung) | IMPLEMENT | `cancel-sse.test.ts` |
```

**Gate:** Kein Uebergang zu IMPLEMENT, wenn keine Red Tests definiert sind.

### Sandbox Preview (Sub-Gate: VERIFY → COMMIT)

Der Contract definiert, welche Sandbox-Preview-Artefakte vor dem Commit erwartet werden:

```markdown
## Sandbox Preview Requirements

- [ ] Diff generiert und geprueft (≤ MAX_DIFF_SIZE = 400 Zeilen)
- [ ] Datei-Liste der Aenderungen dokumentiert
- [ ] Preview-URL bereitgestellt (falls Frontend-Aenderung)
- [ ] Preview-Screenshot verglichen (falls visuelle Aenderung)
```

### Security Checks (Sub-Gate: VERIFY → COMMIT)

```markdown
## Required Security Checks

- [ ] Secret Scan: Keine `ghp_*`, `sk-*`, `github_pat_*` in Diff
- [ ] Dependency Audit: `npm audit` ohne HIGH/CRITICAL
- [ ] Policy Check: Keine `sudo`, `rm -rf`, force push im Diff
- [ ] Trust-Tier Check: Keine Tier-0-Tools in schreibenden Operationen
```

### Reviewer-Agent (Sub-Gate: VERIFY → COMMIT)

```markdown
## Reviewer-Agent Requirements

- [ ] Code-Review abgeschlossen (read-only)
- [ ] Review-Dimensionen geprueft:
  - Spec-Plan Alignment
  - Acceptance Criteria Coverage
  - Code Quality & Security
  - Test Coverage
- [ ] Reviewer-Report erstellt
- [ ] Verdict: PASS / WARN / FAIL
```

### CI Checks (Gate: COMMIT → PR_CREATE)

```markdown
## Required CI Checks (müssen gruen sein)

- [ ] `verify-issues` Workflow
- [ ] `docs-quality` Workflow (wenn Docs geaendert)
- [ ] Unit/Integration Tests
- [ ] E2E Tests
- [ ] TypeScript TypeCheck
```

### Human Approval (Gate: COMMIT → PR_CREATE)

```markdown
## Human Approval Gate

- [ ] Nutzer benachrichtigt (mit Diff + Testreport + Reviewer-Report)
- [ ] Human-Review angefordert
- [ ] Entscheidung: APPROVE / REVISE / ABORT
- [ ] Bei REVISE: Zurueck zu IMPLEMENT oder REVIEW
- [ ] Bei ABORT: Run in FAILED_BLOCKED
```

---

## Vollstaendiger Contract (mit Fleet-Erweiterungen)

```markdown
# Verification Contract (Extended)

## Source Issue
#42 — Cancel Run API

## Spec Artifact
- spec.md (SHA256: e3b0c44...)
- plan.md
- tasks.md

## Acceptance Criteria
1. [ ] POST /api/runs/:id/cancel returns 200 on success
2. [ ] Run transitions to CLEANUP phase after cancel
3. [ ] Completed run returns 409 Conflict

## Non-Goals
- Bulk cancel operations
- WebSocket cancel notifications

## Required Red Tests
- cancel-sse.test.ts: 3 tests (initial RED, green after IMPLEMENT)

## Required Unit Tests
- cancel-sse.test.ts

## Required Integration Tests
- run-lifecycle.test.ts

## Required E2E Tests
- (keine — reiner API-Endpunkt)

## Required Security Checks
- Secret Scan, Policy Check

## Required CI Checks
- verify-issues, vitest, typecheck

## Required Sandbox Preview Evidence
- Diff (dateien geaendert: 3)
- Keine visuellen Aenderungen (kein Screenshot noetig)

## Required Reviewer-Agent Evidence
- Review-Report mit Verdict PASS/WARN/FAIL

## Required Human Approval
- Gate: GATE_APPROVE vor PR_CREATE

## Merge Preconditions
- Alle CI-Checks gruen
- POSITRON_MERGE_KILL_SWITCH nicht aktiv
- Human Approval: APPROVE

## Rollback Plan
- Revert Commit via `git revert`
```

---

## Verwandte Dokumente

- [Vibe Coding](vibe-coding.md) — Mindestens 3 Acceptance Criteria
- [Quality Gates](../workflows/qualitaetspruefung.md) — Gate-Checks im Contract-Lebenszyklus
- [Fehlerbehandlung](fehlerbehandlung.md) — Fehler bei Contract-Verletzung
- [Agentenmetriken](agentenmetriken.md) — Contract-Erfüllungsraten
- [SDD/Fleet Architecture](../architecture/POSITRON_SDD_FLEET_ARCHITECTURE.md) — Wie Positron SDD/Fleet implementiert
- [State Machine Mapping](../architecture/POSITRON_STATE_MACHINE_MAPPING.md) — Phase-Mapping
