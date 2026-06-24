// Positron — Human Approval Pack Generator (Issue #279 Phase 1F)
// Translates Evidence Gate Reports into simple GREEN/YELLOW/RED owner
// decision packages. No action execution, no GitHub mutations.
//
// Pure functions only. No network, no shell execution, no file system writes.

import type { EvidenceGateReport } from './evidence-gate.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Package type classification. */
export type ApprovalPackageType =
	| 'GREEN_SAFE_PACKAGE'
	| 'YELLOW_REVIEW_PACKAGE'
	| 'RED_HOLD_PACKAGE'
	| 'TOOL_GAP_PACKAGE'
	| 'DEFER_TO_279_PACKAGE'
	| 'MIXED_RISK_PACKAGE';

/** Status of a decision package. */
export type ApprovalPackageStatus =
	| 'READY_FOR_APPROVAL'
	| 'REVIEW_REQUIRED'
	| 'HOLD'
	| 'DEFER'
	| 'BLOCKED';

/** A single owner decision package. */
export interface ApprovalPackage {
	/** Unique package identifier (e.g., "GREEN_SAFE_PACKAGE-1"). */
	id: string;
	/** Classification of this package. */
	type: ApprovalPackageType;
	/** High-level status for the owner. */
	status: ApprovalPackageStatus;
	/** Human-readable title. */
	title: string;
	/** One-sentence summary for the owner. */
	summary: string;
	/** IDs of the rows grouped in this package. */
	rowIds: string[];
	/** Unique risk classes represented in this package. */
	riskClasses: string[];
	/** Unique agent recommendations in this package. */
	recommendations: string[];
	/** Can this package be applied safely? */
	applyable: boolean;
	/** Simple approval phrase for the owner (null if no action needed). */
	approvalPhrase: string | null;
	/** Reasons why this package is blocked (empty if applyable). */
	blockerReasons: string[];
	/** Non-blocking warnings. */
	warnings: string[];
}

