// Positron — Spec Kit Sync Profile Types, Validation, Re-Sync Rules (Issue #229 PR 3)
// ---------------------------------------------------------------------------
// This module defines the synchronization contract between Positron provider
// profiles and Spec Kit configuration. It is PURE TYPES, VALIDATION, and POLICY.
// No runtime execution, no OpenCode binary calls, no MCP server starts,
// no Spec Kit install, no Spec Kit CLI execution, no sync runtime.
//
// Hard Constraints:
//   - Spec Kit source restricted to github/spec-kit
//   - Spec Kit version + install ref required
//   - Real runs blocked unless sync, model warm-up, MCP warm-up, and Human Approval pass
//   - opencode_slash_commands not real-run-ready without future proof
//   - Redaction excludes private paths and secrets

import { type ValidationResult, validationFail, validationPass } from './opencode-model-profile.js';

// ── Union Types ────────────────────────────────────────────────────────────

/** Valid Spec Kit installation sources (only github/spec-kit allowed) */
export type SpecKitInstallSource = 'github/spec-kit';

/** Spec Kit operation mode */
export type SpecKitMode = 'standalone_cli' | 'opencode_slash_commands' | 'adapter_bridge';

/** Synchronization status between provider profile and Spec Kit */
export type SpecKitSyncStatus =
	| 'unknown'
	| 'synced'
	| 'needs_resync'
	| 'partial'
	| 'blocked'
	| 'fail';

/** Provider profile readiness for operations */
export type ProviderProfileReadiness =
	| 'not_ready'
	| 'ready_for_demo'
	| 'ready_for_real'
	| 'blocked';

/** Reasons for needing a re-sync between provider profile and Spec Kit */
export type ReSyncReason =
	| 'opencode_binary_changed'
	| 'opencode_version_changed'
	| 'opencode_config_path_changed'
	| 'model_profile_changed'
	| 'model_warmup_result_expired'
	| 'speckit_binary_changed'
	| 'speckit_version_changed'
	| 'speckit_install_ref_changed'
	| 'speckit_mode_changed'
	| 'blueprint_preferred_model_changed'
	| 'mcp_warmup_invalidated';

// ── Compact Warmup Status (inline literal used in profiles / fingerprints) ─

/** Compact warmup status for provider profile-level summaries */
type CompactWarmupStatus = 'pass' | 'partial' | 'fail' | 'unknown';

// ── Provider Profile Fingerprint ───────────────────────────────────────────

/**
 * Lightweight fingerprint of a provider profile for re-sync comparison.
 * Contains only the fields that trigger re-sync when they change.
 */
export interface ProviderProfileFingerprint {
	opencodeBinaryPath: string;
	opencodeVersion: string;
	opencodeConfigPath: string;
	opencodeModelProfileId: string;
	opencodeModelRef: string;
	modelWarmupStatus: CompactWarmupStatus;
	specKitBinaryPath: string;
	specKitVersion: string;
	specKitInstallRef: string;
	specKitMode: SpecKitMode;
	mcpWarmupStatus: CompactWarmupStatus;
	blueprintPreferredModelRef?: string;
}

// ── PositronProviderProfile ────────────────────────────────────────────────

/**
 * A complete Positron provider profile combining OpenCode, Spec Kit,
 * MCP warm-up, and model warm-up information.
 *
 * SECURITY: This interface MUST NEVER contain API keys, tokens, or raw config.
 * Binary/config paths are present for sync comparison but are redacted for evidence.
 */
export interface PositronProviderProfile {
	/** Unique profile identifier */
	profileId: string;

	/** OpenCode binary path (absolute or relative to workspace) */
	opencodeBinaryPath: string;
	/** OpenCode detected version */
	opencodeVersion: string;
	/** OpenCode config path */
	opencodeConfigPath: string;
	/** OpenCode model profile ID (references an OpenCodeModelProfile) */
	opencodeModelProfileId: string;
	/** OpenCode model reference string (e.g., "ollama/gemma3:12b") */
	opencodeModelRef: string;

	/** Spec Kit binary path */
	specKitBinaryPath: string;
	/** Spec Kit detected version */
	specKitVersion: string;
	/** Spec Kit installation source */
	specKitInstallSource: SpecKitInstallSource;
	/** Spec Kit install reference (commit hash, tag, or version) */
	specKitInstallRef: string;
	/** Spec Kit operation mode */
	specKitMode: SpecKitMode;

