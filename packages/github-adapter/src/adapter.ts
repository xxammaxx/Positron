// Positron — GitHub Adapter: Interface

import type {
  GitHubIssueRef, GitHubIssueSummary, GitHubIssueComment,
  GitHubCommentResult, GitHubRepositorySummary,
  GitHubIssueClaimResult, ClaimOptions,
  GitHubPullRequest, CreatePROptions, PRListOptions, GitHubPRFile,
  MergePROptions, MergePRResult,
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

  // --- Pull Request Methods (Issue #17) ---

  /** Erstellt einen Pull Request. Idempotent: prüft zuerst ob bereits ein offener PR existiert. */
  createPullRequest(options: CreatePROptions): Promise<GitHubPullRequest>;

  /** Listet Pull Requests mit optionalem Head-Filter (für Idempotenz-Prüfung). */
  listPullRequests(options: PRListOptions): Promise<GitHubPullRequest[]>;

  /** Listet die geänderten Dateien eines Pull Requests. */
  listPullRequestFiles(owner: string, repo: string, prNumber: number): Promise<GitHubPRFile[]>;

  // --- Merge Methods (Issue #20) ---

  /** Holt einen einzelnen Pull Request (für Status-Prüfung). */
  getPullRequest(owner: string, repo: string, prNumber: number): Promise<GitHubPullRequest>;

  /** Merged einen Pull Request. Prüft mergeable state vorher. */
  mergePullRequest(options: MergePROptions): Promise<MergePRResult>;
}
