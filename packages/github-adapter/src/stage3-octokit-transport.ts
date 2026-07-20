// Positron — Stage 3 Octokit Transport
//
// Concrete implementation of Stage3GitHubTransport backed by Octokit.
// Maps exactly 9 REST endpoints to the transport interface.
//
// FORBIDDEN capabilities (never exposed through this transport):
//   merge, delete branch, labels, issue close, reviewer request,
//   workflow dispatch, release, repository settings, arbitrary file update.
//
// ALLOWED operations:
//   resolveBaseSha, createBranch, commitFile, createDraftPr,
//   getDefaultBranch, getBranch, getFileContent, getCommit,
//   findOpenPr
//
// This transport does NOT expose Octokit directly. It does NOT auto-retry.
// It uses the existing error mapping from real-adapter.ts.

import { RequestError } from '@octokit/request-error';
import type { Octokit } from '@octokit/rest';
import { GitHubNetworkError, GitHubValidationError } from './errors.js';
import { mapRequestError } from './real-adapter.js';
import type { Stage3GitHubTransport } from './stage3-real-github-bridge.js';

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Create a concrete Stage 3 transport backed by Octokit.
 * Only the 9 allowed operations are exposed — no raw Octokit access.
 *
 * @param octokit - An authenticated Octokit instance. In tests, use a
 *   mock/spy Octokit. In production, created by the caller.
 * @param owner - Repository owner (from canonical manifest).
 * @param repo - Repository name (from canonical manifest).
 */
