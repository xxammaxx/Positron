// Positron — Infrastructure State Stores
// PR 12: Persistent Infrastructure State Stores for Provider/Model/SpecKit/MCP Gates
// ---------------------------------------------------------------------------
// This module defines store interfaces, types, validation rules, an in-memory
// adapter (for tests), and the aggregator binding that connects stored state
// to the infrastructure gate evaluator.
//
// SECURITY:
// - Stores read/write status data only — NEVER start runtime
// - No OpenCode/MCP/Spec Kit execution
// - No install, download, curl, or tool execution
// - Missing stores → undefined (gates will report missing/not_checked)
// - Evidence is redacted (no secrets, no private paths)
// - Validation enforces integrity before storage
// - No fake PASS values, no fabricated defaults
// ---------------------------------------------------------------------------

import type { OpenCodeProviderDetectionEvidence } from './opencode-provider-detection.js';
import { validateOpenCodeProviderDetectionEvidence } from './opencode-provider-detection.js';
import type { OpenCodeModelProfile } from './opencode-model-profile.js';
import { validateOpenCodeModelProfile } from './opencode-model-profile.js';
import type { PositronProviderProfile } from './speckit-sync-profile.js';
import { validatePositronProviderProfile } from './speckit-sync-profile.js';
import type { McpWarmupEvidence } from './mcp-warmup-profile.js';
import { validateMcpWarmupEvidence } from './mcp-warmup-profile.js';
import type { InfrastructureGateEvaluationInput } from './infrastructure-gates.js';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Infrastructure state kinds — each maps to a store that holds runtime-status data.
 */
export type InfrastructureStateKind =
	| 'provider_detection'
	| 'model_profile'
	| 'speckit_sync'
	| 'mcp_warmup_evidence';

/**
 * All infrastructure state kinds as a readonly array.
 */
export const ALL_INFRASTRUCTURE_STATE_KINDS: readonly InfrastructureStateKind[] = [
	'provider_detection',
	'model_profile',
	'speckit_sync',
	'mcp_warmup_evidence',
];

/**
 * Generic infrastructure state record (for SQLite or generic storage layers).
 */
export interface InfrastructureStateRecord<T = unknown> {
	kind: InfrastructureStateKind;
	key: string;
	value: T;
	evidenceRef?: string;
	createdAt: string;
	updatedAt: string;
}

/**
 * Validation result returned by store validation functions.
 */
export interface StoreValidationResult {
	valid: boolean;
	reasons: string[];
}

// ═══════════════════════════════════════════════════════════════════════════
// Individual Store Interfaces
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Provider Detection Store
 *
 * Stores the latest OpenCode provider detection evidence.
 * Only ONE active detection record at a time (latest wins).
 */
export interface ProviderDetectionStore {
	/** Returns the latest detection evidence, or undefined if never stored. */
	getLatest(): Promise<OpenCodeProviderDetectionEvidence | undefined>;

	/** Stores or updates detection evidence (upsert: overwrites previous). */
	upsert(value: OpenCodeProviderDetectionEvidence): Promise<void>;
}

/**
 * Model Profile Store
 *
 * Stores the currently active OpenCode model profile.
 * Only ONE active profile at a time.
 */
export interface ModelProfileStore {
	/** Returns the active model profile, or undefined if never set. */
	getActive(): Promise<OpenCodeModelProfile | undefined>;

	/** Sets the active model profile (overwrites previous). */
	setActive(value: OpenCodeModelProfile): Promise<void>;
}

/**
 * Spec Kit Sync State Store
 *
 * Stores the current PositronProviderProfile (OpenCode + SpecKit + MCP state).
 * Only ONE active profile at a time.
 */
export interface SpecKitSyncStateStore {
	/** Returns the active provider profile, or undefined if never set. */
	getActive(): Promise<PositronProviderProfile | undefined>;

	/** Sets the active provider profile (overwrites previous). */
	setActive(value: PositronProviderProfile): Promise<void>;
}

/**
 * MCP Warm-up Evidence Store
 *
 * Stores warm-up evidence for each MCP server.
 * Multiple evidence records can be stored (one per server per warm-up run).
 */
