// Positron — Safe Infrastructure State Upsert API Types, Validation, Redaction
// PR 15: Safe Upsert API/CLI for Infrastructure State Stores
// ---------------------------------------------------------------------------
// This module defines payload types, validation rules, redaction helpers,
// secret detection, and safe-upsert logic for the infrastructure state stores.
//
// SECURITY:
// - NEVER starts OpenCode runtime
// - NEVER starts Spec Kit runtime
// - NEVER starts MCP runtime
// - NEVER executes tools
// - NEVER executes shell commands
// - All upserts go through store validation before write
// - Secrets are detected and rejected
// - Private paths are redacted before storage
// - redactionApplied is enforced
// - No fake PASS values
// ---------------------------------------------------------------------------

import type { OpenCodeProviderDetectionEvidence } from './opencode-provider-detection.js';
import { validateOpenCodeProviderDetectionEvidence } from './opencode-provider-detection.js';
import type { OpenCodeModelProfile } from './opencode-model-profile.js';
import { validateOpenCodeModelProfile } from './opencode-model-profile.js';
import type { PositronProviderProfile } from './speckit-sync-profile.js';
import { validatePositronProviderProfile } from './speckit-sync-profile.js';
import type { McpWarmupEvidence } from './mcp-warmup-profile.js';
import { validateMcpWarmupEvidence } from './mcp-warmup-profile.js';
import type {
	InfrastructureStateKind,
	InfrastructureStateStores,
	InfrastructureStateStoreEvidence,
	InfrastructureStateStoreEvidenceEvent,
} from './infrastructure-state-store.js';
import {
	validateProviderDetectionStoreValue,
	validateModelProfileStoreValue,
	validateSpecKitSyncStoreValue,
	validateMcpWarmupEvidenceStoreValue,
} from './infrastructure-state-store.js';
import type { InfrastructureGateSummary } from './infrastructure-gates.js';
import { evaluateInfrastructureGates } from './infrastructure-gates.js';
import { loadInfrastructureGateEvaluationInputFromStores } from './infrastructure-state-store.js';

// ═══════════════════════════════════════════════════════════════════════════
// Request Payload Types
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Request payload for upserting Provider Detection state.
 */
export interface UpsertProviderDetectionRequest {
	evidence: OpenCodeProviderDetectionEvidence;
}

/**
 * Request payload for upserting Model Profile state.
 */
export interface UpsertModelProfileRequest {
	profile: OpenCodeModelProfile;
}

/**
 * Request payload for upserting Spec Kit Sync state.
 */
export interface UpsertSpecKitSyncRequest {
	profile: PositronProviderProfile;
}

/**
 * Request payload for upserting MCP Warm-up Evidence.
 */
export interface UpsertMcpWarmupEvidenceRequest {
	evidence: McpWarmupEvidence;
}

/**
 * Union of all upsert request types.
 */
export type InfrastructureStateUpsertRequest =
	| { kind: 'provider_detection'; payload: UpsertProviderDetectionRequest }
	| { kind: 'model_profile'; payload: UpsertModelProfileRequest }
	| { kind: 'speckit_sync'; payload: UpsertSpecKitSyncRequest }
	| { kind: 'mcp_warmup_evidence'; payload: UpsertMcpWarmupEvidenceRequest };

// ═══════════════════════════════════════════════════════════════════════════
// Upsert Response Type
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Response returned after an infrastructure state upsert attempt.
 *
 * - `stored`: Successfully validated, redacted, and written to the store.
 * - `rejected`: Payload failed validation or contained secrets.
 * - `blocked`: The upsert path is disabled by policy or configuration.
 */
export interface InfrastructureStateUpsertResponse {
	/** Result status */
	status: 'stored' | 'rejected' | 'blocked';
	/** Which kind of infrastructure state was attempted */
	kind: InfrastructureStateKind;
	/** Evidence reference ID (if stored) */
	evidenceRef?: string;
	/** Always true — responses never contain unredacted data */
	redacted: true;
	/** Reasons why the upsert was blocked or rejected */
	blockedReasons: string[];
	/** Re-evaluated infrastructure gates after the upsert (if status is 'stored') */
	infrastructureGates?: InfrastructureGateSummary;
}

