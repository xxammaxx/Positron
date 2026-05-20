# Issue #9 Initial Assessment

**Datum:** 2026-05-20
**Branch:** `positron/issue-8-server-core`

## Existing relevant modules

| Modul | Pfad | Was es kann |
|-------|------|-----------|
| GitHub Client | `packages/github-adapter/src/client.ts` | createGitHubClient() mit Octokit, Retry, Throttling, Safe-Logger |
| Issues | `packages/github-adapter/src/issues.ts` | pollIssues() mit Paginierung, 304-Handling, isPullRequest() |
| Labels | `packages/github-adapter/src/labels.ts` | syncManagedLabels() mit idempotentem Diffing |
| Comments | `packages/github-adapter/src/comments.ts` | writeComment(), commentMarker() |
| Shared | `packages/shared/` | POSITRON_LABELS, Typen, redactSecrets, redactValue, generateBranchName |
| Server | `apps/server/src/index.ts` | Orchestrator mit executePhase(), REST API (Fake-GitHub) |

## Missing pieces

| Anforderung | Status |
|-------------|--------|
| GitHubAdapter Interface (Abstraktion) | ❌ Nicht vorhanden |
| claimIssue() mit Idempotenz | ❌ Nicht vorhanden |
| GitHubIssueSummary, GitHubCommentResult Typen | ❌ Nicht vorhanden |
| Fehlerklassen (AuthError, PermissionError, etc.) | ❌ Nicht vorhanden |
| Kommentar-Templates (Accepted, Update, Blocked, Done) | ❌ Nicht vorhanden |
| Fake/Mock-Adapter für Tests | ❌ Nicht vorhanden |
| Orchestrator-Integration (real vs fake Mode) | ❌ Server nutzt Hardcoded-Fake |
| Live-Test-Mode (POSITRON_ENABLE_LIVE_GITHUB_TESTS) | ❌ Nicht vorhanden |
| Label-Lifecycle (ready → running → ... → done) | ⚠️ syncManagedLabels existiert, aber kein Lifecycle |

## Reuse plan

| Komponente | Woher | Anpassung |
|-----------|-------|----------|
| createGitHubClient() | `client.ts` | ✅ Direkt wiederverwendbar |
| pollIssues() | `issues.ts` | ✅ Perfekt — Paginierung, 304, PR-Filter |
| syncManagedLabels() | `labels.ts` | ✅ Idempotentes Diffing bereits vorhanden |
| writeComment() | `comments.ts` | ✅ Vorhanden |
| POSITRON_LABELS | `shared/constants.ts` | ✅ 9 Labels definiert |
| redactSecrets/redactValue | `shared/utils.ts` | ✅ 7 Pattern + Error-Handling |
| generateBranchName | `shared/utils.ts` | ✅ Umlaute-Handling |

## Test-first plan

1. Kommentar-Templates testen (pure functions)
2. Error-Mapping testen (GitHub Response → Error-Klasse)
3. Claim-Logik testen (idempotent, ready/running/already_claimed)
4. GitHubAdapter Interface mit Fake-Implementation
5. Integration mit Fake-Octokit/Mock
6. Optional: Live-Test (nur mit Env-Vars)
