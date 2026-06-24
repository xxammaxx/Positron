# Delegated Technical Decision Manifest — Rudolph Beacon Anschlusslauf

**Generated:** 2026-06-24T17:00:00Z
**Session:** Rudolph Beacon Anschlusslauf
**Role:** KI als technisch delegierte Instanz

## KI-Berechtigung (Delegation Model)

Der menschliche Owner hat explizit delegiert:

> "Du sollst technische Entscheidungen nicht ungefiltert an den Owner zurückgeben, sondern sie anhand von Code, Tests, Evidence, Risiko und Projektregeln selbst vorbereiten, bewerten und in einfache Entscheidungsklassen einordnen."

> "Die KI darf und soll technische Entscheidungen treffen, wenn sie eindeutig softwaretechnisch, risikoarm und durch Evidence belegt sind."

## GREEN_SAFE — Von der KI selbst getroffene Entscheidungen

### 1. Coverage-Script-Ergänzung
**Entscheidung:** `test:benchmark:rudolph:coverage` zu `package.json` hinzugefügt.
**Warum berechtigt:**
- Additive Änderung (eine Zeile)
- Keine Remote-Kosten
- Keine Secrets
- Build verifiziert
- Bestehendes `@vitest/coverage-v8` bereits installiert
**Evidence:** `npm run build` passes, vitest coverage config exists in `vitest.config.ts`

### 2. Evidence Schema Validation als separates Test-Modul
**Entscheidung:** `evidence-schema-validation.test.ts` erstellt mit runtime-Validator `validateRunSummary()`.
**Warum berechtigt:**
- Kein bestehendes Verhalten geändert
- Tests sind lokal überprüfbar
- Keine externen Abhängigkeiten
- Erkenntnislücke: `determineConclusionStatus` prüft keine Evidence-Pfade → Schema-Validator füllt diese Lücke
**Evidence:** Alle 91 bestehenden Tests bleiben grün, neue Tests sind additiv.

### 3. Red/Negative Tests als separates Test-Modul
**Entscheidung:** 8 neue Red Tests in `red-negative-tests.test.ts`.
**Warum berechtigt:**
- Erweitert Test-Abdeckung ohne Regression
- Jeder Test hat klare Akzeptanzkriterien
- Tests dokumentieren Policy-Regeln maschinenlesbar
**Evidence:** Bestehende 14 Red Tests bleiben pass.

### 4. Dokumentationsstruktur
**Entscheidung:** Neue Docs in `docs/evidence/rudolph-beacon/` (next-run-*) und `docs/benchmark/rudolph-beacon/` (REAL_MODE_READINESS.md).
**Warum berechtigt:**
- Reine Dokumentation, keine Code-Änderung
- Evidence-basiert (referenziert tatsächliche Testergebnisse)
- Keine Marketing-Sprache
**Evidence:** Jede Behauptung referenziert lokale Artefakte oder Testergebnisse.

### 5. POSITRON_EVALUATION_CONTRACT.md Härtung
**Entscheidung:** Explizite Regeln für GREEN-Vergabe ergänzt (Coverage, Schema, Traceability).
**Warum berechtigt:**
- Formuliert nur Regeln, die bereits teilweise im Code existieren
- Keine neue Policy — nur Klarstellung
- Lücke geschlossen: was vorher implizit war, ist jetzt explizit
**Evidence:** Bestehende `determineConclusionStatus` Logik, `validateTraceabilityMap`, neue Schema-Validierung.

### 6. CAPABILITIES / KNOWN_LIMITATIONS Update
**Entscheidung:** Status-Dokumente evidence-basiert aktualisiert.
**Warum berechtigt:**
- Nur dokumentierte Fähigkeiten aus tatsächlichen Tests
- Limitationen aus realen Tool-Gaps und Test-Lücken
- Kein Marketing, keine Spekulation

## YELLOW_REVIEW — Dem Owner zur Freigabe vorgelegt

### 1. Keine YELLOW_REVIEW-Entscheidungen in diesem Lauf
Alle Änderungen in diesem Anschlusslauf sind GREEN_SAFE oder Dokumentation.

### 2. Wichtiger Hinweis: Zukünftige YELLOW_REVIEW-Punkte
Falls Folge-Arbeiten nötig werden, die YELLOW_REVIEW sind:
- Änderung an `OpenCodeDryRunAgent`
- Änderung an `DeterministicFixtureAgent`
- Änderung an `BenchmarkRunner`-Verhalten (nicht nur Tests)
- Änderung an `apps/server` oder `apps/web`
- Neue Runtime-Abhängigkeiten
→ Diese würden als YELLOW_REVIEW klassifiziert und dem Owner vorgelegt.

## RED_HOLD — Bewusst nicht angefasst

| Aktion | Grund |
|--------|-------|
| `git push` | Remote-Schreibaktion |
| `git merge` | Zustandsmutation |
| `gh pr create` | Remote-Schreibaktion |
| GitHub Actions trigger | Remote-CI (Issue #268) |
| `.env`-Inhalte lesen/ausgeben | Secret-Exposition |
| PR #218 mergen/schließen | Human Approval erforderlich |
| Alte PR-Chain #230–#242 | Explizit ausgeschlossen |
| `.github/workflows/*` ändern | CI-Konfiguration |
| Autonomie erhöhen | Policy-Verstoß |

## UNKNOWN / TOOL_GAP — Dokumentierte Lücken

| Item | Status | Begründung |
|------|--------|------------|
| Mermaid-Diagramm-Validierung | TOOL_GAP | Kein lokaler Validator verfügbar |
| Coverage-Metrik-Genauigkeit | UNTEN | Hängt vom vitest v8 provider ab |
| Real-Mode-Ausführung | NEEDS_APPROVAL | Human Approval erforderlich |
| GitHub-Remote-Issue-Status | ADVISORY | Nur lokale facts sind Source of Truth |

## Entscheidungen, die die KI bewusst NICHT getroffen hat

1. **Keine Agent-Modifikation:** `DeterministicFixtureAgent` und `OpenCodeDryRunAgent` wurden nicht verändert — sie bleiben YELLOW_REVIEW.
2. **Keine echte Real-Mode-Ausführung:** Schreibaktionen nur in kontrollierten Evidence-Pfaden.
3. **Keine Coverage-Interpretation:** Die KI misst Coverage, interpretiert aber nicht, ob 85% "gut genug" ist — das ist eine menschliche Projektentscheidung.
4. **Keine Entscheidung über "nächsten Schritt":** Nur dokumentiert, was softwaretechnisch sinnvoll wäre — der Owner entscheidet über Prioritäten.

## Zusammenfassung der Entscheidungsverteilung

| Klasse | Anzahl | Beispiele |
|--------|--------|-----------|
| GREEN_SAFE (KI entscheidet) | 6 | Coverage-Script, Schema-Tests, Red Tests, Docs |
| YELLOW_REVIEW (Owner-Gate) | 0 | Nichts in diesem Lauf |
| RED_HOLD (Nie anfassen) | 9 | Push, Merge, PRs, CI, Secrets |
| UNKNOWN/TOOL_GAP | 4 | Mermaid, Coverage-Genauigkeit, Real-Mode, Remote |