// ═══════════════════════════════════════════════════════════════════════════
// Secret Detection Helpers
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Patterns for detecting secrets in string values.
 * These patterns are conservative — they detect well-known secret formats
 * and are used to REJECT payloads that contain cleartext secrets.
 */
const SECRET_PATTERNS: readonly RegExp[] = [
	// GitHub personal access tokens
	/ghp_[a-zA-Z0-9]{36}/,
	/github_pat_[a-zA-Z0-9_]{22,}/,
	// Generic API key patterns
	/sk-[a-zA-Z0-9]{32,}/,
	/AIza[a-zA-Z0-9_-]{32,}/,
	/anthropic_[a-zA-Z0-9_-]{16,}/,
	// Bearer tokens
	/Bearer\s+[a-zA-Z0-9_\-+=.]{20,}/i,
	// Private keys in PEM format
	/-----BEGIN\s+(RSA|EC|DSA|OPENSSH|PGP)\s+PRIVATE KEY-----/,
	// Generic token/key in query strings
	/[?&](token|secret|api_key|apikey|key|auth|password|passwd)=[^&\s]{8,}/i,
];

/**
 * Check if a string value contains secret-like patterns.
 */
export function containsSecrets(value: string): boolean {
	for (const pattern of SECRET_PATTERNS) {
		if (pattern.test(value)) {
			return true;
		}
	}
	return false;
}

/**
 * Recursively scan an object for secret patterns.
 * Returns an array of field paths that contain secrets.
 */
export function scanObjectForSecrets(
	obj: unknown,
	path = '$',
): string[] {
	const found: string[] = [];

	if (obj === null || obj === undefined) return found;

	if (typeof obj === 'string') {
		if (containsSecrets(obj)) {
			found.push(path);
		}
		return found;
	}

	if (Array.isArray(obj)) {
		for (let i = 0; i < obj.length; i++) {
			found.push(...scanObjectForSecrets(obj[i], `${path}[${i}]`));
		}
		return found;
	}

	if (typeof obj === 'object') {
		const record = obj as Record<string, unknown>;
		for (const key of Object.keys(record)) {
			// Skip known-safe boolean/number fields
			const val = record[key];
			if (typeof val === 'string') {
				if (containsSecrets(val)) {
					found.push(`${path}.${key}`);
				}
			} else if (typeof val === 'object' && val !== null) {
				found.push(...scanObjectForSecrets(val, `${path}.${key}`));
			}
		}
	}

	return found;
}

// ═══════════════════════════════════════════════════════════════════════════
// Private Path Detection
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Private path prefixes that indicate a path should not be stored in cleartext.
 */
const PRIVATE_PATH_PREFIXES: readonly string[] = [
	'/root/',
	'/home/',
	'C:\\Users\\',
	'/Users/',
	'~/.',
	'$HOME/',
];

/**
 * Check if a path string looks like a private filesystem path.
 */
export function isPrivatePath(pathStr: string): boolean {
	const normalized = pathStr.replace(/\\/g, '/');
	for (const prefix of PRIVATE_PATH_PREFIXES) {
		const normalizedPrefix = prefix.replace(/\\/g, '/');
		if (normalized.startsWith(normalizedPrefix) || normalized.includes(`/${normalizedPrefix.replace(/^\//, '')}`)) {
			return true;
		}
	}
	return false;
}

/**
 * Redact a private filesystem path to a normalized representation.
 * E.g., `/root/.opencode/bin/opencode` → `$HOME/.opencode/bin/opencode`
 *       `/home/user/project` → `$HOME/project`
 */
export function redactPrivatePath(pathStr: string): string {
	const normalized = pathStr.replace(/\\/g, '/');

	// Replace /root/ with $HOME/
	if (normalized.startsWith('/root/')) {
		return '$HOME/' + normalized.slice(6);
	}

	// Replace /home/<user>/ with $HOME/
	const homeMatch = normalized.match(/^\/home\/[^/]+(\/.*)?$/);
	if (homeMatch) {
		return '$HOME' + (homeMatch[1] ?? '');
	}

	// Replace C:\Users\<user>\ with $HOME/
	const winMatch = normalized.match(/^C:\/Users\/[^/]+(\/.*)?$/i);
	if (winMatch) {
		return '$HOME' + (winMatch[1] ?? '');
	}

	// Replace /Users/<user>/ with $HOME/
	const macMatch = normalized.match(/^\/Users\/[^/]+(\/.*)?$/);
	if (macMatch) {
		return '$HOME' + (macMatch[1] ?? '');
	}

	return pathStr;
}

