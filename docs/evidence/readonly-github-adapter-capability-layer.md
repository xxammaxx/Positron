# Evidence: ReadOnly GitHub Adapter Capability Layer

## Purpose

This document provides evidence for the ReadOnly GitHub Adapter Capability Layer implementation, establishing a hard technical boundary between read and write GitHub operations for Stage 1 read-only probe readiness.

## Capability Model

### Interface Hierarchy

```
ReadOnlyGitHubAdapter (7 read methods)
    ↑ extends
GitHubAdapter (7 read + 8 write methods)
```

### ReadOnlyGitHubAdapter — Allowed Read Operations

| Method | Description |
|--------|-------------|
| `getRepository(owner, repo)` | Repo metadata (id, name, default branch) |
| `listOpenIssues(owner, repo, options?)` | List open issues with label/since/limit filtering |
| `getIssue(ref)` | Single issue details (title, body, labels, state) |
| `listIssueComments(ref)` | Comments on an issue |
| `listPullRequests(options)` | List PRs with state/head filtering |
| `listPullRequestFiles(owner, repo, prNumber)` | Changed files in a PR |
| `getPullRequest(owner, repo, prNumber)` | PR details including mergeable state |

### Blocked Write Operations

| Method | Block Mechanism |
|--------|----------------|
| `createIssueComment` | Not present on ReadOnlyGitHubAdapter type |
| `addIssueLabels` | Not present on ReadOnlyGitHubAdapter type |
| `removeIssueLabel` | Not present on ReadOnlyGitHubAdapter type |
| `claimIssue` | Not present on ReadOnlyGitHubAdapter type |
| `createPullRequest` | Not present on ReadOnlyGitHubAdapter type |
| `mergePullRequest` | Not present on ReadOnlyGitHubAdapter type |
| `requestReviewers` | Not present on ReadOnlyGitHubAdapter type |
| `closeIssue` | Not present on ReadOnlyGitHubAdapter type |
| `getClient()` | Not present on ReadOnlyGitHubAdapterWrapper |

## Implementation Details

### Runtime Enforcement

- `ReadOnlyGitHubAdapterWrapper` uses ECMAScript `#inner` private field — the wrapped adapter is inaccessible from outside
- No inheritance from `RealGitHubAdapter` — pure composition
- No `getClient()` or Octokit exposure on the wrapper
- Write methods are absent from both TypeScript type and runtime object shape

### Error Type

`GitHubCapabilityError extends GitHubPermissionError`:
- `operation`: name of blocked write operation
- `requiredCapability`: `'github:write'`
- Message: "GitHub operation 'X' requires write capability — blocked by read-only adapter"

### Secret Hygiene

- All generic error paths in `real-adapter.ts` now apply `redactSecrets(String(err))`
- `labels.ts:26` now applies `redactSecrets` to logged errors
- No real tokens in test fixtures, environment, or code

## Tests

### File: `packages/github-adapter/src/__tests__/readonly-adapter.test.ts`

#### Contract Tests (11 tests)
- `getRepository` returns repo metadata
- `getRepository` throws for missing repo
- `listOpenIssues` returns open issues
- `listOpenIssues` filters by labels
- `listOpenIssues` respects limit
- `getIssue` returns issue details
- `getIssue` throws for missing issue
- `listIssueComments` returns empty array for no comments
- `listPullRequests` returns PRs
- `listPullRequestFiles` returns fake files
- `getPullRequest` returns PR details

#### Negative Tests (10 tests)
- `createIssueComment` not available on read-only interface
- `addIssueLabels` not available
- `removeIssueLabel` not available
- `claimIssue` not available
- `createPullRequest` not available
- `mergePullRequest` not available
- `requestReviewers` not available
- `closeIssue` not available
- `getClient` not available
- Inner adapter not accessible via property access

#### Edge Case Tests (3 tests)
- Read data returns correctly through wrapper
- Wrapper is structurally assignable to ReadOnlyGitHubAdapter
- Multiple independent wrappers work correctly

#### Error Tests (2 tests)
- `GitHubCapabilityError` created with correct properties
- `GitHubCapabilityError` inherits correctly through error hierarchy

## Gates

- `npm run typecheck` — ✅ passes
- `npm run build` — ✅ passes
- `npm test` — ✅ passes
- `git diff --check` — ✅ clean

## Security Scans

- ✅ No real `ghp_` / `github_pat_` token in changed files
- ✅ No `POSITRON_GITHUB_MODE=real` in changed files
- ✅ No `POSITRON_ENABLE_PUSH=true` in changed files
- ✅ No `POSITRON_MERGE_KILL_SWITCH=false` in changed files
- ✅ No `.env`, `.pem`, `.key`, `.crt`, `.jks`, `.p12` in changed files

## Explicit Non-Actions

- ❌ No Full Real Mode enabled
- ❌ No real GitHub token used
- ❌ No real GitHub read probe executed
- ❌ No GitHub write operation performed
- ❌ No push to main
- ❌ No merge
- ❌ No kill-switch disable
- ❌ No issue close
- ❌ No secrets exposed

## Go/No-Go for Stage 1

- **GO** for fake/local mode with ReadOnlyGitHubAdapter boundary
- **NO-GO** for real-token production use until audit logging and field redaction gaps are addressed per compliance audit

## References

- ADR: `docs/adr/readonly-github-adapter-capability-layer.md`
- Security: `docs/evidence/security-readonly-adapter-analysis.md`
- Compliance: `docs/evidence/compliance-readonly-adapter-audit.md`
- Issue: #356
