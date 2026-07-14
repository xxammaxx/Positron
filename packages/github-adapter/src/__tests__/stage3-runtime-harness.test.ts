// Positron — Stage 3 Runtime Harness Tests
// Uses exact canonical file content from the canonical manifest.
// No independent copies of canonical values are permitted.

import { describe, it, expect, vi } from 'vitest';
import { Stage3RuntimeHarness, createStage3Harness } from '../stage3-runtime-harness.js';
import { createStage3PilotPolicy, STAGE3_CANONICAL } from '../stage3-supervised-pilot-policy.js';
import { CANONICAL_FILE_CONTENT } from '../stage3-canonical-manifest.js';
import type {
	Stage3BranchWriter,
	Stage3FileCommitWriter,
	Stage3PullRequestWriter,
	Stage3HarnessInput,
	Stage3AuditSink,
} from '../stage3-runtime-harness.js';
import type { Stage3ProcessSafety } from '../stage3-supervised-pilot-policy.js';

const SAFE_PROCESS_SAFETY: Stage3ProcessSafety = {
	queueDisabled: true,
	singleProcess: true,
	workspaceLockAcquired: true,
	noOtherActiveRun: true,
	mergeKillSwitchActive: true,
	pushDisabled: true,
};

// 82-char suffix (93 total with prefix) matching shared redactSecrets regex
const MOCK_TOKEN =
	'github_pat_AB12AB12AB12AB12AB12AB12AB12AB12AB12AB12AB12AB12AB12AB12AB12AB12AB12AB12AB12AB12XY';

// ---------------------------------------------------------------------------
// Spy Writers
// ---------------------------------------------------------------------------

function createSpyBranchWriter() {
	return {
		createBranch: vi.fn().mockResolvedValue({
			ref: `refs/heads/${STAGE3_CANONICAL.targetBranch}`,
			sha: 'test-branch-sha-12345',
		}),
	} satisfies Stage3BranchWriter;
}

function createSpyFileCommitWriter() {
	return {
		commitFile: vi.fn().mockResolvedValue({
			sha: 'test-commit-sha-67890',
			url: `https://github.com/${STAGE3_CANONICAL.repository}/commit/test`,
		}),
	} satisfies Stage3FileCommitWriter;
}

function createSpyPrWriter() {
	return {
		createPullRequest: vi.fn().mockResolvedValue({
			id: 123,
			number: 123,
			url: `https://github.com/${STAGE3_CANONICAL.repository}/pull/123`,
			createdAt: new Date().toISOString(),
			draft: true,
		}),
	} satisfies Stage3PullRequestWriter;
}

function createSpyAuditSink(): Stage3AuditSink {
	return { record: vi.fn() };
}

function makeValidInput(overrides?: Partial<Stage3HarnessInput>): Stage3HarnessInput {
	return {
		repository: STAGE3_CANONICAL.repository,
		fileContent: CANONICAL_FILE_CONTENT,
		idempotencyKey: 'test-harness-run-001',
		humanApproved: true,
		previewGenerated: true,
		processSafety: SAFE_PROCESS_SAFETY,
		...overrides,
	};
}

// ---------------------------------------------------------------------------
// Positive — Happy Path (Fake Mode)
// ---------------------------------------------------------------------------

