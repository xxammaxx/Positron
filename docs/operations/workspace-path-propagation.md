# Workspace Path Propagation Fix

> Stand: 2026-05-24
> Issue: #36 — Fix Workspace Path Propagation in Pipeline

## Problem

Der `RealGitWorkspaceAdapter.prepareWorkspace()` erzeugt einen Workspace unter:
```
~/.positron/workspaces/<owner>/<repo>/runs/issue-<N>-<runId>/
```

Die Pipeline-Phasen (SPECIFY, PLAN, TASKS, ANALYZE, IMPLEMENT, TEST, COMMIT)
verwendeten jedoch einen hartkodierten Fallback-Pfad:
```
/tmp/positron-ws-<runId.slice(0,8)>
```

Dies führte zu `GitWorkspacePathError`, weil der TestRunner und die Commit-Logik
den Pfad `/tmp/positron-ws-*` ausserhalb des Workspace-Roots validierten.

## Lösung

1. **RunState** um `workspacePath: string | null` erweitert
2. **REPO_SYNC** speichert `ws.workspacePath` im Run-State
3. **Alle Phasen** lesen `current.workspacePath` statt Pfad neu zu konstruieren
4. **Fallback** nur noch in COMMIT als letzte Rückfallebene (`?? /tmp/positron-ws-...`)

## Geänderte Dateien

| Datei | Änderung |
|-------|----------|
| `packages/run-state/src/state-machine.ts` | `RunState.workspacePath` Feld hinzugefügt |
| `apps/server/src/index.ts` | Alle 8 hartkodierten `/tmp/positron-ws-*` durch `current.workspacePath` ersetzt |

## Pipeline-Durchfluss

```
REPO_SYNC
  → prepareWorkspace() liefert workspacePath
  → current.workspacePath = ws.workspacePath  ← SPEICHERN
  → transition(current, ISSUE_CONTEXT)

ISSUE_CONTEXT → WEB_RESEARCH → SPECIFY
  → const wsPath = current.workspacePath      ← LESEN
  → speckit.runSpecify({ workspacePath: wsPath })

PLAN → TASKS → ANALYZE → IMPLEMENT → TEST
  → const wsPath = current.workspacePath      ← LESEN
  → testRunner.runDetectedCommands({ workspacePath: wsPath })

VERIFY → COMMIT
  → const commitWsPath = current.workspacePath ← LESEN
  → workspace.commit(commitWsPath, ...)
  → workspace.push({ workspacePath: commitWsPath, ... })

PR_CREATE → MERGE → DONE
```

## Regressionstest

Der Bug war, dass `/tmp/positron-ws-*` als Pfad verwendet wurde, obwohl
der echte Workspace in `~/.positron/workspaces/` lag. Der Fix stellt sicher,
dass immer der von `prepareWorkspace` zurückgegebene Pfad verwendet wird.

Testszenario, das den Bug abdeckt:
1. RealGitWorkspaceAdapter erzeugt Workspace in `~/.positron/...`
2. Alle Phasen erhalten `workspacePath` aus Run-State
3. Kein Pfad wird neu konstruiert
4. `GitWorkspacePathError` tritt nicht mehr auf

## Bereit für dritten Dogfood-Run

**Entscheidung: JA** ✅

Mit diesem Fix ist die Pipeline bereit für einen dritten Dogfood-Run
mit `POSITRON_ENABLE_PUSH=true`. Der Workspace-Pfad wird korrekt
durch alle Phasen propagiert. Commit und Push sollten ohne
`GitWorkspacePathError` funktionieren.
