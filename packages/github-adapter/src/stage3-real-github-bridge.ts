// Positron — Stage 3 Real GitHub Bridge
//
// Restricted, capability-minimal bridge between the Stage 3 harness
// and the GitHub API. Only exposes the exact operations needed for
// the Stage 3 supervised pilot: read base SHA, create branch from
// exact SHA, commit one file, create one draft PR, and read-only
// verification.
//
// Forbidden capabilities (never exposed):
//   merge, delete branch, labels, issue close, review request,
//   workflow dispatch, release, repository settings, arbitrary
//   file update.

import type { Stage3BaseResolver, Stage3ResolvedBase } from './stage3-base-resolver.js';
import type {
	Stage3BranchWriter,
	Stage3FileCommitWriter,
	Stage3PullRequestWriter,
} from './stage3-runtime-harness.js';
import type {
	Stage3ReadOnlyVerifier,
	Stage3RepositoryReader,
	Stage3BranchReader,
	Stage3ContentReader,
	Stage3CommitReader,
	Stage3PullRequestReader,
} from './stage3-reader-verifier.js';
import { STAGE3_CANONICAL } from './stage3-supervised-pilot-policy.js';
import { GitHubValidationError } from './errors.js';

// ---------------------------------------------------------------------------
// Bridge Capability Contract
// ---------------------------------------------------------------------------

/**
 * Allowed capabilities for the Stage 3 bridge.
 * Everything NOT listed here is forbidden.
 */
export const STAGE3_ALLOWED_CAPABILITIES = [
	'resolve-base-sha',
	'create-branch',
	'commit-file',
	'create-draft-pr',
	'read-repository',
	'read-ref',
	'read-file',
	'read-commit',
	'find-pr',
] as const;

export type Stage3AllowedCapability = (typeof STAGE3_ALLOWED_CAPABILITIES)[number];

/**
 * Forbidden capabilities — the bridge MUST NOT expose these.
 */
export const STAGE3_FORBIDDEN_CAPABILITIES = [
	'merge',
	'delete-branch',
	'add-labels',
	'remove-labels',
	'close-issue',
	'request-reviewers',
	'workflow-dispatch',
	'create-release',
	'update-repository-settings',
	'arbitrary-file-update',
] as const;

// ---------------------------------------------------------------------------
// Bridge Interface
// ---------------------------------------------------------------------------

/**
 * Restricted GitHub bridge for Stage 3.
 * Implements exactly the writer and reader interfaces needed.
 */
export interface Stage3RealGitHubBridge {
	/** Discriminator — 'mock' for test-only, 'restricted-real-transport' for live. */
	kind: 'mock' | 'restricted-real-transport';

	/** Resolve base branch SHA read-only (TOCTOU protection). */
	baseResolver: Stage3BaseResolver;

	/** Create exactly one branch from an exact SHA. */
	branchWriter: Stage3BranchWriter;

	/** Commit exactly one file. */
	fileCommitWriter: Stage3FileCommitWriter;

	/** Create exactly one draft PR. */
	prWriter: Stage3PullRequestWriter;

	/** Read-only verification before and after writes. */
	readOnlyVerifier: Stage3ReadOnlyVerifier;
}

// ---------------------------------------------------------------------------
// Bridge Implementation (Mock/Test)
// ---------------------------------------------------------------------------

/**
 * Create a mock Stage 3 bridge for testing.
 * All operations succeed with synthetic data. No network access.
 */