describe('Stage3RuntimeHarness — Positive: Happy Path (Fake Mode)', () => {
	it('completes full fake mode execution successfully', async () => {
		const policy = createStage3PilotPolicy();
		const spyAudit = createSpyAuditSink();
		const harness = new Stage3RuntimeHarness({
			policy,
			auditSink: spyAudit,
			config: { enabled: true, fakeMode: true },
		});

		const result = await harness.execute(makeValidInput());

		expect(result.success).toBe(true);
		expect(result.policyAllowed).toBe(true);
		expect(result.allOperationsExecuted).toBe(true);
		expect(result.mode).toBe('fake');
		expect(result.partialMutation).toBe(false);
		expect(result.auditIntegrityBroken).toBe(false);
		expect(result.branchCreated).toBe(true);
		expect(result.fileCommitted).toBe(true);
		expect(result.pullRequestCreated).toBe(true);
		expect(result.pullRequestDraft).toBe(true);
		expect(result.branchCount).toBe(1);
		expect(result.fileWriteCount).toBe(1);
		expect(result.commitCount).toBe(1);
		expect(result.pullRequestCount).toBe(1);
		expect(result.branchResult).toBeDefined();
		expect(result.branchResult!.ref).toContain(STAGE3_CANONICAL.targetBranch);
		expect(result.commitResult).toBeDefined();
		expect(result.prResult).toBeDefined();
		expect(result.prResult!.draft).toBe(true);
		expect(result.auditEvents.length).toBeGreaterThan(0);
	});

	it('generates audit events for each phase', async () => {
		const policy = createStage3PilotPolicy();
		const spyAudit = createSpyAuditSink();
		const harness = new Stage3RuntimeHarness({
			policy,
			auditSink: spyAudit,
			config: { enabled: true, fakeMode: true },
		});

		const result = await harness.execute(makeValidInput());
		expect(result.success).toBe(true);
		const phases = result.auditEvents.map((e) => e.phase);
		expect(phases).toContain('audit-pre-write');
		expect(phases).toContain('create-branch');
		expect(phases).toContain('commit-file');
		expect(phases).toContain('create-pr');
		expect(phases).toContain('verify');
		expect(phases).toContain('audit-success');
		for (const event of result.auditEvents) {
			expect(event.tokenValue).toBe('REDACTED');
		}
	});

	it('resets correctly between runs', async () => {
		const policy = createStage3PilotPolicy();
		const spyAudit = createSpyAuditSink();
		const harness = new Stage3RuntimeHarness({
			policy,
			auditSink: spyAudit,
			config: { enabled: true, fakeMode: true },
		});
		await harness.execute(makeValidInput({ idempotencyKey: 'run-a' }));
		harness.reset();
		const result2 = await harness.execute(makeValidInput({ idempotencyKey: 'run-a' }));
		expect(result2.success).toBe(true);
		expect(result2.branchCount).toBe(1);
	});
});

// ---------------------------------------------------------------------------
// Positive — Live Mode with Spy Writers
// ---------------------------------------------------------------------------

