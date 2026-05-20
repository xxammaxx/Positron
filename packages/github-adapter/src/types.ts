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
