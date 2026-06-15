# Specification: MCP-Compatible Internal Tool Gateway

**Issue:** #219  
**Status:** Draft  
**Date:** 2026-06-15  
**Author:** Issue Orchestrator (human-approved prompt)

---

## 1. Purpose

Controlled integration of an MCP-compatible internal tool gateway layer for Positron's agent orchestration. This is NOT a community MCP server marketplace. It is an internal, controlled gateway for Positron's own project tools with explicit security boundaries and audit trails.

## 2. Non-Goals

- Exposing arbitrary third-party MCP servers
- Enabling remote MCP server registration by agents
- Bypassing existing Positron security policies
- Replacing existing adapter pattern (GitHub, Speckit, OpenCode adapters remain)
- Direct filesystem access outside workspace boundaries

## 3. Architecture

### 3.1 New Package: `packages/tool-gateway/`

```
packages/tool-gateway/
  src/
    types.ts          — ToolDefinition, ToolCall, ToolResult, RiskLevel, etc.
    registry.ts       — ToolRegistry class
    gateway.ts        — GatewayService class
    scanner.ts        — ToolMetadataScanner for security validation
    tools/
      repo.ts         — repo.read_file, repo.list_files, repo.get_diff
      tests.ts        — tests.detect, tests.run_selected
      evidence.ts     — evidence.append
      github.ts       — github.read_issue, github.comment_evidence_draft
    mcp-adapter.ts    — Experimental MCP protocol adapter (feature-flagged)
    index.ts          — Public API exports
  src/__tests__/
    registry.test.ts
    gateway.test.ts
    scanner.test.ts
    tools/
      repo.test.ts
      tests.test.ts
      evidence.test.ts
      github.test.ts
    red/
      tool-poisoning.test.ts
      path-traversal.test.ts
      shell-injection.test.ts
      approval-bypass.test.ts
      egress-violation.test.ts
      secret-leakage.test.ts
      phase-violation.test.ts
      autonomy-violation.test.ts
  package.json
  tsconfig.json
  vitest.config.ts
```

### 3.2 Integration Points

| Module | Integration |
|--------|------------|
| `@positron/shared` | Use `redactSecrets`, `Phase`, `AutonomyLevel`, existing types |
| `@positron/run-state` | Store tool call events via `RunStore.createEvent()` |
| `@positron/sandbox` | Use `TestCommandDetector`, `TestRunner`, path validation |
| `apps/server` | Register GatewayService in the orchestrator pipeline |
| `apps/web` | Dashboard: ToolCallPanel, ToolRegistry view |

## 4. Data Types

### 4.1 RiskLevel
```typescript
type RiskLevel = 'read' | 'write' | 'network' | 'secret_sensitive' | 'destructive';
```

### 4.2 ApprovalMode
```typescript
type ApprovalMode = 'none' | 'ask' | 'human_required';
```

### 4.3 ToolDefinition
```typescript
interface ToolDefinition {
  id: string;                    // ASCII slug, e.g., "repo.read_file"
  title: string;                 // Human-readable display title
  description: string;           // Purpose and behavior
  inputSchema: Record<string, unknown>;  // JSON Schema for inputs
  outputSchema: Record<string, unknown>; // JSON Schema for outputs
  riskLevel: RiskLevel;
  requiredAutonomyLevel: number; // 0-4 from Positron constitution
  approvalMode: ApprovalMode;
  allowedPhases: Phase[];        // Which pipeline phases can use this tool
  allowedWorkspaceRoots: string[]; // Allowed root directories (glob or prefix)
  egressPolicy: {
    allowedHosts: string[];      // Empty = no network allowed
    allowedPorts: number[];
  };
  evidenceRequirements: {
    logArguments: boolean;       // Whether to log (redacted) arguments
    logOutput: boolean;          // Whether to log (redacted) output
    requireArtifact: boolean;    // Whether tool produces an artifact file
  };
}
```

### 4.4 ToolCall
```typescript
interface ToolCall {
  toolId: string;
  arguments: Record<string, unknown>;
  runId: string;
  phase: Phase;
  autonomyLevel: number;
  workspaceRoot: string;
}
```

### 4.5 ToolResult
```typescript
interface ToolResult {
  success: boolean;
  output: unknown;
  error?: string;
  evidenceEventId?: string;
  blockedReason?: string;
}
```

## 5. User Stories

### US-1: Read-Only Tool Execution (P0)
**As a:** Positron agent  
**I want to:** read a file within my workspace  
**So that:** I can analyze code without risk of modification  

**Acceptance Criteria:**
- `repo.read_file` resolves a relative path within workspace root
- Input is schema-validated (path string, maxLength)
- Output is the file content (or error)
- Evidence event is recorded
- No write operations are triggered

### US-2: Write Tool Requires Approval (P0)
**As a:** Positron operator  
**I want to:** require human approval for write-risk tools  
**So that:** no destructive changes happen without oversight  