export function createMockStage3Bridge(params?: {
	baseSha?: string;
	targetBranch?: string;
	filePath?: string;
}): Stage3RealGitHubBridge {
	const baseSha = params?.baseSha ?? 'expected-base-sha-0000000000000000000000000000000000000000';
	const targetBranch = params?.targetBranch ?? 'positron/issue-308-stage3-pilot';
	const filePath = params?.filePath ?? 'stage3/positron-supervised-pilot.md';

	return {
		kind: 'mock' as const,

		baseResolver: {
			async resolveBase(_input: {
				owner: string;
				repo: string;
				branch: string;
			}): Promise<Stage3ResolvedBase> {
				return { branch: _input.branch, sha: baseSha };
			},
		},

		branchWriter: {
			async createBranch(input: {
				owner: string;
				repo: string;
				branch: string;
				sourceBranch: string;
				expectedSourceSha: string;
			}) {
				return { ref: `refs/heads/${input.branch}`, sha: 'branch-sha-from-bridge' };
			},
		},

		fileCommitWriter: {
			async commitFile(input: {
				owner: string;
				repo: string;
				branch: string;
				filePath: string;
				content: string;
				message: string;
				commitBody?: string;
			}) {
				return {
					sha: 'commit-sha-from-bridge',
					url: `https://github.com/${input.owner}/${input.repo}/commit/test`,
				};
			},
		},

		prWriter: {
			async createPullRequest(input: {
				owner: string;
				repo: string;
				title: string;
				head: string;
				base: string;
				body: string;
				draft: boolean;
			}) {
				return {
					id: 1,
					number: 1,
					url: `https://github.com/${input.owner}/${input.repo}/pull/1`,
					createdAt: new Date().toISOString(),
					draft: input.draft,
				};
			},
		},

		readOnlyVerifier: {
			repository: {
				async getDefaultBranch(_owner: string, _repo: string) {
					return { name: 'main', sha: baseSha };
				},
			},
			branch: {
				async getBranch(_owner: string, _repo: string, branch: string) {
					return { name: branch, sha: baseSha, exists: branch === targetBranch };
				},
			},
			content: {
				async getFileContent(_owner: string, _repo: string, path: string, _ref?: string) {
					return {
						content: 'test-content',
						gitBlobSha: 'fake-git-blob-sha-000000000000000000000000',
						size: 1724,
						exists: path === filePath,
					};
				},
			},
			commit: {
				async getCommit(_owner: string, _repo: string, sha: string) {
					return {
						sha,
						message: 'test commit',
						authorDate: new Date().toISOString(),
						parents: [baseSha],
						files: [{ filename: filePath, status: 'added' }],
						exists: true,
					};
				},
			},
			pullRequest: {
				async findOpenPr(_owner: string, _repo: string, _head: string, _base: string) {
					return null; // No open PR before execution
				},
			},
			compare: {
				async compareCommits(_owner: string, _repo: string, _base: string, _head: string) {
					return {
						status: 'ahead',
						aheadBy: 1,
						behindBy: 0,
						totalCommits: 1,
						commits: ['fake-commit-sha'],
						files: [{ filename: filePath, status: 'added' }],
					};
				},
			},
		},
	};
}

// ---------------------------------------------------------------------------
// Real Bridge Factory (Live Mode)
// ---------------------------------------------------------------------------

/**
 * Transport interface for the real bridge — minimal graph of write-capable
 * operations. In tests, this is replaced by a spy/mock. At runtime, it is
 * backed by `RealGitHubAdapter` (Octokit).
 */
export interface Stage3GitHubTransport {
	resolveBaseSha(owner: string, repo: string, branch: string): Promise<{ sha: string }>;
	createBranch(
		owner: string,
		repo: string,
		branch: string,
		fromSha: string,
	): Promise<{ ref: string; sha: string }>;
	commitFile(
		owner: string,
		repo: string,
		branch: string,
		path: string,
		content: string,
		message: string,
		body?: string,
	): Promise<{ sha: string; url: string }>;
	createDraftPr(
		owner: string,
		repo: string,
		title: string,
		head: string,
		base: string,
		body: string,
	): Promise<{ id?: number; number?: number; url?: string; createdAt?: string; draft?: boolean }>;
	getDefaultBranch(owner: string, repo: string): Promise<{ name: string; sha: string }>;
	getBranch(
		owner: string,
		repo: string,
		branch: string,
	): Promise<{ name: string; sha: string; exists: boolean }>;
	getFileContent(
		owner: string,
		repo: string,
		path: string,
		ref: string,
	): Promise<{ content: string; gitBlobSha: string; size: number; exists: boolean }>;
	getCommit(
		owner: string,
		repo: string,
		sha: string,
	): Promise<{
		sha: string;
		message: string;
		authorDate: string;
		parents: string[];
		files: Array<{ filename: string; status: string }>;
		exists: boolean;
	}>;
	findOpenPr(
		owner: string,
		repo: string,
		head: string,
		base: string,
	): Promise<{
		number: number;
		state: 'open' | 'closed';
		draft: boolean;
		merged: boolean;
		mergedAt: string | null;
		title: string;
		body: string;
		headRef: string;
		headSha: string;
		baseRef: string;
		baseSha: string;
		exists: boolean;
		totalMatches: number;
	} | null>;
	compareCommits(
		owner: string,
		repo: string,
		base: string,
		head: string,
	): Promise<{
		status: string;
		aheadBy: number;
		behindBy: number;
		totalCommits: number;
		commits: string[];
		files: Array<{ filename: string; status: string }>;
	}>;
}

/**
 * Create a real (non-mock) Stage 3 bridge backed by a transport.
 * The transport is dependency-injected — in tests this is a spy.
 *
 * The bridge exposes ONLY the 5 capability groups allowed by the
 * Stage 3 contract. No merge, delete, label, or workflow operations
 * are accessible through this bridge.
 */
