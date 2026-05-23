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
| CLAIMED | `positron:running` | ready, done, blocked, failed |
| REPO_SYNC | `positron:repo-sync` | testing, done, failed |
| TEST | `positron:testing` | repo-sync, failed |
| BLOCKED | `positron:blocked` | running, repo-sync, research, testing, done, failed |
| FAILED_TRANSIENT | `positron:failed` | running, repo-sync, research, testing, done, blocked |
| FAILED_UNSAFE | `positron:failed` | running, repo-sync, research, testing, done, blocked |
| FAILED_BLOCKED | `positron:blocked` | running, repo-sync, research, testing, done, failed |
| DONE | `positron:done` | running, repo-sync, research, testing, blocked, failed |

## Test report comments
- **PASS** → DONE lifecycle (`positron:done`), Test Report PASS Kommentar
- **FAIL** → FAILED_TRANSIENT lifecycle (`positron:failed`), Test Report FAIL mit Exit-Codes
- **BLOCKED** → BLOCKED lifecycle (`positron:blocked`), Blocked-Kommentar mit Gründen

## Failure phases
- **FAILED_TRANSIENT** = temporärer Fehler (z.B. Test-Timeout), Retry möglich → `positron:failed`
- **FAILED_UNSAFE** = unsicherer Zustand (z.B. CommandPolicy-Verstoß) → `positron:failed`
- **FAILED_BLOCKED** = dauerhafter Blocker (z.B. kein Package.json) → `positron:blocked`

## Blocked vs Failed
- **FAIL** = Tests wurden ausgeführt und sind fehlgeschlagen
- **BLOCKED** = Tests konnten nicht ausgeführt werden

## Evidence comments (Issue #13.1)
Evidence-Items und LLM-Metadaten können in Kommentare eingebettet werden:
- `renderEvidenceSection(evidence, runId)` — erzeugt Markdown-Tabelle mit Evidence-Status
- `renderLlmMetadataSection(metadata, runId)` — erzeugt sichere LLM-Metadaten-Tabelle
- Keine vollständigen Prompts, keine Secrets — nur Hashes und Metadaten

## Secret redaction
Alle Kommentare durchlaufen `redactSecrets()` vor dem Schreiben.

## Rate limit behavior
Fehler werden als `syncStatus: 'failed'` zurückgegeben, nie als Crash.

## Orchestrator integration
Der Server (`apps/server/src/index.ts`) nutzt `GitHubStatusSyncService` über einen `safeSync()`-Wrapper, der Sync-Fehler niemals den Run blockieren lässt.

### Sync-Punkte im Orchestrator
| Phase | Sync-Methode | Beschreibung |
|-------|-------------|-------------|
| CLAIMED | `syncRunAccepted()` | Accepted-Kommentar + `positron:running` Label |
| TEST | `syncTestReport()` / `syncBlocked()` | TestReport-Kommentar + Labels |
| DONE | `syncDone()` | Done-Kommentar + `positron:done` Label |
| FAILED_TRANSIENT | `syncFailed()` | Failed-Kommentar + `positron:failed` Label |
| FAILED_BLOCKED | `syncBlocked()` | Blocked-Kommentar + `positron:blocked` Label |
| FAILED_UNSAFE | `syncFailed()` | Failed-Kommentar + `positron:failed` Label |

### SafeSync-Verhalten
- Sync-Fehler werden als `RunEventData` (level: WARN/ERROR) gespeichert
- Der Run läuft normal weiter — kein Crash durch GitHub-Fehler
- Bei `syncStatus: 'failed'` wird die Reason im Event dokumentiert
- Exception beim Sync → Event mit truncated Error-Message (max 200 Zeichen)

Die Orchestrator-Integration ist auf Service-Level validiert (Level 1).
Orchestrator-Live-E2E (Level 3) ist für Issue #14+ geplant.

## Known limitations
- Kommentar-Update nicht unterstützt (nur Create + Skip)
- Max Kommentargröße ~25k Zeichen
- Pagination für Issues mit >100 Kommentaren nicht implementiert
- Retry-System für fehlgeschlagene GitHub-Sync-Calls nicht implementiert
