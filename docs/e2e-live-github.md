# E2E Live GitHub Validation

## Purpose
Validate the end-to-end Issue-to-Run flow against a real GitHub test repository without turning live GitHub access into a default behavior.

## What This Validates
- Repository metadata reads
- Issue reads
- Issue comment reads
- Label reads and label transitions
- Issue claiming through GitHub comments and labels
- Workspace preparation from a configured repository
- Test command detection
- Test command execution
- Test report comment writing
- Final status comment writing
- Comment deduplication by HTML marker
- Unicode preservation in comment text
- ASCII-only machine markers
- Secret redaction before posting comments

## What This Does Not Validate
- Pull request creation
- Git commit or push
- OpenCode real adapter
- Spec Kit real adapter
- Auto-fix or auto-repair
- Auto-merge
- Webhooks
- Comment PATCH / update
- Pagination beyond 100 comments
- Retry systems for GitHub sync
- Automatic test repository creation

## Required Test Repository
- Use one dedicated repository only.
- The repository must already exist before the test runs.
- The repository should contain at minimum:
  - `package.json`
  - `README.md`
  - a `test` script that exits `0`
  - optionally a `build` script
- The issue to be exercised must be open and labeled `positron:ready`.
- Suggested issue title: `Positron Live E2E Fixture – Größe prüfen`

Example fixture `package.json`:

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

## Required Environment Variables

### Read-only mode
```bash
export POSITRON_ENABLE_LIVE_GITHUB_TESTS=true
export GITHUB_TOKEN=github_pat_...
export POSITRON_TEST_OWNER=<owner>
export POSITRON_TEST_REPO=<repo>
```

### Write mode
```bash
export POSITRON_LIVE_TEST_ALLOW_WRITE=true
export POSITRON_TEST_ISSUE_NUMBER=1
```

### Optional
```bash
export POSITRON_LIVE_TEST_ALLOW_CREATE_ISSUE=true
export POSITRON_LIVE_TEST_ALLOW_CLEANUP=true
```

## Repository Owner/Repo Configuration
- The orchestrator reads `POSITRON_REPO_OWNER` and `POSITRON_REPO_NAME` from configuration instead of hardcoding an owner string.
- `POSITRON_REPO_DEFAULT_BRANCH` and `POSITRON_REPO_REMOTE_URL` are optional overrides.
- Owner and repo are validated before use:
  - no slashes
  - no path traversal
  - no URL values
  - only GitHub-safe identifier characters
- Live E2E uses the same ownership model:
  - `POSITRON_TEST_OWNER`
  - `POSITRON_TEST_REPO`
  - `POSITRON_TEST_ISSUE_NUMBER`

## Read-only Mode
When live tests are enabled but `POSITRON_LIVE_TEST_ALLOW_WRITE` is not set:
- The repository is read
- The issue is read
- Comments are listed
- Labels are listed
- No comments are created
- No labels are changed

This mode should skip cleanly when the repo, issue, or token gates are missing.

## Write Mode
When `POSITRON_LIVE_TEST_ALLOW_WRITE=true` is present:
1. Read the issue
2. Confirm the issue is the explicit target
3. Confirm `positron:ready`
4. Generate a live run ID
5. Claim the issue
6. Verify `positron:running` and removal of `positron:ready`
7. Prepare the workspace
8. Detect test commands
9. Run the detected commands
10. Write the test report comment
11. Write the final done / failed / blocked comment
12. Re-run the same sync path and verify deduplication
13. Verify Unicode, ASCII markers, and redaction in the written comment bodies

## Safety Gates
| Gate | Purpose | Default |
|---|---|---|
| `POSITRON_ENABLE_LIVE_GITHUB_TESTS` | Master enable switch | disabled |
| `POSITRON_LIVE_TEST_ALLOW_WRITE` | Prevent accidental writes | disabled |
| `POSITRON_TEST_OWNER` | Target repository owner | none |
| `POSITRON_TEST_REPO` | Target repository name | none |
| `POSITRON_TEST_ISSUE_NUMBER` | Explicit issue target | none |
| `POSITRON_LIVE_TEST_ALLOW_CREATE_ISSUE` | Reserve auto-creation for a later issue | disabled |
| `POSITRON_LIVE_TEST_ALLOW_CLEANUP` | Reserve cleanup behavior for a later issue | disabled |

