# Positron Environment Variable Reference

> Stand: 2026-05-24
> Version: v0.1.0-rc.1

## Pflicht-Variablen

| Variable | Typ | Beschreibung | Default |
|----------|-----|-------------|---------|
| `GITHUB_TOKEN` | string | GitHub Personal Access Token mit `repo` Scope | — |
| `POSITRON_REPO_OWNER` | string | GitHub Owner (User oder Organisation) | — |
| `POSITRON_REPO_NAME` | string | GitHub Repository Name | — |

## GitHub Adapter

| Variable | Typ | Beschreibung | Default |
|----------|-----|-------------|---------|
| `GITHUB_MODE` | `fake` \| `real` | GitHub Adapter Modus | `fake` |
| `GITHUB_BASE_URL` | string | GitHub API Base URL (für Enterprise) | `https://api.github.com` |

## Safety Gates

| Variable | Typ | Beschreibung | Default |
|----------|-----|-------------|---------|
| `POSITRON_ENABLE_PUSH` | `true` \| `false` | Erlaubt Git Push | `false` |
| `POSITRON_ENABLE_MERGE` | `true` \| `false` | Erlaubt Auto-Merge | `false` |
| `POSITRON_MERGE_DRY_RUN` | `true` \| `false` | Merge nur simulieren (kein echter API-Call) | `false` |
| `POSITRON_MERGE_KILL_SWITCH` | `true` \| `false` | Blockiert ALLE Merges sofort | `false` |
| `POSITRON_ENABLE_FIX_LOOP` | `true` \| `false` | Automatischer Retry bei transienten Fehlern | `false` |
| `POSITRON_MAX_FIX_LOOPS` | number | Maximale Fix-Loop-Versuche (1-10) | `3` |

## CLI-Adapter

| Variable | Typ | Beschreibung | Default |
|----------|-----|-------------|---------|
| `POSITRON_SPECKIT_MODE` | `fake` \| `real` | Spec Kit CLI Modus | `fake` |
| `POSITRON_OPENCODE_MODE` | `fake` \| `real` | OpenCode CLI Modus | `fake` |

## Reviewer-Automation

| Variable | Typ | Beschreibung | Default |
|----------|-----|-------------|---------|
| `POSITRON_PR_REVIEWERS` | string | Komma-separierte GitHub Usernames für PR-Review | — |
| `POSITRON_PR_TEAM_REVIEWERS` | string | Komma-separierte Team-Slugs für PR-Review | — |

## Repository-Konfiguration

| Variable | Typ | Beschreibung | Default |
|----------|-----|-------------|---------|
| `POSITRON_REPO_DEFAULT_BRANCH` | string | Default-Branch des Repos | `main` |
| `POSITRON_REPO_REMOTE_URL` | string | Überschreibt die Remote-URL (optional) | Auto-konstruiert |
| `POSITRON_WORKSPACE_ROOT` | string | Basis-Pfad für Run-Workspaces | `/tmp/positron-workspaces` |

## Live-E2E-Tests

| Variable | Typ | Beschreibung | Default |
|----------|-----|-------------|---------|
| `POSITRON_ENABLE_LIVE_GITHUB_TESTS` | `true` \| `false` | Live E2E Tests gegen echtes GitHub | `false` |
| `POSITRON_LIVE_TEST_ALLOW_WRITE` | `true` \| `false` | Erlaubt schreibende Live-Tests | `false` |
| `POSITRON_LIVE_TEST_OWNER` | string | GitHub Owner für Live-Tests | Wert von `POSITRON_REPO_OWNER` |
| `POSITRON_LIVE_TEST_REPO` | string | GitHub Repo für Live-Tests | Wert von `POSITRON_REPO_NAME` |

## Observability

| Variable | Typ | Beschreibung | Default |
|----------|-----|-------------|---------|
| `POSITRON_LOG_LEVEL` | `debug` \| `info` \| `warn` \| `error` | Log-Level | `info` |
| `POSITRON_LOG_FILE` | string | Pfad zur Log-Datei (optional) | stdout |
| `POSITRON_ENABLE_METRICS` | `true` \| `false` | Metrik-Export aktivieren (Prometheus) | `false` |

## Sicherheitsstufen (Profile)

### Observe-Mode (minimal)
```bash
GITHUB_MODE=real
POSITRON_ENABLE_PUSH=false
POSITRON_ENABLE_MERGE=false
POSITRON_SPECKIT_MODE=fake
POSITRON_OPENCODE_MODE=fake
POSITRON_ENABLE_FIX_LOOP=false
```

### Supervised-Mode (empfohlen für Dogfood)
```bash
GITHUB_MODE=real
POSITRON_ENABLE_PUSH=false
POSITRON_ENABLE_MERGE=false
POSITRON_MERGE_DRY_RUN=true
POSITRON_MERGE_KILL_SWITCH=false
POSITRON_ENABLE_FIX_LOOP=false
POSITRON_SPECKIT_MODE=fake
POSITRON_OPENCODE_MODE=fake
POSITRON_PR_REVIEWERS=username1,username2
```

### Autonomous-Safe-Mode (voll automatisiert)
```bash
GITHUB_MODE=real
POSITRON_ENABLE_PUSH=true
POSITRON_ENABLE_MERGE=true
POSITRON_MERGE_DRY_RUN=false
POSITRON_MERGE_KILL_SWITCH=false
POSITRON_ENABLE_FIX_LOOP=true
POSITRON_MAX_FIX_LOOPS=3
POSITRON_SPECKIT_MODE=fake
POSITRON_OPENCODE_MODE=fake
POSITRON_PR_REVIEWERS=username1,username2
```
