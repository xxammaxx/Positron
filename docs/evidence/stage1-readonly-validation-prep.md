# Stage 1 Read-Only Validation Prep

## Metadata

- **Date:** 2026-07-07
- **Branch:** chore/stage1-readonly-validation-prep
- **Issue:** [#308](https://github.com/xxammaxx/Positron/issues/308)
- **PR #357 (ReadOnly Adapter):** [feca04a](https://github.com/xxammaxx/Positron/pull/357)
- **This Run:** PREP ONLY — No real GitHub operations

## Results

| Status Field | Value |
|---|---|
| POSITRON_STAGE1_READONLY_PREP_STATUS | GREEN_STAGE1_PREP_PR_CREATED |
| POSITRON_STAGE1_READONLY_VALIDATION_STATUS | READY_FOR_STAGE1_READONLY_VALIDATION_AFTER_MERGE |

## Security Baseline

| PR | Description | Status |
|---|---|---|
| #353 | Security Remediation (RED_HOLD fixes) | MERGED |
| #354 | Full Real Mode Preflight Evidence | MERGED |
| #355 | Stage-1-Blocker-Audit | MERGED |
| #357 | ReadOnly GitHub Adapter Capability Layer | MERGED (HEAD) |

## ReadOnly Boundary

### Allowed Stage-1 Operations

| Operation | Allowed? | Boundary Guard | Audit | Redaction |
|---|---|---|---|---|
| getRepository(owner, repo) | ✅ YES | ReadOnlyGitHubAdapter interface + Wrapper | Required | Required |
| listOpenIssues(owner, repo, opts?) | ✅ YES | ReadOnlyGitHubAdapter interface + Wrapper | Required | Required |
| getIssue(ref) | ✅ YES | ReadOnlyGitHubAdapter interface + Wrapper | Required | Required |
| listIssueComments(ref) | ✅ YES | ReadOnlyGitHubAdapter interface + Wrapper | Required | Required |
| listPullRequests(opts) | ✅ YES | ReadOnlyGitHubAdapter interface + Wrapper | Required | Required |
| listPullRequestFiles(owner, repo, n) | ✅ YES | ReadOnlyGitHubAdapter interface + Wrapper | Required | Required |
| getPullRequest(owner, repo, n) | ✅ YES | ReadOnlyGitHubAdapter interface + Wrapper | Required | Required |

### Blocked Write Operations

| Operation | Blocked? | Guard Mechanism |
|---|---|---|
| createIssueComment | ❌ BLOCKED | Not in ReadOnlyGitHubAdapter type; GitHubCapabilityError at runtime |
| addIssueLabels | ❌ BLOCKED | Not in ReadOnlyGitHubAdapter type |
| removeIssueLabel | ❌ BLOCKED | Not in ReadOnlyGitHubAdapter type |
| claimIssue | ❌ BLOCKED | Not in ReadOnlyGitHubAdapter type |
| createPullRequest | ❌ BLOCKED | Not in ReadOnlyGitHubAdapter type |
| mergePullRequest | ❌ BLOCKED | Not in ReadOnlyGitHubAdapter type |
| requestReviewers | ❌ BLOCKED | Not in ReadOnlyGitHubAdapter type |
| closeIssue | ❌ BLOCKED | Not in ReadOnlyGitHubAdapter type |

### Boundary Integrity

The `ReadOnlyGitHubAdapterWrapper` uses a `#inner` private field (ES2022 private class field). This field is:
- **Inaccessible from outside the class** — no `getInner()`, no `getClient()`, no public accessor
- **Compile-time enforced** — TypeScript rejects access to `#inner` from outside
- **Runtime enforced** — JavaScript VM throws if accessed from outside

The `createReadOnlyGitHubAdapter()` factory returns `ReadOnlyGitHubAdapter` (the interface), not the wrapper class. Consumers only see the 7 read methods.

## Token Policy

| Requirement | Status |
|---|---|
| Least-privilege token defined | ✅ Documented in docs/security/github-readonly-token-policy.md |
| Token scopes: Issues, PRs, Contents, Metadata — all read-only | ✅ Defined |
| No token in .env | ✅ Enforced |
| No token in logs/errors/evidence | ✅ Redaction pipeline active |
| Token set only by Owner in local shell | ✅ Policy defined |
| Token revoked after probe | ✅ Policy defined |

## Audit / Redaction

| Requirement | Status |
|---|---|
| redactValue() for ghp_ tokens | ✅ In packages/shared/src/utils.ts |
| redactValue() for github_pat_ tokens | ✅ In packages/shared/src/utils.ts |
| SecretManager.maskValue() | ✅ In packages/shared/src/secret-manager.ts |
| SSE broadcaster redaction | ✅ In apps/server/src/sse/broadcaster.ts |
| Voice redaction | ✅ In apps/web/src/voice/redact-for-speech.ts |
| Tool gateway redaction tests | ✅ In packages/tool-gateway/src/__tests__/red/ |
| Benchmark evidence redaction | ✅ In packages/benchmark-rudolph/src/evidence-contract.ts |
| Audit sink for Stage-1 operations | ⚠️ Defined in code (apps/server/src/index.ts) but not yet wired for read-only adapter path |
| Stage-1 specific audit event schema | ⚠️ Needs explicit definition |

## Tests

| Gate | Status |
|---|---|
| Redaction: ghp_ pattern | ✅ Extensive test coverage in shared, server, web, tool-gateway, benchmark |
| Redaction: github_pat_ pattern | ✅ Covered in shared/utils.test.ts |
| Redaction: Authorization Bearer | ✅ Covered in benchmark red-negative-tests |
| ReadOnly adapter unit tests | ✅ In packages/github-adapter/src/__tests__/readonly-adapter.test.ts |
| Token not in audit events | ✅ Covered in various secret leakage tests |
| Write attempt blocked in Stage-1 | ✅ GitHubCapabilityError test coverage |

## Explicit Non-Actions (This Run)

| Action | Executed? |
|---|---|
| Full Real Mode executed | NO |
| Real GitHub token used | NO |
| Real GitHub read probe executed | NO |
| Real GitHub write operation | NO |
| Push enabled | NO |
| Merge kill switch disabled | NO |
| Issue closed | NO |
| Merge executed | NO |

## Later Stage 1 Read-Only Probe Run Plan

### Pre-Conditions

1. This PR merged to main
2. Owner creates fine-grained GitHub token with read-only scopes
3. Owner sets `export GITHUB_TOKEN=github_pat_...` in local shell
4. All kill-switches at safe defaults (POSITRON_ENABLE_PUSH unset, POSITRON_MERGE_KILL_SWITCH unset)

### Run Steps (Document Only — DO NOT EXECUTE)

1. `git checkout main && git pull --ff-only origin main`
2. Verify HEAD matches current merge
3. Create run branch: `git checkout -b stage1-readonly-probe`
4. Verify token presence: `[ -n "$GITHUB_TOKEN" ] && echo "Token set (length: ${#GITHUB_TOKEN})"` — NEVER print the token
5. Instantiate ReadOnlyGitHubAdapter using RealGitHubAdapter as inner
6. Run Stage-1 operations:
   - Read repository metadata: `getRepository('xxammaxx', 'Positron')`
   - Read Issue #308: `getIssue({ owner: 'xxammaxx', repo: 'Positron', issueNumber: 308 })`
   - List open PRs: `listPullRequests({ owner: 'xxammaxx', repo: 'Positron', state: 'open' })`
   - Read PR #357 metadata: `getPullRequest('xxammaxx', 'Positron', 357)`
7. Verify: All operations return data without token leakage
8. Attempt blocked write operation and verify GitHubCapabilityError
9. Write local evidence report (no GitHub write)
10. `unset GITHUB_TOKEN`
11. Revoke token through GitHub UI

### Forbidden During Probe

- Issue comment creation
- Label modification
- PR creation
- Branch creation
- Push
- Merge
- Issue close
- Token output in any form

### Expected Results

- All 7 read operations succeed with valid data
- No token appears in any output, log, error, or evidence
- Write operations are blocked with GitHubCapabilityError
- Audit events contain only safe metadata (operation, repo, issue/PR number, result)
