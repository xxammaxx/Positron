# Positron Documentation

Willkommen in der Positron-Dokumentation. Positron ist ein **Evidence-Gated GitHub Issue Execution System** — es verwandelt GitHub-Issues in überprüfbare, dokumentierte, getestete Pull Requests.

## Überblick

Positron orchestriert kontrollierte, agentische Softwareentwicklung:

1. **Issue-Ingestion** — GitHub-Issue wird geladen und analysiert
2. **Repository-Sync** — Branch und Workspace werden vorbereitet
3. **Spezifikation** — Spec, Plan, Tasks werden generiert (Speckit)
4. **Implementierung** — Code-Änderungen durch KI-Agenten (OpenCode)
5. **Testing** — Automatisierte Tests laufen in isoliertem Workspace
6. **Evidence** — Jeder Schritt wird in GitHub dokumentiert und persistiert
7. **PR & Merge** — Pull Request wird erstellt, Merge nur mit grünen Gates

## Navigation

| Abschnitt | Beschreibung |
|---|---|
| [Getting Started](getting-started/quickstart.md) | Installation, Setup, erster Run |
| [How-to Guides](runbooks/development.md) | Konkrete Aufgaben und Workflows |
| [Reference](reference/project-structure.md) | API, CLI, Konfiguration, Projektstruktur, Module |
| [Explanation](architecture/README.md) | Konzepte, Architektur, Entscheidungen |
| [Architecture](architecture/README.md) | Technische Architektur (Stack, Diagramme, ADRs) |
| [Runbooks](runbooks/development.md) | Entwicklung, Build, Test, Troubleshooting |
| [Glossary](glossary.md) | Zentrale Begriffe und Definitionen |
| [Context Engineering](reference/context-engineering.md) | Context-Tier-Modell (Cold, Warm, Hot) |
| [Vibe Coding](reference/vibe-coding.md) | 5 Prinzipien für effektive Agenten-Entwicklung |
| [Quality Gates](workflows/qualitaetspruefung.md) | Gate-Matrix für Phasenübergänge |
| [Fehlerbehandlung](reference/fehlerbehandlung.md) | 5-Schritte-Eskalationsprozedur |
| [Iterations-Workflow](workflows/iterations.md) | Iterationen dokumentieren und verwalten |
| [Verification Contract](reference/verification-contract.md) | Formale Spezifikations-Prüfung |
| [Agentenmetriken](reference/agentenmetriken.md) | Tokens, Kosten, Halluzinationen, Tool-Calls |
| [Orchestrierung](workflows/orchestrierung.md) | Vollständiger Issue-to-Merge-Workflow |

## Für KI-Agenten

- **[AGENTS.md](https://github.com/xxammaxx/Positron/blob/main/AGENTS.md)** — Regeln für autonome Agenten
- **[llms.txt](https://github.com/xxammaxx/Positron/blob/main/llms.txt)** — Strukturierter Kontext-Index (RAG-optimiert)
- **[Agent Templates](agent/CONTEXT_MANIFEST_TEMPLATE.md)** — Context Manifest, Evidence Log

## Kernprinzipien

1. **Kein Code ohne Spec.**
2. **Kein Fortschritt ohne GitHub-Kommentare.**
3. **Kein Erfolg ohne Testbeweis.**
4. **Keine Vollautonomie außerhalb einer Sandbox.**

## Schnelleinstieg

```bash
npm install
cp .env.example apps/server/.env
npm run build
node apps/server/dist/index.js
```

Mehr Details: [Getting Started](getting-started/quickstart.md)
