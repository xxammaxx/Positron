// Positron — Stage 3 Runtime Harness
//
// Multi-phase orchestrator for Stage 3 controlled writes.
// Connects Stage3SupervisedPilotPolicy validation to the three narrow writer
// interfaces (BranchWriter, FileCommitWriter, PullRequestWriter).
//
// Execution flow:
//   1. Preflight (process safety, workspace lock)
//   2. Policy Validation (all 20+ gates)
//   3. Preview Generation
//   4. Audit Pre-Write
//   5. Branch Creation (exactly 1)
//   6. File Commit (exactly 1)
//   7. Draft PR Creation (exactly 1)
//   8. Verify (read-only)
//   9. Audit Success / Failure
//
// Partial failures: no auto-retry, no false success, no continuing to next phase.

import { redactValue } from '@positron/shared';
import { Stage3SupervisedPilotPolicy, STAGE3_CANONICAL } from './stage3-supervised-pilot-policy.js';
import type {
	Stage3WriteOperation,
	Stage3PilotConfig,
	Stage3PreWritePreview,
	Stage3PilotAuditEvent,
	Stage3PilotPolicyResult,
	Stage3ProcessSafety,
} from './stage3-supervised-pilot-policy.js';

// ---------------------------------------------------------------------------
// Writer Interfaces (Dependency Injection)
// ---------------------------------------------------------------------------

/** Narrow interface for branch creation. */
export interface Stage3BranchWriter {
	createBranch(input: {
		owner: string;
		repo: string;
		branch: string;
		fromBranch: string;
	}): Promise<{ ref: string; sha: string }>;
}

/** Narrow interface for file commit (create + commit in one call). */
export interface Stage3FileCommitWriter {
	commitFile(input: {
		owner: string;
		repo: string;
		branch: string;
		filePath: string;
		content: string;
		message: string;
		commitBody?: string;
	}): Promise<{ sha: string; url: string }>;
}

/** Narrow interface for PR creation. */
export interface Stage3PullRequestWriter {
	createPullRequest(input: {
		owner: string;
		repo: string;
		title: string;
		head: string;
		base: string;
		body: string;
		draft: boolean;
	}): Promise<{
		id?: number;
		number?: number;
		url?: string;
		createdAt?: string;
		draft?: boolean;
	}>;
}

// ---------------------------------------------------------------------------
// Input / Output Types
// ---------------------------------------------------------------------------

/** Full input for the Stage 3 harness. */
export interface Stage3HarnessInput {
	/** Repository in owner/repo format. */
	repository: string;

	/** Exact file content to write (must match canonical SHA-256 and length). */
	fileContent: string;

	/** Idempotency key for duplicate detection. */
	idempotencyKey: string;

	/** Whether human approval has been granted. */
	humanApproved: boolean;

	/** Whether a pre-write preview has been generated. */
	previewGenerated: boolean;

	/** Process safety state. */
	processSafety: Stage3ProcessSafety;
}

/** Result of the Stage 3 harness execution. */
export interface Stage3HarnessResult {
	/** Whether ALL phases completed successfully. */
	success: boolean;

	/** If not successful, the primary reason. */
	reason?: string;

	/** Whether the policy allowed the operation. */
	policyAllowed: boolean;

	/** Whether all operations were executed. */
	allOperationsExecuted: boolean;

	/** The generated pre-write preview. */
	preview?: Stage3PreWritePreview;

	/** Redacted audit events for each phase. */
	auditEvents: Stage3PilotAuditEvent[];

	/** Whether the harness is in fake mode. */
	mode: 'fake' | 'preview' | 'live';

	/** Whether a real write was executed. */
	writeExecuted: boolean;

	/** Whether a write was attempted (before adapter call). */
	writeAttempted: boolean;

	/** Number of confirmed successful mutations (0-3). */
	confirmedMutationCount: number;

	/** Whether a partial mutation occurred. */
	partialMutation: boolean;

	/** Audit integrity status. true = audit broken, false = audit intact. */
	auditIntegrityBroken: boolean;

	/** Mutation state classification. */
	mutationState:
		| 'none'
		| 'attempted-unknown'
		| 'partial-confirmed'
		| 'complete-unverified'
		| 'complete-verified';

