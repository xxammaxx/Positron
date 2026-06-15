// MCP Protocol Adapter — Experimental, Feature-Flagged
// Issue #219
// Maps internal Tool Gateway types to MCP protocol types.
// NOT enabled by default. Requires POSITRON_MCP_EXPOSE_ENABLED=true.

import type { ToolDefinition, ToolCall, ToolResult } from './types.js';
import type { Phase } from '@positron/shared';
import type { ToolRegistry } from './registry.js';
import type { GatewayService } from './gateway.js';

// ─── Runtime Validation ──────────────────────────────────────────────

/**
 * Canonical phase values for runtime validation.
 * Mapped from @positron/shared Phase type.
 */
const VALID_PHASES = new Set([
	'QUEUED',
	'SPECIFY',
	'PLAN',
	'IMPLEMENT',
	'TEST',
	'REVIEW',
	'COMMIT',
	'GATE_APPROVE',
	'CLEANUP',
	'DONE',
	'FAILED',
	'FAILED_TRANSIENT',
	'FAILED_BLOCKED',
	'FAILED_UNSAFE',
	'BLOCKED_PUSH',
	'BLOCKED_MERGE',
	'CANCELLED',
	'RESUME_PENDING',
]);

function validatePhase(phase: string): Phase {
	if (!VALID_PHASES.has(phase)) {
		throw new Error(`Invalid phase: "${phase}". Must be one of: ${[...VALID_PHASES].join(', ')}`);
	}
	return phase as Phase;
}

function validateAutonomyLevel(level: number): 0 | 1 | 2 | 3 | 4 {
	if (!Number.isInteger(level) || level < 0 || level > 4) {
		throw new Error(`Invalid autonomy level: ${level}. Must be an integer between 0 and 4.`);
	}
	return level as 0 | 1 | 2 | 3 | 4;
}

// ─── MCP Protocol Types (subset) ─────────────────────────────────────

/**
 * MCP Tool representation (subset of MCP specification).
 */
export interface MCPTool {
	name: string;
	description: string;
	inputSchema: {
		type: 'object';
		properties: Record<string, unknown>;
		required?: string[];
	};
}

/**
 * MCP ListTools result.
 */
export interface MCPListToolsResult {
	tools: MCPTool[];
}

/**
 * MCP CallTool request params.
 */
export interface MCPCallToolParams {
	name: string;
	arguments?: Record<string, unknown>;
}

/**
 * MCP CallTool result.
 */
export interface MCPCallToolResult {
	content: Array<{
		type: 'text' | 'image' | 'resource';
		text?: string;
		data?: string;
		mimeType?: string;
	}>;
	isError?: boolean;
}

// ─── Feature Flag ────────────────────────────────────────────────────

function isMcpExposeEnabled(): boolean {
	return (
		process.env.POSITRON_MCP_EXPOSE_ENABLED === 'true' ||
		process.env.POSITRON_MCP_EXPOSE_ENABLED === '1'
	);
}

// ─── Adapter ─────────────────────────────────────────────────────────

/**
 * MCPAdapter maps internal tool gateway types to MCP protocol types.
 * This is an experimental module behind the POSITRON_MCP_EXPOSE_ENABLED flag.
 */
export class MCPAdapter {
	private registry: ToolRegistry;
	private gateway: GatewayService;
	private enabled: boolean;

	constructor(registry: ToolRegistry, gateway: GatewayService) {
		this.registry = registry;
		this.gateway = gateway;
		this.enabled = isMcpExposeEnabled();
	}

	/**
	 * Whether the MCP adapter is enabled.
	 * When disabled, all methods return errors.
	 */
	isEnabled(): boolean {
		return this.enabled;
	}

	/**
	 * Convert an internal ToolDefinition to an MCP Tool.
	 */
	toMcpTool(def: ToolDefinition): MCPTool {
		return {
			name: def.id,
			description: def.description,
			inputSchema: {
				type: 'object',
				properties: (def.inputSchema.properties as Record<string, unknown>) || {},
				required: (def.inputSchema.required as string[]) || [],
			},
		};
	}

	/**
	 * List all available tools (MCP format).
	 */
	async listTools(): Promise<MCPListToolsResult> {
		if (!this.enabled) {
			throw new Error('MCP adapter is disabled. Set POSITRON_MCP_EXPOSE_ENABLED=true to enable.');
		}

		const tools = this.registry.list().map((def) => this.toMcpTool(def));

		return { tools };
	}

	/**
	 * Call a tool by name (MCP format).
	 */
	async callTool(
		params: MCPCallToolParams,
		runContext: {
			runId: string;
			phase: string;
			autonomyLevel: number;
			workspaceRoot: string;
		},
	): Promise<MCPCallToolResult> {
		if (!this.enabled) {
			return {
				content: [
					{
						type: 'text',
						text: 'MCP adapter is disabled. Set POSITRON_MCP_EXPOSE_ENABLED=true to enable.',
					},
				],
				isError: true,
			};
		}

		// Map MCP call to internal ToolCall — validate all runtime values
		const toolCall: ToolCall = {
			toolId: params.name,
			arguments: params.arguments || {},
			runId: runContext.runId,
			phase: validatePhase(runContext.phase),
			autonomyLevel: validateAutonomyLevel(runContext.autonomyLevel),
			workspaceRoot: runContext.workspaceRoot,
		};

		// Execute through gateway
		const result: ToolResult = await this.gateway.execute(toolCall);

		// Map result back to MCP format
		return {
			content: [
				{
					type: 'text',
					text: JSON.stringify(result.output, null, 2),
				},
			],
			isError: !result.success,
		};
	}

	/**
	 * Get the raw ToolDefinition for a tool (internal API, not MCP).
	 */
	getToolDefinition(toolId: string): ToolDefinition | null {
		const entry = this.registry.get(toolId);
		return entry ? entry.definition : null;
	}
}

/**
 * Create an MCPAdapter instance (or a no-op placeholder if disabled).
 */
export function createMcpAdapter(registry: ToolRegistry, gateway: GatewayService): MCPAdapter {
	return new MCPAdapter(registry, gateway);
}
