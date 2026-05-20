# Issue #11 Initial Assessment

**Datum:** 2026-05-20

## Existing relevant modules

| Modul | Pfad | Relevanz |
|-------|------|---------|
| CommandRunner | `packages/sandbox/src/command-runner.ts` | ✅ spawn-basiert, CommandPolicy, Secret-Redaction |
| GitWorkspaceAdapter | `packages/sandbox/` | ✅ Workspace-Pfade, Clone |
| Server Orchestrator | `apps/server/src/index.ts` | ✅ TEST-Phase existiert |
| State Machine | `packages/run-state/` | ✅ Phasen, RunEvents |
| GitHub Adapter | `packages/github-adapter/` | ✅ Kommentar-Templates |

## Existing command execution infrastructure

- `runCommand()`: spawn mit getrennten args, shell:false, Timeout, stdout/stderr Redaction
- `CommandPolicy`: Erlaubte/Verbotene Subkommandos
- Kein Shell-String-Support

## Existing run lifecycle integration points

Server `executePhase()` hat `TEST`-Case (Zeile ~87): `transition(current, 'VERIFY', 'Tests passed')` — hier muss der echte Test-Detector/TestRunner eingehängt werden.

## Detected project test commands (Positron selbst)

Positron hat `scripts: { test: "vitest run", build: "tsc -b" }` im Root-package.json.

## Missing pieces

| Anforderung | Status |
|-------------|--------|
| TestCommandDetector | ❌ |
| TestRunner | ❌ |
| TestReport-Typ + Bewertung | ❌ |
| package.json Parsing + Script-Detection | ❌ |
| Command-Selection (smoke/standard/full) | ❌ |
| Dangerous-Script-Blocking | ❌ |
| Orchestrator TEST-Integration | ⚠️ Phase existiert, muss verdrahtet werden |

## Proposed implementation plan

1. `packages/sandbox/src/detector.ts` — TestCommandDetector
2. `packages/sandbox/src/test-runner.ts` — TestRunner + TestReport
3. Integration in Server TEST-Phase
4. Decision: Node/TypeScript-first, package.json-basiert

## Test-first plan

1. Detector: package.json Parsing
2. Selection: modes, dangerous blocking
3. Security: no shell strings
4. Report: PASS/FAIL/BLOCKED
5. Integration: orchestrated TEST phase
