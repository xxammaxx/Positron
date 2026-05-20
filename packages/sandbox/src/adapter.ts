// Positron — Git Workspace Adapter: Typen

export interface GitWorkspaceRef {
  owner: string;
  repo: string;
  remoteUrl: string;
}

export interface PrepareWorkspaceInput {
  repository: GitWorkspaceRef;
  issueNumber: number;
  issueTitle: string;
  runId: string;
  baseBranch?: string;
}

export interface PreparedWorkspace {
  runId: string;
  owner: string;
  repo: string;
  workspacePath: string;
  branchName: string;
  baseBranch: string;
  defaultBranch: string;
  headSha?: string;
  isNewClone: boolean;
  isNewBranch: boolean;
}

export interface GitStatusSummary {
  branch: string;
  isClean: boolean;
  ahead: number;
  behind: number;
  staged: string[];
  unstaged: string[];
  untracked: string[];
  conflicted: string[];
}

export interface GitDiffSummary {
  raw: string;
  filesChanged: number;
  insertions?: number;
  deletions?: number;
}

export interface GitWorkspaceAdapter {
  prepareWorkspace(input: PrepareWorkspaceInput): Promise<PreparedWorkspace>;
  getStatus(workspacePath: string): Promise<GitStatusSummary>;
  getDiff(workspacePath: string, options?: { staged?: boolean; baseRef?: string }): Promise<GitDiffSummary>;
  getCurrentBranch(workspacePath: string): Promise<string>;
  getHeadSha(workspacePath: string): Promise<string>;
  validateWorkspacePath(workspacePath: string): Promise<void>;
}
