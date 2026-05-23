// Positron Shared Package — Barrel Export
// Kein Code, keine Initialisierung, keine Seiteneffekte.

export type { Phase, TerminalPhase, FailurePhase, RunStatus, AutonomyLevel, EventLevel, PositronLabel } from './types.js';
export { ALL_PHASES } from './types.js';
export type { Repository, IssueRecord, RunRecord, RunEventRecord, ArtifactRecord, CommandResultRecord } from './interfaces.js';
export {
  POSITRON_LABELS, POSITRON_LABEL_PREFIX, MAX_FIX_LOOPS, MAX_DIFF_SIZE,
  POLLING_INTERVAL_MS, MAX_POLLING_INTERVAL_MS, CLI_TIMEOUT_MS, CLI_MAX_RETRIES,
  POSITRON_VERSION, BRANCH_PREFIX, MAX_BRANCH_SLUG_LENGTH,
} from './constants.js';
export type { RedactionRule, IdGenerator } from './utils.js';
export { generateBranchName, redactSecrets, redactValue, createRunId, DEFAULT_REDACTION_RULES } from './utils.js';
export type { LiveGitHubE2EConfig, LiveGitHubE2EResult } from './live-e2e.js';
export { loadLiveGitHubE2EConfig, shouldSkipLiveGitHubE2E, shouldSkipLiveGitHubWriteE2E, generateLiveRunId, liveE2EMarker, isAsciiOnly } from './live-e2e.js';
export type { RepositoryConfig, PositronRuntimeConfig } from './repository-config.js';
export {
  loadRepositoryConfig, loadPositronRuntimeConfig,
  normalizeRepositoryConfig, isValidOwner, isValidRepo, buildRemoteUrl,
} from './repository-config.js';

// Spec Kit Types & Errors (Issue #15)
export type {
  SpecKitPhase, SpecKitCommandStatus, SpecKitHealth,
  SpecKitCommandResult, SpecKitArtifactRef,
  SpecKitRunInput, SpecKitAdapter,
} from './speckit-types.js';
export {
  SpecKitError, SpecKitNotInstalledError, SpecKitCommandNotAllowedError,
  SpecKitCommandFailedError, SpecKitWorkspaceInvalidError,
  SpecKitArtifactNotFoundError, SpecKitTimeoutError,
  SpecKitUnsupportedCommandError,
} from './speckit-errors.js';