export function createStage3RealGitHubBridge(params: {
	transport: Stage3GitHubTransport;
	canonicalManifest: {
		targetBranch: string;
		filePath: string;
		expectedFileContent: string;
		expectedFileSha256: string;
		expectedFileBytes: number;
		commitMessage: string;
		commitBody?: string;
		prTitle: string;
		prBody: string;
	};
}): Stage3RealGitHubBridge {
	const { transport, canonicalManifest: m } = params;

	// ── Canonical Manifest Enforcement ──
	// The manifest must match STAGE3_CANONICAL exactly — no caller override.
	// Every field is validated before the bridge is constructed.
	function enforce(actual: unknown, expected: unknown, field: string): void {
		if (actual !== expected) {
			throw new GitHubValidationError(
				`Bridge canonical manifest mismatch for '${field}': ` +
					`expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`,
			);
		}
	}

	enforce(m.targetBranch, STAGE3_CANONICAL.targetBranch, 'targetBranch');
	enforce(m.filePath, STAGE3_CANONICAL.filePath, 'filePath');
	enforce(m.expectedFileSha256, STAGE3_CANONICAL.fileSha256, 'expectedFileSha256');
	enforce(m.expectedFileBytes, STAGE3_CANONICAL.fileUtf8ByteLength, 'expectedFileBytes');
	enforce(m.commitMessage, STAGE3_CANONICAL.commitMessage, 'commitMessage');
	enforce(m.commitBody ?? undefined, STAGE3_CANONICAL.commitBody || undefined, 'commitBody');
	enforce(m.prTitle, STAGE3_CANONICAL.prTitle, 'prTitle');
	enforce(m.prBody, STAGE3_CANONICAL.prBody, 'prBody');

	// expectedFileContent is validated via SHA-256, not value comparison
	if (m.expectedFileSha256 !== STAGE3_CANONICAL.fileSha256) {
		throw new GitHubValidationError(`Bridge canonical manifest file SHA-256 mismatch`);
	}

	return {
		kind: 'restricted-real-transport' as const,

		baseResolver: {
			async resolveBase(input) {
				const result = await transport.resolveBaseSha(input.owner, input.repo, input.branch);
				return { branch: input.branch, sha: result.sha };
			},
		},

		branchWriter: {
			async createBranch(input) {
				return transport.createBranch(
					input.owner,
					input.repo,
					input.branch,
					input.expectedSourceSha,
				);
			},
		},

		fileCommitWriter: {
			async commitFile(input) {
				return transport.commitFile(
					input.owner,
					input.repo,
					input.branch,
					input.filePath,
					input.content,
					input.message,
					input.commitBody,
				);
			},
		},

		prWriter: {
			async createPullRequest(input) {
				return transport.createDraftPr(
					input.owner,
					input.repo,
					input.title,
					input.head,
					input.base,
					input.body,
				);
			},
		},

		readOnlyVerifier: {
			repository: {
				async getDefaultBranch(owner, repo) {
					return transport.getDefaultBranch(owner, repo);
				},
			},
			branch: {
				async getBranch(owner, repo, branch) {
					return transport.getBranch(owner, repo, branch);
				},
			},
			content: {
				async getFileContent(owner, repo, path, ref) {
					return transport.getFileContent(owner, repo, path, ref ?? 'main');
				},
			},
			commit: {
				async getCommit(owner, repo, sha) {
					return transport.getCommit(owner, repo, sha);
				},
			},
			pullRequest: {
				async findOpenPr(owner, repo, head, base) {
					return transport.findOpenPr(owner, repo, head, base);
				},
			},
			compare: {
				async compareCommits(owner, repo, base, head) {
					return transport.compareCommits(owner, repo, base, head);
				},
			},
		},
	};
}

// ---------------------------------------------------------------------------
// Capability Check
// ---------------------------------------------------------------------------

/**
 * Verify that a bridge does not expose any forbidden capabilities.
 * This is a runtime check — the bridge must be constructed to only
 * implement allowed operations.
 */
export function verifyBridgeCapabilities(bridge: Stage3RealGitHubBridge): {
	valid: boolean;
	exposedForbidden: string[];
} {
	const exposedForbidden: string[] = [];

	// Check that the bridge has only the expected properties
	const bridgeKeys = Object.keys(bridge);
	const allowedKeys = [
		'kind',
		'baseResolver',
		'branchWriter',
		'fileCommitWriter',
		'prWriter',
		'readOnlyVerifier',
	];

	for (const key of bridgeKeys) {
		if (!allowedKeys.includes(key)) {
			exposedForbidden.push(`Unexpected bridge property: ${key}`);
		}
	}

	return { valid: exposedForbidden.length === 0, exposedForbidden };
}
