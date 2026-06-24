// Positron — Evidence Gate CLI MVP (Issue #279 Phase 1D+1E)
// Combines GitHub Context Reconciler + Decision Manifest Validator
// + optional Local Gate Runner into a structured, audit-ready evidence report.
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
import type { LocalGateReport } from './local-gate-runner.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Options for evidence gate report creation. */
export interface EvidenceGateReportOptions {
	/** Optional local gate report to include (Phase 1E). */
	localGateReport?: LocalGateReport;
}

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
	/** Optional local gate report (Phase 1E). */
	localGateReport?: LocalGateReport;
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
 * Determine overall gate status from validation result and optional local gate report.
 * - FAIL if any blocking validation errors exist
 * - FAIL if required/format local gates have failures
 * - WARN if validation warnings exist (but no errors)
 * - WARN if advisory local gates have warnings (but no failures)
 * - PASS otherwise
 */
function determineStatus(
	validation: DecisionManifestValidationResult,
	localGateReport?: LocalGateReport,
): 'PASS' | 'WARN' | 'FAIL' {
	// GitHub validation errors → FAIL
	if (!validation.valid || validation.errors.length > 0) {
		return 'FAIL';
	}

	// Required/format local gate failures → FAIL
	if (localGateReport && localGateReport.status === 'FAIL') {
		return 'FAIL';
	}

	// Warnings from validation or local gates → WARN
	if (validation.warnings.length > 0) {
		return 'WARN';
	}
	if (localGateReport && localGateReport.status === 'WARN') {
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
 * @param options - Optional configuration including local gate report.
 * @returns Structured EvidenceGateReport.
 */
export function createEvidenceGateReportFromRows(
	rows: DecisionManifestRow[],
	options?: EvidenceGateReportOptions,
): EvidenceGateReport {
	const validation = validateDecisionManifest(rows);

	const riskClassCounts = countByKey(rows, (r) => r.risk_class);
	const recommendationCounts = countByKey(rows, (r) => r.agent_recommendation);

	const applyableRows = validation.applyableActions;
	const blockedRows = rows.filter(
		(row) =>
			!(row.risk_class === 'GREEN_SAFE' && row.agent_recommendation === 'APPLY_GREEN_SAFE'),
	);

	const status = determineStatus(validation, options?.localGateReport);

	const report: EvidenceGateReport = {
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

	if (options?.localGateReport) {
		report.localGateReport = options.localGateReport;
	}

	return report;
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
