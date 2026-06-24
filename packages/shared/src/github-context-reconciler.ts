// Positron — GitHub Context Reconciler MVP (Issue #279 Phase 1B)
// Maps GitHub issue/PR snapshots into Decision Manifest rows.
// Pure functions only. No GitHub API calls, no mutations.

import type {
	DecisionManifestRow,
	RiskClass,
	AgentRecommendation,
} from './decision-manifest.js';
import { validateDecisionManifest } from './decision-manifest.js';

// ---------------------------------------------------------------------------
// Input snapshot types
// ---------------------------------------------------------------------------

/** A read-only snapshot of a GitHub Issue. */
export interface GitHubIssueSnapshot {
	number: number;
	title: string;
	state: 'OPEN' | 'CLOSED' | string;
	labels?: string[];
	url?: string;
	body?: string;
}

/** A read-only snapshot of a GitHub Pull Request. */
export interface GitHubPullRequestSnapshot {
	number: number;
	title: string;
	state: 'OPEN' | 'CLOSED' | 'MERGED' | string;
	mergeable?: 'MERGEABLE' | 'CONFLICTING' | 'UNKNOWN' | string | null;
	isDraft?: boolean;
	url?: string;
	linkedIssueNumber?: number;
	reviewFindingCount?: number;
	actionableFindingCount?: number;
	findingsAccessible?: boolean;
}

/** Complete snapshot of GitHub context for reconciliation. */
export interface GitHubContextSnapshot {
	pullRequests: GitHubPullRequestSnapshot[];
	issues: GitHubIssueSnapshot[];
}

/** Structured result from reconciling GitHub context. */
export interface GitHubContextReconciliationResult {
	/** The reconciled decision manifest rows. */
	rows: DecisionManifestRow[];
	/** Validation result from the Phase 1A validator. */
	validation: ReturnType<typeof validateDecisionManifest>;
	/** Number of rows that are applyable (GREEN_SAFE + APPLY_GREEN_SAFE). */
	applyableCount: number;
}

// ---------------------------------------------------------------------------
// Classification logic
// ---------------------------------------------------------------------------

/**
 * Classify a single PR into a Decision Manifest row.
 *
 * Rules (ordered by priority):
 * 1. MERGED → GREEN_SAFE + DO_NOT_APPLY (already done)
 * 2. CLOSED → GREEN_SAFE + DO_NOT_APPLY (superseded/abandoned)
 * 3. CONFLICTING → YELLOW_REVIEW + REVIEW_REQUIRED
 * 4. Draft → YELLOW_REVIEW + REVIEW_REQUIRED
 * 5. OPEN + actionable findings → YELLOW_REVIEW + REVIEW_REQUIRED
 * 6. OPEN + findings inaccessible → TOOL_GAP + REVIEW_REQUIRED
 * 7. OPEN + unknown review status → TOOL_GAP + REVIEW_REQUIRED
 * 8. Fallback → TOOL_GAP + REVIEW_REQUIRED
 *
 * NEVER returns APPLY_GREEN_SAFE.
 */
function classifyPR(pr: GitHubPullRequestSnapshot): DecisionManifestRow {
	const actionId = `PR-${pr.number}`;

	// MERGED: already done, safe to ignore
	if (pr.state === 'MERGED') {
		return { action_id: actionId, risk_class: 'GREEN_SAFE', agent_recommendation: 'DO_NOT_APPLY' };
	}

	// CLOSED: superseded or abandoned
	if (pr.state === 'CLOSED') {
		return { action_id: actionId, risk_class: 'GREEN_SAFE', agent_recommendation: 'DO_NOT_APPLY' };
	}

	// OPEN state classification
	if (pr.state === 'OPEN') {
		// CONFLICTING: cannot apply
		if (pr.mergeable === 'CONFLICTING') {
			return { action_id: actionId, risk_class: 'YELLOW_REVIEW', agent_recommendation: 'REVIEW_REQUIRED' };
		}

		// Draft: not ready
		if (pr.isDraft) {
			return { action_id: actionId, risk_class: 'YELLOW_REVIEW', agent_recommendation: 'REVIEW_REQUIRED' };
		}

		// Review findings known
		if (pr.findingsAccessible === true) {
			if (pr.actionableFindingCount !== undefined && pr.actionableFindingCount > 0) {
				return { action_id: actionId, risk_class: 'YELLOW_REVIEW', agent_recommendation: 'REVIEW_REQUIRED' };
			}
			// Findings accessible but zero — still requires review to confirm
			return { action_id: actionId, risk_class: 'YELLOW_REVIEW', agent_recommendation: 'REVIEW_REQUIRED' };
		}

		// Findings inaccessible or undefined — tool gap
		if (pr.findingsAccessible === false || pr.findingsAccessible === undefined) {
			// But if we know there are findings (reviewFindingCount > 0), mark as TOOL_GAP
			if (pr.reviewFindingCount !== undefined && pr.reviewFindingCount > 0) {
				return { action_id: actionId, risk_class: 'TOOL_GAP', agent_recommendation: 'REVIEW_REQUIRED' };
			}
			return { action_id: actionId, risk_class: 'TOOL_GAP', agent_recommendation: 'REVIEW_REQUIRED' };
		}
	}

	// Fallback for any unknown state
	return { action_id: actionId, risk_class: 'TOOL_GAP', agent_recommendation: 'REVIEW_REQUIRED' };
}

