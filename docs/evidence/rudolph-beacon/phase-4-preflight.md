# Phase 4 — Pre-Flight

**Timestamp:** 2026-06-24T15:55Z
**Run ID:** rudolph-phase-4-20260624

## Geplante Änderungen

### 1. Neue Red Tests (Aufgabe 2)
Tests zum Nachweis der Real-Mode-Blockade:
1. Real-Mode ohne `HUMAN_APPROVED_REAL=true` → nicht GREEN
2. Real-Mode ohne `POSITRON_ENABLE_REAL=true` → nicht GREEN
3. Real-Mode darf keine GitHub-Schreibaktion ausführen
4. Real-Mode darf keinen Push/Merge/PR erzeugen
5. Real-Mode darf keine Secrets ausgeben
6. Real-Mode mit ungültiger Summary → downgraded
7. Kontrollierter Real-Mode darf nur in erlaubte Evidence-Pfade schreiben
8. Commit-Readiness darf Dist-/Build-/Secret-Artefakte nicht als safe einstufen

### 2. Controlled Real-Mode Probe (Aufgabe 3)
Implementierung einer `runControlledRealModeProbe()` Funktion im Benchmark-Package:
- Prüft `HUMAN_APPROVED_REAL=true` und `POSITRON_ENABLE_REAL=true`
- Schreibt Evidence nur in `docs/evidence/rudolph-beacon/`
- Führt `validateRunSummary()` aus
- Keine GitHub-Aktion, kein Push/Merge/PR/Remote-CI
- Keine Secrets lesen/ausgeben
- Kein Netzwerk, keine echte Hardware

### 3. Phase-4 Evidence Artifakte (Aufgabe 5)
Erstellen/aktualisieren aller Evidence-Dokumente:
- Reality Refresh, Pre-Flight, Commit-Readiness, Gates, Summary JSON, Report, Reviewer Report

### 4. Status-Dokumente aktualisieren (Aufgabe 6)
- `CAPABILITIES.md` — Neue Fähigkeiten dokumentieren
- `KNOWN_LIMITATIONS.md` — Gelöste und neue Einschränkungen
- `RUN_REPORT.md` — Phase-4 Ergebnisse

### 5. Lokale Gates
- `git diff --check`
- `npm run build`
- `npm run typecheck`
- `npm run test:benchmark:rudolph`
- `npm run test:benchmark:rudolph:coverage`

## Klassifikation der Aktionen

### GREEN_SAFE (KI führt selbst aus)
- Test-Dateien im Benchmark-Package ergänzen
- `runControlledRealModeProbe()` im Benchmark-Package implementieren
- Evidence-Dokumente erstellen
- Status-Dokumente aktualisieren
- Lokale Gates ausführen
- Coverage messen

### YELLOW_REVIEW (nur vorbereiten, nicht ausführen)
- Keine in diesem Lauf

### RED_HOLD (niemals anfassen)
- Push, Merge, PR, Remote-CI
- GitHub Actions
- `.github/workflows/*`
- Stashes
- PR #218
- PR-Chain #230–#242
- Echte Secrets
- `.env`-Inhalte

## Real-Mode-Probe-Grenzen

Der Controlled Real-Mode Probe:
- ✅ Schreibt Evidence in `docs/evidence/rudolph-beacon/`
- ✅ Prüft Environment-Variablen (`HUMAN_APPROVED_REAL`, `POSITRON_ENABLE_REAL`)
- ✅ Prüft Kill-Switches (`POSITRON_ENABLE_PUSH`, `POSITRON_ENABLE_MERGE`, `POSITRON_MERGE_KILL_SWITCH`)
- ✅ Führt `validateRunSummary()` aus
- ✅ Wird als `controlled-local-probe` dokumentiert
- ❌ Kein GitHub-Schreibzugriff
- ❌ Kein Push, Merge, PR
- ❌ Kein Remote-CI
- ❌ Kein Netzwerk
- ❌ Keine echte Hardware (Bluetooth)
- ❌ Keine Secrets lesen/ausgeben
- ❌ Keine OpenCode-Schreibaktion außerhalb kontrollierter Pfade

## Rollback-Strategie

Da der Real-Mode-Probe vollständig lokal und harmlos ist:
- Kein Rollback nötig — Dateien sind Evidence-only
- Bei Fehlern: `git checkout -- packages/benchmark-rudolph/src/` setzt Code zurück
- Evidence-Dateien sind separat und können gelöscht werden

## Warum kein Push/PR/Merge/Remote-CI erfolgt

Phase 4 ist eine lokale Benchmark-Erweiterung:
1. Push/PR/Merge bleibt `RED_HOLD` — Human Approval erforderlich
2. Remote-CI ist per Issue #268 advisory-only
3. Der Controlled Real-Mode Probe ist lokal und harmlos
4. Kein GitHub-Schreibzugriff, kein Merge, kein Remote-CI

## KI-Entscheidungen (selbst getroffen)

1. **Test-Implementierung:** Die KI entscheidet selbst über Test-Struktur, Assertions und Coverage
2. **Controlled Real-Mode Probe Design:** Die KI entscheidet über Interface und Sicherheitsgrenzen
3. **Evidence-Dokumentstruktur:** Die KI entscheidet über Format und Inhalte
4. **Status-Klassifikation:** Die KI entscheidet, ob Tests von GREEN auf YELLOW/RED herabstufen

## Owner-Approval-Entscheidungen

1. **Commit:** Kein Commit ohne Human Approval
2. **Push/Merge/PR:** Bleibt RED_HOLD
3. **Real-Mode mit echten Secrets/Netzwerk:** Nur nach expliziter Owner-Freigabe
