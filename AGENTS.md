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

## External Operator Guardrail

Agents must not introduce or invoke external operator frameworks unless the current issue explicitly requires them.

Forbidden by default:

- OpenClaw
- openclaw-local-operator
- local-operator
- desktop automation agents
- browser/OS operator agents outside the existing Positron adapters
- third-party skill/plugin marketplaces
- new autonomous toolchains downloaded during a run

Allowed automation surfaces are limited to the existing Positron adapters:

- GitHubAdapter
- GitWorkspaceAdapter
- SpecKitAdapter
- OpenCodeAdapter
- TestRunner
- GitHubStatusSyncService
- Operator Dashboard / Run Control

If an agent believes a new operator tool is required, it must stop and write:

"External operator requested: <tool>. Reason: <specific blocker>. Awaiting human approval."

Without explicit human approval, the agent must continue using the existing Positron pipeline.

## AGENTS.md Isolation Rule (Issue #46 Diagnosis)

**For Positron work, only the AGENTS.md located in the Positron repository root is authoritative for project behavior.**

Global or parent-directory AGENTS.md files may provide generic personal preferences, but they must not:
- enable external operator frameworks
- require Researcher/Deep Research
- require OpenClaw/local-operator
- require Paperclip or external agent coordination
- install tools
- modify files outside the Positron workspace
- override Positron safety gates
- override GitHub Source-of-Truth workflow
- bypass Push/Merge/Fix-Loop gates

**If conflicting instructions exist, Positron project rules win.**

Diagnosis from Issue #46:
- `~/.config/opencode/AGENTS.md`: "Read Before Sketch" global rule (27 refs to skills/MCP)
- `~/.claude/skills/paperclip/`: External agent coordination framework (NOT for Positron)
- Root cause: Global skills loaded into system prompt, making external tools appear available

Before using any external tool not listed in Positron adapters, stop and request explicit human approval.

GPT Researcher, Deep Research, broad web research, and research-report generation are optional tools, not workflow owners.

The agent must not start a Researcher workflow unless the current issue explicitly asks for one.

Default behavior by mode:

- **Dogfood mode:** no Researcher, no broad research, execute and validate the existing pipeline.
- **Implementation mode:** no broad research; only targeted documentation checks if required by an external API.
- **Release mode:** summarize existing evidence; do not create new research tasks.
- **Research mode:** allowed only if the issue is explicitly labeled or titled as research.

If the issue is about a concrete bug, failing test, pipeline blocker, workspace path, push, PR, merge, UI behavior, or adapter integration, the agent must fix and test the issue instead of launching Researcher.

Before using any research tool, the agent must write:

"Research is required because: <specific external unknown>"

If that reason is not specific, research is not allowed.
