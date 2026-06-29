// MCP-Compatible Internal Tool Gateway — Public API
// Issue #219

// ─── Types ───────────────────────────────────────────────────────────
export type {
	RiskLevel,
	ApprovalMode,
	EgressPolicy,
	EvidenceConfig,
	ToolDefinition,
	ToolCall,
	ToolResult,
	ToolHandler,
	ScanResult,
	GatewayConfig,
	BlockReason,
} from './types.js';

export {
	DEFAULT_GATEWAY_CONFIG,
	BLOCK_REASONS,
} from './types.js';

// ─── Registry ────────────────────────────────────────────────────────
export {
	ToolRegistry,
	ToolAlreadyRegisteredError,
	RegistrySealedError,
	ToolNotFoundError,
} from './registry.js';

// ─── Scanner ─────────────────────────────────────────────────────────
export { scanToolDefinition } from './scanner.js';

// ─── Gateway ─────────────────────────────────────────────────────────
export { GatewayService } from './gateway.js';

// ─── Audit Sink ──────────────────────────────────────────────────────
export { createAuditSink, createBlockedAuditEntry, hashAuditEntry } from './audit-sink.js';
export type { AuditSinkOptions, AuditEntry } from './audit-sink.js';

// ─── MCP Adapter ─────────────────────────────────────────────────────
export {
	MCPAdapter,
	createMcpAdapter,
} from './mcp-adapter.js';

export type {
	MCPTool,
	MCPListToolsResult,
	MCPCallToolParams,
	MCPCallToolResult,
} from './mcp-adapter.js';

// ─── Built-in Tools ──────────────────────────────────────────────────
export {
	repoReadFileDef,
	repoListFilesDef,
	repoGetDiffDef,
	repoReadFileHandler,
	repoListFilesHandler,
	repoGetDiffHandler,
} from './tools/repo.js';

export {
	testsDetectDef,
	testsRunSelectedDef,
	testsDetectHandler,
	testsRunSelectedHandler,
} from './tools/tests.js';

export {
	evidenceAppendDef,
	evidenceAppendHandler,
} from './tools/evidence.js';

export type { EvidenceItem } from './tools/evidence.js';

export {
	githubReadIssueDef,
	githubCommentEvidenceDraftDef,
	githubReadIssueHandler,
	githubCommentEvidenceDraftHandler,
} from './tools/github.js';