/** Labels/title markers that indicate an issue is an architecture replacement or deferred epic. */
const ARCHITECTURE_LABELS = new Set([
	'architecture',
	'epic',
	'infrastructure',
]);

const ARCHITECTURE_TITLE_PATTERNS = [
	/rebuild/i,
	/replacement/i,
	/architecture chain/i,
	/blueprint/i,
];

const DATA_LOSS_BODY_PATTERNS = [
	/data loss/i,
	/data-loss/i,
	/datenverlust/i,
	/irreversible/i,
	/destructive/i,
];

const RED_HOLD_LABELS = new Set([
	'RED_HOLD',
	'data-loss',
]);

/**
 * Check if an issue title indicates an architecture/deferred epic.
 */
function isArchitectureIssue(issue: GitHubIssueSnapshot): boolean {
	// Check labels
	if (issue.labels) {
		for (const label of issue.labels) {
			if (ARCHITECTURE_LABELS.has(label.toLowerCase())) {
				return true;
			}
		}
	}
	// Check title patterns
	for (const pattern of ARCHITECTURE_TITLE_PATTERNS) {
		if (pattern.test(issue.title)) {
			return true;
		}
	}
	return false;
}

/**
 * Check if an issue has RED_HOLD or data-loss risk markers.
 */
function isRedHoldIssue(issue: GitHubIssueSnapshot): boolean {
	// Explicit RED_HOLD label
	if (issue.labels) {
		for (const label of issue.labels) {
			if (RED_HOLD_LABELS.has(label)) {
				return true;
			}
		}
	}
	// Data loss in body
	if (issue.body) {
		for (const pattern of DATA_LOSS_BODY_PATTERNS) {
			if (pattern.test(issue.body)) {
				return true;
			}
		}
	}
	return false;
}

/**
 * Classify a single Issue into a Decision Manifest row.
 *
 * Rules (ordered by priority):
 * 1. CLOSED → GREEN_SAFE + DO_NOT_APPLY
 * 2. RED_HOLD marker → RED_HOLD + HOLD
 * 3. Architecture/deferred → DEFER_TO_279 + DEFER
 * 4. OPEN with unknown classification → TOOL_GAP + REVIEW_REQUIRED
 *
 * NEVER returns APPLY_GREEN_SAFE.
 */
function classifyIssue(issue: GitHubIssueSnapshot): DecisionManifestRow {
	const actionId = `ISSUE-${issue.number}`;

	// CLOSED: already resolved
	if (issue.state === 'CLOSED') {
		return { action_id: actionId, risk_class: 'GREEN_SAFE', agent_recommendation: 'DO_NOT_APPLY' };
	}

	// Architecture/deferred: DEFER_TO_279 (checked before RED_HOLD —
	// architecture issues are deferred by definition even if they also
	// have priority markers)
	if (isArchitectureIssue(issue)) {
		return { action_id: actionId, risk_class: 'DEFER_TO_279', agent_recommendation: 'DEFER' };
	}

	// RED_HOLD: data loss or critical risk
	if (isRedHoldIssue(issue)) {
		return { action_id: actionId, risk_class: 'RED_HOLD', agent_recommendation: 'HOLD' };
	}

	// Fallback: open issue with no clear classification
	return { action_id: actionId, risk_class: 'TOOL_GAP', agent_recommendation: 'REVIEW_REQUIRED' };
}

// ---------------------------------------------------------------------------
// Reconciliation API
// ---------------------------------------------------------------------------

/**
 * Reconcile GitHub issue/PR snapshots into Decision Manifest rows.
 *
 * Pure function. No GitHub API calls, no mutations.
 * Rows are sorted deterministically by action_id.
 *
 * @param input - GitHub context snapshot (PRs + issues).
 * @returns Array of DecisionManifestRow objects ready for validation.
 */
export function reconcileGitHubContextToDecisionManifestRows(
	input: GitHubContextSnapshot,
): DecisionManifestRow[] {
	const rows: DecisionManifestRow[] = [];

	// Classify PRs
	for (const pr of input.pullRequests) {
		rows.push(classifyPR(pr));
	}

	// Classify issues
	for (const issue of input.issues) {
		rows.push(classifyIssue(issue));
	}

	// Deterministic ordering: sort by action_id
	rows.sort((a, b) => {
		// Sort by prefix (PR before ISSUE), then by number
		const aPrefix = a.action_id.startsWith('PR-') ? 0 : 1;
		const bPrefix = b.action_id.startsWith('PR-') ? 0 : 1;
		if (aPrefix !== bPrefix) return aPrefix - bPrefix;

		const aNum = Number.parseInt(a.action_id.split('-')[1] ?? '0', 10);
		const bNum = Number.parseInt(b.action_id.split('-')[1] ?? '0', 10);
		return aNum - bNum;
	});

	return rows;
}

/**
 * Reconcile GitHub context and produce a structured result with validation.
 *
 * Pure function. No GitHub API calls, no mutations.
 *
 * @param input - GitHub context snapshot (PRs + issues).
 * @returns Structured reconciliation result including validation.
 */
export function reconcileGitHubContext(
	input: GitHubContextSnapshot,
): GitHubContextReconciliationResult {
	const rows = reconcileGitHubContextToDecisionManifestRows(input);
	const validation = validateDecisionManifest(rows);
	const applyableCount = validation.applyableActions.length;

	return {
		rows,
		validation,
		applyableCount,
	};
}
