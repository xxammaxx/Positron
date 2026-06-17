// Positron — Blueprint Gated Pipeline Handoff
// PR 10: Blueprint Gated Pipeline Handoff
// ---------------------------------------------------------------------------
// This module defines the blueprint pipeline handoff types, gate evaluator,
// and evidence mapping. The handoff checks all safety gates but DOES NOT
// execute any runtime. ready_for_pipeline means a future executor may
// proceed — it does NOT start OpenCode, MCP, Spec Kit, install, or tools.
//
// SECURITY:
// - start-run creates a handoff only — never executes runtime
// - ready_for_pipeline does NOT start an executor
// - Missing gates block or wait
// - Evidence is redacted (no secrets, no private paths, no raw markdown)
// ---------------------------------------------------------------------------

import type { BlueprintGateStatus } from './blueprint-launcher.js';

// ─── Pipeline Handoff Status ───────────────────────────────────────────────

export type BlueprintPipelineHandoffStatus =
	| 'blocked'
	| 'waiting_for_human'
	| 'waiting_for_gates'
	| 'ready_for_pipeline'
	| 'runtime_not_implemented';

export const ALL_BLUEPRINT_PIPELINE_HANDOFF_STATUSES: readonly BlueprintPipelineHandoffStatus[] = [
	'blocked',
	'waiting_for_human',
	'waiting_for_gates',
	'ready_for_pipeline',
	'runtime_not_implemented',
];

// ─── Pipeline Gate Kinds ───────────────────────────────────────────────────

export type BlueprintPipelineGateKind =
	| 'blueprint_validation'
	| 'human_approval'
	| 'provider_profile'
	| 'model_warmup'
	| 'speckit_sync'
	| 'mcp_warmup'
	| 'tool_gateway'
	| 'security_warnings';

export const ALL_BLUEPRINT_PIPELINE_GATE_KINDS: readonly BlueprintPipelineGateKind[] = [
	'blueprint_validation',
	'human_approval',
	'provider_profile',
	'model_warmup',
	'speckit_sync',
	'mcp_warmup',
	'tool_gateway',
	'security_warnings',
];

// ─── Pipeline Gate Result ──────────────────────────────────────────────────

export type BlueprintPipelineGateResultStatus =
	| 'pass'
	| 'partial'
	| 'fail'
	| 'blocked'
	| 'not_checked';

export const ALL_PIPELINE_GATE_RESULT_STATUSES: readonly BlueprintPipelineGateResultStatus[] = [
	'pass',
	'partial',
	'fail',
	'blocked',
	'not_checked',
];

export interface BlueprintPipelineGateResult {
	kind: BlueprintPipelineGateKind;
	status: BlueprintPipelineGateResultStatus;
	message: string;
	blockedReasons: string[];
}

// ─── Pipeline Handoff ──────────────────────────────────────────────────────

export interface BlueprintPipelineHandoff {
	handoffId: string;
	blueprintId: string;
	runPlanId?: string;
	status: BlueprintPipelineHandoffStatus;
	gates: BlueprintPipelineGateResult[];
	runIntentId?: string;
	humanQuestionId?: string;
	approvalGateId?: string;
	createdAt: string;
	blockedReasons: string[];
}

// ─── Blueprint Run Intent ─────────────────────────────────────────────────

export type BlueprintRunIntentStatus =
	| 'draft'
	| 'waiting_for_gates'
	| 'waiting_for_human'
	| 'ready_for_pipeline'
	| 'blocked';

export const ALL_BLUEPRINT_RUN_INTENT_STATUSES: readonly BlueprintRunIntentStatus[] = [
	'draft',
	'waiting_for_gates',
	'waiting_for_human',
	'ready_for_pipeline',
	'blocked',
];

export interface BlueprintRunIntent {
	runIntentId: string;
	blueprintId: string;
	runPlanId: string;
	status: BlueprintRunIntentStatus;
	source: 'blueprint';
	createdAt: string;
	blockedReasons: string[];
}

// ─── Handoff Input (for evaluator) ────────────────────────────────────────

export interface EvaluateHandoffInput {
	blueprintValidationStatus: BlueprintGateStatus;
	hasHumanApproval: boolean;
	providerProfileReady: boolean;
	modelWarmupPass: boolean;
	specKitSyncPass: boolean;
	mcpWarmupPass: boolean;
	toolGatewaySafe: boolean;
	hasBlockingSecurityWarnings: boolean;
	createdAt: string;
	blueprintId: string;
	runPlanId?: string;
	humanQuestionId?: string;
	approvalGateId?: string;
}

