// Positron Web — API Client

import type {
	Repository,
	Issue,
	Run,
	RunEvent,
	Artifact,
	Metrics,
	HealthStatus,
	ApiError,
	ToolGatewayStatus,
	ToolGatewayTool,
	HumanQuestion,
	BlueprintValidationResponse,
	BlueprintImportResponse,
	BlueprintRunPlanResponse,
} from './types.jsx';
import type { Phase, RunStatus } from './types.jsx';
import { parsePhase } from '@positron/shared';

const BASE = '/api';

// ── Admin API Types & Token Management (Issue #11) ────────────

export interface AdminStats {
	runs: { total: number; active: number; failed: number; done: number };
	repositories: number;
	events: number;
	artifacts: number;
	dbSizeMb: number;
}

/** Read the stored admin token from localStorage */
export function getAdminToken(): string {
	try {
		return localStorage.getItem('positron_admin_token') ?? '';
	} catch {
		return '';
	}
}

/** Persist the admin token to localStorage */
export function setAdminToken(token: string): void {
	try {
		localStorage.setItem('positron_admin_token', token);
	} catch {
		/* ignore */
	}
}

async function adminRequest<T>(path: string, options?: RequestInit): Promise<T> {
	const token = getAdminToken();
	const headers: Record<string, string> = {
		'Content-Type': 'application/json',
		'X-Admin-Token': token,
		...((options?.headers as Record<string, string> | undefined) ?? {}),
	};
	const res = await fetch(`${BASE}${path}`, {
		...options,
		headers,
	});
	if (!res.ok) {
		const err = (await res.json().catch(() => ({
			error: res.statusText,
		}))) as ApiError;
		// Include HTTP status code in the error for client-side handling
		throw Object.assign(new Error(err.error ?? res.statusText), {
			status: res.status,
		});
	}
	return res.json() as Promise<T>;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
	const res = await fetch(`${BASE}${path}`, {
		headers: {
			'Content-Type': 'application/json',
			...options?.headers,
		},
		...options,
	});
	if (!res.ok) {
		const err = (await res.json().catch(() => ({
			error: res.statusText,
		}))) as ApiError;
		throw new Error(err.error ?? res.statusText);
	}
	return res.json() as Promise<T>;
}