	/** MCP warm-up summary status */
	mcpWarmupStatus: CompactWarmupStatus;
	/** Model warm-up summary status */
	modelWarmupStatus: CompactWarmupStatus;
	/** Spec Kit synchronization status */
	specKitSyncStatus: SpecKitSyncStatus;
	/** Overall provider profile readiness */
	providerProfileReadiness: ProviderProfileReadiness;

	/** Whether demo runs are permitted */
	readyForDemoRuns: boolean;
	/** Whether real/production runs are permitted (pending human approval) */
	readyForRealRuns: boolean;
	/** Active re-sync reasons (empty if synced) */
	reSyncReasons: ReSyncReason[];
}

// ── Constant Arrays ────────────────────────────────────────────────────────

/** All valid Spec Kit install sources */
export const ALL_SPEC_KIT_INSTALL_SOURCES: readonly SpecKitInstallSource[] = [
	'github/spec-kit',
] as const;

/** All valid Spec Kit modes */
export const ALL_SPEC_KIT_MODES: readonly SpecKitMode[] = [
	'standalone_cli',
	'opencode_slash_commands',
	'adapter_bridge',
] as const;

/** All valid Spec Kit sync statuses */
export const ALL_SPEC_KIT_SYNC_STATUSES: readonly SpecKitSyncStatus[] = [
	'unknown',
	'synced',
	'needs_resync',
	'partial',
	'blocked',
	'fail',
] as const;

/** All valid provider profile readiness states */
export const ALL_PROVIDER_PROFILE_READINESS: readonly ProviderProfileReadiness[] = [
	'not_ready',
	'ready_for_demo',
	'ready_for_real',
	'blocked',
] as const;

/** All valid re-sync reasons */
export const ALL_RE_SYNC_REASONS: readonly ReSyncReason[] = [
	'opencode_binary_changed',
	'opencode_version_changed',
	'opencode_config_path_changed',
	'model_profile_changed',
	'model_warmup_result_expired',
	'speckit_binary_changed',
	'speckit_version_changed',
	'speckit_install_ref_changed',
	'speckit_mode_changed',
	'blueprint_preferred_model_changed',
	'mcp_warmup_invalidated',
] as const;

// ── Type Guard Functions ───────────────────────────────────────────────────

/** Type guard: check if value is a valid SpecKitInstallSource */
export function isSpecKitInstallSource(value: unknown): value is SpecKitInstallSource {
	return (
		typeof value === 'string' && (ALL_SPEC_KIT_INSTALL_SOURCES as readonly string[]).includes(value)
	);
}

/** Type guard: check if value is a valid SpecKitMode */
export function isSpecKitMode(value: unknown): value is SpecKitMode {
	return typeof value === 'string' && (ALL_SPEC_KIT_MODES as readonly string[]).includes(value);
}

/** Type guard: check if value is a valid SpecKitSyncStatus */
export function isSpecKitSyncStatus(value: unknown): value is SpecKitSyncStatus {
	return (
		typeof value === 'string' && (ALL_SPEC_KIT_SYNC_STATUSES as readonly string[]).includes(value)
	);
}

/** Type guard: check if value is a valid ProviderProfileReadiness */
export function isProviderProfileReadiness(value: unknown): value is ProviderProfileReadiness {
	return (
		typeof value === 'string' &&
		(ALL_PROVIDER_PROFILE_READINESS as readonly string[]).includes(value)
	);
}

/** Type guard: check if value is a valid ReSyncReason */
export function isReSyncReason(value: unknown): value is ReSyncReason {
	return typeof value === 'string' && (ALL_RE_SYNC_REASONS as readonly string[]).includes(value);
}

// ── Compact Warmup Status Helpers ──────────────────────────────────────────

const ALL_COMPACT_WARMUP_STATUSES: readonly CompactWarmupStatus[] = [
	'pass',
	'partial',
	'fail',
	'unknown',
] as const;

/** Check if a value is a valid compact warmup status */
function isCompactWarmupStatus(value: unknown): value is CompactWarmupStatus {
	return (
		typeof value === 'string' && (ALL_COMPACT_WARMUP_STATUSES as readonly string[]).includes(value)
	);
}

