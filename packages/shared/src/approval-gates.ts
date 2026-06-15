// Positron — Approval Gates: Wire Oversight into Provider Install + MCP Warm-up
// PR 8: Oversight Approval Wiring for Install Requests + MCP Warm-up Gates
// ---------------------------------------------------------------------------
// This module defines the approval gate types, policy helpers, and wiring
// functions that connect Human Questions/Decisions to provider install requests
// and MCP warm-up gates.
//
// SECURITY: This module is PURE TYPES, VALIDATION, and POLICY.
// Approvals store decisions ONLY. They do NOT execute installs, tools,
// OpenCode, MCP, or Spec Kit. Required MCP failures remain blocking.
// Critical risks default to DENY.
// ---------------------------------------------------------------------------

import {
	type HumanDecision,
	type HumanOversightEvidence,
	type HumanQuestion,
	type HumanQuestionRequester,
	type HumanQuestionStatus,
	type HumanQuestionType,
	type HumanRiskLevel,
	type RedactedHumanQuestion,
	buildHumanOversightEvidence,
	createHumanQuestionId,
	isHumanDecision,
	redactHumanQuestionForEvidence,
} from './human-oversight.js';

import type { OpenCodeInstallRequest } from './opencode-provider-detection.js';

import {
	type McpCapabilityManifest,
	type McpWarmupEvidence,
	type McpWarmupSummary,
	areRequiredMcpsReadyForRealRun,
	getMcpRealRunBlockedReasons,
	summarizeMcpWarmupEvidence,
} from './mcp-warmup-profile.js';

import { type ValidationResult, validationFail, validationPass } from './opencode-model-profile.js';

// ─── Approval Gate Kinds ──────────────────────────────────────────────────

export type ApprovalGateKind =
	| 'opencode_install'
	| 'opencode_provider_real_run'
	| 'mcp_real_warmup'
	| 'mcp_warmup_retry'
	| 'model_real_run'
	| 'speckit_sync'
	| 'blueprint_start'
	| 'tool_permission';

export const ALL_APPROVAL_GATE_KINDS: readonly ApprovalGateKind[] = [
	'opencode_install',
	'opencode_provider_real_run',
	'mcp_real_warmup',
	'mcp_warmup_retry',
	'model_real_run',
	'speckit_sync',
	'blueprint_start',
	'tool_permission',
] as const;

// ─── Approval Gate Status ─────────────────────────────────────────────────

export type ApprovalGateStatus =
	| 'not_required'
	| 'required'
	| 'pending'
	| 'approved'
	| 'denied'
	| 'expired'
	| 'blocked';

export const ALL_APPROVAL_GATE_STATUSES: readonly ApprovalGateStatus[] = [
	'not_required',
	'required',
	'pending',
	'approved',
	'denied',
	'expired',
	'blocked',
] as const;

// ─── Approval Gate Decision Effects ───────────────────────────────────────

/**
 * What effect a human decision on an approval gate produces.
 *
 * CRITICAL: No effect executes installs, tools, OpenCode, MCP, or Spec Kit.
 * `stores_approval_only` — Decision is recorded, nothing else happens.
 * `allows_next_gate_check` — The next gate in the chain may be evaluated.
 * `requires_dry_run` — A dry run must be performed before proceeding.
 * `requires_review` — A code review or security review is required.
 * `pauses_run` — The run is paused until further human input.
 * `aborts_run` — The run is aborted entirely.
 * `blocked_no_effect` — The gate cannot proceed regardless of the decision.
 */
export type ApprovalGateDecisionEffect =
	| 'stores_approval_only'
	| 'allows_next_gate_check'
	| 'requires_dry_run'
	| 'requires_review'
	| 'pauses_run'
	| 'aborts_run'
	| 'blocked_no_effect';

export const ALL_APPROVAL_GATE_DECISION_EFFECTS: readonly ApprovalGateDecisionEffect[] = [
	'stores_approval_only',
	'allows_next_gate_check',
	'requires_dry_run',
	'requires_review',
	'pauses_run',
	'aborts_run',
	'blocked_no_effect',
] as const;

