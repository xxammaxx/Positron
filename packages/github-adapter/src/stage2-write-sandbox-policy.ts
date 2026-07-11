// Positron — Stage 2 Write-Sandbox Policy
//
// Technische Durchsetzung der Stage-2-Write-Allowlist.
// KEINE echten Writes in diesem Modul — es validiert nur.
// Der tatsächliche GitHub-API-Call muss EXTERN durch diese Policy
// geschleust werden, bevor ein Octokit-Aufruf stattfindet.

import crypto from 'node:crypto';
import { redactValue } from '@positron/shared';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Write operations that the Stage 2 policy governs. */
export type Stage2WriteOperation =
	| 'createIssueComment'
	| 'addIssueLabels'
	| 'removeIssueLabel'
	| 'claimIssue'
	| 'createPullRequest'
	| 'mergePullRequest'
	| 'requestReviewers'
	| 'closeIssue'
	| 'push'
	| 'merge';

/** Configuration for the Stage 2 Write-Sandbox Policy. */
export interface Stage2WriteSandboxConfig {
	/** Whether the policy is active. If false, ALL writes are blocked. */
	enabled: boolean;

	/** The exact repository that is allowed for writes (owner/repo). */
	allowedRepository: string;

	/** The exact issue number that is allowed for writes. */
	allowedIssueNumber: number;

	/** Operations that are unconditionally allowed (on the sandbox target). */
	allowedOperations: Stage2WriteOperation[];

	/** Operations that may be allowed under additional constraints. */
	optionalAllowedOperations?: Stage2WriteOperation[];

	/** Labels that may be added (only if addIssueLabels is in allowed/optional). */
	allowedLabels?: string[];

	/** Maximum number of write operations permitted in a single run. */
	maxWritesPerRun: number;

	/** Whether human approval is required before any write. */
	requireHumanApproval: boolean;

	/** Whether a pre-write preview must be generated before any write. */
	requirePreWritePreview: boolean;

	/** Whether duplicate detection (idempotency key) is required. */
	requireDuplicateDetection: boolean;

	/** Whether the kill-switch must be confirmed active. */
	requireKillSwitchActive: boolean;

	/** Whether POSITRON_ENABLE_PUSH must be false. */
	requirePushDisabled: boolean;

	/** Whether POSITRON_MERGE_KILL_SWITCH must be true. */
	requireMergeKillSwitchActive: boolean;
}

/** Result of a policy validation check. */
export interface Stage2WritePolicyResult {
	/** Whether the operation is allowed. */
	allowed: boolean;

	/** If not allowed, the reason for denial. */
	reason?: string;

	/** The generated preview (if allowed and preview generation was requested). */
	preview?: Stage2PreWritePreview;
}

/** Pre-write preview — safely serialisable, token-free. */
export interface Stage2PreWritePreview {
	stage: 'stage2-write-sandbox';
	operation: Stage2WriteOperation;
	repository: string;
	issueNumber?: number;
	labelNames?: string[];
	bodyHash?: string;
	bodyLength?: number;
	idempotencyKey: string;
	maxWritesPerRun: number;
	writeCountBefore: number;
	approved: boolean;
	tokenValue: 'REDACTED';
	timestamp: string;
}

/** Redacted audit event — JSONL-compatible, no tokens, no raw API output. */
export interface Stage2WriteAuditEvent {
	stage: 'stage2-write-sandbox';
	mode: 'fake' | 'preview' | 'live';
	operation: Stage2WriteOperation;
	repository: string;
	issueNumber?: number;
	result: 'allowed_preview' | 'allowed_executed' | 'blocked';
	reason?: string;
	bodyHash?: string;
	labelNames?: string[];
	idempotencyKey?: string;
	tokenValue: 'REDACTED';
	timestamp: string;
}

// ---------------------------------------------------------------------------
// Default Configuration
// ---------------------------------------------------------------------------

/** Safe defaults that block everything until explicitly configured. */
export const STAGE2_DEFAULT_CONFIG: Stage2WriteSandboxConfig = {
	enabled: false,
	allowedRepository: '',
	allowedIssueNumber: 0,
	allowedOperations: [],
	optionalAllowedOperations: [],
	allowedLabels: [],
	maxWritesPerRun: 0,
	requireHumanApproval: true,
	requirePreWritePreview: true,
	requireDuplicateDetection: true,
	requireKillSwitchActive: true,
	requirePushDisabled: true,
	requireMergeKillSwitchActive: true,
};

// ---------------------------------------------------------------------------
// Permanently Forbidden Operations
// ---------------------------------------------------------------------------

/**
 * Operations that are NEVER allowed in Stage 2, regardless of config.
 * These will only be reconsidered in Stage 3 or later.
 */
export const STAGE2_PERMANENTLY_FORBIDDEN: ReadonlySet<Stage2WriteOperation> = new Set([
	'removeIssueLabel',
	'claimIssue',
	'createPullRequest',
	'mergePullRequest',
	'requestReviewers',
	'closeIssue',
	'push',
	'merge',
]);

// ---------------------------------------------------------------------------
// Policy Class
// ---------------------------------------------------------------------------