// ── Profile Type Guard ─────────────────────────────────────────────────────

/**
 * Type guard: structural check if a value looks like a PositronProviderProfile.
 * Validates all required fields and their types.
 */
export function isPositronProviderProfile(value: unknown): value is PositronProviderProfile {
	if (!value || typeof value !== 'object') return false;

	const p = value as Record<string, unknown>;

	// Required string fields
	if (typeof p.profileId !== 'string') return false;
	if (typeof p.opencodeBinaryPath !== 'string') return false;
	if (typeof p.opencodeVersion !== 'string') return false;
	if (typeof p.opencodeConfigPath !== 'string') return false;
	if (typeof p.opencodeModelProfileId !== 'string') return false;
	if (typeof p.opencodeModelRef !== 'string') return false;
	if (typeof p.specKitBinaryPath !== 'string') return false;
	if (typeof p.specKitVersion !== 'string') return false;
	if (typeof p.specKitInstallRef !== 'string') return false;

	// Required union type fields
	if (!isSpecKitInstallSource(p.specKitInstallSource)) return false;
	if (!isSpecKitMode(p.specKitMode)) return false;
	if (!isSpecKitSyncStatus(p.specKitSyncStatus)) return false;
	if (!isProviderProfileReadiness(p.providerProfileReadiness)) return false;
	if (!isCompactWarmupStatus(p.mcpWarmupStatus)) return false;
	if (!isCompactWarmupStatus(p.modelWarmupStatus)) return false;

	// Required boolean fields
	if (typeof p.readyForDemoRuns !== 'boolean') return false;
	if (typeof p.readyForRealRuns !== 'boolean') return false;

	// reSyncReasons must be an array of valid reasons
	if (!Array.isArray(p.reSyncReasons)) return false;
	for (const reason of p.reSyncReasons) {
		if (!isReSyncReason(reason)) return false;
	}

	// SECURITY: Reject any object that has apiKey, token, or secret fields
	if ('apiKey' in p || 'token' in p || 'secret' in p || 'password' in p) return false;

	return true;
}

// ── Validation Functions ───────────────────────────────────────────────────

/**
 * Validate that a Spec Kit install source is allowed.
 * Currently only "github/spec-kit" is permitted.
 */
export function isSpecKitSourceAllowed(source: unknown): source is 'github/spec-kit' {
	return source === 'github/spec-kit';
}

/**
 * Check if a Spec Kit version/ref is pinned (not floating/latest).
 * A pinned ref is a semver-like tag or commit hash, not "latest", "main", or empty.
 */
export function isSpecKitVersionPinned(versionOrRef: string): boolean {
	if (!versionOrRef || versionOrRef.length === 0) return false;

	// Reject floating refs (all normalized to lowercase)
	const floatingRefs = ['latest', 'main', 'master', 'head', 'nightly'];
	if (floatingRefs.includes(versionOrRef.toLowerCase())) return false;

	// Accept semver tags: v1.2.3, 1.2.3, v1.2.3-beta.1, etc.
	const semverPattern = /^v?\d+\.\d+\.\d+(-[a-zA-Z0-9.]+)?$/;
	if (semverPattern.test(versionOrRef)) return true;

	// Accept commit hashes (7-40 hex chars)
	const commitHashPattern = /^[a-f0-9]{7,40}$/;
	if (commitHashPattern.test(versionOrRef)) return true;

	// Accept git tag-like refs (not floating)
	const tagPattern = /^[a-zA-Z0-9._-]+$/;
	if (tagPattern.test(versionOrRef)) return true;

	return false;
}

/**
 * Check if a Spec Kit mode is safe for the given readiness target.
 *
 * Rules:
 *   - adapter_bridge: safe for all uses (preferred mode)
 *   - standalone_cli: safe if version/source/ref validated (validation is external)
 *   - opencode_slash_commands: not safe for real runs without proof (needs future verification)
 */
export function isSpecKitModeSafe(mode: SpecKitMode): boolean {
	switch (mode) {
		case 'adapter_bridge':
			return true;
		case 'standalone_cli':
			return true; // Safe when version/source/ref validated (validated externally)
		case 'opencode_slash_commands':
			return false; // Needs proof of slash command availability (future PR)
		default:
			return false;
	}
}

