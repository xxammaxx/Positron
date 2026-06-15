# ADR: MCP Tool Integration Policy

## Status
**PROPOSED** — June 2026

## Context

The Model Context Protocol (MCP) defines a standard for AI models to interact with external tools. As Positron adopts agentic coding workflows, MCP servers become the "eyes and hands" — providing filesystem access, browser automation, shell execution, and API integration.

However, MCP was designed as an open protocol. Without constraints, an MCP server can:
- Read/write any file on the host
- Execute arbitrary shell commands
- Make unrestricted network requests
- Access browser profiles with saved credentials
- Modify global configuration

Positron's safety model requires that no tool operates without explicit capability boundaries, audit logging, and human approval gates.

## Decision

### 1. MCP is controlled adapter, not free plugin system

MCP servers are allowed only as **controlled adapter surfaces**. Each MCP server must:
- Be explicitly registered with a Capability Manifest
- Have tool-level allowlists
- Log all tool invocations to the audit trail
- Respect timeout and rate limits

### 2. Capability Manifest required

Every MCP server must declare a structured manifest before it can be registered. See [MCP Capability Manifest Schema](../security/mcp-capability-manifest-schema.md).

### 3. No global MCPs loaded automatically

MCP servers from user configuration (`~/.config/opencode/mcp.json`, `cline_mcp_settings.json`) are **not** automatically loaded into Positron runs. Only MCP servers explicitly registered in the Positron configuration with valid manifests are loaded.

### 4. No tool dumping

MCP servers must not expose internal tool lists without explicit registration. Tools not declared in the manifest are blocked.

### 5. Browser MCP isolation

Chrome DevTools MCP and Playwright MCP must use isolated browser profiles:
- No saved logins, cookies, or tokens
- No production URLs
- Test data only
- Separate browser instance from user's default browser

### 6. Filesystem MCP: workspace allowlist

Filesystem MCP servers are restricted to the workspace root. Path traversal (`..`), system directories (`/etc`, `/Windows`), and user home directories are blocked.

### 7. Prohibited MCP servers

The following MCP servers are permanently prohibited:
- Paperclip
- OpenClaw
- Any MCP with unrestricted shell access
- Any MCP without capability manifest

### 8. Human approval for risky tools

Tools marked as `destructive_capabilities` or `requires_human_approval` in the manifest trigger the Stop/Ask protocol. No automatic approval.

## Consequences

### Positive
- **Safety by design** — No MCP server can operate without declaring its capabilities
- **Auditability** — Every tool invocation is logged with server identity and parameters
- **Defense in depth** — Even if an MCP server is compromised, its declared capabilities limit damage

### Negative
- **Onboarding friction** — Each MCP server requires a manifest before use
- **Tool discovery limited** — Tools not in the manifest are invisible, even if they exist
- **Maintenance overhead** — Manifests must be updated when MCP servers add tools

### Neutral
- **MCP ecosystem compatibility** — Positron's constraint model is stricter than default MCP, limiting compatibility with arbitrary community MCP servers

## Alternatives Considered

### A: Unrestricted MCP (rejected)
Allow any MCP server with user approval. Rejected because user approval is not a safety boundary — users may not understand the full capability surface of an MCP server.

### B: No MCP at all (rejected)
Use only Positron's built-in adapters. Rejected because MCP provides a standard integration surface for tools that Positron needs (browser, filesystem, shell).

### C: Trust-tiered MCP (rejected for now)
Allow different trust tiers for MCP servers based on source or signing. Rejected because source trust is not a reliable security boundary. Evaluate after capability manifest system matures.

## Related
- [ADR: Positron Operator Techstack](./ADR-positron-operator-techstack.md)
- [ADR: Agentic Safety Runtime](./ADR-agentic-safety-runtime.md)
- [MCP Capability Manifest Schema](../security/mcp-capability-manifest-schema.md)
- [Stop/Ask Protocol](../security/stop-ask-protocol.md)