/** Top-level report from the Human Approval Pack Generator. */
export interface ApprovalPackReport {
	/** Overall status. */
	status: 'PASS' | 'WARN' | 'FAIL';
	/** Total number of packages. */
	totalPackages: number;
	/** Number of applyable (GREEN_SAFE) packages. */
	applyablePackages: number;
	/** Number of review (YELLOW_REVIEW) packages. */
	reviewPackages: number;
	/** Number of hold (RED_HOLD) packages. */
	holdPackages: number;
	/** Number of deferred (DEFER_TO_279) packages. */
	deferredPackages: number;
	/** All packages in this report. */
	packages: ApprovalPackage[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Risk classes mapped to package types. */
const RISK_CLASS_TO_PACKAGE_TYPE: Record<string, ApprovalPackageType> = {
	GREEN_SAFE: 'GREEN_SAFE_PACKAGE',
	YELLOW_REVIEW: 'YELLOW_REVIEW_PACKAGE',
	RED_HOLD: 'RED_HOLD_PACKAGE',
	TOOL_GAP: 'TOOL_GAP_PACKAGE',
	UNKNOWN: 'TOOL_GAP_PACKAGE', // UNKNOWN rows grouped with TOOL_GAP
	DEFER_TO_279: 'DEFER_TO_279_PACKAGE',
};

/** Risk classes that are merged into TOOL_GAP_PACKAGE. */
const TOOL_GAP_RISK_CLASSES = new Set(['TOOL_GAP', 'UNKNOWN']);

/** Package type to status mapping. */
function packageTypeToStatus(type: ApprovalPackageType): ApprovalPackageStatus {
	switch (type) {
		case 'GREEN_SAFE_PACKAGE':
			return 'READY_FOR_APPROVAL';
		case 'YELLOW_REVIEW_PACKAGE':
			return 'REVIEW_REQUIRED';
		case 'RED_HOLD_PACKAGE':
			return 'HOLD';
		case 'DEFER_TO_279_PACKAGE':
			return 'DEFER';
		default:
			return 'BLOCKED';
	}
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Generate a deterministic approval phrase for a package.
 */
function generateApprovalPhrase(pkg: ApprovalPackage): string | null {
	if (pkg.applyable) {
		return `APPROVE APPLY ${pkg.type} ${pkg.id}`;
	}

	switch (pkg.type) {
		case 'GREEN_SAFE_PACKAGE':
			return `APPROVE REVIEW ${pkg.type} ${pkg.id}`;
		case 'YELLOW_REVIEW_PACKAGE':
			return `APPROVE REVIEW ${pkg.type} ${pkg.id}`;
		case 'RED_HOLD_PACKAGE':
			return `HOLD ${pkg.type} ${pkg.id}`;
		case 'TOOL_GAP_PACKAGE':
			return `NEEDS VALIDATION ${pkg.type} ${pkg.id}`;
		case 'DEFER_TO_279_PACKAGE':
			return `DEFER ${pkg.type} ${pkg.id} TO ISSUE 279`;
		case 'MIXED_RISK_PACKAGE':
			return `APPROVE REVIEW ${pkg.type} ${pkg.id}`;
		default:
			return null;
	}
}

/**
 * Build a human-readable summary for the package.
 */
function buildPackageSummary(
	type: ApprovalPackageType,
	rowCount: number,
	applyable: boolean,
): string {
	switch (type) {
		case 'GREEN_SAFE_PACKAGE':
			return applyable
				? `${rowCount} safe action(s) ready for approval.`
				: `${rowCount} safe action(s) require review — not applyable.`;
		case 'YELLOW_REVIEW_PACKAGE':
			return `${rowCount} action(s) require human review before proceeding.`;
		case 'RED_HOLD_PACKAGE':
			return `${rowCount} action(s) are held — do not touch without explicit approval.`;
		case 'TOOL_GAP_PACKAGE':
			return `${rowCount} action(s) need validation — tool gap or unknown status.`;
		case 'DEFER_TO_279_PACKAGE':
			return `${rowCount} architecture decision(s) deferred to Issue #279.`;
		case 'MIXED_RISK_PACKAGE':
			return `${rowCount} action(s) with mixed risk levels — review required.`;
		default:
			return `${rowCount} action(s) in this package.`;
	}
}

/**
 * Build a human-readable title.
 */
function buildPackageTitle(type: ApprovalPackageType): string {
	switch (type) {
		case 'GREEN_SAFE_PACKAGE':
			return 'Safe Actions — Ready for Approval';
		case 'YELLOW_REVIEW_PACKAGE':
			return 'Actions Requiring Human Review';
		case 'RED_HOLD_PACKAGE':
			return 'Held Actions — Do Not Touch';
		case 'TOOL_GAP_PACKAGE':
			return 'Actions Needing Validation — Tool Gap / Unknown';
		case 'DEFER_TO_279_PACKAGE':
			return 'Architecture Decisions — Deferred to Issue #279';
		case 'MIXED_RISK_PACKAGE':
			return 'Mixed-Risk Actions — Review Required';
		default:
			return `Package: ${type}`;
	}
}

/**
 * Check whether local gates block GREEN applyable packages.
 */
function isBlockedByLocalGates(report: EvidenceGateReport): boolean {
	if (!report.localGateReport) {
		return false;
	}

	const lg = report.localGateReport;

	// FAIL on required/format gates blocks applyable packages
	if (lg.status === 'FAIL') {
		return true;
	}

	// Check individual required gate results
	for (const result of lg.results) {
		if (
			(result.kind === 'required' || result.kind === 'format') &&
			result.status === 'FAIL'
		) {
			return true;
		}
	}

	return false;
}

/**
 * Collect warnings from advisory local gates.
 */
function collectLocalGateWarnings(report: EvidenceGateReport): string[] {
	const warnings: string[] = [];

	if (!report.localGateReport) {
		return warnings;
	}

	for (const result of report.localGateReport.results) {
		if (result.status === 'WARN') {
			warnings.push(
				`Local gate "${result.label}" (${result.kind}) warned: exit code ${result.exitCode}`,
			);
		} else if (result.status === 'FAIL' && result.kind === 'advisory') {
			warnings.push(
				`Local gate "${result.label}" (advisory) failed: exit code ${result.exitCode}`,
			);
		}
	}

	return warnings;
}

// ---------------------------------------------------------------------------
// Core grouping logic
// ---------------------------------------------------------------------------

/**
 * Group rows by their effective package type.
 * UNKNOWN and TOOL_GAP are merged into a single TOOL_GAP_PACKAGE.
 */
function groupRowsByPackageType(report: EvidenceGateReport): Map<ApprovalPackageType, typeof report.applyableRows> {
	const groups = new Map<ApprovalPackageType, typeof report.applyableRows>();

	// Process ALL rows (both applyable and blocked)
	const allRows = [...report.applyableRows, ...report.blockedRows];

	for (const row of allRows) {
		const pkgType = RISK_CLASS_TO_PACKAGE_TYPE[row.risk_class] ?? 'TOOL_GAP_PACKAGE';
		if (!groups.has(pkgType)) {
			groups.set(pkgType, []);
		}
		groups.get(pkgType)!.push(row);
	}

	return groups;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Create a Human Approval Pack Report from an Evidence Gate Report.
 *
 * Groups decision manifest rows into owner-facing packages:
 * - GREEN_SAFE_PACKAGE: safe actions (applyable if no local gate failures)
 * - YELLOW_REVIEW_PACKAGE: actions needing human review
 * - RED_HOLD_PACKAGE: held actions, do not touch
 * - TOOL_GAP_PACKAGE: tool gap / unknown actions needing validation
 * - DEFER_TO_279_PACKAGE: architecture decisions deferred to Issue #279
 *
 * Pure function. No side effects. No action execution. No GitHub mutations.
 *
 * @param report - EvidenceGateReport from the Evidence Gate.
 * @returns ApprovalPackReport with owner decision packages.
 */
export function createHumanApprovalPackReport(
	report: EvidenceGateReport,
): ApprovalPackReport {
	const groups = groupRowsByPackageType(report);
	const blockedByLocalGates = isBlockedByLocalGates(report);
	const localGateWarnings = collectLocalGateWarnings(report);

	const packages: ApprovalPackage[] = [];
	let packageCounter = 0;

	// Process groups in deterministic order
	const orderedTypes: ApprovalPackageType[] = [
		'GREEN_SAFE_PACKAGE',
		'YELLOW_REVIEW_PACKAGE',
		'RED_HOLD_PACKAGE',
		'TOOL_GAP_PACKAGE',
		'DEFER_TO_279_PACKAGE',
	];

	for (const pkgType of orderedTypes) {
		const rows = groups.get(pkgType);
		if (!rows || rows.length === 0) {
			continue;
		}

		packageCounter++;
		const id = `${pkgType}-${packageCounter}`;

		const rowIds = rows.map((r) => r.action_id);
		const riskClasses = [...new Set(rows.map((r) => r.risk_class))];
		const recommendations = [...new Set(rows.map((r) => r.agent_recommendation))];

		// Determine applyability
		let applyable = false;
		const blockerReasons: string[] = [];
		const warnings: string[] = [...localGateWarnings];

		if (pkgType === 'GREEN_SAFE_PACKAGE') {
			// GREEN_SAFE_PACKAGE is applyable only if ALL rows are GREEN_SAFE + APPLY_GREEN_SAFE
			const allApplyable = rows.every(
				(r) =>
					r.risk_class === 'GREEN_SAFE' &&
					r.agent_recommendation === 'APPLY_GREEN_SAFE',
			);

			if (!allApplyable) {
				const nonApplyable = rows.filter(
					(r) =>
						!(r.risk_class === 'GREEN_SAFE' &&
							r.agent_recommendation === 'APPLY_GREEN_SAFE'),
				);
				blockerReasons.push(
					`${nonApplyable.length} row(s) are GREEN_SAFE but not APPLY_GREEN_SAFE (recommendation: ${[...new Set(nonApplyable.map((r) => r.agent_recommendation))].join(', ')})`,
				);
			}

			// Check local gate blocking
			if (blockedByLocalGates) {
				blockerReasons.push(
					'Local required/format gates have failures — applyable packages blocked.',
				);
				if (allApplyable) {
					blockerReasons.push(
						'All rows are GREEN_SAFE + APPLY_GREEN_SAFE but local gate failures prevent application.',
					);
				}
			}

			applyable = allApplyable && !blockedByLocalGates;
		}

		// YELLOW_REVIEW: add PR-review specific warnings
		if (pkgType === 'YELLOW_REVIEW_PACKAGE') {
			warnings.push(
				`${rows.length} item(s) require human review — CodeRabbit/security findings may apply.`,
			);
		}

		// TOOL_GAP: mark which risk classes are in this package
		if (pkgType === 'TOOL_GAP_PACKAGE') {
			const gapClasses = riskClasses.filter((rc) => TOOL_GAP_RISK_CLASSES.has(rc));
			if (gapClasses.length > 0) {
				warnings.push(
					`Contains risk class(es): ${gapClasses.join(', ')} — unable to auto-classify.`,
				);
			}
		}

		const status = packageTypeToStatus(pkgType);
		const title = buildPackageTitle(pkgType);
		const summary = buildPackageSummary(pkgType, rows.length, applyable);

		const pkg: ApprovalPackage = {
			id,
			type: pkgType,
			status: applyable ? 'READY_FOR_APPROVAL' : status,
			title,
			summary,
			rowIds,
			riskClasses,
			recommendations,
			applyable,
			approvalPhrase: null, // computed below
			blockerReasons,
			warnings,
		};

		pkg.approvalPhrase = generateApprovalPhrase(pkg);
		packages.push(pkg);
	}

	// Count packages by type
	const applyablePackages = packages.filter((p) => p.applyable).length;
	const reviewPackages = packages.filter(
		(p) => p.type === 'YELLOW_REVIEW_PACKAGE',
	).length;
	const holdPackages = packages.filter(
		(p) => p.type === 'RED_HOLD_PACKAGE',
	).length;
	const deferredPackages = packages.filter(
		(p) => p.type === 'DEFER_TO_279_PACKAGE',
	).length;

	// Overall status
	let overallStatus: ApprovalPackReport['status'] = 'PASS';
	if (packages.some((p) => p.type === 'RED_HOLD_PACKAGE')) {
		overallStatus = 'FAIL';
	} else if (
		packages.some(
			(p) =>
				p.type === 'YELLOW_REVIEW_PACKAGE' ||
				p.type === 'TOOL_GAP_PACKAGE' ||
				p.type === 'DEFER_TO_279_PACKAGE',
		)
	) {
		overallStatus = 'WARN';
	} else if (blockedByLocalGates) {
		overallStatus = 'FAIL';
	}

	// If the original report has FAIL status, propagate it
	if (report.status === 'FAIL') {
		overallStatus = 'FAIL';
	} else if (report.status === 'WARN' && overallStatus === 'PASS') {
		overallStatus = 'WARN';
	}

	return {
		status: overallStatus,
		totalPackages: packages.length,
		applyablePackages,
		reviewPackages,
		holdPackages,
		deferredPackages,
		packages,
	};
}
