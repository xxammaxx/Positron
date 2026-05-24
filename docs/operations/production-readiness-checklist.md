# Production Readiness Checklist

> Stand: 2026-05-24 · Positron v0.1.0-rc.1
> Vor jedem produktiven Einsatz eines neuen Repos ausfüllen.

## Repository-Basisdaten

| Feld | Wert |
|------|------|
| Repository | `________________________________` |
| Risikoklasse | 🟢 Level 1 / 🟡 Level 2 / 🟠 Level 3 / 🔴 Level 4 |
| Datum | `________` |
| Operator | `________` |

## Vor dem ersten Run

### Sicherheit
- [ ] GitHub Token hat nur benötigte Scopes (`repo` für L1-L3)
- [ ] Token ist nicht in Logs, Config-Dateien oder UI sichtbar
- [ ] `.env` ist `chmod 600` geschützt
- [ ] Kill-Switch ist aktiv (`POSITRON_MERGE_KILL_SWITCH=true`)
- [ ] Merge ist deaktiviert (`POSITRON_ENABLE_MERGE=false`)

### Repository-Konfiguration
- [ ] Branch Protection Rules aktiv (L2+)
- [ ] `main`/`master` ist geschützt
- [ ] Required Status Checks konfiguriert (L3)
- [ ] CODEOWNERS definiert (L3)
- [ ] CI/CD-Pipeline läuft und ist grün (L3+)

### Positron-Konfiguration
- [ ] `POSITRON_REPO_OWNER` korrekt gesetzt
- [ ] `POSITRON_REPO_NAME` korrekt gesetzt
- [ ] `GITHUB_MODE=real`
- [ ] Adapter-Modi korrekt (`fake`/`real`)
- [ ] `POSITRON_MERGE_DRY_RUN=true`
- [ ] `POSITRON_ENABLE_PUSH=false` (erst nach Test aktivieren)

## Erster Dry-Run

- [ ] Positron-Server läuft und Health-Check ist grün
- [ ] Test-Issue im Zielrepo erstellt
- [ ] Run gestartet und läuft ohne Fehler
- [ ] Issue wird geclaimt (Label + Kommentar)
- [ ] PR wird erstellt (oder sauber blockiert)
- [ ] Dry-Run Merge-Gates zeigen erwartetes Ergebnis
- [ ] Keine Secrets in Issue-Kommentaren oder PR-Body
- [ ] Dashboard zeigt korrekte Phasen und Status

## Vor erstem Push

- [ ] Dry-Run war erfolgreich
- [ ] Branch folgt `positron/issue-*` Pattern
- [ ] `POSITRON_ENABLE_PUSH=true` gesetzt
- [ ] Keine geschützten Branches betroffen
- [ ] `--force` ist hart blockiert

## Vor erstem Merge

- [ ] Push hat funktioniert
- [ ] Dry-Run zeigt `WOULD_MERGE` (7/7 Gates)
- [ ] `mergeable: clean` (nicht `checking`)
- [ ] PR ist open
- [ ] Status Checks sind grün (L3)
- [ ] Reviewer haben approved (L3)
- [ ] Operator hat überprüft und freigegeben
- [ ] `POSITRON_ENABLE_MERGE=true`
- [ ] `POSITRON_MERGE_KILL_SWITCH=false` NUR für diesen Run

## Nach dem Merge

- [ ] Merge-Commit auf Base-Branch verifiziert
- [ ] PR ist `merged`
- [ ] Issue ist `positron:done`
- [ ] **Kill-Switch sofort wieder aktivieren**
- [ ] **Merge sofort wieder deaktivieren**
- [ ] Run dokumentiert (Issue, PR, Merge-Commit)

## Nach dem Run

- [ ] Kill-Switch: `true` 🛡️
- [ ] Merge: `false` 🛡️
- [ ] Push: `false` 🛡️
- [ ] Ergebnis im Positron-Issue dokumentiert
- [ ] Lessons Learned notiert

## Unterschrift / Freigabe

```
Operator: ________________    Datum: ________________
Repo-Status nach Run:  🟢 PASS / 🟡 PARTIAL / 🔴 BLOCKED

Nächster Schritt: ________________________________
```
