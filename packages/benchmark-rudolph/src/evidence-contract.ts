// Positron — Rudolph Beacon Evidence Contract
//
// Machine-readable evidence schema for Rudolph Beacon benchmark runs.
// Compatible with existing ExecutionMode and EvidenceReport structures.
//
// Issue: BENCH-003

import type { ExecutionMode } from '@positron/shared';

// =============================================================================
// Main Benchmark Result Schema
// =============================================================================

/** Machine-readable summary of a Rudolph Beacon benchmark run. */
export interface RudolphBenchmarkRunSummary {
	/** Unique run identifier (deterministic or UUID) */
	runId: string;
	/** ISO 8601 timestamp of the run */
	timestampUtc: string;
	/** How this run was executed */
	executionMode: ExecutionMode;
	/** Identifier for this benchmark */
	benchmarkName: 'rudolph-beacon';
	/** Repository state at run time */
	repo: {
		branch: string;
		commitSha: string;
		status: 'clean' | 'dirty' | 'unknown';
	};
	/** Benchmark issues evaluated in this run */
	issues: BenchmarkIssueResult[];
	/** Commands executed (or simulated) */
	commands: BenchmarkCommandResult[];
	/** Test results summary */
	tests: {
		passed: number;
		failed: number;
		skipped: number;
		redTestsCovered: string[];
	};
	/** Safety and secret handling */
	safety: {
		secretsRedacted: boolean;
		blockedActions: BlockedAction[];
		warnings: string[];
	};
	/** Overall conclusion */
	conclusion: BenchmarkConclusion;
	/** Delta from previous benchmark run */
	capabilityDelta: CapabilityDelta;
}

// =============================================================================
// Sub-types
// =============================================================================

export interface BenchmarkIssueResult {
	id: string;
	title: string;
	status: 'DONE' | 'PARTIAL' | 'BLOCKED' | 'UNKNOWN_EVIDENCE';
	evidencePaths: string[];
	testNames: string[];
	changedFiles: string[];
	confidence: number;
}

export interface BenchmarkCommandResult {
	name: string;
	command: string;
	exitCode: number | null;
	durationMs: number;
	stdoutPath?: string;
	stderrPath?: string;
}

export interface BlockedAction {
	operation: string;
	reason: string;
}

export interface BenchmarkConclusion {
	status: 'GREEN' | 'YELLOW' | 'RED' | 'UNKNOWN';
	whatWorks: string[];
	whatDoesNotWork: string[];
	whatIsUnproven: string[];
	confidence: number;
}

export interface CapabilityDelta {
	newCapabilities: string[];
	removedBlockers: string[];
	unchangedLimitations: string[];
	remainingRisks: string[];
	nextBestStep: string;
}

// =============================================================================
// Secret Redaction
// =============================================================================

/** Patterns that indicate potential secrets — these must be redacted from evidence. */
const SECRET_PATTERNS = [
	/ghp_[a-zA-Z0-9_]{20,}/g,
	/sk-[a-zA-Z0-9\-_]{20,}/g,
	/gho_[a-zA-Z0-9_]{20,}/g,
	/ghu_[a-zA-Z0-9_]{20,}/g,
	/ghs_[a-zA-Z0-9_]{20,}/g,
	/ghr_[a-zA-Z0-9_]{20,}/g,
	/xox[baprs]-[a-zA-Z0-9-]+/g,
	/BEARER\s+[a-zA-Z0-9._\-]+/gi,
	/AUTHORIZATION:\s*[^\s]+/gi,
];

/**
 * Redact known secret patterns from a string.
 * Replaces matches with `***REDACTED***`.
 */
export function redactSecrets(input: string): string {
	let result = input;
	for (const pattern of SECRET_PATTERNS) {
		result = result.replace(pattern, '***REDACTED***');
	}
	return result;
}

/**
 * Check if a string contains potential secrets.
 * Returns true if any known secret pattern matches.
 */
