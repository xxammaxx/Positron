# GitHub Adapter Validation

**Datum:** 2026-05-20

## Sources
- GitHub REST API Docs: https://docs.github.com/en/rest/issues/issues
- Octokit REST.js v22: https://octokit.github.io/rest.js/v22/
- GitHub Auth: https://docs.github.com/en/rest/authentication
- GitHub Rate Limits: https://docs.github.com/en/rest/using-the-rest-api/rate-limits

## Required API capabilities

| Operation | Endpoint | Octokit |
|-----------|----------|---------|
| Issues list | `GET /repos/{o}/{r}/issues` | `octokit.rest.issues.listForRepo()` |
| Single Issue | `GET /repos/{o}/{r}/issues/{n}` | `octokit.rest.issues.get()` |
| Create Comment | `POST /repos/{o}/{r}/issues/{n}/comments` | `octokit.rest.issues.createComment()` |
| List Comments | `GET /repos/{o}/{r}/issues/{n}/comments` | `octokit.rest.issues.listComments()` |
| Add Labels | `POST /repos/{o}/{r}/issues/{n}/labels` | `octokit.rest.issues.addLabels()` |
| Remove Label | `DELETE /repos/{o}/{r}/issues/{n}/labels/{name}` | `octokit.rest.issues.removeLabel()` |

## Auth requirements

- **Fine-grained PAT**: `Repository permissions: Issues (Read & Write), Metadata (Read)`
- **Classic PAT**: `repo` scope
- **GITHUB_TOKEN (Actions)**: `issues: write, metadata: read`

Verhalten bei fehlenden Rechten:
- 401 Unauthorized → kein oder ungültiger Token
- 403 Forbidden → Token hat nicht die benötigten Scopes
- 403 + `x-ratelimit-remaining: 0` → Primary Rate Limit

## Error handling implications

| HTTP Status | Header-Indikator | Interne Klasse |
|------------|-----------------|----------------|
| 401 | — | GitHubAuthError |
| 403 | `x-ratelimit-remaining: 0` | GitHubRateLimitError |
| 403 | keine Rate-Limit-Header | GitHubPermissionError |
| 404 | — | GitHubNotFoundError |
| 410 | — | GitHubIssuesDisabledError |
| 422 | — | GitHubValidationError |
| 403 | `retry-after` + secondary message | GitHubSecondaryRateLimitError |
| Netzwerk | — | GitHubNetworkError |
| Sonstige 4xx/5xx | — | GitHubUnknownError |

## Decision

**Use Octokit** (`@octokit/rest` v22).

Begründung:
- Bereits im Projekt (from Issue #4)
- TypeScript-Typen first-class
- Retry + Throttling Plugins integriert
- Paginierung (`octokit.paginate()`) eingebaut
- Leicht mockbar (fake Octokit-Instanz)
- Standardbibliothek im GitHub-Ökosystem
- 66 bestehende Tests belegen Funktionalität
