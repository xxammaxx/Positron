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

// --- Stage 3 Approval Binding ---
export {
	createApprovalBinding,
	createApprovalBindingPreview,
	validateApprovalBinding,
	isApprovalExpired,
	generateApprovalText,
	computeApprovalTextSha256,
	createSyntheticApprovalBinding,
} from './stage3-approval-binding.js';
export type {
	Stage3ApprovalBinding,
	Stage3ApprovalBindingPreview,
	Stage3ApprovalValidationResult,
} from './stage3-approval-binding.js';

// --- Stage 3 Base Resolver ---
export {
	checkBaseDrift,
	Stage3BaseShaDriftError,
	createFakeBaseResolver,
} from './stage3-base-resolver.js';
export type {
	Stage3BaseResolver,
	Stage3ResolvedBase,
	Stage3BaseDriftResult,
} from './stage3-base-resolver.js';

// --- Stage 3 Runtime Safety Probe ---
export {
	validateSafetySnapshot,
	createFakeRuntimeSafetyProbe,
	createSafeSnapshot,
	createEnvRuntimeSafetyProbe,
} from './stage3-runtime-safety-probe.js';
export type {
	Stage3RuntimeSafetyProbe,
	Stage3SafetySnapshot,
	Stage3SafetyValidation,
} from './stage3-runtime-safety-probe.js';

// --- Stage 3 Reader / Verifier ---
export {
	verifyPreWrite,
	verifyPostWrite,
	createFakeReadOnlyVerifier,
} from './stage3-reader-verifier.js';
export type {
	Stage3RepositoryReader,
	Stage3BranchReader,
	Stage3ContentReader,
	Stage3CommitReader,
	Stage3PullRequestReader,
	Stage3ReadOnlyVerifier,
	PreWriteVerificationInput,
	PreWriteVerificationResult,
	PostWriteVerificationInput,
	PostWriteVerificationResult,
} from './stage3-reader-verifier.js';

// --- Stage 3 Real GitHub Bridge ---
// NOTE: createStage3RealGitHubBridge and Stage3GitHubTransport are INTERNAL.
// They are NOT exported from the package root to prevent direct write bypass.
// Only mock bridges and capability verification are publicly accessible.
export {
	createMockStage3Bridge,
	verifyBridgeCapabilities,
	STAGE3_ALLOWED_CAPABILITIES,
	STAGE3_FORBIDDEN_CAPABILITIES,
} from './stage3-real-github-bridge.js';
export type { Stage3AllowedCapability } from './stage3-real-github-bridge.js';

// --- Stage 3 Canonical Manifest ---
export {
	sha256Utf8,
	sha256Bytes,
	utf8ByteLength,
	computeManifestSha256,
} from './stage3-canonical-manifest.js';

// --- Stage 3 Octokit Transport ---
// NOTE: createStage3OctokitTransport and STAGE3_FORBIDDEN_OCTOKIT_ENDPOINTS are INTERNAL.
// They are NOT exported from the package root to prevent direct write bypass.
// verifyNoForbiddenEndpointsCalled is test-only and also not publicly exported.
// The transport is only constructable internally via the harness/bridge assembly chain.

// --- Label Lifecycle ---
export { getLabelsForPhase, LABEL_LIFECYCLE } from './label-lifecycle.js';
export type { PhaseLabels } from './label-lifecycle.js';
