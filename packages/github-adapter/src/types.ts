// Positron — GitHub Adapter: Typen

export interface GitHubIssueRef {
  owner: string;
  repo: string;
  issueNumber: number;
}

export interface GitHubIssueSummary {
  id: number;
  number: number;
  title: string;
  body: string | null;
  state: 'open' | 'closed';
  labels: string[];
  assignees: string[];
  htmlUrl: string;
  updatedAt: string;
  createdAt: string;
  isPullRequest: boolean;
}

export interface GitHubIssueComment {
  id: number;
  body: string;
  htmlUrl: string;
  createdAt: string;
}

export interface GitHubCommentResult {
  id: number;
  htmlUrl: string;
  createdAt: string;
}

export interface GitHubRepositorySummary {
  id: number;
  owner: string;
  name: string;
  fullName: string;
  defaultBranch: string;
}

export type GitHubIssueClaimResult =
  | { status: 'claimed'; issue: GitHubIssueSummary; commentId: number }
  | { status: 'already_claimed'; issue: GitHubIssueSummary; existingRunId?: string }
  | { status: 'not_ready'; issue: GitHubIssueSummary };

export interface ClaimOptions {
  runId: string;
  claimLabel: string;
  runningLabel: string;
  readyLabel?: string;
  commentBody: string;
}

// --- Pull Request Types (Issue #17) ---

export interface GitHubPullRequest {
  id: number;
  number: number;
  title: string;
  body: string | null;
  state: 'open' | 'closed' | 'merged';
  head: { ref: string; sha: string };
  base: { ref: string; sha: string };
  htmlUrl: string;
  createdAt: string;
  updatedAt: string;
  draft: boolean;
}

export interface GitHubPRFile {
  sha: string | null;
  filename: string;
  status: 'added' | 'modified' | 'removed' | 'renamed' | 'changed';
  additions: number;
  deletions: number;
  changes: number;
  patch?: string;
  previousFilename?: string;
}

export interface CreatePROptions {
  owner: string;
  repo: string;
  title: string;
  head: string;
  base: string;
  body?: string;
  draft?: boolean;
  /** GitHub usernames to request review from */
  reviewers?: string[];
  /** Team slugs (not full name) to request review from */
  teamReviewers?: string[];
}

export interface RequestReviewersOptions {
  owner: string;
  repo: string;
  prNumber: number;
  reviewers?: string[];
  teamReviewers?: string[];
}

export interface RequestReviewersResult {
  requested: boolean;
  reviewers?: string[];
  teamReviewers?: string[];
}

export interface PRListOptions {
  owner: string;
  repo: string;
  head?: string;
  state?: 'open' | 'closed' | 'all';
}

export interface MergePROptions {
  owner: string;
  repo: string;
  prNumber: number;
  strategy?: 'merge' | 'squash' | 'rebase';
  commitTitle?: string;
  commitMessage?: string;
}

export interface MergePRResult {
  merged: boolean;
  sha?: string;
  message?: string;
}
