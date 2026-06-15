# MCP Capability Manifest Schema

## Required Fields

Every MCP server registered in Positron must provide a capability manifest with the following fields:

| Field | Type | Description |
|---|---|---|
| `server_id` | `string` | Unique identifier for this MCP server (e.g., `playwright-mcp-v1`) |
| `owner` | `string` | Responsible team or maintainer (e.g., `positron-core`) |
| `transport` | `"stdio" \| "http" \| "sse"` | Communication transport protocol |
| `auth_required` | `boolean` | Whether the server requires authentication |
| `auth_mechanism` | `string \| null` | Description of auth mechanism if required (e.g., `env:GITHUB_TOKEN`) |
| `tools` | `ToolDeclaration[]` | List of declared tools with per-tool metadata |
| `allowed_paths` | `string[]` | Filesystem paths the server may access (workspace-scoped) |
| `allowed_domains` | `string[]` | Network domains the server may connect to (egress allowlist) |
| `write_capabilities` | `string[]` | Declared write operations (e.g., `file_write`, `db_insert`) |
| `read_capabilities` | `string[]` | Declared read operations (e.g., `file_read`, `http_get`) |
| `destructive_capabilities` | `string[]` | Destructive operations requiring human approval (e.g., `file_delete`, `db_drop`) |
| `requires_human_approval` | `string[]` | Specific tools that always require human approval |
| `logging` | `boolean` | Whether all tool invocations must be audit-logged |
| `redaction_rules` | `RedactionRule[]` | Rules for redacting secrets from tool output |
| `timeout_ms` | `number` | Maximum execution time per tool invocation (in milliseconds) |
| `rate_limit` | `RateLimit \| null` | Rate limit configuration (max invocations per period) |

## Tool Declaration

```typescript
interface ToolDeclaration {
  name: string;                    // Tool name as exposed by MCP server
  description: string;             // What the tool does
  risk: "LOW" | "MEDIUM" | "HIGH"; // Risk classification
  category: "READ" | "WRITE" | "DESTRUCTIVE" | "NETWORK" | "EXEC"; // Operation category
  requires_human_approval: boolean; // Whether this specific tool needs human approval
  parameters: ToolParameter[];     // Declared parameters with types
}
```

## Redaction Rule

```typescript
interface RedactionRule {
  pattern: string;    // Regex pattern to match
  replacement: string; // Replacement text (e.g., "[REDACTED]")
  description: string; // What this rule protects
}
```

## Rate Limit

```typescript
interface RateLimit {
  max_invocations: number; // Maximum invocations
  period_ms: number;       // Time period in milliseconds
}
```

## Forbidden by Default

The following capabilities are forbidden unless explicitly approved by a human with security review:

| Capability | Why Forbidden |
|---|---|
| `unrestricted_filesystem` | Allows reading/writing any path on the host |
| `unrestricted_shell` | Allows arbitrary command execution |
| `unrestricted_browser_profile` | Allows access to saved credentials and cookies |
| `secrets_read` | Allows reading environment variables or secret files |
| `global_config_write` | Allows modifying Positron or system configuration |
| `network_wildcard_egress` | Allows connections to any domain |
| `process_execution` | Allows spawning arbitrary processes |
| `container_orchestration` | Allows controlling Docker or VM runtimes |
| `user_data_access` | Allows reading user home directory or personal files |

## Example Manifest (No Secrets)

```json
{
  "server_id": "playwright-mcp-v1",
  "owner": "positron-core",
  "transport": "stdio",
  "auth_required": false,
  "auth_mechanism": null,
  "tools": [
    {
      "name": "browser_navigate",
      "description": "Navigate to a URL",
      "risk": "LOW",
      "category": "NETWORK",
      "requires_human_approval": false,
      "parameters": [
        { "name": "url", "type": "string", "required": true }
      ]
    },
    {
      "name": "browser_screenshot",
      "description": "Take a screenshot",
      "risk": "LOW",
      "category": "READ",
      "requires_human_approval": false,
      "parameters": [
        { "name": "name", "type": "string", "required": true }
      ]
    },
    {
      "name": "browser_click",
      "description": "Click an element",
      "risk": "MEDIUM",
      "category": "WRITE",
      "requires_human_approval": false,
      "parameters": [
        { "name": "element", "type": "string", "required": true },
        { "name": "ref", "type": "string", "required": true }
      ]
    },
    {
      "name": "browser_fill",
      "description": "Type text into an element",
      "risk": "MEDIUM",
      "category": "WRITE",
      "requires_human_approval": false,
      "parameters": [
        { "name": "element", "type": "string", "required": true },
        { "name": "ref", "type": "string", "required": true },
        { "name": "text", "type": "string", "required": true }
      ]
    }
  ],
  "allowed_paths": [
    "${POSITRON_WORKSPACE_ROOT}/tests",
    "${POSITRON_WORKSPACE_ROOT}/screenshots"
  ],
  "allowed_domains": [
    "localhost:3000",
    "localhost:5173"
  ],
  "write_capabilities": [
    "file_write_screenshot",
    "file_write_trace"
  ],
  "read_capabilities": [
    "file_read",
    "http_get"
  ],
  "destructive_capabilities": [],
  "requires_human_approval": [],
  "logging": true,
  "redaction_rules": [
    {
      "pattern": "ghp_[a-zA-Z0-9]{36}",
      "replacement": "[GITHUB_TOKEN_REDACTED]",
      "description": "GitHub personal access token"
    },
    {
      "pattern": "sk-[a-zA-Z0-9]{32,}",
      "replacement": "[OPENAI_KEY_REDACTED]",
      "description": "OpenAI API key"
    }
  ],
  "timeout_ms": 30000,
  "rate_limit": {
    "max_invocations": 100,
    "period_ms": 60000
  }
}
```

## Manifest Validation Rules

1. **All required fields must be present** — Missing fields cause manifest rejection
2. **`server_id` must be unique** — Duplicate server IDs are rejected
3. **`allowed_paths` must be within workspace** — Paths outside workspace root are rejected
4. **`allowed_domains` must not contain wildcards** — `*` is rejected; explicit domains only
5. **`destructive_capabilities` must be a subset of `write_capabilities`** — Cannot declare destructive without declaring write
6. **`timeout_ms` must be positive** — 0 or negative timeout is rejected
7. **`rate_limit` must be reasonable** — Suspiciously high limits trigger review
8. **Forbidden-by-default capabilities are blocked** — Even if declared in manifest, forbidden capabilities require human security review override

## Enforcement

Manifest validation is enforced at:

1. **Registration time** — When an MCP server is registered with Positron
2. **Tool invocation time** — Before each tool call, parameters are checked against declared parameters
3. **Runtime policy** — `packages/sandbox` enforces `allowed_paths` and `allowed_domains` at runtime
4. **Audit logging** — Every tool invocation is logged with server identity, tool name, and parameters
