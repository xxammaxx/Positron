// Positron — Real GitHub Adapter (Octokit-basiert)

import type { Octokit } from '@octokit/rest';
import { RequestError } from '@octokit/request-error';
import { createGitHubClient } from './client.js';
import { pollIssues, isPullRequest } from './issues.js';
import { syncManagedLabels } from './labels.js';
import { writeComment } from './comments.js';
import type {
  GitHubIssueRef, GitHubIssueSummary, GitHubIssueComment,
  GitHubCommentResult, GitHubRepositorySummary,
  GitHubIssueClaimResult, ClaimOptions,
} from './types.js';
import { renderAccepted } from './templates.js';
import {
  GitHubAuthError, GitHubPermissionError, GitHubNotFoundError,
  GitHubIssuesDisabledError, GitHubValidationError,
  GitHubRateLimitError, GitHubSecondaryRateLimitError,
  GitHubNetworkError, GitHubUnknownError, GitHubError,
} from './errors.js';
import { redactSecrets } from '@positron/shared';
import type { GitHubAdapter } from './adapter.js';

// ---------------------------------------------------------------------------
// Error Mapping
// ---------------------------------------------------------------------------

export function mapRequestError(err: RequestError): GitHubError {
  const status = err.status;
  const headers = err.response?.headers ?? {};

  // Rate Limits
  const remaining = Number(headers['x-ratelimit-remaining'] ?? -1);
  if (status === 403 && remaining === 0) {
    return new GitHubRateLimitError(
      Number(headers['retry-after'] ?? 60),
      Number(headers['x-ratelimit-limit'] ?? 5000),
      remaining,
      Number(headers['x-ratelimit-reset'] ?? 0),
    );
  }

  // Secondary Rate Limit
  const retryAfter = headers['retry-after'];
  if (status === 403 && retryAfter && String(err.message).includes('secondary')) {
    return new GitHubSecondaryRateLimitError(Number(retryAfter));
  }

  switch (status) {
    case 401: return new GitHubAuthError();
    case 403: return new GitHubPermissionError();
    case 404: return new GitHubNotFoundError();
    case 410: return new GitHubIssuesDisabledError();
    case 422: return new GitHubValidationError(redactSecrets(err.message));
    default: return new GitHubUnknownError(status, redactSecrets(err.message));
  }
}

// ---------------------------------------------------------------------------
// Real GitHub Adapter
// ---------------------------------------------------------------------------

export class RealGitHubAdapter implements GitHubAdapter {
  private octokit: Octokit;

  constructor(octokit?: Octokit) {
    this.octokit = octokit ?? createGitHubClient();
  }

  async getRepository(owner: string, repo: string): Promise<GitHubRepositorySummary> {
    try {
      const { data } = await this.octokit.rest.repos.get({ owner, repo });
      return {
        id: data.id,
        owner: data.owner.login,
        name: data.name,
        fullName: data.full_name,
        defaultBranch: data.default_branch,
      };
    } catch (err) {
      if (err instanceof RequestError) throw mapRequestError(err);
      throw new GitHubNetworkError(String(err));
    }
  }

  async listOpenIssues(
    owner: string, repo: string,
    options?: { labels?: string[]; since?: string; limit?: number },
  ): Promise<GitHubIssueSummary[]> {
    try {
      const state = { since: options?.since };
      const issues = await pollIssues(this.octokit, owner, repo, state);
      let result = issues.map(i => ({
        id: i.number,
        number: i.number,
        title: i.title,
        body: null,
        state: i.state as 'open' | 'closed',
        labels: i.labels,
        assignees: [],
        htmlUrl: i.url,
        updatedAt: i.updatedAt,
        createdAt: '',
        isPullRequest: false,
      }));

      if (options?.labels?.length) {
        result = result.filter(i => options.labels!.some(l => i.labels.includes(l)));
      }

      return options?.limit ? result.slice(0, options.limit) : result;
    } catch (err) {
      if (err instanceof RequestError) throw mapRequestError(err);
      throw new GitHubNetworkError(String(err));
    }
  }