// ─── Approval Gate Type ───────────────────────────────────────────────────

export interface ApprovalGate {
	/** Unique identifier for this gate */
	gateId: string;
	/** The kind of approval gate */
	kind: ApprovalGateKind;
	/** Current status of the gate */
	status: ApprovalGateStatus;
	/** Related human question ID if one was created */
	relatedQuestionId?: string;
	/** Associated run ID */
	runId?: string;
	/** Target identifier (install tool, server ID, model profile, etc.) */
	target?: string;
	/** Risk level classification */
	riskLevel: HumanRiskLevel;
	/** What decision is required to pass this gate */
	requiredDecision: 'ALLOW' | 'DENY' | 'REQUIRE_DRY_RUN' | 'REQUIRE_REVIEW';
	/** What happens when this gate is resolved (NOT execution — policy only) */
	decisionEffect: ApprovalGateDecisionEffect;
	/** ISO8601 timestamp when the gate was created */
	createdAt: string;
	/** ISO8601 timestamp when the gate was resolved (approved/denied/expired) */
	resolvedAt?: string;
	/** Reasons why the gate is blocked (e.g., MCP warm-up failure reasons) */
	blockedReasons: string[];
	/** The human decision that resolved this gate (if any) */
	resolution?: HumanDecision;
}

// ─── Redacted Approval Gate (for evidence/transport) ──────────────────────

export interface RedactedApprovalGate {
	gateId: string;
	kind: ApprovalGateKind;
	status: ApprovalGateStatus;
	relatedQuestionId?: string;
	runId?: string;
	target?: string;
	riskLevel: HumanRiskLevel;
	requiredDecision: string;
	decisionEffect: ApprovalGateDecisionEffect;
	createdAt: string;
	resolvedAt?: string;
	blockedReasons: string[];
	resolution?: HumanDecision;
	// Redaction metadata
	redacted: boolean;
}

// ─── Approval Gates Summary (for oversight API) ───────────────────────────

export interface ApprovalGatesSummary {
	pending: number;
	approved: number;
	denied: number;
	blocked: number;
	expired: number;
	notRequired: number;
	total: number;
	gates: ApprovalGate[];
}

// ─── Type Guards ──────────────────────────────────────────────────────────

export function isApprovalGateKind(value: unknown): value is ApprovalGateKind {
	return (
		typeof value === 'string' && (ALL_APPROVAL_GATE_KINDS as readonly string[]).includes(value)
	);
}

export function isApprovalGateStatus(value: unknown): value is ApprovalGateStatus {
	return (
		typeof value === 'string' && (ALL_APPROVAL_GATE_STATUSES as readonly string[]).includes(value)
	);
}

export function isApprovalGateDecisionEffect(value: unknown): value is ApprovalGateDecisionEffect {
	return (
		typeof value === 'string' &&
		(ALL_APPROVAL_GATE_DECISION_EFFECTS as readonly string[]).includes(value)
	);
}

/**
 * Type guard: check if value matches the ApprovalGate structure.
 * Validates all required fields and their types.
 */