// ═══════════════════════════════════════════════════════════════════════════
// Per-Kind Upsert Validation
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Validation result for an upsert attempt.
 */
export interface UpsertValidationResult {
	valid: boolean;
	blockedReasons: string[];
	/** Secrets found at these paths */
	secretPaths: string[];
	/** Whether private paths were detected */
	privatePathsDetected: boolean;
}

function passValidation(): UpsertValidationResult {
	return { valid: true, blockedReasons: [], secretPaths: [], privatePathsDetected: false };
}

/**
 * Validate a Provider Detection upsert payload.
 *
 * Rules:
 * - Must be a non-null object with an `evidence` field
 * - Evidence must pass validateOpenCodeProviderDetectionEvidence
 * - Evidence must have redactionApplied === true
 * - No secrets allowed in the evidence
 * - Private paths must be redacted
 */
export function validateProviderDetectionUpsert(
	payload: unknown,
): UpsertValidationResult {
	const blockedReasons: string[] = [];

	if (!payload || typeof payload !== 'object') {
		blockedReasons.push('Payload must be a non-null object');
		return { valid: false, blockedReasons, secretPaths: [], privatePathsDetected: false };
	}

	const p = payload as Record<string, unknown>;

	if (!p.evidence) {
		blockedReasons.push('Missing required field: evidence');
		return { valid: false, blockedReasons, secretPaths: [], privatePathsDetected: false };
	}

	// Validate evidence structure
	const evidenceValidation = validateOpenCodeProviderDetectionEvidence(p.evidence);
	if (!evidenceValidation.valid) {
		blockedReasons.push(...evidenceValidation.errors);
		return { valid: false, blockedReasons, secretPaths: [], privatePathsDetected: false };
	}

	const evidence = p.evidence as OpenCodeProviderDetectionEvidence;

	// redactionApplied must be true
	if (!evidence.redactionApplied) {
		blockedReasons.push('Evidence must be redacted before storing (redactionApplied must be true)');
	}

	// Check for secrets in serialized form
	const secretPaths = scanObjectForSecrets(evidence);
	if (secretPaths.length > 0) {
		blockedReasons.push(`Secrets detected in payload: ${secretPaths.join(', ')}`);
		return { valid: false, blockedReasons, secretPaths, privatePathsDetected: false };
	}

	// Check for private paths
	let privatePathsDetected = false;
	if (evidence.detectedPath && isPrivatePath(evidence.detectedPath)) {
		privatePathsDetected = true;
		blockedReasons.push('Private filesystem path detected in evidence (must be redacted before storing)');
	}

	if (blockedReasons.length > 0) {
		return { valid: false, blockedReasons, secretPaths, privatePathsDetected };
	}

	return { valid: true, blockedReasons: [], secretPaths: [], privatePathsDetected };
}

/**
 * Validate a Model Profile upsert payload.
 *
 * Rules:
 * - Must be a non-null object with a `profile` field
 * - Profile must pass validateOpenCodeModelProfile
 * - No `apiKey` field in profile
 * - No secrets in profile
 */
export function validateModelProfileUpsert(
	payload: unknown,
): UpsertValidationResult {
	const blockedReasons: string[] = [];

	if (!payload || typeof payload !== 'object') {
		blockedReasons.push('Payload must be a non-null object');
		return { valid: false, blockedReasons, secretPaths: [], privatePathsDetected: false };
	}

	const p = payload as Record<string, unknown>;

	if (!p.profile) {
		blockedReasons.push('Missing required field: profile');
		return { valid: false, blockedReasons, secretPaths: [], privatePathsDetected: false };
	}

	// Validate profile structure
	const profileValidation = validateOpenCodeModelProfile(p.profile);
	if (!profileValidation.valid) {
		blockedReasons.push(...profileValidation.errors);
		return { valid: false, blockedReasons, secretPaths: [], privatePathsDetected: false };
	}

	const profile = p.profile as OpenCodeModelProfile;

	// Reject apiKey field (already checked by type guard, but double-check)
	// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
	if ('apiKey' in (profile as unknown as Record<string, unknown>)) {
		blockedReasons.push('SECURITY: Profile contains forbidden field "apiKey". API keys must never be stored in profiles.');
		return { valid: false, blockedReasons, secretPaths: [], privatePathsDetected: false };
	}

	// Check for secrets
	const secretPaths = scanObjectForSecrets(profile);
	if (secretPaths.length > 0) {
		blockedReasons.push(`Secrets detected in payload: ${secretPaths.join(', ')}`);
		return { valid: false, blockedReasons, secretPaths, privatePathsDetected: false };
	}

	return { valid: true, blockedReasons: [], secretPaths: [], privatePathsDetected: false };
}