/**
 * Check if a Spec Kit mode is eligible for real-run readiness.
 * opencode_slash_commands cannot be real-run-ready without future verification.
 */
export function isSpecKitModeRealRunReady(mode: SpecKitMode): boolean {
	return mode === 'adapter_bridge' || mode === 'standalone_cli';
}

// ── Provider Profile Validation ────────────────────────────────────────────

/**
 * Full validation of a PositronProviderProfile.
 * Checks type correctness, business rules, and security constraints.
 */
export function validatePositronProviderProfile(value: unknown): ValidationResult {
	const errors: string[] = [];

	if (!value || typeof value !== 'object') {
		return validationFail(['Value is not an object']);
	}

	const p = value as Record<string, unknown>;

	// ── Required string fields ──
	const requiredStrings: [string, string][] = [
		['profileId', 'profileId'],
		['opencodeBinaryPath', 'opencodeBinaryPath'],
		['opencodeVersion', 'opencodeVersion'],
		['opencodeConfigPath', 'opencodeConfigPath'],
		['opencodeModelProfileId', 'opencodeModelProfileId'],
		['opencodeModelRef', 'opencodeModelRef'],
		['specKitBinaryPath', 'specKitBinaryPath'],
		['specKitVersion', 'specKitVersion'],
		['specKitInstallRef', 'specKitInstallRef'],
	];

	for (const [key, label] of requiredStrings) {
		if (typeof p[key] !== 'string' || (p[key] as string).length === 0) {
			errors.push(`Missing required field: ${label}`);
		}
	}

	// ── Spec Kit install source must be github/spec-kit ──
	if (!isSpecKitInstallSource(p.specKitInstallSource)) {
		errors.push(
			`Invalid specKitInstallSource: "${String(p.specKitInstallSource)}". Must be "github/spec-kit".`,
		);
	} else if (!isSpecKitSourceAllowed(p.specKitInstallSource)) {
		errors.push(
			`Spec Kit install source "${String(p.specKitInstallSource)}" is not allowed. Only "github/spec-kit" is permitted.`,
		);
	}

	// ── Spec Kit version must be pinned ──
	if (typeof p.specKitVersion === 'string' && !isSpecKitVersionPinned(p.specKitVersion)) {
		errors.push(
			`Spec Kit version "${p.specKitVersion}" is not pinned. Must be a semver tag, commit hash, or git tag (not "latest", "main", etc.).`,
		);
	}

	// ── Spec Kit install ref must be pinned ──
	if (typeof p.specKitInstallRef === 'string' && !isSpecKitVersionPinned(p.specKitInstallRef)) {
		errors.push(
			`Spec Kit install ref "${p.specKitInstallRef}" is not pinned. Must be a semver tag, commit hash, or git tag (not "latest", "main", etc.).`,
		);
	}

	// ── Required union type fields ──
	if (!isSpecKitMode(p.specKitMode)) {
		errors.push(
			`Invalid specKitMode: "${String(p.specKitMode)}". Must be one of: ${ALL_SPEC_KIT_MODES.join(', ')}`,
		);
	}
	if (!isSpecKitSyncStatus(p.specKitSyncStatus)) {
		errors.push(
			`Invalid specKitSyncStatus: "${String(p.specKitSyncStatus)}". Must be one of: ${ALL_SPEC_KIT_SYNC_STATUSES.join(', ')}`,
		);
	}
	if (!isProviderProfileReadiness(p.providerProfileReadiness)) {
		errors.push(
			`Invalid providerProfileReadiness: "${String(p.providerProfileReadiness)}". Must be one of: ${ALL_PROVIDER_PROFILE_READINESS.join(', ')}`,
		);
	}
	if (!isCompactWarmupStatus(p.mcpWarmupStatus)) {
		errors.push(
			`Invalid mcpWarmupStatus: "${String(p.mcpWarmupStatus)}". Must be one of: pass, partial, fail, unknown`,
		);
	}
	if (!isCompactWarmupStatus(p.modelWarmupStatus)) {
		errors.push(
			`Invalid modelWarmupStatus: "${String(p.modelWarmupStatus)}". Must be one of: pass, partial, fail, unknown`,
		);
	}

	// ── Required boolean fields ──
	if (typeof p.readyForDemoRuns !== 'boolean') {
		errors.push('Missing required field: readyForDemoRuns (must be boolean)');
	}
	if (typeof p.readyForRealRuns !== 'boolean') {
		errors.push('Missing required field: readyForRealRuns (must be boolean)');
	}

	// ── reSyncReasons must be array of valid reasons ──
	if (!Array.isArray(p.reSyncReasons)) {
		errors.push('Missing required field: reSyncReasons (must be an array)');
	} else {
		for (let i = 0; i < p.reSyncReasons.length; i++) {
			if (!isReSyncReason(p.reSyncReasons[i])) {
				errors.push(
					`Invalid reSyncReason at index ${i}: "${String(p.reSyncReasons[i])}". ` +
						`Must be one of: ${ALL_RE_SYNC_REASONS.join(', ')}`,
				);
			}
		}
		// Check for duplicates
		const seen = new Set<string>();
		for (const reason of p.reSyncReasons) {
			if (seen.has(reason)) {
				errors.push(`Duplicate reSyncReason: "${reason}"`);
			}
			seen.add(reason);
		}
	}

	// ── SECURITY: No secret-like fields ──
	const secretKeys = ['apiKey', 'token', 'secret', 'password', 'credentials', 'authHeader'];
	for (const key of secretKeys) {
		if (key in p) {
			errors.push(
				`SECURITY: Profile contains forbidden field "${key}". Secrets must never be stored in profiles.`,
			);
		}
	}

	// ── Unknown/extra fields check (suspicious loose keys) ──
	const knownKeys = new Set([
		'profileId',
		'opencodeBinaryPath',
		'opencodeVersion',
		'opencodeConfigPath',
		'opencodeModelProfileId',
		'opencodeModelRef',
		'specKitBinaryPath',
		'specKitVersion',
		'specKitInstallSource',
		'specKitInstallRef',
		'specKitMode',
		'mcpWarmupStatus',
		'modelWarmupStatus',
		'specKitSyncStatus',
		'providerProfileReadiness',
		'readyForDemoRuns',
		'readyForRealRuns',
		'reSyncReasons',
	]);
	for (const key of Object.keys(p)) {
		if (!knownKeys.has(key)) {
			// Check for suspicious patterns in unknown keys
			const suspiciousPatterns = [/key/i, /token/i, /secret/i, /auth/i, /pass/i, /cred/i];
			for (const pattern of suspiciousPatterns) {
				if (pattern.test(key)) {
					errors.push(
						`SECURITY: Profile contains suspicious unknown field "${key}". Possible secret exposure.`,
					);
					break;
				}
			}
		}
	}

	if (errors.length > 0) {
		return validationFail(errors);
	}

	return validationPass();
}

