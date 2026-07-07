// Positron — GitHub Adapter Package: Zentrale Exporte

export { createGitHubClient, createSafeLogger } from './client.js';
export type { GitHubClientOptions } from './client.js';
export { pollIssues, filterByLabel, isPullRequest } from './issues.js';
export type { PollState, PolledIssue } from './issues.js';
export { syncManagedLabels } from './labels.js';
export { writeComment, commentMarker } from './comments.js';
export type {
	GitHubIssueRef,
	GitHubIssueSummary,
	GitHubIssueComment,
	GitHubCommentResult,
	GitHubRepositorySummary,
	GitHubIssueClaimResult,
	ClaimOptions,
	GitHubPullRequest,
	CreatePROptions,
	PRListOptions,
	GitHubPRFile,
	MergePROptions,
	MergePRResult,
	RequestReviewersOptions,
	RequestReviewersResult,
} from './types.js';

// --- Adapter Interfaces ---
export type { ReadOnlyGitHubAdapter, GitHubAdapter } from './adapter.js';

// --- Adapter Implementations ---
export { RealGitHubAdapter, createRealGitHubAdapter, mapRequestError } from './real-adapter.js';
export { FakeGitHubAdapter } from './fake-adapter.js';

// --- ReadOnly Capability Layer ---
export {
	ReadOnlyGitHubAdapterWrapper,
	createReadOnlyGitHubAdapter,
} from './readonly-adapter.js';

// --- Errors ---
export {
	GitHubError,
	GitHubAuthError,
	GitHubPermissionError,
	GitHubCapabilityError,
	GitHubNotFoundError,
	GitHubIssuesDisabledError,
	GitHubValidationError,
	GitHubRateLimitError,
	GitHubSecondaryRateLimitError,
	GitHubNetworkError,
	GitHubUnknownError,
} from './errors.js';

// --- Templates ---
export { renderAccepted, renderStatusUpdate, renderBlocked, renderDone } from './templates.js';
export {
	renderSyncAccepted,
	renderSyncPhaseUpdate,
	renderSyncTestReport,
	renderSyncBlocked,
	renderSyncFailed,
	renderSyncDone,
	renderSyncPrCreated,
	renderSyncMerged,
	syncMarker,
	truncateComment,
	renderEvidenceSection,
	renderLlmMetadataSection,
} from './sync-templates.js';

// --- Sync Service ---
export { GitHubStatusSyncService } from './sync-service.js';
export type {
	GitHubStatusSyncInput,
	GitHubStatusSyncResult,
	EvidenceItem,
	SafeLlmRunMetadata,
} from './sync-service.js';

// --- Label Lifecycle ---
export { getLabelsForPhase, LABEL_LIFECYCLE } from './label-lifecycle.js';
export type { PhaseLabels } from './label-lifecycle.js';