describe('Stage3RuntimeHarness — Positive: Live Mode with Spy Writers', () => {
	it('calls branch writer exactly once in live mode', async () => {
		const spyBranch = createSpyBranchWriter();
		const spyFileCommit = createSpyFileCommitWriter();
		const spyPr = createSpyPrWriter();
		const spyAudit = createSpyAuditSink();
		const policy = createStage3PilotPolicy();
		const harness = new Stage3RuntimeHarness({
			policy,
			branchWriter: spyBranch,
			fileCommitWriter: spyFileCommit,
			prWriter: spyPr,
			auditSink: spyAudit,
			config: { enabled: true, fakeMode: false },
		});

		const result = await harness.execute(makeValidInput());
		expect(result.success).toBe(true);
		expect(result.mode).toBe('live');
		expect(result.writeExecuted).toBe(true);
		expect(result.auditIntegrityBroken).toBe(false);
		expect(spyBranch.createBranch).toHaveBeenCalledTimes(1);
		expect(spyFileCommit.commitFile).toHaveBeenCalledTimes(1);
		expect(spyPr.createPullRequest).toHaveBeenCalledTimes(1);
	});

	it('calls writers in correct order: branch → commit → PR', async () => {
		const callOrder: string[] = [];
		const spyBranch = {
			createBranch: vi.fn().mockImplementation(async () => {
				callOrder.push('branch');
				return { ref: 'refs/heads/test', sha: 'sha1' };
			}),
		} satisfies Stage3BranchWriter;
		const spyFileCommit = {
			commitFile: vi.fn().mockImplementation(async () => {
				callOrder.push('commit');
				return { sha: 'sha2', url: 'http://test' };
			}),
		} satisfies Stage3FileCommitWriter;
		const spyPr = {
			createPullRequest: vi.fn().mockImplementation(async () => {
				callOrder.push('pr');
				return { id: 1, number: 1, url: 'http://test', draft: true };
			}),
		} satisfies Stage3PullRequestWriter;
		const spyAudit = createSpyAuditSink();
		const policy = createStage3PilotPolicy();
		const harness = new Stage3RuntimeHarness({
			policy,
			branchWriter: spyBranch,
			fileCommitWriter: spyFileCommit,
			prWriter: spyPr,
			auditSink: spyAudit,
			config: { enabled: true, fakeMode: false },
		});
		await harness.execute(makeValidInput());
		expect(callOrder).toEqual(['branch', 'commit', 'pr']);
	});

	it('passes correct parameters to writers', async () => {
		const spyBranch = createSpyBranchWriter();
		const spyFileCommit = createSpyFileCommitWriter();
		const spyPr = createSpyPrWriter();
		const spyAudit = createSpyAuditSink();
		const policy = createStage3PilotPolicy();
		const harness = new Stage3RuntimeHarness({
			policy,
			branchWriter: spyBranch,
			fileCommitWriter: spyFileCommit,
			prWriter: spyPr,
			auditSink: spyAudit,
			config: { enabled: true, fakeMode: false },
		});
		await harness.execute(makeValidInput());
		expect(spyBranch.createBranch).toHaveBeenCalledWith({
			owner: 'xxammaxx',
			repo: 'positron-sandbox',
			branch: STAGE3_CANONICAL.targetBranch,
			fromBranch: STAGE3_CANONICAL.baseBranch,
		});
		expect(spyFileCommit.commitFile).toHaveBeenCalledWith({
			owner: 'xxammaxx',
			repo: 'positron-sandbox',
			branch: STAGE3_CANONICAL.targetBranch,
			filePath: STAGE3_CANONICAL.filePath,
			content: CANONICAL_FILE_CONTENT,
			message: STAGE3_CANONICAL.commitMessage,
			commitBody: STAGE3_CANONICAL.commitBody,
		});
		const prCall = spyPr.createPullRequest.mock.calls[0]![0]!;
		expect(prCall.draft).toBe(true);
		expect(prCall.title).toBe(STAGE3_CANONICAL.prTitle);
		expect(prCall.base).toBe(STAGE3_CANONICAL.baseBranch);
		expect(prCall.head).toBe(STAGE3_CANONICAL.targetBranch);
	});
});

// ---------------------------------------------------------------------------
// Negative — Harness Disabled
// ---------------------------------------------------------------------------

describe('Stage3RuntimeHarness — Negative: Harness Disabled', () => {
	it('blocks when harness is disabled', async () => {
		const policy = createStage3PilotPolicy();
		const harness = new Stage3RuntimeHarness({
			policy,
			config: { enabled: false, fakeMode: true },
		});
		const result = await harness.execute(makeValidInput());
		expect(result.success).toBe(false);
		expect(result.reason).toContain('not enabled');
	});
});

// ---------------------------------------------------------------------------
// Negative — Second Run Blocked
// ---------------------------------------------------------------------------

describe('Stage3RuntimeHarness — Negative: Second Run Blocked', () => {
	it('blocks second harness call with same idempotency key', async () => {
		const policy = createStage3PilotPolicy();
		const spyAudit = createSpyAuditSink();
		const harness = new Stage3RuntimeHarness({
			policy,
			auditSink: spyAudit,
			config: { enabled: true, fakeMode: true },
		});
		const r1 = await harness.execute(makeValidInput({ idempotencyKey: 'unique-run' }));
		expect(r1.success).toBe(true);
		const r2 = await harness.execute(makeValidInput({ idempotencyKey: 'unique-run' }));
		expect(r2.success).toBe(false);
		expect(r2.reason).toContain('Duplicate idempotency key');
	});
});