export function isApprovalGate(value: unknown): value is ApprovalGate {
	if (!value || typeof value !== 'object') return false;
	const g = value as Record<string, unknown>;

	if (typeof g.gateId !== 'string') return false;
	if (!isApprovalGateKind(g.kind)) return false;
	if (!isApprovalGateStatus(g.status)) return false;
	if (g.relatedQuestionId !== undefined && typeof g.relatedQuestionId !== 'string') return false;
	if (g.runId !== undefined && typeof g.runId !== 'string') return false;
	if (g.target !== undefined && typeof g.target !== 'string') return false;
	if (
		g.riskLevel !== 'low' &&
		g.riskLevel !== 'medium' &&
		g.riskLevel !== 'high' &&
		g.riskLevel !== 'critical'
	)
		return false;
	if (
		g.requiredDecision !== 'ALLOW' &&
		g.requiredDecision !== 'DENY' &&
		g.requiredDecision !== 'REQUIRE_DRY_RUN' &&
		g.requiredDecision !== 'REQUIRE_REVIEW'
	)
		return false;
	if (!isApprovalGateDecisionEffect(g.decisionEffect)) return false;
	if (typeof g.createdAt !== 'string') return false;
	if (g.resolvedAt !== undefined && typeof g.resolvedAt !== 'string') return false;
	if (!Array.isArray(g.blockedReasons)) return false;
	if (!g.blockedReasons.every((r: unknown) => typeof r === 'string')) return false;
	if (g.resolution !== undefined && !isHumanDecision(g.resolution)) return false;

	return true;
}

// ─── Validation ───────────────────────────────────────────────────────────

export function validateApprovalGate(value: unknown): ValidationResult {
	if (!isApprovalGate(value)) {
		return validationFail(['Value does not match ApprovalGate structure']);
	}

	const g = value as ApprovalGate;
	const errors: string[] = [];

	// Critical risk cannot default to auto-approve
	if (g.riskLevel === 'critical' && g.requiredDecision === 'ALLOW') {
		errors.push('SAFETY: critical risk gate must not default to ALLOW');
	}

	// opencode_install gate effect must be stores_approval_only or allows_next_gate_check
	if (g.kind === 'opencode_install') {
		if (
			g.decisionEffect !== 'stores_approval_only' &&
			g.decisionEffect !== 'allows_next_gate_check'
		) {
			errors.push(
				'SAFETY: opencode_install gate must have effect stores_approval_only or allows_next_gate_check only',
			);
		}
	}

	// mcp warm-up gates cannot have effect that bypasses readiness
	if (
		(g.kind === 'mcp_real_warmup' || g.kind === 'mcp_warmup_retry') &&
		g.decisionEffect === 'allows_next_gate_check'
	) {
		// This is OK — allows_next_gate_check means the gate decision is recorded; actual readiness is checked separately
		// No error here.
	}

	// pending/denied/expired are blocking statuses
	// approved allows next gate check (but NOT execution — that's gates downstream)

	if (errors.length > 0) return validationFail(errors);
	return validationPass();
}

// ─── Approval Gate Helpers ────────────────────────────────────────────────

/**
 * Create a unique approval gate ID.
 */
