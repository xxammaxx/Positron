# E2E Live GitHub Validation

## Purpose

This document describes Positron's live E2E test mode that validates the complete
Issue-to-Run cycle against a real GitHub test repository. Live tests ensure that
all MVP components work together correctly with the real GitHub API.

## What This Validates

The live E2E test validates the following chain end-to-end:

```
Real GitHub Test Repo
  → Real Issue with positron:ready
  → Positron detects Issue (getIssue)
  → Positron claims Issue (syncRunAccepted)
  → positron:running label set, positron:ready removed
  → Accepted comment written with marker
  → Local workspace created (clone repo)
  → Branch positron/issue-<n>-<slug> created
  → Tests detected from package.json
  → Tests executed
  → TestReport generated
  → TestReport comment written with marker
  → Done/Failed/Blocked comment written
  → Labels reflect final state
  → Deduplication prevents duplicate comments
  → German umlauts preserved in comment text
  → ASCII-only machine-readable markers
  → Secret redaction applied to comment bodies
```

## What This Does NOT Validate

- Pull Request creation (Issue #14+)
- Git commit / push
- Real LLM calls (stubs only in MVP)
- Auto-fix / auto-repair
- Auto-merge
- Webhooks
- Comment updates (PATCH) — MVP uses create-only with dedup
- Spec Kit real adapter
- OpenCode real adapter
- Pagination for >100 comments (dedup scans first page only)

## Required Test Repository

The test repository must be a dedicated repository used exclusively for live E2E testing.

### Minimal Test Repository Structure

```json
{
  "name": "positron-live-e2e-fixture",
  "private": true,
  "scripts": {
    "test": "node -e \"console.log('positron live e2e test passed')\"",
    "build": "node -e \"console.log('positron live e2e build passed')\""
  }
}
```

### Required Issue State

The test issue must:
- Be open
- Have `positron:ready` label
- Have a clear title, e.g., "Positron Live E2E Fixture – Größe prüfen"
- NOT have `positron:running` label initially

## Required Environment Variables

### Read-Only Mode
```bash
export POSITRON_ENABLE_LIVE_GITHUB_TESTS=true
export GITHUB_TOKEN=github_pat_...
export POSITRON_TEST_OWNER=xxammaxx
export POSITRON_TEST_REPO=positron-live-e2e-fixture
```

### Write Mode (additionally required)
```bash
export POSITRON_LIVE_TEST_ALLOW_WRITE=true
export POSITRON_TEST_ISSUE_NUMBER=1
```

### Optional
```bash
export POSITRON_LIVE_TEST_ALLOW_CREATE_ISSUE=true   # Allow creating test issues
export POSITRON_LIVE_TEST_ALLOW_CLEANUP=true         # Reset labels after test
```

## Read-Only Mode

When `POSITRON_ENABLE_LIVE_GITHUB_TESTS=true` is set but `POSITRON_LIVE_TEST_ALLOW_WRITE` is NOT:

- Repository metadata is read
- Issue details are read
- Issue comments are read
- Labels are read
- **No comments are written**
- **No labels are changed**

This is a safe smoke test that verifies connectivity and authentication.

## Write Mode

When `POSITRON_LIVE_TEST_ALLOW_WRITE=true` is additionally set:

1. **Issue claiming**: `syncRunAccepted` writes accepted comment, sets `positron:running`, removes `positron:ready`
2. **Workspace**: RealGitWorkspaceAdapter clones the test repo, creates branch
3. **Test detection**: TestCommandDetector reads package.json scripts
4. **Test execution**: TestRunner executes detected commands
5. **Status sync**: TestReport, Done/Failed/Blocked comments written
6. **Deduplication**: Second run with same runId produces zero new comments
7. **Verification**: Labels, comments, markers verified

## Safety Gates

| Gate | Purpose | Default |
|------|---------|---------|
| `POSITRON_ENABLE_LIVE_GITHUB_TESTS` | Master enable switch | disabled |
| `POSITRON_LIVE_TEST_ALLOW_WRITE` | Prevent accidental writes | disabled |
| `POSITRON_TEST_OWNER` | Limit to specific repository | none |
| `POSITRON_TEST_REPO` | Limit to specific repository | none |
| `POSITRON_TEST_ISSUE_NUMBER` | Limit to specific issue | none |
| `POSITRON_LIVE_TEST_ALLOW_CREATE_ISSUE` | Prevent issue creation | disabled |
| `POSITRON_LIVE_TEST_ALLOW_CLEANUP` | Prevent label reset | disabled |

**Default behavior**: All live tests SKIP — never fail. The normal test suite
must remain green with zero live test dependencies.

## Expected Labels

During a write E2E run, the following label transitions occur on the test issue:

| Phase | Labels Added | Labels Removed |
|-------|-------------|----------------|
| Initial | `positron:ready` | — |
| CLAIMED | `positron:running` | `positron:ready` |
| TEST | `positron:testing` | — |
| DONE (pass) | `positron:done` | `positron:running`, `positron:testing` |
| FAILED | `positron:blocked` | `positron:running`, `positron:testing` |
| BLOCKED | `positron:blocked` | `positron:running`, `positron:testing` |

## Expected Comments

Comments written during a write E2E run include HTML marker comments for deduplication:

```html
<!-- positron:run=<runId>;phase=<phase>;kind=<kind> -->
<!-- positron:live-e2e=true;run=<runId> -->
```

Comment kinds:
- `accepted` — Run accepted, workspace preparation starting
- `phase-update` — Phase transition (optional, not always in E2E)
- `test-report` — Test execution results table
- `done` — Run completed successfully
- `failed` — Run failed
- `blocked` — Run blocked

## Deduplication Behavior

The `GitHubStatusSyncService` checks existing comments for marker matches before
writing. A second sync call with the same `runId + phase + kind` will be detected
as a duplicate and skipped:

```
Sync 1 with runId=X, phase=CLAIMED, kind=accepted → comment created
Sync 2 with runId=X, phase=CLAIMED, kind=accepted → SKIPPED (duplicate)
Sync 3 with runId=Y, phase=CLAIMED, kind=accepted → comment created (new runId)
```

## Unicode Validation

- **Preserved**: German umlauts in comment text bodies (titles, summaries, messages)
- **ASCII-only**: Machine-readable markers (`<!-- positron:... -->`), branch names, workspace paths
- **Validation**: `isAsciiOnly()` verifies all markers are pure ASCII

## Secret Redaction Validation

All comment bodies pass through `redactSecrets()` from `@positron/shared` before
posting to GitHub. This redacts:
- GitHub tokens (`ghp_*`, `github_pat_*`)
- OpenAI keys (`sk-*`)
- Anthropic keys (`anthropic_*`)
- Gemini keys (`gemini_*`)
- Bearer tokens
- Generic `api_key=value` patterns

**The E2E test uses FAKE keys for redaction verification — never real tokens.**

## Cleanup Policy

### Standard (no cleanup flag)
- Comments remain on the test issue as evidence
- Labels remain in final state

### With `POSITRON_LIVE_TEST_ALLOW_CLEANUP=true`
- Labels are reset to `positron:ready` (removing `positron:done`/`positron:blocked`/`positron:running`)
- Comments are NOT deleted (GitHub retains comment history)

### Never Allowed
- Issue closing
- Issue deletion
- Comment deletion
- Branch pushing
- Repository modification

## How to Run

### Normal Test Suite (always safe)
```bash
npm test
# Live E2E tests are skipped — no GitHub access needed
# Expected: 27+ passed, 1 skipped (live E2E)
```

### Read-Only Live Test
```bash
POSITRON_ENABLE_LIVE_GITHUB_TESTS=true \
GITHUB_TOKEN=github_pat_... \
POSITRON_TEST_OWNER=xxammaxx \
POSITRON_TEST_REPO=positron-live-e2e-fixture \
npm test -- --runInBand
```

### Write Live Test
```bash
POSITRON_ENABLE_LIVE_GITHUB_TESTS=true \
POSITRON_LIVE_TEST_ALLOW_WRITE=true \
GITHUB_TOKEN=github_pat_... \
POSITRON_TEST_OWNER=xxammaxx \
POSITRON_TEST_REPO=positron-live-e2e-fixture \
POSITRON_TEST_ISSUE_NUMBER=1 \
npm test -- --runInBand
```

### With Cleanup
```bash
POSITRON_ENABLE_LIVE_GITHUB_TESTS=true \
POSITRON_LIVE_TEST_ALLOW_WRITE=true \
POSITRON_LIVE_TEST_ALLOW_CLEANUP=true \
GITHUB_TOKEN=github_pat_... \
POSITRON_TEST_OWNER=xxammaxx \
POSITRON_TEST_REPO=positron-live-e2e-fixture \
POSITRON_TEST_ISSUE_NUMBER=1 \
npm test -- --runInBand
```

**Important**: Always use `--runInBand` for live tests to avoid parallel runs
that could interfere with each other.

## Troubleshooting

### Tests skip with "ENABLE_LIVE_GITHUB_TESTS is not set"
→ Set `POSITRON_ENABLE_LIVE_GITHUB_TESTS=true`

### Tests skip with "GITHUB_TOKEN is not set"
→ Set `GITHUB_TOKEN=...` (fine-grained PAT with Issues R/W + Metadata R)

### Tests skip with "OWNER and REPO must both be set"
→ Set `POSITRON_TEST_OWNER` and `POSITRON_TEST_REPO`

### Tests skip with "ALLOW_WRITE is not set"
→ Set `POSITRON_LIVE_TEST_ALLOW_WRITE=true` for write operations

### Tests skip with "ISSUE_NUMBER must be set"
→ Set `POSITRON_TEST_ISSUE_NUMBER=<n>` for write operations

### Rate limit errors (403)
→ Wait for rate limit reset (check `x-ratelimit-reset` header)
→ The E2E test uses ~8-12 API calls per run; well within limits

### Build errors about @positron/shared
→ Run `npm run build` first to compile all packages

### Workspace clone fails
→ Ensure the test repository is public or the token has Contents Read permission
→ Ensure git is installed and configured

## Known Limitations

1. **No comment updates**: MVP uses create-only with dedup; duplicate markers are skipped
2. **~25k comment limit**: Large test reports are truncated
3. **No pagination in dedup**: Only first 100 comments are scanned
4. **No retry for GitHub sync**: Sync failures in orchestrator path are fire-and-forget
5. **RealGitHubAdapter vs interface**: Recently fixed — now properly implements GitHubAdapter
6. **No automatic cleanup**: Labels must be reset manually or with `ALLOW_CLEANUP=true`
7. **Single test issue**: Only one issue number can be configured per test run
8. **Sequential execution required**: Live tests must run with `--runInBand`

## Next Steps After Validation

After Issue #13 is validated:
- **Issue #14**: Spec Kit Real Adapter
- **Issue #15**: OpenCode Real Adapter  
- **Issue #16**: Real LLM Calls
- **Issue #17**: PR Creation
- **Issue #18**: Code Coverage Tracking
