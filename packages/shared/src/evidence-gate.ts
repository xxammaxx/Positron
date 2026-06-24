// Positron — Evidence Gate CLI MVP (Issue #279 Phase 1D)
// Combines GitHub Context Reconciler + Decision Manifest Validator
// into a structured, audit-ready evidence report.
//
// Pure functions only. No GitHub API calls, no shell execution,
// no mutations, no network, no file system writes.

import type {
	DecisionManifestRow,
	DecisionManifestValidationResult,
} from './decision-manifest.js';
import { validateDecisionManifest } from './decision-manifest.js';
import type { GitHubContextSnapshot } from './github-context-reconciler.js';
import { reconcileGitHubContext } from './github-context-reconciler.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Structured evidence gate report. */
export interface EvidenceGateReport {
	/** Overall gate status. */
	status: 'PASS' | 'WARN' | 'FAIL';
	/** ISO 8601 timestamp of report generation. */
	generatedAt?: string;
	/** High-level summary. */
	summary: {
		totalRows: number;
		applyableActions: number;
		validationErrors: number;
		validationWarnings: number;
	};
	/** Counts per risk class (string keys for extensibility). */
	riskClassCounts: Record<string, number>;
	/** Counts per agent recommendation. */
	recommendationCounts: Record<string, number>;
	/** Rows that are safe to apply (GREEN_SAFE + APPLY_GREEN_SAFE). */
	applyableRows: DecisionManifestRow[];
	/** All rows that are NOT applyable. */
	blockedRows: DecisionManifestRow[];
	/** Full validation result from the Decision Manifest Validator. */
	validation: DecisionManifestValidationResult;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Compute counts for a specific key across rows.
 */
function countByKey<T extends string>(
	rows: DecisionManifestRow[],
	extractor: (row: DecisionManifestRow) => string,
): Record<string, number> {
	const counts: Record<string, number> = {};
	for (const row of rows) {
		const key = extractor(row);
		counts[key] = (counts[key] ?? 0) + 1;
	}
	return counts;
}

/**
 * Determine overall gate status from validation result.
 * - FAIL if any blocking validation errors exist
 * - WARN if validation warnings exist but no errors
 * - PASS otherwise
 */
function determineStatus(validation: DecisionManifestValidationResult): 'PASS' | 'WARN' | 'FAIL' {
	if (!validation.valid || validation.errors.length > 0) {
		return 'FAIL';
	}
	if (validation.warnings.length > 0) {
		return 'WARN';
	}
	return 'PASS';
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Create an evidence gate report from pre-reconciled Decision Manifest rows.
 *
 * Pure function. No side effects.
 *
 * @param rows - DecisionManifestRow[] from the GitHub Context Reconciler.
 * @returns Structured EvidenceGateReport.
 */
export function createEvidenceGateReportFromRows(
	rows: DecisionManifestRow[],
): EvidenceGateReport {
	const validation = validateDecisionManifest(rows);

	const riskClassCounts = countByKey(rows, (r) => r.risk_class);
	const recommendationCounts = countByKey(rows, (r) => r.agent_recommendation);

	const applyableRows = validation.applyableActions;
	const blockedRows = rows.filter(
		(row) =>
			!(row.risk_class === 'GREEN_SAFE' && row.agent_recommendation === 'APPLY_GREEN_SAFE'),
	);

	const status = determineStatus(validation);

	return {
		status,
		generatedAt: new Date().toISOString(),
		summary: {
			totalRows: rows.length,
			applyableActions: applyableRows.length,
			validationErrors: validation.errors.length,
			validationWarnings: validation.warnings.length,
		},
		riskClassCounts,
		recommendationCounts,
		applyableRows,
		blockedRows,
		validation,
	};
}

/**
 * Create an evidence gate report from a GitHub context snapshot.
 *
 * Combines: snapshot → reconciler → validator → evidence report.
 * Pure function. No side effects.
 *
 * @param snapshot - GitHubContextSnapshot from the Snapshot Collector.
 * @returns Structured EvidenceGateReport.
 */
export function createEvidenceGateReportFromGitHubContext(
	snapshot: GitHubContextSnapshot,
): EvidenceGateReport {
	const reconciliation = reconcileGitHubContext(snapshot);
	return createEvidenceGateReportFromRows(reconciliation.rows);
}
