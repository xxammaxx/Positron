// Positron — Infrastructure Gate State Aggregator
// PR 11: Bind Blueprint Handoff to actual Provider/MCP/SpecKit/ToolGateway states
// ---------------------------------------------------------------------------
// This module defines infrastructure gate types, individual gate evaluators,
// and a central aggregator. It READS existing store/evidence/status data and
// produces structured gate results. It does NOT execute any runtime.
//
// SECURITY:
// - Read-only aggregation of existing state
// - No OpenCode/MCP/Spec Kit runtime
// - No install, download, curl, or tool execution
// - Missing states → blocked or not_checked (never fabricate pass)
// - Evidence is redacted (no secrets, no private paths)
// - No destructive actions
// ---------------------------------------------------------------------------

import type { OpenCodeModelProfile } from './opencode-model-profile.js';
import {
	canUseModelForDemoCoding,
	isChatOnlyModel,
} from './opencode-model-profile.js';
import type { PositronProviderProfile } from './speckit-sync-profile.js';
import {
	canProviderProfileDemoRun,
	canProviderProfileRealRun,
	isProviderProfileSynced,
} from './speckit-sync-profile.js';
import type {
	OpenCodeProviderDetectionEvidence,
} from './opencode-provider-detection.js';
import type { McpCapabilityManifest, McpWarmupEvidence } from './mcp-warmup-profile.js';
import type { ApprovalGate } from './approval-gates.js';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Infrastructure gate kinds — each maps to a specific subsystem state.
 * These align with BlueprintPipelineGateKind from blueprint-pipeline-handoff.ts
 * but are independently defined for loose coupling.
 */
export type InfrastructureGateKind =
	| 'provider_detection'
	| 'model_profile'
	| 'model_warmup'
	| 'speckit_sync'
	| 'mcp_warmup'
	| 'tool_gateway'
	| 'human_approval'
	| 'security';

export const ALL_INFRASTRUCTURE_GATE_KINDS: readonly InfrastructureGateKind[] = [
	'provider_detection',
	'model_profile',
	'model_warmup',
	'speckit_sync',
	'mcp_warmup',
	'tool_gateway',
	'human_approval',
	'security',
];

/**
 * Infrastructure gate status.
 *
 * - pass: Gate condition is satisfied
 * - partial: Gate partially satisfied (e.g., demo-ready but not real-ready)
 * - fail: Gate condition was checked and failed
 * - blocked: Gate is explicitly blocked (e.g., security policy)
 * - not_checked: Gate has not been evaluated yet
 * - missing: Required state/evidence is absent
 */
export type InfrastructureGateStatus =
	| 'pass'
	| 'partial'
	| 'fail'
	| 'blocked'
	| 'not_checked'
	| 'missing';

export const ALL_INFRASTRUCTURE_GATE_STATUSES: readonly InfrastructureGateStatus[] = [
	'pass',
	'partial',
	'fail',
	'blocked',
	'not_checked',
	'missing',
];

/**
 * A single infrastructure gate result.
 */
export interface InfrastructureGateResult {
	/** Which gate was evaluated */
	kind: InfrastructureGateKind;
	/** Current gate status */
	status: InfrastructureGateStatus;
	/** Human-readable message describing the gate state */
	message: string;
	/** Where the data came from */
	source: 'store' | 'evidence' | 'config' | 'derived' | 'missing';
	/** References to evidence artifacts (paths or IDs, no secrets) */
	evidenceRefs: string[];
	/** Blocking reasons if not pass */
	blockedReasons: string[];
	/** ISO 8601 timestamp of when this gate was evaluated */
	checkedAt: string;
}

/**
 * Overall summary of all infrastructure gates.
 */
export interface InfrastructureGateSummary {
	/** Aggregate status across all gates */
	overall: InfrastructureGateStatus;
	/** Individual gate results */
	gates: InfrastructureGateResult[];
	/** Whether the system is ready for demo runs */
	readyForDemo: boolean;
	/** Whether the system is ready for real (production) runs */
	readyForReal: boolean;
	/** All blocking reasons across all gates */
	blockedReasons: string[];
	/** ISO 8601 timestamp */
	checkedAt: string;
}

/**
 * Input to the infrastructure gate aggregator.
 * All fields are optional — missing inputs produce missing/not_checked gates.
 */
