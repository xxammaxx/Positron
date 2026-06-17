// Positron — Agent Capability Registry Types
// Migration path per ADR-001: from ad-hoc adapter interfaces to capability-based declarations.

/**
 * Canonical agent capability IDs for the Positron capability registry.
 * Each capability represents a discrete, testable ability a coding agent can possess.
 */
export type AgentCapability =
	// ── Core Capabilities ──
	| 'repo_read'
	| 'code_write'
	| 'code_review'
	| 'test_run'
	| 'spec_generate'
	| 'plan_generate'
	| 'task_breakdown'
	// ── Integration Capabilities ──
	| 'github_issue_read'
	| 'github_pr_create'
	| 'github_review_comment'
	| 'github_label_manage'
	// ── Environment Capabilities ──
	| 'terminal_exec'
	| 'worktree_isolation'
	| 'devcontainer_support'
	| 'sandbox_preview'
	// ── Quality Capabilities ──
	| 'browser_preview'
	| 'security_scan_awareness'
	| 'lint_fix'
	| 'type_check'
	// ── AI-Specific Capabilities ──
	| 'mcp_tool_use'
	| 'context_manifest'
	| 'web_research'
	| 'diff_analysis'
	// ── Safety Capabilities ──
	| 'human_approval_required'
	| 'secret_detection'
	| 'command_allowlist'
	| 'file_scope_restriction';

/** All canonical capability IDs as a const array for runtime validation. */
export const ALL_CAPABILITIES: readonly AgentCapability[] = [
	// Core
	'repo_read',
	'code_write',
	'code_review',
	'test_run',
	'spec_generate',
	'plan_generate',
	'task_breakdown',
	// Integration
	'github_issue_read',
	'github_pr_create',
	'github_review_comment',
	'github_label_manage',
	// Environment
	'terminal_exec',
	'worktree_isolation',
	'devcontainer_support',
	'sandbox_preview',
	// Quality
	'browser_preview',
	'security_scan_awareness',
	'lint_fix',
	'type_check',
	// AI-Specific
	'mcp_tool_use',
	'context_manifest',
	'web_research',
	'diff_analysis',
	// Safety
	'human_approval_required',
	'secret_detection',
	'command_allowlist',
	'file_scope_restriction',
] as const;

/** Combined set of all canonical capabilities as plain strings for fast lookup. */
const ALL_CAPABILITY_STRINGS: readonly string[] = ALL_CAPABILITIES as unknown as string[];

/**
 * Checks whether an arbitrary string is a valid known capability ID.
 * Acts as a type guard — returns `true` for canonical capabilities only.
 */
export function isValidCapability(cap: string): cap is AgentCapability {
	return ALL_CAPABILITY_STRINGS.includes(cap);
}

/**
 * Declaration contract every agent/adapter MUST provide.
 * Describes identity, deployment mode, capabilities, permissions, risk, and behaviour.
 */
export interface AgentDeclaration {
	// ── Identity ──
	/** Unique agent name, e.g. "OpenCode", "Codex CLI", "Claude Code" */
	name: string;
	/** Interface type through which the agent is invoked */
	type: 'cli' | 'api' | 'ide' | 'service' | 'human';
	/** Agent/adapter version string */
	version: string;

	// ── Deployment ──
	/** Where the agent runs */
	deployment: 'local' | 'cloud' | 'hybrid';
	/** Runtime environment the agent requires */
	runtime: 'node' | 'python' | 'binary' | 'container';

	// ── Capabilities ──
	/** Canonical capability IDs this agent supports (at least one) */
	capabilities: string[];

	// ── Secrets & Auth ──
	/** Secret keys the agent needs at runtime (e.g. "GITHUB_TOKEN") */
	requiredSecrets: string[];
	/** Environment variable names the agent expects (e.g. "POSITRON_WORKSPACE_ROOT") */
	requiredEnvVars: string[];

	// ── Scope & Permissions ──
	/** Glob patterns for file paths the agent is allowed to touch */
	allowedPaths: string[];
	/** Glob patterns for file paths the agent must never touch */
	deniedPaths: string[];
	/** Actions the agent is permitted to perform (e.g. "git.commit") */
	allowedActions: string[];
	/** Actions the agent is forbidden from performing (e.g. "git.push:main") */
	deniedActions: string[];

	// ── Risk & Trust ──
	/** Subjective risk rating of this agent */
	riskLevel: 'low' | 'medium' | 'high' | 'critical';
	/** MCP-inspired trust tier: 0 = readonly, 1 = sandboxed, 2 = human-gate */
	trustTier: 0 | 1 | 2;

