// Positron — OpenCode Provider Detection + Safe Install/Sync Foundation (Issue #229 PR 6)
// ---------------------------------------------------------------------------
// This module defines the detection types, safe install request model,
// provider runtime readiness policy, and evidence redaction for the
// OpenCode coding-agent provider.
//
// SECURITY: This module is PURE TYPES, VALIDATION, and POLICY.
// No OpenCode coding run. No automatic install. No download.
// No curl pipe-bash execution. No MCP runtime. No Spec Kit execution.
// Install requires Human Approval.
//
// Hard Constraints:
//   - Detection is read-only: only --version and --help allowed when binary exists
//   - Install command displayed but NEVER auto-executed
//   - sudo is forbidden
//   - auto-run is forbidden
//   - Install requires Human Approval (always)
//   - Evidence redacts private paths and secrets
//   - Real readiness requires OpenCode + model profile + Spec Kit sync + MCP warm-up + Human Approval

import { type ValidationResult, validationPass, validationFail } from './opencode-model-profile.js';

// ── Union Types ────────────────────────────────────────────────────────────

/** OpenCode binary detection status */
export type OpenCodeDetectionStatus =
	| 'unknown'
	| 'not_found'
	| 'found'
	| 'version_checked'
	| 'help_checked'
	| 'blocked'
	| 'error';

/** OpenCode install request lifecycle status */
export type OpenCodeInstallStatus =
	| 'not_requested'
	| 'approval_required'
	| 'approved'
	| 'blocked'
	| 'installed'
	| 'failed';

/** OpenCode provider runtime readiness status */
export type OpenCodeProviderRuntimeStatus =
	| 'not_ready'
	| 'detect_only'
	| 'install_request_ready'
	| 'installed_unverified'
	| 'installed_verified'
	| 'model_profile_required'
	| 'speckit_sync_required'
	| 'mcp_warmup_required'
	| 'ready_for_demo'
	| 'ready_for_real'
	| 'blocked';

// ── Constant Arrays ────────────────────────────────────────────────────────

/** All valid OpenCode detection statuses */
export const ALL_OPENCODE_DETECTION_STATUSES: readonly OpenCodeDetectionStatus[] = [
	'unknown',
	'not_found',
	'found',
	'version_checked',
	'help_checked',
	'blocked',
	'error',
] as const;

/** All valid OpenCode install statuses */
export const ALL_OPENCODE_INSTALL_STATUSES: readonly OpenCodeInstallStatus[] = [
	'not_requested',
	'approval_required',
	'approved',
	'blocked',
	'installed',
	'failed',
] as const;

/** All valid OpenCode provider runtime statuses */
export const ALL_OPENCODE_PROVIDER_RUNTIME_STATUSES: readonly OpenCodeProviderRuntimeStatus[] = [
	'not_ready',
	'detect_only',
	'install_request_ready',
	'installed_unverified',
	'installed_verified',
	'model_profile_required',
	'speckit_sync_required',
	'mcp_warmup_required',
	'ready_for_demo',
	'ready_for_real',
	'blocked',
] as const;

// ── Type Guard Functions ───────────────────────────────────────────────────

/** Type guard: check if value is a valid OpenCodeDetectionStatus */
export function isOpenCodeDetectionStatus(value: unknown): value is OpenCodeDetectionStatus {
	return (
		typeof value === 'string' &&
		(ALL_OPENCODE_DETECTION_STATUSES as readonly string[]).includes(value)
	);
}

/** Type guard: check if value is a valid OpenCodeInstallStatus */
export function isOpenCodeInstallStatus(value: unknown): value is OpenCodeInstallStatus {
	return (
		typeof value === 'string' &&
		(ALL_OPENCODE_INSTALL_STATUSES as readonly string[]).includes(value)
	);
}

/** Type guard: check if value is a valid OpenCodeProviderRuntimeStatus */
export function isOpenCodeProviderRuntimeStatus(value: unknown): value is OpenCodeProviderRuntimeStatus {
	return (
		typeof value === 'string' &&
		(ALL_OPENCODE_PROVIDER_RUNTIME_STATUSES as readonly string[]).includes(value)
	);
}

// ── OpenCode Binary Detection ──────────────────────────────────────────────

/**
 * Result of detecting the OpenCode binary on the system.
 *
 * SECURITY: detectedPath may contain private filesystem paths.
 * This field MUST be redacted before evidence or logging output.
 */
export interface OpenCodeBinaryDetection {
	/** Fixed binary name — always "opencode" */
	binaryName: 'opencode';
	/** Filesystem path where the binary was detected (if found) */
	detectedPath?: string;
	/** Current detection status */
	detectionStatus: OpenCodeDetectionStatus;
	/** Detected version string (from --version, if checked) */
	version?: string;
	/** Whether --help invocation succeeded */
	helpAvailable: boolean;
	/** ISO 8601 timestamp of when the detection was performed */
	checkedAt: string;
	/** Error message if detection failed */
	errorMessage?: string;
}

