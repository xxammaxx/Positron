# GitHub Status Sync Validation

**Date:** 2026-05-21  
**Issue:** #12 — Evidence Comment Templates and Run Status Synchronization

## Sources

- [GitHub REST API: Issue Comments](https://docs.github.com/en/rest/issues/comments) — 2026-05-21
- [GitHub REST API: Issues/Labels](https://docs.github.com/en/rest/issues/labels) — known patterns
- [GitHub Rate Limiting](https://docs.github.com/en/rest/using-the-rest-api/rate-limits) — secondary rate limits

## Issue comment behavior

### Create comment
- `POST /repos/{owner}/{repo}/issues/{issue_number}/comments`
- Required: `body` (string)
- Response: **201 Created**, returns comment object with `id`, `html_url`
- Error codes: 403 (Forbidden), 404 (Not found), 410 (Gone), 422 (Validation/Spam)
- **Important:** Creating content too quickly triggers secondary rate limiting

### List comments
- `GET /repos/{owner}/{repo}/issues/{issue_number}/comments`
- Supports: `per_page` (max 100), `page`, `since` (ISO 8601)
- Comments returned in ascending ID order
- **MVP limitation:** List returns max 30 comments by default. If >100 comments exist, pagination is required. Currently not implemented — documented as MVP limit.

### Update comment
- `PATCH /repos/{owner}/{repo}/issues/comments/{comment_id}`
- Requires: `body` (string)
- **MVP decision:** Not implemented. Choose Create+Skip over Update to avoid needing comment_id tracking.

### Comment size
- GitHub body field: max 65536 characters
- Positron truncation: 25,000 characters (conservative)
- Exceeded → truncate + append "_Output truncated. Full artifact stored locally._"

## Label behavior

### Add labels
- `POST /repos/{owner}/{repo}/issues/{issue_number}/labels`
- Body: array of label name strings
- Adds labels without removing existing ones

### Remove label
- `DELETE /repos/{owner}/{repo}/issues/{issue_number}/labels/{name}`
- Returns 404 if label does not exist on issue
- **Positron strategy:** Tolerate 404 on remove (label may already be gone)

### Label lifecycle for Positron
| Phase | Set | Remove |
|-------|-----|--------|
| CLAIMED | `positron:running` | ready, done, blocked, failed |
| REPO_SYNC | `positron:repo-sync` | testing, done, failed |
| TEST | `positron:testing` | repo-sync, failed |
| BLOCKED | `positron:blocked` | running, repo-sync, research, testing, done, failed |
| FAILED_TRANSIENT | `positron:failed` | running, repo-sync, research, testing, done, blocked |
| FAILED_UNSAFE | `positron:failed` | running, repo-sync, research, testing, done, blocked |
| FAILED_BLOCKED | `positron:blocked` | running, repo-sync, research, testing, done, failed |
| DONE | `positron:done` | running, repo-sync, research, testing, blocked, failed |

## Pull Requests vs Issues
- Every PR is an Issue, but not every Issue is a PR
- GitHub API uses the same endpoints for both
- Positron focuses on Issues only (labels like `positron:ready` filter out PRs)
- PR support is planned for future issues (#14+)

## Rate limit implications

### Primary rate limit
- Authenticated: 5,000 requests/hour (personal token)
- Each sync operation = 2-3 requests (list comments + create comment + label updates)
- Safe for normal Positron usage (few runs per hour)

### Secondary rate limit
- Triggered by "creating content too quickly" 
- Can result in 403 or 422 responses
- **Positron strategy:** 
  - Sequential operations (no parallel bursts)
  - Graceful failure (`syncStatus: 'failed'` returned, run continues)
  - No retry loop (documented as MVP limit)
  - If triggered, run continues with local evidence intact

## Security implications

### Secrets in comments
- `redactSecrets()` runs on ALL comment bodies before GitHub POST
- Redaction patterns: `ghp_*`, `gho_*`, `github_pat_*`, `Bearer *`, `Authorization: *`
- No raw stdout/stderr in comments — only summaries and artifact paths

### Comment deduplication
- HTML comment markers prevent duplicate comments on re-runs
- Marker format: `<!-- positron:run=<runId>;phase=<phase>;kind=<kind> -->`
- No marker in comment → treated as new comment regardless of content

### LLM metadata safety
- `SafeLlmRunMetadata` interface: only hashes, no full prompts
- Provider/model marked `_unknown_` if not known (no invention)
- All metadata rendered with safety disclaimer

## Consequences for implementation

### For Issue #12
1. ✅ Deduplication via HTML markers — matches API best practice (no need for update)
2. ✅ Label removal tolerates 404 — matches real-world behavior
3. ✅ Comment truncation at 25k — safe buffer under 65k limit
4. ✅ Sequential operations — avoids secondary rate limits
5. ✅ Pagination NOT needed for MVP (<100 comments expected per issue)
6. ✅ Comment update NOT needed (Create+Skip sufficient)

### For Issue #13 (E2E)
- Live tests must check that real GitHub API behaves as documented
- Secondary rate limit handling should be validated
- Label add/remove race conditions should be tested

### Future consideration
- Pagination for issues with >100 comments (Issue #14+)
- Comment update for mutable status (Issue #14+)
- Retry strategy for rate-limited writes (Issue #14+)
