# Rollback / Revert Runbook

> Positron — Betriebshandbuch für Notfälle

## Merge-Revert

### Szenario: Auto-Merge wurde ausgeführt, muss rückgängig gemacht werden

```bash
# 1. Merge-Commit identifizieren (aus GitHub-Kommentar oder git log)
git log --oneline -5

# 2. Revert ausführen
git revert -m 1 <merge-sha>

# 3. Revert-Commit pushen (manuell, nicht via Positron)
git push origin main

# 4. Issue-Status aktualisieren
# Label positron:merged entfernen, positron:failed setzen
```

### Szenario: Branch muss gelöscht werden

```bash
# Positron-Branch entfernen
git push origin --delete positron/issue-<N>-<slug>
```

## Not-Aus

### Szenario: Positron verhält sich unerwartet

| Aktion | Befehl |
|--------|--------|
| Kill-Switch aktivieren | `export POSITRON_MERGE_KILL_SWITCH=true` (nächster Run) |
| Server stoppen | `kill <pid>` oder `docker stop positron` |
| Push blockieren | `export POSITRON_ENABLE_PUSH=false` |
| Merge blockieren | `export POSITRON_ENABLE_MERGE=false` |

### Szenario: Rate-Limit erreicht

Positron erkennt GitHub Rate Limits und pausiert automatisch. Symptome:
- 403/429 Responses in Logs
- `X-RateLimit-Remaining: 0` Header

Manuelle Lösung:
```bash
# Warten bis Rate-Limit-Reset (siehe X-RateLimit-Reset Header)
# Oder Token mit höherem Limit verwenden
```

## Audit-Trail prüfen

```bash
# Alle Positron-Kommentare in einem Issue finden
gh issue view <N> --comments | grep "positron:run="

# Labels auf dem Issue prüfen
gh issue view <N> --json labels

# Letzte Runs im Server-Log
grep "Run.*transition" server.log
```

## Recovery nach Fehler

1. Issue-Status auf GitHub prüfen
2. Labels manuell zurücksetzen falls nötig
3. Positron-Run manuell via API neustarten:
   ```bash
   curl -X POST http://localhost:3000/api/repos/repo-1/runs \
     -H 'Content-Type: application/json' \
     -d '{"issueNumber": <N>, "autonomyLevel": 2}'
   ```
4. Logs auf Fehlerursache prüfen