// ── Safe Install Request Model ─────────────────────────────────────────────

/**
 * Structured OpenCode install request.
 *
 * This request is a DATA MODEL — it describes what WOULD be installed
 * and how. It MUST NOT be automatically executed.
 *
 * ALL fields asserting true/false are LITERAL TYPES — any deviation
 * makes the object invalid and MUST be rejected by validation.
 */
export interface OpenCodeInstallRequest {
	/** Tool identifier — always "opencode" */
	tool: 'opencode';
	/** Official install script URL */
	officialUrl: 'https://opencode.ai/install';
	/** Target install directory (Positron-managed) */
	installDir: string;
	/** Preview of the install command (for display only) */
	commandPreview: string;
	/** Must always be true — install requires human approval */
	requiresHumanApproval: true;
	/** Must always be false — sudo is never permitted */
	sudoAllowed: false;
	/** Must always be false — no automatic execution */
	autoRunAllowed: false;
	/** Install requires network access */
	networkRequired: true;
	/** Warning about curl-pipe-bash risks */
	trustWarning: string;
	/** Whether manual fallback instructions are available */
	manualFallbackAvailable: true;
}

/** Default Positron-managed install directory for OpenCode */
export const DEFAULT_OPENCODE_INSTALL_DIR = '$HOME/.positron/tools/bin';

/** Official OpenCode install URL */
export const OFFICIAL_OPENCODE_INSTALL_URL = 'https://opencode.ai/install';

/** The official install command (for display, NOT execution) */
export const OFFICIAL_OPENCODE_INSTALL_COMMAND =
	'curl -fsSL https://opencode.ai/install | bash';

/** Safe Positron-controlled install command with enforced install directory */
export const POSITRON_OPENCODE_INSTALL_COMMAND_TEMPLATE =
	'OPENCODE_INSTALL_DIR="$HOME/.positron/tools/bin" curl -fsSL https://opencode.ai/install | bash';

/** Trust warning displayed alongside install requests */
export const CURL_PIPE_BASH_TRUST_WARNING =
	'curl-pipe-bash risk: this command downloads and executes remote code. ' +
	'Verify the URL, use only the Positron-controlled install directory, ' +
	'and never use sudo. Manual installation is available as a fallback.';

/** Allowlisted base URLs for OpenCode install commands */
export const ALLOWLISTED_OPENCODE_INSTALL_URLS: readonly string[] = [
	'https://opencode.ai/install',
] as const;

// ── Install Request Builder ────────────────────────────────────────────────

/**
 * Build a safe, structured OpenCode install request.
 *
 * This function creates a DATA MODEL describing the install. It does NOT
 * execute any command, download anything, or modify the filesystem.
 *
 * @param options.installDir — Override install directory (default: $HOME/.positron/tools/bin)
 * @returns A validated OpenCodeInstallRequest data model
 */
export function buildOpenCodeInstallRequest(options?: {
	installDir?: string;
}): OpenCodeInstallRequest {
	const installDir = options?.installDir ?? DEFAULT_OPENCODE_INSTALL_DIR;

	// Build the command preview with the correct install directory
	const commandPreview =
		`OPENCODE_INSTALL_DIR="${installDir}" curl -fsSL ${OFFICIAL_OPENCODE_INSTALL_URL} | bash`;

	return {
		tool: 'opencode',
		officialUrl: OFFICIAL_OPENCODE_INSTALL_URL,
		installDir,
		commandPreview,
		requiresHumanApproval: true,
		sudoAllowed: false,
		autoRunAllowed: false,
		networkRequired: true,
		trustWarning: CURL_PIPE_BASH_TRUST_WARNING,
		manualFallbackAvailable: true,
	} as OpenCodeInstallRequest;
}

// ── Install Request Validation ─────────────────────────────────────────────

/**
 * Validate an OpenCodeInstallRequest for safety and correctness.
 *
 * Must fail if:
 *   - sudoAllowed is true
 *   - autoRunAllowed is true
 *   - requiresHumanApproval is false
 *   - officialUrl is not the allowlisted URL
 *   - commandPreview does not contain OPENCODE_INSTALL_DIR
 *   - commandPreview contains "sudo"
 *   - commandPreview contains a non-allowlisted URL
 *   - installDir is empty
 */