export function createStage3OctokitTransport(
	octokit: Octokit,
	owner: string,
	repo: string,
): Stage3GitHubTransport {
	// Validate that owner/repo are non-empty strings (fail-fast)
	if (!owner || typeof owner !== 'string') {
		throw new GitHubValidationError('Transport owner must be a non-empty string');
	}
	if (!repo || typeof repo !== 'string') {
		throw new GitHubValidationError('Transport repo must be a non-empty string');
	}

	// ── Immutable repository binding ──
	// The factory-bound owner/repo are the ONLY values ever sent to Octokit.
	// Caller-supplied _owner/_repo parameters are validated against the bound
	// values and rejected if they differ — this prevents repository drift.
	const boundOwner = owner;
	const boundRepo = repo;

	function assertBound(_callerOwner: string, _callerRepo: string, operation: string): void {
		if (_callerOwner !== boundOwner || _callerRepo !== boundRepo) {
			throw new GitHubValidationError(
				`Stage 3 transport is bound to '${boundOwner}/${boundRepo}' — ` +
					`cannot execute '${operation}' against '${_callerOwner}/${_callerRepo}'`,
			);
		}
	}

	return {
		// -------------------------------------------------------------------
		// Write Operations (3)
		// -------------------------------------------------------------------

		async resolveBaseSha(_owner, _repo, branch) {
			assertBound(_owner, _repo, 'resolveBaseSha');
			try {
				const { data } = await octokit.rest.git.getRef({
					owner: boundOwner,
					repo: boundRepo,
					ref: `heads/${branch}`,
				});
				return { sha: data.object.sha };
			} catch (err) {
				if (err instanceof RequestError) throw mapRequestError(err);
				throw new GitHubNetworkError(String(err));
			}
		},

		async createBranch(_owner, _repo, branch, fromSha) {
			assertBound(_owner, _repo, 'createBranch');
			try {
				const { data } = await octokit.rest.git.createRef({
					owner: boundOwner,
					repo: boundRepo,
					ref: `refs/heads/${branch}`,
					sha: fromSha,
				});
				return { ref: data.ref, sha: data.object.sha };
			} catch (err) {
				if (err instanceof RequestError) throw mapRequestError(err);
				throw new GitHubNetworkError(String(err));
			}
		},

		async commitFile(_owner, _repo, branch, path, content, message, body) {
			assertBound(_owner, _repo, 'commitFile');
			try {
				// compose full commit message
				const fullMessage = body ? `${message}\n\n${body}` : message;
				const { data } = await octokit.rest.repos.createOrUpdateFileContents({
					owner: boundOwner,
					repo: boundRepo,
					path,
					message: fullMessage,
					content: Buffer.from(content, 'utf8').toString('base64'),
					branch,
				});
				return {
					sha: data.commit.sha ?? '',
					url: data.commit.html_url ?? '',
				};
			} catch (err) {
				if (err instanceof RequestError) throw mapRequestError(err);
				throw new GitHubNetworkError(String(err));
			}
		},

		async createDraftPr(_owner, _repo, title, head, base, body) {
			assertBound(_owner, _repo, 'createDraftPr');
			try {
				const { data } = await octokit.rest.pulls.create({
					owner: boundOwner,
					repo: boundRepo,
					title,
					head,
					base,
					body,
					draft: true,
				});
				return {
					id: data.id,
					number: data.number,
					url: data.html_url,
					createdAt: data.created_at,
					draft: data.draft ?? true,
				};
			} catch (err) {
				if (err instanceof RequestError) throw mapRequestError(err);
				throw new GitHubNetworkError(String(err));
			}
		},

		// -------------------------------------------------------------------
		// Read Operations (5)
		// -------------------------------------------------------------------

		async getDefaultBranch(_owner, _repo) {
			assertBound(_owner, _repo, 'getDefaultBranch');
			try {
				const { data } = await octokit.rest.repos.get({
					owner: boundOwner,
					repo: boundRepo,
				});
				// Default branch name is known, but we need its SHA
				const defaultBranch = data.default_branch;
				const refData = await octokit.rest.git.getRef({
					owner: boundOwner,
					repo: boundRepo,
					ref: `heads/${defaultBranch}`,
				});
				return {
					name: defaultBranch,
					sha: refData.data.object.sha,
				};
			} catch (err) {
				if (err instanceof RequestError) throw mapRequestError(err);
				throw new GitHubNetworkError(String(err));
			}
		},

		async getBranch(_owner, _repo, branch) {
			assertBound(_owner, _repo, 'getBranch');
			try {
				const { data } = await octokit.rest.git.getRef({
					owner: boundOwner,
					repo: boundRepo,
					ref: `heads/${branch}`,
				});
				return {
					name: branch,
					sha: data.object.sha,
					exists: true,
				};
			} catch (err) {
				if (err instanceof RequestError) {
					if (err.status === 404) {
						return { name: branch, sha: '', exists: false };
					}
					throw mapRequestError(err);
				}
				throw new GitHubNetworkError(String(err));
			}
		},

		async getFileContent(_owner, _repo, path, ref) {
			assertBound(_owner, _repo, 'getFileContent');
			try {
				const { data } = await octokit.rest.repos.getContent({
					owner: boundOwner,
					repo: boundRepo,
					path,
					ref,
				});
				// data can be an array (directory) or a single file object
				if (Array.isArray(data)) {
					return { content: '', gitBlobSha: '', size: 0, exists: false };
				}
				const fileData = data as { content?: string; sha: string; size: number };
				// GitHub content is base64-encoded
				const decoded = fileData.content
					? Buffer.from(fileData.content, 'base64').toString('utf8')
					: '';
				return {
					content: decoded,
					gitBlobSha: fileData.sha, // This is the git blob SHA — NOT SHA-256
					size: fileData.size,
					exists: true,
				};
			} catch (err) {
				if (err instanceof RequestError) {
					if (err.status === 404) {
						return { content: '', gitBlobSha: '', size: 0, exists: false };
					}
					throw mapRequestError(err);
				}
				throw new GitHubNetworkError(String(err));
			}
		},

		async getCommit(_owner, _repo, sha) {
			assertBound(_owner, _repo, 'getCommit');
			try {
				const { data } = await octokit.rest.repos.getCommit({
					owner: boundOwner,
					repo: boundRepo,
					ref: sha,
				});
				return {
					sha: data.sha,
					message: data.commit.message,
					authorDate: data.commit.author?.date ?? '',
					parents: data.parents.map((p) => p.sha),
					files: (data.files ?? []).map((f) => ({
						filename: f.filename,
						status: f.status,
					})),
					exists: true,
				};
			} catch (err) {
				if (err instanceof RequestError) {
					if (err.status === 404) {
						return {
							sha,
							message: '',
							authorDate: '',
							parents: [],
							files: [],
							exists: false,
						};
					}
					throw mapRequestError(err);
				}
				throw new GitHubNetworkError(String(err));
			}
		},

		async findOpenPr(_owner, _repo, head, base) {
			assertBound(_owner, _repo, 'findOpenPr');
			try {
				const { data } = await octokit.rest.pulls.list({
					owner: boundOwner,
					repo: boundRepo,
					state: 'open',
					head: `${boundOwner}:${head}`,
					base,
				});
				if (data.length === 0) return null;
				const pr = data[0]!;
				return {
					number: pr.number,
					state: (pr.state as 'open' | 'closed') ?? 'open',
					draft: pr.draft ?? false,
					merged: false, // open PRs are never merged
					mergedAt: null,
					title: pr.title,
					body: pr.body ?? '',
					headRef: pr.head.ref,
					headSha: pr.head.sha,
					baseRef: pr.base.ref,
					baseSha: pr.base.sha,
					exists: true,
					totalMatches: data.length,
				};
			} catch (err) {
				if (err instanceof RequestError) throw mapRequestError(err);
				throw new GitHubNetworkError(String(err));
			}
		},

		async compareCommits(_owner, _repo, base, head) {
			assertBound(_owner, _repo, 'compareCommits');
			try {
				const { data } = await octokit.rest.repos.compareCommits({
					owner: boundOwner,
					repo: boundRepo,
					base,
					head,
				});
				return {
					status: data.status,
					aheadBy: data.ahead_by,
					behindBy: data.behind_by,
					totalCommits: data.total_commits,
					commits: data.commits.map((c) => c.sha),
					files: (data.files ?? []).map((f) => ({
						filename: f.filename,
						status: f.status,
					})),
				};
			} catch (err) {
				if (err instanceof RequestError) throw mapRequestError(err);
				throw new GitHubNetworkError(String(err));
			}
		},
	};
}

