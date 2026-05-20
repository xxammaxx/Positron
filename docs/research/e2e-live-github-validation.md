# E2E Live GitHub Validation — Research

## Sources

- GitHub REST API documentation (May 2026): https://docs.github.com/en/rest
- GitHub Issues API: https://docs.github.com/en/rest/issues/issues
- GitHub Comments API: https://docs.github.com/en/rest/issues/comments
- GitHub Labels API: https://docs.github.com/en/rest/issues/labels
- GitHub Rate Limiting: https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api
- GitHub Fine-grained PAT: https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens
- GitHub Actions CI: https://docs.github.com/en/actions/security-for-github-actions/security-guides/automatic-token-authentication
- Octokit REST.js v22: https://github.com/octokit/octokit.js
- Octokit plugin-retry: https://github.com/octokit/plugin-retry.js
- Octokit plugin-throttling: https://github.com/octokit/plugin-throttling.js

## Required GitHub Permissions

### Fine-Grained PAT (Recommended)
For Issue #13 live tests, the following permissions are needed:

| Permission | Access | Purpose |
|-----------|--------|---------|
| Issues | Read & Write | Read issue details, create comments, manage labels |
| Metadata | Read | Read repository metadata (name, default branch) |
| Contents | Read | Clone the test repository |

### Classic PAT
Alternative: `repo` scope covers everything needed.

### GITHUB_TOKEN (Actions)
- Not suitable for live E2E write tests in CI — these tests MUST run locally
- GITHUB_TOKEN in CI cannot access other repositories
- GITHUB_TOKEN in CI has limited write access

## Live Test Gating

### Why Live Write Tests Must NOT Run in CI
1. **Rate limit consumption**: CI jobs would consume shared rate limits (5,000/hr for PAT)
2. **Idempotency issues**: Multiple CI runs could interfere with each other
3. **Security risk**: CI tokens have broader permissions than needed
4. **Test pollution**: CI would leave test comments/labels on the test repository
5. **Cost/Quota**: GitHub Actions minutes and rate limits are finite

### Safe Manual Activation Pattern
```
Local developer workstation:
  export POSITRON_ENABLE_LIVE_GITHUB_TESTS=true
  export POSITRON_LIVE_TEST_ALLOW_WRITE=true
  export GITHUB_TOKEN=github_pat_...
  export POSITRON_TEST_OWNER=xxammaxx
  export POSITRON_TEST_REPO=positron-live-e2e-fixture
  export POSITRON_TEST_ISSUE_NUMBER=1
  npm test -- --runInBand
```

### Skip Behavior When Gates Missing
- Tests must `describe.skip` or `it.skip` (never fail)
- Clear console message explaining which gate is missing
- Normal test suite must remain green (zero failures from live tests)

## Rate Limit Implications

### Primary Rate Limit
- Authenticated (PAT): 5,000 requests per hour per user
- GITHUB_TOKEN: 1,000 requests per hour per repository
- Headers: `x-ratelimit-limit`, `x-ratelimit-remaining`, `x-ratelimit-reset`

### Secondary Rate Limit
- Triggered by rapid consecutive requests
- Returns 403 with `retry-after` header
- Octokit throttling plugin handles this

### Live Test Budget
A single E2E write test consumes approximately:
- `getIssue` (1 request)
- `listComments` (1 request)
- `createComment` — accepted (1 request)
- `addLabels` (1 request)
- `syncLabels` — may include removeLabel calls (1-3 requests)
- `createComment` — test report (1 request)
- `listComments` — dedup check (1 request)
- `createComment` — done/failed (1 request)
- `syncLabels` — final state (1-3 requests)

**Total: ~8-12 API requests per E2E run.** Safe within rate limits for manual testing.

## Security Implications

### Token Redaction
- `redactSecrets()` from `@positron/shared` handles 7 patterns:
  - `ghp_`, `ghs_`, `gho_`, `ghu_`, `ghr_` tokens
  - `github_pat_` fine-grained tokens
  - `Bearer` tokens
  - `sk-` OpenAI keys
  - `anthropic_` keys
  - `gemini_` keys
  - Generic `api_key=value`

### No Secrets in Comments
- All comment bodies pass through `redactSecrets()` before posting
- Test data must use fake secrets (never real tokens)
- Error messages are also redacted

### Unique Test Markers
- Every live test run generates a unique ID: `live-e2e-<timestamp>-<short-random>`
- All comments include: `<!-- positron:live-e2e=true -->`
- Comments are clearly identifiable as test artifacts
- Machine-readable markers enable automated cleanup if needed

### Repository Isolation
- Tests MUST use a dedicated test repository (configured via `POSITRON_TEST_OWNER/REPO`)
- Never use Positron's own repository for live tests
- Never use any production or user repository

## Octokit Configuration (Already Implemented)

### Retry Plugin
```typescript
const MyOctokit = Octokit.plugin(retry, throttling);
// request: { retries: 2 }
```
- Automatically retries on 5xx errors and network failures
- 2 retries maximum

### Throttling Plugin
```typescript
throttle: {
  onRateLimit(retryAfter, opts, client, retryCount) {
    return retryCount < 2; // Retry up to 2 times on primary rate limit
  },
  onSecondaryRateLimit(_retryAfter, opts, client) {
    return false; // Don't retry on secondary rate limit
  },
}
```

## Consequences for Implementation

### Must Implement
1. `LiveGitHubE2EConfig` interface with all gate fields
2. `loadLiveGitHubE2EConfig(env)` function
3. `shouldSkipLiveGitHubE2E(config)` function returning string | null
4. Live run ID generation: `live-e2e-<YYYYMMDD>-<6-char-random>`
5. Live test marker injection in all comments
6. Conditional `vitest` skip for live tests
7. Read-only smoke test
8. Write E2E test with all phases
9. Deduplication verification
10. Unicode/Umlaut preservation test
11. Secret redaction verification

### Must NOT Implement
- PR creation
- Git commit/push
- Issue creation (unless `ALLOW_CREATE_ISSUE=true`)
- Issue closing/deleting
- Comment deletion
- Real LLM calls
- Auto-fix/auto-repair

### Documentation Required
- `docs/e2e-live-github.md` — complete runbook
- Updates to `docs/github-adapter.md` — live test section
- This research document

### Test Structure
```
apps/server/src/__tests__/
├── live/
│   └── github-live-e2e.test.ts    (conditional skip)
```

OR:

```
packages/github-adapter/src/__tests__/
├── live-e2e/
│   └── github-live-e2e.test.ts    (conditional skip)
```
