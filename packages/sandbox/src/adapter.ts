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

// ---- Push/Commit Types (Issue #19) ----

export interface CommitOptions {
  workspacePath: string;
  message: string;
  author?: string;
}

export interface PushOptions {
  workspacePath: string;
  branch: string;
  remote?: string;
  force?: boolean;
}

export interface CommitPushResult {
  committed: boolean;
  pushed: boolean;
  headSha?: string;
  branch: string;
  diff?: GitDiffSummary;
}

export interface GitWorkspaceAdapter {
  prepareWorkspace(input: PrepareWorkspaceInput): Promise<PreparedWorkspace>;
  getStatus(workspacePath: string): Promise<GitStatusSummary>;
  getDiff(workspacePath: string, options?: { staged?: boolean; baseRef?: string }): Promise<GitDiffSummary>;
  getCurrentBranch(workspacePath: string): Promise<string>;
  getHeadSha(workspacePath: string): Promise<string>;
  validateWorkspacePath(workspacePath: string): Promise<void>;

  // --- Push/Commit Methods (Issue #19) ---

  /** Stage alle Änderungen und committe mit der gegebenen Message */
  commit(workspacePath: string, message: string): Promise<{ sha: string }>;

  /** Push den Branch zum Remote (default: origin). Blockiert force und main/master. */
  push(options: PushOptions): Promise<{ pushed: boolean; ref: string }>;
}