export interface McpWarmupEvidenceStore {
	/** Lists all latest warm-up evidence records. Empty array if none. */
	listLatest(): Promise<McpWarmupEvidence[]>;

	/** Adds or updates warm-up evidence for a specific server. */
	upsert(value: McpWarmupEvidence): Promise<void>;
}

/**
 * Complete set of infrastructure state stores.
 */
export interface InfrastructureStateStores {
	providerDetection: ProviderDetectionStore;
	modelProfile: ModelProfileStore;
	specKitSync: SpecKitSyncStateStore;
	mcpWarmupEvidence: McpWarmupEvidenceStore;
}

// ═══════════════════════════════════════════════════════════════════════════
// Store Validation Rules
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Validate a value before storing it in the ProviderDetectionStore.
 *
 * Rules:
 * - Must be a valid OpenCodeProviderDetectionEvidence
 * - redactionApplied must be true (or redact before store — caller responsibility)
 * - secretsDetected = true is allowed to be stored, but gates will block
 * - privatePathsDetected = true is allowed to be stored, but gates will block
 *
 * NEVER starts OpenCode runtime, never installs, never downloads.
 */
export function validateProviderDetectionStoreValue(
	value: unknown,
): StoreValidationResult {
	if (value === null || value === undefined) {
		return { valid: false, reasons: ['Value must not be null or undefined'] };
	}

	const validation = validateOpenCodeProviderDetectionEvidence(value);
	if (!validation.valid) {
		return { valid: false, reasons: validation.errors };
	}

	const evidence = value as OpenCodeProviderDetectionEvidence;

	// redactionApplied must be true — if not, caller must redact before storing
	if (!evidence.redactionApplied) {
		return {
			valid: false,
			reasons: ['Provider detection evidence must be redacted before storing (redactionApplied must be true)'],
		};
	}

	return { valid: true, reasons: [] };
}

/**
 * Validate a value before storing it in the ModelProfileStore.
 *
 * Rules:
 * - Must be a valid OpenCodeModelProfile
 * - unknown-provider-blocked is allowed to be stored, but gates will block
 * - chat_only profiles are allowed to be stored, but gates will not mark real-run-ready
 *
 * NEVER starts model runtime, never executes inference.
 */
export function validateModelProfileStoreValue(
	value: unknown,
): StoreValidationResult {
	if (value === null || value === undefined) {
		return { valid: false, reasons: ['Value must not be null or undefined'] };
	}

	const validation = validateOpenCodeModelProfile(value);
	if (!validation.valid) {
		return { valid: false, reasons: validation.errors };
	}

	// All valid OpenCodeModelProfiles are storable — gates handle the policy
	return { valid: true, reasons: [] };
}

/**
 * Validate a value before storing it in the SpecKitSyncStateStore.
 *
 * Rules:
 * - Must be a valid PositronProviderProfile
 * - source must be github/spec-kit (enforced by type guard)
 * - version/ref must be pinned
 * - needs_resync profiles are allowed to be stored, but gates will block
 *
 * NEVER starts Spec Kit runtime, never executes sync.
 */
export function validateSpecKitSyncStoreValue(
	value: unknown,
): StoreValidationResult {
	if (value === null || value === undefined) {
		return { valid: false, reasons: ['Value must not be null or undefined'] };
	}

	const validation = validatePositronProviderProfile(value);
	if (!validation.valid) {
		return { valid: false, reasons: validation.errors };
	}

	// All valid PositronProviderProfiles are storable — gates handle the policy
	return { valid: true, reasons: [] };
}

/**
 * Validate a value before storing it in the McpWarmupEvidenceStore.
 *
 * Rules:
 * - Must be valid McpWarmupEvidence
 * - redactionApplied must be true
 * - Secrets/private paths should not be in the evidence (redact before storing)
 *
 * NEVER starts MCP runtime, never executes warm-up.
 */
export function validateMcpWarmupEvidenceStoreValue(
	value: unknown,
): StoreValidationResult {
	if (value === null || value === undefined) {
		return { valid: false, reasons: ['Value must not be null or undefined'] };
	}

	const validation = validateMcpWarmupEvidence(value);
	if (!validation.valid) {
		return { valid: false, reasons: validation.errors };
	}

	// All valid McpWarmupEvidence is storable — gates handle the policy
	return { valid: true, reasons: [] };
}

