# Vibe-Coding-Prinzipien

Datum: 2026-06-09
Status: Draft
Diataxis: How-to

## Überblick

Vibe Coding beschreibt eine Reihe von Prinzipien für effektive, fokussierte Agenten-Entwicklung.
Diese Prinzipien stellen sicher, dass Issues in handhabbare, testbare Einheiten zerlegt werden
und dass Agenten ihre Arbeit in überschaubaren Sessions erledigen können.

## Die 5 Vibe-Coding-Prinzipien

### 1. Klarer Modul-Scope

Jedes Modul hat genau eine Verantwortlichkeit. Ein Issue darf nur Module betreffen,
die für diese Verantwortlichkeit relevant sind.

**Gut:** Ein Issue für "Erweiterung der GitHub-API um Label-Filter" betrifft nur
`packages/github-adapter/`.

**Schlecht:** Ein Issue "System-Optimierung" betrifft Server, Adapter, Frontend und
Datenbank gleichzeitig.

### 2. Session-Größe

Eine Entwicklungs-Session dauert maximal 2–4 Stunden und umfasst ~200–400 Zeilen
Code-Änderungen (netto, ohne Leerzeilen/Kommentare).

**Richtwerte:**

| Metrik | Grenzwert |
|---|---|
| `MAX_ISSUE_HOURS` | 4 Stunden |
| `MAX_ISSUE_LOC` | 400 Zeilen |
| `MAX_DIFF_SIZE` | 400 Zeilen |

**Überschreitung:** Wird die Session-Größe überschritten, muss das Issue in
Sub-Issues zerlegt werden.

### 3. Keine zyklischen Abhängigkeiten

Ein Issue darf keine zyklischen Abhängigkeiten zwischen Modulen erzeugen. Der
Dependency Graph muss azyklisch bleiben.

**Prüfung:** Vor Implementierung prüfen, ob die geplanten Änderungen neue
Abhängigkeiten einführen, die in die falsche Richtung zeigen.

**Aktueller Dependency Graph:**

```
shared → run-state → server
shared → sandbox → opencode-adapter → server
shared → github-adapter → server
shared → speckit-adapter → server
server ↔ web (HTTP/SSE — keine Code-Imports)
```

### 4. Vertikale Schnitte

Ein Issue implementiert einen **vertikalen Schnitt** durch den Stack — von der UI
bis zur Datenbank — nicht horizontale Schichten.

**Gut:** "Nutzer kann Run über CLI abbrechen" — betrifft CLI (Eingabe) → API (REST) →
State Machine (Phase) → SQLite (Persistenz). Ein durchgehender Flow.

**Schlecht:** "Refactoring der Datenbank-Query-Schicht" — betrifft nur eine
horizontale Schicht ohne sichtbaren Nutzen.

### 5. Mindestens 3 messbare Akzeptanzkriterien

Jedes Issue definiert mindestens 3 klar messbare Akzeptanzkriterien (`MIN_ACCEPTANCE_CRITERIA`).

**Gut für "Run-Cancel-API":**

1. POST `/api/runs/:id/cancel` gibt `200` bei erfolgreicher Abbrechung zurück
2. Der Run wechselt in Phase `CLEANUP` nach Cancel
3. Ein bereits abgeschlossener Run gibt `409 Conflict` zurück

**Schlecht:**

- "Das System soll stabiler sein"
- "Code-Qualität verbessern"
- "Bessere UX"

## Konstanten-Referenz

```typescript
// packages/shared/src/constants.ts
export const MAX_ISSUE_LOC = 400;
export const MAX_ISSUE_HOURS = 4;
export const MIN_ACCEPTANCE_CRITERIA = 3;
export const MAX_DIFF_SIZE = 400;
```

## Beispiele für gute Issues

### Issue: "Add label filter to GitHub issue list"

```markdown
## Beschreibung
Die GitHub-Issue-Liste soll nach Labels filterbar sein.

## Akzeptanzkriterien
1. GET /api/repos/:id/issues?label=bug gibt nur Issues mit Label `bug` zurück
2. Mehrere Labels (kommagetrennt) werden als UND-Verknüpfung unterstützt
3. Ohne Label-Parameter werden alle Issues zurückgegeben

## Modul-Scope
- packages/github-adapter/ — API-Erweiterung
- apps/server/ — neuer Query-Parameter

## Geschätzte Session
- ~3 Stunden
- ~250 Zeilen
```

### Issue: "Show run progress in frontend"

```markdown
## Beschreibung
Im Frontend-Dashboard soll der Fortschritt eines Runs als Prozentbalken
angezeigt werden.

## Akzeptanzkriterien
1. Fortschrittsbalken zeigt Phase-Index bezogen auf Gesamtphasen an
2. Bei terminalen Phasen (DONE/FAILED) bleibt Balken bei 100%
3. Tooltip zeigt aktuelle Phase und nächste Schritte

## Modul-Scope
- apps/web/ — neue Komponente RunProgress
- packages/shared/ — neue Utility phaseToProgress

## Geschätzte Session
- ~2 Stunden
- ~180 Zeilen
```

## Beispiele für schlechte Issues

### (X) Zu groß: "Rewrite whole frontend in Svelte"

```markdown
## Problem
Betrifft 20+ Komponenten, mehrere neue Libraries, neues Build-System.
Schätzung: > 40 Stunden, > 5000 Zeilen.
→ In 10+ Sub-Issues zerlegen.
```

### (X) Unklar: "Make system better"

```markdown
## Problem
Keine messbaren Kriterien. "Better" ist subjektiv.
→ Konkrete Metrik definieren: "Reduce error rate by 50%".
```

### (X) Zyklisch: "Refactor shared utilities"

```markdown
## Problem
shared ist die Basis aller Module. Ein Refactoring kann unerwartete
Abhängigkeiten erzeugen und Zyklen einführen.
→ Zuerst Dependency-Analyse, dann vertikale Schnitte planen.
```

## Verwandte Dokumente

- [Verification Contract](verification-contract.md) — Acceptance Criteria formalisieren
- [Orchestrierung](../workflows/orchestrierung.md) — Issue-to-Merge-Workflow
- [Quality Gates](../workflows/qualitaetspruefung.md) — Prüfmatrix für Phasenübergänge
- [AGENTS.md](https://github.com/xxammaxx/Positron/blob/main/AGENTS.md) — Agenten-Regeln