/**
 * Validate a Spec Kit Sync upsert payload.
 *
 * Rules:
 * - Must be a non-null object with a `profile` field
 * - Profile must pass validatePositronProviderProfile
 * - Source must be github/spec-kit
 * - No secrets in profile
 */
export function validateSpecKitSyncUpsert(
	payload: unknown,
): UpsertValidationResult {
	const blockedReasons: string[] = [];

	if (!payload || typeof payload !== 'object') {
		blockedReasons.push('Payload must be a non-null object');
		return { valid: false, blockedReasons, secretPaths: [], privatePathsDetected: false };
	}

	const p = payload as Record<string, unknown>;

	if (!p.profile) {
		blockedReasons.push('Missing required field: profile');
		return { valid: false, blockedReasons, secretPaths: [], privatePathsDetected: false };
	}

	// Validate profile structure
	const profileValidation = validatePositronProviderProfile(p.profile);
	if (!profileValidation.valid) {
		blockedReasons.push(...profileValidation.errors);
		return { valid: false, blockedReasons, secretPaths: [], privatePathsDetected: false };
	}

	// Enforce: source must be github/spec-kit
	const profile = p.profile as PositronProviderProfile;
	if (profile.specKitInstallSource !== 'github/spec-kit') {
		blockedReasons.push(
			`Spec Kit install source must be "github/spec-kit", got: "${String(profile.specKitInstallSource)}"`,
		);
		return { valid: false, blockedReasons, secretPaths: [], privatePathsDetected: false };
	}

	// Check for secrets
	const secretPaths = scanObjectForSecrets(p.profile);
	if (secretPaths.length > 0) {
		blockedReasons.push(`Secrets detected in payload: ${secretPaths.join(', ')}`);
		return { valid: false, blockedReasons, secretPaths, privatePathsDetected: false };
	}

	return { valid: true, blockedReasons: [], secretPaths: [], privatePathsDetected: false };
}

/**
 * Validate an MCP Warm-up Evidence upsert payload.
 *
 * Rules:
 * - Must be a non-null object with an `evidence` field
 * - Evidence must pass validateMcpWarmupEvidence
 * - Evidence must have redactionApplied === true
 * - No real transport status allowed (only mock/dry-run/metadata-only/forbidden_check)
 * - No secrets allowed
 */