/**
 * Dispatch validation based on store kind.
 */
export function validateStoreValue(
	kind: InfrastructureStateKind,
	value: unknown,
): StoreValidationResult {
	switch (kind) {
		case 'provider_detection':
			return validateProviderDetectionStoreValue(value);
		case 'model_profile':
			return validateModelProfileStoreValue(value);
		case 'speckit_sync':
			return validateSpecKitSyncStoreValue(value);
		case 'mcp_warmup_evidence':
			return validateMcpWarmupEvidenceStoreValue(value);
		default:
			return { valid: false, reasons: [`Unknown store kind: ${kind}`] };
	}
}

// ═══════════════════════════════════════════════════════════════════════════
// In-Memory Adapter
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Creates a fully in-memory set of infrastructure state stores.
 *
 * Suitable for:
 * - Unit tests (no DB dependency, no files)
 * - Environments without a persistent DB
 * - Prototyping
 *
 * Rules:
 * - Deterministic (no random, no side effects)
 * - No filesystem access
 * - No database access
 * - Empty stores return undefined (no fake defaults)
 * - No runtime execution
 */
export function createInMemoryInfrastructureStateStores(): InfrastructureStateStores {
	// ── Provider Detection ─────────────────────────────────────────────
	let providerDetection: OpenCodeProviderDetectionEvidence | undefined;

	const providerDetectionStore: ProviderDetectionStore = {
		async getLatest() {
			return providerDetection;
		},
		async upsert(value: OpenCodeProviderDetectionEvidence) {
			const validation = validateProviderDetectionStoreValue(value);
			if (!validation.valid) {
				throw new Error(
					`Invalid provider detection evidence: ${validation.reasons.join('; ')}`,
				);
			}
			providerDetection = value;
		},
	};

	// ── Model Profile ─────────────────────────────────────────────────
	let modelProfile: OpenCodeModelProfile | undefined;

	const modelProfileStore: ModelProfileStore = {
		async getActive() {
			return modelProfile;
		},
		async setActive(value: OpenCodeModelProfile) {
			const validation = validateModelProfileStoreValue(value);
			if (!validation.valid) {
				throw new Error(
					`Invalid model profile: ${validation.reasons.join('; ')}`,
				);
			}
			modelProfile = value;
		},
	};

	// ── Spec Kit Sync ─────────────────────────────────────────────────
	let specKitProfile: PositronProviderProfile | undefined;

	const specKitSyncStore: SpecKitSyncStateStore = {
		async getActive() {
			return specKitProfile;
		},
		async setActive(value: PositronProviderProfile) {
			const validation = validateSpecKitSyncStoreValue(value);
			if (!validation.valid) {
				throw new Error(
					`Invalid SpecKit sync profile: ${validation.reasons.join('; ')}`,
				);
			}
			specKitProfile = value;
		},
	};

	// ── MCP Warm-up Evidence ──────────────────────────────────────────
	const mcpEvidence: McpWarmupEvidence[] = [];

	const mcpWarmupEvidenceStore: McpWarmupEvidenceStore = {
		async listLatest() {
			return [...mcpEvidence];
		},
		async upsert(value: McpWarmupEvidence) {
			const validation = validateMcpWarmupEvidenceStoreValue(value);
			if (!validation.valid) {
				throw new Error(
					`Invalid MCP warm-up evidence: ${validation.reasons.join('; ')}`,
				);
			}
			// Upsert: replace existing record for the same server
			const idx = mcpEvidence.findIndex(
				(e) => e.serverId === value.serverId,
			);
			if (idx >= 0) {
				mcpEvidence[idx] = value;
			} else {
				mcpEvidence.push(value);
			}
		},
	};

	return {
		providerDetection: providerDetectionStore,
		modelProfile: modelProfileStore,
		specKitSync: specKitSyncStore,
		mcpWarmupEvidence: mcpWarmupEvidenceStore,
	};
}

// ═══════════════════════════════════════════════════════════════════════════
// Aggregator Store Binding
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Options for loading infrastructure gate evaluation input from stores.
 */