## Expected Labels
| Phase | Labels Added | Labels Removed |
|---|---|---|
| CLAIMED | `positron:running` | `positron:ready`, `positron:done`, `positron:blocked`, `positron:failed` |
| REPO_SYNC | `positron:repo-sync` | `positron:testing`, `positron:done`, `positron:failed` |
| TEST | `positron:testing` | `positron:repo-sync`, `positron:failed` |
| DONE | `positron:done` | `positron:running`, `positron:repo-sync`, `positron:research`, `positron:testing`, `positron:blocked`, `positron:failed` |
| FAILED | `positron:failed` | `positron:running`, `positron:repo-sync`, `positron:research`, `positron:testing`, `positron:done`, `positron:blocked` |
| BLOCKED | `positron:blocked` | `positron:running`, `positron:repo-sync`, `positron:research`, `positron:testing`, `positron:done`, `positron:failed` |

## Expected Comments
Live GitHub comments should carry both:
- the normal Positron sync marker: `<!-- positron:run=<runId>;phase=<phase>;kind=<kind> -->`
- the live harness marker: `<!-- positron:live-e2e=true -->`

Recommended kinds:
- `accepted`
- `phase-update`
- `test-report`
- `done`
- `failed`
- `blocked`

## Deduplication Behavior
- Deduplication is marker-based, not prose-based.
- If a second write uses the same `runId`, `phase`, and `kind`, the sync service should skip the duplicate comment.
- A different `runId` must create a new comment.

## Unicode Validation
- Comment prose may contain German umlauts and other non-ASCII characters.
- Machine markers must remain ASCII-only.
- Branch names must remain ASCII-safe even if the issue title contains umlauts.

## Secret Redaction Validation
- Comments are passed through `redactSecrets()` before posting.
- Live E2E uses fake secrets only.
- The comment body must not contain the fake secret after sync.

## Cleanup Policy
- Comments remain as evidence.
- Labels are part of the evidence trail and are not deleted by default.
- `POSITRON_LIVE_TEST_ALLOW_CLEANUP=true` is reserved for explicit cleanup follow-up and is not part of the default path.

## How to Run

### Normal test suite
```bash
npm test
```
Live E2E tests should skip cleanly when the live flags are missing.

### Live read-only smoke test
```bash
POSITRON_ENABLE_LIVE_GITHUB_TESTS=true \
GITHUB_TOKEN=github_pat_... \
POSITRON_TEST_OWNER=<owner> \
POSITRON_TEST_REPO=<repo> \
npx vitest run apps/server/src/__tests__/live-github-e2e.test.ts
```

### Live write test
```bash
POSITRON_ENABLE_LIVE_GITHUB_TESTS=true \
POSITRON_LIVE_TEST_ALLOW_WRITE=true \
GITHUB_TOKEN=github_pat_... \
POSITRON_TEST_OWNER=<owner> \
POSITRON_TEST_REPO=<repo> \
POSITRON_TEST_ISSUE_NUMBER=1 \
npx vitest run apps/server/src/__tests__/live-github-e2e.test.ts
```

## Troubleshooting
- If tests skip, check that `POSITRON_ENABLE_LIVE_GITHUB_TESTS=true` is set.
- If read-only tests skip, check `GITHUB_TOKEN`, `POSITRON_TEST_OWNER`, and `POSITRON_TEST_REPO`.
- If write tests skip, check `POSITRON_LIVE_TEST_ALLOW_WRITE=true` and `POSITRON_TEST_ISSUE_NUMBER`.
- If GitHub returns rate-limit errors, re-run later and avoid parallel mutating requests.
- If the repository or issue is wrong, fix the config and rerun rather than retrying against the wrong target.

## Known Limitations
- This issue does not create the test repository automatically.
- This issue does not create pull requests.
- This issue does not commit or push code.
- This issue does not implement comment PATCH/updates.
- Pagination beyond 100 comments is not covered.
- Retry logic for GitHub sync is still intentionally minimal.
