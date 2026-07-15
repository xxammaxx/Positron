// Positron — ReadOnly GitHub Adapter (Composition Wrapper)

import type { ReadOnlyGitHubAdapter } from './adapter.js';
import { GitHubCapabilityError } from './errors.js';
import type {
	GitHubIssueComment,
	GitHubIssueRef,
	GitHubIssueSummary,
	GitHubPRFile,
	GitHubPullRequest,
	GitHubRepositorySummary,
	PRListOptions,
} from './types.js';

/**
 * Wraps a full GitHubAdapter to expose only read operations.
 * Uses a closure-private #inner reference — the wrapped adapter
 * is NOT accessible from outside this class. Write operations are
 * blocked at runtime with GitHubCapabilityError.
 */
export class ReadOnlyGitHubAdapterWrapper implements ReadOnlyGitHubAdapter {
	readonly #inner: ReadOnlyGitHubAdapter;

	constructor(adapter: ReadOnlyGitHubAdapter) {
		this.#inner = adapter;
	}

	/** Not exposed — the wrapped adapter is inaccessible from outside. */
	// (No getClient(), no getInner(), no public inner property)

	// --- Read Operations (delegate) ---

	async getRepository(owner: string, repo: string): Promise<GitHubRepositorySummary> {
		return this.#inner.getRepository(owner, repo);
	}

	async listOpenIssues(
		owner: string,
		repo: string,
		options?: { labels?: string[]; since?: string; limit?: number },
	): Promise<GitHubIssueSummary[]> {
		return this.#inner.listOpenIssues(owner, repo, options);
	}

	async getIssue(ref: GitHubIssueRef): Promise<GitHubIssueSummary> {
		return this.#inner.getIssue(ref);
	}

	async listIssueComments(ref: GitHubIssueRef): Promise<GitHubIssueComment[]> {
		return this.#inner.listIssueComments(ref);
	}

	async listPullRequests(options: PRListOptions): Promise<GitHubPullRequest[]> {
		return this.#inner.listPullRequests(options);
	}

	async listPullRequestFiles(
		owner: string,
		repo: string,
		prNumber: number,
	): Promise<GitHubPRFile[]> {
		return this.#inner.listPullRequestFiles(owner, repo, prNumber);
	}

	async getPullRequest(owner: string, repo: string, prNumber: number): Promise<GitHubPullRequest> {
		return this.#inner.getPullRequest(owner, repo, prNumber);
	}
}

/**
 * Factory: Creates a read-only adapter from any ReadOnlyGitHubAdapter.
 * The returned object can only call read operations. Write methods
 * are absent from the type at compile time and unavailable at runtime.
 *
 * @param adapter - Any object implementing ReadOnlyGitHubAdapter (e.g., FakeGitHubAdapter, RealGitHubAdapter)
 * @returns A ReadOnlyGitHubAdapter with the inner adapter hidden behind a closure-private field.
 */
export function createReadOnlyGitHubAdapter(adapter: ReadOnlyGitHubAdapter): ReadOnlyGitHubAdapter {
	return new ReadOnlyGitHubAdapterWrapper(adapter);
}