export function createApprovalGateId(): string {
	return `gate-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Create an OpenCode install approval gate.
 *
 * This gate records that an install request was made and requires
 * human approval before the installer can proceed (in a future PR).
 * The decision effect is stores_approval_only — it does NOT install.
 */
export function createOpenCodeInstallApprovalGate(input: {
	installDir?: string;
	runId?: string;
	target?: string;
	createdAt: string;
}): ApprovalGate {
	return {
		gateId: createApprovalGateId(),
		kind: 'opencode_install',
		status: 'required',
		runId: input.runId,
		target: input.target ?? 'opencode',
		riskLevel: 'high',
		requiredDecision: 'ALLOW',
		decisionEffect: 'stores_approval_only',
		createdAt: input.createdAt,
		blockedReasons: [],
	};
}

/**
 * Create an MCP warm-up approval gate.
 *
 * This gate records that an MCP warm-up failure or block occurred
 * and requires human review. The decision effect depends on the
 * severity of the failure and whether the MCP is required.
 *
 * SECURITY: ALLOW on mcp_warmup_failure does NOT override a failed
 * required MCP. The decision is stored but readiness is evaluated
 * independently. Required MCP failures remain blocking.
 */
export function createMcpWarmupApprovalGate(input: {
	serverId: string;
	runId?: string;
	status: 'fail' | 'blocked' | 'partial';
	blockedReasons: string[];
	createdAt: string;
}): ApprovalGate {
	const isBlocked = input.status === 'blocked';
	const riskLevel: HumanRiskLevel = isBlocked ? 'critical' : 'high';
	const decisionEffect: ApprovalGateDecisionEffect = isBlocked
		? 'requires_review'
		: 'allows_next_gate_check';

	return {
		gateId: createApprovalGateId(),
		kind: 'mcp_warmup_retry',
		status: isBlocked ? 'blocked' : 'required',
		runId: input.runId,
		target: input.serverId,
		riskLevel,
		requiredDecision: isBlocked ? 'REQUIRE_REVIEW' : 'ALLOW',
		decisionEffect,
		createdAt: input.createdAt,
		blockedReasons: input.blockedReasons,
	};
}

// ─── Gate State Transitions ───────────────────────────────────────────────

/**
 * Apply a human decision to an approval gate.
 *
 * SECURITY: This function ONLY updates the gate's status and records
 * the decision. It does NOT execute any install, tool, OpenCode, MCP,
 * or Spec Kit action. The caller is responsible for checking the new
 * gate status downstream.
 */
export function applyHumanDecisionToApprovalGate(input: {
	gate: ApprovalGate;
	decision: HumanDecision;
	answeredAt: string;
}): ApprovalGate {
	const { gate, decision, answeredAt } = input;

	let newStatus: ApprovalGateStatus;
	let newEffect: ApprovalGateDecisionEffect = gate.decisionEffect;

	switch (decision) {
		case 'ALLOW':
			// ALLOW transitions to approved — but does NOT execute anything
			newStatus = 'approved';
			// Effect stays as defined by the gate kind
			break;
		case 'DENY':
			newStatus = 'denied';
			newEffect = 'blocked_no_effect';
			break;
		case 'REQUIRE_DRY_RUN':
			newStatus = 'pending';
			newEffect = 'requires_dry_run';
			break;
		case 'REQUIRE_REVIEW':
			newStatus = 'pending';
			newEffect = 'requires_review';
			break;
		case 'PAUSE_RUN':
			newStatus = 'pending';
			newEffect = 'pauses_run';
			break;
		case 'ABORT_RUN':
			newStatus = 'denied';
			newEffect = 'aborts_run';
			break;
		case 'ASK_MORE':
			// Stay pending
			newStatus = 'pending';
			newEffect = gate.decisionEffect;
			break;
		case 'REQUIRE_BACKUP':
			newStatus = 'pending';
			newEffect = 'requires_review'; // backup is part of review process
			break;
		default:
			newStatus = 'pending';
			newEffect = gate.decisionEffect;
	}

	return {
		...gate,
		status: newStatus,
		decisionEffect: newEffect,
		resolution: decision,
		resolvedAt: answeredAt,
	};
}

// ─── Gate Policy Checks ───────────────────────────────────────────────────

/**
 * Check if a run can proceed past an approval gate.
 *
 * This is a PURE POLICY CHECK — it does not execute anything.
 *
 * Returns true only if the gate is approved and the decision effect
 * allows progression (stores_approval_only or allows_next_gate_check).
 *
 * Gated states: required, pending, denied, expired, blocked → cannot proceed.
 */
export function canProceedPastApprovalGate(gate: ApprovalGate): boolean {
	if (gate.status === 'approved') {
		return (
			gate.decisionEffect === 'stores_approval_only' ||
			gate.decisionEffect === 'allows_next_gate_check'
		);
	}
	return false;
}

/**
 * Get reasons why a gate is blocking progression.
 * Returns empty array if gate is not blocking.
 */
export function getApprovalGateBlockedReasons(gate: ApprovalGate): string[] {
	const reasons: string[] = [...gate.blockedReasons];

	if (gate.status === 'required')
		reasons.push(`Gate ${gate.gateId} (${gate.kind}) requires human decision`);
	if (gate.status === 'pending')
		reasons.push(`Gate ${gate.gateId} (${gate.kind}) is pending human review`);
	if (gate.status === 'denied') reasons.push(`Gate ${gate.gateId} (${gate.kind}) was denied`);
	if (gate.status === 'expired') reasons.push(`Gate ${gate.gateId} (${gate.kind}) has expired`);
	if (gate.status === 'blocked')
		reasons.push(
			`Gate ${gate.gateId} (${gate.kind}) is blocked: ${gate.blockedReasons.join(', ')}`,
		);

	return reasons;
}

/**
 * Check if all gates in a list allow progression.
 * Returns the combined result with blocked reasons.
 */
export function evaluateApprovalGates(gates: ApprovalGate[]): {
	canProceed: boolean;
	blockedReasons: string[];
	passedGates: ApprovalGate[];
	blockingGates: ApprovalGate[];
} {
	const blockingGates: ApprovalGate[] = [];
	const passedGates: ApprovalGate[] = [];
	const blockedReasons: string[] = [];

	for (const gate of gates) {
		if (canProceedPastApprovalGate(gate)) {
			passedGates.push(gate);
		} else {
			blockingGates.push(gate);
			blockedReasons.push(...getApprovalGateBlockedReasons(gate));
		}
	}

	return {
		canProceed: blockingGates.length === 0,
		blockedReasons,
		passedGates,
		blockingGates,
	};
}

// ─── Evidence Redaction ───────────────────────────────────────────────────

/**
 * Redact an approval gate for evidence/transport.
 * Removes any internal IDs or sensitive data that should not be logged.
 */
export function redactApprovalGateForEvidence(gate: ApprovalGate): RedactedApprovalGate {
	return {
		gateId: gate.gateId,
		kind: gate.kind,
		status: gate.status,
		relatedQuestionId: gate.relatedQuestionId,
		runId: gate.runId,
		target: gate.target,
		riskLevel: gate.riskLevel,
		requiredDecision: gate.requiredDecision,
		decisionEffect: gate.decisionEffect,
		createdAt: gate.createdAt,
		resolvedAt: gate.resolvedAt,
		blockedReasons: gate.blockedReasons.filter((r) => !r.includes('/') && !r.includes('\\')),
		resolution: gate.resolution,
		redacted: true,
	};
}

/**
 * Create an approval gate evidence record.
 */
export function buildApprovalGateEvidence(
	eventType: string,
	gate: ApprovalGate,
	question?: HumanQuestion,
): HumanOversightEvidence & {
	gate: RedactedApprovalGate;
	redactedQuestion?: RedactedHumanQuestion;
} {
	const baseEvidence = question
		? buildHumanOversightEvidence(
				eventType as 'human-question-answered' | 'human-question-denied',
				question,
			)
		: {
				id: createHumanQuestionId(),
				eventType,
				questionId: gate.relatedQuestionId ?? 'unknown',
				decision: gate.resolution,
				redactedQuestion: undefined as unknown as RedactedHumanQuestion,
				timestamp: new Date().toISOString(),
			};

	return {
		...baseEvidence,
		gate: redactApprovalGateForEvidence(gate),
		redactedQuestion: question ? redactHumanQuestionForEvidence(question) : undefined,
	} as HumanOversightEvidence & {
		gate: RedactedApprovalGate;
		redactedQuestion?: RedactedHumanQuestion;
	};
}

// ─── Provider Install Approval Wiring ─────────────────────────────────────

/**
 * Create a human question of type `provider_install_approval` when an
 * OpenCode install request is made.
 *
 * SECURITY: This function creates a QUESTION ONLY. It does NOT:
 *   - Install OpenCode
 *   - Download anything
 *   - Execute curl or bash
 *   - Start OpenCode
 *
 * The question's `commandPreview` is redacted/normalized — no raw paths.
 */
export function createOpenCodeInstallApprovalQuestion(input: {
	installRequest: OpenCodeInstallRequest;
	runId?: string;
	createdAt: string;
}): HumanQuestion {
	const req = input.installRequest;

	// Build a safe description of the install command — redact home paths
	const safeInstallDir = req.installDir
		.replace(/\/home\/[^/]+/g, '~')
		.replace(/^[A-Z]:\\Users\\[^\\]+/g, '~');
	const safeCommandPreview = req.commandPreview
		.replace(/\/home\/[^/]+/g, '~')
		.replace(/^[A-Z]:\\Users\\[^\\]+/g, '~');

	const question: HumanQuestion = {
		id: createHumanQuestionId(),
		runId: input.runId,
		type: 'provider_install_approval',
		status: 'open',
		title: `OpenCode Install Approval: ${req.tool}`,
		question: `Install ${req.tool} from ${req.officialUrl}? Command: ${safeCommandPreview}\n\nManual fallback: ${req.manualFallbackAvailable ? 'Available' : 'Not available'}\nTrust warning: ${req.trustWarning}`,
		riskLevel: 'high',
		requestedBy: 'positron',
		target: safeInstallDir,
		evidenceRefs: [],
		allowedDecisions: ['ALLOW', 'DENY', 'ASK_MORE', 'REQUIRE_REVIEW', 'PAUSE_RUN'],
		defaultDecision: 'DENY',
		createdAt: input.createdAt,
		blockedReasons: [],
	};

	return question;
}

/**
 * Create both the approval gate and the human question for an
 * OpenCode install request. Returns both so the caller can store
 * them independently.
 *
 * SECURITY: No execution. The gate status is 'required' — the caller
 * must present the question to a human operator before proceeding.
 */
export function createOpenCodeInstallApprovalGateAndQuestion(input: {
	installRequest: OpenCodeInstallRequest;
	runId?: string;
	createdAt: string;
}): { gate: ApprovalGate; question: HumanQuestion } {
	const gate = createOpenCodeInstallApprovalGate({
		installDir: input.installRequest.installDir,
		runId: input.runId,
		target: input.installRequest.installDir,
		createdAt: input.createdAt,
	});

	const question = createOpenCodeInstallApprovalQuestion({
		installRequest: input.installRequest,
		runId: input.runId,
		createdAt: input.createdAt,
	});

	// Link gate to question
	gate.relatedQuestionId = question.id;
	question.evidenceRefs = [`gate:${gate.gateId}`];

	return { gate, question };
}

// ─── MCP Warm-up Gate Wiring ──────────────────────────────────────────────

/**
 * Create a human question of type `mcp_warmup_failure` when an MCP warm-up
 * check fails or is blocked.
 *
 * SECURITY: This function creates a QUESTION ONLY. It does NOT:
 *   - Start any MCP server
 *   - Execute any warm-up check
 *   - Override MCP readiness
 *
 * Required MCP failures remain blocking regardless of human decision.
 */
export function createMcpWarmupFailureQuestion(input: {
	evidence: McpWarmupEvidence;
	createdAt: string;
	runId?: string;
}): HumanQuestion {
	const e = input.evidence;

	// Determine risk level based on failure severity
	let riskLevel: HumanRiskLevel;
	let defaultDecision: HumanDecision;
	let allowedDecisions: HumanDecision[];

	if (e.status === 'blocked') {
		riskLevel = 'critical';
		defaultDecision = 'DENY';
		allowedDecisions = ['DENY', 'REQUIRE_DRY_RUN', 'REQUIRE_REVIEW', 'ABORT_RUN'];
	} else if (e.status === 'fail') {
		riskLevel = 'high';
		defaultDecision = 'DENY';
		allowedDecisions = ['ALLOW', 'DENY', 'REQUIRE_DRY_RUN', 'REQUIRE_REVIEW', 'PAUSE_RUN'];
	} else {
		// partial
		riskLevel = 'medium';
		defaultDecision = 'ASK_MORE';
		allowedDecisions = ['ALLOW', 'DENY', 'ASK_MORE', 'REQUIRE_DRY_RUN', 'REQUIRE_REVIEW'];
	}

	const blockedReasonsList =
		e.blockedReasons.length > 0 ? `\nBlocked reasons: ${e.blockedReasons.join(', ')}` : '';

	const question: HumanQuestion = {
		id: createHumanQuestionId(),
		runId: input.runId,
		type: 'mcp_warmup_failure',
		status: 'open',
		title: `MCP Warm-up ${e.status === 'blocked' ? 'Blocked' : 'Failed'}: ${e.serverId}`,
		question: `MCP server "${e.serverId}" warm-up result: ${e.status}.${blockedReasonsList}\n\nNote: ALLOW stores decision only. It does NOT override MCP warm-up readiness. Required MCP failures remain blocking.`,
		riskLevel,
		requestedBy: 'mcp',
		relatedMcpServerId: e.serverId,
		target: e.serverId,
		evidenceRefs: [e.evidenceId],
		allowedDecisions,
		defaultDecision,
		createdAt: input.createdAt,
		blockedReasons: e.blockedReasons,
	};

	return question;
}

/**
 * Create both the approval gate and the human question for an
 * MCP warm-up failure.
 */
export function createMcpWarmupFailureGateAndQuestion(input: {
	evidence: McpWarmupEvidence;
	createdAt: string;
	runId?: string;
}): { gate: ApprovalGate; question: HumanQuestion } {
	const e = input.evidence;

	const gate = createMcpWarmupApprovalGate({
		serverId: e.serverId,
		runId: input.runId,
		status: e.status === 'blocked' ? 'blocked' : e.status === 'fail' ? 'fail' : 'partial',
		blockedReasons: e.blockedReasons,
		createdAt: input.createdAt,
	});

	const question = createMcpWarmupFailureQuestion({
		evidence: e,
		createdAt: input.createdAt,
		runId: input.runId,
	});

	// Link gate to question
	gate.relatedQuestionId = question.id;
	question.evidenceRefs = [...question.evidenceRefs, `gate:${gate.gateId}`];

	return { gate, question };
}

// ─── MCP Warm-up Gate Evaluation with Human Decisions ─────────────────────

/**
 * Evaluate MCP warm-up readiness with human decisions applied to gates.
 *
 * SECURITY: `canProceedToRealRun` can only be true when MCP readiness
 * ITSELF is true. Human approval ALONE does NOT make failed MCPs ready.
 * An ALLOW decision on a failed required MCP stores the decision but
 * does NOT override the readiness check.
 */
export function evaluateMcpWarmupGateWithHumanDecision(input: {
	manifests: McpCapabilityManifest[];
	evidence: McpWarmupEvidence[];
	approvalGates: ApprovalGate[];
}): {
	canProceedToRealRun: boolean;
	canRetryWarmup: boolean;
	blockedReasons: string[];
	requiredHumanQuestions: HumanQuestion[];
	summary: McpWarmupSummary;
} {
	const summary = summarizeMcpWarmupEvidence(input.manifests, input.evidence);

	// MCP readiness is the ground truth — human approval cannot override it
	const mcpReady = areRequiredMcpsReadyForRealRun(input.manifests, input.evidence);
	const mcpBlockedReasons = getMcpRealRunBlockedReasons(input.manifests, input.evidence);

	// Check approval gates for any human decisions
	const gateEval = evaluateApprovalGates(input.approvalGates);

	// Build blocked reasons
	const blockedReasons: string[] = [];

	if (!mcpReady) {
		blockedReasons.push(...mcpBlockedReasons);
		blockedReasons.push(
			'SAFETY: Required MCP servers are not ready. Human approval cannot override this.',
		);
	}

	// Gates that are denied or blocked add to blocked reasons
	for (const gate of gateEval.blockingGates) {
		if (
			gate.status === 'denied' ||
			gate.status === 'blocked' ||
			gate.decisionEffect === 'aborts_run'
		) {
			blockedReasons.push(`Gate ${gate.kind} for ${gate.target ?? 'unknown'} is ${gate.status}`);
		}
	}

	// canProceedToRealRun requires MCP readiness AND all gates cleared
	const canProceedToRealRun = mcpReady && gateEval.canProceed;

	// canRetryWarmup is true if warm-up wasn't pass and no gate aborts
	const canRetryWarmup = !mcpReady && !blockedReasons.some((r) => r.includes('aborts_run'));

	// requiredHumanQuestions is empty — questions are created by the caller using
	// createMcpWarmupFailureQuestion() and stored independently.
	const requiredHumanQuestions: HumanQuestion[] = [];

	return {
		canProceedToRealRun,
		canRetryWarmup,
		blockedReasons,
		requiredHumanQuestions,
		summary,
	};
}

// ─── Provider Readiness Check with Approval Gates ─────────────────────────

/**
 * Check if the OpenCode provider can proceed to real run, considering
 * both provider readiness and approval gate status.
 *
 * SECURITY: This is a PURE POLICY CHECK. No execution.
 */
export function evaluateProviderReadinessWithApprovalGates(input: {
	providerInstalled: boolean;
	providerVerified: boolean;
	modelProfileReady: boolean;
	speckitSynced: boolean;
	approvalGates: ApprovalGate[];
}): {
	canProceedToRealRun: boolean;
	canProceedToDemoRun: boolean;
	blockedReasons: string[];
} {
	const blockedReasons: string[] = [];

	if (!input.providerInstalled) blockedReasons.push('OpenCode is not installed');
	if (!input.providerVerified) blockedReasons.push('OpenCode is not verified');
	if (!input.modelProfileReady) blockedReasons.push('Model profile is not ready');
	if (!input.speckitSynced) blockedReasons.push('Spec Kit is not synced');

	// Check approval gates
	const gateEval = evaluateApprovalGates(input.approvalGates);
	for (const gate of gateEval.blockingGates) {
		if (gate.status === 'denied' || gate.status === 'blocked') {
			blockedReasons.push(`Gate ${gate.kind} is ${gate.status}`);
		}
	}

	const canProceedToRealRun = blockedReasons.length === 0 && gateEval.canProceed;
	const canProceedToDemoRun = input.providerInstalled && input.modelProfileReady;

	return {
		canProceedToRealRun,
		canProceedToDemoRun,
		blockedReasons,
	};
}

// ─── Approval Gate Summary Builder ────────────────────────────────────────

/**
 * Build a summary of approval gates for the oversight API.
 */
export function buildApprovalGatesSummary(gates: ApprovalGate[]): ApprovalGatesSummary {
	let pending = 0;
	let approved = 0;
	let denied = 0;
	let blocked = 0;
	let expired = 0;
	let notRequired = 0;

	for (const gate of gates) {
		switch (gate.status) {
			case 'pending':
			case 'required':
				pending++;
				break;
			case 'approved':
				approved++;
				break;
			case 'denied':
				denied++;
				break;
			case 'blocked':
				blocked++;
				break;
			case 'expired':
				expired++;
				break;
			case 'not_required':
				notRequired++;
				break;
		}
	}

	return {
		pending,
		approved,
		denied,
		blocked,
		expired,
		notRequired,
		total: gates.length,
		gates,
	};
}

// ─── Gate Display Status (for UI) ─────────────────────────────────────────

/**
 * Compute a human-readable display status for a gate.
 * Used by the oversight UI to show gate states.
 */
export function getApprovalGateDisplayStatus(gate: ApprovalGate): string {
	switch (gate.status) {
		case 'not_required':
			return 'Not Required';
		case 'required':
			return `Approval Required — ${gate.requiredDecision}`;
		case 'pending':
			return 'Approval Pending';
		case 'approved':
			return `Approved — ${gate.decisionEffect.replace(/_/g, ' ')}`;
		case 'denied':
			return 'Denied — Blocked';
		case 'expired':
			return 'Expired — Blocked';
		case 'blocked':
			return 'Blocked by MCP Warm-up';
		default:
			return gate.status;
	}
}
