// Positron — OpenCodeDryRunAgent (Issue #263)
//
// Provides safe, side-effect-free dry-run simulation of OpenCode adapter
// flows. All write, push, PR, merge, branch-delete, worktree, and force-push
// operations are blocked. Read-only operations are simulated. Kill switches
// are acknowledged, respected, and never bypassed.
//
// Stash Policy: No code from stash@{0} was applied.

import fs from 'node:fs';
import path from 'node:path';
import type {
	OpenCodeRunInput,
	ExecutionMode,
	OpenCodePhase,
} from '@positron/shared';

// =============================================================================
// Types (package-local, per ADR-D)
// =============================================================================

/**
 * Structured evidence report for dry-run execution.
 */
export interface EvidenceReport {
	runId: string;
	executionMode: ExecutionMode;
	timestamp: string;
	source: string;
	durationMs: number;
	status: 'success' | 'partial' | 'blocked' | 'failed';
	simulatedActions: string[];
	blockedActions: { operation: string; reason: string }[];
	reportedActions: string[];
	warnings: string[];
	changedFiles: string[];
	summary: string;
}

/**
 * A planned action to analyze during dry-run.
 */
export interface ActionPlan {
	/** Optional OpenCode phase context */
	phase?: OpenCodePhase;
	/** Operation identifier (e.g., 'git push', 'write file', 'gh pr create') */
	operation: string;
	/** Target of the operation (e.g., file path, branch name) */
	target?: string;
	/** Additional arguments */
	args?: Record<string, unknown>;
}

/**
 * Configuration for the OpenCodeDryRunAgent.
 */
export interface DryRunAgentConfig {
	/** Directory for evidence output (default: '.positron/evidence/') */
	evidenceDir?: string;
	/** Additional operations to block beyond the default set */
	blockedOperations?: string[];
	/**
	 * Timestamp factory for deterministic testing.
	 * Default: () => new Date().toISOString().
	 */
	getTimestamp?: () => string;
}

// =============================================================================
// Operation Classification (ADR-C: Three-Tier Model)
// =============================================================================

type Classification = 'simulated' | 'blocked' | 'reported';

/**
 * Blocked operation patterns — write, destructive, and GitHub-mutating operations.
 * These are always blocked in dry-run mode (SR1, SR3).
 */
const DEFAULT_BLOCKED_PATTERNS: string[] = [
	'write file',
	'git add',
	'git commit',
	'git push',
	'git merge',
	'git branch -d',
	'git branch -D',
	'git worktree add',
	'gh pr create',
	'gh pr merge',
	'npm install',
	'npm publish',
	'npm uninstall',
	'force-push',
	'git push --force',
	'git push -f',
];

/**
 * Simulated operation patterns — read-only, side-effect-free.
 * These are recorded as "would be performed" without any execution.
 */
const DEFAULT_SIMULATED_PATTERNS: string[] = [
	'git status',
	'git log',
	'git diff',
	'gh issue view',
	'gh issue list',
	'gh pr view',
	'gh pr list',
	'npm test',
	'typecheck',
	'file read',
];

/**
 * Classify an operation into one of three tiers.
 * Pure function — no side effects, no I/O.
 */
function classifyOperation(
	op: string,
	additionalBlocked: string[],
): Classification {
	const normalized = op.toLowerCase().trim();

	// Check explicit blocked patterns (user-defined + defaults)
	for (const pattern of [...DEFAULT_BLOCKED_PATTERNS, ...additionalBlocked]) {
		if (normalized.includes(pattern.toLowerCase())) {
			return 'blocked';
		}
	}

	// Check simulated patterns
	for (const pattern of DEFAULT_SIMULATED_PATTERNS) {
		if (normalized.includes(pattern.toLowerCase())) {
			return 'simulated';
		}
	}

	// Default: reported (informational, neither simulated nor blocked)
	return 'reported';
}

// =============================================================================
// Kill Switch Integration (ADR-E)
// =============================================================================

/**
 * Check if an operation is blocked by a Positron kill switch.
 * Returns the reason string if blocked, null otherwise.
 * Never bypasses kill switches — even in dry-run.
 */
