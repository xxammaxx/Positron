# Security Policy

## Reporting Security Issues

Do not post secrets, tokens, `.env` contents or private credentials in public issues or pull requests.

For now, report security-sensitive findings through a private maintainer channel or a minimal GitHub issue that contains no secret values.

## Security Model

Positron treats tool execution and write-capable automation as sensitive.

Current rules:

- Local gates are the source of truth.
- GitHub Actions is advisory-only.
- Tooling should default to deny for write-capable operations.
- Human approval is required for merges and risky actions.
- Evidence should document what was run and what changed.

## Admin Authentication (RED_HOLD remediated)

All write endpoints (POST, PUT, DELETE) require admin authentication via `POSITRON_ADMIN_TOKEN`.
Supported headers: `Authorization: Bearer <token>` or `X-Admin-Token: <token>`.
No default token — the operator must explicitly set `POSITRON_ADMIN_TOKEN`.
Fail-closed: missing/wrong token returns 401, unconfigured token returns 503.

See [docs/security/admin-auth.md](docs/security/admin-auth.md).

## Docker Security (RED_HOLD remediated)

All services run with `security_opt: no-new-privileges:true` and `cap_drop: ALL`.
Nginx and web use `read_only: true` root filesystem with tmpfs for required writable paths.
Redis is internal-only (no host port exposure) with requirepass authentication.
No hardcoded admin tokens or default passwords.

See [docs/security/docker-hardening.md](docs/security/docker-hardening.md).

## Production Deployment

Refer to the [production security checklist](docs/security/production-security-checklist.md) before deploying.

## MCP/OpenCode Security

MCP tools and OpenCode adapter default to fake mode. Real mode requires explicit approval gates.
All external skills follow a trust-tier system: Tier 0 (Readonly), Tier 1 (Sandboxed), Tier 2 (Human-Gate).

See [docs/security/opencode-mcp-security-policy.md](docs/security/opencode-mcp-security-policy.md).

## Known Limitations

See [`docs/status/known-limitations.md`](docs/status/known-limitations.md).

Full Real Mode (#308) remains blocked pending separate validation pre-flight.
GDPR/DSGVO full governance remains an open item documented in [docs/compliance/README.md](docs/compliance/README.md).
