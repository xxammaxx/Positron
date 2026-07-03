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

// Managed External Project (e.g. VoiceWiki tracked by Positron)
export interface ManagedProject {
	id: string;
	name: string;
	description: string;
	repoUrl: string;
	defaultBranch: string;
	status: 'FIRST_EXTERNAL_TEST_SUCCESS' | 'EXTERNAL_TEST_PENDING' | 'BUILD_IN_PROGRESS' | 'BLOCKED';
	externalTestStatus: string;
	lastMergedPr: {
		number: number;
		title: string;
		mergeSha: string;
		mergedAt: string;
		url: string;
	};
	knownBlockers: Array<{
		id: string;
		description: string;
		severity: 'blocker' | 'warning';
	}>;
	timeline: Array<{
		step: string;
		status: 'completed' | 'next' | 'planned';
		description: string;
	}>;
	nextRecommendedRun: {
		label: string;
		description: string;
		approvalLabel: string;
	};
	nextAppLevelRun: {
		label: string;
		description: string;
		approvalLabel: string;
	};
	safetyStatus: {
		appCodeChanged: boolean;
		sttEnabled: boolean;
		modelAudioFilesAdded: boolean;
		cloudTelemetryEnabled: boolean;
		realMode: boolean;
		phaseDProbe: boolean;
	};
	evidenceReportUrl: string | null;
	createdAt: string;
	updatedAt: string;
}
