# Positron — Evidence-Gated GitHub Issue Execution

[![Version](https://img.shields.io/badge/release-v0.1.0--rc.1-blue)](https://github.com/xxammaxx/Positron/releases/tag/v0.1.0-rc.1)
[![CI](https://github.com/xxammaxx/Positron/actions/workflows/verify-issues.yml/badge.svg)](https://github.com/xxammaxx/Positron/actions/workflows/verify-issues.yml)
[![Tests](https://img.shields.io/badge/tests-79%20passed-brightgreen)]()

Positron ist ein lokales GitHub-Issue-Ausführungssystem für agentische Softwareentwicklung.
Es verwandelt GitHub-Issues in überprüfbare, dokumentierte, getestete Pull Requests.

## Quick Start

```bash
# 1. Dependencies installieren
npm install

# 2. Umgebung konfigurieren
cp .env.example apps/server/.env
# Editiere apps/server/.env und setze POSITRON_REPO_OWNER und POSITRON_REPO_NAME

# 3. Bauen
npm run build

# 4. Server starten (Fake-Mode — kein GitHub Token nötig)
node apps/server/dist/index.js

# 5. Frontend-Dev-Server starten (neues Terminal)
cd apps/web && npm run dev

# 6. Browser öffnen
open http://localhost:5173
```

## Zusätzliche Einstiegspunkte

### CLI

Der Server exportiert einen `positron`-Binärbefehl (`apps/server/package.json`).
Das CLI spricht die REST-API des laufenden Servers an.

```bash
positron run --issueNumber 42 --autonomyLevel 2
```

- `--serverUrl` default: `http://localhost:3000`
- `--repoId` default: `repo-1`
- Server muss laufen, sonst schlägt der Aufruf fehl

Mehr dazu: `docs/workflows/cli.md`

### GitHub Watcher

Der Server enthält einen polling-basierten GitHub-Watcher unter
`apps/server/src/github-watcher.ts`.

- `POSITRON_ENABLE_WATCHER=true` aktiviert den Poller
- `POSITRON_WATCHER_INTERVAL_MS` setzt das Intervall in Millisekunden
- `POSITRON_WATCHER_LABELS=bug,feature` filtert nach Labels (kommagetrennt)
- Neue Open Issues werden mit `GitHubAdapter.listOpenIssues()` geprüft
- Bereits vorhandene Runs werden nicht dupliziert (idempotent)

## Architektur (kurz)

- **8 TypeScript Packages** im Monorepo
- **State Machine** mit 18 Phasen (QUEUED → DONE)
- **Adapter Pattern** für GitHub, SpecKit, OpenCode
- **SQLite** für Persistenz (via better-sqlite3)
- **React + Tailwind** Frontend (Vite)
- **Server-Sent Events** für Live-Updates

```
Web UI (React/Vite/Tailwind)
      ↕ SSE + REST API
Positron Orchestrator (Node.js/Express/TS)
  ├── GitHub API Adapter
  ├── Spec Kit Adapter
  ├── OpenCode Adapter
  └── Sandbox (Git Worktrees)
      ↕
SQLite (Runs, Events, Artifacts)
```

## Kernprinzipien

1. **Kein Code ohne Spec.**
2. **Kein Fortschritt ohne GitHub-Kommentare.**
3. **Kein Erfolg ohne Testbeweis.**
4. **Keine Vollautonomie außerhalb einer Sandbox.**

## Testing

```bash
npm test              # alle Tests (53 Backend + 30 Frontend)
npm run typecheck     # TypeScript Check
cd apps/web && npm run dev  # Frontend-Dev-Server
```

## Environment

Alle Variablen mit Beschreibung: `.env.example`

Wichtige Runtime-Variablen:

- `POSITRON_GITHUB_MODE` hat Vorrang vor dem Legacy-Fallback `GITHUB_MODE`
- `POSITRON_ENABLE_WATCHER`, `POSITRON_WATCHER_INTERVAL_MS`, `POSITRON_WATCHER_LABELS`
- `POSITRON_REPO_OWNER`, `POSITRON_REPO_NAME`

## Frontend

Das React-Frontend bietet:
- **Dashboard** mit Live-Übersicht aller Runs, Metriken und Filter
- **Run-Detail** mit Live-Log-Stream (SSE), Phasen-Timeline und Gate-Steuerung
- **Repositories** für Verwaltung von GitHub-Repos und Issue-Übersicht
- **Gate-Controls** für manuelle Genehmigung/Überarbeitung

## Dokumentation

- [Blueprint-Analyse](docs/blueprint-analysis.md)
- [Architektur](docs/architecture.md)
- [Modul-Karte](docs/module-map.md)
- [Abhängigkeitsgraph](docs/dependency-graph.md)
- [Constitution](.specify/memory/constitution.md)

## Lizenz

[MIT](LICENSE)
