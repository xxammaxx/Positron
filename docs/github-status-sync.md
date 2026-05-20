# GitHub Status Synchronization

## Purpose
Synchronisiert Positron-Run-Zustände, Labels und Evidence-Kommentare zurück ins GitHub-Issue.

## Comment markers
Jeder Kommentar enthält einen maschinenlesbaren HTML-Marker:
```
<!-- positron:run=<runId>;phase=<phase>;kind=<kind> -->
```

## Deduplication strategy
Vor jedem Schreiben werden existierende Kommentare nach dem Marker durchsucht. Gleicher Marker → kein doppelter Kommentar.

## Label lifecycle

| Phase | Setzt | Entfernt |
|-------|-------|---------|
| CLAIMED | `positron:running` | ready, done, blocked |
| REPO_SYNC | `positron:research` | testing, done |
| TEST | `positron:testing` | research |
| BLOCKED | `positron:blocked` | running, research, testing, done |
| FAILED | `positron:blocked` | running, research, testing, done |
| DONE | `positron:done` | running, research, testing, blocked |

## Test report comments
- **PASS** → done labels, Test Report PASS Kommentar
- **FAIL** → blocked labels, Test Report FAIL mit Exit-Codes
- **BLOCKED** → blocked labels, Blocked-Kommentar mit Gründen

## Blocked vs Failed
- **FAIL** = Tests wurden ausgeführt und sind fehlgeschlagen
- **BLOCKED** = Tests konnten nicht ausgeführt werden

## Secret redaction
Alle Kommentare durchlaufen `redactSecrets()` vor dem Schreiben.

## Rate limit behavior
Fehler werden als `syncStatus: 'failed'` zurückgegeben, nie als Crash.

## Orchestrator integration
Server nutzt `GitHubStatusSyncService` in den Phasen CLAIMED, TEST, BLOCKED, DONE.

## Known limitations
- Kein `positron:failed` Label (blocked wird verwendet)
- Kommentar-Update nicht unterstützt (nur Create + Skip)
- Max Kommentargröße ~25k Zeichen