	// ── Evidence ──
	/** Evidence capture requirements for auditability */
	evidenceRequirements: {
		/** Capture CLI stdout/stderr as evidence */
		logOutput: boolean;
		/** Capture git diff after each action */
		captureDiff: boolean;
		/** Capture test results */
		captureTests: boolean;
		/** Require a screenshot for UI-affecting changes */
		requireScreenshot: boolean;
		/** Require a Playwright trace for browser actions */
		requireTrace: boolean;
	};

	// ── Behaviour ──
	/** Fallback agent name if this agent is unavailable */
	fallbackAgent?: string;
	/** Maximum number of concurrent agent instances */
	maxConcurrency: number;
	/** Maximum execution time per action in milliseconds */
	timeoutMs: number;
	/** Retry policy for transient failures */
	retryPolicy?: {
		/** Maximum number of retries */
		maxRetries: number;
		/** Base back-off delay in milliseconds */
		backoffMs: number;
	};

	// ── Mode Flags ──
	/** When true the agent operates in fake/dry-run mode */
	isFake?: boolean;
	/** When true the agent is a mock used for testing */
	isMock?: boolean;
	/** When true the agent is a demo/stub */
	isDemo?: boolean;
}

/**
 * Validates an AgentDeclaration and returns a list of error messages.
 * An empty array means the declaration is valid.
 *
 * Checks performed:
 * - name is a non-empty string
 * - capabilities is non-empty and every entry is a known capability ID
 * - riskLevel is one of the allowed values
 * - trustTier is 0, 1, or 2
 * - maxConcurrency > 0
 * - timeoutMs > 0
 * - type is one of the allowed values
 */
export function validateAgentDeclaration(decl: AgentDeclaration): string[] {
	const errors: string[] = [];

	if (typeof decl.name !== 'string' || decl.name.trim().length === 0) {
		errors.push('name must be a non-empty string');
	}

	if (!Array.isArray(decl.capabilities) || decl.capabilities.length === 0) {
		errors.push('capabilities must be a non-empty array');
	} else {
		for (const cap of decl.capabilities) {
			if (!isValidCapability(cap)) {
				errors.push(`unknown capability: "${cap}"`);
			}
		}
	}

	const validRiskLevels: readonly string[] = ['low', 'medium', 'high', 'critical'];
	if (!validRiskLevels.includes(decl.riskLevel)) {
		errors.push(`riskLevel must be one of: ${validRiskLevels.join(', ')}`);
	}

	const validTrustTiers: readonly number[] = [0, 1, 2];
	if (!validTrustTiers.includes(decl.trustTier)) {
		errors.push('trustTier must be 0, 1, or 2');
	}

	if (typeof decl.maxConcurrency !== 'number' || decl.maxConcurrency <= 0) {
		errors.push('maxConcurrency must be > 0');
	}

	if (typeof decl.timeoutMs !== 'number' || decl.timeoutMs <= 0) {
		errors.push('timeoutMs must be > 0');
	}

	const validTypes: readonly string[] = ['cli', 'api', 'ide', 'service', 'human'];
	if (!validTypes.includes(decl.type)) {
		errors.push(`type must be one of: ${validTypes.join(', ')}`);
	}

	return errors;
}

/**
 * Result of a health check for a coding agent.
 */
export interface AgentHealth {
	/** Whether the agent is available and ready */
	available: boolean;
	/** Installed agent version, if available */
	version?: string;
	/** Path to the agent command/binary, if applicable */
	commandPath?: string;
	/** Human-readable reason for the availability status */
	reason?: string;
}

/**
 * Input parameters for executing a coding agent phase.
 */
export interface CodingPhaseInput {
	/** Unique run identifier */
	runId: string;
	/** Absolute path to the workspace */
	workspacePath: string;
	/** Title of the GitHub issue being worked on */
	issueTitle: string;
	/** GitHub issue number (optional, e.g. during local development) */
	issueNumber?: number;
	/** GitHub issue body / description */
	issueBody?: string;
	/** Name of the pipeline phase to execute */
	phaseName?: string;
	/** Autonomy level (0 = observer, 4 = full auto) */
	autonomyLevel?: number;
}

/**
 * Result returned by a coding agent after executing a phase.
 */
export interface CodingAgentResult {
	/** Overall execution status */
	status: 'success' | 'failed' | 'blocked' | 'skipped';
	/** The command that was executed */
	command: string;
	/** Human-readable summary of what happened */
	summary: string;
	/** Execution duration in milliseconds */
	durationMs: number;
	/** Working directory of the executed command */
	cwd: string;
	/** Reason for blocking (required when status === 'blocked') */
	blockedReason?: string;
	/** Paths to evidence artefacts (logs, diffs, screenshots, traces) */
	evidencePaths?: string[];
}

