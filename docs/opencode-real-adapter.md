# OpenCode Real Adapter

> **Status:** PARTIAL — Tests pass, build green.
> **Production ready:** NO — Requires Live GitHub E2E validation + real OpenCode CLI.

## Purpose

Bindet die OpenCode CLI (`opencode`) sicher und testbar in Positron ein. Ermöglicht die Ausführung von Spec Kit Slash Commands (`/speckit.*`) über OpenCode und die IMPLEMENT-Phase.

## What This Adapter Does

1. **CLI Detection** — Erkennt ob `opencode` installiert und ausführbar ist
2. **Safe CLI Execution** — Führt `opencode run --command speckit.*` mit Policy-Validierung aus
3. **Slash Command Execution** — Führt `/speckit.specify`, `/speckit.plan`, `/speckit.tasks`, `/speckit.analyze` über OpenCode aus
4. **IMPLEMENT-Phase** — Führt OpenCode mit freiem Prompt zur Code-Implementierung aus
5. **Secret Redaction** — Redacted Secrets in stdout/stderr
6. **Session Tracking** — Extrahiert Session-ID aus OpenCode JSON-Output

## What This Adapter Does NOT Do

- OpenCode installieren
- OpenCode Extensions/Plugins installieren
- `--dangerously-skip-permissions` verwenden
- Git Commits/Push/PRs erzeugen (das macht der orchestrator oder spätere Phasen)

## Modes

### detect-only (Default)
- Nur CLI-Erkennung
- Keine Kommandos

### safe-cli
- Erlaubt `opencode run --command speckit.*`
- Blockiert `--dangerously-skip-permissions`
- Nur erlaubte Slash Commands (speckit.constitution, speckit.specify, speckit.clarify, speckit.plan, speckit.tasks, speckit.analyze, speckit.checklist)

## Supported Slash Commands

| Slash Command | Phase | Beschreibung |
|--------------|-------|-------------|
| `speckit.constitution` | constitution | Projekt-Prinzipien definieren |
| `speckit.specify` | specify | Spezifikation erstellen |
| `speckit.clarify` | clarify | Anforderungen klären |
| `speckit.plan` | plan | Implementierungsplan |
| `speckit.tasks` | tasks | Aufgabenliste |
| `speckit.analyze` | analyze | Analyse durchführen |
| `speckit.checklist` | checklist | Checkliste erstellen |

## Command Policy

- **Erlaubt:** `opencode run --command <allowed-slash-command>`
- **Blockiert:** `--dangerously-skip-permissions`, unbekannte Slash Commands, Shell-Metacharacter
- **Flags:** `-m` (model), `--format json` sind erlaubt
- **Timeout:** 5 Minuten für Slash Commands, 10 Minuten für IMPLEMENT

## Orchestrator Integration

```
IMPLEMENT phase:
  opencodeAdapter.runImplement(input)
    → opencode run --format json "Implement the changes..."
    → Status: success / failed / blocked

Optional (future):
  SPECIFY → opencodeAdapter.runSlashCommand('speckit.specify', input)
  PLAN    → opencodeAdapter.runSlashCommand('speckit.plan', input)
  TASKS   → opencodeAdapter.runSlashCommand('speckit.tasks', input)
  ANALYZE → opencodeAdapter.runSlashCommand('speckit.analyze', input)
```

## Files Changed

### New
- `packages/shared/src/opencode-types.ts` — OpenCodeAdapter interface
- `packages/shared/src/opencode-errors.ts` — 6 error classes
- `packages/sandbox/src/opencode-policy.ts` — Command policy
- `packages/opencode-adapter/src/real-adapter.ts` — RealOpenCodeAdapter
- `packages/opencode-adapter/src/fake-adapter.ts` — FakeOpenCodeAdapter
- `packages/sandbox/src/__tests__/opencode-policy.test.ts` — Policy tests (15 tests)
- `packages/opencode-adapter/src/__tests__/fake-adapter.test.ts` — Fake adapter tests (10 tests)
- `docs/opencode-real-adapter.md` — This document

### Modified
- `packages/shared/src/index.ts` — Added OpenCode exports
- `packages/sandbox/src/command-runner.ts` — Added `opencode` to allowed commands
- `packages/sandbox/src/index.ts` — Added policy exports
- `packages/opencode-adapter/src/index.ts` — Added adapter exports
- `packages/opencode-adapter/tsconfig.json` — Added sandbox reference
- `apps/server/src/index.ts` — Orchestrator DI + IMPLEMENT phase integration

## Known Limitations

1. Real OpenCode CLI not validated in CI (uses Fake adapter)
2. Live GitHub E2E pending (Issue #13)
3. IMPLEMENT phase prompt is basic — needs richer context
4. Slash commands only used in IMPLEMENT phase — SPECIFY/PLAN/TASKS/ANALYZE still use detect-only mode from Spec Kit adapter