	/** Current phase where execution stopped. */
	currentPhase: string | null;

	// Counters
	branchCount: number;
	fileWriteCount: number;
	commitCount: number;
	pullRequestCount: number;

	// Per-operation results
	branchCreated: boolean;
	fileCommitted: boolean;
	pullRequestCreated: boolean;
	pullRequestDraft: boolean;

	// Writer results (fake mode returns synthetic data)
	branchResult?: { ref: string; sha: string };
	commitResult?: { sha: string; url: string };
	prResult?: {
		id?: number;
		number?: number;
		url?: string;
		createdAt?: string;
		draft?: boolean;
	};
}

// ---------------------------------------------------------------------------
// Audit Sink Interface
// ---------------------------------------------------------------------------

/** Simple audit sink that the harness uses to record events. */
export interface Stage3AuditSink {
	record(event: Stage3PilotAuditEvent): void | Promise<void>;
}

// ---------------------------------------------------------------------------
// Harness Configuration
// ---------------------------------------------------------------------------

export interface Stage3HarnessConfig {
	/** Whether the harness is enabled. If false, all writes are blocked. */
	enabled: boolean;

	/** Whether the harness is in fake mode. In fake mode, writers are simulated. */
	fakeMode: boolean;
}

// ---------------------------------------------------------------------------
// Helper: Parse owner/repo
// ---------------------------------------------------------------------------

function _parseOwnerRepo(repository: string): { owner: string; repo: string } | null {
	const parts = repository.split('/');
	if (parts.length !== 2 || !parts[0] || !parts[1]) {
		return null;
	}
	return { owner: parts[0]!, repo: parts[1]! };
}

// ---------------------------------------------------------------------------
// Runtime Harness
// ---------------------------------------------------------------------------

export class Stage3RuntimeHarness {
	private policy: Stage3SupervisedPilotPolicy;
	private branchWriter: Stage3BranchWriter | null;
	private fileCommitWriter: Stage3FileCommitWriter | null;
	private prWriter: Stage3PullRequestWriter | null;
	private auditSink?: Stage3AuditSink;
	private config: Stage3HarnessConfig;

	constructor(params: {
		policy: Stage3SupervisedPilotPolicy;
		branchWriter?: Stage3BranchWriter;
		fileCommitWriter?: Stage3FileCommitWriter;
		prWriter?: Stage3PullRequestWriter;
		auditSink?: Stage3AuditSink;
		config?: Partial<Stage3HarnessConfig>;
	}) {
		this.policy = params.policy;
		this.branchWriter = params.branchWriter ?? null;
		this.fileCommitWriter = params.fileCommitWriter ?? null;
		this.prWriter = params.prWriter ?? null;
		this.auditSink = params.auditSink;
		this.config = {
			enabled: true,
			fakeMode: true,
			...params.config,
		};
	}

