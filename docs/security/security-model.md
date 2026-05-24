---
title: Positron v3.0 Security Model
date: 2026-05-24
author: Positron Team
---

# Security model

## Environment-variable gates

The current implementation uses environment variables as explicit runtime gates:

- `POSITRON_ENABLE_PUSH` — required for pushes
- `POSITRON_ENABLE_MERGE` — required for merge execution
- `POSITRON_MERGE_DRY_RUN` — report merge readiness without performing the merge
- `POSITRON_MERGE_KILL_SWITCH` — merge kill switch; active unless explicitly set to `false`
- `POSITRON_ENABLE_FIX_LOOP` — enables retry/fix-loop behavior
- `POSITRON_ENABLE_DOGFOOD_FIXTURE_CHANGE` — unlocks fixture mutation helpers
- `POSITRON_SPECKIT_MODE` — fake/real SpecKit adapter mode
- `POSITRON_OPENCODE_MODE` — fake/real OpenCode adapter mode
- `GITHUB_MODE` — fake/real GitHub adapter mode
- `POSITRON_DB_PATH` — overrides the SQLite database location

## Fake vs real mode architecture

- **Fake mode** is the default for GitHub, SpecKit, and OpenCode.
- **Real mode** is only enabled when explicitly requested by environment configuration.
- The server resolves adapters at startup and can also accept injected adapters for tests.
- Fake adapters are used for deterministic tests and safe local development.

## Branch policy

- Allowed branch format: `positron/issue-<number>-<slug>`
- Protected branches: `main`, `master`, `develop`
- Branch names outside the Positron pattern are rejected by policy checks.

## Commit and push policy

- No force pushes: `--force`, `-f`, and `--force-with-lease` are blocked.
- Pushes are denied unless `POSITRON_ENABLE_PUSH=true`.
- The workflow must never target `main` or `master` directly.

## SQLite database location and permissions

- Default location: `~/.positron/positron.db`
- The database directory is created automatically if it does not exist.
- SQLite runs in WAL mode with foreign keys enabled and a busy timeout.
- The Positron process must have write access to the database directory and file.

## Secret redaction

The shared utility layer redacts known secret formats before logs and error messages are propagated:

- GitHub tokens: `ghp_*`, `github_pat_*`
- OpenAI keys: `sk-*`
- Anthropic keys: `anthropic_*`
- Gemini keys: `AIza*`

Redaction is applied via `DEFAULT_REDACTION_RULES` and is also used in GitHub adapter error mapping and sync paths.

## GitHub token requirements

- `GITHUB_TOKEN` is recommended for real GitHub API usage.
- Without a token, the client falls back to unauthenticated access and inherits strict GitHub rate limits.
- Real GitHub mode should be treated as authenticated-only in production deployments.

## Kill-switch mechanism

- `POSITRON_MERGE_KILL_SWITCH` blocks merge execution when active.
- The server’s merge-status endpoint reports the kill-switch and all blocking reasons.
- This gate is designed to stop unsafe merges without changing the rest of the run state.
