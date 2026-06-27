/**
 * Evidence Portfolio Auto-Update Types
 *
 * Types for the automated post-run evidence portfolio update mechanism.
 * Part of Issue #305: Automate post-run capability and limitation updates.
 */

/** Overall evidence run status — determines what gets updated */
export type EvidenceRunStatus = 'GREEN' | 'YELLOW' | 'RED' | 'UNKNOWN';

/** Which portfolio files to target */
export type PortfolioFileTarget = 'capabilities' | 'limitations' | 'evidence-index';

/** Input for portfolio update planning and execution */
export interface PortfolioUpdateInput {
	/** Unique run identifier (e.g., "issue-305-01") */
	runId: string;

	/** Overall run status */
	status: EvidenceRunStatus;

	/** Evidence artifact paths produced by the run */
	evidencePaths: string[];

	/** New capabilities discovered in this run */
	capabilities?: string[];

	/** New limitations discovered in this run */
	limitations?: string[];

	/** Issues completed in this run */
	completedIssues?: number[];

	/** Issues created in this run */
	createdIssues?: number[];

	/** Path to run summary JSON for richer extraction */
	sourceSummaryPath?: string;

	/** When true, actually writes files. When false, dry-run only. */
	apply: boolean;

	/** Which portfolio files to update (default: all) */
	targetFiles?: PortfolioFileTarget[];
}

/** Per-file detail after update */
export interface PortfolioFileDetail {
	/** File path relative to workspace */
	file: string;
	/** Whether this file was updated */
	updated: boolean;
	/** Reason for update or skip */
	reason: string;
	/** New capabilities added to this file */
	addedCapabilities?: string[];
	/** New limitations added to this file */
	addedLimitations?: string[];
	/** New evidence paths added to this file */
	addedEvidencePaths?: string[];
	/** Entries skipped due to duplication */
	skippedDuplicates?: string[];
}

/** Result of portfolio update execution */
export interface PortfolioUpdateResult {
	/** Files that were modified */
	changedFiles: string[];
	/** Files that were skipped (no changes needed or unsafe) */
	skippedFiles: string[];
	/** Non-blocking warnings */
	warnings: string[];
	/** Blocking conflicts that prevented updates */
	conflicts: string[];
	/** Was the update applied? */
	applied: boolean;
	/** Per-file detail */
	fileDetails: Record<string, PortfolioFileDetail>;
}

/** Configuration for evidence portfolio auto-update */
export interface EvidencePortfolioConfig {
	/** Enable portfolio auto-update */
	enabled: boolean;
	/** Minimum run status to trigger update */
	minimumStatus: EvidenceRunStatus;
	/** Require minimum N evidence paths before allowing update */
	minEvidencePaths: number;
	/** Skip update if markers are missing (false = warning only) */
	requireMarkers: boolean;
}

/** Default configuration */
export const DEFAULT_PORTFOLIO_CONFIG: EvidencePortfolioConfig = {
	enabled: false,
	minimumStatus: 'GREEN',
	minEvidencePaths: 1,
	requireMarkers: true,
};

/** Runs a config function. */
export function resolvePortfolioConfig(
	overrides?: Partial<EvidencePortfolioConfig>,
): EvidencePortfolioConfig {
	return { ...DEFAULT_PORTFOLIO_CONFIG, ...overrides };
}

/** Status priority ordering: higher = more restricted */
const STATUS_PRIORITY: Record<EvidenceRunStatus, number> = {
	GREEN: 0,
	YELLOW: 1,
	RED: 2,
	UNKNOWN: 3,
};

/** Check if run status meets or exceeds minimum */
export function statusMeetsMinimum(
	actual: EvidenceRunStatus,
	minimum: EvidenceRunStatus,
): boolean {
	return STATUS_PRIORITY[actual] <= STATUS_PRIORITY[minimum];
}

/** Named sections within portfolio files with auto-generated markers */
export type PortfolioSection =
	| 'backlog'
	| 'evidence-refs'
	| 'test-breakdown'
	| 'active-limitations'
	| 'resolved-limitations'
	| 'evidence-map'
	| 'key-reports';

/** Marker prefix/suffix used in HTML comments */
export const MARKER_PREFIX = '<!-- positron:auto-generated:start';
export const MARKER_SUFFIX = '<!-- positron:auto-generated:end';
