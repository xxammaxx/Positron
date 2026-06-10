# Positron Glossary

Zentrale Begriffe und Definitionen des Positron-Ökosystems.

## A

### ADR (Architecture Decision Record)
Architekturentscheidung, dokumentiert in `docs/architecture/adr/`. Enthält Context, Decision, Consequences und Alternativen.

### Agent Metrics
Metriken zur Erfassung der Agenten-Leistung: Tokens, Kosten, Halluzinationen, Scope Creep, Tool-Calls. Siehe [Agentenmetriken](reference/agentenmetriken.md).

### Autonomy Level
Kontrollstufe für KI-Agenten (0–4):
- **Level 0 (Observer):** Nur lesen und analysieren
- **Level 1 (Research & Spec):** Recherche + Spezifikation
- **Level 2 (Supervised Build):** Codeänderungen mit Approval-Gates
- **Level 3 (Autonomous Sandbox):** Autonom im isolierten Workspace
- **Level 4 (CI Auto-PR):** Automatische PR-Erstellung

Siehe [Constitution](https://github.com/xxammaxx/Positron/blob/main/.specify/memory/constitution.md) Article V.

## B

### Blueprint
Ein strukturiertes Markdown-Dokument, das einen Positron-Run konfiguriert. Enthält Issue-Beschreibung, Zielsetzung und Ausführungsparameter.

## C

### Cold Context
Die unterste Stufe im [Context-Tier-Modell](reference/context-engineering.md). Stabile, selten geänderte Projektinformationen (Constitution, Blueprint, README), die nur bei Bedarf per `skill`-Kommando geladen werden.

### Constitution
Die nicht verhandelbare Projektgrundlage (`docs/specify/memory/constitution.md`). 10 Artikel, die alle Runs und Agenten binden.

### Context Tier
Dreistufiges Kontext-Modell (Cold / Warm / Hot) zur Steuerung der Informationsverfügbarkeit für KI-Agenten. Maximiert Token-Effizienz durch gestaffelte Lade-Regeln. Siehe [Context Engineering](reference/context-engineering.md).

## D

### Diátaxis
Dokumentations-Organisationsprinzip mit vier Quadranten:
- **Tutorials / Getting Started:** Lernpfade
- **How-to:** Konkrete Aufgaben
- **Reference:** Technische Fakten, APIs, CLI
- **Explanation:** Konzepte, Architektur, Entscheidungen

### Docs-as-Code
Dokumentation wird wie Code behandelt: versioniert in Git, im selben PR geändert, durch CI geprüft.

## E

### Error Escalation
5-Schritte-Prozedur zur Behandlung von Fehlern in Positron-Runs: Fehler erkennen → Diagnose → Optionen → BLOCKIERT → Freigabe. Siehe [Fehlerbehandlung](reference/fehlerbehandlung.md).

### Evidence Gate
Prüfpunkt im Positron-Workflow, der vor Fortschritt verifizierbare Beweise (Tests, Build, Diff) verlangt. Siehe Constitution Article IV.

### Event
Ein protokollierter Vorgang im Run-Lebenszyklus, persistiert in SQLite als `RunEvent`.

## F

### Fake Mode
Test-Double-Modus für Adapter (GitHub, SpecKit, OpenCode). Keine echten externen API-Aufrufe. Default für lokale Entwicklung.

## G

### Gate
Ein Prüfpunkt im Run-Workflow. Kann automatisch (Test-Gate) oder manuell (Human-Approval-Gate) sein.

## H

### Hot Context
Die oberste Stufe im [Context-Tier-Modell](reference/context-engineering.md). Aktuelle Arbeitsinformationen (spec, plan, tasks, run.json, error-logs), die immer geladen und bei jedem Schritt aktualisiert werden.

## I

### Issue
Ein GitHub-Issue, das einen Positron-Run auslöst. Jede Arbeitseinheit beginnt mit genau einem Issue.

## M

### MCP (Model Context Protocol)
Protokoll für KI-Agent-Tool-Interaktionen. Positron klassifiziert MCP-Tools in Trust Tiers (Tier 0–2).

### Monorepo
Repository-Struktur mit mehreren Packages/Apps in einem Git-Repo. Positron nutzt npm Workspaces.

## P

### Phase
Ein Zustand in der Positron State Machine (z.B. `QUEUED`, `SPECIFY`, `IMPLEMENT`, `DONE`). 18 definierte Phasen.

### PR (Pull Request)
GitHub Pull Request, erstellt von Positron nach erfolgreicher Implementierung und Test.

## Q

### Quality Gate
Prüfpunkt im Positron-Workflow, der vor jedem Phasenübergang verifiziert, ob alle Voraussetzungen erfüllt sind. Kann **blockierend** (Übergang verhindert) oder **Warning** (Übergang erlaubt, aber protokolliert) sein. Siehe [Quality-Gate-Matrix](workflows/qualitaetspruefung.md).

## R

### Real Mode
Echter Adapter-Modus mit externen API-Aufrufen (GitHub API, SpecKit CLI, OpenCode CLI).

### Run
Eine vollständige Positron-Ausführung von Issue-Ingestion bis PR/Merge. Persistiert in SQLite.

## S

### Sandbox
Isolierte Ausführungsumgebung (`packages/sandbox/`). Nutzt Git Worktrees für isolierte Branches.

### Speckit
Spezifikations-Workflow-Tool. Erzeugt strukturierte Artefakte: Spec, Plan, Tasks, Review.

### SSE (Server-Sent Events)
Protokoll für Live-Updates vom Server zum Frontend. Genutzt für Run-Event-Streaming.

### State Machine
Zustandsautomat in `packages/run-state/`. Definiert gültige Phasen-Übergänge und Run-Lebenszyklus.

## T

### Trust Tier
Berechtigungsstufe für MCP-Tools und Agenten:
- **Tier 0 (Readonly):** Kein Schreibzugriff
- **Tier 1 (Sandboxed):** Isolierte Ausführung
- **Tier 2 (Human-Gate):** Nur mit menschlicher Genehmigung

## V

### Verification Contract
Formales Dokument, das vor der Implementierung spezifiziert, was implementiert wird und wie der Erfolg gemessen wird. Enthält spec-hash, acceptance-criteria, test-commands und success-definition. Siehe [Verification Contract](reference/verification-contract.md).

### Vibe Coding
Prinzipien für effektive Agenten-Entwicklung: Klarer Modul-Scope, Session-Größe (max. 4h/400 LOC), keine zyklischen Abhängigkeiten, vertikale Schnitte, mindestens 3 messbare Akzeptanzkriterien. Siehe [Vibe-Coding-Prinzipien](reference/vibe-coding.md).

## W

### Warm Context
Die mittlere Stufe im [Context-Tier-Modell](reference/context-engineering.md). Aktueller Projektzustand (AGENTS.md, module-map.md, dependency-graph.md), automatisch bei Session-Start und Phasenwechsel geladen.

### Worktree
Git-Feature für parallele Working Copies. Positron nutzt Worktrees zur Sandbox-Isolation.

---

## Abkürzungen

| Abkürzung | Bedeutung |
|---|---|
| ADR | Architecture Decision Record |
| API | Application Programming Interface |
| CI | Continuous Integration |
| CLI | Command Line Interface |
| E2E | End-to-End |
| MCP | Model Context Protocol |
| PR | Pull Request |
| SSE | Server-Sent Events |
| SQL | Structured Query Language |
| TS | TypeScript |
| UI | User Interface |
