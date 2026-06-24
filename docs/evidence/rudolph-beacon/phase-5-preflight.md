# Phase 5 — Pre-Flight

**Timestamp:** 2026-06-24T17:30:00Z
**Run ID:** rudolph-phase-5-20260624

## Ziel

Rudolph Beacon Phase 5: Commit-Closure, Coverage-Gap-Schließung und Evidence-Gitignore-Entscheidung.

## Geplante Änderungen

| # | Änderung | Klassifikation | Begründung |
|---|----------|---------------|------------|
| 1 | Tests für `validateRunSummary()` in `evidence-contract.test.ts` ergänzen | GREEN_SAFE | Schließt Coverage-Gap von 82.73% → >=85%. Keine Produktionslogikänderung. |
| 2 | `/evidence/` zu `.gitignore` hinzufügen | GREEN_SAFE | Root `evidence/` ist Runtime-Artefakt-Verzeichnis, nicht Dokumentation. `docs/evidence/` bleibt versioniert. |
| 3 | Phase-5 Evidence-Dateien in `docs/evidence/rudolph-beacon/` erstellen | GREEN_SAFE | Dokumentation und Audit-Trail. |
| 4 | Lokalen Commit ausführen | YELLOW_REVIEW (nur mit APPROVE LOCAL COMMIT ONLY) | Commit mit Scope-Prüfung. Kein Push, PR, Merge. |

## Nicht geplante Änderungen (RED_HOLD / YELLOW_REVIEW)

| Bereich | Status | Grund |
|---------|--------|-------|
| `packages/opencode-adapter/` | RED_HOLD | Außerhalb Scope |
| `packages/shared/` | RED_HOLD | Außerhalb Scope |
| `packages/run-state/` | RED_HOLD | Außerhalb Scope |
| `apps/server/` | RED_HOLD | Außerhalb Scope |
| `apps/web/` | RED_HOLD | Außerhalb Scope |
| `.github/workflows/*` | RED_HOLD | Remote-CI |
| Push | RED_HOLD | Verboten |
| PR erstellen | RED_HOLD | Verboten |
| Merge | RED_HOLD | Verboten |
| Remote-CI auslösen | RED_HOLD | Verboten |
| Stashes anwenden/poppen | RED_HOLD | Verboten |
| Secrets lesen/ausgeben | RED_HOLD | Verboten |

## Coverage-Plan

### Ziel

`evidence-contract.ts` Coverage von 82.73% auf mindestens 85% bringen.

### Strategie

`validateRunSummary()` (~189 Zeilen, Zeilen 246-435) hat NULL Test-Coverage. Durch 1-3 dedizierte `describe`-Blöcke sollen die wichtigsten Validierungspfade abgedeckt werden:

1. **Grundlegende Validierung:** gültiges Objekt, invalide Top-Level-Felder (runId, executionMode, benchmarkName)
2. **Sub-Objekt-Validierung:** repo, tests, safety, conclusion, capabilityDelta
3. **Array-Validierung:** issues, commands (leer, fehlend, invalide Einträge)
4. **Edge Cases:** GREEN-Status-Check, Secret-Erkennung in Summary, null/undefined

### Akzeptanzkriterien

- `evidence-contract.ts` Coverage >= 85% (lokal gemessen)
- Keine Testduplikation ohne Nutzen
- Keine Produktionslogik-Verfälschung für Coverage
- Tests prüfen echte Schema-Kanten

### Fallback

Wenn Coverage nicht sinnvoll auf >=85% erhöhbar: `ACCEPTED_COVERAGE_EXCEPTION` mit Begründung. Kein Trick.

## Gitignore-Entscheidung

### Empfehlung (KI-Entscheidung, GREEN_SAFE)

**Root `evidence/` gitignored werden lassen.**

Begründung:

1. Root `evidence/` enthält GitHub API Snapshots (JSON-Dumps) — Runtime-Artefakte, keine Dokumentation
2. `docs/evidence/rudolph-beacon/` ist ein VOLLSTÄNDIG ANDERER Pfad und wird NICHT von `/evidence/` in `.gitignore` betroffen
3. `.gitignore` enthält bereits ähnliche Ausschlüsse: `.positron/evidence/`, `.positron/runs/`, `.local-artifacts/`
4. Die JSON-Snapshots können jederzeit regeneriert werden
5. Committen großer, regenerierbarer JSON-Daten widerspricht Clean-Commit-Prinzip

### Umsetzung

```gitignore
# Runtime evidence artifacts (not documentation)
/evidence/
```

Der führende `/` stellt sicher, dass nur das Root-Verzeichnis `evidence/` ausgeschlossen wird, nicht etwaige Unterverzeichnisse mit demselben Namen.

## Geplante Gates

| Gate | Command | Erwarteter Exit Code |
|------|---------|---------------------|
| Whitespace Check | `git diff --check` | 0 |
| Build | `npm run build` | 0 |
| Typecheck | `npm run typecheck` | 0 |
| Benchmark Tests | `npm run test:benchmark:rudolph` | 0 |
| Benchmark Coverage | `npm run test:benchmark:rudolph:coverage` | 0 oder 1 (pre-existing global threshold) |
| Full Test Suite | `npm test` (wenn zeitlich vertretbar) | 0 |

## Commit-Bedingungen

Commit wird NUR ausgeführt wenn:

- [x] `APPROVE LOCAL COMMIT ONLY` gilt (✅ vom Owner im Prompt)
- [ ] `COMMIT_READY: YES` bestätigt
- [ ] Keine RED_HOLD-Dateien betroffen
- [ ] Keine Secrets betroffen
- [ ] Lokale Pflichtgates grün oder pre-existing Exit-Code-1 sauber klassifiziert
- [ ] Alle Änderungen im Rudolph-/Issue-279-Scope
- [ ] Keine Remote-Aktion nötig

## Rollback-Strategie

Falls Commit fehlschlägt oder Gates nicht bestehen:

1. `git diff --check` zurücksetzen, wenn nötig
2. Keine partiellen Commits — entweder vollständig oder gar nicht
3. Fehlgeschlagenen Zustand in `phase-5-gates.md` dokumentieren
4. Nächsten Lauf mit korrigierten Bedingungen starten

## Warum kein Push/PR/Merge

- Prompt enthält nur `APPROVE LOCAL COMMIT ONLY`
- Push, PR, Merge sind explizit unter RED_HOLD
- Keine Remote-CI Auslösung
- GitHub Issue-Kommentare sind unter diesem Approval explizit verboten