/**
 * Abstract interface every coding agent adapter must implement.
 * Provides a uniform contract for health checks and phase execution
 * regardless of the underlying agent implementation.
 */
export interface CodingAgentAdapter {
	/** Static declaration of the agent's identity, capabilities, and permissions */
	readonly declaration: AgentDeclaration;

	/**
	 * Checks whether the agent is available and ready to accept work.
	 * @param workspacePath - Absolute path to the workspace to validate against
	 */
	healthCheck(workspacePath: string): Promise<AgentHealth>;

	/**
	 * Executes a pipeline phase on the agent.
	 * @param input - Phase execution parameters
	 */
	runPhase(input: CodingPhaseInput): Promise<CodingAgentResult>;
}

/**
 * In-memory registry that stores agent adapters and provides capability-based
 * lookup, phase-based filtering, and lifecycle management.
 *
 * Agents are registered at startup via `register()` and can be discovered
 * at runtime through `findAgentsForCapabilities()` or `findAgentsForPhase()`.
 */
export class AgentCapabilityRegistry {
	private readonly agents = new Map<string, CodingAgentAdapter>();

	/**
	 * Registers an agent adapter. If an agent with the same name already exists
	 * it will be silently replaced.
	 * @param agent - The adapter instance to register
	 */
	register(agent: CodingAgentAdapter): void {
		this.agents.set(agent.declaration.name, agent);
	}

	/**
	 * Removes an agent from the registry by name.
	 * @param agentName - Name of the agent to unregister
	 */
	unregister(agentName: string): void {
		this.agents.delete(agentName);
	}

	/**
	 * Retrieves a registered agent by name.
	 * @param name - Agent name to look up
	 * @returns The adapter instance, or `undefined` if not found
	 */
	getAgent(name: string): CodingAgentAdapter | undefined {
		return this.agents.get(name);
	}

	/**
	 * Returns the declarations of all currently registered agents.
	 */
	listAgents(): AgentDeclaration[] {
		return Array.from(this.agents.values()).map((a) => a.declaration);
	}

	/**
	 * Finds all registered agents that support ALL the given capabilities.
	 * An agent must have every capability in `required` to be returned.
	 * @param required - Array of capability IDs the agent must support
	 */
	findAgentsForCapabilities(required: string[]): CodingAgentAdapter[] {
		return Array.from(this.agents.values()).filter((agent) =>
			required.every((cap) => agent.declaration.capabilities.includes(cap)),
		);
	}

	/**
	 * Finds all registered agents capable of executing the given pipeline phase.
	 *
	 * Phase-to-capability mapping (canonical):
	 * - QUEUED / CLAIMED / DONE / FAILED / CLEANUP → no capability needed (orchestration only)
	 * - REPO_SYNC / ISSUE_CONTEXT → `repo_read`
	 * - WEB_RESEARCH → `web_research`
	 * - SPECIFY → `spec_generate`
	 * - PLAN → `plan_generate`
	 * - TASKS → `task_breakdown`
	 * - ANALYZE → `repo_read`
	 * - REVIEW → `code_review`
	 * - IMPLEMENT → `code_write`
	 * - TEST / VERIFY → `test_run`
	 * - COMMIT / PR_CREATE / MERGE → `code_write`
	 * - GATE_APPROVE / GATE_REVISE → `human_approval_required`
	 * - RESUME_PENDING → `repo_read`
	 *
	 * @param phase - Pipeline phase name
	 */
	findAgentsForPhase(phase: string): CodingAgentAdapter[] {
		const phaseToCap = this.getPhaseCapability(phase);
		if (!phaseToCap) {
			// Orchestration-only or unknown phase: return all agents
			return Array.from(this.agents.values());
		}
		return this.findAgentsForCapabilities([phaseToCap]);
	}

	/**
	 * Maps a phase string to its canonical required capability.
	 * Returns `undefined` for orchestration-only phases.
	 */
	private getPhaseCapability(phase: string): string | undefined {
		const map: Record<string, string> = {
			REPO_SYNC: 'repo_read',
			ISSUE_CONTEXT: 'repo_read',
			WEB_RESEARCH: 'web_research',
			SPECIFY: 'spec_generate',
			PLAN: 'plan_generate',
			TASKS: 'task_breakdown',
			ANALYZE: 'repo_read',
			REVIEW: 'code_review',
			IMPLEMENT: 'code_write',
			TEST: 'test_run',
			VERIFY: 'test_run',
			COMMIT: 'code_write',
			PR_CREATE: 'code_write',
			MERGE: 'code_write',
			GATE_APPROVE: 'human_approval_required',
			GATE_REVISE: 'human_approval_required',
			RESUME_PENDING: 'repo_read',
		};
		return map[phase];
	}
}
