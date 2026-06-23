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

## Known Limitations

See [`docs/status/known-limitations.md`](docs/status/known-limitations.md).
