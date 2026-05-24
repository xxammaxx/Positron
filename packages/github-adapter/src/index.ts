// Positron GitHub Adapter — Barrel Export
export { createGitHubClient, createSafeLogger } from './client.js';
export type { GitHubClientOptions } from './client.js';
export { pollIssues, filterByLabel, isPullRequest } from './issues.js';
export type { PollState, PolledIssue } from './issues.js';
export { syncManagedLabels } from './labels.js';
export { writeComment, commentMarker } from './comments.js';

// Neue Exports (Issue #9)
export type {
  GitHubIssueRef, GitHubIssueSummary, GitHubIssueComment,
  GitHubCommentResult, GitHubRepositorySummary,
  GitHubIssueClaimResult, ClaimOptions,
  GitHubPullRequest, CreatePROptions, PRListOptions, GitHubPRFile,
  MergePROptions, MergePRResult,
  RequestReviewersOptions, RequestReviewersResult,
} from './types.js';
export type { GitHubAdapter } from './adapter.js';
export { RealGitHubAdapter, createRealGitHubAdapter, mapRequestError } from './real-adapter.js';
export { FakeGitHubAdapter } from './fake-adapter.js';
export {
  GitHubError, GitHubAuthError, GitHubPermissionError, GitHubNotFoundError,
  GitHubIssuesDisabledError, GitHubValidationError,
  GitHubRateLimitError, GitHubSecondaryRateLimitError,
  GitHubNetworkError, GitHubUnknownError,
} from './errors.js';
export { renderAccepted, renderStatusUpdate, renderBlocked, renderDone } from './templates.js';

// Issue #12 — Status Sync
export {
  renderSyncAccepted, renderSyncPhaseUpdate, renderSyncTestReport,
  renderSyncBlocked, renderSyncFailed, renderSyncDone, syncMarker, truncateComment,
  renderEvidenceSection, renderLlmMetadataSection,
} from './sync-templates.js';
export { GitHubStatusSyncService } from './sync-service.js';
export type { GitHubStatusSyncInput, GitHubStatusSyncResult, EvidenceItem, SafeLlmRunMetadata } from './sync-service.js';
export { getLabelsForPhase, LABEL_LIFECYCLE } from './label-lifecycle.js';
export type { PhaseLabels } from './label-lifecycle.js';