// ── Re-Sync Decision Logic ─────────────────────────────────────────────────

/**
 * Compare two provider profile fingerprints and determine which
 * re-sync reasons have been triggered.
 *
 * Rules:
 *   - Every relevant change generates exactly the matching ReSyncReason.
 *   - No changes → empty array.
 *   - modelWarmupStatus from "pass" to another → model_warmup_result_expired.
 *   - mcpWarmupStatus from "pass" to another → mcp_warmup_invalidated.
 *   - blueprintPreferredModelRef mismatch (when set) → blueprint_preferred_model_changed.
 */
export function checkReSyncNeeded(
	previous: ProviderProfileFingerprint,
	current: ProviderProfileFingerprint,
): ReSyncReason[] {
	const reasons: ReSyncReason[] = [];

	// 1. OpenCode binary path changed
	if (previous.opencodeBinaryPath !== current.opencodeBinaryPath) {
		reasons.push('opencode_binary_changed');
	}

	// 2. OpenCode version changed
	if (previous.opencodeVersion !== current.opencodeVersion) {
		reasons.push('opencode_version_changed');
	}

	// 3. OpenCode config path changed
	if (previous.opencodeConfigPath !== current.opencodeConfigPath) {
		reasons.push('opencode_config_path_changed');
	}

	// 4. Model profile changed
	if (
		previous.opencodeModelProfileId !== current.opencodeModelProfileId ||
		previous.opencodeModelRef !== current.opencodeModelRef
	) {
		reasons.push('model_profile_changed');
	}

	// 5. Model warm-up result expired: was pass, now is not pass
	if (previous.modelWarmupStatus === 'pass' && current.modelWarmupStatus !== 'pass') {
		reasons.push('model_warmup_result_expired');
	}

	// 6. Spec Kit binary changed
	if (previous.specKitBinaryPath !== current.specKitBinaryPath) {
		reasons.push('speckit_binary_changed');
	}

	// 7. Spec Kit version changed
	if (previous.specKitVersion !== current.specKitVersion) {
		reasons.push('speckit_version_changed');
	}

	// 8. Spec Kit install ref changed
	if (previous.specKitInstallRef !== current.specKitInstallRef) {
		reasons.push('speckit_install_ref_changed');
	}

	// 9. Spec Kit mode changed
	if (previous.specKitMode !== current.specKitMode) {
		reasons.push('speckit_mode_changed');
	}

	// 10. Blueprint preferred model changed
	if (current.blueprintPreferredModelRef !== undefined) {
		if (previous.blueprintPreferredModelRef !== current.blueprintPreferredModelRef) {
			reasons.push('blueprint_preferred_model_changed');
		}
	}

	// 11. MCP warm-up invalidated: was pass, now is not pass
	if (previous.mcpWarmupStatus === 'pass' && current.mcpWarmupStatus !== 'pass') {
		reasons.push('mcp_warmup_invalidated');
	}

	return reasons;
}