// ─── Handoff Evidence Event ────────────────────────────────────────────────

export type BlueprintHandoffEvidenceEvent =
	| 'blueprint-handoff-requested'
	| 'blueprint-handoff-blocked'
	| 'blueprint-handoff-waiting-for-human'
	| 'blueprint-handoff-waiting-for-gates'
	| 'blueprint-handoff-ready-for-pipeline';

// ─── Handoff Evidence ──────────────────────────────────────────────────────

export interface BlueprintHandoffEvidence {
	event: BlueprintHandoffEvidenceEvent;
	handoffId: string;
	blueprintId: string;
	runPlanId?: string;
	status: BlueprintPipelineHandoffStatus;
	gateCount: number;
	passCount: number;
	blockCount: number;
	notCheckedCount: number;
	blockedReasons: string[];
	createdAt: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// Gate Evaluator
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Generate a short handoff ID.
 */
export function createHandoffId(): string {
	const prefix = 'handoff';
	const ts = Date.now().toString(36);
	const random = Math.random().toString(36).slice(2, 8);
	return `${prefix}-${ts}-${random}`;
}

/**
 * Evaluate all pipeline gates and produce a BlueprintPipelineHandoff.
 *
 * This is the CENTRAL gate evaluator — it is a PURE function.
 * It does not execute anything. It only checks gate states and
 * produces a status + evidence.
 *
 * Gate Rules:
 * - blueprintValidation must be 'pass' → otherwise blocked or waiting_for_human
 * - hasHumanApproval must be true → otherwise waiting_for_human
 * - All other gates (provider, model, specKit, mcp, toolGateway) must pass → waiting_for_gates
 * - hasBlockingSecurityWarnings → blocked
 * - Only ALL gates pass → ready_for_pipeline (but NO runtime execution)
 */
export function evaluateBlueprintPipelineHandoff(
	input: EvaluateHandoffInput,
): BlueprintPipelineHandoff {
	const handoffId = createHandoffId();
	const gates: BlueprintPipelineGateResult[] = [];
	const allBlockedReasons: string[] = [];

	// Helper to create a gate result from BlueprintGateStatus
	const toPipelineStatus = (bs: BlueprintGateStatus): BlueprintPipelineGateResultStatus => {
		if (bs === 'not_checked') return 'not_checked';
		if (bs === 'pass') return 'pass';
		if (bs === 'partial') return 'partial';
		if (bs === 'fail') return 'fail';
		if (bs === 'blocked') return 'blocked';
		return 'not_checked';
	};

	// ── Gate 1: Blueprint Validation ─────────────────────────────────────────
	{
		const status = toPipelineStatus(input.blueprintValidationStatus);
		const reasons: string[] = [];
		if (status !== 'pass') {
			reasons.push(`Blueprint validation status is '${status}' — must be 'pass'`);
		}
		gates.push({
			kind: 'blueprint_validation',
			status,
			message:
				status === 'pass'
					? 'Blueprint validation passed — no structural or content issues'
					: `Blueprint validation not passed (${status})`,
			blockedReasons: reasons,
		});
		if (reasons.length > 0) allBlockedReasons.push(...reasons);
	}

	// ── Gate 2: Human Approval ───────────────────────────────────────────────
	{
		const status: BlueprintPipelineGateResultStatus = input.hasHumanApproval
			? 'pass'
			: 'not_checked';
		const reasons: string[] = [];
		if (!input.hasHumanApproval) {
			reasons.push('Human approval has not been granted');
		}
		gates.push({
			kind: 'human_approval',
			status,
			message: input.hasHumanApproval
				? 'Human approval granted'
				: 'Human approval is required before pipeline handoff',
			blockedReasons: reasons,
		});
		if (reasons.length > 0) allBlockedReasons.push(...reasons);
	}

	// ── Gate 3: Provider Profile ─────────────────────────────────────────────
	{
		const status: BlueprintPipelineGateResultStatus = input.providerProfileReady
			? 'pass'
			: 'not_checked';
		const reasons: string[] = [];
		if (!input.providerProfileReady) {
			reasons.push('Provider profile is not ready');
		}
		gates.push({
			kind: 'provider_profile',
			status,
			message: input.providerProfileReady
				? 'Provider profile is ready'
				: 'Provider profile readiness not confirmed',
			blockedReasons: reasons,
		});
		if (reasons.length > 0) allBlockedReasons.push(...reasons);
	}

	// ── Gate 4: Model Warm-up ────────────────────────────────────────────────
	{
		const status: BlueprintPipelineGateResultStatus = input.modelWarmupPass
			? 'pass'
			: 'not_checked';
		const reasons: string[] = [];
		if (!input.modelWarmupPass) {
			reasons.push('Model warm-up has not passed');
		}
		gates.push({
			kind: 'model_warmup',
			status,
			message: input.modelWarmupPass
				? 'Model warm-up passed'
				: 'Model warm-up not completed or failed',
			blockedReasons: reasons,
		});
		if (reasons.length > 0) allBlockedReasons.push(...reasons);
	}

	// ── Gate 5: Spec Kit Sync ────────────────────────────────────────────────
	{
		const status: BlueprintPipelineGateResultStatus = input.specKitSyncPass
			? 'pass'
			: 'not_checked';
		const reasons: string[] = [];
		if (!input.specKitSyncPass) {
			reasons.push('Spec Kit sync has not passed');
		}
		gates.push({
			kind: 'speckit_sync',
			status,
			message: input.specKitSyncPass
				? 'Spec Kit sync passed'
				: 'Spec Kit sync not completed or failed',
			blockedReasons: reasons,
		});
		if (reasons.length > 0) allBlockedReasons.push(...reasons);
	}

	// ── Gate 6: MCP Warm-up ─────────────────────────────────────────────────
	{
		const status: BlueprintPipelineGateResultStatus = input.mcpWarmupPass ? 'pass' : 'not_checked';
		const reasons: string[] = [];
		if (!input.mcpWarmupPass) {
			reasons.push('MCP warm-up has not passed');
		}
		gates.push({
			kind: 'mcp_warmup',
			status,
			message: input.mcpWarmupPass ? 'MCP warm-up passed' : 'MCP warm-up not completed or failed',
			blockedReasons: reasons,
		});
		if (reasons.length > 0) allBlockedReasons.push(...reasons);
	}

	// ── Gate 7: Tool Gateway ─────────────────────────────────────────────────
	{
		const status: BlueprintPipelineGateResultStatus = input.toolGatewaySafe
			? 'pass'
			: 'not_checked';
		const reasons: string[] = [];
		if (!input.toolGatewaySafe) {
			reasons.push('Tool Gateway is not in a safe state');
		}
		gates.push({
			kind: 'tool_gateway',
			status,
			message: input.toolGatewaySafe
				? 'Tool Gateway is in safe state'
				: 'Tool Gateway safety state not confirmed',
			blockedReasons: reasons,
		});
		if (reasons.length > 0) allBlockedReasons.push(...reasons);
	}

	// ── Gate 8: Security Warnings ────────────────────────────────────────────
	{
		const status: BlueprintPipelineGateResultStatus = input.hasBlockingSecurityWarnings
			? 'blocked'
			: 'pass';
		const reasons: string[] = [];
		if (input.hasBlockingSecurityWarnings) {
			reasons.push('Blocking security warnings detected in blueprint');
		}
		gates.push({
			kind: 'security_warnings',
			status,
			message: input.hasBlockingSecurityWarnings
				? 'Blocking security warnings prevent handoff'
				: 'No blocking security warnings',
			blockedReasons: reasons,
		});
		if (reasons.length > 0) allBlockedReasons.push(...reasons);
	}

	// ── Compute Overall Status ──────────────────────────────────────────────
	let status: BlueprintPipelineHandoffStatus;

	// Rule 1: Blocking security warnings → blocked
	if (input.hasBlockingSecurityWarnings) {
		status = 'blocked';
	}
	// Rule 2: Blueprint validation not pass → blocked or waiting_for_human
	else if (input.blueprintValidationStatus !== 'pass') {
		// If validation is 'blocked' → hard blocked
		// If 'fail' or 'partial' → waiting_for_human (needs human to decide)
		if (input.blueprintValidationStatus === 'blocked') {
			status = 'blocked';
		} else {
			status = 'waiting_for_human';
		}
	}
	// Rule 3: No human approval → waiting_for_human
	else if (!input.hasHumanApproval) {
		status = 'waiting_for_human';
	}
	// Rule 4: Any infrastructure gate not ready → waiting_for_gates
	else if (
		!input.providerProfileReady ||
		!input.modelWarmupPass ||
		!input.specKitSyncPass ||
		!input.mcpWarmupPass ||
		!input.toolGatewaySafe
	) {
		status = 'waiting_for_gates';
	}
	// Rule 5: All gates pass → ready_for_pipeline (but NO runtime execution)
	else {
		status = 'ready_for_pipeline';
	}

	return {
		handoffId,
		blueprintId: input.blueprintId,
		runPlanId: input.runPlanId,
		status,
		gates,
		humanQuestionId: input.humanQuestionId,
		approvalGateId: input.approvalGateId,
		createdAt: input.createdAt,
		blockedReasons: allBlockedReasons,
	};
}

// ═══════════════════════════════════════════════════════════════════════════
// Evidence Mapping
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Map a BlueprintPipelineHandoff to a redacted evidence record.
 * Contains NO secrets, NO private paths, NO raw markdown.
 */
export function buildHandoffEvidence(handoff: BlueprintPipelineHandoff): BlueprintHandoffEvidence {
	const event: BlueprintHandoffEvidenceEvent = (() => {
		switch (handoff.status) {
			case 'blocked':
				return 'blueprint-handoff-blocked';
			case 'waiting_for_human':
				return 'blueprint-handoff-waiting-for-human';
			case 'waiting_for_gates':
				return 'blueprint-handoff-waiting-for-gates';
			case 'ready_for_pipeline':
				return 'blueprint-handoff-ready-for-pipeline';
			case 'runtime_not_implemented':
				return 'blueprint-handoff-blocked';
			default:
				return 'blueprint-handoff-requested';
		}
	})();

	const passCount = handoff.gates.filter((g) => g.status === 'pass').length;
	const blockCount = handoff.gates.filter(
		(g) => g.status === 'blocked' || g.status === 'fail',
	).length;
	const notCheckedCount = handoff.gates.filter((g) => g.status === 'not_checked').length;

	return {
		event,
		handoffId: handoff.handoffId,
		blueprintId: handoff.blueprintId,
		runPlanId: handoff.runPlanId,
		status: handoff.status,
		gateCount: handoff.gates.length,
		passCount,
		blockCount,
		notCheckedCount,
		blockedReasons: handoff.blockedReasons.map((r) =>
			// Redact filesystem paths instead of silently dropping the entire reason.
			// Paths like /home/user, C:\Users, /etc/passwd are replaced with [path-redacted]
			// to preserve the semantic meaning of the blocked reason in evidence.
			r.replace(/\/[a-zA-Z0-9._\-/]+/g, '/[path-redacted]')
			 .replace(/[A-Z]:\\[a-zA-Z0-9._\-\\]+/g, '[path-redacted]'),
		),
		createdAt: handoff.createdAt,
	};
}

/**
 * Create a BlueprintRunIntent from a handoff.
 * The run intent is a record that a run was requested — NOT execution.
 */
export function createRunIntent(
	blueprintId: string,
	runPlanId: string,
	handoffStatus: BlueprintPipelineHandoffStatus,
): BlueprintRunIntent {
	const runIntentId = `intent-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

	let status: BlueprintRunIntentStatus;
	switch (handoffStatus) {
		case 'blocked':
			status = 'blocked';
			break;
		case 'waiting_for_human':
			status = 'waiting_for_human';
			break;
		case 'waiting_for_gates':
			status = 'waiting_for_gates';
			break;
		case 'ready_for_pipeline':
			status = 'ready_for_pipeline';
			break;
		default:
			status = 'draft';
	}

	return {
		runIntentId,
		blueprintId,
		runPlanId,
		status,
		source: 'blueprint',
		createdAt: new Date().toISOString(),
		blockedReasons: [],
	};
}

// ─── Type Guards ───────────────────────────────────────────────────────────

export function isBlueprintPipelineHandoffStatus(
	value: unknown,
): value is BlueprintPipelineHandoffStatus {
	return (
		typeof value === 'string' &&
		(ALL_BLUEPRINT_PIPELINE_HANDOFF_STATUSES as readonly string[]).includes(value)
	);
}

export function isBlueprintPipelineGateKind(value: unknown): value is BlueprintPipelineGateKind {
	return (
		typeof value === 'string' &&
		(ALL_BLUEPRINT_PIPELINE_GATE_KINDS as readonly string[]).includes(value)
	);
}

export function isBlueprintPipelineGateResultStatus(
	value: unknown,
): value is BlueprintPipelineGateResultStatus {
	return (
		typeof value === 'string' &&
		(ALL_PIPELINE_GATE_RESULT_STATUSES as readonly string[]).includes(value)
	);
}
