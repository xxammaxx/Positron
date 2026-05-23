# Repository Configuration

## Purpose
Positron uses a single repository configuration as the source of truth for orchestrator, workspace prep, and live GitHub validation.

## Required Variables
```bash
POSITRON_REPO_OWNER=<github-owner>
POSITRON_REPO_NAME=<github-repo>
```

## Optional Variables
```bash
POSITRON_REPO_DEFAULT_BRANCH=main
POSITRON_REPO_REMOTE_URL=https://github.com/<owner>/<repo>.git
POSITRON_WORKSPACE_ROOT=/tmp/positron-workspaces
GITHUB_MODE=fake
GITHUB_TOKEN=...
```

## Example
```ts
const repository = {
  owner: 'test-owner',
  repo: 'test-repo',
  defaultBranch: 'main',
  remoteUrl: 'https://github.com/test-owner/test-repo.git',
};
```

## Validation Rules
- `owner` and `repo` must be separate identifiers.
- Allowed characters: letters, numbers, `.`, `_`, `-`.
- No slashes.
- No `..` path traversal.
- No URL values in `owner` or `repo`.
- Empty values are rejected.
- `remoteUrl` is derived from `owner` and `repo` when omitted.

## Why Owner/Repo Must Not Be Hardcoded
- Hardcoded repository ownership makes the orchestrator inflexible.
- A hardcoded owner can silently point the orchestrator at the wrong repository.
- Live GitHub validation must be able to target a dedicated test repository without code changes.
- Injection through config keeps tests isolated and makes the live harness explicit.

## Test Configuration
- Unit tests may inject a fake repository config directly.
- Integration tests should inject a repository config instead of relying on a literal owner string.
- Live E2E tests should use `POSITRON_TEST_OWNER`, `POSITRON_TEST_REPO`, and `POSITRON_TEST_ISSUE_NUMBER`.

## Failure Modes
- Missing `POSITRON_REPO_OWNER` or `POSITRON_REPO_NAME` should produce a clear configuration failure.
- Invalid owner/repo values should be rejected before any GitHub API call is made.
- If `remoteUrl` is not provided, Positron should build the GitHub HTTPS URL from the validated owner/repo pair.
- If a live test gate is missing, the live harness should skip instead of failing.
