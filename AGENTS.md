# AGENTS.md — Positron-Regeln

## Nicht verhandelbarer Workflow

1. Lies zuerst diese Datei.
2. Lies `.specify/memory/constitution.md`.
3. Lies den aktiven Issue-Kontext.
4. Implementiere nicht vor Spec, Plan und Tasks.
5. Überspringe keine Tests.
6. Pushe nicht auf main/master.
7. Lege keine Secrets offen.
8. Dokumentiere jede Phase in GitHub.
9. Stoppe nach 3 erfolglosen Fix-Schleifen.
10. Hole Genehmigung für gefährliche Befehle ein.

## Workspace Root Rule

```text
C:\Positron ist der einzige normale Projektarbeitsort.

Keine neuen Schwesterordner neben C:\Positron:
- kein C:\Positron-clean-*
- kein C:\Positron-main-ci-*
- kein ..\Positron-*

Worktree-Isolation nur nach expliziter Human Approval und ausschließlich
unter C:\Positron\.agent-worktrees\.
```

## GitHub Source of Truth

Jede relevante Entscheidung, jeder Fehler, jedes Testergebnis und jeder Auslieferungsschritt muss im aktiven GitHub-Issue oder PR zusammengefasst werden.

## Scope Control

Löse nur das aktive Issue. Führe keine opportunistischen Refactorings durch, außer sie sind explizit in der Spec gefordert oder für Tests notwendig.

## Evidence Requirement

Eine Lösung ist erst vollständig, wenn Tests, Build-Status, Diff-Zusammenfassung und Akzeptanzkriterien-Mapping dokumentiert sind.

## Branch-Regel

```
positron/issue-<number>-<slug>
```

## Commit-Regel

```
fix(issue-<n>): <Beschreibung>
test(issue-<n>): <Beschreibung>
docs(issue-<n>): <Beschreibung>
```

## Module

- `apps/web/` — React/Vite/Tailwind Frontend
- `apps/server/` — Node.js/Express/TypeScript Backend
- `packages/github-adapter/` — GitHub API
- `packages/speckit-adapter/` — Spec Kit CLI
- `packages/opencode-adapter/` — OpenCode CLI
- `packages/run-state/` — State Machine
- `packages/sandbox/` — Git Worktrees
- `packages/shared/` — Typen, Utilities

## Agent Isolation

### Trust-Tier-System

| Tier | Zugriff | Beispiele |
|------|---------|-----------|
| **Tier 0 (Readonly)** | GitHub MCP (search/read), Brave Search, Context7 | Kein Schreibzugriff |
| **Tier 1 (Sandboxed)** | Playwright, Docker, SQLite (project-local) | Isolierte Ausführung |
| **Tier 2 (Human-Gate)** | FileSystem (external), PostgreSQL (readonly) | Nur mit Genehmigung |

### Externe Skills

- **🔴 Forbidden:** Paperclip (3), OpenClaw (3) — nicht installieren/nutzen
- **🟡 Quarantined:** Researcher, Deep Research, PARA, MCP — deaktiviert bis manuelle Freigabe
- **✅ Allowed:** 11 Positron-eigene Skills — vollständig geprüft

### Isolations-Level

| Level | Beschreibung | Gilt für |
|-------|-------------|----------|
| **L0 Unrestricted** | Keine Isolation | Kernsystem (Server, DB) |
| **L1 Workspace** | Workspace-beschränkt | Positron-Subagenten |
| **L2 Quarantined** | Sandbox + manuelles Gate | Externe Skills |
| **L3 Forbidden** | Vollständig blockiert | Paperclip, OpenClaw |

### Durchsetzung

1. Policy Gates: `speckit-policy.ts`, `opencode-policy.ts` blockieren nicht erlaubte Kommandos
2. Fake/Real Mode: Default `fake` — kein echter externer Zugriff ohne explizite Konfiguration
3. Kill-Switches: Merge (`POSITRON_MERGE_KILL_SWITCH`), Push (`POSITRON_ENABLE_PUSH`)
4. Evidence Gates: Keine Phase ohne prüfbare Artefakte
5. Max Fix Loops: Automatischer Stopp nach 3 Fehlschlägen

## Tests

- `npm test` in jedem Package
- `npx vitest run` für Unit/Integration
- `npx playwright test` für E2E
