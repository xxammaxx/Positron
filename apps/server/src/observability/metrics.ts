/**
 * Positron Observability — Prometheus Metrics
 *
 * Centralized prom-client metrics for Positron runtime monitoring.
 * DESIGN RULES (QA-010):
 *   - No high-cardinality labels (no runId, issue title, branch name, repo full name)
 *   - No secrets or tokens in labels or metric names
 *   - No PII (personally identifiable information)
 *   - Allowed labels: status, phase, adapter, method, outcome, error_kind
 *   - Metrics are singletons — created once per process and reused
 */

import promClient from "prom-client";

// --------------------------------------------------------------------------
// Registry — isolated to prevent default metrics from polluting test runs
// --------------------------------------------------------------------------
const registry = new promClient.Registry();

// Default metrics (CPU, memory, event loop) — disabled to avoid noise
// Enable in production with: POSITRON_ENABLE_DEFAULT_METRICS=true
if (process.env["POSITRON_ENABLE_DEFAULT_METRICS"] === "true") {
	promClient.collectDefaultMetrics({ register: registry });
}

// --------------------------------------------------------------------------
// Workflow Metrics (Phase 4)
// --------------------------------------------------------------------------

/** Total runs started. Counter — monotonically increasing. */
export const runsTotal = new promClient.Counter({
	name: "positron_runs_total",
	help: "Total number of runs started",
	labelNames: ["status"] as const,
	registers: [registry],
});

/** Run duration in seconds (QUEUED → terminal). Histogram. */
export const runDurationSeconds = new promClient.Histogram({
	name: "positron_run_duration_seconds",
	help: "Run duration in seconds from start to terminal state",
	labelNames: ["status"] as const,
	buckets: [10, 30, 60, 120, 300, 600, 1800, 3600],
	registers: [registry],
});

/** Total run failures. Counter. */
export const runFailuresTotal = new promClient.Counter({
	name: "positron_run_failures_total",
	help: "Total number of run failures",
	labelNames: ["failure_type"] as const,
	// failure_type: FAILED, FAILED_TRANSIENT, FAILED_BLOCKED, FAILED_UNSAFE
	registers: [registry],
});

/** Total retry attempts. Counter. */
export const retriesTotal = new promClient.Counter({
	name: "positron_retries_total",
	help: "Total number of retry attempts (fix loops)",
	labelNames: ["attempt"] as const,
	registers: [registry],
});

/** Total run cancellations. Counter. */
export const cancellationsTotal = new promClient.Counter({
	name: "positron_cancellations_total",
	help: "Total number of cancelled runs",
	labelNames: ["cancel_source"] as const,
	// cancel_source: user, system, watcher
	registers: [registry],
});

// --------------------------------------------------------------------------
// GitHub API Telemetry Metrics (Phase 5)
// --------------------------------------------------------------------------

/** Total GitHub API requests. Counter. */
export const githubApiRequestsTotal = new promClient.Counter({
	name: "positron_github_api_requests_total",
	help: "Total number of GitHub API requests",
	labelNames: ["method", "outcome"] as const,
	// method: getRepository, getIssue, listOpenIssues, createIssueComment, ...
	// outcome: success, error
	registers: [registry],
});

/** GitHub API failures. Counter. */
export const githubApiFailuresTotal = new promClient.Counter({
	name: "positron_github_api_failures_total",
	help: "Total number of GitHub API failures",
	labelNames: ["method", "error_kind"] as const,
	// error_kind: auth, permission, not_found, rate_limit, validation, network, unknown
	registers: [registry],
});

/** GitHub API request duration. Histogram. */
export const githubApiDurationSeconds = new promClient.Histogram({
	name: "positron_github_api_duration_seconds",
	help: "GitHub API request duration in seconds",
	labelNames: ["method"] as const,
	buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10],
	registers: [registry],
});

/** GitHub rate limit hits. Counter. */
export const githubRateLimitHitsTotal = new promClient.Counter({
	name: "positron_github_rate_limit_hits_total",
	help: "Total number of GitHub rate limit hits (primary + secondary)",
	labelNames: ["rate_limit_type"] as const,
	// rate_limit_type: primary, secondary
	registers: [registry],
});

// --------------------------------------------------------------------------
// OpenCode Command Telemetry Metrics (Phase 6)
// --------------------------------------------------------------------------

/** Total OpenCode commands executed. Counter. */
export const opencodeCommandTotal = new promClient.Counter({
	name: "positron_opencode_command_total",
	help: "Total number of OpenCode commands executed",
	labelNames: ["command_type", "outcome"] as const,
	registers: [registry],
});

