# MCP Capability Manifest Schema

**Issue:** #229
**Status:** Draft

---

## Purpose

Every MCP server connected to Positron MUST declare its capabilities through a standardized Capability Manifest. This manifest is validated during warm-up and used by the Tool Gateway to determine which tools are available, their risk profiles, and what security constraints apply.

---

## Schema

```typescript
interface McpCapabilityManifest {
  /** Schema version for forward compatibility */
  manifestVersion: "1.0.0";

  /** MCP server identity */
  server: {
    /** Unique server name (ASCII, lowercase, kebab-case) */
    name: string;
    /** Human-readable display name */
    displayName: string;
    /** Server version */
    version: string;
    /** Server description */
    description: string;
    /** Contact/maintainer */
    maintainer?: string;
    /** Server homepage/repository */
    homepage?: string;
  };

  /** Server categorization */
  category: "provider" | "filesystem" | "git" | "github" | "browser"
          | "shell" | "spec" | "storage" | "security" | "testing"
          | "oversight" | "blueprint";

  /** Whether this server is required for Positron operation */
  required: boolean;

  /** Hands/Eyes classification */
  role: "hand" | "eye" | "hand_eye" | "decision_surface";

  /** Risk metadata */
  risk: {
    /** Overall risk level */
    level: "low" | "medium" | "high" | "critical";
    /** Risk justification */
    justification: string;
    /** Data sensitivity if applicable */
    dataSensitivity?: "none" | "low" | "medium" | "high" | "critical";
    /** Whether the server can modify source code */
    canModifyCode: boolean;
    /** Whether the server can modify configuration */
    canModifyConfig: boolean;
    /** Whether the server can access network */
    canAccessNetwork: boolean;
    /** Whether the server can read secrets */
    canAccessSecrets: boolean;
  };

  /** Tools provided by this server */
  tools: McpToolDeclaration[];

  /** Resource constraints */
  constraints: {
    /** Maximum concurrent tool calls */
    maxConcurrentCalls: number;
    /** Maximum call duration in milliseconds */
    maxCallDurationMs: number;
    /** Maximum total memory in bytes */
    maxMemoryBytes?: number;
    /** Rate limit: calls per second */
    rateLimitPerSecond?: number;
    /** Rate limit: calls per minute */
    rateLimitPerMinute?: number;
  };

  /** Egress policy enforced by Positron */
  egressPolicy: {
    /** Allowed hostnames (empty = no network) */
    allowedHosts: string[];
    /** Allowed ports (empty = no ports) */
    allowedPorts: number[];
    /** Whether DNS resolution is allowed */
    allowDnsResolution: boolean;
    /** Whether raw TCP is allowed */
    allowRawTcp: boolean;
  };

  /** Warm-up configuration */
  warmup: {
    /** Whether warm-up is required */
    required: boolean;
    /** Warm-up protocol to execute */
    protocol: "standard_mcp_warmup" | "custom";
    /** Custom warm-up command (if protocol=custom) */
    customCommand?: string;
    /** Expected warm-up duration in ms */
    expectedDurationMs: number;
    /** Maximum warm-up attempts before declaring failure */
    maxRetries: number;
    /** Required warm-up tools (must all pass) */
    requiredToolIds: string[];
  };

  /** Evidence requirements */
  evidence: {
    /** Whether to log tool arguments */
    logArguments: boolean;
    /** Whether to log tool output */
    logOutput: boolean;
    /** Whether tool produces artifacts */
    requiresArtifactStorage: boolean;
    /** Fields that MUST be redacted */
    redactedFields: string[];
    /** Additional evidence types generated */
    evidenceTypes: ("screenshot" | "json_report" | "text_log" | "diff" | "metric")[];
  };
}

interface McpToolDeclaration {
  /** Unique tool ID (namespace.tool_name) */
  id: string;
  /** Human-readable title */
  title: string;
  /** Tool description */
  description: string;
  /** JSON Schema for input */
  inputSchema: Record<string, unknown>;
  /** JSON Schema for output */
  outputSchema: Record<string, unknown>;
  /** Risk level */
  riskLevel: "read" | "write" | "network" | "secret_sensitive" | "destructive";
  /** Minimum autonomy level required */
  requiredAutonomyLevel: 0 | 1 | 2 | 3 | 4;
  /** Approval mode */
  approvalMode: "none" | "ask" | "human_required";
  /** Pipeline phases where this tool is allowed */
  allowedPhases: string[];
  /** Whether the tool is idempotent */
  idempotent: boolean;
  /** Whether the tool is reversible */
  reversible: boolean;
  /** Stop/Ask trigger actions */
  stopActions: string[];
}
```

