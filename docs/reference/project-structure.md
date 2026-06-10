# Project Structure

Positron ist ein TypeScript-Monorepo mit npm Workspaces.

## Root-Verzeichnis

```
Positron/
├── apps/                    # Anwendungen
│   ├── server/              # Express-Backend (Orchestrator)
│   └── web/                 # React/Vite-Frontend
├── packages/                # Wiederverwendbare Pakete
│   ├── shared/              # Geteilte Typen, Utilities, Konstanten
│   ├── github-adapter/      # GitHub API Adapter
│   ├── speckit-adapter/     # Spec Kit CLI Adapter
│   ├── opencode-adapter/    # OpenCode CLI Adapter
│   ├── run-state/           # State Machine + SQLite-Persistenz
│   └── sandbox/             # Git Worktree / Docker-Isolation
├── docs/                    # Dokumentation (MkDocs)
├── e2e/                     # End-to-End Playwright Tests
├── scripts/                 # Build- und Utility-Skripte
├── reports/                 # CI-Report-Ausgaben
├── .github/                 # GitHub Actions, Templates
├── .specify/                # Speckit-Konfiguration
├── .opencode/               # OpenCode-Konfiguration
├── AGENTS.md                # KI-Agenten-Regeln
├── README.md                # Projekt-README
├── llms.txt                 # LLM-Kontext-Index
├── mkdocs.yml               # MkDocs-Konfiguration
├── package.json             # Root npm Workspace
├── tsconfig.json            # TypeScript Root-Konfiguration
├── vitest.config.ts         # Vitest-Konfiguration
└── playwright.config.ts     # Playwright-Konfiguration
```

## Module im Detail

Siehe [Modul-Karte](../module-map.md) für detaillierte Beschreibungen aller Module.

## Package-Übersicht

| Package | Pfad | Rolle |
|---|---|---|
| **shared** | `packages/shared/` | Typen, Interfaces, Utilities, Konstanten |
| **run-state** | `packages/run-state/` | State Machine, Run-Management, Events, SQLite |
| **sandbox** | `packages/sandbox/` | Git Worktrees, isolierte Ausführung |
| **github-adapter** | `packages/github-adapter/` | GitHub API (Issues, PRs, Comments, Labels) |
| **speckit-adapter** | `packages/speckit-adapter/` | Spec Kit CLI (Spec, Plan, Tasks) |
| **opencode-adapter** | `packages/opencode-adapter/` | OpenCode CLI (Agenten-Start, Konfiguration) |
| **web** | `apps/web/` | React/Vite/Tailwind Frontend |
| **server** | `apps/server/` | Express/REST/S SE Backend |

## Dependency Graph

```
shared ─→ run-state ─→ server
shared ─→ sandbox ─→ opencode-adapter ─→ server
shared ─→ github-adapter ───────────────→ server
shared ─→ speckit-adapter ──────────────→ server
server  ↔ web (HTTP API + SSE; keine Code-Imports)
```

Siehe auch: [Abhängigkeitsgraph](../dependency-graph.md)

## Key Files

| Datei | Zweck |
|---|---|
| `tsconfig.json` | TypeScript-Projektreferenzen (Composite Build) |
| `package.json` | npm Workspaces, Build/Test/Lint-Skripte |
| `vitest.config.ts` | Unit/Integration-Test-Runner |
| `playwright.config.ts` | E2E-Browser-Test-Runner |
| `.env.example` | Vorlage für Server-Umgebungsvariablen |
| `mkdocs.yml` | Dokumentations-Build-Konfiguration |
| `.markdownlint.json` | Markdown-Linting-Regeln |

## Build-System

Positron verwendet TypeScript Composite Builds:

```bash
npm run build        # tsc -b packages/... apps/server
npm run typecheck    # tsc -b --dry (nur Typ-Prüfung)
npm run clean        # dist/-Verzeichnisse löschen
```

Frontend-Build:
```bash
cd apps/web && npm run build    # Vite Production Build
cd apps/web && npm run dev      # Vite Dev Server
```

## Testing

```bash
npm test                        # Vitest (alle Packages und apps/server)
cd apps/web && npx vitest run   # Frontend-Tests
npm run test:e2e               # Playwright E2E
npm run typecheck              # TypeScript-Typprüfung
```