export const api = {
	// Health
	getHealth(): Promise<HealthStatus> {
		return request<HealthStatus>('/health');
	},

	// Repositories
	getRepos(): Promise<{ repos: Repository[]; total: number }> {
		return request<{ repos: Repository[]; total: number }>('/repos');
	},

	createRepo(owner: string, name: string): Promise<Repository> {
		return request<Repository>('/repos', {
			method: 'POST',
			body: JSON.stringify({ owner, name }),
		});
	},

	getRepoIssues(repoId: string): Promise<{ issues: Issue[] }> {
		return request<{ issues: Issue[] }>(`/repos/${repoId}/issues`);
	},

	// Runs
	getRuns(params?: {
		page?: number;
		limit?: number;
		repoId?: string;
	}): Promise<{ runs: Run[]; total: number }> {
		const searchParams = new URLSearchParams();
		if (params?.page) searchParams.set('page', String(params.page));
		if (params?.limit) searchParams.set('limit', String(params.limit));
		if (params?.repoId) searchParams.set('repoId', params.repoId);
		const qs = searchParams.toString();
		return request<{ runs: Run[]; total: number }>(`/runs${qs ? `?${qs}` : ''}`);
	},

	getRunById(id: string): Promise<{ run: Run; events: RunEvent[] }> {
		return request<{ run: Run; events: RunEvent[] }>(`/runs/${id}`);
	},

	createRun(issueUrl: string): Promise<{ run: Run; runId: string }> {
		return request<{ run: Run; runId: string }>('/runs', {
			method: 'POST',
			body: JSON.stringify({ issueUrl }),
		});
	},

	startRun(
		repoId: string,
		issueNumber: number,
		autonomyLevel?: number,
	): Promise<{ run: Run; events: RunEvent[]; eventCount: number }> {
		return request<{ run: Run; events: RunEvent[]; eventCount: number }>(`/repos/${repoId}/runs`, {
			method: 'POST',
			body: JSON.stringify({ issueNumber, autonomyLevel }),
		});
	},

	controlRun(
		runId: string,
		action: 'pause' | 'resume' | 'abort' | 'retry',
	): Promise<{ success: boolean }> {
		return request<{ success: boolean }>(`/runs/${runId}/control`, {
			method: 'POST',
			body: JSON.stringify({ action }),
		});
	},

	// Gates
	approveGate(runId: string, reason?: string): Promise<{ success: boolean }> {
		return request<{ success: boolean }>(`/runs/${runId}/gate`, {
			method: 'POST',
			body: JSON.stringify({ action: 'approve', reason }),
		});
	},

	reviseGate(runId: string, reason: string): Promise<{ success: boolean }> {
		return request<{ success: boolean }>(`/runs/${runId}/gate`, {
			method: 'POST',
			body: JSON.stringify({ action: 'revise', reason }),
		});
	},

	// Artifacts
	getArtifact(runId: string, kind: 'spec' | 'plan' | 'tasks' | 'diff'): Promise<Artifact> {
		return request<Artifact>(`/runs/${runId}/artifacts/${kind}`);
	},

	// Metrics
	async getMetrics(): Promise<Metrics> {
		// The backend returns a nested structure: { metrics: { runs: { total, active, done, failed, blocked }, ... } }
		// The frontend expects a flat structure: { totalRuns, runsByPhase, runsByStatus, avgDurationMs, successRate }
		const data = await request<{
			metrics: {
				runs: { total: number; active: number; done: number; failed: number; blocked: number };
				repositories: { total: number };
				phaseDistribution: Array<{ phase: string; count: number }>;
				avgRunDurationMs: number | null;
				timestamp: string;
			};
		}>('/metrics');

		const m = data.metrics;
		const totalRuns = m.runs.total;
		const doneRuns = m.runs.done;
		const successRate = totalRuns > 0 ? Math.round((doneRuns / totalRuns) * 100) : 0;

		// Build runsByPhase from phaseDistribution
		const runsByPhase: Partial<Record<Phase, number>> = {};
		if (Array.isArray(m.phaseDistribution)) {
			for (const entry of m.phaseDistribution) {
				try {
					runsByPhase[parsePhase(entry.phase)] = entry.count;
				} catch {
					/* ungültige Phase ignorieren */
				}
			}
		}

		// Build runsByStatus from runs breakdown
		const runsByStatus: Partial<Record<RunStatus, number>> = {
			active: m.runs.active,
			done: m.runs.done,
			failed: m.runs.failed,
			blocked: m.runs.blocked,
		};

		return {
			totalRuns,
			runsByPhase,
			runsByStatus,
			avgDurationMs: m.avgRunDurationMs ?? 0,
			successRate,
		};
	},

	// Evidence (aggregated)
	getEvidence(runId?: string): Promise<{
		evidence?: Array<{
			id: string;
			type: string;
			kind: string;
			source: string;
			sourceId: string;
			status: 'pass' | 'fail' | 'partial';
			summary: string;
			timestamp: string;
			runPhase?: string;
		}>;
		total?: number;
		summary?: {
			totalArtifacts: number;
			artifactBreakdown: Record<string, number>;
			testEvents: number;
			errorEvents: number;
			warningEvents: number;
		};
		runId?: string;
	}> {
		const qs = runId ? `?runId=${encodeURIComponent(runId)}` : '';
		return request(`/evidence${qs}`);
	},

	// Evidence Write-Back (Issue #85)
	saveEvidence(
		runId: string,
		kind: string,
		content: string,
	): Promise<{ success: boolean; kind: string; createdAt: string }> {
		return request('/evidence', {
			method: 'POST',
			body: JSON.stringify({ runId, kind, content }),
		});
	},

	// Settings — MCP Configuration (masked)
	getMcpSettings(): Promise<{
		servers: Array<{
			name: string;
			command: string;
			description: string;
			disabled: boolean;
			envKeys: string[];
			hasToken: boolean;
		}>;
		policy: Record<string, unknown>;
		redactPatternCount: number;
		configured: number;
		totalServers: number;
	}> {
		return request('/settings/mcp');
	},

	// Settings — Test Modes
	getTestModes(): Promise<{
		modes: Array<{
			id: string;
			label: string;
			command: string;
			visible: boolean;
			description: string;
		}>;
		securityNotes: Record<string, string>;
		defaultMode: string;
		observationMode: string;
		totalModes: number;
	}> {
		return request('/settings/test-modes');
	},

	// Safety state
	getSafety(): Promise<{
		enableMerge: boolean;
		mergeDryRun: boolean;
		enablePush: boolean;
		killSwitch: boolean;
		enableFixLoop: boolean;
	}> {
		return request('/safety');
	},

	// Update a single safety flag (Issue #25)
	updateSafety(
		key: string,
		value: boolean,
	): Promise<{
		ok: boolean;
		key: string;
		value: boolean;
		all: Record<string, boolean>;
	}> {
		return request('/safety', {
			method: 'POST',
			body: JSON.stringify({ key, value }),
		});
	},

	// Cancel run (Issue #66)
	cancelRun(runId: string): Promise<{
		ok: boolean;
		runId: string;
		message: string;
		previousStatus?: string;
		status: string;
	}> {
		return request(`/runs/${runId}/cancel`, { method: 'POST' });
	},

	// Test Report (Issue #68)
	getTestReport(runId: string): Promise<{
		runId: string;
		summary: { total: number; passed: number; failed: number; errors: number; warnings: number };
		testEvents: Array<{
			id: string;
			runId: string;
			level: string;
			message: string;
			payload: Record<string, unknown> | null;
			createdAt: string;
		}>;
	}> {
		return request(`/runs/${runId}/test-report`);
	},

	// Demo Run (Issue #68)
	startDemoRun(
		blueprint?: string,
		issueNumber?: number,
	): Promise<{
		run: Run;
		message: string;
		blueprint: string;
	}> {
		return request('/demo-runs', {
			method: 'POST',
			body: JSON.stringify({ blueprint, issueNumber }),
		});
	},

	// Blueprint from GitHub issue (Issue #14 + #15)
	getBlueprint(
		owner: string,
		repo: string,
		issueNumber: number,
	): Promise<{
		blueprint: string;
		repoId: string;
		issueNumber: number;
		generatedAt: string;
	}> {
		return request(
			`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/issues/${issueNumber}/blueprint`,
		);
	},

	// ── Admin API (Issue #11) ──────────────────────────────────────

	/** Admin dashboard statistics */
	getAdminStats(): Promise<AdminStats> {
		return adminRequest<AdminStats>('/admin/stats');
	},

	/** Bulk-cancel all active/blocked runs */
	bulkCancelRuns(): Promise<{ cancelled: number }> {
		return adminRequest<{ cancelled: number }>('/admin/runs/bulk-cancel', { method: 'POST' });
	},

	/** Bulk-retry all failed/blocked runs */
	bulkRetryRuns(): Promise<{ retried: number }> {
		return adminRequest<{ retried: number }>('/admin/runs/bulk-retry', { method: 'POST' });
	},

	/** Cleanup old events (7d) and VACUUM database */
	cleanupRuns(): Promise<{ eventsDeleted: number; dbSizeMb: number }> {
		return adminRequest<{ eventsDeleted: number; dbSizeMb: number }>('/admin/runs/cleanup', {
			method: 'POST',
		});
	},

	// ── Tool Gateway Monitoring (Issue #224) ─────────────────────────

	/** Get tool gateway status (enabled/disabled, feature flags) */
	getToolGatewayStatus(): Promise<ToolGatewayStatus> {
		return request<ToolGatewayStatus>('/tool-gateway/status');
	},

	/** Get registered tool metadata (read-only, no handlers) */
	getToolGatewayTools(): Promise<{ tools: ToolGatewayTool[]; total: number }> {
		return request<{ tools: ToolGatewayTool[]; total: number }>('/tool-gateway/tools');
	},

	// ── Oversight / Human Question Queue (Issue #229 PR 7) ──────────

	/** List human oversight questions (optional filter by status or runId) */
	getOversightQuestions(params?: {
		status?: string;
		runId?: string;
	}): Promise<{ questions: HumanQuestion[]; total: number }> {
		const query = new URLSearchParams();
		if (params?.status) query.set('status', params.status);
		if (params?.runId) query.set('runId', params.runId);
		const qs = query.toString();
		return request<{ questions: HumanQuestion[]; total: number }>(
			`/oversight/questions${qs ? `?${qs}` : ''}`,
		);
	},

	/** Get a single oversight question by ID */
	getOversightQuestion(id: string): Promise<HumanQuestion> {
		return request<HumanQuestion>(`/oversight/questions/${id}`);
	},

	/** Answer a human question with a decision */
	answerOversightQuestion(
		id: string,
		body: {
			decision: string;
			answerText?: string;
			requireDryRun?: boolean;
			requireBackup?: boolean;
			requireReview?: boolean;
		},
	): Promise<HumanQuestion> {
		return request<HumanQuestion>(`/oversight/questions/${id}/answer`, {
			method: 'POST',
			body: JSON.stringify(body),
		});
	},

	/** Pause a run via oversight (stores decision only) */
	pauseOversightRun(id: string): Promise<{ ok: boolean; questionId: string; decision: string }> {
		return request<{ ok: boolean; questionId: string; decision: string }>(
			`/oversight/questions/${id}/pause-run`,
			{ method: 'POST' },
		);
	},

	/** Abort a run via oversight (stores decision only) */
	abortOversightRun(id: string): Promise<{ ok: boolean; questionId: string; decision: string }> {
		return request<{ ok: boolean; questionId: string; decision: string }>(
			`/oversight/questions/${id}/abort-run`,
			{ method: 'POST' },
		);
	},

	/** Get oversight attention summary */
	getOversightAttention(): Promise<{
		openQuestions: number;
		criticalQuestions: number;
		highRiskQuestions: number;
		runsWaitingForHuman: number;
	}> {
		return request<{
			openQuestions: number;
			criticalQuestions: number;
			highRiskQuestions: number;
			runsWaitingForHuman: number;
		}>('/oversight/attention');
	},

	// ── Blueprint Launcher (Issue #229 PR 9) ───────────────────────

	/** Validate a blueprint markdown without storing */
	validateBlueprint(markdown: string, filename?: string): Promise<BlueprintValidationResponse> {
		return request<BlueprintValidationResponse>('/blueprints/validate', {
			method: 'POST',
			body: JSON.stringify({ markdown, filename }),
		});
	},

	/** Import and store a validated blueprint (in-memory only, no runtime) */
	importBlueprint(markdown: string, filename?: string): Promise<BlueprintImportResponse> {
		return request<BlueprintImportResponse>('/blueprints/import', {
			method: 'POST',
			body: JSON.stringify({ markdown, filename }),
		});
	},

	/** Get an imported blueprint summary */
	getImportedBlueprint(id: string): Promise<BlueprintValidationResponse> {
		return request<BlueprintValidationResponse>(`/blueprints/${id}`);
	},

	/** Create a run-plan draft from an imported blueprint */
	createBlueprintRunPlan(blueprintId: string, issueNumber?: number): Promise<BlueprintRunPlanResponse> {
		return request<BlueprintRunPlanResponse>(`/blueprints/${blueprintId}/create-run-plan`, {
			method: 'POST',
			body: JSON.stringify({ issueNumber }),
		});
	},
};