  async getIssue(ref: GitHubIssueRef): Promise<GitHubIssueSummary> {
    try {
      const { data } = await this.octokit.rest.issues.get({
        owner: ref.owner, repo: ref.repo, issue_number: ref.issueNumber,
      });
      return {
        id: data.id,
        number: data.number,
        title: data.title,
        body: data.body ?? null,
        state: data.state as 'open' | 'closed',
        labels: (data.labels ?? []).map(l => typeof l === 'string' ? l : l.name ?? ''),
        assignees: (data.assignees ?? []).map(a => a?.login ?? ''),
        htmlUrl: data.html_url,
        updatedAt: data.updated_at,
        createdAt: data.created_at,
        isPullRequest: 'pull_request' in data && data.pull_request !== undefined && data.pull_request !== null,
      };
    } catch (err) {
      if (err instanceof RequestError) throw mapRequestError(err);
      throw new GitHubNetworkError(String(err));
    }
  }

  async listIssueComments(ref: GitHubIssueRef): Promise<GitHubIssueComment[]> {
    try {
      const { data } = await this.octokit.rest.issues.listComments({
        owner: ref.owner, repo: ref.repo, issue_number: ref.issueNumber,
        per_page: 100,
      });
      return data.map(c => ({
        id: c.id,
        body: c.body ?? '',
        htmlUrl: c.html_url,
        createdAt: c.created_at,
      }));
    } catch (err) {
      if (err instanceof RequestError) throw mapRequestError(err);
      throw new GitHubNetworkError(String(err));
    }
  }

  async createIssueComment(ref: GitHubIssueRef, body: string): Promise<GitHubCommentResult> {
    if (!body || body.trim().length === 0) throw new GitHubValidationError('Comment body is empty');
    try {
      const result = await writeComment(this.octokit, ref.owner, ref.repo, ref.issueNumber, body);
      return { id: result.id, htmlUrl: result.url, createdAt: new Date().toISOString() };
    } catch (err) {
      if (err instanceof RequestError) throw mapRequestError(err);
      throw new GitHubNetworkError(String(err));
    }
  }

  async addIssueLabels(ref: GitHubIssueRef, labels: string[]): Promise<void> {
    try {
      await syncManagedLabels(this.octokit, ref.owner, ref.repo, ref.issueNumber, labels);
    } catch (err) {
      if (err instanceof RequestError) throw mapRequestError(err);
      throw new GitHubNetworkError(String(err));
    }
  }

  async removeIssueLabel(ref: GitHubIssueRef, label: string): Promise<void> {
    try {
      await this.octokit.rest.issues.removeLabel({
        owner: ref.owner, repo: ref.repo, issue_number: ref.issueNumber, name: label,
      });
    } catch (err) {
      if (err instanceof RequestError) {
        if (err.status === 404) return; // Label already gone
        throw mapRequestError(err);
      }
      throw new GitHubNetworkError(String(err));
    }
  }

  async claimIssue(ref: GitHubIssueRef, options: ClaimOptions): Promise<GitHubIssueClaimResult> {
    // 1. Issue frisch lesen
    const issue = await this.getIssue(ref);

    // 2. Prüfen ob ready-Label vorhanden (falls konfiguriert)
    if (options.readyLabel && !issue.labels.includes(options.readyLabel)) {
      return { status: 'not_ready', issue };
    }

    // 3. Prüfen ob bereits running
    if (issue.labels.includes(options.runningLabel)) {
      // Check existing comments for Run ID
      const comments = await this.listIssueComments(ref);
      const existing = comments.find(c => c.body.includes(`**Run ID:** \`${options.runId}\``));
      return {
        status: 'already_claimed',
        issue,
        existingRunId: existing ? options.runId : undefined,
      };
    }

    // 4. Labels setzen
    const desired = [options.runningLabel];
    await syncManagedLabels(this.octokit, ref.owner, ref.repo, ref.issueNumber, desired);

    // 5. Claim-Kommentar schreiben
    const comment = await writeComment(
      this.octokit, ref.owner, ref.repo, ref.issueNumber,
      options.commentBody,
    );

    return { status: 'claimed', issue, commentId: comment.id };
  }

  getClient(): Octokit { return this.octokit; }
}

/** Factory: Erstellt RealGitHubAdapter oder wirft Error wenn Token fehlt */
export function createRealGitHubAdapter(): RealGitHubAdapter {
  return new RealGitHubAdapter(createGitHubClient());
}
