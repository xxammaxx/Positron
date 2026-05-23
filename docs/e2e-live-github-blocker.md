# Live GitHub E2E Blocker

## Status
**BLOCKED**

Stand: 2026-05-21

## Missing requirements

| Variable | Status | Required For |
|----------|--------|-------------|
| `POSITRON_ENABLE_LIVE_GITHUB_TESTS=true` | NOT SET | All live tests |
| `GITHUB_TOKEN` | NOT SET (gh CLI available) | GitHub API access |
| `POSITRON_TEST_OWNER` | NOT SET | Target repository owner |
| `POSITRON_TEST_REPO` | NOT SET | Target repository name |
| `POSITRON_TEST_ISSUE_NUMBER` | NOT SET | Test issue with `positron:ready` label |
| `POSITRON_LIVE_TEST_ALLOW_WRITE` | NOT SET | Write operations (labels, comments) |

## Required test repository setup

1. Create a dedicated test repository (e.g., `xxammaxx/positron-e2e-test`)
2. Enable Issues in the repository settings
3. Create a test issue with label `positron:ready`
4. Note the issue number

## Recommended test repository

```text
Repository:  xxammaxx/positron-e2e-test
Issue:        Create a test issue, apply label "positron:ready"
Setup:        git init, minimal package.json for test command detection
```

## Exact commands to run

### Read-only test (Level 1)
```bash
POSITRON_ENABLE_LIVE_GITHUB_TESTS=true \
GITHUB_TOKEN=<gh-auth-token> \
POSITRON_TEST_OWNER=xxammaxx \
POSITRON_TEST_REPO=positron-e2e-test \
npx vitest run apps/server/src/__tests__/live-github-e2e.test.ts
```

### Full write test (Level 1+Write)
```bash
POSITRON_ENABLE_LIVE_GITHUB_TESTS=true \
POSITRON_LIVE_TEST_ALLOW_WRITE=true \
POSITRON_LIVE_TEST_ALLOW_CLEANUP=true \
GITHUB_TOKEN=<gh-auth-token> \
POSITRON_TEST_OWNER=xxammaxx \
POSITRON_TEST_REPO=positron-e2e-test \
POSITRON_TEST_ISSUE_NUMBER=1 \
npx vitest run apps/server/src/__tests__/live-github-e2e.test.ts
```

## Expected validation results

When executed, the live E2E test should validate:

- [ ] Issue gelesen (getIssue)
- [ ] Issue geclaimt (claimIssue)
- [ ] `positron:running` gesetzt, `positron:ready` entfernt
- [ ] Accepted-Kommentar geschrieben
- [ ] Workspace vorbereitet
- [ ] TestCommandDetection ausgeführt
- [ ] TestRunner ausgeführt
- [ ] TestReport erzeugt
- [ ] TestReport-Kommentar geschrieben
- [ ] Done/Failed/Blocked-Kommentar geschrieben
- [ ] Endlabel korrekt gesetzt
- [ ] Deduplizierung bei zweitem Sync funktioniert
- [ ] Umlaute bleiben im Kommentar erhalten
- [ ] Marker bleiben ASCII-only
- [ ] Fake-Secrets werden redacted

## Workaround / Partial validation

Live E2E kann nicht ausgeführt werden, aber:

- ✅ **Service-Level Fake E2E**: 233 Tests passing (inkl. GitHubStatusSyncService, Label-Lifecycle)
- ✅ **Orchestrator-Level Fake E2E**: Integration-Test durchläuft alle 19 Phasen bis DONE
- ✅ **Live-E2E-Test-Harness**: 15 Test-Cases existieren, skippen sauber ohne Env-Flags

Die Komponenten wurden also **isoliert mit Fake-Adaptern** validiert, aber **nicht gegen ein echtes GitHub-Repository**.

## Next action

1. Test-Repository `xxammaxx/positron-e2e-test` erstellen
2. Issue mit `positron:ready` anlegen
3. Live-Test ausführen
4. Ergebnis dokumentieren

## Blocker-Klassifikation

- **Typ**: Infrastruktur-Blocker (fehlendes Test-Repository)
- **Schwere**: Mittel — betrifft nur Live-Validation, nicht die Code-Qualität
- **Empfehlung**: Vor Issue #14 (Spec Kit Real Adapter) auflösen
