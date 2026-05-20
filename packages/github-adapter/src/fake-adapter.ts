// Positron — Fake GitHub Adapter (für Tests)

import type {
  GitHubIssueRef, GitHubIssueSummary, GitHubIssueComment,
  GitHubCommentResult, GitHubRepositorySummary,
  GitHubIssueClaimResult, ClaimOptions,
} from './types.js';
import type { GitHubAdapter } from './adapter.js';

export class FakeGitHubAdapter implements GitHubAdapter {
  private repos = new Map<string, GitHubRepositorySummary>();
  private issues = new Map<string, GitHubIssueSummary>();
  private comments = new Map<string, GitHubIssueComment[]>();
  private labels = new Map<string, string[]>();
  private nextCommentId = 1;

  addRepo(repo: GitHubRepositorySummary): void {
    this.repos.set(`${repo.owner}/${repo.name}`, repo);
  }

  addIssue(issue: GitHubIssueSummary): void {
    this.issues.set(`${issue.number}`, issue);
    this.labels.set(`${issue.number}`, [...issue.labels]);
  }

  async getRepository(owner: string, repo: string): Promise<GitHubRepositorySummary> {
    const r = this.repos.get(`${owner}/${repo}`);
    if (!r) throw new Error('Not found');
    return r;
  }

  async listOpenIssues(
    _owner: string, _repo: string,
    options?: { labels?: string[]; since?: string; limit?: number },
  ): Promise<GitHubIssueSummary[]> {
    let result = Array.from(this.issues.values()).filter(i => i.state === 'open');
    if (options?.labels?.length) {
      result = result.filter(i => options.labels!.some(l => i.labels.includes(l)));
    }
    return options?.limit ? result.slice(0, options.limit) : result;
  }

  async getIssue(ref: GitHubIssueRef): Promise<GitHubIssueSummary> {
    const issue = this.issues.get(`${ref.issueNumber}`);
    if (!issue) throw new Error('Issue not found');
    return issue;
  }

  async listIssueComments(ref: GitHubIssueRef): Promise<GitHubIssueComment[]> {
    return this.comments.get(`${ref.issueNumber}`) ?? [];
  }

  async createIssueComment(ref: GitHubIssueRef, body: string): Promise<GitHubCommentResult> {
    const id = this.nextCommentId++;
    const comment: GitHubIssueComment = {
      id, body,
      htmlUrl: `https://github.com/${ref.owner}/${ref.repo}/issues/${ref.issueNumber}#issuecomment-${id}`,
      createdAt: new Date().toISOString(),
    };
    const list = this.comments.get(`${ref.issueNumber}`) ?? [];
    list.push(comment);
    this.comments.set(`${ref.issueNumber}`, list);
    return { id, htmlUrl: comment.htmlUrl, createdAt: comment.createdAt };
  }

  async addIssueLabels(ref: GitHubIssueRef, labels: string[]): Promise<void> {
    const current = this.labels.get(`${ref.issueNumber}`) ?? [];
    for (const l of labels) {
      if (!current.includes(l)) current.push(l);
    }
    this.labels.set(`${ref.issueNumber}`, current);
    const issue = this.issues.get(`${ref.issueNumber}`);
    if (issue) issue.labels = current;
  }

  async removeIssueLabel(ref: GitHubIssueRef, label: string): Promise<void> {
    const current = this.labels.get(`${ref.issueNumber}`) ?? [];
    const idx = current.indexOf(label);
    if (idx >= 0) current.splice(idx, 1);
    this.labels.set(`${ref.issueNumber}`, current);
    const issue = this.issues.get(`${ref.issueNumber}`);
    if (issue) issue.labels = current;
  }

  async claimIssue(ref: GitHubIssueRef, options: ClaimOptions): Promise<GitHubIssueClaimResult> {
    const issue = this.issues.get(`${ref.issueNumber}`);
    if (!issue) throw new Error('Issue not found');

    // Prüfe ready
    if (options.readyLabel && !issue.labels.includes(options.readyLabel)) {
      return { status: 'not_ready', issue };
    }

    // Prüfe bereits running
    if (issue.labels.includes(options.runningLabel)) {
      const comments = this.comments.get(`${ref.issueNumber}`) ?? [];
      const existing = comments.find(c => c.body.includes(`**Run ID:** \`${options.runId}\``));
      return { status: 'already_claimed', issue, existingRunId: existing ? options.runId : undefined };
    }

    // Label setzen
    await this.addIssueLabels(ref, [options.runningLabel]);

    // Kommentar
    const { id } = await this.createIssueComment(ref, options.commentBody);

    return { status: 'claimed', issue, commentId: id };
  }
}