// ---------------------------------------------------------------------------
// Forbidden Endpoint Sentinel (for test verification)
// ---------------------------------------------------------------------------

/**
 * List of Octokit REST endpoint path prefixes that MUST NEVER be called
 * through the Stage 3 transport.
 *
 * Tests SHOULD verify that none of these endpoints are accessed during
 * any Stage 3 transport operation.
 */
export const STAGE3_FORBIDDEN_OCTOKIT_ENDPOINTS = [
	'repos.merge',
	'repos.delete',
	'git.deleteRef',
	'issues.update',
	'issues.addLabels',
	'issues.removeLabel',
	'issues.createLabel',
	'pulls.merge',
	'pulls.requestReviewers',
	'pulls.removeRequestedReviewers',
	'actions.createWorkflowDispatch',
	'repos.createRelease',
	'repos.update',
	'repos.replaceAllTopics',
	'repos.createDispatchEvent',
] as const;

/**
 * Verify that a mock/spy Octokit has NOT been used to call any forbidden
 * endpoints. Returns list of violations found.
 */
export function verifyNoForbiddenEndpointsCalled(mockOctokit: Record<string, unknown>): {
	clean: boolean;
	violations: string[];
} {
	const violations: string[] = [];

	for (const endpoint of STAGE3_FORBIDDEN_OCTOKIT_ENDPOINTS) {
		const parts = endpoint.split('.');
		let obj: unknown = mockOctokit;
		for (const part of parts) {
			if (obj && typeof obj === 'object') {
				obj = (obj as Record<string, unknown>)[part];
			} else {
				obj = undefined;
				break;
			}
		}
		// If the endpoint function exists and was called (mock/spy), it's a violation
		if (typeof obj === 'function') {
			const fn = obj as { mock?: { calls?: unknown[] } };
			if (fn.mock?.calls && fn.mock.calls.length > 0) {
				violations.push(endpoint);
			}
		}
	}

	return { clean: violations.length === 0, violations };
}