function checkKillSwitch(op: string): string | null {
	const normalized = op.toLowerCase().trim();

	// POSITRON_ENABLE_PUSH: push operations require explicit opt-in
	if (
		(normalized.includes('push') || normalized.includes('force-push')) &&
		process.env['POSITRON_ENABLE_PUSH'] !== 'true'
	) {
		return 'POSITRON_ENABLE_PUSH is not set to "true" — push would be blocked';
	}

	// POSITRON_MERGE_KILL_SWITCH: merge and branch-delete blocked if active
	if (
		(normalized.includes('merge') || normalized.includes('branch -d') || normalized.includes('branch -d')) &&
		process.env['POSITRON_MERGE_KILL_SWITCH'] !== 'false'
	) {
		return 'POSITRON_MERGE_KILL_SWITCH is active — merge/branch-delete would be blocked';
	}

	return null;
}

/**
 * Controlled paths where file writes are allowed (simulated, not blocked).
 * Includes .positron/test-artifacts/ and .positron/evidence/ directories.
 */
const CONTROLLED_PATH_PREFIXES = [
	'.positron/test-artifacts',
	'.positron/evidence',
	'.positron\\test-artifacts',
	'.positron\\evidence',
];

function isControlledPath(target: string): boolean {
	const normalized = target.replace(/\\/g, '/').toLowerCase();
	return CONTROLLED_PATH_PREFIXES.some(
		(prefix) => normalized.startsWith(prefix.replace(/\\/g, '/').toLowerCase()),
	);
}

// =============================================================================
// OpenCodeDryRunAgent
// =============================================================================

/**
 * OpenCodeDryRunAgent — dry-run simulation of OpenCode adapter flows.
 *
 * Analyzes planned actions without executing them. Write, push, PR, merge,
 * branch-delete, worktree, and force-push operations are blocked. Read-only
 * operations are simulated. Kill switches are never bypassed.
 *
 * Only active when POSITRON_ENABLE_DRY_RUN='true' (or NODE_ENV='test').
 */
export class OpenCodeDryRunAgent {
	private readonly evidenceDir: string;
	private readonly extraBlocked: string[];
	private readonly getTimestamp: () => string;

	constructor(config: DryRunAgentConfig = {}) {
		// Gate: must be explicitly enabled (ADR-E)
		if (
			process.env['NODE_ENV'] !== 'test' &&
			process.env['POSITRON_ENABLE_DRY_RUN'] !== 'true'
		) {
			throw new Error(
				'Dry-run agent disabled: POSITRON_ENABLE_DRY_RUN not set to "true"',
			);
		}

		this.evidenceDir = config.evidenceDir ?? '.positron/evidence/';
		this.extraBlocked = config.blockedOperations ?? [];
		this.getTimestamp =
			config.getTimestamp ?? (() => new Date().toISOString());
	}