export interface InfrastructureGateEvaluationInput {
	/** Provider detection evidence from OpenCode detection */
	providerDetection?: OpenCodeProviderDetectionEvidence;
	/** Currently selected model profile */
	modelProfile?: OpenCodeModelProfile;
	/** Positron provider profile (combines OpenCode + Spec Kit + MCP state) */
	providerProfile?: PositronProviderProfile;
	/** MCP warm-up evidence per server */
	mcpEvidence?: McpWarmupEvidence[];
	/** MCP capability manifests for required servers */
	mcpManifests?: McpCapabilityManifest[];
	/** Active approval gates */
	approvalGates?: ApprovalGate[];
	/** Tool Gateway status snapshot */
	toolGatewayStatus?: {
		gatewayEnabled: boolean;
		mcpExposeEnabled: boolean;
		registeredTools: number;
		sealed: boolean;
		runtimeActive: boolean;
	};
	/** Security warnings with severity and blocked flag */
	securityWarnings?: Array<{
		severity: 'info' | 'warning' | 'high' | 'critical';
		blocked: boolean;
		message: string;
	}>;
	/** Whether a human has explicitly approved a real run */
	humanApprovedForRealRun?: boolean;
	/** ISO 8601 timestamp for this evaluation */
	checkedAt: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// Individual Gate Evaluators
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Evaluate the Provider Detection gate.
 *
 * Reads OpenCodeProviderDetectionEvidence and determines the gate state.
 * NEVER starts OpenCode runtime, never installs, never executes.
 */
export function evaluateProviderDetectionGate(input: {
	providerDetection?: OpenCodeProviderDetectionEvidence;
	checkedAt: string;
}): InfrastructureGateResult {
	const { providerDetection, checkedAt } = input;

	// ── Missing state ────────────────────────────────────────────────────
	if (!providerDetection) {
		return {
			kind: 'provider_detection',
			status: 'missing',
			message: 'No OpenCode provider detection evidence available. Provider status unknown.',
			source: 'missing',
			evidenceRefs: [],
			blockedReasons: ['OpenCode provider detection evidence is missing — cannot determine provider status'],
			checkedAt,
		};
	}

	const evidenceRefs = [`provider-detection-${providerDetection.evidenceId}`];

	// ── Blocked / Error detection status ─────────────────────────────────
	if (providerDetection.detectionStatus === 'blocked') {
		return {
			kind: 'provider_detection',
			status: 'blocked',
			message: `OpenCode provider detection is blocked: ${providerDetection.blockedReasons.join('; ') || 'unknown reason'}`,
			source: 'evidence',
			evidenceRefs,
			blockedReasons: providerDetection.blockedReasons.length > 0
				? providerDetection.blockedReasons
				: ['Provider detection is blocked by policy'],
			checkedAt,
		};
	}

	if (providerDetection.detectionStatus === 'error') {
		return {
			kind: 'provider_detection',
			status: 'blocked',
			message: `OpenCode provider detection failed with error.`,
			source: 'evidence',
			evidenceRefs,
			blockedReasons: ['Provider detection encountered an error'],
			checkedAt,
		};
	}

	// ── Not found ────────────────────────────────────────────────────────
	if (providerDetection.detectionStatus === 'not_found' || providerDetection.detectionStatus === 'unknown') {
		return {
			kind: 'provider_detection',
			status: 'blocked',
			message: 'OpenCode binary not found on this system.',
			source: 'evidence',
			evidenceRefs,
			blockedReasons: ['OpenCode binary not detected — install required before pipeline can proceed'],
			checkedAt,
		};
	}

	// ── Found (detected but not verified) ────────────────────────────────
	if (providerDetection.detectionStatus === 'found') {
		return {
			kind: 'provider_detection',
			status: 'partial',
			message: 'OpenCode binary detected but not yet version-checked.',
			source: 'evidence',
			evidenceRefs,
			blockedReasons: ['OpenCode binary found but not verified — version/help check needed'],
			checkedAt,
		};
	}

	// ── Version checked / Help checked ───────────────────────────────────
	const isVerified =
		providerDetection.detectionStatus === 'version_checked' ||
		providerDetection.detectionStatus === 'help_checked';

	if (isVerified) {
		return {
			kind: 'provider_detection',
			status: 'pass',
			message: `OpenCode binary verified (version: ${providerDetection.version || 'unknown'})`,
			source: 'evidence',
			evidenceRefs,
			blockedReasons: [],
			checkedAt,
		};
	}

	// ── Fallback ─────────────────────────────────────────────────────────
	return {
		kind: 'provider_detection',
		status: 'not_checked',
		message: `OpenCode provider detection status '${providerDetection.detectionStatus}' not recognized for gate evaluation.`,
		source: 'evidence',
		evidenceRefs,
		blockedReasons: [`Unrecognized detection status: ${providerDetection.detectionStatus}`],
		checkedAt,
	};
}

/**
 * Evaluate the Model Profile gate.
 *
 * Reads OpenCodeModelProfile and determines if a usable model profile exists.
 * NEVER starts model warm-up, never runs inference.
 */
export function evaluateModelProfileGate(input: {
	modelProfile?: OpenCodeModelProfile;
	checkedAt: string;
}): InfrastructureGateResult {
	const { modelProfile, checkedAt } = input;

	if (!modelProfile) {
		return {
			kind: 'model_profile',
			status: 'missing',
			message: 'No model profile selected or available.',
			source: 'missing',
			evidenceRefs: [],
			blockedReasons: ['Model profile is missing — no model selected for pipeline execution'],
			checkedAt,
		};
	}

	const evidenceRefs = [`model-profile-${modelProfile.profileId}`];

	// Warm-up blocked/fail means the model cannot be used
	if (modelProfile.warmupStatus === 'blocked') {
		return {
			kind: 'model_profile',
			status: 'blocked',
			message: `Model profile '${modelProfile.profileId}' warm-up is blocked.`,
			source: 'config',
			evidenceRefs,
			blockedReasons: ['Model warm-up is blocked — profile cannot be used'],
			checkedAt,
		};
	}

	if (modelProfile.warmupStatus === 'fail') {
		return {
			kind: 'model_profile',
			status: 'blocked',
			message: `Model profile '${modelProfile.profileId}' warm-up failed.`,
			source: 'config',
			evidenceRefs,
			blockedReasons: ['Model warm-up failed — profile cannot be used'],
			checkedAt,
		};
	}

	// Chat-only model
	if (isChatOnlyModel(modelProfile)) {
		return {
			kind: 'model_profile',
			status: 'partial',
			message: `Model '${modelProfile.profileId}' is chat-only — can plan but cannot execute coding runs.`,
			source: 'config',
			evidenceRefs,
			blockedReasons: ['Chat-only model cannot execute coding/real runs'],
			checkedAt,
		};
	}

	// Check if model can be used for demo coding
	const demoReady = canUseModelForDemoCoding(modelProfile);

	if (!demoReady) {
		const reasons: string[] = [];
		if (!modelProfile.allowedForDemo) {
			reasons.push('Model is not allowed for demo runs');
		}
		if (modelProfile.warmupLevel < 3) {
			reasons.push(`Model warm-up level ${modelProfile.warmupLevel} is insufficient (need >= 3 for demo, currently ${modelProfile.warmupLevel})`);
		}
		return {
			kind: 'model_profile',
			status: 'blocked',
			message: `Model '${modelProfile.profileId}' is not ready for demo coding.`,
			source: 'config',
			evidenceRefs,
			blockedReasons: reasons.length > 0 ? reasons : ['Model profile validation failed for demo runs'],
			checkedAt,
		};
	}

	// Check if allowed for real runs
	const realReady = modelProfile.allowedForRealRuns && modelProfile.warmupLevel >= 4 && modelProfile.warmupStatus === 'pass';

	// Model is at least demo-ready
	return {
		kind: 'model_profile',
		status: realReady ? 'pass' : 'partial',
		message: realReady
			? `Model profile '${modelProfile.profileId}' is valid and ready (warm-up level ${modelProfile.warmupLevel}).`
			: `Model profile '${modelProfile.profileId}' is valid for demo (warm-up level ${modelProfile.warmupLevel}) but may need warm-up for real runs.`,
		source: 'config',
		evidenceRefs,
		blockedReasons: realReady ? [] : ['Model warm-up level or configuration insufficient for real runs'],
		checkedAt,
	};
}

/**
 * Evaluate the Model Warm-up gate.
 *
 * Determines if the model has sufficient warm-up level for the intended use.
 * Level 0/unknown → not_checked, Level 4 + pass → pass, fail → blocked.
 * NEVER starts model warm-up runtime.
 */
export function evaluateModelWarmupGate(input: {
	modelProfile?: OpenCodeModelProfile;
	checkedAt: string;
}): InfrastructureGateResult {
	const { modelProfile, checkedAt } = input;

	if (!modelProfile) {
		return {
			kind: 'model_warmup',
			status: 'missing',
			message: 'No model profile — warm-up status unknown.',
			source: 'missing',
			evidenceRefs: [],
			blockedReasons: ['Model profile is missing — cannot assess warm-up status'],
			checkedAt,
		};
	}

	const evidenceRefs = [`model-warmup-${modelProfile.profileId}`];

	// Warm-up level assessment
	switch (modelProfile.warmupLevel) {
		case 0:
			return {
				kind: 'model_warmup',
				status: 'not_checked',
				message: `Model '${modelProfile.profileId}' warm-up level is 0 — no warm-up has been performed.`,
				source: 'config',
				evidenceRefs,
				blockedReasons: ['Model warm-up has not been performed (level 0)'],
				checkedAt,
			};
		case 1:
		case 2:
			return {
				kind: 'model_warmup',
				status: 'not_checked',
				message: `Model '${modelProfile.profileId}' warm-up level is ${modelProfile.warmupLevel} — insufficient for pipeline.`,
				source: 'config',
				evidenceRefs,
				blockedReasons: [`Model warm-up level ${modelProfile.warmupLevel} is below required threshold (need >= 4 for real runs)`],
				checkedAt,
			};
		case 3:
			return {
				kind: 'model_warmup',
				status: 'partial',
				message: `Model '${modelProfile.profileId}' warm-up level 3 — sufficient for demo, insufficient for real runs.`,
				source: 'config',
				evidenceRefs,
				blockedReasons: ['Model warm-up level 3 allows demo but not real runs'],
				checkedAt,
			};
		case 4:
			// Level 4 = warm-up pass
			if (modelProfile.warmupStatus === 'pass') {
				return {
					kind: 'model_warmup',
					status: 'pass',
					message: `Model '${modelProfile.profileId}' warm-up level 4 passed.`,
					source: 'config',
					evidenceRefs,
					blockedReasons: [],
					checkedAt,
				};
			}
			if (modelProfile.warmupStatus === 'fail' || modelProfile.warmupStatus === 'blocked') {
				return {
					kind: 'model_warmup',
					status: 'blocked',
					message: `Model '${modelProfile.profileId}' warm-up failed or is blocked.`,
					source: 'config',
					evidenceRefs,
					blockedReasons: [`Model warm-up status is '${modelProfile.warmupStatus}' — real runs blocked`],
					checkedAt,
				};
			}
			// Level 4 but status not explicitly pass
			return {
				kind: 'model_warmup',
				status: 'partial',
				message: `Model '${modelProfile.profileId}' warm-up level 4 but status is '${modelProfile.warmupStatus}'.`,
				source: 'config',
				evidenceRefs,
				blockedReasons: ['Model warm-up level 4 but status not confirmed as pass'],
				checkedAt,
			};
		default:
			return {
				kind: 'model_warmup',
				status: 'not_checked',
				message: `Model '${modelProfile.profileId}' warm-up level ${modelProfile.warmupLevel} is unknown.`,
				source: 'config',
				evidenceRefs,
				blockedReasons: [`Unknown warm-up level: ${modelProfile.warmupLevel}`],
				checkedAt,
			};
	}
}

/**
 * Evaluate the Spec Kit Sync gate.
 *
 * Reads PositronProviderProfile and determines Spec Kit sync status.
 * synced + no reSyncReasons → pass, needs_resync → blocked, missing → missing.
 * NEVER executes Spec Kit CLI.
 */
export function evaluateSpecKitSyncGate(input: {
	providerProfile?: PositronProviderProfile;
	checkedAt: string;
}): InfrastructureGateResult {
	const { providerProfile, checkedAt } = input;

	if (!providerProfile) {
		return {
			kind: 'speckit_sync',
			status: 'missing',
			message: 'No Positron provider profile — Spec Kit sync status unknown.',
			source: 'missing',
			evidenceRefs: [],
			blockedReasons: ['Provider profile is missing — cannot determine Spec Kit sync status'],
			checkedAt,
		};
	}

	const evidenceRefs = [`speckit-sync-${providerProfile.specKitSyncStatus}`];

	// synced with no re-sync reasons → pass
	if (isProviderProfileSynced(providerProfile)) {
		return {
			kind: 'speckit_sync',
			status: 'pass',
			message: 'Spec Kit is synced — no re-sync needed.',
			source: 'store',
			evidenceRefs,
			blockedReasons: [],
			checkedAt,
		};
	}

	// needs_resync → blocked
	if (providerProfile.specKitSyncStatus === 'needs_resync') {
		const reasons = providerProfile.reSyncReasons.length > 0
			? providerProfile.reSyncReasons
			: ['Spec Kit sync is out of date — re-sync required before pipeline'];
		return {
			kind: 'speckit_sync',
			status: 'blocked',
			message: `Spec Kit needs re-sync: ${reasons.join('; ')}`,
			source: 'store',
			evidenceRefs,
			blockedReasons: reasons,
			checkedAt,
		};
	}

	// failed / blocked
	if (providerProfile.specKitSyncStatus === 'fail' || providerProfile.specKitSyncStatus === 'blocked') {
		return {
			kind: 'speckit_sync',
			status: 'blocked',
			message: `Spec Kit sync status is '${providerProfile.specKitSyncStatus}' — pipeline blocked.`,
			source: 'store',
			evidenceRefs,
			blockedReasons: [`Spec Kit sync failed with status '${providerProfile.specKitSyncStatus}'`],
			checkedAt,
		};
	}

	// partial → may work for demo but not real
	if (providerProfile.specKitSyncStatus === 'partial') {
		return {
			kind: 'speckit_sync',
			status: 'partial',
			message: 'Spec Kit sync is partial — may work for demo but not real runs.',
			source: 'store',
			evidenceRefs,
			blockedReasons: ['Spec Kit sync is partial — real runs require fully synced state'],
			checkedAt,
		};
	}

	// not_synced or any other status
	return {
		kind: 'speckit_sync',
		status: 'not_checked',
		message: `Spec Kit sync status is '${providerProfile.specKitSyncStatus}' — not ready.`,
		source: 'store',
		evidenceRefs,
		blockedReasons: [`Spec Kit not synced (status: ${providerProfile.specKitSyncStatus})`],
		checkedAt,
	};
}

/**
 * Evaluate the MCP Warm-up gate.
 *
 * Reads MCP warm-up evidence and manifests. Determines if all required
 * MCP servers have passed warm-up. Optional MCP failures do not block
 * required readiness but appear as warnings.
 * NEVER starts MCP servers, never performs warm-up.
 */
export function evaluateMcpWarmupGate(input: {
	manifests?: McpCapabilityManifest[];
	evidence?: McpWarmupEvidence[];
	checkedAt: string;
}): InfrastructureGateResult {
	const { manifests, evidence, checkedAt } = input;

	// Missing manifests or evidence → missing
	if (!manifests || manifests.length === 0 || !evidence || evidence.length === 0) {
		return {
			kind: 'mcp_warmup',
			status: 'missing',
			message: 'MCP warm-up evidence is missing — required MCP servers have not been warmed up.',
			source: 'missing',
			evidenceRefs: [],
			blockedReasons: [
				!manifests || manifests.length === 0
					? 'No MCP capability manifests available'
					: 'No MCP warm-up evidence available',
			],
			checkedAt,
		};
	}

	const evidenceByServer = new Map(evidence.map(e => [e.serverId, e]));
	const requiredManifests = manifests.filter(m => m.requiredness === 'required');
	const optionalManifests = manifests.filter(m => m.requiredness === 'optional');

	if (requiredManifests.length === 0) {
		return {
			kind: 'mcp_warmup',
			status: 'missing',
			message: 'No required MCP servers defined in manifests.',
			source: 'config',
			evidenceRefs: [],
			blockedReasons: ['No required MCP servers configured'],
			checkedAt,
		};
	}

	// Build evidence refs (no paths, just server IDs)
	const evidenceRefs = evidence.map(e => `mcp-warmup-${e.serverId}`);

	const blockedReasons: string[] = [];
	let requiredPassCount = 0;
	let requiredFailCount = 0;
	let requiredMissingCount = 0;
	const optionalWarnings: string[] = [];

	// Check required servers
	for (const manifest of requiredManifests) {
		const ev = evidenceByServer.get(manifest.serverId);
		if (!ev) {
			requiredMissingCount++;
			blockedReasons.push(`Required MCP server '${manifest.serverId}' has no warm-up evidence`);
			continue;
		}

		if (ev.status === 'pass') {
			requiredPassCount++;
		} else if (ev.status === 'fail' || ev.status === 'blocked') {
			requiredFailCount++;
			blockedReasons.push(`Required MCP server '${manifest.serverId}' warm-up ${ev.status}`);
		} else if (ev.status === 'partial') {
			blockedReasons.push(`Required MCP server '${manifest.serverId}' warm-up is partial`);
			requiredFailCount++;
		} else {
			requiredMissingCount++;
			blockedReasons.push(`Required MCP server '${manifest.serverId}' warm-up status is '${ev.status}'`);
		}
	}

	// Check optional servers (warnings only, don't block)
	for (const manifest of optionalManifests) {
		const ev = evidenceByServer.get(manifest.serverId);
		if (ev && (ev.status === 'fail' || ev.status === 'blocked')) {
			optionalWarnings.push(`Optional MCP server '${manifest.serverId}' warm-up ${ev.status}`);
		}
	}

	// Determine status
	let status: InfrastructureGateStatus;
	let message: string;

	if (requiredFailCount > 0) {
		status = 'blocked';
		message = `${requiredFailCount} required MCP server(s) warm-up failed or blocked. Pipeline cannot proceed.`;
	} else if (requiredMissingCount > 0) {
		status = 'missing';
		message = `${requiredMissingCount} required MCP server(s) missing warm-up evidence.`;
	} else if (requiredPassCount === requiredManifests.length) {
		status = 'pass';
		message = `All ${requiredPassCount} required MCP servers passed warm-up.`;
	} else {
		status = 'not_checked';
		message = 'MCP warm-up status could not be fully determined.';
	}

	// Append optional warnings to blocked reasons (informational, not blocking)
	if (optionalWarnings.length > 0) {
		blockedReasons.push(`Warnings (non-blocking): ${optionalWarnings.join('; ')}`);
	}

	return {
		kind: 'mcp_warmup',
		status,
		message: optionalWarnings.length > 0 ? `${message} (${optionalWarnings.length} optional server warning(s))` : message,
		source: 'evidence',
		evidenceRefs,
		blockedReasons,
		checkedAt,
	};
}

/**
 * Evaluate the Tool Gateway gate.
 *
 * Reads tool gateway status snapshot. Determines if the gateway is in a
 * safe state for pipeline execution. Sealed + no unsafe runtime → pass.
 * NEVER executes tools, never enables gateway/MCP exposure.
 */
export function evaluateToolGatewayGate(input: {
	toolGatewayStatus?: {
		gatewayEnabled: boolean;
		mcpExposeEnabled: boolean;
		registeredTools: number;
		sealed: boolean;
		runtimeActive: boolean;
	};
	checkedAt: string;
}): InfrastructureGateResult {
	const { toolGatewayStatus, checkedAt } = input;

	if (!toolGatewayStatus) {
		return {
			kind: 'tool_gateway',
			status: 'missing',
			message: 'Tool Gateway status is not available.',
			source: 'missing',
			evidenceRefs: [],
			blockedReasons: ['Tool Gateway status is missing — cannot verify gateway safety'],
			checkedAt,
		};
	}

	const evidenceRefs = ['tool-gateway-status'];

	const blockedReasons: string[] = [];

	// Sealed is the primary safety indicator
	if (!toolGatewayStatus.sealed) {
		blockedReasons.push('Tool Gateway is not sealed — tool registry may be mutable');
	}

	// Runtime active without explicit context → warning
	if (toolGatewayStatus.runtimeActive) {
		// Not blocking but notable
		blockedReasons.push('Tool Gateway reports runtime as active — ensure this is intentional');
	}

	// MCP exposure enabled → safety consideration
	if (toolGatewayStatus.mcpExposeEnabled) {
		// Not blocking for PR 11, but noted
		blockedReasons.push('MCP exposure is enabled — ensure this is intentional');
	}

	// Determine status
	let status: InfrastructureGateStatus;
	let message: string;

	if (!toolGatewayStatus.sealed) {
		status = 'partial'; // Not sealed is partial — still safe for monitoring but not ideal
		message = 'Tool Gateway is not sealed. Safe for monitoring, but pipeline may require sealed state.';
	} else {
		status = 'pass';
		message = `Tool Gateway is sealed and in safe state (${toolGatewayStatus.registeredTools} registered tools).`;
	}

	// Gateway disabled is safe default
	if (!toolGatewayStatus.gatewayEnabled) {
		message += ' Gateway is disabled (safe default).';
	}

	return {
		kind: 'tool_gateway',
		status,
		message,
		source: 'store',
		evidenceRefs,
		blockedReasons,
		checkedAt,
	};
}

/**
 * Evaluate the Human Approval gate.
 *
 * Reads approval gates and determines if human approval has been granted.
 * NEVER overrides Provider/MCP/SpecKit failures.
 */
export function evaluateHumanApprovalGate(input: {
	approvalGates?: ApprovalGate[];
	humanApprovedForRealRun?: boolean;
	checkedAt: string;
}): InfrastructureGateResult {
	const { approvalGates, humanApprovedForRealRun, checkedAt } = input;

	const evidenceRefs: string[] = [];

	// No approval gates at all → missing
	if (!approvalGates || approvalGates.length === 0) {
		// If explicit flag set, use it
		if (humanApprovedForRealRun === true) {
			return {
				kind: 'human_approval',
				status: 'pass',
				message: 'Human approval flagged as granted for real run.',
				source: 'config',
				evidenceRefs,
				blockedReasons: [],
				checkedAt,
			};
		}
		return {
			kind: 'human_approval',
			status: 'missing',
			message: 'No approval gates configured — human approval status unknown.',
			source: 'missing',
			evidenceRefs: [],
			blockedReasons: ['Approval gates are missing — cannot verify human approval'],
			checkedAt,
		};
	}

	// Check each gate
	let hasDenied = false;
	let hasPending = false;
	let hasApproved = false;

	for (const gate of approvalGates) {
		evidenceRefs.push(`approval-gate-${gate.gateId}`);
		if (gate.status === 'denied' || gate.status === 'blocked') {
			hasDenied = true;
		} else if (gate.status === 'pending' || gate.status === 'required') {
			hasPending = true;
		} else if (gate.status === 'approved') {
			hasApproved = true;
		}
	}

	// Explicit flag overrides (for real run approval)
	if (humanApprovedForRealRun === true && !hasDenied) {
		return {
			kind: 'human_approval',
			status: 'pass',
			message: 'Human approval explicitly granted for real run.',
			source: 'config',
			evidenceRefs,
			blockedReasons: [],
			checkedAt,
		};
	}

	if (hasDenied) {
		return {
			kind: 'human_approval',
			status: 'blocked',
			message: 'At least one approval gate has been denied or blocked.',
			source: 'store',
			evidenceRefs,
			blockedReasons: ['Human approval was denied for one or more gates'],
			checkedAt,
		};
	}

	if (hasPending) {
		return {
			kind: 'human_approval',
			status: 'not_checked',
			message: 'Approval gates are pending — human decision required.',
			source: 'store',
			evidenceRefs,
			blockedReasons: ['One or more approval gates are pending human decision'],
			checkedAt,
		};
	}

	if (hasApproved) {
		return {
			kind: 'human_approval',
			status: 'pass',
			message: 'All relevant approval gates have been approved.',
			source: 'store',
			evidenceRefs,
			blockedReasons: [],
			checkedAt,
		};
	}

	// Fallback — gates exist but none are in a recognized active state
	return {
		kind: 'human_approval',
		status: 'not_checked',
		message: 'Approval gate status could not be determined.',
		source: 'store',
		evidenceRefs,
		blockedReasons: ['Approval gate status is ambiguous'],
		checkedAt,
	};
}

/**
 * Evaluate the Security gate.
 *
 * Reads security warnings. Blocking security warnings → blocked.
 * NEVER executes security scans or modifies configuration.
 */
export function evaluateSecurityGate(input: {
	securityWarnings?: Array<{
		severity: 'info' | 'warning' | 'high' | 'critical';
		blocked: boolean;
		message: string;
	}>;
	checkedAt: string;
}): InfrastructureGateResult {
	const { securityWarnings, checkedAt } = input;

	if (!securityWarnings || securityWarnings.length === 0) {
		return {
			kind: 'security',
			status: 'pass',
			message: 'No security warnings detected.',
			source: 'derived',
			evidenceRefs: [],
			blockedReasons: [],
			checkedAt,
		};
	}

	const blockingWarnings = securityWarnings.filter(w => w.blocked);
	const criticalWarnings = securityWarnings.filter(w => w.severity === 'critical');
	const highWarnings = securityWarnings.filter(w => w.severity === 'high');

	const blockedReasons = securityWarnings.map(w => `[${w.severity}] ${w.message}`);
	const evidenceRefs = ['security-warnings'];

	if (blockingWarnings.length > 0) {
		return {
			kind: 'security',
			status: 'blocked',
			message: `${blockingWarnings.length} blocking security warning(s) detected.`,
			source: 'derived',
			evidenceRefs,
			blockedReasons,
			checkedAt,
		};
	}

	if (criticalWarnings.length > 0) {
		return {
			kind: 'security',
			status: 'blocked',
			message: `${criticalWarnings.length} critical security warning(s) detected.`,
			source: 'derived',
			evidenceRefs,
			blockedReasons,
			checkedAt,
		};
	}

	if (highWarnings.length > 0) {
		return {
			kind: 'security',
			status: 'partial',
			message: `${highWarnings.length} high-severity security warning(s) — requires review.`,
			source: 'derived',
			evidenceRefs,
			blockedReasons,
			checkedAt,
		};
	}

	// Info/warning only — not blocking
	return {
		kind: 'security',
		status: 'pass',
		message: `${securityWarnings.length} non-blocking security warning(s) — no blockers.`,
		source: 'derived',
		evidenceRefs,
		blockedReasons,
		checkedAt,
	};
}

// ═══════════════════════════════════════════════════════════════════════════
// Aggregate Evaluator
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Evaluate ALL infrastructure gates and produce a summary.
 *
 * This is the CENTRAL aggregation function. It calls each individual gate
 * evaluator and produces an overall status.
 *
 * Rules:
 * - missing never allows readyForReal
 * - not_checked never allows readyForReal
 * - partial never allows readyForReal
 * - pass of all required gates + human approval → readyForReal
 * - readyForDemo only if no blocked/fail security/provider/MCP gates
 * - overall = blocked if ANY required gate is blocked/fail
 * - overall = missing if required gate missing and no blocked
 * - overall = not_checked if required gate not_checked
 * - overall = partial if only partial gates remain
 * - overall = pass only if ALL required gates pass
 */
export function evaluateInfrastructureGates(
	input: InfrastructureGateEvaluationInput,
): InfrastructureGateSummary {
	const { checkedAt } = input;

	// Evaluate all individual gates
	const providerGate = evaluateProviderDetectionGate({
		providerDetection: input.providerDetection,
		checkedAt,
	});

	const modelProfileGate = evaluateModelProfileGate({
		modelProfile: input.modelProfile,
		checkedAt,
	});

	const modelWarmupGate = evaluateModelWarmupGate({
		modelProfile: input.modelProfile,
		checkedAt,
	});

	const specKitGate = evaluateSpecKitSyncGate({
		providerProfile: input.providerProfile,
		checkedAt,
	});

	const mcpGate = evaluateMcpWarmupGate({
		manifests: input.mcpManifests,
		evidence: input.mcpEvidence,
		checkedAt,
	});

	const toolGatewayGate = evaluateToolGatewayGate({
		toolGatewayStatus: input.toolGatewayStatus,
		checkedAt,
	});

	const humanGate = evaluateHumanApprovalGate({
		approvalGates: input.approvalGates,
		humanApprovedForRealRun: input.humanApprovedForRealRun,
		checkedAt,
	});

	const securityGate = evaluateSecurityGate({
		securityWarnings: input.securityWarnings,
		checkedAt,
	});

	const allGates: InfrastructureGateResult[] = [
		providerGate,
		modelProfileGate,
		modelWarmupGate,
		specKitGate,
		mcpGate,
		toolGatewayGate,
		humanGate,
		securityGate,
	];

	// Collect all blocked reasons
	const allBlockedReasons: string[] = [];
	for (const gate of allGates) {
		allBlockedReasons.push(...gate.blockedReasons);
	}

	// Determine readyForDemo
	// Demo is allowed only if no blocked/fail/missing in security, provider, or MCP gates
	const gatesBlockingDemo: InfrastructureGateKind[] = [
		'provider_detection',
		'mcp_warmup',
		'security',
	];
	const demoReady = !allGates.some(
		g =>
			gatesBlockingDemo.includes(g.kind) &&
			(g.status === 'blocked' || g.status === 'fail' || g.status === 'missing'),
	);

	// Determine readyForReal
	// All gates must be 'pass' AND human approval must be explicitly passed
	const requiredGatesForReal: InfrastructureGateKind[] = [
		'provider_detection',
		'model_profile',
		'model_warmup',
		'speckit_sync',
		'mcp_warmup',
		'tool_gateway',
		'human_approval',
		'security',
	];

	const realReady =
		allGates.every(
			g => requiredGatesForReal.includes(g.kind) ? g.status === 'pass' : true,
		) && humanGate.status === 'pass';

	// Determine overall status
	let overall: InfrastructureGateStatus;

	const hasBlocked = allGates.some(g => g.status === 'blocked' || g.status === 'fail');
	const hasMissing = allGates.some(g => g.status === 'missing');
	const hasNotChecked = allGates.some(g => g.status === 'not_checked');
	const hasPartial = allGates.some(g => g.status === 'partial');
	const allPass = allGates.every(g => g.status === 'pass');

	if (hasBlocked) {
		overall = 'blocked';
	} else if (hasMissing) {
		overall = 'missing';
	} else if (hasNotChecked) {
		overall = 'not_checked';
	} else if (hasPartial) {
		overall = 'partial';
	} else if (allPass) {
		overall = 'pass';
	} else {
		overall = 'not_checked';
	}

	return {
		overall,
		gates: allGates,
		readyForDemo: demoReady,
		readyForReal: realReady,
		blockedReasons: allBlockedReasons,
		checkedAt,
	};
}

// ═══════════════════════════════════════════════════════════════════════════
// Evidence Mapping
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Evidence event types for infrastructure gate evaluation.
 */
export type InfrastructureGateEvidenceEvent =
	| 'infrastructure-gates-evaluated'
	| 'infrastructure-gates-blocked'
	| 'infrastructure-gates-missing'
	| 'infrastructure-gates-ready-for-pipeline';

/**
 * Redacted evidence record for infrastructure gate evaluation.
 * Contains NO secrets, NO private paths, NO raw config values.
 */
export interface InfrastructureGateEvidence {
	event: InfrastructureGateEvidenceEvent;
	overall: InfrastructureGateStatus;
	gateCount: number;
	passCount: number;
	blockCount: number;
	missingCount: number;
	notCheckedCount: number;
	readyForDemo: boolean;
	readyForReal: boolean;
	blockedReasons: string[];
	checkedAt: string;
}

/**
 * Build redacted evidence from an infrastructure gate summary.
 *
 * Evidence is redacted — no secrets, no private paths, no raw config.
 */
export function buildInfrastructureGateEvidence(
	summary: InfrastructureGateSummary,
): InfrastructureGateEvidence {
	let event: InfrastructureGateEvidenceEvent;
	switch (summary.overall) {
		case 'blocked':
		case 'fail':
			event = 'infrastructure-gates-blocked';
			break;
		case 'missing':
			event = 'infrastructure-gates-missing';
			break;
		case 'pass':
			event = 'infrastructure-gates-ready-for-pipeline';
			break;
		default:
			event = 'infrastructure-gates-evaluated';
	}

	const passCount = summary.gates.filter(g => g.status === 'pass').length;
	const blockCount = summary.gates.filter(
		g => g.status === 'blocked' || g.status === 'fail',
	).length;
	const missingCount = summary.gates.filter(g => g.status === 'missing').length;
	const notCheckedCount = summary.gates.filter(g => g.status === 'not_checked').length;

	// Redact blocked reasons — strip any path-like content
	const safeReasons = summary.blockedReasons.map(r =>
		r.replace(/[A-Za-z]:\\[^\s,;]+/g, '[REDACTED_PATH]')
			.replace(/\/[^\s,;]+\/[^\s,;]+/g, '[REDACTED_PATH]'),
	);

	return {
		event,
		overall: summary.overall,
		gateCount: summary.gates.length,
		passCount,
		blockCount,
		missingCount,
		notCheckedCount,
		readyForDemo: summary.readyForDemo,
		readyForReal: summary.readyForReal,
		blockedReasons: safeReasons,
		checkedAt: summary.checkedAt,
	};
}

// ═══════════════════════════════════════════════════════════════════════════
// Type Guards
// ═══════════════════════════════════════════════════════════════════════════

export function isInfrastructureGateKind(value: unknown): value is InfrastructureGateKind {
	return (
		typeof value === 'string' &&
		(ALL_INFRASTRUCTURE_GATE_KINDS as readonly string[]).includes(value)
	);
}

export function isInfrastructureGateStatus(value: unknown): value is InfrastructureGateStatus {
	return (
		typeof value === 'string' &&
		(ALL_INFRASTRUCTURE_GATE_STATUSES as readonly string[]).includes(value)
	);
}