export function validateOpenCodeInstallRequest(value: unknown): ValidationResult {
	const errors: string[] = [];

	if (!value || typeof value !== 'object') {
		return validationFail(['Install request must be a non-null object']);
	}

	const r = value as Record<string, unknown>;

	// ── Required field presence ──

	const requiredStringFields = ['tool', 'installDir', 'commandPreview', 'trustWarning'] as const;
	for (const field of requiredStringFields) {
		if (typeof r[field] !== 'string' || (r[field] as string).length === 0) {
			errors.push(`Missing or empty required field: ${field}`);
		}
	}

	// ── tool must be "opencode" ──

	if (r.tool !== 'opencode') {
		errors.push(`tool must be "opencode", got: ${JSON.stringify(r.tool)}`);
	}

	// ── officialUrl must be the allowlisted URL ──

	if (r.officialUrl !== OFFICIAL_OPENCODE_INSTALL_URL) {
		errors.push(
			`officialUrl must be "${OFFICIAL_OPENCODE_INSTALL_URL}", ` +
			`got: ${JSON.stringify(r.officialUrl)}`,
		);
	}

	// ── installDir must not be empty (checked above) ──

	if (typeof r.installDir === 'string' && r.installDir.trim().length === 0) {
		errors.push('installDir must not be empty');
	}

	// ── Hard safety assertions (literal type checks) ──

	if (r.requiresHumanApproval !== true) {
		errors.push(
			`requiresHumanApproval must be true, got: ${JSON.stringify(r.requiresHumanApproval)}`,
		);
	}

	if (r.sudoAllowed !== false) {
		errors.push(
			`sudoAllowed must be false, got: ${JSON.stringify(r.sudoAllowed)}`,
		);
	}

	if (r.autoRunAllowed !== false) {
		errors.push(
			`autoRunAllowed must be false, got: ${JSON.stringify(r.autoRunAllowed)}`,
		);
	}

	if (r.networkRequired !== true) {
		errors.push(
			`networkRequired must be true, got: ${JSON.stringify(r.networkRequired)}`,
		);
	}

	if (r.manualFallbackAvailable !== true) {
		errors.push(
			`manualFallbackAvailable must be true, got: ${JSON.stringify(r.manualFallbackAvailable)}`,
		);
	}

	// ── commandPreview safety checks (only if it is a string) ──

	if (typeof r.commandPreview === 'string' && r.commandPreview.length > 0) {
		const cmd = r.commandPreview as string;

		// Must contain OPENCODE_INSTALL_DIR
		if (!cmd.includes('OPENCODE_INSTALL_DIR')) {
			errors.push(
				'commandPreview must contain OPENCODE_INSTALL_DIR to enforce controlled install path',
			);
		}

		// Must NOT contain sudo
		if (/\bsudo\b/.test(cmd)) {
			errors.push('commandPreview must not contain sudo');
		}

		// Must use an allowlisted URL
		const urlMatch = cmd.match(/https?:\/\/[^\s|"']+/);
		if (!urlMatch) {
			errors.push('commandPreview must contain an install URL');
		} else {
			const foundUrl = urlMatch[0];
			if (!(ALLOWLISTED_OPENCODE_INSTALL_URLS as readonly string[]).includes(foundUrl)) {
				errors.push(
					`commandPreview contains non-allowlisted URL: "${foundUrl}". ` +
					`Only ${ALLOWLISTED_OPENCODE_INSTALL_URLS.join(', ')} is permitted.`,
				);
			}
		}
	}

	if (errors.length > 0) {
		return validationFail(errors);
	}

	return validationPass();
}

// ── Type Guards for Detection / Install Objects ────────────────────────────

/**
 * Type guard: check if a value looks like a valid OpenCodeBinaryDetection.
 */
export function isOpenCodeBinaryDetection(value: unknown): value is OpenCodeBinaryDetection {
	if (!value || typeof value !== 'object') return false;

	const d = value as Record<string, unknown>;

	if (d.binaryName !== 'opencode') return false;
	if (!isOpenCodeDetectionStatus(d.detectionStatus)) return false;
	if (typeof d.helpAvailable !== 'boolean') return false;
	if (typeof d.checkedAt !== 'string') return false;

	// detectedPath is optional string
	if (d.detectedPath !== undefined && typeof d.detectedPath !== 'string') return false;

	// version is optional string
	if (d.version !== undefined && typeof d.version !== 'string') return false;

	// errorMessage is optional string
	if (d.errorMessage !== undefined && typeof d.errorMessage !== 'string') return false;

	return true;
}

/**
 * Type guard: check if a value looks like a valid OpenCodeInstallRequest.
 * This is a strict check that also validates literal types.
 */
export function isOpenCodeInstallRequest(value: unknown): value is OpenCodeInstallRequest {
	if (!value || typeof value !== 'object') return false;

	const r = value as Record<string, unknown>;

	if (r.tool !== 'opencode') return false;
	if (r.officialUrl !== OFFICIAL_OPENCODE_INSTALL_URL) return false;
	if (typeof r.installDir !== 'string' || r.installDir.length === 0) return false;
	if (typeof r.commandPreview !== 'string') return false;
	if (r.requiresHumanApproval !== true) return false;
	if (r.sudoAllowed !== false) return false;
	if (r.autoRunAllowed !== false) return false;
	if (r.networkRequired !== true) return false;
	if (typeof r.trustWarning !== 'string') return false;
	if (r.manualFallbackAvailable !== true) return false;

	return true;
}

// ── OpenCode Provider Detection Evidence ────────────────────────────────────

/**
 * Structured evidence for OpenCode provider detection.
 *
 * Contains detection results, install status, and runtime readiness.
 * This object MUST be redacted before logging or display to
 * remove private paths and potential secrets.
 */
export interface OpenCodeProviderDetectionEvidence {
	/** Unique evidence identifier */
	evidenceId: string;
	/** Binary detection status */
	detectionStatus: OpenCodeDetectionStatus;
	/** Install request lifecycle status */
	installStatus: OpenCodeInstallStatus;
	/** Overall runtime readiness status */
	runtimeStatus: OpenCodeProviderRuntimeStatus;
	/** Detected binary path (if found) — PRIVATE, must be redacted */
	detectedPath?: string;
	/** Detected version string */
	version?: string;
	/** Whether --help check passed */
	helpAvailable: boolean;
	/** Install request data model (if install was requested) */
	installRequest?: OpenCodeInstallRequest;
	/** Whether redaction has been applied */
	redactionApplied: boolean;
	/** Whether any secrets were detected during evidence generation */
	secretsDetected: boolean;
	/** Whether any private filesystem paths were detected */
	privatePathsDetected: boolean;
	/** Reasons why the provider is currently blocked */
	blockedReasons: string[];
	/** ISO 8601 timestamp of evidence creation */
	createdAt: string;
}

// ── Evidence Redaction ─────────────────────────────────────────────────────

/**
 * Redacted version of OpenCode provider detection evidence.
 *
 * Excludes: absolute private binary paths, tokens, env values,
 * raw config content, API keys, home directory paths.
 */
export interface RedactedOpenCodeProviderDetectionEvidence {
	/** Unique evidence identifier */
	evidenceId: string;
	/** Binary detection status */
	detectionStatus: OpenCodeDetectionStatus;
	/** Install request lifecycle status */
	installStatus: OpenCodeInstallStatus;
	/** Overall runtime readiness status */
	runtimeStatus: OpenCodeProviderRuntimeStatus;
	/** Detected version string (safe to share) */
	version?: string;
	/** Whether --help check passed */
	helpAvailable: boolean;
	/** Install request summary (paths normalized) */
	installRequest?: {
		tool: 'opencode';
		officialUrl: 'https://opencode.ai/install';
		commandPreview: string;
		requiresHumanApproval: true;
		sudoAllowed: false;
		autoRunAllowed: false;
		networkRequired: true;
		trustWarning: string;
		manualFallbackAvailable: true;
	};
	/** Whether redaction has been applied */
	redactionApplied: boolean;
	/** Whether any secrets were detected during evidence generation */
	secretsDetected: boolean;
	/** Whether any private filesystem paths were detected */
	privatePathsDetected: boolean;
	/** Reasons why the provider is currently blocked */
	blockedReasons: string[];
	/** ISO 8601 timestamp of evidence creation */
	createdAt: string;
}

/**
 * Redact OpenCode provider detection evidence for safe logging/display.
 *
 * Removes:
 *   - Absolute private binary paths (detectedPath)
 *   - installDir from installRequest (normalized to $HOME/.positron/tools/bin)
 *   - Any detected secrets, tokens, env values
 *
 * Preserves:
 *   - Status information
 *   - Blocked reasons
 *   - Official URLs
 *   - commandPreview (with normalized installDir)
 */
export function redactOpenCodeProviderDetectionEvidence(
	evidence: OpenCodeProviderDetectionEvidence,
): RedactedOpenCodeProviderDetectionEvidence {
	const result: RedactedOpenCodeProviderDetectionEvidence = {
		evidenceId: evidence.evidenceId,
		detectionStatus: evidence.detectionStatus,
		installStatus: evidence.installStatus,
		runtimeStatus: evidence.runtimeStatus,
		helpAvailable: evidence.helpAvailable,
		redactionApplied: true,
		secretsDetected: evidence.secretsDetected,
		privatePathsDetected: evidence.privatePathsDetected,
		blockedReasons: evidence.blockedReasons,
		createdAt: evidence.createdAt,
	};

	// Version is safe to share
	if (evidence.version !== undefined) {
		result.version = evidence.version;
	}

	// DO NOT include detectedPath — this is a private filesystem path
	// DO NOT include installDir — normalize it

	// Include install request summary with normalized paths
	if (evidence.installRequest) {
		const cmdPreview = evidence.installRequest.commandPreview;
		// Replace any specific installDir with the normalized placeholder
		const normalizedCmd = cmdPreview.replace(
			/OPENCODE_INSTALL_DIR="[^"]*"/,
			'OPENCODE_INSTALL_DIR="$HOME/.positron/tools/bin"',
		);

		result.installRequest = {
			tool: 'opencode',
			officialUrl: OFFICIAL_OPENCODE_INSTALL_URL,
			commandPreview: normalizedCmd,
			requiresHumanApproval: true,
			sudoAllowed: false,
			autoRunAllowed: false,
			networkRequired: true,
			trustWarning: evidence.installRequest.trustWarning,
			manualFallbackAvailable: true,
		} as RedactedOpenCodeProviderDetectionEvidence['installRequest'];
	}

	return result;
}

/**
 * Type guard: check if a value is a valid redacted evidence object.
 */
export function isRedactedOpenCodeProviderDetectionEvidence(
	value: unknown,
): value is RedactedOpenCodeProviderDetectionEvidence {
	if (!value || typeof value !== 'object') return false;

	const e = value as Record<string, unknown>;

	if (typeof e.evidenceId !== 'string') return false;
	if (!isOpenCodeDetectionStatus(e.detectionStatus)) return false;
	if (!isOpenCodeInstallStatus(e.installStatus)) return false;
	if (!isOpenCodeProviderRuntimeStatus(e.runtimeStatus)) return false;
	if (typeof e.helpAvailable !== 'boolean') return false;
	if (typeof e.redactionApplied !== 'boolean') return false;
	if (typeof e.secretsDetected !== 'boolean') return false;
	if (typeof e.privatePathsDetected !== 'boolean') return false;
	if (!Array.isArray(e.blockedReasons)) return false;
	if (typeof e.createdAt !== 'string') return false;

	// detectedPath must NOT be present in redacted evidence
	if ('detectedPath' in e) return false;

	// If installRequest is present, validate its shape
	if (e.installRequest) {
		const ir = e.installRequest as Record<string, unknown>;
		if (ir.tool !== 'opencode') return false;
		if (ir.requiresHumanApproval !== true) return false;
		if (ir.sudoAllowed !== false) return false;
		if (ir.autoRunAllowed !== false) return false;
		if (ir.networkRequired !== true) return false;
		if (ir.manualFallbackAvailable !== true) return false;
	}

	return true;
}

// ── Provider Runtime Readiness Helpers ─────────────────────────────────────

/**
 * Determine the OpenCode provider runtime status based on gating inputs.
 *
 * This is a PURE POLICY FUNCTION. It does not start any runtime,
 * execute any binary, or make any network calls.
 *
 * Decision tree (in priority order):
 * 1. OpenCode not found → detect_only
 * 2. Install requested but not approved → install_request_ready
 * 3. Installed but not verified → installed_unverified
 * 4. Installed and verified but no model profile → model_profile_required
 * 5. Model profile ready but Spec Kit not synced → speckit_sync_required
 * 6. Spec Kit synced but MCP warm-up not complete → mcp_warmup_required
 * 7. All gates pass + human approved → ready_for_real
 * 8. All gates pass without human approval → ready_for_demo
 * 9. Any blocking condition → blocked
 */
export function determineOpenCodeProviderRuntimeStatus(input: {
	detection: OpenCodeBinaryDetection;
	modelProfileReady: boolean;
	specKitSynced: boolean;
	mcpWarmupPass: boolean;
	humanApprovedForRealRun: boolean;
}): OpenCodeProviderRuntimeStatus {
	const { detection, modelProfileReady, specKitSynced, mcpWarmupPass, humanApprovedForRealRun } = input;

	// Blocked status takes absolute priority
	if (detection.detectionStatus === 'blocked') {
		return 'blocked';
	}

	// Error detection — not ready
	if (detection.detectionStatus === 'error') {
		return 'not_ready';
	}

	// OpenCode not found
	if (detection.detectionStatus === 'not_found' || detection.detectionStatus === 'unknown') {
		return 'detect_only';
	}

	// Found but not yet version-checked → effectively ready for install request
	if (detection.detectionStatus === 'found') {
		return 'install_request_ready';
	}

	// Version checked or help checked — binary is installed and verified
	const isVerified =
		detection.detectionStatus === 'version_checked' ||
		detection.detectionStatus === 'help_checked';

	if (!isVerified) {
		return 'installed_unverified';
	}

	// Binary is verified. Check downstream requirements.
	if (!modelProfileReady) {
		return 'model_profile_required';
	}

	if (!specKitSynced) {
		return 'speckit_sync_required';
	}

	if (!mcpWarmupPass) {
		return 'mcp_warmup_required';
	}

	// All gates pass — check for real run vs demo
	if (humanApprovedForRealRun) {
		return 'ready_for_real';
	}

	return 'ready_for_demo';
}

/**
 * Check if OpenCode provider is ready for demo runs.
 *
 * Demo run requirements:
 *   - OpenCode found and version/help checked
 *   - Model profile ready
 *   - Spec Kit synced
 *   - MCP warm-up passes
 *
 * Human approval is NOT required for demo runs.
 */
export function canOpenCodeProviderDemoRun(input: {
	detection: OpenCodeBinaryDetection;
	modelProfileReady: boolean;
	specKitSynced: boolean;
	mcpWarmupPass: boolean;
}): boolean {
	const { detection, modelProfileReady, specKitSynced, mcpWarmupPass } = input;

	// Blocked or error — cannot run
	if (detection.detectionStatus === 'blocked' || detection.detectionStatus === 'error') {
		return false;
	}

	// Not found — cannot run
	if (detection.detectionStatus === 'not_found' || detection.detectionStatus === 'unknown') {
		return false;
	}

	// Only found → not verified yet, cannot run
	if (detection.detectionStatus === 'found') {
		return false;
	}

	// Must be version_checked or help_checked
	const isVerified =
		detection.detectionStatus === 'version_checked' ||
		detection.detectionStatus === 'help_checked';

	if (!isVerified) {
		return false;
	}

	// All downstream gates
	return modelProfileReady && specKitSynced && mcpWarmupPass;
}

/**
 * Check if OpenCode provider is ready for real (production) runs.
 *
 * Real run requirements (all demo requirements PLUS human approval):
 *   - OpenCode found and version/help checked
 *   - Model profile ready
 *   - Spec Kit synced
 *   - MCP warm-up passes
 *   - Human explicitly approved
 */
export function canOpenCodeProviderRealRun(input: {
	detection: OpenCodeBinaryDetection;
	modelProfileReady: boolean;
	specKitSynced: boolean;
	mcpWarmupPass: boolean;
	humanApproved: boolean;
}): boolean {
	if (!input.humanApproved) {
		return false;
	}

	// Delegate to demo run check (same gates minus human approval)
	return canOpenCodeProviderDemoRun({
		detection: input.detection,
		modelProfileReady: input.modelProfileReady,
		specKitSynced: input.specKitSynced,
		mcpWarmupPass: input.mcpWarmupPass,
	});
}

/**
 * Collect all blocking reasons for the OpenCode provider.
 *
 * Returns an array of human-readable reasons why the provider
 * cannot currently execute runs.
 */
export function getOpenCodeProviderBlockedReasons(input: {
	detection: OpenCodeBinaryDetection;
	installStatus: OpenCodeInstallStatus;
	modelProfileReady: boolean;
	specKitSynced: boolean;
	mcpWarmupPass: boolean;
	humanApprovedForRealRun: boolean;
}): string[] {
	const reasons: string[] = [];
	const { detection, installStatus, modelProfileReady, specKitSynced, mcpWarmupPass, humanApprovedForRealRun } = input;

	// Detection status
	if (detection.detectionStatus === 'blocked') {
		reasons.push('OpenCode provider is blocked');
		if (detection.errorMessage) reasons.push(`Block reason: ${detection.errorMessage}`);
	}
	if (detection.detectionStatus === 'error') {
		reasons.push(`Detection error: ${detection.errorMessage ?? 'Unknown error'}`);
	}
	if (detection.detectionStatus === 'not_found' || detection.detectionStatus === 'unknown') {
		reasons.push('OpenCode binary not found');
	}
	if (detection.detectionStatus === 'found') {
		reasons.push('OpenCode found but not yet version-verified');
	}

	// Install status
	if (installStatus === 'blocked') {
		reasons.push('OpenCode installation is blocked');
	}
	if (installStatus === 'approval_required') {
		reasons.push('OpenCode installation requires human approval');
	}
	if (installStatus === 'failed') {
		reasons.push('OpenCode installation failed');
	}
	if (installStatus === 'not_requested' && detection.detectionStatus === 'not_found') {
		reasons.push('OpenCode install has not been requested');
	}

	// Downstream gates
	if (!modelProfileReady) {
		reasons.push('No active model profile configured');
	}
	if (!specKitSynced) {
		reasons.push('Spec Kit is not synchronized with provider profile');
	}
	if (!mcpWarmupPass) {
		reasons.push('MCP warm-up has not passed');
	}
	if (!humanApprovedForRealRun) {
		reasons.push('Human approval required for real (production) runs');
	}

	return reasons;
}

// ── Detection Validation ───────────────────────────────────────────────────

/**
 * Validate an OpenCodeBinaryDetection object.
 *
 * Checks structural correctness and safety:
 *   - binaryName must be "opencode"
 *   - detectionStatus must be a valid value
 *   - helpAvailable must be boolean
 *   - checkedAt must be a valid ISO 8601 string
 *   - detectedPath (if present) is noted for redaction but not rejected
 */
export function validateOpenCodeBinaryDetection(value: unknown): ValidationResult {
	const errors: string[] = [];

	if (!value || typeof value !== 'object') {
		return validationFail(['Detection must be a non-null object']);
	}

	const d = value as Record<string, unknown>;

	if (d.binaryName !== 'opencode') {
		errors.push(`binaryName must be "opencode", got: ${JSON.stringify(d.binaryName)}`);
	}

	if (!isOpenCodeDetectionStatus(d.detectionStatus)) {
		errors.push(
			`Invalid detectionStatus: ${JSON.stringify(d.detectionStatus)}. ` +
			`Must be one of: ${ALL_OPENCODE_DETECTION_STATUSES.join(', ')}`,
		);
	}

	if (typeof d.helpAvailable !== 'boolean') {
		errors.push('helpAvailable must be a boolean');
	}

	if (typeof d.checkedAt !== 'string' || d.checkedAt.length === 0) {
		errors.push('checkedAt must be a non-empty ISO 8601 timestamp string');
	}

	// detectedPath is optional but must be string if present
	if (d.detectedPath !== undefined && typeof d.detectedPath !== 'string') {
		errors.push('detectedPath must be a string if provided');
	}

	// version is optional but must be string if present
	if (d.version !== undefined && typeof d.version !== 'string') {
		errors.push('version must be a string if provided');
	}

	// errorMessage is optional but must be string if present
	if (d.errorMessage !== undefined && typeof d.errorMessage !== 'string') {
		errors.push('errorMessage must be a string if provided');
	}

	// SECURITY: detection must not contain apiKey, token, or secret fields
	if ('apiKey' in d || 'token' in d || 'secret' in d) {
		errors.push('Detection object must not contain apiKey, token, or secret fields');
	}

	if (errors.length > 0) {
		return validationFail(errors);
	}

	return validationPass();
}

// ── Validation of Evidence ─────────────────────────────────────────────────

/**
 * Validate OpenCode provider detection evidence.
 *
 * Checks structural correctness and verifies redaction was applied
 * when the evidence claims it was.
 */
export function validateOpenCodeProviderDetectionEvidence(
	value: unknown,
): ValidationResult {
	const errors: string[] = [];

	if (!value || typeof value !== 'object') {
		return validationFail(['Evidence must be a non-null object']);
	}

	const e = value as Record<string, unknown>;

	if (typeof e.evidenceId !== 'string' || e.evidenceId.length === 0) {
		errors.push('evidenceId must be a non-empty string');
	}

	if (!isOpenCodeDetectionStatus(e.detectionStatus)) {
		errors.push(`Invalid detectionStatus: ${JSON.stringify(e.detectionStatus)}`);
	}

	if (!isOpenCodeInstallStatus(e.installStatus)) {
		errors.push(`Invalid installStatus: ${JSON.stringify(e.installStatus)}`);
	}

	if (!isOpenCodeProviderRuntimeStatus(e.runtimeStatus)) {
		errors.push(`Invalid runtimeStatus: ${JSON.stringify(e.runtimeStatus)}`);
	}

	if (typeof e.helpAvailable !== 'boolean') {
		errors.push('helpAvailable must be a boolean');
	}

	if (typeof e.redactionApplied !== 'boolean') {
		errors.push('redactionApplied must be a boolean');
	}

	if (typeof e.secretsDetected !== 'boolean') {
		errors.push('secretsDetected must be a boolean');
	}

	if (typeof e.privatePathsDetected !== 'boolean') {
		errors.push('privatePathsDetected must be a boolean');
	}

	if (!Array.isArray(e.blockedReasons)) {
		errors.push('blockedReasons must be an array');
	}

	if (typeof e.createdAt !== 'string' || e.createdAt.length === 0) {
		errors.push('createdAt must be a non-empty string');
	}

	// If evidence claims to be redacted, verify detectedPath is absent
	if (e.redactionApplied === true && 'detectedPath' in e) {
		errors.push('Redacted evidence must not contain detectedPath');
	}

	// SECURITY: evidence must not leak apiKey, token, or secret fields
	if ('apiKey' in e || 'token' in e || 'secret' in e) {
		errors.push('Evidence must not contain apiKey, token, or secret fields');
	}

	if (errors.length > 0) {
		return validationFail(errors);
	}

	return validationPass();
}

// ── Detection Helpers (Type Signatures Only — No Runtime Execution) ─────────

/**
 * Type signature for binary detection function.
 *
 * In the shared package, this is typed but NOT implemented with shell execution.
 * Runtime detection (shell-based) belongs in the opencode-adapter package
 * or server-side code. Shared package provides only the type contract.
 *
 * @param binaryPathCandidates — Optional list of paths to check
 * @param allowVersionCheck — If true, may run `opencode --version` (default: false)
 * @param allowHelpCheck — If true, may run `opencode --help` (default: false)
 * @returns Detection result with status and metadata
 */
export type DetectOpenCodeBinaryFn = (options?: {
	binaryPathCandidates?: string[];
	allowVersionCheck?: boolean;
	allowHelpCheck?: boolean;
}) => Promise<OpenCodeBinaryDetection>;

/**
 * Create a safe "not found" detection result when no binary exists.
 * This is a pure function — no filesystem access, no shell execution.
 */
export function createNotFoundDetection(): OpenCodeBinaryDetection {
	return {
		binaryName: 'opencode' as const,
		detectionStatus: 'not_found' as const,
		helpAvailable: false,
		checkedAt: new Date().toISOString(),
	};
}

/**
 * Create a "found" detection result with a known binary path.
 * This is a pure function — no filesystem access, no shell execution.
 *
 * @param detectedPath — Path where the binary was found
 * @param version — Optional version string (from --version)
 * @param helpAvailable — Whether --help check passed
 */
export function createFoundDetection(
	detectedPath: string,
	version?: string,
	helpAvailable = false,
): OpenCodeBinaryDetection {
	const status: OpenCodeDetectionStatus = version
		? 'version_checked'
		: helpAvailable
			? 'help_checked'
			: 'found';

	return {
		binaryName: 'opencode' as const,
		detectedPath,
		detectionStatus: status,
		version,
		helpAvailable,
		checkedAt: new Date().toISOString(),
	};
}

/**
 * Create an "error" detection result.
 */
export function createErrorDetection(errorMessage: string): OpenCodeBinaryDetection {
	return {
		binaryName: 'opencode' as const,
		detectionStatus: 'error' as const,
		helpAvailable: false,
		checkedAt: new Date().toISOString(),
		errorMessage,
	};
}

/**
 * Create a "blocked" detection result.
 */
export function createBlockedDetection(reason: string): OpenCodeBinaryDetection {
	return {
		binaryName: 'opencode' as const,
		detectionStatus: 'blocked' as const,
		helpAvailable: false,
		checkedAt: new Date().toISOString(),
		errorMessage: reason,
	};
}

// ── Provider Detection Evidence Factory ─────────────────────────────────────

/**
 * Create OpenCode provider detection evidence from detection result
 * and gating inputs.
 *
 * This is a pure function — it creates the evidence object but does not
 * execute any detection, install, or runtime operations.
 */
export function createOpenCodeProviderDetectionEvidence(input: {
	evidenceId: string;
	detection: OpenCodeBinaryDetection;
	installStatus: OpenCodeInstallStatus;
	installRequest?: OpenCodeInstallRequest;
	modelProfileReady: boolean;
	specKitSynced: boolean;
	mcpWarmupPass: boolean;
	humanApprovedForRealRun: boolean;
}): OpenCodeProviderDetectionEvidence {
	const runtimeStatus = determineOpenCodeProviderRuntimeStatus({
		detection: input.detection,
		modelProfileReady: input.modelProfileReady,
		specKitSynced: input.specKitSynced,
		mcpWarmupPass: input.mcpWarmupPass,
		humanApprovedForRealRun: input.humanApprovedForRealRun,
	});

	const blockedReasons = getOpenCodeProviderBlockedReasons({
		detection: input.detection,
		installStatus: input.installStatus,
		modelProfileReady: input.modelProfileReady,
		specKitSynced: input.specKitSynced,
		mcpWarmupPass: input.mcpWarmupPass,
		humanApprovedForRealRun: input.humanApprovedForRealRun,
	});

	const hasPrivatePaths = !!input.detection.detectedPath;

	return {
		evidenceId: input.evidenceId,
		detectionStatus: input.detection.detectionStatus,
		installStatus: input.installStatus,
		runtimeStatus,
		detectedPath: input.detection.detectedPath,
		version: input.detection.version,
		helpAvailable: input.detection.helpAvailable,
		installRequest: input.installRequest,
		redactionApplied: false,
		secretsDetected: false,
		privatePathsDetected: hasPrivatePaths,
		blockedReasons,
		createdAt: new Date().toISOString(),
	};
}