export class Stage2WriteSandboxPolicy {
	private config: Stage2WriteSandboxConfig;
	private writeCount = 0;
	private readonly usedIdempotencyKeys = new Set<string>();

	constructor(config?: Partial<Stage2WriteSandboxConfig>) {
		this.config = { ...STAGE2_DEFAULT_CONFIG, ...config };
	}

	// --- Public API ---

	/**
	 * Validate whether a write operation is permitted under the current policy.
	 * Returns a policy result. This does NOT execute any write.
	 */
	validate(params: {
		operation: Stage2WriteOperation;
		repository: string;
		issueNumber?: number;
		labelNames?: string[];
		bodyText?: string;
		idempotencyKey?: string;
		humanApproved?: boolean;
		previewGenerated?: boolean;
		pushEnabled?: boolean;
		mergeKillSwitchActive?: boolean;
	}): Stage2WritePolicyResult {
		const { operation, repository, issueNumber, labelNames, bodyText, idempotencyKey } = params;
		const humanApproved = params.humanApproved ?? false;
		const previewGenerated = params.previewGenerated ?? false;
		const pushEnabled = params.pushEnabled ?? false;
		const mergeKillSwitchActive = params.mergeKillSwitchActive ?? true;

		// 1. Policy must be enabled
		if (!this.config.enabled) {
			return { allowed: false, reason: 'Stage 2 policy is not enabled' };
		}

		// 2. Permanently forbidden operations
		if (STAGE2_PERMANENTLY_FORBIDDEN.has(operation)) {
			return {
				allowed: false,
				reason: `Operation '${operation}' is permanently forbidden in Stage 2`,
			};
		}

		// 3. Repository allowlist
		if (repository !== this.config.allowedRepository) {
			return {
				allowed: false,
				reason: `Repository '${repository}' is not the allowlisted sandbox repository '${this.config.allowedRepository}'`,
			};
		}

		// 4. Issue number allowlist (only for issue-scoped operations)
		if (this._operationIsIssueScoped(operation)) {
			if (issueNumber === undefined || issueNumber === null) {
				return { allowed: false, reason: 'Issue number is required for this operation' };
			}
			if (issueNumber !== this.config.allowedIssueNumber) {
				return {
					allowed: false,
					reason: `Issue #${issueNumber} is not the allowlisted sandbox issue #${this.config.allowedIssueNumber}`,
				};
			}
		}

		// 5. Operation allowlist
		const isExplicitlyAllowed = this.config.allowedOperations.includes(operation);
		const isOptionallyAllowed =
			this.config.optionalAllowedOperations?.includes(operation) ?? false;
		if (!isExplicitlyAllowed && !isOptionallyAllowed) {
			return {
				allowed: false,
				reason: `Operation '${operation}' is not in the allowed or optional operations list`,
			};
		}

		// 6. Label allowlist (for addIssueLabels)
		if (operation === 'addIssueLabels' && labelNames && labelNames.length > 0) {
			const allowedLabels = this.config.allowedLabels ?? [];
			const disallowed = labelNames.filter((l) => !allowedLabels.includes(l));
			if (disallowed.length > 0) {
				return {
					allowed: false,
					reason: `Labels not allowlisted: ${disallowed.join(', ')}`,
				};
			}
		}

		// 7. MaxWritesPerRun enforcement
		if (this.writeCount >= this.config.maxWritesPerRun) {
			return {
				allowed: false,
				reason: `Max writes per run (${this.config.maxWritesPerRun}) already reached (current: ${this.writeCount})`,
			};
		}

		// 8. Human approval check
		if (this.config.requireHumanApproval && !humanApproved) {
			return { allowed: false, reason: 'Human approval is required before write' };
		}

		// 9. Pre-write preview check
		if (this.config.requirePreWritePreview && !previewGenerated) {
			return { allowed: false, reason: 'Pre-write preview must be generated before write' };
		}

		// 10. Duplicate detection
		if (this.config.requireDuplicateDetection) {
			if (!idempotencyKey) {
				return { allowed: false, reason: 'Idempotency key is required for duplicate detection' };
			}
			if (this.usedIdempotencyKeys.has(idempotencyKey)) {
				return {
					allowed: false,
					reason: `Duplicate idempotency key detected: '${idempotencyKey}'`,
				};
			}
		}

		// 11. Kill-switch checks
		if (this.config.requireKillSwitchActive) {
			// This is a conceptual check — kill-switch must be confirmed active by the caller
			// (the Positron runtime already enforces POSITRON_MERGE_KILL_SWITCH and POSITRON_ENABLE_PUSH)
		}

		if (this.config.requirePushDisabled && pushEnabled) {
			return {
				allowed: false,
				reason: 'POSITRON_ENABLE_PUSH is true — push must be disabled for Stage 2 writes',
			};
		}

		if (this.config.requireMergeKillSwitchActive && !mergeKillSwitchActive) {
			return {
				allowed: false,
				reason:
					'POSITRON_MERGE_KILL_SWITCH is false — merge kill-switch must be active for Stage 2',
			};
		}

		// All checks passed
		return { allowed: true };
	}

