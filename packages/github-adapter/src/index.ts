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

// --- Stage 2 Write-Sandbox Policy ---
export {
	Stage2WriteSandboxPolicy,
	createStage2SandboxPolicy,
	STAGE2_DEFAULT_CONFIG,
	STAGE2_PERMANENTLY_FORBIDDEN,
} from './stage2-write-sandbox-policy.js';
export type {
	Stage2WriteOperation,
	Stage2WriteSandboxConfig,
	Stage2WritePolicyResult,
	Stage2PreWritePreview,
	Stage2WriteAuditEvent,
} from './stage2-write-sandbox-policy.js';

// --- Stage 2 Runtime Write Harness ---
export {
	Stage2RuntimeWriteHarness,
	createStage2WriteHarness,
} from './stage2-runtime-write-harness.js';
export type {
	Stage2IssueCommentWriter,
	Stage2WriteHarnessInput,
	Stage2WriteHarnessResult,
	Stage2WriteHarnessConfig,
	Stage2AuditSink,
} from './stage2-runtime-write-harness.js';

// --- Stage 3 Supervised Pilot Policy ---
export {
	Stage3SupervisedPilotPolicy,
	createStage3PilotPolicy,
	STAGE3_DEFAULT_CONFIG,
	STAGE3_CANONICAL,
} from './stage3-supervised-pilot-policy.js';
export type {
	Stage3WriteOperation,
	Stage3PilotConfig,
	Stage3PilotPolicyResult,
	Stage3PreWritePreview,
	Stage3PilotAuditEvent,
	Stage3FailedGate,
	Stage3ProcessSafety,
} from './stage3-supervised-pilot-policy.js';

// --- Stage 3 Runtime Harness ---
export {
	Stage3RuntimeHarness,
	createStage3Harness,
} from './stage3-runtime-harness.js';
export type {
	Stage3BranchWriter,
	Stage3FileCommitWriter,
	Stage3PullRequestWriter,
	Stage3HarnessInput,
	Stage3HarnessResult,
	Stage3HarnessConfig,
	Stage3AuditSink,
} from './stage3-runtime-harness.js';

// --- Label Lifecycle ---
export { getLabelsForPhase, LABEL_LIFECYCLE } from './label-lifecycle.js';
export type { PhaseLabels } from './label-lifecycle.js';