/** OpenCode command duration. Histogram. */
export const opencodeCommandDurationSeconds = new promClient.Histogram({
	name: "positron_opencode_command_duration_seconds",
	help: "OpenCode command duration in seconds",
	labelNames: ["command_type"] as const,
	buckets: [1, 5, 10, 30, 60, 120, 300, 600],
	registers: [registry],
});

/** OpenCode command failures. Counter. */
export const opencodeCommandFailuresTotal = new promClient.Counter({
	name: "positron_opencode_command_failures_total",
	help: "Total number of OpenCode command failures",
	labelNames: ["command_type", "error_kind"] as const,
	registers: [registry],
});

// --------------------------------------------------------------------------
// Safety Gate Metrics (Phase 7)
// --------------------------------------------------------------------------

/** Blocked merges. Counter. */
export const blockedMergesTotal = new promClient.Counter({
	name: "positron_blocked_merges_total",
	help: "Total number of blocked merges",
	labelNames: ["reason"] as const,
	// reason: kill_switch, not_enabled, dry_run, status, test_evidence, branch, mergeable
	registers: [registry],
});

/** Blocked pushes. Counter. */
export const blockedPushesTotal = new promClient.Counter({
	name: "positron_blocked_pushes_total",
	help: "Total number of blocked pushes",
	labelNames: [] as const,
	registers: [registry],
});

/** Gate revisions (revise decisions). Counter. */
export const gateRevisionsTotal = new promClient.Counter({
	name: "positron_gate_revisions_total",
	help: "Total number of gate revision decisions",
	labelNames: ["phase"] as const,
	registers: [registry],
});

// --------------------------------------------------------------------------
// Server metrics
// --------------------------------------------------------------------------

/** Server uptime in seconds. Gauge. */
export const serverUptimeSeconds = new promClient.Gauge({
	name: "positron_server_uptime_seconds",
	help: "Server uptime in seconds",
	registers: [registry],
});

/** Active runs. Gauge. */
export const activeRuns = new promClient.Gauge({
	name: "positron_runs_active",
	help: "Number of currently active runs",
	registers: [registry],
});

// --------------------------------------------------------------------------
// Helper: record GitHub API telemetry
// --------------------------------------------------------------------------

/** Known GitHub adapter methods for labeling */
export type GitHubApiMethod =
	| "getRepository"
	| "listOpenIssues"
	| "getIssue"
	| "listIssueComments"
	| "createIssueComment"
	| "addIssueLabels"
	| "removeIssueLabel"
	| "claimIssue"
	| "createPullRequest"
	| "listPullRequests"
	| "listPullRequestFiles"
	| "getPullRequest"
	| "mergePullRequest"
	| "requestReviewers"
	| "closeIssue";

/**
 * Map an error to an error_kind label value.
 * No full error messages — only controlled categories.
 */
export function classifyGitHubError(err: Error): string {
	const msg = err.message.toLowerCase();
	if (msg.includes("rate limit") || msg.includes("secondary rate limit"))
		return "rate_limit";
	if (msg.includes("authentication") || msg.includes("bad credentials"))
		return "auth";
	if (msg.includes("permission") || msg.includes("access")) return "permission";
	if (msg.includes("not found")) return "not_found";
	if (msg.includes("validation")) return "validation";
	if (
		msg.includes("network") ||
		msg.includes("econnrefused") ||
		msg.includes("enotfound")
	)
		return "network";
	return "unknown";
}

/**
 * Helper: record a successful GitHub API call.
 */
export function recordGitHubApiSuccess(
	method: GitHubApiMethod,
	durationMs: number,
): void {
	githubApiRequestsTotal.inc({ method, outcome: "success" });
	githubApiDurationSeconds.observe({ method }, durationMs / 1000);
}

/**
 * Helper: record a failed GitHub API call.
 */
export function recordGitHubApiFailure(
	method: GitHubApiMethod,
	err: Error,
	durationMs: number,
): void {
	const errorKind = classifyGitHubError(err);
	githubApiRequestsTotal.inc({ method, outcome: "error" });
	githubApiFailuresTotal.inc({ method, error_kind: errorKind });
	githubApiDurationSeconds.observe({ method }, durationMs / 1000);

	if (errorKind === "rate_limit") {
		const rateType = err.message.toLowerCase().includes("secondary")
			? "secondary"
			: "primary";
		githubRateLimitHitsTotal.inc({ rate_limit_type: rateType });
	}
}

// --------------------------------------------------------------------------
// Helper: render metrics for Prometheus scraping
// --------------------------------------------------------------------------

/**
 * Render all registered metrics as Prometheus text format.
 * Returns the content-type and body for the /metrics endpoint.
 */
export async function renderMetrics(): Promise<{
	contentType: string;
	body: string;
}> {
	const body = await registry.metrics();
	return {
		contentType: promClient.register.contentType,
		body,
	};
}

// Export registry for testing
export { registry };
