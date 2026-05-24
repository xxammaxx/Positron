# Supervised Dogfood Run — Lessons Learned

> Stand: 2026-05-24
> Positron v0.1.0-rc.1
> Run ID: `a077cb4c-ad39-4dde-af71-49f8eca15c2f`
> Test Issue: [#34](https://github.com/xxammaxx/Positron/issues/34)

## Zusammenfassung

Der erste supervised Dogfood Run gegen ein echtes GitHub-Repository (`xxammaxx/Positron`) hat gezeigt:

- **GitHub Interaction Pipeline funktioniert end-to-end** ✅
- **Safety Gates halten wie spezifiziert** ✅
- **Pipeline durchläuft 14/21 Phasen korrekt** ✅
- **Blockade an der Delivery-Grenze ist erwartetes Verhalten** ✅
- **Nächster Schritt: PUSH aktivieren für PR_CREATE-Test** ✅

## Was wir gelernt haben

### 1. Issue Claiming funktioniert gegen echtes GitHub
Positron erstellt korrekt Issue-Kommentare mit Run-ID und Phase. Der Claim-Mechanismus erkennt offene Issues, setzt Labels (`positron:blocked`, `positron:running`) und hinterlässt strukturierte Kommentare.

**Erkenntnis:** Der GitHub-Adapter im Real-Mode arbeitet zuverlässig. Keine Rate-Limiting-Probleme aufgetreten.

### 2. Workspace-Vorbereitung funktioniert
Der FakeGitWorkspaceAdapter erstellt einen Workspace-Pfad unter `.positron/workspaces/`. Für reale Runs (mit Code-Ausführung) wäre der RealGitWorkspaceAdapter erforderlich.

**Erkenntnis:** Der Workspace-Pfad wird korrekt generiert, aber der Fake-Adapter kann kein echtes Repo klonen. Für PUSH=ON muss der RealGitWorkspaceAdapter verwendet werden.

### 3. SpecKit/OpenCode Fake-Adapter sind deterministisch
Die Fake-Adapter durchlaufen die Phasen SPECIFY, PLAN, TASKS, ANALYZE, REVIEW, IMPLEMENT ohne Seiteneffekte. Sie produzieren Warnungen dass Artefakte fehlen, blockieren aber nicht.

**Erkenntnis:** Die Fake-Adapter sind ausreichend für Pipeline-Tests. Für echte Code-Generierung braucht es Real-Adapter (späteres Issue).

### 4. Push-Gate funktioniert absolut zuverlässig
Mit `POSITRON_ENABLE_PUSH=false` wird der Commit lokal erstellt aber nie gepusht. Die Pipeline loggt „push skipped" und fährt fort bis PR_CREATE.

**Erkenntnis:** Das Push-Gate ist das kritischste Safety-Gate. Es verhindert zuverlässig, dass Code unkontrolliert auf GitHub landet.

### 5. PR_CREATE ohne Remote-Branch blockiert korrekt
GitHub's API akzeptiert keine PRs mit Branches, die nicht remote existieren. Positron gibt den API-Fehler als ERROR weiter und geht zu FAILED_BLOCKED.

**Erkenntnis:** Die Fehlermeldung ist aktuell ein roher GitHub-API-Fehler. Für bessere UX sollte Positron erkennen: „Branch nicht auf GitHub — Push erforderlich" und eine eigene Fehlermeldung ausgeben.

### 6. Status Sync nach FAILED_BLOCKED funktioniert
Nach dem Blockade-Ereignis erstellt Positron einen Issue-Kommentar mit:
- Run-ID
- Phase (`FAILED_BLOCKED`)
- Grund („Run blocked: max steps or policy violation")
- Setzt `positron:blocked` Label

**Erkenntnis:** Der Sync-Mechanismus arbeitet zuverlässig im Fehlerfall.

### 7. Server bleibt nach Run stabil
Nach dem Run-Fehler bleibt der Server lauffähig. Weitere API-Aufrufe (Health-Check, Run-Listing) funktionieren.

**Erkenntnis:** Kein Memory-Leak oder Zombie-Prozess nach fehlgeschlagenen Runs.

## Probleme und Verbesserungen

### Kritisch
Keine. Der Run hat sich wie erwartet verhalten.

### Verbesserungswürdig
| # | Problem | Lösung |
|---|---------|--------|
| 1 | PR_CREATE-Fehlermeldung ist roher GitHub-API-Fehler | Branch-Existenz vor PR-Creation prüfen, eigene Fehlermeldung |
| 2 | Workspace-Bereinigung nach FAILED_BLOCKED | Cleanup-Logik nach terminalem Status |
| 3 | Keine Run-Suche/Filter im Dashboard | Für später (niedrige Priorität) |
| 4 | In-Memory-Runs gehen bei Server-Neustart verloren | SQLite-Persistenz für Runs (späteres Issue) |

## Empfehlungen für zweiten Dogfood Run

1. **POSITRON_ENABLE_PUSH=true** setzen
2. **POSITRON_ENABLE_MERGE=false** (weiterhin OFF)
3. RealGitWorkspaceAdapter verwenden (oder FakeAdapter der Push simuliert)
4. Neues Test-Issue erstellen (oder Label von #34 zurücksetzen)
5. Ziel: PR_CREATE erreichen und PR-Link validieren
6. Reviewer-Automation non-blocking testen

## Checkliste für zweiten Run

- [ ] PUSH aktiviert (`POSITRON_ENABLE_PUSH=true`)
- [ ] Merge deaktiviert (`POSITRON_ENABLE_MERGE=false`)
- [ ] Kill-Switch bereit (`POSITRON_MERGE_KILL_SWITCH=true`)
- [ ] Neues Test-Issue erstellt
- [ ] Branch-Label geprüft (nur `positron/issue-*`)
- [ ] --force blockiert (hart codiert)
- [ ] Dashboard während Runs beobachten
- [ ] PR-Link nach Run prüfen
- [ ] Secrets-Kontrolle nach Run
