// Positron — Rudolph Beacon Traceability
//
// Maps benchmark requirements to tests, files, and evidence.
// Enforces: NO DONE status without evidence. Missing evidence → UNKNOWN_EVIDENCE.
// Issue IDs are NOT chronological — they are identifiers only.
//
// Issue: BENCH-004

import type { BenchmarkIssueResult } from './evidence-contract.js';
import { createIssueResult } from './evidence-contract.js';

// =============================================================================
// Types
// =============================================================================

export interface IssueTraceEntry {
	/** Issue specification file path */
	spec: string;
	/** Associated test file paths */
	tests: string[];
	/** Source files implementing the feature */
	files: string[];
	/** Evidence file paths */
	evidence: string[];
	/** Current status (derived from evidence) */
	status: BenchmarkIssueResult['status'];
	/** Confidence score (0-1) */
	confidence: number;
}

export interface TraceabilityMap {
	benchmark: string;
	issues: Record<string, IssueTraceEntry>;
}

// =============================================================================
// Traceability Builder
// =============================================================================

/**
 * Build a traceability map from benchmark issue definitions and current results.
 *
 * Key enforcement rules:
 * - DONE status REQUIRES evidence (at least one evidence path)
 * - Missing evidence → UNKNOWN_EVIDENCE (never DONE)
 * - Issue IDs are identifiers, not sequential steps
 */
export function buildTraceabilityMap(
	issueDefinitions: Array<{ id: string; title: string }>,
	results: BenchmarkIssueResult[],
): TraceabilityMap {
	const map: TraceabilityMap = {
		benchmark: 'rudolph-beacon',
		issues: {},
	};

	for (const def of issueDefinitions) {
		const result = results.find((r) => r.id === def.id);

		// Build trace entry from result or create UNKNOWN_EVIDENCE default
		const entry = buildTraceEntry(def.id, result);
		map.issues[def.id] = entry;
	}

	return map;
}

/**
 * Build a single trace entry, enforcing evidence requirements.
 */
function buildTraceEntry(id: string, result?: BenchmarkIssueResult): IssueTraceEntry {
	const specPath = `docs/benchmark/rudolph-beacon/issues/${id}.md`;

	if (!result) {
		return {
			spec: specPath,
			tests: [],
			files: [],
			evidence: [],
			status: 'UNKNOWN_EVIDENCE',
			confidence: 0,
		};
	}

	// Enforce: DONE requires evidence
	let status = result.status;
	if (status === 'DONE' && result.evidencePaths.length === 0) {
		status = 'UNKNOWN_EVIDENCE';
	}

	return {
		spec: specPath,
		tests: result.testNames,
		files: result.changedFiles,
		evidence: result.evidencePaths,
		status,
		confidence: result.confidence,
	};
}

// =============================================================================
// Validation Helpers
// =============================================================================

/**
 * Validate a traceability map against the evidence gate rules.
 * Returns validation errors, if any.
 */
export function validateTraceabilityMap(map: TraceabilityMap): string[] {
	const errors: string[] = [];

	for (const [id, entry] of Object.entries(map.issues)) {
		// Rule: DONE without evidence is invalid
		if (entry.status === 'DONE' && entry.evidence.length === 0) {
			errors.push(`${id}: DONE status but no evidence files — should be UNKNOWN_EVIDENCE`);
		}

		// Rule: DONE without tests is suspicious (but not an error in fixture mode)
		if (entry.status === 'DONE' && entry.tests.length === 0) {
			errors.push(`${id}: DONE status but no test references — confidence may be overstated`);
		}

		// Rule: DONE with confidence 0 is invalid
		if (entry.status === 'DONE' && entry.confidence === 0) {
			errors.push(`${id}: DONE status but confidence is 0 — cannot be DONE without evidence`);
		}

		// Rule: BLOCKED status should have evidence (what blocked it?)
		if (entry.status === 'BLOCKED' && entry.evidence.length === 0) {
			errors.push(`${id}: BLOCKED status but no evidence documenting the blocker`);
		}
	}

	return errors;
}

/**
 * Validate that issue IDs are NOT being treated as a chronological sequence.
 * Returns true if all issue statuses are independently determined (not derived from order).
 */
export function validateIssueIndependence(issues: BenchmarkIssueResult[]): {
	valid: boolean;
	warnings: string[];
} {
	const warnings: string[] = [];

	// Check if any issue's status depends on a "previous" issue ID
	// This is a heuristic: if issues are sorted by ID and all are DONE or all are UNKNOWN,
	// it looks like they were processed in order.

	const statuses = issues.map((i) => i.status);
	const allSame = statuses.every((s) => s === statuses[0]);

	if (allSame && statuses[0] === 'DONE') {
		warnings.push(
			'All issues are DONE — verify that each was independently evaluated, not batch-processed',
		);
	}

	return { valid: true, warnings };
}