	/**
	 * Analyze a set of planned actions and produce an EvidenceReport.
	 * Classifies each action as simulated, blocked, or reported.
	 * Never executes any action.
	 */
	async analyzeActions(
		plannedActions: ActionPlan[],
		input: OpenCodeRunInput,
	): Promise<EvidenceReport> {
		const startTime = Date.now();

		const simulatedActions: string[] = [];
		const blockedActions: { operation: string; reason: string }[] = [];
		const reportedActions: string[] = [];
		const warnings: string[] = [];

		// Collect kill switch warnings upfront
		if (
			process.env['POSITRON_MERGE_KILL_SWITCH'] !== 'false'
		) {
			warnings.push(
				'POSITRON_MERGE_KILL_SWITCH is active — merge would be blocked',
			);
		}
		if (process.env['POSITRON_ENABLE_PUSH'] !== 'true') {
			warnings.push(
				'POSITRON_ENABLE_PUSH is not set to "true" — push would be blocked',
			);
		}

		for (const action of plannedActions) {
			const op = action.operation;

			// First, check kill switches (takes precedence over classification)
			const killReason = checkKillSwitch(op);
			if (killReason) {
				blockedActions.push({ operation: op, reason: killReason });
				continue;
			}

			// Classify the operation
			let classification = classifyOperation(op, this.extraBlocked);

			// Path-aware override: file writes to controlled paths are simulated, not blocked
			if (
				classification === 'blocked' &&
				op.toLowerCase().includes('write') &&
				action.target
			) {
				if (isControlledPath(action.target)) {
					classification = 'simulated';
				}
			}

			switch (classification) {
				case 'simulated':
					simulatedActions.push(op);
					break;
				case 'blocked': {
					// Determine a specific blocking reason
					let reason = `Operation "${op}" is blocked in dry-run mode`;
					if (op.toLowerCase().includes('write')) {
						reason =
							'Blocked: File write outside controlled path is prohibited in dry-run';
					} else if (op.toLowerCase().includes('push')) {
						reason =
							'Blocked: Git push is prohibited in dry-run';
					} else if (op.toLowerCase().includes('pr create')) {
						reason =
							'Blocked: Pull request creation is prohibited in dry-run';
					} else if (op.toLowerCase().includes('merge')) {
						reason =
							'Blocked: Git merge is prohibited in dry-run';
					} else if (op.toLowerCase().includes('branch -d')) {
						reason =
							'Blocked: Branch deletion is prohibited in dry-run';
					} else if (op.toLowerCase().includes('worktree')) {
						reason =
							'Blocked: Worktree creation is prohibited in dry-run';
					} else if (
						op.toLowerCase().includes('npm install') ||
						op.toLowerCase().includes('npm publish') ||
						op.toLowerCase().includes('npm uninstall')
					) {
						reason =
							'Blocked: Package installation/publishing is prohibited in dry-run';
					} else if (op.toLowerCase().includes('commit')) {
						reason =
							'Blocked: Git commit is prohibited in dry-run';
					}

					// Ensure reason NEVER contains env var values, tokens, or credentials (SR4, SR5)
					blockedActions.push({ operation: op, reason });
					break;
				}
				case 'reported':
					reportedActions.push(op);
					break;
			}
		}

		const hasBlocked = blockedActions.length > 0;
		const hasSimulated = simulatedActions.length > 0;
		const hasReported = reportedActions.length > 0;

		let status: EvidenceReport['status'];
		if (hasBlocked && !hasSimulated && !hasReported) {
			status = 'blocked';
		} else if (hasBlocked) {
			status = 'partial';
		} else if (hasSimulated || hasReported) {
			status = 'success';
		} else {
			status = 'success';
		}

		const report: EvidenceReport = {
			runId: input.runId,
			executionMode: 'dry-run',
			timestamp: this.getTimestamp(),
			source: 'OpenCodeDryRunAgent',
			durationMs: Date.now() - startTime,
			status,
			simulatedActions,
			blockedActions,
			reportedActions,
			warnings,
			changedFiles: [],
			summary: `Dry-run analysis: ${simulatedActions.length} simulated, ${blockedActions.length} blocked, ${reportedActions.length} reported`,
		};

		// Write evidence to .positron/evidence/<runId>.json
		this.writeEvidence(report);

		return report;
	}

	/**
	 * Report intended slash command execution without running it.
	 * Never executes the actual command — returns an EvidenceReport.
	 */
	async runSlashCommand(
		command: string,
		input: OpenCodeRunInput,
	): Promise<EvidenceReport> {
		const startTime = Date.now();

		const report: EvidenceReport = {
			runId: input.runId,
			executionMode: 'dry-run',
			timestamp: this.getTimestamp(),
			source: 'OpenCodeDryRunAgent',
			durationMs: Date.now() - startTime,
			status: 'success',
			simulatedActions: [`command:${command}`],
			blockedActions: [],
			reportedActions: [],
			warnings: [],
			changedFiles: [],
			summary: `Dry-run: slash command "${command}" would be executed`,
		};

		this.writeEvidence(report);
		return report;
	}

	/**
	 * Write evidence to .positron/evidence/<runId>.json.
	 * Controlled path only. No secrets included.
	 */
	private writeEvidence(report: EvidenceReport): void {
		try {
			const dir = this.evidenceDir;
			fs.mkdirSync(dir, { recursive: true });
			const filePath = path.join(dir, `${report.runId}.json`);
			fs.writeFileSync(filePath, JSON.stringify(report, null, 2), 'utf-8');
			// Evidence files are internal infrastructure, NOT user-visible changed files.
			// changedFiles remains empty for pure dry-run.
		} catch {
			report.warnings.push('Failed to write evidence file');
		}
	}
}
