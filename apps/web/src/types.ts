// Positron Web — Frontend Typdefinitionen
// Hinweis: Phase und RunStatus sind kompatibel mit dem Backend (@positron/shared)

export type Phase =
	| 'QUEUED'
	| 'CLAIMED'
	| 'REPO_SYNC'
	| 'ISSUE_CONTEXT'
	| 'WEB_RESEARCH'
	| 'SPECIFY'
	| 'CLARIFY_OPTIONAL'
	| 'PLAN'
	| 'TASKS'
	| 'ANALYZE'
	| 'REVIEW'
	| 'IMPLEMENT'
	| 'TEST'
	| 'VERIFY'
	| 'COMMIT'
	| 'PR_CREATE'
	| 'MERGE'
	| 'DONE'
	| 'FAILED'
	| 'FAILED_TRANSIENT'
	| 'FAILED_BLOCKED'
	| 'FAILED_UNSAFE'
	| 'BLOCKED_PUSH'
	| 'BLOCKED_MERGE'
	| 'GATE_APPROVE'
	| 'GATE_REVISE'
	| 'RESUME_PENDING'
	| 'CLEANUP';

// Issue #23: Kanonische ALL_PHASES und PHASE_LABELS sind in @positron/shared.
// Re-export für Abwärtskompatibilität der Importe aus '../types.js'.
export { ALL_PHASES, PHASE_LABELS } from '@positron/shared';

export type RunStatus = 'active' | 'blocked' | 'done' | 'failed' | 'cancelled';

export const STATUS_LABEL: Record<RunStatus, string> = {
	active: 'Läuft',
	blocked: 'Blockiert',
	done: 'Abgeschlossen',
	failed: 'Fehlgeschlagen',
	cancelled: 'Abgebrochen',
};

export type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';

export interface Repository {
	id: string;
	owner: string;
	name: string;
	url: string;
	localPath: string | null;
	enabled: boolean;
	createdAt: string;
}

export interface Issue {
	id: string;
	repoId: string;
	number: number;
	title: string;
	state: 'open' | 'closed';
	labels: string[];
	lastSeenAt: string;
}

export interface Run {
	id: string;
	repoId: string;
	issueNumber: number;
	branch: string | null;
	phase: Phase;
	status: RunStatus;
	autonomyLevel: number;
	attempt: number;
	lastError: string | null;
	workspacePath: string | null;
	startedAt: string;
	finishedAt: string | null;
}

export interface RunEvent {
	id: string;
	runId: string;
	phase: Phase;
	level: LogLevel;
	message: string;
	payload: Record<string, unknown>;
	createdAt: string;
	/** Server-assigned sequence number for ordering/reconnection (Issue #66) */
	_sequence?: number;
}

export interface Artifact {
	content: string;
	kind: string;
	createdAt: string;
}

export interface Metrics {
	totalRuns: number;
	runsByPhase: Partial<Record<Phase, number>>;
	runsByStatus: Partial<Record<RunStatus, number>>;
	avgDurationMs: number;
	successRate: number;
}

export interface HealthStatus {
	status: 'ok' | 'degraded' | 'error';
	adapters: Record<string, boolean>;
	uptime: number;
	mode?: 'fake' | 'real';
	runs?: number;
}

export interface ApiError {
	error: string;
	code?: string;
	details?: unknown;
}

// ── Tool Gateway Monitoring (Issue #224) ──────────────────────────

export interface ToolGatewayStatus {
	gatewayEnabled: boolean;
	mcpExposeEnabled: boolean;
	registeredTools: number;
	sealed: boolean;
	runtimeActive: boolean;
	enforcePathBoundaries: boolean;
	enforceEgress: boolean;
	redactSecrets: boolean;
	/** MCP server status summaries (Issue #229) — read-only, empty by default */
	mcpServers?: Array<{
		name: string;
		category: string;
		required: boolean;
		warmupStatus: string;
		toolsCount: number;
		connected: boolean;
		lastWarmupAt: string | null;
	}>;
	/** Provider status summary (Issue #229) — read-only, defaults show not installed */
	providerStatus?: {
		opencodeInstalled: boolean;
		opencodeVersion: string | null;
		activeModelProfileId: string | null;
		activeModelRef: string | null;
		modelWarmupStatus: string;
		specKitSynced: boolean;
		readyForRealRuns: boolean;
	};
}

export interface ToolGatewayTool {
	id: string;
	category: string;
	title: string;
	description: string;
	riskLevel: string;
	requiredAutonomyLevel: number;
	approvalMode: string;
	allowedPhases: string[];
	egressPolicy: {
		allowedHosts: string[];
		allowedPorts: number[];
	};
	evidenceRequirements: {
		logArguments: boolean;
		logOutput: boolean;
		requireArtifact: boolean;
	};
	inputSchema: Record<string, unknown>;
	outputSchema: Record<string, unknown>;
	/** MCP server name if tool originates from an MCP server (Issue #229) */
	mcpServerName?: string;
	/** Warm-up status for this tool (Issue #229) */
	warmupStatus?: string;
	/** Provider status for this tool (Issue #229) */
	providerStatus?: string;
	/** Whether this tool requires MCP warm-up before use (Issue #229) */
	requiresMcpWarmup?: boolean;
	/** Whether this tool requires model warm-up before use (Issue #229) */
	requiresModelWarmup?: boolean;
	/** Whether this tool requires Spec Kit sync before use (Issue #229) */
	requiresSpecKitSync?: boolean;
}

// ── Human Oversight Types (Issue #229 PR 7) ──────────────────────────

export interface HumanQuestion {
	id: string;
	runId?: string;
	issueNumber?: number;
	type: string;
	status: string;
	title: string;
	question: string;
	riskLevel: string;
	requestedBy: string;
	relatedMcpServerId?: string;
	relatedToolName?: string;
	proposedAction?: string;
	target?: string;
	evidenceRefs: string[];
	allowedDecisions: string[];
	defaultDecision: string;
	createdAt: string;
	expiresAt?: string;
	answeredAt?: string;
	answerText?: string;
	decision?: string;
	blockedReasons: string[];
}