export function validateMcpWarmupEvidenceUpsert(
	payload: unknown,
): UpsertValidationResult {
	const blockedReasons: string[] = [];

	if (!payload || typeof payload !== 'object') {
		blockedReasons.push('Payload must be a non-null object');
		return { valid: false, blockedReasons, secretPaths: [], privatePathsDetected: false };
	}

	const p = payload as Record<string, unknown>;

	if (!p.evidence) {
		blockedReasons.push('Missing required field: evidence');
		return { valid: false, blockedReasons, secretPaths: [], privatePathsDetected: false };
	}

	// Validate evidence structure
	const evidenceValidation = validateMcpWarmupEvidence(p.evidence);
	if (!evidenceValidation.valid) {
		blockedReasons.push(...evidenceValidation.errors);
		return { valid: false, blockedReasons, secretPaths: [], privatePathsDetected: false };
	}

	const evidence = p.evidence as McpWarmupEvidence;

	// redactionApplied must be true
	if (!evidence.redactionApplied) {
		blockedReasons.push('MCP warm-up evidence must be redacted before storing (redactionApplied must be true)');
	}

	// Reject real transport evidence — only mock/dry-run/metadata-only/forbidden_check
	// Evidence must not contain evidence of real MCP connections.
	// Check phases: if the 'connect' phase passed, real transport was used.
	const connectPhase = evidence.phases?.find(
		(p) => p.phase === 'connect',
	);
	if (connectPhase && connectPhase.status === 'pass') {
		blockedReasons.push(
			'MCP connect phase passed — evidence of real transport detected. ' +
			'Only dry-run/mock/metadata-only/forbidden_check evidence can be stored.',
		);
	}

	// Check if any smoke test phases passed (real tool execution)
	const realPhases = ['read_smoke', 'write_smoke_temp_workspace'];
	for (const realPhase of realPhases) {
		const phaseResult = evidence.phases?.find((p) => p.phase === realPhase);
		if (phaseResult && phaseResult.status === 'pass') {
			blockedReasons.push(
				`MCP ${realPhase} phase passed — evidence of real tool execution detected. ` +
				'Only dry-run/mock/metadata-only/forbidden_check evidence can be stored.',
			);
			break;
		}
	}

	// Check for secrets
	const secretPaths = scanObjectForSecrets(evidence);
	if (secretPaths.length > 0) {
		blockedReasons.push(`Secrets detected in payload: ${secretPaths.join(', ')}`);
		return { valid: false, blockedReasons, secretPaths, privatePathsDetected: false };
	}

	if (blockedReasons.length > 0) {
		return { valid: false, blockedReasons, secretPaths, privatePathsDetected: false };
	}

	return { valid: true, blockedReasons: [], secretPaths: [], privatePathsDetected: false };
}

/**
 * Dispatch upsert validation by state kind.
 */
export function validateInfrastructureStateUpsert(
	kind: InfrastructureStateKind,
	payload: unknown,
): UpsertValidationResult {
	switch (kind) {
		case 'provider_detection':
			return validateProviderDetectionUpsert(payload);
		case 'model_profile':
			return validateModelProfileUpsert(payload);
		case 'speckit_sync':
			return validateSpecKitSyncUpsert(payload);
		case 'mcp_warmup_evidence':
			return validateMcpWarmupEvidenceUpsert(payload);
		default:
			return {
				valid: false,
				blockedReasons: [`Unknown infrastructure state kind: ${kind}`],
				secretPaths: [],
				privatePathsDetected: false,
			};
	}
}

// ═══════════════════════════════════════════════════════════════════════════
// Evidence Event Creation
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Map store kind to evidence event type.
 */
export function storeKindToEvidenceEvent(
	kind: InfrastructureStateKind,
): InfrastructureStateStoreEvidenceEvent {
	switch (kind) {
		case 'provider_detection':
			return 'infrastructure-state-provider-detection-upserted';
		case 'model_profile':
			return 'infrastructure-state-model-profile-set-active';
		case 'speckit_sync':
			return 'infrastructure-state-speckit-sync-set-active';
		case 'mcp_warmup_evidence':
			return 'infrastructure-state-mcp-warmup-evidence-upserted';
	}
}

/**
 * Creates a structured evidence record for an upsert operation.
 */
export function createUpsertEvidenceEvent(
	kind: InfrastructureStateKind,
	recordKey: string,
	evidenceRef?: string,
): InfrastructureStateStoreEvidence {
	return {
		event: storeKindToEvidenceEvent(kind),
		kind,
		recordKey,
		timestamp: new Date().toISOString(),
		evidenceRef,
	};
}

// ═══════════════════════════════════════════════════════════════════════════
// Read-only Status Aggregation
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Options for reading the current infrastructure state status.
 */
export interface InfrastructureStateStatusOptions {
	stores: InfrastructureStateStores;
	/** Optional overrides for non-store fields */
	toolGatewayStatus?: {
		gatewayEnabled: boolean;
		mcpExposeEnabled: boolean;
		registeredTools: number;
		sealed: boolean;
		runtimeActive: boolean;
	};
	humanApprovedForRealRun?: boolean;
}

/**
 * Reads the current infrastructure state from stores and returns
 * a gate summary. Read-only — never starts any runtime.
 */
export async function getInfrastructureStateStatus(
	options: InfrastructureStateStatusOptions,
): Promise<InfrastructureGateSummary> {
	const input = await loadInfrastructureGateEvaluationInputFromStores({
		stores: options.stores,
		toolGatewayStatus: options.toolGatewayStatus ?? {
			gatewayEnabled: false,
			mcpExposeEnabled: false,
			registeredTools: 0,
			sealed: true,
			runtimeActive: false,
		},
		humanApprovedForRealRun: options.humanApprovedForRealRun ?? false,
		checkedAt: new Date().toISOString(),
	});

	return evaluateInfrastructureGates(input);
}