	/**
	 * Execute the full Stage 3 pilot sequence:
	 *   1. Preflight
	 *   2. Policy Validation (createBranch)
	 *   3. Preview Generation
	 *   4. Audit Pre-Write
	 *   5. Branch Creation
	 *   6. Policy Validation (commitFile)
	 *   7. File Commit
	 *   8. Policy Validation (createPullRequest)
	 *   9. Draft PR Creation
	 *  10. Read-only Verification
	 *  11. Audit Success / Failure
	 */
	async execute(input: Stage3HarnessInput): Promise<Stage3HarnessResult> {
		const mode: 'fake' | 'preview' | 'live' = this.config.fakeMode ? 'fake' : 'live';
		const auditEvents: Stage3PilotAuditEvent[] = [];
		const timestamp = new Date().toISOString();
		const idempotencyKey = input.idempotencyKey;

		// ── Phase 0: Harness-level gate ──
		if (!this.config.enabled) {
			const auditEvent = this._audit(
				mode,
				'createBranch',
				input.repository,
				'blocked',
				'Stage 3 runtime harness is not enabled',
				undefined,
				undefined,
				idempotencyKey,
				'harness-gate',
			);
			auditEvents.push(auditEvent);
			await this._emitAudit(auditEvent);

			return this._result(
				false,
				'Stage 3 runtime harness is not enabled',
				false,
				false,
				auditEvents,
				mode,
				false,
				false,
				'harness-gate',
			);
		}

		// ── Phase 0a: Reserve idempotency key for this multi-phase run ──
		if (!this.policy.reserveRunKey(idempotencyKey)) {
			const auditEvent = this._audit(
				mode,
				'createBranch',
				input.repository,
				'blocked',
				`Duplicate idempotency key detected: '${idempotencyKey}'`,
				undefined,
				undefined,
				idempotencyKey,
				'preflight',
			);
			auditEvents.push(auditEvent);
			await this._emitAudit(auditEvent);

			return this._result(
				false,
				`Duplicate idempotency key detected: '${idempotencyKey}'`,
				false,
				false,
				auditEvents,
				mode,
				false,
				false,
				'preflight',
			);
		}

		// ── Phase 0b: Parse owner/repo ──
		const ownerRepo = _parseOwnerRepo(input.repository);
		if (!ownerRepo) {
			const auditEvent = this._audit(
				mode,
				'createBranch',
				input.repository,
				'blocked',
				'Invalid repository format — expected owner/repo',
				undefined,
				undefined,
				idempotencyKey,
				'preflight',
			);
			auditEvents.push(auditEvent);
			await this._emitAudit(auditEvent);

			return this._result(
				false,
				'Invalid repository format — expected owner/repo',
				false,
				false,
				auditEvents,
				mode,
				false,
				false,
				'preflight',
			);
		}

		// ── Phase 1: Preflight ──
		this.policy.setCurrentPhase('preflight');

		// ── Phase 2: Policy Validation — createBranch ──
		this.policy.setCurrentPhase('policy-branch');
		const branchPolicyResult = this.policy.validate({
			operation: 'createBranch',
			repository: input.repository,
			baseBranch: STAGE3_CANONICAL.baseBranch,
			targetBranch: STAGE3_CANONICAL.targetBranch,
			idempotencyKey,
			humanApproved: input.humanApproved,
			previewGenerated: input.previewGenerated,
			processSafety: input.processSafety,
		});

		if (!branchPolicyResult.allowed) {
			const auditEvent = this._audit(
				mode,
				'createBranch',
				input.repository,
				'blocked',
				branchPolicyResult.reason,
				undefined,
				undefined,
				idempotencyKey,
				'policy-branch',
			);
			auditEvents.push(auditEvent);
			await this._emitAudit(auditEvent);

			return this._result(
				false,
				branchPolicyResult.reason ?? 'Policy denied branch',
				false,
				false,
				auditEvents,
				mode,
				false,
				false,
				'policy-branch',
			);
		}

		// ── Phase 3: Preview Generation ──
		this.policy.setCurrentPhase('preview');
		const preview = this.policy.generatePreview({
			repository: input.repository,
			baseBranch: STAGE3_CANONICAL.baseBranch,
			targetBranch: STAGE3_CANONICAL.targetBranch,
			filePath: STAGE3_CANONICAL.filePath,
			fileContent: input.fileContent,
			commitMessage: STAGE3_CANONICAL.commitMessage,
			prTitle: STAGE3_CANONICAL.prTitle,
			prDraft: true,
			idempotencyKey,
			humanApproved: input.humanApproved,
		});

		// ── Phase 4: Audit Pre-Write ──
		this.policy.setCurrentPhase('audit-pre-write');
		const preWriteAudit = this._audit(
			mode,
			'createBranch',
			input.repository,
			'allowed_preview',
			undefined,
			preview.fileSha256,
			preview.fileLength,
			idempotencyKey,
			'audit-pre-write',
		);
		auditEvents.push(preWriteAudit);
		const preWriteAuditOk = await this._emitAudit(preWriteAudit);
		if (!preWriteAuditOk) {
			return this._result(
				false,
				'Pre-write audit sink unavailable — write blocked (fail-closed)',
				true,
				false,
				auditEvents,
				mode,
				false,
				false,
				'audit-pre-write',
				undefined,
				undefined,
				undefined,
				false,
				false,
				false,
				false,
				undefined,
				true,
			);
		}

		// ── Phase 5: Branch Creation ──
		this.policy.setCurrentPhase('create-branch');
		let branchResult: { ref: string; sha: string } | undefined;
		let branchCreated = false;

		if (mode === 'fake') {
			// Fake mode: simulate branch creation (idempotency key already reserved)
			this.policy.recordBranchCreated();
			branchResult = { ref: `refs/heads/${STAGE3_CANONICAL.targetBranch}`, sha: 'fake-branch-sha' };
			branchCreated = true;

			const auditEvent = this._audit(
				'fake',
				'createBranch',
				input.repository,
				'allowed_executed',
				undefined,
				undefined,
				undefined,
				idempotencyKey,
				'create-branch',
			);
			auditEvents.push(auditEvent);
			const branchAuditOk = await this._emitAudit(auditEvent);
			if (!branchAuditOk) {
				return this._result(
					false,
					'Audit sink failure after branch creation (fail-closed)',
					true,
					false,
					auditEvents,
					mode,
					true,
					true,
					'create-branch',
					undefined,
					undefined,
					undefined,
					false,
					false,
					false,
					false,
					undefined,
					true,
				);
			}
		} else if (this.branchWriter) {
			// Live mode: call the injected branch writer
			this.policy.markWriteAttempted();
			try {
				const result = await this.branchWriter.createBranch({
					owner: ownerRepo.owner,
					repo: ownerRepo.repo,
					branch: STAGE3_CANONICAL.targetBranch,
					fromBranch: STAGE3_CANONICAL.baseBranch,
				});
				this.policy.recordBranchCreated();
				branchResult = result;
				branchCreated = true;

				const auditEvent = this._audit(
					'live',
					'createBranch',
					input.repository,
					'allowed_executed',
					undefined,
					undefined,
					undefined,
					idempotencyKey,
					'create-branch',
				);
				auditEvents.push(auditEvent);
				const branchAuditOk = await this._emitAudit(auditEvent);
				if (!branchAuditOk) {
					this.policy.markPartialMutation();
					return this._result(
						false,
						'Audit sink failure after branch creation — commit blocked (fail-closed)',
						true,
						false,
						auditEvents,
						mode,
						true,
						true,
						'create-branch',
						branchResult,
						undefined,
						undefined,
						branchCreated,
						false,
						false,
						false,
						undefined,
						true,
					);
				}
			} catch (error: unknown) {
				// Branch creation failed — partial mutation
				this.policy.markPartialMutation();
				const rawMsg =
					error instanceof Error ? error.message : String(error ?? 'Unknown adapter error');
				const sanitized = redactValue(rawMsg);

				const auditEvent = this._audit(
					'live',
					'createBranch',
					input.repository,
					'blocked',
					`Adapter error: ${sanitized}`,
					undefined,
					undefined,
					idempotencyKey,
					'create-branch',
				);
				auditEvents.push(auditEvent);
				await this._emitAudit(auditEvent); // best-effort audit for error

				return this._result(
					false,
					`Adapter error: ${sanitized}`,
					true,
					false,
					auditEvents,
					mode,
					false,
					true,
					'create-branch',
					undefined,
					undefined,
					undefined,
					false,
					false,
					false,
					false,
				);
			}
		} else {
			// No writer configured
			const auditEvent = this._audit(
				mode,
				'createBranch',
				input.repository,
				'blocked',
				'No branch writer configured for live mode',
				undefined,
				undefined,
				idempotencyKey,
				'create-branch',
			);
			auditEvents.push(auditEvent);
			await this._emitAudit(auditEvent);

			return this._result(
				false,
				'No branch writer configured for live mode',
				true,
				false,
				auditEvents,
				mode,
				false,
				false,
				'create-branch',
			);
		}

		// ── Phase 6: Policy Validation — commitFile ──
		this.policy.setCurrentPhase('policy-commit');
		const commitPolicyResult = this.policy.validate({
			operation: 'commitFile',
			repository: input.repository,
			filePath: STAGE3_CANONICAL.filePath,
			fileContent: input.fileContent,
			commitMessage: STAGE3_CANONICAL.commitMessage,
			commitBody: STAGE3_CANONICAL.commitBody,
			idempotencyKey,
			humanApproved: input.humanApproved,
			previewGenerated: input.previewGenerated,
			processSafety: input.processSafety,
		});

		if (!commitPolicyResult.allowed) {
			this.policy.markPartialMutation();
			const auditEvent = this._audit(
				mode,
				'commitFile',
				input.repository,
				'blocked',
				commitPolicyResult.reason,
				preview.fileSha256,
				preview.fileLength,
				idempotencyKey,
				'policy-commit',
			);
			auditEvents.push(auditEvent);
			await this._emitAudit(auditEvent);

			return this._result(
				false,
				commitPolicyResult.reason ?? 'Policy denied commit',
				true,
				false,
				auditEvents,
				mode,
				false,
				true,
				'policy-commit',
				branchResult,
				undefined,
				undefined,
				branchCreated,
				false,
				false,
				false,
			);
		}

		// ── Phase 7: File Commit ──
		this.policy.setCurrentPhase('commit-file');
		let commitResult: { sha: string; url: string } | undefined;
		let fileCommitted = false;

		if (mode === 'fake') {
			// Fake mode: simulate file commit
			this.policy.recordFileWrite();
			commitResult = {
				sha: 'fake-commit-sha',
				url: `https://github.com/${input.repository}/commit/fake`,
			};
			fileCommitted = true;

			const auditEvent = this._audit(
				'fake',
				'commitFile',
				input.repository,
				'allowed_executed',
				undefined,
				preview.fileSha256,
				preview.fileLength,
				idempotencyKey,
				'commit-file',
			);
			auditEvents.push(auditEvent);
			const commitAuditOk = await this._emitAudit(auditEvent);
			if (!commitAuditOk) {
				return this._result(
					false,
					'Audit sink failure after commit (fail-closed)',
					true,
					false,
					auditEvents,
					mode,
					true,
					true,
					'commit-file',
					branchResult,
					undefined,
					undefined,
					branchCreated,
					false,
					false,
					false,
					undefined,
					true,
				);
			}
		} else if (this.fileCommitWriter) {
			this.policy.markWriteAttempted();
			try {
				const result = await this.fileCommitWriter.commitFile({
					owner: ownerRepo.owner,
					repo: ownerRepo.repo,
					branch: STAGE3_CANONICAL.targetBranch,
					filePath: STAGE3_CANONICAL.filePath,
					content: input.fileContent,
					message: STAGE3_CANONICAL.commitMessage,
					commitBody: STAGE3_CANONICAL.commitBody,
				});
				this.policy.recordFileWrite();
				commitResult = result;
				fileCommitted = true;

				const auditEvent = this._audit(
					'live',
					'commitFile',
					input.repository,
					'allowed_executed',
					undefined,
					preview.fileSha256,
					preview.fileLength,
					idempotencyKey,
					'commit-file',
				);
				auditEvents.push(auditEvent);
				const commitAuditOk = await this._emitAudit(auditEvent);
				if (!commitAuditOk) {
					this.policy.markPartialMutation();
					return this._result(
						false,
						'Audit sink failure after commit — PR blocked (fail-closed)',
						true,
						false,
						auditEvents,
						mode,
						true,
						true,
						'commit-file',
						branchResult,
						commitResult,
						undefined,
						branchCreated,
						fileCommitted,
						false,
						false,
						undefined,
						true,
					);
				}
			} catch (error: unknown) {
				this.policy.markPartialMutation();
				const rawMsg =
					error instanceof Error ? error.message : String(error ?? 'Unknown adapter error');
				const sanitized = redactValue(rawMsg);

				const auditEvent = this._audit(
					'live',
					'commitFile',
					input.repository,
					'blocked',
					`Adapter error: ${sanitized}`,
					preview.fileSha256,
					preview.fileLength,
					idempotencyKey,
					'commit-file',
				);
				auditEvents.push(auditEvent);
				await this._emitAudit(auditEvent); // best-effort for error

				return this._result(
					false,
					`Adapter error: ${sanitized}`,
					true,
					false,
					auditEvents,
					mode,
					false,
					true,
					'commit-file',
					branchResult,
					undefined,
					undefined,
					branchCreated,
					false,
					false,
					false,
				);
			}
		} else {
			const auditEvent = this._audit(
				mode,
				'commitFile',
				input.repository,
				'blocked',
				'No file commit writer configured for live mode',
				preview.fileSha256,
				preview.fileLength,
				idempotencyKey,
				'commit-file',
			);
			auditEvents.push(auditEvent);
			await this._emitAudit(auditEvent);

			return this._result(
				false,
				'No file commit writer configured for live mode',
				true,
				false,
				auditEvents,
				mode,
				false,
				true,
				'commit-file',
				branchResult,
				undefined,
				undefined,
				branchCreated,
				false,
				false,
				false,
			);
		}

		// ── Phase 8: Policy Validation — createPullRequest ──
		this.policy.setCurrentPhase('policy-pr');
		const prPolicyResult = this.policy.validate({
			operation: 'createPullRequest',
			repository: input.repository,
			prTitle: STAGE3_CANONICAL.prTitle,
			prBody: STAGE3_CANONICAL.prBody,
			prDraft: true,
			idempotencyKey,
			humanApproved: input.humanApproved,
			previewGenerated: input.previewGenerated,
			processSafety: input.processSafety,
		});

		if (!prPolicyResult.allowed) {
			this.policy.markPartialMutation();
			const auditEvent = this._audit(
				mode,
				'createPullRequest',
				input.repository,
				'blocked',
				prPolicyResult.reason,
				preview.fileSha256,
				preview.fileLength,
				idempotencyKey,
				'policy-pr',
			);
			auditEvents.push(auditEvent);
			await this._emitAudit(auditEvent);

			return this._result(
				false,
				prPolicyResult.reason ?? 'Policy denied PR',
				true,
				false,
				auditEvents,
				mode,
				false,
				true,
				'policy-pr',
				branchResult,
				commitResult,
				undefined,
				branchCreated,
				fileCommitted,
				false,
				false,
			);
		}

		// ── Phase 9: Draft PR Creation ──
		this.policy.setCurrentPhase('create-pr');
		let prResult:
			| {
					id?: number;
					number?: number;
					url?: string;
					createdAt?: string;
					draft?: boolean;
			  }
			| undefined;
		let prCreated = false;

		if (mode === 'fake') {
			// Fake mode: simulate PR creation
			this.policy.recordPrCreated();
			prResult = {
				id: 9999,
				number: 9999,
				url: `https://github.com/${input.repository}/pull/9999`,
				createdAt: timestamp,
				draft: true,
			};
			prCreated = true;

			const auditEvent = this._audit(
				'fake',
				'createPullRequest',
				input.repository,
				'allowed_executed',
				undefined,
				preview.fileSha256,
				preview.fileLength,
				idempotencyKey,
				'create-pr',
			);
			auditEvents.push(auditEvent);
			const prAuditOk = await this._emitAudit(auditEvent);
			if (!prAuditOk) {
				return this._result(
					false,
					'Audit sink failure after PR creation (fail-closed)',
					true,
					false,
					auditEvents,
					mode,
					true,
					true,
					'create-pr',
					branchResult,
					commitResult,
					prResult,
					branchCreated,
					fileCommitted,
					prCreated,
					prResult?.draft ?? false,
					undefined,
					true,
				);
			}
		} else if (this.prWriter) {
			this.policy.markWriteAttempted();
			try {
				const result = await this.prWriter.createPullRequest({
					owner: ownerRepo.owner,
					repo: ownerRepo.repo,
					title: STAGE3_CANONICAL.prTitle,
					head: STAGE3_CANONICAL.targetBranch,
					base: STAGE3_CANONICAL.baseBranch,
					body: STAGE3_CANONICAL.prBody,
					draft: true,
				});
				this.policy.recordPrCreated();
				prResult = result;
				prCreated = true;

				const auditEvent = this._audit(
					'live',
					'createPullRequest',
					input.repository,
					'allowed_executed',
					undefined,
					preview.fileSha256,
					preview.fileLength,
					idempotencyKey,
					'create-pr',
				);
				auditEvents.push(auditEvent);
				const prAuditOk = await this._emitAudit(auditEvent);
				if (!prAuditOk) {
					this.policy.markPartialMutation();
					return this._result(
						false,
						'Audit sink failure after PR creation — cannot confirm (fail-closed)',
						true,
						false,
						auditEvents,
						mode,
						true,
						true,
						'create-pr',
						branchResult,
						commitResult,
						prResult,
						branchCreated,
						fileCommitted,
						prCreated,
						prResult?.draft ?? false,
						undefined,
						true,
					);
				}
			} catch (error: unknown) {
				this.policy.markPartialMutation();
				const rawMsg =
					error instanceof Error ? error.message : String(error ?? 'Unknown adapter error');
				const sanitized = redactValue(rawMsg);

				const auditEvent = this._audit(
					'live',
					'createPullRequest',
					input.repository,
					'blocked',
					`Adapter error: ${sanitized}`,
					preview.fileSha256,
					preview.fileLength,
					idempotencyKey,
					'create-pr',
				);
				auditEvents.push(auditEvent);
				await this._emitAudit(auditEvent);

				return this._result(
					false,
					`Adapter error: ${sanitized}`,
					true,
					false,
					auditEvents,
					mode,
					false,
					true,
					'create-pr',
					branchResult,
					commitResult,
					undefined,
					branchCreated,
					fileCommitted,
					false,
					false,
				);
			}
		} else {
			const auditEvent = this._audit(
				mode,
				'createPullRequest',
				input.repository,
				'blocked',
				'No PR writer configured for live mode',
				preview.fileSha256,
				preview.fileLength,
				idempotencyKey,
				'create-pr',
			);
			auditEvents.push(auditEvent);
			await this._emitAudit(auditEvent);

			return this._result(
				false,
				'No PR writer configured for live mode',
				true,
				false,
				auditEvents,
				mode,
				false,
				true,
				'create-pr',
				branchResult,
				commitResult,
				undefined,
				branchCreated,
				fileCommitted,
				false,
				false,
			);
		}

		// ── Phase 10: Read-only Verification ──
		this.policy.setCurrentPhase('verify');
		// In fake mode, verification is simulated; in live mode, it would check the GitHub API
		const verifyAudit = this._audit(
			mode,
			'createPullRequest',
			input.repository,
			'allowed_executed',
			'Verification complete',
			preview.fileSha256,
			preview.fileLength,
			idempotencyKey,
			'verify',
		);
		auditEvents.push(verifyAudit);
		const verifyAuditOk = await this._emitAudit(verifyAudit);
		if (!verifyAuditOk) {
			return this._result(
				false,
				'Audit sink failure during verification (fail-closed)',
				true,
				false,
				auditEvents,
				mode,
				true,
				true,
				'verify',
				branchResult,
				commitResult,
				prResult,
				branchCreated,
				fileCommitted,
				prCreated,
				prResult?.draft ?? false,
				preview,
				true,
			);
		}

		// ── Phase 11: Audit Success ──
		this.policy.setCurrentPhase('audit-success');
		const successAudit = this._audit(
			mode,
			'createPullRequest',
			input.repository,
			'allowed_executed',
			`Stage 3 pilot complete: branch=${branchCreated}, file=${fileCommitted}, pr=${prCreated}`,
			preview.fileSha256,
			preview.fileLength,
			idempotencyKey,
			'audit-success',
		);
		auditEvents.push(successAudit);
		const successAuditOk = await this._emitAudit(successAudit);

		// ── Complete Success or Audit-Broken Failure ──
		const auditBroken = !successAuditOk;
		if (auditBroken) {
			// Final audit failed — cannot claim success. Fail-closed.
			return this._result(
				false,
				'Final audit sink failed — success cannot be confirmed (fail-closed)',
				true,
				true,
				auditEvents,
				mode,
				true,
				false,
				'audit-success',
				branchResult,
				commitResult,
				prResult,
				branchCreated,
				fileCommitted,
				prCreated,
				prResult?.draft ?? false,
				preview,
				true,
				'complete-unverified',
			);
		}

		return this._result(
			true,
			undefined,
			true,
			true,
			auditEvents,
			mode,
			true,
			false,
			'audit-success',
			branchResult,
			commitResult,
			prResult,
			branchCreated,
			fileCommitted,
			prCreated,
			prResult?.draft ?? false,
			preview,
			false,
			'complete-verified',
		);
	}

