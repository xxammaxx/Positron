# Compliance Audit: ReadOnly GitHub Adapter Capability Layer

Date: 2026-07-07
Scope: GDPR/DSGVO compliance assessment of the ReadOnly GitHub Adapter

## Assessment

- **GDPR/DSGVO risk:** Medium-High for real-token / production use
- **Compliance decision:** No-Go for production real-token usage; Go for fake/local mode

## Findings

### F-C01: Personal Data Exposure via GitHub Reads

The read-only adapter exposes personal data candidates:
- Issue/PR bodies, comments (may contain PII)
- Assignees (GitHub usernames linked to individuals)
- PR file patches (may contain sensitive data)
- URLs and metadata linked to users

**Assessment:** Public GitHub data still counts as personal data when linked to identifiable individuals. However, data read from public repositories on GitHub is processed under GitHub's public data terms. No consent tracking is needed for public GitHub reads — use documented lawful basis instead.

**Recommendation:** Apply field allowlisting/redaction before display/storage. Avoid storing raw bodies/comments/patches in evidence unless explicitly required.

### F-C02: No Centralized Audit Logging

The current infrastructure lacks compliance-grade evidence trails:
- `.opencode/logs/` is ephemeral/chat-memory, not a compliance-grade evidence trail
- GitHub read/write operations are not centrally audit-logged
- No correlation IDs for tracing read operations

**Recommendation:**
- Log all reads with repo, operation, resource id, correlation id, timestamp, duration, result count
- Log blocked writes with operation, repo, policy reason, caller, timestamp

### F-C03: Token Handling Acceptable at Basic Level

- Token values are not intentionally logged in the reviewed paths
- `redactSecrets` has been applied to generic error paths in `real-adapter.ts` and `labels.ts`
- No centralized redaction policy exists

**Recommendation:** Use short-lived, repo-scoped read-only tokens. Never persist in docs/logs.

### F-C04: Positive: ReadOnly Boundary Introduced

The new `ReadOnlyGitHubAdapterWrapper` with closure-private `#inner` field provides a runtime barrier:
- Write methods are absent from the type and runtime object
- No `getClient()` or inner adapter exposure
- `GitHubCapabilityError` for blocked write operations

## Documentation Updates Required

1. `docs/compliance/README.md` — add GitHub processing basis, data categories, minimization, redaction, audit trail, token retention
2. `docs/status/known-limitations.md` — add current lack of formal read-only boundary (now partially addressed) and GitHub-call audit logging gaps
3. `SECURITY.md` — note the new `ReadOnlyGitHubAdapter` capability boundary

## Final Call

- **Go:** for fake/local mode, tightly bounded internal testing
- **No-Go:** for real GitHub read-only probe with real token until audit logging and field redaction are implemented
