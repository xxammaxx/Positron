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

// Test Command Detection & Execution
export { TestCommandDetector } from './detector.js';
export type {
  TestCommandKind, TestCommandStatus, DetectedTestCommand,
  TestCommandDetectionResult,
} from './detector.js';

export { TestRunner } from './test-runner.js';
export type {
  TestCommandExecutionResult, TestReport, RunOptions,
} from './test-runner.js';

export { renderTestReportMarkdown, renderTestReportComment } from './test-templates.js';

// Spec Kit Command Policy (Issue #15)
export {
  ALLOWED_SPECKIT_COMMANDS, BLOCKED_SPECKIT_COMMANDS,
  isAllowedSpecKitCommand, isBlockedSpecKitCommand,
  validateSpecKitCommand, SpecKitCommandPolicyError,
} from './speckit-policy.js';

// OpenCode Command Policy (Issue #16)
export {
  ALLOWED_OPENCODE_COMMANDS, BLOCKED_OPENCODE_COMMANDS,
  ALLOWED_SLASH_COMMANDS,
  validateOpenCodeCommand, OpenCodeCommandPolicyError,
} from './opencode-policy.js';
