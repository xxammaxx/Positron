// Positron — GitHub Snapshot Collector (Issue #279 Phase 1C)
// Normalizes gh CLI JSON output into GitHub Context Reconciler input types.
// Pure functions only. No GitHub API calls, no shell execution, no mutations.

import type {
	GitHubIssueSnapshot,
	GitHubPullRequestSnapshot,
	GitHubContextSnapshot,
} from './github-context-reconciler.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Raw shape of a gh issue list/view JSON item. */
interface GhIssueJsonItem {
	number: number;
	title: string;
	state: string;
	labels?: { name: string }[] | string[];
	url?: string;
	body?: string;
}

/** Raw shape of a gh pr list/view JSON item. */
interface GhPrJsonItem {
	number: number;
	title: string;
	state: string;
	mergeable?: string | null;
	isDraft?: boolean;
	url?: string;
}

/** Enrichment per PR number (from gh pr view --json reviews,statusCheckRollup). */
interface GhPrEnrichment {
	reviews?: { author?: { login?: string }; body?: string }[];
	statusCheckRollup?: { name?: string; conclusion?: string }[];
}

/** Map of PR number → enrichment data for review findings. */
export type GhPrEnrichmentMap = Record<number, GhPrEnrichment>;

// ---------------------------------------------------------------------------
// Normalization helpers
// ---------------------------------------------------------------------------

/**
 * Extract string label names from gh label objects or string arrays.
 */
function extractLabels(labels: unknown): string[] | undefined {
	if (!Array.isArray(labels)) return undefined;
	if (labels.length === 0) return undefined;

	const result: string[] = [];
	for (const item of labels) {
		if (typeof item === 'string') {
			result.push(item);
		} else if (
			item !== null &&
			typeof item === 'object' &&
			'name' in item &&
			typeof (item as { name: unknown }).name === 'string'
		) {
			result.push((item as { name: string }).name);
		}
	}
	return result.length > 0 ? result : undefined;
}

/**
 * Determine if review findings are accessible and count actionable ones.
 * Reviews from external AI reviewers that mention "Actionable comments:" are counted.
 */
