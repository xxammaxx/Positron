// Positron Sandbox / Git Workspace — Barrel Export
export { runCommand } from './command-runner.js';
export type { CommandResult, RunCommandOptions } from './command-runner.js';
export { GitCommandError, GitCommandFailedError, GitCommandPolicyError, GitWorkspacePathError } from './command-runner.js';

export { createWorkspacePath, createPositronBranchName, validatePath, validateRemoteUrl } from './paths.js';
export { GitRemoteInvalidError } from './paths.js';

export type {
  GitWorkspaceRef, PrepareWorkspaceInput, PreparedWorkspace,
  GitStatusSummary, GitDiffSummary, GitWorkspaceAdapter,
} from './adapter.js';

export { RealGitWorkspaceAdapter } from './real-adapter.js';
export { FakeGitWorkspaceAdapter } from './fake-adapter.js';