**Acceptance Criteria:**
- Any tool with `riskLevel: 'write' | 'destructive'` is blocked by default
- Gateway returns `blockedReason: "APPROVAL_REQUIRED"` when approval not granted
- Operator can approve from Dashboard
- Approved calls proceed normally

### US-3: Tool Registry Enforcement (P0)
**As a:** system  
**I want to:** block any tool call not in the allowlist  
**So that:** no unauthorized operations execute  

**Acceptance Criteria:**
- `GatewayService.execute()` checks registry for tool ID
- Unknown tool IDs return `blockedReason: "TOOL_NOT_FOUND"`
- Registry is read-only after startup

### US-4: Secret Redaction (P0)
**As a:** security auditor  
**I want to:** ensure no secrets appear in tool logs  
**So that:** sensitive data is never exposed  

**Acceptance Criteria:**
- Arguments matching secret patterns are redacted before logging
- Output containing secret patterns is redacted
- Uses existing `redactSecrets` from `@positron/shared`

### US-5: Path Traversal Prevention (P0)
**As a:** system  
**I want to:** block file access outside workspace root  
**So that:** agents cannot exfiltrate system files  

**Acceptance Criteria:**
- `repo.read_file("../../.env")` is blocked
- `repo.list_files("../../")` is blocked
- Resolved absolute path must start with workspace root

### US-6: Tool Metadata Scanner (P1)
**As a:** security auditor  
**I want to:** detect poisoned tool descriptions  
**So that:** malicious prompt injection is caught at registration  

**Acceptance Criteria:**
- Description containing "ignore previous instructions" is blocked
- Unusual Unicode mixtures trigger block
- URL/exfiltration patterns in descriptions trigger block
- Scanner runs on `registry.register()`

### US-7: Phase Gating (P1)
**As a:** operator  
**I want to:** restrict tools to specific pipeline phases  
**So that:** write tools don't run during READ phase  

**Acceptance Criteria:**
- Tool with `allowedPhases: ['REVIEW']` blocked in `CODE` phase
- Gateway returns `blockedReason: "PHASE_NOT_ALLOWED"`

### US-8: Dashboard Tool Monitor (P1)
**As a:** operator  
**I want to:** see all tool calls with their status  
**So that:** I can monitor and audit agent activity  

**Acceptance Criteria:**
- Dashboard shows available tools per run
- Shows last tool calls with status (success/blocked)
- Shows pending approval requests
- Links to evidence events

## 6. Built-in Tools (First Iteration)

| Tool ID | Risk | Approval | Description |
|---------|------|----------|-------------|
| `repo.read_file` | read | none | Read a file within workspace |
| `repo.list_files` | read | none | List files in workspace directory |
| `repo.get_diff` | read | none | Get git diff in workspace |
| `tests.detect` | read | none | Auto-detect test commands |
| `tests.run_selected` | write | ask | Run detected test commands |
| `evidence.append` | write | ask | Append evidence item |
| `github.read_issue` | read | none | Read GitHub issue comments |
| `github.comment_evidence_draft` | write | ask | Draft comment on issue |

## 7. Security Model

```
User/Agent → GatewayService.execute()
  ├── 1. Schema Validation (inputSchema)
  ├── 2. Tool Lookup (registry, allowlist check)
  ├── 3. Phase Check (allowedPhases)
  ├── 4. Autonomy Check (requiredAutonomyLevel)
  ├── 5. Approval Check (approvalMode, riskLevel)
  ├── 6. Workspace Boundary Check (path resolution)
  ├── 7. Egress Check (network target validation)
  ├── 8. Secret Redaction (before logging)
  ├── 9. Execution (delegated to tool handler)
  ├── 10. Evidence Event Generation
  └── 11. Result Return (with redacted output)
```

## 8. Edge Cases

- Tool definition with empty `allowedWorkspaceRoots`: only current run workspace
- Tool with `egressPolicy.allowedHosts: []`: any network call blocked
- Concurrent tool calls from same run: serialized per run
- Tool handler throws: caught, logged as error, returns failure
- Circular path resolution: blocked (max 10 symlink hops)

## 9. Verification Contract

1. All new tool inputs validated per schema
2. No tool executable without registry entry
3. Read-only tools cannot trigger write operations
4. Write/destructive tools blocked without approval
5. Tool calls produce evidence events
6. Secret patterns redacted in arguments and outputs
7. Path traversal outside workspace blocked
8. Egress blocked without explicit policy
9. Dashboard distinguishes blocked vs successful calls
10. Existing pipeline tests remain green
11. Red tests fail when allowlist/schema/path boundaries removed

## 10. Feature Flag

`POSITRON_MCP_GATEWAY_ENABLED` (default: `false`)

When disabled:
- GatewayService is not instantiated
- No tool calls are possible
- Dashboard shows "Gateway disabled"

When enabled:
- Full gateway functionality as specified
