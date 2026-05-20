# GitHub Adapter

## Purpose
Abstrahiert die GitHub REST API für Positron. Bietet eine klare Schnittstelle für Issue-Management, Label-Operationen und Kommentare.

## Supported operations

| Operation | Interface | Status |
|-----------|----------|--------|
| Repository abrufen | `getRepository()` | ✅ |
| Offene Issues listen | `listOpenIssues()` | ✅ (Paginierung, 304) |
| Einzelnes Issue lesen | `getIssue()` | ✅ |
| Issue-Kommentare lesen | `listIssueComments()` | ✅ |
| Kommentar schreiben | `createIssueComment()` | ✅ |
| Labels hinzufügen | `addIssueLabels()` | ✅ (idempotent) |
| Label entfernen | `removeIssueLabel()` | ✅ (404-tolerant) |
| Issue claimen | `claimIssue()` | ✅ (idempotent) |

## Required environment variables

| Variable | Beschreibung |
|----------|-------------|
| `GITHUB_TOKEN` | Personal Access Token (PAT) mit `issues: write`, `metadata: read` |
| `GITHUB_MODE` | `"fake"` (Standard, Tests) oder `"real"` (echte API) |
| `POSITRON_ENABLE_LIVE_GITHUB_TESTS` | Aktiviert Live-Tests (nur mit token) |

## Label lifecycle

```
positron:ready → positron:running → positron:testing → positron:done
                                      ↓
                                  positron:blocked
```

## Claiming behavior

1. Issue lesen
2. Prüfen ob `readyLabel` (z.B. `positron:ready`) vorhanden
3. Wenn `runningLabel` bereits gesetzt → `already_claimed`
4. Labels synchronisieren (running setzen, ready optional entfernen)
5. Accepted-Kommentar schreiben

## Error handling

| HTTP | Header | Error-Klasse |
|------|--------|-------------|
| 401 | — | `GitHubAuthError` |
| 403 | `x-ratelimit-remaining: 0` | `GitHubRateLimitError` |
| 403 | kein Rate-Limit | `GitHubPermissionError` |
| 403 | `retry-after` + secondary | `GitHubSecondaryRateLimitError` |
| 404 | — | `GitHubNotFoundError` |
| 410 | — | `GitHubIssuesDisabledError` |
| 422 | — | `GitHubValidationError` |
| Netzwerk | — | `GitHubNetworkError` |
| Sonstige | — | `GitHubUnknownError` |

## Live test mode

```bash
POSITRON_ENABLE_LIVE_GITHUB_TESTS=true
GITHUB_TOKEN=ghp_...
POSITRON_TEST_OWNER=xxammaxx
POSITRON_TEST_REPO=Positron
POSITRON_TEST_ISSUE_NUMBER=1
```

Live-Tests lesen Issues und Kommentare (keine Schreiboperationen ohne `POSITRON_LIVE_TEST_ALLOW_WRITE=true`).

## Security notes

- GitHub Token wird nie geloggt (Safe Logger + redactSecrets)
- Authorization Header in Fehlerobjekten wird redacted
- Kommentarbody validiert (nicht leer, max Länge)
- Keine echten Schreibzugriffe in Standard-Tests
- Fake-Adapter für alle Tests verfügbar
