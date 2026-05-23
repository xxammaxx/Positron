# Issue #13 Initial Assessment

## Existing relevant modules
- `apps/server/src/index.ts` orchestrates the run pipeline, GitHub sync, and workspace preparation.
- `packages/shared/src/repository-config.ts` already exists, but it is not yet the single source of truth for the orchestrator.
- `packages/shared/src/live-e2e.ts` already provides live E2E config loading and skip helpers.
- `apps/server/src/__tests__/live-github-e2e.test.ts` already contains a gated live GitHub harness.
- `packages/github-adapter/src/sync-service.ts` already handles comment deduplication, label lifecycle sync, and safe redaction.
- `packages/sandbox/src/real-adapter.ts` and `packages/sandbox/src/test-runner.ts` already cover workspace prep and test execution.
- `docs/opencode-mcp-setup.md` already documents the current MCP situation; repo-local OpenCode config is intentionally absent.

## Current hardcoded owner/repo usage
- `apps/server/src/index.ts` still uses `owner: 'xxammaxx'` in multiple GitHub sync and workspace paths.
- `apps/server/src/index.ts` still builds remote URLs from `https://github.com/xxammaxx/<repo>.git`.
- The orchestrator still derives GitHub operations from hardcoded owner data instead of injected repository configuration.

## Existing repository configuration
- `packages/shared/src/repository-config.ts` already validates `POSITRON_REPO_OWNER` and `POSITRON_REPO_NAME`.
- The current helper returns `owner`, `repo`, and an auto-built `remoteUrl`.
- Validation already rejects obvious injection patterns such as slashes and `..`, but the orchestrator does not yet consume this config.
- There is not yet a central runtime config object that ties together `githubMode`, token presence, repository, and workspace settings.

## Existing Live-Test support
- `packages/shared/src/live-e2e.ts` already loads live test env flags and provides skip helpers.
- `apps/server/src/__tests__/live-github-e2e.test.ts` already has a safe-by-default live GitHub test harness.
- Live tests already validate read access, write access, workspace preparation, test detection, test execution, deduplication, Unicode, and secret redaction in the fake/conditional flow.
- The current harness still needs to be validated against a real GitHub test repository.

## Existing GitHub write gates
- `POSITRON_ENABLE_LIVE_GITHUB_TESTS` gates live GitHub access.
- `POSITRON_LIVE_TEST_ALLOW_WRITE` gates mutating live tests.
- `GITHUB_TOKEN` is required by the real GitHub adapter.
- `GitHubStatusSyncService` already redacts secrets and deduplicates comments by marker.
- Mutating GitHub requests are already executed sequentially inside the sync service, but the orchestrator still needs to use injected repository configuration.

## Existing Orchestrator path
- The server pipeline already performs claim, repo sync, workspace prep, test detection, test execution, and terminal status sync.
- `safeSync()` already prevents GitHub sync failures from crashing the run.
- `createServer()` currently has no repository-config argument, so integration tests still rely on the current hardcoded owner assumption.

## Required E2E path
- Load repository configuration from env or injected config.
- Remove hardcoded `xxammaxx` from orchestrator GitHub and workspace paths.
- Confirm read-only GitHub access against a real repository and issue.
- Confirm write access only with explicit live-write gates.
- Validate issue claiming, label sync, accepted comments, test report comments, final status comments, deduplication, Unicode preservation, ASCII markers, secret redaction, workspace preparation, and test runner execution.

## Missing pieces
- A single orchestrator/runtime config path that injects repository owner/repo instead of hardcoding it.
- Server-level tests that prove injected `RepositoryConfig` is used.
- Stronger validation for live E2E env values, including owner/repo shape checks.
- Live comment support for the additional live-test marker so the harness can tag real writes without changing the sync templates.
- A fresh issue-specific assessment document and research document matching the current issue scope.

## Proposed implementation plan
- Extend the shared repository config helper to cover runtime config and validation cleanly.
- Update the server to accept injected repository config and stop using hardcoded owner strings.
- Add live E2E marker support to the sync input path so live-test writes can be tagged without changing the core sync service behavior.
- Add unit tests for config loading, validation, skip behavior, and orchestrator injection.
- Keep live tests skipped by default and only enable writes behind explicit gates.
- Update docs and runbook files to reflect the final gated workflow.

## Test-first plan
- Add repository-config unit tests before changing the orchestrator.
- Add server injection tests before removing the hardcoded owner usage.
- Tighten live E2E config tests before changing the live harness.
- Add a sync-service test for optional live-test tagging before wiring it into live E2E.
- Run `npm test` and `npm run build` after the code changes.
- Run live read-only and live write tests only if the explicit environment gates are present.
