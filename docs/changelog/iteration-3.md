---
title: Iteration 3: CLI, watcher, and compatibility updates
date: 2026-05-24
author: Positron Team
---

# Iteration 3: CLI, watcher, and compatibility updates

## Summary

This iteration added a server-side GitHub watcher module, a CLI entrypoint for starting runs, and several compatibility fixes across backend and frontend surfaces.

## Delivered

- GitHub watcher module added in `apps/server/src/github-watcher.ts`
  - Polls open issues with `GitHubAdapter.listOpenIssues()`
  - Controlled by `POSITRON_ENABLE_WATCHER`, `POSITRON_WATCHER_INTERVAL_MS`, and `POSITRON_WATCHER_LABELS`
  - Idempotent: skips issues that already have runs
- CLI entrypoint added in `apps/server/src/cli.ts`
  - Registered as `positron` in `apps/server/package.json`
  - Usage: `positron run --issueNumber 42 --autonomyLevel 2`
  - Calls the REST API and requires a running server
- Vitest JSX parsing issue resolved by removing stale compiled `.js` artifacts and tightening Vite config
- Gate endpoint now accepts both `action` and `decision` payload fields for backward compatibility
- `POSITRON_GITHUB_MODE` now takes precedence over legacy `GITHUB_MODE`
- Frontend metrics client now normalizes the backend response into the expected UI shape
- Vitest versions aligned to `^4.0.0` across packages

## Compatibility notes

- Gate submissions can use either `decision` or `action`.
- GitHub mode should be configured via `POSITRON_GITHUB_MODE`; `GITHUB_MODE` remains as a fallback.
- The CLI depends on the server being available at the configured `serverUrl`.

## Files documented

- `README.md`
- `docs/workflows/development.md`
- `docs/workflows/cli.md`
- `docs/changelog/iteration-3.md`