// ---------------------------------------------------------------------------
// Negative — Process Safety
// ---------------------------------------------------------------------------

describe('Stage3RuntimeHarness — Negative: Process Safety', () => {
	it('blocks when queue is active', async () => {
		const policy = createStage3PilotPolicy();
		const harness = new Stage3RuntimeHarness({ policy, config: { enabled: true, fakeMode: true } });
		const result = await harness.execute(
			makeValidInput({
				processSafety: { ...SAFE_PROCESS_SAFETY, queueDisabled: false },
			}),
		);
		expect(result.success).toBe(false);
		expect(result.reason).toContain('Queue must be disabled');
	});

	it('blocks when concurrency > 1', async () => {
		const policy = createStage3PilotPolicy();
		const harness = new Stage3RuntimeHarness({ policy, config: { enabled: true, fakeMode: true } });
		const result = await harness.execute(
			makeValidInput({
				processSafety: { ...SAFE_PROCESS_SAFETY, singleProcess: false },
			}),
		);
		expect(result.success).toBe(false);
		expect(result.reason).toContain('Single process');
	});

	it('blocks when workspace lock is missing', async () => {
		const policy = createStage3PilotPolicy();
		const harness = new Stage3RuntimeHarness({ policy, config: { enabled: true, fakeMode: true } });
		const result = await harness.execute(
			makeValidInput({
				processSafety: { ...SAFE_PROCESS_SAFETY, workspaceLockAcquired: false },
			}),
		);
		expect(result.success).toBe(false);
		expect(result.reason).toContain('Workspace lock');
	});

	it('blocks when merge kill-switch is inactive', async () => {
		const policy = createStage3PilotPolicy();
		const harness = new Stage3RuntimeHarness({ policy, config: { enabled: true, fakeMode: true } });
		const result = await harness.execute(
			makeValidInput({
				processSafety: { ...SAFE_PROCESS_SAFETY, mergeKillSwitchActive: false },
			}),
		);
		expect(result.success).toBe(false);
		expect(result.reason).toContain('Merge kill-switch');
	});

	it('blocks when push is enabled', async () => {
		const policy = createStage3PilotPolicy();
		const harness = new Stage3RuntimeHarness({ policy, config: { enabled: true, fakeMode: true } });
		const result = await harness.execute(
			makeValidInput({
				processSafety: { ...SAFE_PROCESS_SAFETY, pushDisabled: false },
			}),
		);
		expect(result.success).toBe(false);
		expect(result.reason).toContain('Push must be disabled');
	});
});

// ---------------------------------------------------------------------------
// Negative — Human Gates
// ---------------------------------------------------------------------------

describe('Stage3RuntimeHarness — Negative: Human Gates', () => {
	it('blocks when human approval missing', async () => {
		const policy = createStage3PilotPolicy();
		const harness = new Stage3RuntimeHarness({ policy, config: { enabled: true, fakeMode: true } });
		const result = await harness.execute(makeValidInput({ humanApproved: false }));
		expect(result.success).toBe(false);
		expect(result.reason).toContain('Human approval is required');
	});

	it('blocks when preview not generated', async () => {
		const policy = createStage3PilotPolicy();
		const harness = new Stage3RuntimeHarness({ policy, config: { enabled: true, fakeMode: true } });
		const result = await harness.execute(makeValidInput({ previewGenerated: false }));
		expect(result.success).toBe(false);
		expect(result.reason).toContain('Pre-write preview');
	});
});

// ---------------------------------------------------------------------------
// Negative — Repository
// ---------------------------------------------------------------------------

