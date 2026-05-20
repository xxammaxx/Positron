// Positron — GitHub Adapter: Interface

import type {
  GitHubIssueRef, GitHubIssueSummary, GitHubIssueComment,
  GitHubCommentResult, GitHubRepositorySummary,
  GitHubIssueClaimResult, ClaimOptions,
} from './types.js';

export interface GitHubAdapter {
  getRepository(owner: string, repo: string): Promise<GitHubRepositorySummary>;

  listOpenIssues(owner: string, repo: string, options?: {
    labels?: string[];
    since?: string;
    limit?: number;
  }): Promise<GitHubIssueSummary[]>;

  getIssue(ref: GitHubIssueRef): Promise<GitHubIssueSummary>;

  listIssueComments(ref: GitHubIssueRef): Promise<GitHubIssueComment[]>;

  createIssueComment(ref: GitHubIssueRef, body: string): Promise<GitHubCommentResult>;

  addIssueLabels(ref: GitHubIssueRef, labels: string[]): Promise<void>;

  removeIssueLabel(ref: GitHubIssueRef, label: string): Promise<void>;

  claimIssue(ref: GitHubIssueRef, options: ClaimOptions): Promise<GitHubIssueClaimResult>;
}