/**
 * Check if a sync status indicates that re-sync is required.
 * Returns true for: needs_resync, partial, blocked, fail, unknown.
 */
export function requiresSpecKitReSync(profile: PositronProviderProfile): boolean {
	return profile.specKitSyncStatus !== 'synced';
}

/**
 * Check if a provider profile is currently synced (specKitSyncStatus === "synced"
 * AND reSyncReasons is empty).
 */
export function isProviderProfileSynced(profile: PositronProviderProfile): boolean {
	return profile.specKitSyncStatus === 'synced' && profile.reSyncReasons.length === 0;
}

// ── Readiness Policy ───────────────────────────────────────────────────────

/**
 * Check if a provider profile is eligible for demo runs.
 *
 * Requirements:
 *   - specKitSyncStatus == "synced"
 *   - modelWarmupStatus == "pass"
 *   - mcpWarmupStatus == "pass"
 *   - readyForDemoRuns == true
 *   - providerProfileReadiness in ["ready_for_demo", "ready_for_real"]
 *   - opencode_slash_commands: max demo-ready (blocked from real, but demo allowed)
 */
export function canProviderProfileDemoRun(profile: PositronProviderProfile): boolean {
	// Hard blocks
	if (profile.providerProfileReadiness === 'blocked') return false;
	if (profile.providerProfileReadiness === 'not_ready') return false;

	// Must be explicitly allowed for demo
	if (!profile.readyForDemoRuns) return false;

	// Sync must be established
	if (profile.specKitSyncStatus !== 'synced') return false;

	// Warm-up must pass for both MCP and model
	if (profile.modelWarmupStatus !== 'pass') return false;
	if (profile.mcpWarmupStatus !== 'pass') return false;

	// opencode_slash_commands: demo allowed but real blocked
	// (Demo readiness check passes; real-run check handles the slash-command block)

	return true;
}

/**
 * Check if a provider profile is eligible for real/production runs.
 *
 * Requirements:
 *   - specKitSyncStatus == "synced"
 *   - modelWarmupStatus == "pass"
 *   - mcpWarmupStatus == "pass"
 *   - readyForRealRuns == true
 *   - providerProfileReadiness == "ready_for_real"
 *   - humanApproved == true
 *   - reSyncReasons must be empty
 *   - specKitMode must be real-run-ready (not opencode_slash_commands)
 *
 * The `humanApproved` parameter is provided by the oversight system.
 * This function does NOT make approval decisions — it only gates on profile state.
 */
export function canProviderProfileRealRun(
	profile: PositronProviderProfile,
	humanApproved: boolean,
): boolean {
	// Hard blocks
	if (profile.providerProfileReadiness === 'blocked') return false;
	if (profile.providerProfileReadiness === 'not_ready') return false;

	// Must be explicitly marked ready for real
	if (profile.providerProfileReadiness !== 'ready_for_real') return false;
	if (!profile.readyForRealRuns) return false;

	// Sync must be clean
	if (profile.specKitSyncStatus !== 'synced') return false;
	if (profile.reSyncReasons.length > 0) return false;

	// Warm-up must pass
	if (profile.modelWarmupStatus !== 'pass') return false;
	if (profile.mcpWarmupStatus !== 'pass') return false;

	// Spec Kit mode must be real-run-ready
	if (!isSpecKitModeRealRunReady(profile.specKitMode)) return false;

	// Human approval required
	return humanApproved;
}

