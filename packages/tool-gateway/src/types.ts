// MCP-Compatible Internal Tool Gateway — Core Types
// Issue #219

import type { Phase, AutonomyLevel } from '@positron/shared';

/**
 * Risk level for a tool. Determines what security gates apply.
 *
 * - `read`: Read-only operations (filesystem read, git diff, issue read)
 * - `write`: Write operations (file creation, evidence append, comments)
 * - `network`: Operations that initiate network connections
 * - `secret_sensitive`: Operations that touch secrets or tokens
 * - `destructive`: Operations that delete, merge, or irreversibly modify
 */
export type RiskLevel = 'read' | 'write' | 'network' | 'secret_sensitive' | 'destructive';

/**
 * Controls whether human approval is required before tool execution.
 *
 * - `none`: No approval needed (read-only tools)
 * - `ask`: Prompt for approval, but agent may auto-approve at high autonomy
 * - `human_required`: Explicit human intervention required, regardless of autonomy
 */
export type ApprovalMode = 'none' | 'ask' | 'human_required';

/**
 * Egress policy controls which network targets a tool may access.
 * An empty `allowedHosts` array means no network access is permitted.
 */
export interface EgressPolicy {
	/** Allowed hostnames or IPs. Empty = no network allowed. */
	allowedHosts: string[];
	/** Allowed ports. Empty = no ports allowed. */
	allowedPorts: number[];
}

/**
 * Evidence requirements for a tool call.
 */
export interface EvidenceConfig {
	/** Whether to log (redacted) arguments in evidence */
	logArguments: boolean;
	/** Whether to log (redacted) output in evidence */
	logOutput: boolean;
	/** Whether the tool produces an artifact file */
	requireArtifact: boolean;
}

/**
 * Complete definition of a registered tool.
 */
export interface ToolDefinition {
	/** Stable ASCII slug, e.g. "repo.read_file" */
	id: string;
	/** Human-readable display title */
	title: string;
	/** Purpose and behavior description. Scanned for prompt injection. */
	description: string;
	/** JSON Schema for input validation */
	inputSchema: Record<string, unknown>;
	/** JSON Schema for output validation */
	outputSchema: Record<string, unknown>;
	/** Risk level determines security gate behavior */
	riskLevel: RiskLevel;
	/** Minimum autonomy level (0-4) required to use this tool */
	requiredAutonomyLevel: AutonomyLevel;
	/** Approval mode determines human gate behavior */
	approvalMode: ApprovalMode;
	/** Which pipeline phases may use this tool */
	allowedPhases: Phase[];
	/** Allowed workspace root paths. Empty = run workspace only. */
	allowedWorkspaceRoots: string[];
	/** Network egress policy */
	egressPolicy: EgressPolicy;
	/** Evidence configuration */
	evidenceRequirements: EvidenceConfig;
}

/**
 * A request to execute a tool.
 */
export interface ToolCall {
	/** The tool ID to execute */
	toolId: string;
	/** Arguments for the tool, validated against inputSchema */
	arguments: Record<string, unknown>;
	/** Run ID for context */
	runId: string;
	/** Current pipeline phase */
	phase: Phase;
	/** Current autonomy level of the run */
	autonomyLevel: AutonomyLevel;
	/** Workspace root directory */
	workspaceRoot: string;
}

/**
 * Result of a tool execution, whether successful or blocked.
 */
export interface ToolResult {
	/** Whether the tool executed successfully */
	success: boolean;
	/** Tool output (type depends on tool) */
	output: unknown;
	/** Error message if execution failed */
	error?: string;
	/** Evidence event ID if one was generated */
	evidenceEventId?: string;
	/** Reason why the call was blocked (if applicable) */
	blockedReason?: string;
}

/**
 * The function signature for a tool handler.
 * Receives the ToolCall and returns a ToolResult.
 */
export type ToolHandler = (call: ToolCall) => Promise<ToolResult>;

/**
 * Result of a tool metadata scan.
 */
export interface ScanResult {
	/** Whether the scan passed (tool can be registered) */
	passed: boolean;
	/** Warning messages (non-blocking concerns) */
	warnings: string[];
	/** Whether the tool registration should be blocked */
	blocked: boolean;
	/** Blocking reasons (if blocked) */
	reasons: string[];
}

/**
 * Configuration for the Tool Gateway.
 */
export interface GatewayConfig {
	/** Whether the gateway is enabled */
	enabled: boolean;
	/** Whether to enforce strict path boundaries */
	enforcePathBoundaries: boolean;
	/** Whether to enforce egress policies */
	enforceEgress: boolean;
	/** Whether to redact secrets in logs */
	redactSecrets: boolean;
	/** Maximum depth for path resolution (symlink loops) */
	maxPathDepth: number;
}

/**
 * Default gateway configuration.
 */
export const DEFAULT_GATEWAY_CONFIG: GatewayConfig = {
	enabled: false,
	enforcePathBoundaries: true,
	enforceEgress: true,
	redactSecrets: true,
	maxPathDepth: 10,
};

/**
 * Block reason constants for consistent blockedReason values.
 */
export const BLOCK_REASONS = {
	TOOL_NOT_FOUND: 'TOOL_NOT_FOUND',
	SCHEMA_VALIDATION_FAILED: 'SCHEMA_VALIDATION_FAILED',
	PHASE_NOT_ALLOWED: 'PHASE_NOT_ALLOWED',
	AUTONOMY_TOO_LOW: 'AUTONOMY_TOO_LOW',
	APPROVAL_REQUIRED: 'APPROVAL_REQUIRED',
	PATH_TRAVERSAL: 'PATH_TRAVERSAL',
	EGRESS_BLOCKED: 'EGRESS_BLOCKED',
	GATEWAY_DISABLED: 'GATEWAY_DISABLED',
	TOOL_EXECUTION_ERROR: 'TOOL_EXECUTION_ERROR',
	SCANNER_BLOCKED: 'SCANNER_BLOCKED',
	UNKNOWN: 'UNKNOWN',
} as const;

export type BlockReason = (typeof BLOCK_REASONS)[keyof typeof BLOCK_REASONS];