describe('Stage3RuntimeHarness — Negative: Repository', () => {
	it('blocks production Positron repository', async () => {
		const policy = createStage3PilotPolicy();
		const harness = new Stage3RuntimeHarness({ policy, config: { enabled: true, fakeMode: true } });
		const result = await harness.execute(makeValidInput({ repository: 'xxammaxx/Positron' }));
		expect(result.success).toBe(false);
		expect(result.reason).toContain('forbidden');
	});

	it('blocks non-sandbox repository', async () => {
		const policy = createStage3PilotPolicy();
		const harness = new Stage3RuntimeHarness({ policy, config: { enabled: true, fakeMode: true } });
		const result = await harness.execute(makeValidInput({ repository: 'other-org/other-repo' }));
		expect(result.success).toBe(false);
		expect(result.reason).toContain('not the allowlisted');
	});
});

// ---------------------------------------------------------------------------
// Negative — Adapter Errors (Live Mode)
// ---------------------------------------------------------------------------

describe('Stage3RuntimeHarness — Negative: Adapter Errors', () => {
	it('handles branch writer error — partial mutation tracked', async () => {
		const failingBranch = {
			createBranch: vi.fn().mockRejectedValue(new Error('Branch already exists')),
		} satisfies Stage3BranchWriter;
		const spyFileCommit = createSpyFileCommitWriter();
		const spyPr = createSpyPrWriter();
		const spyAudit = createSpyAuditSink();
		const policy = createStage3PilotPolicy();
		const harness = new Stage3RuntimeHarness({
			policy,
			branchWriter: failingBranch,
			fileCommitWriter: spyFileCommit,
			prWriter: spyPr,
			auditSink: spyAudit,
			config: { enabled: true, fakeMode: false },
		});
		const result = await harness.execute(makeValidInput());
		expect(result.success).toBe(false);
		expect(result.partialMutation).toBe(true);
		expect(result.reason).toContain('Adapter error');
		expect(spyFileCommit.commitFile).not.toHaveBeenCalled();
		expect(spyPr.createPullRequest).not.toHaveBeenCalled();
	});

	it('handles file commit writer error after branch success — partial mutation', async () => {
		const spyBranch = createSpyBranchWriter();
		const failingFileCommit = {
			commitFile: vi.fn().mockRejectedValue(new Error('Permission denied')),
		} satisfies Stage3FileCommitWriter;
		const spyPr = createSpyPrWriter();
		const spyAudit = createSpyAuditSink();
		const policy = createStage3PilotPolicy();
		const harness = new Stage3RuntimeHarness({
			policy,
			branchWriter: spyBranch,
			fileCommitWriter: failingFileCommit,
			prWriter: spyPr,
			auditSink: spyAudit,
			config: { enabled: true, fakeMode: false },
		});
		const result = await harness.execute(makeValidInput());
		expect(result.success).toBe(false);
		expect(result.partialMutation).toBe(true);
		expect(spyBranch.createBranch).toHaveBeenCalledTimes(1);
		expect(spyPr.createPullRequest).not.toHaveBeenCalled();
	});

	it('handles PR writer error after branch+commit success — partial mutation', async () => {
		const spyBranch = createSpyBranchWriter();
		const spyFileCommit = createSpyFileCommitWriter();
		const failingPr = {
			createPullRequest: vi.fn().mockRejectedValue(new Error('PR limit exceeded')),
		} satisfies Stage3PullRequestWriter;
		const spyAudit = createSpyAuditSink();
		const policy = createStage3PilotPolicy();
		const harness = new Stage3RuntimeHarness({
			policy,
			branchWriter: spyBranch,
			fileCommitWriter: spyFileCommit,
			prWriter: failingPr,
			auditSink: spyAudit,
			config: { enabled: true, fakeMode: false },
		});
		const result = await harness.execute(makeValidInput());
		expect(result.success).toBe(false);
		expect(result.partialMutation).toBe(true);
		expect(spyBranch.createBranch).toHaveBeenCalledTimes(1);
		expect(spyFileCommit.commitFile).toHaveBeenCalledTimes(1);
	});

	it('redacts token from adapter error messages', async () => {
		const tokenError = {
			createBranch: vi.fn().mockRejectedValue(new Error(`Auth failed: ${MOCK_TOKEN}`)),
		} satisfies Stage3BranchWriter;
		const spyAudit = createSpyAuditSink();
		const policy = createStage3PilotPolicy();
		const harness = new Stage3RuntimeHarness({
			policy,
			branchWriter: tokenError,
			auditSink: spyAudit,
			config: { enabled: true, fakeMode: false },
		});
		const result = await harness.execute(makeValidInput());
		expect(result.success).toBe(false);
		// Full token value must not appear
		expect(result.reason).not.toContain(MOCK_TOKEN);
		// Reason should be redacted
		expect(result.reason).toContain('Adapter error');
	});
});

