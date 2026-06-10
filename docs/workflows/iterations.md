# Iterations-Workflow

Datum: 2026-06-09
Status: Draft
Diataxis: How-to

## Überblick

Jede Entwicklungsrunde in Positron wird als **Iteration** dokumentiert. Iterationen
halten fest, was umgesetzt wurde, welche Dateien geändert wurden, welche Erkenntnisse
gewonnen wurden und welche Probleme offen sind.

## Iterationskonzept

Eine Iteration ist eine abgeschlossene Arbeitseinheit — typischerweise ein oder mehrere
Issues, die in einer Session bearbeitet wurden. Jede Iteration erhält einen Eintrag in

```
docs/changelog/iteration-<n>.md
```

Die Nummerierung ist **automatisch aufsteigend**: Die nächste Iteration erhält die
Nummer `max(alle existierenden Iterationen) + 1`.

## Verwendung des Iteration-Log-Skripts

Positron stellt ein Skript zur Verfügung, das die Erstellung von Iteration-Einträgen
automatisiert:

```powershell
# scripts/iteration-log.ps1
# Aktuell: scripts/docs_check.ps1

# Geplant: scripts/iteration-log.ps1
# Führt aus:
# 1. Liest existierende Iteration-Nummern aus docs/changelog/
# 2. Erhöht die Nummer um 1
# 3. Erstellt docs/changelog/iteration-<n>.md mit Template
# 4. Öffnet die neue Datei zur Bearbeitung
```

**Verwendung:**

```powershell
# (geplant)
# pwsh scripts/iteration-log.ps1
# Erstellt: docs/changelog/iteration-4.md
```

**Manuelle Erstellung:**

```bash
# Nächste Iteration-Nummer ermitteln:
ls docs/changelog/iteration-*.md | wc -l
# (+1 für neue Nummer)

# Neue Datei erstellen:
touch docs/changelog/iteration-$(($(ls docs/changelog/iteration-*.md | wc -l) + 1)).md
```

## Template-Struktur

Jeder Iteration-Eintrag folgt dieser Struktur:

```markdown
# Iteration <n>

## Metadaten

- **Datum:** <YYYY-MM-DD>
- **Zeitstempel:** <HH:MM UTC>
- **Workflow-Zustand:** <Beschreibung, z.B. "Dokumentation erstellt">
- **Bearbeitet von:** <Wer, z.B. "KI (Issue Orchestrator) mit Nutzer">

## Umgesetzt

- <Issue/Task 1 — Kurzbeschreibung>
- <Issue/Task 2 — Kurzbeschreibung>
- <Issue/Task 3 — Kurzbeschreibung>

## Geänderte Dateien

- `<path>` (neu|geändert) — <Kurzbeschreibung der Änderung>
- `<path>` (neu|geändert) — <Kurzbeschreibung der Änderung>

## Neue Erkenntnisse

- <Erkenntnis 1>
- <Erkenntnis 2>

## Offene Probleme

- <Problem 1 — Status: offen|in Arbeit|gelöst>
- <Problem 2 — Status: offen|in Arbeit|gelöst>

## Fehler & Eskalationen

- <Fehler/Eskalation 1 — Status: gelöst|offen>
- <Fehler/Eskalation 2 — Status: gelöst|offen>

## Nächste Schritte

- <Nächster Schritt 1>
- <Nächster Schritt 2>
```

## Beispiele

Siehe existierende Iterationen:

- [Iteration 1](../changelog/iteration-1.md) — Initiale Projekteinrichtung
- [Iteration 2](../changelog/iteration-2.md) — (sofern vorhanden)
- [Iteration 3](../changelog/iteration-3.md) — (sofern vorhanden)

## Automatische Nummerierung

Die automatische Nummerierung funktioniert wie folgt:

```typescript
// Beispiel-Logik
function getNextIterationNumber(): number {
  const existing = readDir('docs/changelog/')
    .filter(f => f.match(/^iteration-(\d+)\.md$/))
    .map(f => parseInt(f.match(/^iteration-(\d+)\.md$/)[1]));
  return existing.length > 0 ? Math.max(...existing) + 1 : 1;
}
```

## Verwandte Dokumente

- [Vibe Coding](../reference/vibe-coding.md) — Session-Größenbeschränkung
- [Orchestrierung](orchestrierung.md) — Vollständiger Issue-to-Merge-Workflow
- [Quality Gates](qualitaetspruefung.md) — Prüfmatrix für Phasenübergänge