export function containsSecrets(input: string): boolean {
	for (const pattern of SECRET_PATTERNS) {
		// Reset lastIndex to avoid state leakage from 'g' flag across calls
		pattern.lastIndex = 0;
		if (pattern.test(input)) {
			return true;
		}
	}
	return false;
}

// =============================================================================
// Factory Helpers
// =============================================================================

/**
 * Create a minimal valid BenchmarkIssueResult with UNKNOWN_EVIDENCE status.
 * Used for initial benchmark issue tracking before evidence is collected.
 */
export function createIssueResult(id: string, title: string): BenchmarkIssueResult {
	return {
		id,
		title,
		status: 'UNKNOWN_EVIDENCE',
		evidencePaths: [],
		testNames: [],
		changedFiles: [],
		confidence: 0,
	};
}

/**
 * Create a BenchmarkCommandResult for a locally executed command.
 */
export function createCommandResult(
	name: string,
	command: string,
	exitCode: number | null,
	durationMs: number,
): BenchmarkCommandResult {
	return {
		name,
		command,
		exitCode,
		durationMs,
	};
}

/**
 * Determine the overall benchmark conclusion status based on issue results.
 *
 * Rules (ordered by priority, first match wins):
 * - RED: any issue is BLOCKED or DONE with confidence < 0.3
 * - YELLOW: any issue is UNKNOWN_EVIDENCE, PARTIAL, or DONE without evidence paths
 * - GREEN: all issues are DONE with confidence >= 0.7 AND all have evidence paths
 * - UNKNOWN: no issues evaluated
 */
export function determineConclusionStatus(
	issues: BenchmarkIssueResult[],
): BenchmarkConclusion['status'] {
	if (issues.length === 0) {
		return 'UNKNOWN';
	}

	const hasBlocked = issues.some((i) => i.status === 'BLOCKED');
	const hasLowConfidence = issues.some((i) => i.status === 'DONE' && i.confidence < 0.3);

	if (hasBlocked || hasLowConfidence) {
		return 'RED';
	}

	// DONE without evidence paths is a YELLOW-class issue (evidence gap, not a blocker)
	const hasDoneWithoutEvidence = issues.some(
		(i) => i.status === 'DONE' && i.evidencePaths.length === 0,
	);
	const hasPartial = issues.some((i) => i.status === 'PARTIAL');
	const hasUnknown = issues.some((i) => i.status === 'UNKNOWN_EVIDENCE');

	if (hasPartial || hasUnknown || hasDoneWithoutEvidence) {
		return 'YELLOW';
	}

	const allDoneWithEvidence = issues.every(
		(i) => i.status === 'DONE' && i.confidence >= 0.7 && i.evidencePaths.length > 0,
	);

	if (allDoneWithEvidence) {
		return 'GREEN';
	}

	return 'YELLOW';
}

// =============================================================================
// Run Summary Validation (Runtime Schema Check)
// =============================================================================

/** Valid execution modes */
export const VALID_EXECUTION_MODES = ['fixture', 'dry-run', 'real'] as const;

/** Valid conclusion statuses */
const VALID_CONCLUSION_STATUSES = ['GREEN', 'YELLOW', 'RED', 'UNKNOWN'] as const;

/** Valid issue statuses */
const VALID_ISSUE_STATUSES = ['DONE', 'PARTIAL', 'BLOCKED', 'UNKNOWN_EVIDENCE'] as const;

/** Valid repo statuses */
const VALID_REPO_STATUSES = ['clean', 'dirty', 'unknown'] as const;

/**
 * Validate a RudolphBenchmarkRunSummary against all schema rules.
 * Returns array of validation errors (empty = valid).
 *
 * Checks: required fields, enum values, value ranges, evidence integrity,
 * conclusion consistency, and secret containment.
 */