// ---------------------------------------------------------------------------
// Fake Mode — No Network Writes
// ---------------------------------------------------------------------------

describe('Stage3RuntimeHarness — Fake Mode: No Network Writes', () => {
	it('fake mode never calls branch writer', async () => {
		const spyBranch = createSpyBranchWriter();
		const spyFileCommit = createSpyFileCommitWriter();
		const spyPr = createSpyPrWriter();
		const spyAudit = createSpyAuditSink();
		const policy = createStage3PilotPolicy();
		const harness = new Stage3RuntimeHarness({
			policy,
			branchWriter: spyBranch,
			fileCommitWriter: spyFileCommit,
			prWriter: spyPr,
			auditSink: spyAudit,
			config: { enabled: true, fakeMode: true },
		});
		const result = await harness.execute(makeValidInput());
		expect(result.success).toBe(true);
		expect(result.mode).toBe('fake');
		expect(spyBranch.createBranch).not.toHaveBeenCalled();
		expect(spyFileCommit.commitFile).not.toHaveBeenCalled();
		expect(spyPr.createPullRequest).not.toHaveBeenCalled();
	});

	it('fake mode provides synthetic results', async () => {
		const policy = createStage3PilotPolicy();
		const spyAudit = createSpyAuditSink();
		const harness = new Stage3RuntimeHarness({
			policy,
			auditSink: spyAudit,
			config: { enabled: true, fakeMode: true },
		});
		const result = await harness.execute(makeValidInput());
		expect(result.success).toBe(true);
		expect(result.branchResult!.sha).toBe('fake-branch-sha');
		expect(result.prResult!.draft).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// Factory Tests
// ---------------------------------------------------------------------------

describe('Stage3RuntimeHarness — Factory', () => {
	it('createStage3Harness creates working harness with default fake mode', async () => {
		const spyAudit = createSpyAuditSink();
		const harness = createStage3Harness({ auditSink: spyAudit });
		const result = await harness.execute(makeValidInput());
		expect(result.success).toBe(true);
		expect(result.mode).toBe('fake');
	});

	it('createStage3Harness respects config overrides', async () => {
		const spyBranch = createSpyBranchWriter();
		const spyFileCommit = createSpyFileCommitWriter();
		const spyPr = createSpyPrWriter();
		const spyAudit = createSpyAuditSink();
		const harness = createStage3Harness({
			branchWriter: spyBranch,
			fileCommitWriter: spyFileCommit,
			prWriter: spyPr,
			auditSink: spyAudit,
			config: { fakeMode: false },
		});
		const result = await harness.execute(makeValidInput());
		expect(result.success).toBe(true);
		expect(result.mode).toBe('live');
		expect(spyBranch.createBranch).toHaveBeenCalledTimes(1);
	});
});

// ---------------------------------------------------------------------------
// Negative — Invalid Input
// ---------------------------------------------------------------------------

describe('Stage3RuntimeHarness — Negative: Invalid Input', () => {
	it('blocks invalid repository format', async () => {
		const policy = createStage3PilotPolicy();
		const harness = new Stage3RuntimeHarness({ policy, config: { enabled: true, fakeMode: true } });
		const result = await harness.execute(makeValidInput({ repository: 'no-slash-here' }));
		expect(result.success).toBe(false);
		expect(result.reason).toContain('Invalid repository format');
	});
});
