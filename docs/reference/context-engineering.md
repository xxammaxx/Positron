# Context Engineering — Context-Tier-Modell

Datum: 2026-06-09
Status: Draft
Diataxis: Reference

## Überblick

Context Engineering beschreibt das mehrstufige Kontext-Modell, das KI-Agenten in Positron
verwenden. Das Context-Tier-Modell unterteilt verfügbare Informationen in drei Temperaturstufen
(Cold, Warm, Hot), um die Token-Effizienz zu maximieren und gleich sicherzustellen, dass
relevante Informationen immer verfügbar sind.

## Context-Tier-Typ

Das Context-Tier-Modell wird als TypeScript-Typ in `packages/shared/` definiert:

```typescript
// packages/shared/src/types.ts (geplant)
export type ContextTier = 'cold' | 'warm' | 'hot';

export interface ContextManifest {
  sessionId: string;
  agent: string;
  cold: string[];   // Referenzen auf Cold-Context-Quellen
  warm: string[];   // Referenzen auf Warm-Context-Quellen
  hot: string[];    // Referenzen auf Hot-Context-Quellen
  timestamp: string;
}
```

## Cold Context

### Definition

**Cold Context** umfasst stabile, sich selten ändernde Projektinformationen. Diese werden
nur bei Bedarf geladen — typischerweise durch ein `skill`-Kommando oder bei initialer
Projekt-Einarbeitung.

### Beispiele

| Datei | Zweck | Auslöser |
|---|---|---|
| `.specify/memory/constitution.md` | Nicht verhandelbare Projektgrundlage, 10 Artikel | `skill load constitution` |
| `Blueprint.md` | Ursprüngliche Projektvision und Architektur | `skill load blueprint` |
| `README.md` | Öffentliche Projektbeschreibung, Quickstart | `skill load readme` |
| `CONTRIBUTING.md` | Contribution-Richtlinien | `skill load contributing` |
| `AGENTS.md` | Agenten-Regeln und Trust-Tiers | `skill load agents` |
| `docs/architecture/adr/*.md` | Architekturentscheidungen (immutable) | `skill load adr` |

### Lade-Regel

- **Nicht automatisch laden** — nur auf explizites `skill`-Kommando
- Nach einmaligem Laden für die Session gecached (Warm Context)
- Token-Budget: ~2000 Tokens pro Cold-Context-Quelle
- Ausnahme: `AGENTS.md` wird immer am Session-Start geladen

## Warm Context

### Definition

**Warm Context** umfasst den aktuellen Projektzustand — Informationen, die sich über
mehrere Sessions halten, aber nicht bei jedem Schritt neu geladen werden müssen.

### Beispiele

| Datei | Zweck | Aktualisierung |
|---|---|---|
| `AGENTS.md` | Agenten-Regeln (immer laden) | Session-Start |
| `docs/module-map.md` | Modul-Übersicht und Verantwortlichkeiten | Session-Start |
| `docs/dependency-graph.md` | Abhängigkeiten zwischen Modulen | Session-Start |
| `docs/reference/project-structure.md` | Verzeichnisstruktur | Session-Start |
| `docs/glossary.md` | Begriffsklärung | Session-Start |
| `llms.txt` | RAG-optimierter Kontext-Index | Session-Start |

### Lade-Regel

- **Automatisch laden** bei Session-Start und bei jedem Phasenwechsel
- Nach Phasenwechsel neu bewerten (möglicherweise in Hot Context überführen)
- Token-Budget: ~4000–6000 Tokens für Warm Context
- Kann während der Session durch Cold-Context-Ladung ergänzt werden

## Hot Context

### Definition

**Hot Context** umfasst die aktuell aktiven Arbeitsinformationen — exakt das, was der
Agent in diesem Moment benötigt.

### Beispiele

| Datei | Zweck | Besonderheit |
|---|---|---|
| `spec.md` | Spezifikation des aktuellen Issues | Wird bei ISSUE_CONTEXT geladen |
| `plan.md` | Implementierungsplan | Wird bei PLAN erstellt/geladen |
| `tasks.md` | Task-Aufschlüsselung | Wird bei TASKS erstellt/geladen |
| `run.json` | Run-Zustand und Phase | Immer aktuellster Stand |
| `error-logs` | Aktuelle Fehler- und CI-Logs | Nur bei Fehlern relevant |
| Test-Reports | Aktuelle Testergebnisse | Nach IMPLEMENT/TEST |

### Lade-Regel

- **Immer geladen** — Hot Context ist jederzeit im Prompt
- **Aktuellster Stand** — bei jedem Schritt neu eingelesen
- Token-Budget: ~8000–12000 Tokens für Hot Context
- Wird nach jedem Phasenübergang aktualisiert
- Enthält nur das, was für den aktuellen Schritt relevant ist

## Context Manifest

Das [Context Manifest](../agent/CONTEXT_MANIFEST_TEMPLATE.md) dokumentiert für jede Session,
welche Kontext-Quellen geladen wurden. Es folgt dem Template in:

```
docs/agent/CONTEXT_MANIFEST_TEMPLATE.md
```

Ein Context Manifest enthält:

- **Session Metadata:** UUID, Agent-Name, Start/Ende, Confidence
- **Token/Scope Budget:** Geschätzte vs. tatsächliche Tokens
- **Files Read:** Alle gelesenen Dateien mit Zweck
- **Files Modified:** Alle geänderten Dateien mit Grund
- **Context Layers:** Checkliste für Cold, Warm, Hot Context
- **Assumptions:** Getroffene Annahmen mit Confidence-Level
- **Evidence Log:** Verlinkung zu Testergebnissen, Builds, Diffs
- **Open Items:** Offene Fragen und Prioritäten
- **Sign-off:** Checkliste für Abschlussbedingungen

## Compression Rules

Um Token zu sparen, darf Kontext nach bestimmten Regeln komprimiert werden.

### Darf komprimiert werden (Rohdaten)

- Erfolgreiche CI-Logs (auf Zusammenfassung reduziert)
- Erfolgreiche Test-Durchläufe (nur Pass/Fail-Zusammenfassung)
- Bekannte Projektstrukturen (auf Modul-Namen reduziert)
- Alte Changelog-Einträge (auf Überschrift + Datum reduziert)
- Erfolgreiche Git-Operationen (auf Exit-Code reduziert)
- Lange Dependency-Listen (nur geänderte Dependencies)

### Darf NICHT komprimiert werden

- **Fehlerlogs und Stacktraces** — vollständig erhalten
- **CI-Fehlerausgaben** — vollständig erhalten
- **Test-Failures** — vollständig mit Assertion-Details
- **Aktuelle Diff-Ausgaben** — vollständig erhalten
- **Spec/Plan/Tasks-Dokumente** — vollständig erhalten
- **GitHub-Issue-Body und -Kommentare** — vollständig erhalten
- **Verification Contracts** — vollständig erhalten
- **Evidence-Logs** — vollständig erhalten
- **Security-relevante Ausgaben** — vollständig erhalten

### Verwandte Dokumente

- [Context Manifest Template](../agent/CONTEXT_MANIFEST_TEMPLATE.md)
- [Agentenmetriken](agentenmetriken.md) — Tokens, Kosten, Tool-Calls
- [Verification Contract](verification-contract.md) — Spezifikations-Prüfung
- [Fehlerbehandlung](fehlerbehandlung.md) — Fehlerzustände im Run