---

## Example Manifest (Filesystem MCP)

```json
{
  "manifestVersion": "1.0.0",
  "server": {
    "name": "positron-filesystem-mcp",
    "displayName": "Positron Filesystem MCP",
    "version": "1.0.0",
    "description": "Workspace-scoped filesystem read/write operations",
    "maintainer": "positron-team"
  },
  "category": "filesystem",
  "required": true,
  "role": "hand_eye",
  "risk": {
    "level": "high",
    "justification": "Can read and write to workspace files. Path traversal must be prevented.",
    "canModifyCode": true,
    "canModifyConfig": false,
    "canAccessNetwork": false,
    "canAccessSecrets": false
  },
  "tools": [
    {
      "id": "filesystem.read_file",
      "title": "Read File",
      "description": "Read contents of a file within workspace",
      "inputSchema": {
        "type": "object",
        "properties": {
          "path": { "type": "string", "description": "Relative path within workspace" }
        },
        "required": ["path"]
      },
      "outputSchema": {
        "type": "object",
        "properties": {
          "content": { "type": "string" }
        }
      },
      "riskLevel": "read",
      "requiredAutonomyLevel": 0,
      "approvalMode": "none",
      "allowedPhases": ["SPECIFY", "PLAN", "IMPLEMENT", "TEST", "VERIFY"],
      "idempotent": true,
      "reversible": true,
      "stopActions": []
    },
    {
      "id": "filesystem.write_file",
      "title": "Write File",
      "description": "Write content to a file within workspace",
      "inputSchema": {
        "type": "object",
        "properties": {
          "path": { "type": "string" },
          "content": { "type": "string" }
        },
        "required": ["path", "content"]
      },
      "outputSchema": {
        "type": "object",
        "properties": {
          "bytes_written": { "type": "number" }
        }
      },
      "riskLevel": "write",
      "requiredAutonomyLevel": 2,
      "approvalMode": "ask",
      "allowedPhases": ["IMPLEMENT"],
      "idempotent": false,
      "reversible": false,
      "stopActions": ["delete", "rm -rf"]
    }
  ],
  "constraints": {
    "maxConcurrentCalls": 5,
    "maxCallDurationMs": 30000,
    "rateLimitPerSecond": 20
  },
  "egressPolicy": {
    "allowedHosts": [],
    "allowedPorts": [],
    "allowDnsResolution": false,
    "allowRawTcp": false
  },
  "warmup": {
    "required": true,
    "protocol": "standard_mcp_warmup",
    "expectedDurationMs": 5000,
    "maxRetries": 2,
    "requiredToolIds": ["filesystem.read_file", "filesystem.write_file"]
  },
  "evidence": {
    "logArguments": true,
    "logOutput": false,
    "requiresArtifactStorage": true,
    "redactedFields": ["content"],
    "evidenceTypes": ["json_report", "text_log"]
  }
}
```

---

## Validation Rules

When Positron validates a Capability Manifest:

1. **Schema conformity** — manifest matches the schema above
2. **ID format** — server name is `[a-z][a-z0-9-]*`, tool IDs follow `namespace.tool_name`
3. **No forbidden capabilities** — manifest does not claim unrestricted access
4. **Risk consistency** — `riskLevel` matches tool operations
5. **Phase consistency** — `allowedPhases` are valid Positron phases
6. **Egress consistency** — network tools have appropriate egress policies
7. **Warm-up completeness** — required tools are declared in warm-up
8. **No secrets** — manifest contains no tokens, keys, or secrets