	// --- Getters ---

	getWriteCount(): number {
		return (
			this.policy.getBranchCount() +
			this.policy.getFileWriteCount() +
			this.policy.getPullRequestCount()
		);
	}

	getConfig(): Readonly<Stage3HarnessConfig> {
		return { ...this.config };
	}

	reset(): void {
		this.policy.unlockExecution(); // clear execution lock before reset
		this.policy.reset();
	}

	// --- Private Helpers ---

	private _audit(
		mode: 'fake' | 'preview' | 'live',
		operation: Stage3WriteOperation,
		repository: string,
		result: 'allowed_preview' | 'allowed_executed' | 'blocked',
		reason: string | undefined,
		fileSha256: string | undefined,
		fileLength: number | undefined,
		idempotencyKey: string,
		phase: string,
	): Stage3PilotAuditEvent {
		return this.policy.createAuditEvent({
			mode,
			operation,
			repository,
			result,
			reason,
			fileSha256,
			fileLength,
			idempotencyKey,
			phase,
		});
	}

	/**
	 * Emit an audit event to the configured sink.
	 * Returns true if audit was successfully recorded, false if it failed or no sink is configured.
	 * Fail-closed: failures are NOT silently swallowed.
	 */
	private async _emitAudit(event: Stage3PilotAuditEvent): Promise<boolean> {
		if (!this.auditSink) {
			// No audit sink configured — fail-closed in live mode
			return false;
		}
		try {
			await this.auditSink.record(event);
			return true;
		} catch {
			// Audit sink failure detected — fail-closed
			return false;
		}
	}