function extractReviewFindings(enrichment: GhPrEnrichment | undefined): {
	reviewFindingCount?: number;
	actionableFindingCount?: number;
	findingsAccessible?: boolean;
} {
	if (!enrichment || !Array.isArray(enrichment.reviews)) {
		return { findingsAccessible: undefined };
	}

	const reviews = enrichment.reviews;
	let actionable = 0;

	for (const review of reviews) {
		if (review.body && /actionable comments/i.test(review.body)) {
			actionable++;
		}
	}

	return {
		reviewFindingCount: reviews.length,
		actionableFindingCount: actionable,
		findingsAccessible: true,
	};
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Normalize gh issue list/view JSON output into GitHubIssueSnapshot[].
 *
 * Pure function. No shell execution, no network calls.
 *
 * @param input - Raw JSON from `gh issue list --json ...` or `gh issue view --json ...`.
 * @returns Array of GitHubIssueSnapshot objects.
 */
export function normalizeGitHubIssuesFromGhJson(input: unknown): GitHubIssueSnapshot[] {
	if (!Array.isArray(input)) return [];

	const result: GitHubIssueSnapshot[] = [];
	for (const item of input) {
		if (item === null || typeof item !== 'object') continue;
		const issue = item as GhIssueJsonItem;
		if (typeof issue.number !== 'number' || typeof issue.title !== 'string') continue;

		const snapshot: GitHubIssueSnapshot = {
			number: issue.number,
			title: issue.title,
			state: issue.state ?? 'OPEN',
			labels: extractLabels(issue.labels),
		};

		if (issue.url && typeof issue.url === 'string') {
			snapshot.url = issue.url;
		}
		if (issue.body && typeof issue.body === 'string') {
			snapshot.body = issue.body;
		}

		result.push(snapshot);
	}

	// Deterministic sort by issue number
	result.sort((a, b) => a.number - b.number);
	return result;
}

/**
 * Normalize gh pr list/view JSON output into GitHubPullRequestSnapshot[].
 *
 * Pure function. No shell execution, no network calls.
 *
 * @param input - Raw JSON from `gh pr list --json ...` or `gh pr view --json ...`.
 * @param enrichmentMap - Optional per-PR enrichment data (reviews, status checks).
 * @returns Array of GitHubPullRequestSnapshot objects.
 */
export function normalizeGitHubPullRequestsFromGhJson(
	input: unknown,
	enrichmentMap?: GhPrEnrichmentMap,
): GitHubPullRequestSnapshot[] {
	if (!Array.isArray(input)) return [];

	const result: GitHubPullRequestSnapshot[] = [];
	for (const item of input) {
		if (item === null || typeof item !== 'object') continue;
		const pr = item as GhPrJsonItem;
		if (typeof pr.number !== 'number' || typeof pr.title !== 'string') continue;

		const snapshot: GitHubPullRequestSnapshot = {
			number: pr.number,
			title: pr.title,
			state: pr.state ?? 'OPEN',
		};

		if (pr.mergeable !== undefined) {
			snapshot.mergeable = pr.mergeable;
		}
		if (pr.isDraft !== undefined) {
			snapshot.isDraft = pr.isDraft;
		}
		if (pr.url && typeof pr.url === 'string') {
			snapshot.url = pr.url;
		}

		// Apply enrichment if available
		if (enrichmentMap) {
			const enrichment = enrichmentMap[pr.number];
			if (enrichment) {
				const findings = extractReviewFindings(enrichment);
				snapshot.reviewFindingCount = findings.reviewFindingCount;
				snapshot.actionableFindingCount = findings.actionableFindingCount;
				snapshot.findingsAccessible = findings.findingsAccessible;
			}
		}

		result.push(snapshot);
	}

	// Deterministic sort by PR number
	result.sort((a, b) => a.number - b.number);
	return result;
}

/**
 * Create a complete GitHubContextSnapshot from raw gh JSON outputs.
 *
 * This is the main entry point for feeding gh data into the reconciler.
 * Pure function. No shell execution, no network calls.
 *
 * @param input - Raw gh JSON outputs for issues, pull requests, and optional enrichment.
 * @returns A GitHubContextSnapshot ready for the reconciler.
 */
export function createGitHubContextSnapshot(input: {
	issues: unknown;
	pullRequests: unknown;
	prEnrichment?: GhPrEnrichmentMap;
}): GitHubContextSnapshot {
	return {
		pullRequests: normalizeGitHubPullRequestsFromGhJson(input.pullRequests, input.prEnrichment),
		issues: normalizeGitHubIssuesFromGhJson(input.issues),
	};
}

// ---------------------------------------------------------------------------
// Read-only command allowlist
// ---------------------------------------------------------------------------

/** Read-only gh commands that the CLI is allowed to execute. */
const READ_ONLY_GH_COMMANDS = [
	'gh repo view',
	'gh pr list',
	'gh pr view',
	'gh issue list',
	'gh issue view',
];

/**
 * Get the list of allowed read-only gh command prefixes.
 *
 * @returns Array of allowed command strings (e.g., "gh pr list").
 */
export function getAllowedReadOnlyGhCommands(): string[] {
	return [...READ_ONLY_GH_COMMANDS];
}

/**
 * Check if a command array maps to a read-only allowed gh command.
 *
 * Joins the first 3 tokens of the command array and checks against the allowlist.
 *
 * @param command - Command array (e.g., ['gh', 'pr', 'list', '--json', '...']).
 * @returns True if the command is read-only and in the allowlist.
 */
export function isAllowedReadOnlyGhCommand(command: string[]): boolean {
	if (command.length < 3) return false;
	if (command[0] !== 'gh') return false;

	// Build the 3-token prefix and check against allowlist
	const prefix = `${command[0]} ${command[1]} ${command[2]}`;
	return READ_ONLY_GH_COMMANDS.includes(prefix);
}
