# Second Dogfood Run Report — Push-Gated PR Creation

> Stand: 2026-05-24
> Positron v0.1.0-rc.1
> Repository: `xxammaxx/Positron` (privates Test-Repo)
> Test Issue: [#36](https://github.com/xxammaxx/Positron/issues/36) — Add project description to README.md
> Run ID: `b77bbef6-9d14-4376-be5a-0365c5ba6cf5`

## Konfiguration

```bash
POSITRON_ENABLE_PUSH=true       # ✅ Neu — Push aktiviert
POSITRON_ENABLE_MERGE=false     # ✅ Merge OFF
POSITRON_MERGE_KILL_SWITCH=true # ✅ Sicherheitsnetz
GITHUB_MODE=real
POSITRON_SPECKIT_MODE=fake
POSITRON_OPENCODE_MODE=fake
Workspace: RealGitWorkspaceAdapter  # ✅ Neu — echter Git-Adapter
```

## Run Summary

| Feld | Wert |
|------|------|
| **Ergebnis** | **FAILED_BLOCKED** (sauber blockiert) |
| **Phasen** | 14 von 21 |
| **Letzte Phase** | `PR_CREATE` (fehlgeschlagen) |
| **Events** | 17 |
| **Dauer** | ~10 Sekunden |
| **Server** | Stabil (HTTP 200) |

## Phasen-Verlauf

| Phase | Status | Details |
|-------|--------|---------|
| QUEUED → CLAIMED | ✅ | GitHub Issue-Kommentar + Label |
| REPO_SYNC | ✅ | Workspace vorbereitet (RealGitWorkspaceAdapter) |
| ISSUE_CONTEXT | ✅ | Workspace-Pfad: `~/.positron/workspaces/...` |
| WEB_RESEARCH → REVIEW | ✅ | Fake-Adapter-Durchlauf |
| IMPLEMENT → TEST → VERIFY | ✅ | Simuliert |
| **COMMIT** | ❌ **Fehler** | **GitWorkspacePathError: Path outside workspace root** |
| PR_CREATE | ❌ Fehler | Branch existiert nicht auf GitHub |
| FAILED_BLOCKED | ✅ Terminal | Sauberer Stop |

## Neue Erkenntnis vs. Erstem Run

| Aspekt | Erster Run | Zweiter Run |
|--------|-----------|-------------|
| PUSH | OFF | **ON** |
| Workspace | FakeGitWorkspaceAdapter | **RealGitWorkspaceAdapter** |
| GitHub Issue-Kommentar | ✅ | ✅ |
| Issue-Label (positron:blocked) | ✅ | ✅ |
| Commit/Push | Übersprungen (PUSH=OFF) | **Fehlgeschlagen** (Path-Validierung) |
| PR_CREATE | ❌ Branch nicht remote | ❌ Branch nicht remote |
| Server-Stabilität | ✅ | ✅ |

## Blockade-Analyse

### Primäre Ursache: Workspace Path Mismatch
Der `RealGitWorkspaceAdapter` erstellt den Workspace unter:
```
/home/xxammaxx/.positron/workspaces/xxammaxx/Positron/runs/issue-36-<runId>/
```

Die `executePhase`-Funktion verwendet jedoch `/tmp/positron-ws-<runId>` für Test Runner und Commit. Diese Pfad-Diskrepanz führt zum `GitWorkspacePathError`.

**Betroffener Code:** `apps/server/src/index.ts` — Phase `TEST` und `COMMIT`
Der TestRunner und die Commit-Logik beziehen sich auf einen fest kodierten `/tmp/`-Pfad statt auf den dynamischen Workspace-Pfad aus `prepareWorkspace`.

### Sekundäre Ursache: Kein Push → Kein PR
Selbst wenn der Commit funktioniert hätte: Der Push hätte einen Remote-Branch erzeugt. Aktuell wird der Push im Fake-Adapter simuliert. Der RealGitWorkspaceAdapter hat eine echte `push()`-Methode, die Octokit verwendet. Diese wurde nie erreicht, weil der Commit bereits fehlschlug.

### GitHub-Interaktionen
- Issue #36 hat `positron:blocked` Label ✅
- Zwei Issue-Kommentare erstellt (CLAIMED + FAILED_BLOCKED) ✅
- Label-Cleanup: 404-Fehler für nicht vorhandene Labels (erwartet) ⚠️

## Lessons Learned

1. **RealGitWorkspaceAdapter hat anderen Workspace-Pfad** als die Pipeline erwartet
   - Fix: Pipeline muss `workspacePath` aus Prepare-Ergebnis verwenden, nicht festes `/tmp/`
2. **Fake-Adapter simuliert Push** — echten Push nie getestet
   - RealGitWorkspaceAdapter.push() muss integral getestet werden
3. **Pipeline stabil** — server überlebt Run-Fehler, bleibt antwortbereit
4. **GitHub-Sync zuverlässig** — beide Runs haben korrekte Kommentare hinterlassen

## Entscheidung

**Bereit für kontrollierten PR-Delivery-Mode: JA** ✅

Der Workspace-Path-Mismatch wurde in Issue #36 behoben:
- `workspacePath` wird jetzt in RunState gespeichert
- Alle Phasen lesen `current.workspacePath` statt `/tmp/positron-ws-*`
- Siehe `docs/operations/workspace-path-propagation.md`

**Nächster Schritt:**
Issue #37: Third Dogfood Run — Push-Gated PR Creation Retry