// ═══════════════════════════════════════════════════════════════════════════
// Safe Upsert Executor
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Options for executing a safe upsert to the infrastructure state stores.
 */
export interface SafeUpsertOptions {
	/** The infrastructure state stores to write to */
	stores: InfrastructureStateStores;
	/** The kind of state being upserted */
	kind: InfrastructureStateKind;
	/** The validated payload */
	payload: Record<string, unknown>;
	/** Whether the upsert endpoint is enabled */
	upsertEnabled: boolean;
}

/**
 * Executes a safe infrastructure state upsert.
 *
 * This function:
 * 1. Checks if upsert is enabled (env gate)
 * 2. Validates the payload against per-kind rules
 * 3. Rejects if secrets detected
 * 4. Writes to the appropriate store
 * 5. Creates an evidence event
 * 6. Re-evaluates infrastructure gates
 * 7. Returns a redacted response
 *
 * NEVER starts runtime. NEVER executes tools.
 */
export async function executeSafeUpsert(
	options: SafeUpsertOptions,
): Promise<InfrastructureStateUpsertResponse> {
	const { stores, kind, payload, upsertEnabled } = options;

	// Gate 1: Upsert must be enabled
	if (!upsertEnabled) {
		return {
			status: 'blocked',
			kind,
			redacted: true,
			blockedReasons: ['infrastructure_state_upsert_disabled'],
		};
	}

	// Gate 2: Validate payload
	const validation = validateInfrastructureStateUpsert(kind, payload);
	if (!validation.valid) {
		return {
			status: 'rejected',
			kind,
			redacted: true,
			blockedReasons: validation.blockedReasons,
		};
	}

	// Gate 3: Write to the appropriate store
	try {
		let evidenceRef: string | undefined;
		let recordKey: string;

		switch (kind) {
			case 'provider_detection': {
				const req = payload as unknown as UpsertProviderDetectionRequest;
				evidenceRef = req.evidence.evidenceId;
				recordKey = `provider_detection/${evidenceRef}`;
				await stores.providerDetection.upsert(req.evidence);
				break;
			}
			case 'model_profile': {
				const req = payload as unknown as UpsertModelProfileRequest;
				evidenceRef = req.profile.profileId;
				recordKey = `model_profile/${evidenceRef}`;
				await stores.modelProfile.setActive(req.profile);
				break;
			}
			case 'speckit_sync': {
				const req = payload as unknown as UpsertSpecKitSyncRequest;
				evidenceRef = req.profile.profileId;
				recordKey = `speckit_sync/${evidenceRef}`;
				await stores.specKitSync.setActive(req.profile);
				break;
			}
			case 'mcp_warmup_evidence': {
				const req = payload as unknown as UpsertMcpWarmupEvidenceRequest;
				evidenceRef = req.evidence.evidenceId;
				recordKey = `mcp_warmup/${req.evidence.serverId}`;
				await stores.mcpWarmupEvidence.upsert(req.evidence);
				break;
			}
			default:
				return {
					status: 'rejected',
					kind,
					redacted: true,
					blockedReasons: [`Unknown infrastructure state kind: ${kind}`],
				};
		}

		// Create evidence event (for future evidence store integration)
		// Currently the evidence event is generated but not persisted — the
		// InfrastructureStateStores interface does not yet include an evidence
		// event store. This call ensures the event shape is validated and
		// the record is ready for integration when the evidence store lands.
		const _evidenceEvent = createUpsertEvidenceEvent(kind, recordKey, evidenceRef);

		// Re-evaluate infrastructure gates after the upsert
		const gates = await getInfrastructureStateStatus({ stores });

		return {
			status: 'stored',
			kind,
			evidenceRef,
			redacted: true,
			blockedReasons: [],
			infrastructureGates: gates,
		};
	} catch (err) {
		return {
			status: 'rejected',
			kind,
			redacted: true,
			blockedReasons: [
				`Store write failed: ${err instanceof Error ? err.message : String(err)}`,
			],
		};
	}
}
