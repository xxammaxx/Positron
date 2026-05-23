# Push Gates and Blocked Runs

> Wie Positron auf fehlende Freigaben reagiert

## Push-Gate

Push ist **standardmäßig blockiert**. Nur mit `POSITRON_ENABLE_PUSH=true` aktiv.

### Was passiert ohne Push?

```
COMMIT-Phase:     ✅ Commit wird lokal ausgeführt
PR_CREATE-Phase:  ❌ 422 Unprocessable Entity
                   → FAILED_BLOCKED
```

Der Branch existiert nur lokal. GitHub kann keinen PR erstellen, weil der Head-Branch nicht remote existiert. Positron erkennt dies und stoppt mit `FAILED_BLOCKED`.

### Was passiert mit Push?

```
COMMIT-Phase:     ✅ Commit + Push
PR_CREATE-Phase:  ✅ PR wird erstellt
MERGE-Phase:      ⏸️ Gegatet (POSITRON_ENABLE_MERGE)
```

## Blocked-Run-Verhalten

Ein Run kann aus verschiedenen Gründen `BLOCKED`/`FAILED_BLOCKED` sein:

| Grund | Phase | Verhalten |
|-------|-------|-----------|
| Push nicht enabled | PR_CREATE | FAILED_BLOCKED |
| Merge nicht enabled | MERGE | DONE (skip) |
| Kill-Switch aktiv | MERGE | DONE (WARN) |
| Keine Test-Evidence | MERGE | DONE (WARN) |
| Run-Status blocked/failed | MERGE | DONE (WARN) |
| Max Steps exceeded | (timeout) | FAILED_BLOCKED |

## Recovery nach BLOCKED

1. Grund im Event-Log prüfen
2. Gate setzen: `POSITRON_ENABLE_PUSH=true`
3. Neuen Run starten
4. Positron erkennt bestehenden Branch und setzt fort

## Sicherheitsgarantien

- Kein Push ohne explizites Gate
- Kein Merge ohne explizites Gate
- Kein Force-Push oder Force-Merge
- Nur `positron/issue-*` Branches
- Niemals main/master/develop als Ziel
