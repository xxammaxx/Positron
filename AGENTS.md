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

## Tests

- `npm test` in jedem Package
- `npx vitest run` für Unit/Integration
- `npx playwright test` für E2E

## MCP Usage Gate

Before implementation work, inspect the active OpenCode MCP configuration and document which MCP servers are available, connected, failed, or intentionally unused.

Prefer the smallest sufficient MCP set for the task.

Write-capable MCP tools require explicit task relevance and must be documented before use.

Secrets must never be written into repository files, issue comments, logs, or generated documentation.
