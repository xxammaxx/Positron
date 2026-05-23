# E2E Live GitHub + Owner Config Validation

## Sources
- [REST API endpoints for issue comments](https://docs.github.com/en/rest/issues/comments)
- [REST API endpoints for labels](https://docs.github.com/en/rest/issues/labels)
- [Authenticating to the REST API](https://docs.github.com/en/rest/authentication)
- [Keeping your API credentials secure](https://docs.github.com/en/rest/authentication/keeping-your-api-credentials-secure)
- [Permissions required for fine-grained personal access tokens](https://docs.github.com/en/rest/authentication/permissions-required-for-fine-grained-personal-access-tokens)
- [Rate limits for the REST API](https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api)
- [Best practices for using the REST API](https://docs.github.com/en/rest/using-the-rest-api/best-practices-for-using-the-rest-api)

## Required GitHub permissions
- GitHub recommends a fine-grained personal access token over a classic PAT for REST API work.
- Repository metadata reads map to the `Metadata` repository permission with `read` access.
- Reading issues, reading issue comments, and reading labels requires `Issues` `read` access on the target repository.
- Creating issue comments and adding or removing labels requires `Issues` `write` access on the target repository.
- GitHub also exposes `Pull requests` permissions for some shared endpoints, but Positron live tests should stay issue-focused and use `Issues` permissions when possible.
- Public repositories can allow some read endpoints without auth, but live validation must not depend on that because write tests and private-repo validation both require authentication.

## Issue/comment/label API facts
- Issue comments live under `GET`/`POST /repos/{owner}/{repo}/issues/{issue_number}/comments`.
- Repository-wide comment listing lives under `GET /repos/{owner}/{repo}/issues/comments`.
- Labels are managed through Issues endpoints, including add, remove, set, and list operations.
- `owner` and `repo` are separate path parameters; the repository name is supplied without the `.git` suffix.
- Comment creation returns structured comment data and is suitable for evidence logging when paired with redaction.
- Label removal can legitimately return `404` when the label is already gone, so the sync service should tolerate that case.

## Live test gating
- Live GitHub tests must stay disabled unless `POSITRON_ENABLE_LIVE_GITHUB_TESTS=true`.
- Live writes must stay disabled unless `POSITRON_LIVE_TEST_ALLOW_WRITE=true`.
- `GITHUB_TOKEN` must be present before any live GitHub access is attempted.
- `POSITRON_TEST_OWNER` and `POSITRON_TEST_REPO` must be present and valid GitHub owner/repo identifiers.
- `POSITRON_TEST_ISSUE_NUMBER` is required for live write tests because the issue must already exist.
- Missing gates should produce a clean skip, not a failure.
- The live harness should be safe by default and should never mutate a repository unless the write gate is explicit.

## Rate limit implications
- Authenticated REST API requests get the standard authenticated primary limit, which is higher than the unauthenticated limit.
- GitHub documents secondary rate limits and warns against concurrent requests.
- GitHub documents that mutative requests should be serialized and that a pause between `POST`, `PATCH`, `PUT`, and `DELETE` requests helps avoid secondary limits.
- GitHub documents that if `retry-after` is present, clients should wait that long; if the remaining budget is `0`, clients should wait until reset; otherwise they should back off instead of spinning.
- Live E2E validation should be intentionally sparse and serial because it creates content and exercises write endpoints.

## Owner/repo configuration implications
- The orchestrator should model repository owner and repository name as configuration, not as a hardcoded literal.
- Owner and repo should be validated before use so that URLs, path traversal, and slash-separated injection values are rejected.
- A validated owner/repo pair can be used to construct the remote URL and workspace metadata safely.
- Live E2E config should reuse the same validation rules so the test harness and orchestrator do not drift.

## Security implications
- Credentials should be treated like passwords and never hardcoded into the repository.
- Tokens should never be logged or echoed into issue comments.
- Live comments should be redacted before POST if they include secret-like patterns.
- Machine-readable markers should remain ASCII-only so deduplication and parsing stay stable.
- The run marker strategy should stay explicit so live comments can be deduplicated without parsing arbitrary free-form prose.

## Consequences for implementation
- Live GitHub validation needs repository owner/repo config injection before any live request is made.
- Read-only live tests can validate repository, issue, comment, and label reads without mutating the repository.
- Write live tests must be serial, gated, and documented so they do not accidentally touch the wrong repo.
- The live harness should prefer issues endpoints, issue comments, and issue labels rather than PR-specific flows.
- The implementation should fail closed: skip by default, block on invalid config, and only write when the explicit live-write gate is enabled.