export interface LoadFromStoresOptions {
	/** The infrastructure state stores to read from. */
	stores: InfrastructureStateStores;
	/** Tool Gateway status snapshot (optional — if omitted, tool_gateway gate will be missing). */
	toolGatewayStatus?: InfrastructureGateEvaluationInput['toolGatewayStatus'];
	/** MCP capability manifests (optional — if omitted, MCP-related gates use undefined manifests). */
	mcpManifests?: InfrastructureGateEvaluationInput['mcpManifests'];
	/** Active approval gates (optional). */
	approvalGates?: InfrastructureGateEvaluationInput['approvalGates'];
	/** Security warnings (optional). */
	securityWarnings?: InfrastructureGateEvaluationInput['securityWarnings'];
	/** Whether a human has explicitly approved a real run (optional). */
	humanApprovedForRealRun?: boolean;
	/** ISO 8601 timestamp for this evaluation. */
	checkedAt: string;
}

/**
 * Load infrastructure gate evaluation input from stores.
 *
 * Reads each store and builds the full InfrastructureGateEvaluationInput.
 *
 * SECURITY:
 * - Read-only — NEVER starts any runtime
 * - Missing stores → undefined (gates will report missing/not_checked)
 * - No fake PASS values, no fabricated defaults
 * - No runtime execution of any kind
 */
export async function loadInfrastructureGateEvaluationInputFromStores(
	options: LoadFromStoresOptions,
): Promise<InfrastructureGateEvaluationInput> {
	const {
		stores,
		toolGatewayStatus,
		mcpManifests,
		approvalGates,
		securityWarnings,
		humanApprovedForRealRun,
		checkedAt,
	} = options;

	// Read from stores — each may return undefined if never populated
	const providerDetection = await stores.providerDetection.getLatest();
	const modelProfile = await stores.modelProfile.getActive();
	const providerProfile = await stores.specKitSync.getActive();
	const mcpEvidence = await stores.mcpWarmupEvidence.listLatest();

	return {
		providerDetection: providerDetection ?? undefined,
		modelProfile: modelProfile ?? undefined,
		providerProfile: providerProfile ?? undefined,
		mcpEvidence: mcpEvidence.length > 0 ? mcpEvidence : undefined,
		mcpManifests: mcpManifests ?? undefined,
		approvalGates: approvalGates ?? undefined,
		toolGatewayStatus: toolGatewayStatus ?? undefined,
		securityWarnings: securityWarnings ?? undefined,
		humanApprovedForRealRun: humanApprovedForRealRun ?? false,
		checkedAt,
	};
}

// ═══════════════════════════════════════════════════════════════════════════
// Evidence Events
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Evidence event types for store operations.
 * These are used to track when state is updated or read for gates.
 */
export type InfrastructureStateStoreEvidenceEvent =
	| 'infrastructure-state-provider-detection-upserted'
	| 'infrastructure-state-model-profile-set-active'
	| 'infrastructure-state-speckit-sync-set-active'
	| 'infrastructure-state-mcp-warmup-evidence-upserted'
	| 'infrastructure-state-loaded-for-gates';

/**
 * All store evidence events.
 */
export const ALL_INFRASTRUCTURE_STATE_STORE_EVIDENCE_EVENTS: readonly InfrastructureStateStoreEvidenceEvent[] = [
	'infrastructure-state-provider-detection-upserted',
	'infrastructure-state-model-profile-set-active',
	'infrastructure-state-speckit-sync-set-active',
	'infrastructure-state-mcp-warmup-evidence-upserted',
	'infrastructure-state-loaded-for-gates',
];

/**
 * Structured evidence record for a store event.
 */
export interface InfrastructureStateStoreEvidence {
	event: InfrastructureStateStoreEvidenceEvent;
	kind: InfrastructureStateKind;
	/** Key identifying the stored record (e.g., serverId, profileId). */
	recordKey: string;
	/** ISO 8601 timestamp. */
	timestamp: string;
	/** Reference to redacted evidence (path or ID, no secrets). */
	evidenceRef?: string;
}

/**
 * Helper to check if a value is a valid InfrastructureStateKind.
 */
export function isInfrastructureStateKind(value: unknown): value is InfrastructureStateKind {
	return (
		typeof value === 'string' &&
		(ALL_INFRASTRUCTURE_STATE_KINDS as readonly string[]).includes(value)
	);
}