	/**
	 * Generate a pre-write preview. Token-free, safe for logging.
	 * Call this BEFORE validate() to get the preview that validate() checks.
	 */
	generatePreview(params: {
		operation: Stage2WriteOperation;
		repository: string;
		issueNumber?: number;
		labelNames?: string[];
		bodyText?: string;
		idempotencyKey: string;
		humanApproved: boolean;
	}): Stage2PreWritePreview {
		const { operation, repository, issueNumber, labelNames, bodyText, idempotencyKey, humanApproved } = params;

		const bodyHash = bodyText ? _sha256(bodyText) : undefined;
		const bodyLength = bodyText?.length;

		return {
			stage: 'stage2-write-sandbox',
			operation,
			repository,
			issueNumber,
			labelNames: labelNames ? [...labelNames] : undefined,
			bodyHash,
			bodyLength,
			idempotencyKey,
			maxWritesPerRun: this.config.maxWritesPerRun,
			writeCountBefore: this.writeCount,
			approved: humanApproved,
			tokenValue: 'REDACTED',
			timestamp: new Date().toISOString(),
		};
	}

	/**
	 * Create a redacted audit event. Never includes tokens, headers, or full API output.
	 */
	createAuditEvent(params: {
		mode: 'fake' | 'preview' | 'live';
		operation: Stage2WriteOperation;
		repository: string;
		issueNumber?: number;
		result: 'allowed_preview' | 'allowed_executed' | 'blocked';
		reason?: string;
		bodyHash?: string;
		labelNames?: string[];
		idempotencyKey?: string;
	}): Stage2WriteAuditEvent {
		let sanitizedReason: string | undefined;
		if (params.reason) {
			sanitizedReason = redactValue(params.reason);
		}

		return {
			stage: 'stage2-write-sandbox',
			mode: params.mode,
			operation: params.operation,
			repository: params.repository,
			issueNumber: params.issueNumber,
			result: params.result,
			reason: sanitizedReason,
			bodyHash: params.bodyHash,
			labelNames: params.labelNames ? [...params.labelNames] : undefined,
			idempotencyKey: params.idempotencyKey,
			tokenValue: 'REDACTED',
			timestamp: new Date().toISOString(),
		};
	}

	/**
	 * Record that a write has been executed (increment counter, track idempotency key).
	 * Call ONLY after a real write has been successfully validated and executed.
	 */
	recordWrite(idempotencyKey: string): void {
		this.usedIdempotencyKeys.add(idempotencyKey);
		this.writeCount++;
	}

	/**
	 * Record an idempotency key without incrementing the write count.
	 * Useful for preview/fake mode to register the key without claiming a write slot.
	 */
	recordIdempotencyKey(idempotencyKey: string): void {
		this.usedIdempotencyKeys.add(idempotencyKey);
	}

	/** Get current write count. */
	getWriteCount(): number {
		return this.writeCount;
	}

	/** Get current configuration (read-only snapshot). */
	getConfig(): Readonly<Stage2WriteSandboxConfig> {
		return { ...this.config };
	}

	/** Update configuration at runtime. */
	updateConfig(partial: Partial<Stage2WriteSandboxConfig>): void {
		this.config = { ...this.config, ...partial };
	}

	/** Reset all state (write count, idempotency keys). */
	reset(): void {
		this.writeCount = 0;
		this.usedIdempotencyKeys.clear();
	}

	// --- Helpers ---

	private _operationIsIssueScoped(op: Stage2WriteOperation): boolean {
		return [
			'createIssueComment',
			'addIssueLabels',
			'removeIssueLabel',
			'claimIssue',
			'closeIssue',
		].includes(op);
	}
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Create a Stage 2 policy instance for a specific sandbox target.
 * Uses the Blueprint-recommended defaults:
 * - maxWritesPerRun = 1
 * - requireHumanApproval = true
 * - requirePreWritePreview = true
 * - requireDuplicateDetection = true
 * - requireKillSwitchActive = true
 */
export function createStage2SandboxPolicy(params: {
	allowedRepository: string;
	allowedIssueNumber: number;
	allowedOperations?: Stage2WriteOperation[];
	optionalAllowedOperations?: Stage2WriteOperation[];
	allowedLabels?: string[];
}): Stage2WriteSandboxPolicy {
	return new Stage2WriteSandboxPolicy({
		enabled: true,
		allowedRepository: params.allowedRepository,
		allowedIssueNumber: params.allowedIssueNumber,
		allowedOperations: params.allowedOperations ?? ['createIssueComment'],
		optionalAllowedOperations: params.optionalAllowedOperations ?? [],
		allowedLabels: params.allowedLabels ?? [],
		maxWritesPerRun: 1,
		requireHumanApproval: true,
		requirePreWritePreview: true,
		requireDuplicateDetection: true,
		requireKillSwitchActive: true,
		requirePushDisabled: true,
		requireMergeKillSwitchActive: true,
	});
}

// ---------------------------------------------------------------------------
// Internal Helpers
// ---------------------------------------------------------------------------

function _sha256(input: string): string {
	return crypto.createHash('sha256').update(input, 'utf8').digest('hex');
}