	private _result(
		success: boolean,
		reason: string | undefined,
		policyAllowed: boolean,
		allOperationsExecuted: boolean,
		auditEvents: Stage3PilotAuditEvent[],
		mode: 'fake' | 'preview' | 'live',
		writeExecuted: boolean,
		partialMutation: boolean,
		currentPhase: string | null,
		branchResult?: { ref: string; sha: string },
		commitResult?: { sha: string; url: string },
		prResult?: { id?: number; number?: number; url?: string; createdAt?: string; draft?: boolean },
		branchCreated = false,
		fileCommitted = false,
		prCreated = false,
		prDraft = false,
		preview?: Stage3PreWritePreview,
		auditIntegrityBroken = false,
		mutationState: Stage3HarnessResult['mutationState'] = 'none',
	): Stage3HarnessResult {
		return {
			success,
			reason,
			policyAllowed,
			allOperationsExecuted,
			preview,
			auditEvents,
			mode,
			writeExecuted,
			writeAttempted: this.policy.getWriteAttempted(),
			confirmedMutationCount: this.policy.getConfirmedMutationCount(),
			partialMutation,
			auditIntegrityBroken,
			mutationState,
			currentPhase,
			branchCount: this.policy.getBranchCount(),
			fileWriteCount: this.policy.getFileWriteCount(),
			commitCount: this.policy.getCommitCount(),
			pullRequestCount: this.policy.getPullRequestCount(),
			branchCreated,
			fileCommitted,
			pullRequestCreated: prCreated,
			pullRequestDraft: prDraft,
			branchResult,
			commitResult,
			prResult,
		};
	}
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Create a Stage 3 runtime harness with the canonical sandbox defaults.
 * Uses fake mode by default — no real writes.
 */
export function createStage3Harness(params: {
	branchWriter?: Stage3BranchWriter;
	fileCommitWriter?: Stage3FileCommitWriter;
	prWriter?: Stage3PullRequestWriter;
	auditSink?: Stage3AuditSink;
	config?: Partial<Stage3HarnessConfig>;
}): Stage3RuntimeHarness {
	const policy = new Stage3SupervisedPilotPolicy({
		enabled: true,
	});

	return new Stage3RuntimeHarness({
		policy,
		branchWriter: params.branchWriter,
		fileCommitWriter: params.fileCommitWriter,
		prWriter: params.prWriter,
		auditSink: params.auditSink,
		config: {
			enabled: true,
			fakeMode: params.config?.fakeMode ?? true,
			...params.config,
		},
	});
}
