# Spec Kit Real Adapter

> **Status:** PARTIAL — Tests pass, build green, integration functional.
> **Production ready:** NO — Requires Live GitHub E2E validation from Issue #13 first.

## Purpose

Der Spec Kit Real Adapter bindet die GitHub Spec Kit CLI (`specify`) sicher und testbar in Positron ein. Er ersetzt den bisherigen Stub (drei Funktionen mit Hardcoded-Strings) durch eine echte, policy-gesteuerte Adapter-Schicht.

## What This Adapter Does

1. **CLI Detection** — Erkennt ob `specify` installiert und ausführbar ist (`healthCheck`)
2. **Safe CLI Execution** — Führt nur erlaubte CLI-Kommandos aus (version, check, init)
3. **Artifact Detection** — Findet vorhandene Spec Kit Artefakte im Workspace
4. **Artifact Mapping** — Mappt Spec Kit Artefakte auf Positron-Artifakt-Datenmodell
5. **Secret Redaction** — Redacted Secrets in stdout/stderr vor Speicherung
6. **Honest Documentation** — Dokumentiert Agent Slash Commands als nicht-direkt-ausführbar

## What This Adapter Does NOT Do

- Agent Slash Commands ausführen (`/speckit.specify`, `/speckit.plan`, etc.)
- Spec Kit installieren oder herunterladen
- Extensions, Presets oder Workflows installieren
- Code implementieren
- Git Commits, Push, PRs erzeugen
- OpenCode oder andere LLMs aufrufen

## Modes

### detect-only (Default für Produktion)
- Prüft ob Spec Kit CLI im PATH ist
- Erkennt vorhandene Artefakte
- **Führt KEINE Kommandos aus**

### artifact-only (Default für Tests)
- Erkennt vorhandene Spec Kit Artefakte (constitution, spec, plan, tasks, etc.)
- Mappt Artefakte in Positron-Format
- **Führt keine neuen Spec Kit Kommandos aus**

### safe-cli (Opt-in für Tests/Entwicklung)
- Erlaubt `specify version`, `specify check`, `specify init`
- Blockiert Extensions, Presets, Downloads, Installation
- **Keine Agent Slash Command Ausführung**

## CLI Health Check

```typescript
const adapter = new RealSpecKitAdapter();
const health = await adapter.healthCheck(workspacePath);
// health.available === true  → CLI gefunden
// health.version === "0.8.12"
// health.supportsOpencode === true
// health.available === false → BLOCKED mit Installationsanleitung
```

Der Health Check:
1. Prüft `specify` im PATH via `which`
2. Führt `specify version` aus und parst die Version
3. Optional: `specify version --features --json` für opencode-Support-Check

## Supported Safe Commands

| Command | Erlaubt | Modus |
|---------|---------|-------|
| `specify version` | YES | safe-cli |
| `specify version --json` | YES | safe-cli |
| `specify version --features --json` | YES | safe-cli |
| `specify check` | YES | safe-cli |
| `specify init . --integration opencode` | YES | safe-cli |
| `specify init . --integration generic` | YES | safe-cli |

## Blocked Commands

| Command | Grund |
|---------|-------|
| `specify extension *` | Downloads/installiert externen Code |
| `specify preset *` | Downloads/installiert externen Code |
| `specify integration *` | Verwaltet Integrationen (nicht nötig) |
| `specify workflow *` | Verwaltet Workflows (nicht nötig) |
| `specify init --ai *` | Deprecated flag |
| `specify init --preset *` | Externe Presets |
| `specify init --extension *` | Externe Extensions |
| `specify init /absolute/path` | Pfad-Traversal |
| `specify init ../../escape` | Pfad-Traversal |

## Unsupported Slash-Command Phases

Die folgenden Spec Kit Phasen sind **Agent Slash Commands** und können NICHT direkt als CLI-Kommandos ausgeführt werden:

| Phase | Slash Command | Adapter-Verhalten |
|-------|--------------|------------------|
| Constitution | `/speckit.constitution` | Artefakt-Erkennung (`.specify/memory/constitution.md`) |
| Specify | `/speckit.specify` | BLOCKED (safe-cli) oder Artefakt-Erkennung |
| Clarify | `/speckit.clarify` | BLOCKED (safe-cli) oder Artefakt-Erkennung |
| Plan | `/speckit.plan` | BLOCKED (safe-cli) oder Artefakt-Erkennung |
| Tasks | `/speckit.tasks` | BLOCKED (safe-cli) oder Artefakt-Erkennung |
| Checklist | `/speckit.checklist` | BLOCKED (safe-cli) oder Artefakt-Erkennung |
| Analyze | `/speckit.analyze` | BLOCKED (safe-cli) oder Artefakt-Erkennung |
| Implement | `/speckit.implement` | NICHT in Scope (Issue #15) |

In `safe-cli` Mode geben diese Methoden `status: 'blocked'` mit einer klaren Erklärung zurück.

In `artifact-only` oder `detect-only` Mode suchen sie nach vorhandenen Artefakten und geben `status: 'success'` (Artefakte gefunden) oder `status: 'skipped'` (keine Artefakte) zurück.

## Artifact Detection

Der Adapter scannt den Workspace nach folgenden Artefakten:

| Pfad | Kind |
|------|------|
| `.specify/memory/constitution.md` | `constitution` |
| `specs/<feature>/spec.md` | `spec` |
| `specs/<feature>/plan.md` | `plan` |
| `specs/<feature>/tasks.md` | `tasks` |
| `specs/<feature>/research.md` | `research` |
| `specs/<feature>/data-model.md` | `data-model` |
| `specs/<feature>/quickstart.md` | `quickstart` |
| `specs/<feature>/checklists/*.md` | `checklist` |
| `specs/<feature>/contracts/*` | `contract` |

Für jedes Artefakt wird berechnet:
- `kind` — Typ des Artefakts
- `path` — relativer Pfad im Workspace
- `exists` — `true` (nur existierende Dateien werden erkannt)
- `sha256` — SHA-256 Hash des Inhalts

### Sicherheitsregeln für Detection
- Nur innerhalb `workspacePath` suchen
- Symlinks werden **nicht** gefolgt
- `..` wird durch `resolve()` normalisiert
- UTF-8 wird korrekt gelesen (Umlaute bleiben erhalten)
- Pfade werden relativ gespeichert

## Command Policy

Die Spec Kit Command Policy (`packages/sandbox/src/speckit-policy.ts`) setzt folgende Regeln durch:

1. **Nur `specify`** als Kommando erlaubt
2. **Nur erlaubte Subkommandos:** version, check, init
3. **Explizit blockierte Subkommandos:** extension, preset, integration, workflow
4. **Init-Flags validiert:** --ai, --preset, --extension sind blockiert
5. **Integrations-Check:** Nur opencode und generic erlaubt
6. **Shell-Metacharacter-Blocking:** `;|&\`$#!<>~`
7. **Pfad-Validierung:** Keine absoluten Pfade, kein `..`

Die Policy ist in `runCommand()` (sandbox) integriert und wird automatisch beim `spawn()`-Aufruf geprüft.

## Security Notes

- **Kein `shell: true`** — Alle Kommandos werden via `spawn()` mit `shell: false` ausgeführt
- **Keine Shell-Strings** — Args werden als Array übergeben
- **Secret Redaction** — Alle stdout/stderr-Inhalte werden vor Speicherung redacted (7 Regeln aus `@positron/shared`)
- **Safe Env** — Nur PATH und HOME werden an Kindprozesse weitergegeben
- **Timeout** — Jedes CLI-Kommando hat ein 120s Timeout
- **Buffer-Limit** — stdout/stderr auf 1MB begrenzt
- **Keine Installation** — Dieses Issue installiert Spec Kit nicht
- **Keine Downloads** — Keine `uvx --from`, `pip install`, `curl`, `wget`
- **Keine Secrets in Fehlern** — Alle Fehlermeldungen werden redacted

## Live GitHub E2E Caveat (Issue #13)

**WICHTIG:** Der Spec Kit Real Adapter ist **nicht** als production-ready markiert, bis der Live-GitHub-E2E-Test aus Issue #13 gegen ein echtes Testrepository ausgeführt wurde.

- Real Spec Kit Tests erfordern `POSITRON_ENABLE_REAL_SPECKIT_TESTS=true`
- Ohne Flag nutzen Tests Fake CLI oder werden übersprungen
- Produktion defaultet auf `detect-only`

## Known Limitations

1. **Slash Commands nicht ausführbar** — Erfordert Issue #16 (OpenCode Real Adapter)
2. **Keine echte Code-Implementierung** — Folge-Issues
3. **Keine automatische Spec Kit Installation** — Muss manuell installiert werden
4. **Live E2E nicht validiert** — Issue #13 Blocker
5. **Kein Auto-Fix / PR / Merge** — Außerhalb Scope

## How to Test

```bash
# Normale Tests (mit Fake CLI):
npm test

# Spec Kit-spezifische Tests:
npx vitest run packages/speckit-adapter
npx vitest run packages/sandbox/src/__tests__/speckit-policy

# Mit realem Spec Kit (nur wenn installiert):
POSITRON_ENABLE_REAL_SPECKIT_TESTS=true npm test

# Manueller Health Check:
specify version
specify check
```

## Architecture

```
apps/server/src/index.ts (Orchestrator)
  │
  ├── ServerOptions.speckitAdapter?: SpecKitAdapter
  │
  ├── resolveSpecKitAdapter()
  │   ├── FakeSpecKitAdapter (default/test)
  │   └── RealSpecKitAdapter (POSITRON_SPECKIT_MODE=real)
  │
  └── executePhase(..., speckit)
      ├── SPECIFY → speckit.runSpecify()
      ├── PLAN    → speckit.runPlan()
      ├── TASKS   → speckit.runTasks()
      └── ANALYZE → speckit.runAnalyze()

packages/speckit-adapter/
  ├── src/
  │   ├── index.ts           # Barrel Export + Legacy Stubs
  │   ├── real-adapter.ts    # RealSpecKitAdapter
  │   ├── fake-adapter.ts    # FakeSpecKitAdapter (test double)
  │   ├── artifact-scanner.ts # Workspace Scanner
  │   └── __tests__/
  │       ├── artifact-scanner.test.ts
  │       ├── real-adapter.test.ts
  │       └── fake-adapter.test.ts
  └── package.json

packages/sandbox/
  └── src/
      ├── speckit-policy.ts  # SpecKitCommandPolicy
      ├── command-runner.ts  # runCommand() + specify validation
      └── __tests__/
          └── speckit-policy.test.ts

packages/shared/
  └── src/
      ├── speckit-types.ts   # SpecKitAdapter interface + types
      ├── speckit-errors.ts  # SpecKit error classes
      └── index.ts           # Barrel export
```

## Files Changed (Issue #15)

### New Files
| File | Purpose |
|------|---------|
| `packages/shared/src/speckit-types.ts` | SpecKitAdapter interface, types |
| `packages/shared/src/speckit-errors.ts` | SpecKit error classes (7 errors) |
| `packages/sandbox/src/speckit-policy.ts` | SpecKitCommandPolicy |
| `packages/speckit-adapter/src/artifact-scanner.ts` | Workspace scanner |
| `packages/speckit-adapter/src/real-adapter.ts` | RealSpecKitAdapter |
| `packages/speckit-adapter/src/fake-adapter.ts` | FakeSpecKitAdapter |
| `packages/speckit-adapter/src/__tests__/artifact-scanner.test.ts` | Scanner tests (20 tests) |
| `packages/speckit-adapter/src/__tests__/real-adapter.test.ts` | Real adapter tests (24 tests) |
| `packages/speckit-adapter/src/__tests__/fake-adapter.test.ts` | Fake adapter tests (16 tests) |
| `packages/sandbox/src/__tests__/speckit-policy.test.ts` | Policy tests (27 tests) |
| `docs/issues/issue-15-speckit-real-adapter-assessment.md` | Initial assessment |
| `docs/research/speckit-real-adapter-validation.md` | Research validation |
| `docs/speckit-real-adapter.md` | Main documentation |

### Modified Files
| File | Change |
|------|--------|
| `packages/shared/src/index.ts` | Added SpecKit types & errors to barrel export |
| `packages/sandbox/src/command-runner.ts` | Added `specify` to allowed commands + subcommand validation |
| `packages/sandbox/src/index.ts` | Added SpecKit policy exports |
| `packages/speckit-adapter/src/index.ts` | Added real/fake adapter + scanner exports |
| `packages/speckit-adapter/tsconfig.json` | Added sandbox reference |
| `packages/speckit-adapter/package.json` | Added @positron/sandbox dependency |
| `apps/server/src/index.ts` | Added speckitAdapter injection + phase integration |