// ── Spec Kit Mode Safety Policy ────────────────────────────────────────────

/**
 * Determine the maximum readiness level for a given Spec Kit mode.
 *
 *   - adapter_bridge: can reach ready_for_real (preferred mode)
 *   - standalone_cli: can reach ready_for_real (when version/source/ref validated)
 *   - opencode_slash_commands: max ready_for_demo until proof exists
 */
export function maxReadinessForSpecKitMode(mode: SpecKitMode): ProviderProfileReadiness {
	switch (mode) {
		case 'adapter_bridge':
			return 'ready_for_real';
		case 'standalone_cli':
			return 'ready_for_real';
		case 'opencode_slash_commands':
			return 'ready_for_demo'; // Downgraded — needs slash-command availability proof (future PR)
		default:
			return 'blocked';
	}
}

/**
 * Check if a profile's readiness is compatible with its Spec Kit mode.
 * Returns validation errors if the readiness exceeds what the mode allows.
 */
export function validateSpecKitModeReadiness(profile: PositronProviderProfile): ValidationResult {
	const maxReadiness = maxReadinessForSpecKitMode(profile.specKitMode);

	const readinessOrder: Record<ProviderProfileReadiness, number> = {
		blocked: 0,
		not_ready: 1,
		ready_for_demo: 2,
		ready_for_real: 3,
	};

	if (readinessOrder[profile.providerProfileReadiness] > readinessOrder[maxReadiness]) {
		return validationFail([
			`Provider profile readiness "${profile.providerProfileReadiness}" exceeds maximum allowed readiness "${maxReadiness}" for specKitMode "${profile.specKitMode}". opencode_slash_commands cannot be real-run-ready without slash-command availability proof.`,
		]);
	}

	return validationPass();
}

// ── Evidence Redaction ─────────────────────────────────────────────────────

/**
 * Redacted version of PositronProviderProfile for evidence and logging.
 * Private paths are excluded, secrets are never present.
 */
export interface RedactedPositronProviderProfile {
	profileId: string;
	opencodeVersion: string;
	opencodeModelProfileId: string;
	opencodeModelRef: string;
	specKitVersion: string;
	specKitInstallSource: SpecKitInstallSource;
	specKitInstallRef: string;
	specKitMode: SpecKitMode;
	mcpWarmupStatus: string;
	modelWarmupStatus: string;
	specKitSyncStatus: SpecKitSyncStatus;
	providerProfileReadiness: ProviderProfileReadiness;
	readyForDemoRuns: boolean;
	readyForRealRuns: boolean;
	reSyncReasons: ReSyncReason[];
}

/**
 * Redact a provider profile for evidence/logging by removing:
 *   - Absolute private binary paths (replaced with basename)
 *   - Absolute config paths (replaced with basename)
 *   - Any secret-like fields (not present by construction, but defense-in-depth)
 *
 * Keeps enough metadata for evidence: versions, refs, statuses, reasons.
 */
export function redactProviderProfileForEvidence(
	profile: PositronProviderProfile,
): RedactedPositronProviderProfile {
	return {
		profileId: profile.profileId,
		opencodeVersion: profile.opencodeVersion,
		opencodeModelProfileId: profile.opencodeModelProfileId,
		opencodeModelRef: profile.opencodeModelRef,
		specKitVersion: profile.specKitVersion,
		specKitInstallSource: profile.specKitInstallSource,
		specKitInstallRef: profile.specKitInstallRef,
		specKitMode: profile.specKitMode,
		mcpWarmupStatus: profile.mcpWarmupStatus,
		modelWarmupStatus: profile.modelWarmupStatus,
		specKitSyncStatus: profile.specKitSyncStatus,
		providerProfileReadiness: profile.providerProfileReadiness,
		readyForDemoRuns: profile.readyForDemoRuns,
		readyForRealRuns: profile.readyForRealRuns,
		reSyncReasons: [...profile.reSyncReasons],
	};
}