export function validateRunSummary(summary: unknown): string[] {
	const errors: string[] = [];

	if (!summary || typeof summary !== 'object') {
		return ['summary is not an object'];
	}

	const s = summary as Record<string, unknown>;

	// ── Top-level required fields ─────────────────────────────────────────
	if (typeof s.runId !== 'string' || s.runId.length === 0) {
		errors.push('runId: must be a non-empty string');
	}
	if (typeof s.timestampUtc !== 'string' || s.timestampUtc.length === 0) {
		errors.push('timestampUtc: must be a non-empty string');
	}
	if (!VALID_EXECUTION_MODES.includes(s.executionMode as 'fixture')) {
		errors.push(`executionMode: must be one of ${VALID_EXECUTION_MODES.join(', ')}, got "${s.executionMode}"`);
	}
	if (s.benchmarkName !== 'rudolph-beacon') {
		errors.push(`benchmarkName: must be "rudolph-beacon", got "${s.benchmarkName}"`);
	}

	// ── repo ──────────────────────────────────────────────────────────────
	const repo = s.repo as Record<string, unknown> | undefined;
	if (!repo || typeof repo !== 'object') {
		errors.push('repo: must be an object with branch, commitSha, status');
	} else {
		if (typeof repo.branch !== 'string' || repo.branch.length === 0) {
			errors.push('repo.branch: must be a non-empty string');
		}
		if (typeof repo.commitSha !== 'string' || repo.commitSha.length === 0) {
			errors.push('repo.commitSha: must be a non-empty string');
		}
		if (!VALID_REPO_STATUSES.includes(repo.status as 'clean')) {
			errors.push(`repo.status: must be one of ${VALID_REPO_STATUSES.join(', ')}, got "${repo.status}"`);
		}
	}

	// ── issues (array) ────────────────────────────────────────────────────
	const issues = s.issues as unknown[];
	if (!Array.isArray(issues)) {
		errors.push('issues: must be an array');
	} else {
		for (let i = 0; i < issues.length; i++) {
			const issue = issues[i] as Record<string, unknown>;
			if (typeof issue.id !== 'string' || issue.id.length === 0) {
				errors.push(`issues[${i}].id: must be a non-empty string`);
			}
			if (typeof issue.title !== 'string' || issue.title.length === 0) {
				errors.push(`issues[${i}].title: must be a non-empty string`);
			}
			if (!VALID_ISSUE_STATUSES.includes(issue.status as 'DONE')) {
				errors.push(`issues[${i}].status: must be one of ${VALID_ISSUE_STATUSES.join(', ')}, got "${issue.status}"`);
			}
			if (!Array.isArray(issue.evidencePaths)) {
				errors.push(`issues[${i}].evidencePaths: must be an array`);
			}
			if (typeof issue.confidence !== 'number' || issue.confidence < 0 || issue.confidence > 1) {
				errors.push(`issues[${i}].confidence: must be a number between 0 and 1, got ${issue.confidence}`);
			}

			// DONE without evidence is forbidden
			if (issue.status === 'DONE' && (issue.evidencePaths as unknown[]).length === 0) {
				errors.push(`issues[${i}] (${issue.id}): DONE status but no evidence paths`);
			}
		}
	}

	// ── commands (array) ──────────────────────────────────────────────────
	const commands = s.commands as unknown[];
	if (!Array.isArray(commands)) {
		errors.push('commands: must be an array');
	} else {
		for (let i = 0; i < commands.length; i++) {
			const cmd = commands[i] as Record<string, unknown>;
			if (typeof cmd.name !== 'string' || cmd.name.length === 0) {
				errors.push(`commands[${i}].name: must be a non-empty string`);
			}
			if (typeof cmd.command !== 'string' || cmd.command.length === 0) {
				errors.push(`commands[${i}].command: must be a non-empty string`);
			}
			if (typeof cmd.durationMs !== 'number') {
				errors.push(`commands[${i}].durationMs: must be a number`);
			}
		}
	}

	// ── tests ─────────────────────────────────────────────────────────────
	const tests = s.tests as Record<string, unknown> | undefined;
	if (!tests || typeof tests !== 'object') {
		errors.push('tests: must be an object with passed, failed, skipped, redTestsCovered');
	} else {
		if (typeof tests.passed !== 'number') {
			errors.push('tests.passed: must be a number');
		}
		if (typeof tests.failed !== 'number') {
			errors.push('tests.failed: must be a number');
		}
		if (typeof tests.skipped !== 'number') {
			errors.push('tests.skipped: must be a number');
		}
		if (!Array.isArray(tests.redTestsCovered)) {
			errors.push('tests.redTestsCovered: must be an array');
		}
	}

	// ── safety ────────────────────────────────────────────────────────────
	const safety = s.safety as Record<string, unknown> | undefined;
	if (!safety || typeof safety !== 'object') {
		errors.push('safety: must be an object');
	} else {
		if (typeof safety.secretsRedacted !== 'boolean') {
			errors.push('safety.secretsRedacted: must be a boolean');
		}
		if (!Array.isArray(safety.blockedActions)) {
			errors.push('safety.blockedActions: must be an array');
		}
		if (!Array.isArray(safety.warnings)) {
			errors.push('safety.warnings: must be an array');
		}
	}

	// ── conclusion ────────────────────────────────────────────────────────
	const conclusion = s.conclusion as Record<string, unknown> | undefined;
	if (!conclusion || typeof conclusion !== 'object') {
		errors.push('conclusion: must be an object');
	} else {
		if (!VALID_CONCLUSION_STATUSES.includes(conclusion.status as 'GREEN')) {
			errors.push(`conclusion.status: must be one of ${VALID_CONCLUSION_STATUSES.join(', ')}, got "${conclusion.status}"`);
		}
		if (typeof conclusion.confidence !== 'number' || conclusion.confidence < 0 || conclusion.confidence > 1) {
			errors.push(`conclusion.confidence: must be a number between 0 and 1, got ${conclusion.confidence}`);
		}
		if (!Array.isArray(conclusion.whatWorks)) {
			errors.push('conclusion.whatWorks: must be an array');
		}
		if (!Array.isArray(conclusion.whatDoesNotWork)) {
			errors.push('conclusion.whatDoesNotWork: must be an array');
		}
		if (!Array.isArray(conclusion.whatIsUnproven)) {
			errors.push('conclusion.whatIsUnproven: must be an array');
		}

		// GREEN requires all issues DONE with confidence >= 0.7 AND evidence paths
		if (conclusion.status === 'GREEN') {
			const issuesArr = (s.issues as BenchmarkIssueResult[]) ?? [];
			const allDone = issuesArr.every(
				(i) => i.status === 'DONE' && i.confidence >= 0.7 && i.evidencePaths.length > 0,
			);
			if (!allDone && issuesArr.length > 0) {
				errors.push('conclusion.status: GREEN requires all issues DONE with confidence >= 0.7 and evidence paths');
			}
		}
	}

	// ── capabilityDelta ───────────────────────────────────────────────────
	const delta = s.capabilityDelta as Record<string, unknown> | undefined;
	if (!delta || typeof delta !== 'object') {
		errors.push('capabilityDelta: must be an object');
	} else {
		if (!Array.isArray(delta.newCapabilities)) {
			errors.push('capabilityDelta.newCapabilities: must be an array');
		}
		if (!Array.isArray(delta.removedBlockers)) {
			errors.push('capabilityDelta.removedBlockers: must be an array');
		}
		if (!Array.isArray(delta.unchangedLimitations)) {
			errors.push('capabilityDelta.unchangedLimitations: must be an array');
		}
		if (!Array.isArray(delta.remainingRisks)) {
			errors.push('capabilityDelta.remainingRisks: must be an array');
		}
		if (typeof delta.nextBestStep !== 'string' || delta.nextBestStep.length === 0) {
			errors.push('capabilityDelta.nextBestStep: must be a non-empty string');
		}
	}

	// ── Secret detection in the serialized summary ─────────────────────────
	try {
		const json = JSON.stringify(s);
		if (containsSecrets(json)) {
			errors.push('summary contains potential secrets — must be redacted before evidence storage');
		}
	} catch {
		// JSON stringify failed — not a secret issue
	}

	return errors;
}
