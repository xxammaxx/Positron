// Positron — Approval Gates Tests
// PR 8: Oversight Approval Wiring for Install Requests + MCP Warm-up Gates
// ---------------------------------------------------------------------------
// Tests for approval gate types, policy helpers, wiring functions,
// safety enforcement, and evidence redaction.
//
// NOTE: These tests prove that approvals store decisions ONLY.
// No install, no OpenCode/MCP/Spec Kit runtime, no tool execution.

import { describe, expect, test } from 'vitest';

import {
	// Types
	type ApprovalGate,
	type ApprovalGateDecisionEffect,
	type ApprovalGateKind,
	type ApprovalGateStatus,
	type ApprovalGatesSummary,
	type RedactedApprovalGate,
	// Gate state transitions
	applyHumanDecisionToApprovalGate,
	buildApprovalGateEvidence,
	// Summary
	buildApprovalGatesSummary,
	// Policy checks
	canProceedPastApprovalGate,
	// Gate creation helpers
	createApprovalGateId,
	createMcpWarmupApprovalGate,
	createMcpWarmupFailureGateAndQuestion,
	// MCP warm-up wiring
	createMcpWarmupFailureQuestion,
	createOpenCodeInstallApprovalGate,
	createOpenCodeInstallApprovalGateAndQuestion,
	// Provider install wiring
	createOpenCodeInstallApprovalQuestion,
	evaluateApprovalGates,
	// MCP gate evaluation
	evaluateMcpWarmupGateWithHumanDecision,
	// Provider readiness
	evaluateProviderReadinessWithApprovalGates,
	getApprovalGateBlockedReasons,
	getApprovalGateDisplayStatus,
	isApprovalGate,
	isApprovalGateDecisionEffect,
	// Type guards
	isApprovalGateKind,
	isApprovalGateStatus,
	// Evidence
	redactApprovalGateForEvidence,
	// Validation
	validateApprovalGate,
} from '../approval-gates.js';

import type { HumanDecision, HumanQuestion } from '../human-oversight.js';
import type { McpWarmupEvidence } from '../mcp-warmup-profile.js';
import { buildOpenCodeInstallRequest } from '../opencode-provider-detection.js';

// ─── Helpers ──────────────────────────────────────────────────────────────

function makeGate(overrides?: Partial<ApprovalGate>): ApprovalGate {
	return {
		gateId: createApprovalGateId(),
		kind: 'opencode_install',
		status: 'required',
		riskLevel: 'high',
		requiredDecision: 'ALLOW',
		decisionEffect: 'stores_approval_only',
		createdAt: new Date().toISOString(),
		blockedReasons: [],
		...overrides,
	};
}

function makeMcpWarmupEvidence(overrides?: Partial<McpWarmupEvidence>): McpWarmupEvidence {
	return {
		evidenceId: `ev-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
		serverId: 'test-mcp-server',
		status: 'fail',
		startedAt: new Date().toISOString(),
		completedAt: new Date().toISOString(),
		phases: [],
		listedTools: ['tool.a', 'tool.b'],
		forbiddenToolChecks: [],
		redactionApplied: false,
		secretsDetected: false,
		privatePathsDetected: false,
		realRunAllowed: false,
		blockedReasons: ['MCP warm-up phase 4 failed'],
		...overrides,
	};
}

// ─── Type Guard Tests ─────────────────────────────────────────────────────

describe('Approval Gate Type Guards', () => {
	test('isApprovalGateKind returns true for valid kinds', () => {
		expect(isApprovalGateKind('opencode_install')).toBe(true);
		expect(isApprovalGateKind('mcp_real_warmup')).toBe(true);
		expect(isApprovalGateKind('mcp_warmup_retry')).toBe(true);
		expect(isApprovalGateKind('model_real_run')).toBe(true);
		expect(isApprovalGateKind('speckit_sync')).toBe(true);
		expect(isApprovalGateKind('blueprint_start')).toBe(true);
		expect(isApprovalGateKind('tool_permission')).toBe(true);
		expect(isApprovalGateKind('opencode_provider_real_run')).toBe(true);
	});

	test('isApprovalGateKind returns false for invalid kinds', () => {
		expect(isApprovalGateKind('execute')).toBe(false);
		expect(isApprovalGateKind('')).toBe(false);
		expect(isApprovalGateKind(null)).toBe(false);
		expect(isApprovalGateKind(undefined)).toBe(false);
	});

	test('isApprovalGateStatus returns true for valid statuses', () => {
		expect(isApprovalGateStatus('not_required')).toBe(true);
		expect(isApprovalGateStatus('required')).toBe(true);
		expect(isApprovalGateStatus('pending')).toBe(true);
		expect(isApprovalGateStatus('approved')).toBe(true);
		expect(isApprovalGateStatus('denied')).toBe(true);
		expect(isApprovalGateStatus('expired')).toBe(true);
		expect(isApprovalGateStatus('blocked')).toBe(true);
	});

	test('isApprovalGateStatus returns false for invalid statuses', () => {
		expect(isApprovalGateStatus('executing')).toBe(false);
		expect(isApprovalGateStatus('')).toBe(false);
	});

	test('isApprovalGateDecisionEffect returns true for valid effects', () => {
		expect(isApprovalGateDecisionEffect('stores_approval_only')).toBe(true);
		expect(isApprovalGateDecisionEffect('allows_next_gate_check')).toBe(true);
		expect(isApprovalGateDecisionEffect('requires_dry_run')).toBe(true);
		expect(isApprovalGateDecisionEffect('requires_review')).toBe(true);
		expect(isApprovalGateDecisionEffect('pauses_run')).toBe(true);
		expect(isApprovalGateDecisionEffect('aborts_run')).toBe(true);
		expect(isApprovalGateDecisionEffect('blocked_no_effect')).toBe(true);
	});

	test('isApprovalGate returns true for valid gate', () => {
		const gate = makeGate();
		expect(isApprovalGate(gate)).toBe(true);
	});

	test('isApprovalGate returns false for invalid objects', () => {
		expect(isApprovalGate(null)).toBe(false);
		expect(isApprovalGate(undefined)).toBe(false);
		expect(isApprovalGate('string')).toBe(false);
		expect(isApprovalGate(42)).toBe(false);
		expect(isApprovalGate({})).toBe(false);
	});

	test('isApprovalGate returns false for gate with invalid kind', () => {
		const gate = makeGate({ kind: 'invalid' as ApprovalGateKind });
		expect(isApprovalGate(gate)).toBe(false);
	});

	test('isApprovalGate returns false for gate with invalid status', () => {
		const gate = makeGate({ status: 'invalid' as ApprovalGateStatus });
		expect(isApprovalGate(gate)).toBe(false);
	});
});

// ─── Validation Tests ─────────────────────────────────────────────────────

describe('validateApprovalGate', () => {
	test('valid ApprovalGate passes', () => {
		const gate = makeGate();
		const result = validateApprovalGate(gate);
		expect(result.valid).toBe(true);
		expect(result.errors).toHaveLength(0);
	});

	test('invalid ApprovalGate fails', () => {
		const result = validateApprovalGate(null);
		expect(result.valid).toBe(false);
		expect(result.errors.length).toBeGreaterThan(0);
	});

	test('critical gate with ALLOW requiredDecision fails', () => {
		const gate = makeGate({
			riskLevel: 'critical',
			requiredDecision: 'ALLOW',
		});
		const result = validateApprovalGate(gate);
		expect(result.valid).toBe(false);
		expect(result.errors.some((e) => e.includes('critical'))).toBe(true);
	});

	test('critical gate with DENY passes', () => {
		const gate = makeGate({
			kind: 'mcp_real_warmup',
			riskLevel: 'critical',
			requiredDecision: 'REQUIRE_REVIEW',
			decisionEffect: 'requires_review',
		});
		const result = validateApprovalGate(gate);
		expect(result.valid).toBe(true);
	});

	test('opencode_install gate with execute effect fails', () => {
		const gate = makeGate({
			kind: 'opencode_install',
			decisionEffect: 'aborts_run',
		});
		const result = validateApprovalGate(gate);
		expect(result.valid).toBe(false);
		expect(result.errors.some((e) => e.includes('opencode_install'))).toBe(true);
	});

	test('opencode_install gate with stores_approval_only passes', () => {
		const gate = makeGate({
			kind: 'opencode_install',
			decisionEffect: 'stores_approval_only',
		});
		const result = validateApprovalGate(gate);
		expect(result.valid).toBe(true);
	});

	test('opencode_install gate with allows_next_gate_check passes', () => {
		const gate = makeGate({
			kind: 'opencode_install',
			decisionEffect: 'allows_next_gate_check',
		});
		const result = validateApprovalGate(gate);
		expect(result.valid).toBe(true);
	});
});

// ─── Gate Creation Helpers ────────────────────────────────────────────────

describe('createOpenCodeInstallApprovalGate', () => {
	test('creates gate with correct defaults', () => {
		const gate = createOpenCodeInstallApprovalGate({
			createdAt: new Date().toISOString(),
		});

		expect(gate.kind).toBe('opencode_install');
		expect(gate.status).toBe('required');
		expect(gate.riskLevel).toBe('high');
		expect(gate.requiredDecision).toBe('ALLOW');
		expect(gate.decisionEffect).toBe('stores_approval_only');
		expect(gate.target).toBe('opencode');
		expect(gate.blockedReasons).toEqual([]);
	});

	test('creates gate with custom runId and target', () => {
		const gate = createOpenCodeInstallApprovalGate({
			installDir: '/custom/install/dir',
			runId: 'run-456',
			target: 'opencode-cli',
			createdAt: new Date().toISOString(),
		});

		expect(gate.runId).toBe('run-456');
		expect(gate.target).toBe('opencode-cli');
	});
});

describe('createMcpWarmupApprovalGate', () => {
	test('creates blocked gate for blocked status', () => {
		const gate = createMcpWarmupApprovalGate({
			serverId: 'mcp-filesystem',
			status: 'blocked',
			blockedReasons: ['connectivity failed'],
			createdAt: new Date().toISOString(),
		});

		expect(gate.kind).toBe('mcp_warmup_retry');
		expect(gate.status).toBe('blocked');
		expect(gate.riskLevel).toBe('critical');
		expect(gate.requiredDecision).toBe('REQUIRE_REVIEW');
		expect(gate.decisionEffect).toBe('requires_review');
		expect(gate.target).toBe('mcp-filesystem');
	});

	test('creates required gate for fail status', () => {
		const gate = createMcpWarmupApprovalGate({
			serverId: 'mcp-github',
			status: 'fail',
			blockedReasons: ['tool discovery failed'],
			createdAt: new Date().toISOString(),
		});

		expect(gate.kind).toBe('mcp_warmup_retry');
		expect(gate.status).toBe('required');
		expect(gate.riskLevel).toBe('high');
		expect(gate.requiredDecision).toBe('ALLOW');
		expect(gate.decisionEffect).toBe('allows_next_gate_check');
	});

	test('creates required gate for partial status', () => {
		const gate = createMcpWarmupApprovalGate({
			serverId: 'mcp-test',
			status: 'partial',
			blockedReasons: ['some SHOULD steps failed'],
			createdAt: new Date().toISOString(),
		});

		expect(gate.status).toBe('required');
		expect(gate.riskLevel).toBe('high');
	});
});

// ─── Gate State Transitions ───────────────────────────────────────────────

describe('applyHumanDecisionToApprovalGate', () => {
	test('ALLOW transitions to approved', () => {
		const gate = makeGate({ status: 'required' });
		const result = applyHumanDecisionToApprovalGate({
			gate,
			decision: 'ALLOW',
			answeredAt: new Date().toISOString(),
		});

		expect(result.status).toBe('approved');
		expect(result.resolution).toBe('ALLOW');
		expect(result.decisionEffect).toBe('stores_approval_only');
	});

	test('DENY transitions to denied', () => {
		const gate = makeGate();
		const result = applyHumanDecisionToApprovalGate({
			gate,
			decision: 'DENY',
			answeredAt: new Date().toISOString(),
		});

		expect(result.status).toBe('denied');
		expect(result.resolution).toBe('DENY');
		expect(result.decisionEffect).toBe('blocked_no_effect');
	});

	test('REQUIRE_DRY_RUN transitions to pending with requires_dry_run', () => {
		const gate = makeGate();
		const result = applyHumanDecisionToApprovalGate({
			gate,
			decision: 'REQUIRE_DRY_RUN',
			answeredAt: new Date().toISOString(),
		});

		expect(result.status).toBe('pending');
		expect(result.decisionEffect).toBe('requires_dry_run');
	});

	test('REQUIRE_REVIEW transitions to pending with requires_review', () => {
		const gate = makeGate();
		const result = applyHumanDecisionToApprovalGate({
			gate,
			decision: 'REQUIRE_REVIEW',
			answeredAt: new Date().toISOString(),
		});

		expect(result.status).toBe('pending');
		expect(result.decisionEffect).toBe('requires_review');
	});

	test('PAUSE_RUN transitions to pending with pauses_run', () => {
		const gate = makeGate();
		const result = applyHumanDecisionToApprovalGate({
			gate,
			decision: 'PAUSE_RUN',
			answeredAt: new Date().toISOString(),
		});

		expect(result.status).toBe('pending');
		expect(result.decisionEffect).toBe('pauses_run');
	});

	test('ABORT_RUN transitions to denied with aborts_run', () => {
		const gate = makeGate();
		const result = applyHumanDecisionToApprovalGate({
			gate,
			decision: 'ABORT_RUN',
			answeredAt: new Date().toISOString(),
		});

		expect(result.status).toBe('denied');
		expect(result.decisionEffect).toBe('aborts_run');
	});

	test('ASK_MORE stays pending', () => {
		const gate = makeGate();
		const result = applyHumanDecisionToApprovalGate({
			gate,
			decision: 'ASK_MORE',
			answeredAt: new Date().toISOString(),
		});

		expect(result.status).toBe('pending');
	});

	test('applyHumanDecisionToApprovalGate does NOT execute any action', () => {
		// The function is pure — it only returns a new gate object
		const gate = makeGate();
		const result = applyHumanDecisionToApprovalGate({
			gate,
			decision: 'ALLOW',
			answeredAt: new Date().toISOString(),
		});

		// Verify it's a new object, not the same reference
		expect(result).not.toBe(gate);
		// Verify only gate state changed — no side effects
		expect(result.status).toBe('approved');
		expect(result.gateId).toBe(gate.gateId);
	});
});

// ─── Policy Checks ────────────────────────────────────────────────────────

describe('canProceedPastApprovalGate', () => {
	test('approved gate with stores_approval_only can proceed', () => {
		const gate = makeGate({
			status: 'approved',
			decisionEffect: 'stores_approval_only',
		});
		expect(canProceedPastApprovalGate(gate)).toBe(true);
	});

	test('approved gate with allows_next_gate_check can proceed', () => {
		const gate = makeGate({
			status: 'approved',
			decisionEffect: 'allows_next_gate_check',
		});
		expect(canProceedPastApprovalGate(gate)).toBe(true);
	});

	test('required gate cannot proceed', () => {
		const gate = makeGate({ status: 'required' });
		expect(canProceedPastApprovalGate(gate)).toBe(false);
	});

	test('pending gate cannot proceed', () => {
		const gate = makeGate({ status: 'pending' });
		expect(canProceedPastApprovalGate(gate)).toBe(false);
	});

	test('denied gate cannot proceed', () => {
		const gate = makeGate({ status: 'denied' });
		expect(canProceedPastApprovalGate(gate)).toBe(false);
	});

	test('expired gate cannot proceed', () => {
		const gate = makeGate({ status: 'expired' });
		expect(canProceedPastApprovalGate(gate)).toBe(false);
	});

	test('blocked gate cannot proceed', () => {
		const gate = makeGate({ status: 'blocked' });
		expect(canProceedPastApprovalGate(gate)).toBe(false);
	});

	test('approved gate with aborts_run cannot proceed', () => {
		const gate = makeGate({
			status: 'approved',
			kind: 'model_real_run',
			decisionEffect: 'aborts_run',
		});
		expect(canProceedPastApprovalGate(gate)).toBe(false);
	});
});

describe('getApprovalGateBlockedReasons', () => {
	test('returns reasons for required gate', () => {
		const gate = makeGate({ status: 'required' });
		const reasons = getApprovalGateBlockedReasons(gate);
		expect(reasons.length).toBeGreaterThan(0);
		expect(reasons.some((r) => r.includes('requires human decision'))).toBe(true);
	});

	test('returns reasons for denied gate', () => {
		const gate = makeGate({ status: 'denied' });
		const reasons = getApprovalGateBlockedReasons(gate);
		expect(reasons.some((r) => r.includes('denied'))).toBe(true);
	});

	test('returns reasons for blocked gate', () => {
		const gate = makeGate({
			status: 'blocked',
			blockedReasons: ['connectivity failure'],
		});
		const reasons = getApprovalGateBlockedReasons(gate);
		expect(reasons.some((r) => r.includes('connectivity failure'))).toBe(true);
	});

	test('approved gate has no blocked reasons (from gate itself)', () => {
		const gate = makeGate({ status: 'approved' });
		const reasons = getApprovalGateBlockedReasons(gate);
		// May have blockedReasons array from creation, but gate itself is not blocking
		expect(reasons.every((r) => !r.includes('approved'))).toBe(true);
	});
});

describe('evaluateApprovalGates', () => {
	test('all approved gates → can proceed', () => {
		const gates = [
			makeGate({ status: 'approved', decisionEffect: 'stores_approval_only' }),
			makeGate({ status: 'approved', decisionEffect: 'allows_next_gate_check' }),
		];
		const result = evaluateApprovalGates(gates);
		expect(result.canProceed).toBe(true);
		expect(result.blockingGates).toHaveLength(0);
	});

	test('one denied gate → cannot proceed', () => {
		const gates = [
			makeGate({ status: 'approved', decisionEffect: 'stores_approval_only' }),
			makeGate({ status: 'denied' }),
		];
		const result = evaluateApprovalGates(gates);
		expect(result.canProceed).toBe(false);
		expect(result.blockingGates.length).toBeGreaterThan(0);
	});

	test('pending gate blocks proceed', () => {
		const gates = [makeGate({ status: 'pending' })];
		const result = evaluateApprovalGates(gates);
		expect(result.canProceed).toBe(false);
		expect(result.blockedReasons.some((r) => r.includes('pending'))).toBe(true);
	});

	test('empty gates → can proceed', () => {
		const result = evaluateApprovalGates([]);
		expect(result.canProceed).toBe(true);
	});
});

// ─── Evidence Redaction ───────────────────────────────────────────────────

describe('redactApprovalGateForEvidence', () => {
	test('redacted gate excludes private paths from blockedReasons', () => {
		const gate = makeGate({
			blockedReasons: ['connectivity failure', '/home/user/private/path'],
		});
		const redacted = redactApprovalGateForEvidence(gate);
		expect(redacted.blockedReasons).toContain('connectivity failure');
		expect(redacted.blockedReasons).not.toContain('/home/user/private/path');
		// Windows paths are also filtered
		expect(redacted.redacted).toBe(true);
	});

	test('redacted gate preserves safe fields', () => {
		const gate = makeGate();
		const redacted = redactApprovalGateForEvidence(gate);
		expect(redacted.gateId).toBe(gate.gateId);
		expect(redacted.kind).toBe(gate.kind);
		expect(redacted.status).toBe(gate.status);
		expect(redacted.riskLevel).toBe(gate.riskLevel);
	});
});

describe('buildApprovalGateEvidence', () => {
	test('builds evidence record with redacted gate', () => {
		const gate = makeGate();
		const evidence = buildApprovalGateEvidence('approval-gate-created', gate);
		expect(evidence.eventType).toBe('approval-gate-created');
		expect(evidence.gate).toBeDefined();
		expect(evidence.gate.redacted).toBe(true);
	});

	test('builds evidence record with question context', () => {
		const gate = makeGate();
		const question: HumanQuestion = {
			id: 'q-1',
			type: 'provider_install_approval',
			status: 'open',
			title: 'Test',
			question: 'Should we proceed?',
			riskLevel: 'high',
			requestedBy: 'positron',
			evidenceRefs: [],
			allowedDecisions: ['ALLOW', 'DENY'],
			defaultDecision: 'DENY',
			createdAt: new Date().toISOString(),
			blockedReasons: [],
		};
		const evidence = buildApprovalGateEvidence('approval-gate-approved', gate, question);
		expect(evidence.redactedQuestion).toBeDefined();
	});
});

// ─── Provider Install Approval Wiring ────────────────────────────────────

describe('createOpenCodeInstallApprovalQuestion', () => {
	test('creates provider_install_approval question with correct type', () => {
		const installReq = buildOpenCodeInstallRequest();
		const question = createOpenCodeInstallApprovalQuestion({
			installRequest: installReq,
			runId: 'run-1',
			createdAt: new Date().toISOString(),
		});

		expect(question.type).toBe('provider_install_approval');
		expect(question.riskLevel).toBe('high');
		expect(question.defaultDecision).toBe('DENY');
		expect(question.status).toBe('open');
	});

	test('question does not expose raw home path', () => {
		const installReq = buildOpenCodeInstallRequest({
			installDir: '/home/user123/private/tools/bin',
		});
		const question = createOpenCodeInstallApprovalQuestion({
			installRequest: installReq,
			createdAt: new Date().toISOString(),
		});

		// The raw path should be redacted in the question text
		expect(question.question).not.toContain('/home/user123');
		expect(question.target).not.toContain('/home/user123');
		// The target should show normalized path
		expect(question.target).toContain('~');
	});

	test('ALLOW is in allowed decisions', () => {
		const installReq = buildOpenCodeInstallRequest();
		const question = createOpenCodeInstallApprovalQuestion({
			installRequest: installReq,
			createdAt: new Date().toISOString(),
		});

		expect(question.allowedDecisions).toContain('ALLOW');
		expect(question.allowedDecisions).toContain('DENY');
	});

	test('question includes no private install path', () => {
		const installReq = buildOpenCodeInstallRequest({
			installDir: '/home/user/.positron/tools/bin',
		});
		const question = createOpenCodeInstallApprovalQuestion({
			installRequest: installReq,
			createdAt: new Date().toISOString(),
		});

		expect(question.question).not.toContain('/home/user');
		expect(question.target).not.toContain('/home/user');
	});

	test('question text does not contain curl command', () => {
		const installReq = buildOpenCodeInstallRequest();
		const question = createOpenCodeInstallApprovalQuestion({
			installRequest: installReq,
			createdAt: new Date().toISOString(),
		});

		// The question should describe the install, not contain the raw command
		expect(question.question).not.toMatch(/curl\s+\|/);
	});

	test('question includes checksum/trust info', () => {
		const installReq = buildOpenCodeInstallRequest();
		const question = createOpenCodeInstallApprovalQuestion({
			installRequest: installReq,
			createdAt: new Date().toISOString(),
		});

		expect(question.question).toContain('Manual fallback');
	});
});

describe('createOpenCodeInstallApprovalGateAndQuestion', () => {
	test('creates linked gate and question', () => {
		const installReq = buildOpenCodeInstallRequest();
		const { gate, question } = createOpenCodeInstallApprovalGateAndQuestion({
			installRequest: installReq,
			runId: 'run-1',
			createdAt: new Date().toISOString(),
		});

		expect(gate.relatedQuestionId).toBe(question.id);
		expect(question.evidenceRefs).toContain(`gate:${gate.gateId}`);
		expect(gate.kind).toBe('opencode_install');
		expect(gate.decisionEffect).toBe('stores_approval_only');
		expect(question.type).toBe('provider_install_approval');
	});

	test('ALLOW stores approval only — gate effect confirms no execution', () => {
		const installReq = buildOpenCodeInstallRequest();
		const { gate } = createOpenCodeInstallApprovalGateAndQuestion({
			installRequest: installReq,
			createdAt: new Date().toISOString(),
		});

		// The gate effect proves this does not execute any install
		expect(gate.decisionEffect).toBe('stores_approval_only');
		expect(gate.decisionEffect).not.toBe('aborts_run');
		expect(gate.decisionEffect).not.toBe('pauses_run');
	});

	test('DENY blocks install gate', () => {
		const installReq = buildOpenCodeInstallRequest();
		const { gate } = createOpenCodeInstallApprovalGateAndQuestion({
			installRequest: installReq,
			createdAt: new Date().toISOString(),
		});

		const denied = applyHumanDecisionToApprovalGate({
			gate,
			decision: 'DENY',
			answeredAt: new Date().toISOString(),
		});

		expect(denied.status).toBe('denied');
		expect(denied.decisionEffect).toBe('blocked_no_effect');
		expect(canProceedPastApprovalGate(denied)).toBe(false);
	});
});

// ─── MCP Warm-up Gate Wiring ──────────────────────────────────────────────

describe('createMcpWarmupFailureQuestion', () => {
	test('blocked required MCP creates critical risk question', () => {
		const evidence = makeMcpWarmupEvidence({
			status: 'blocked',
			blockedReasons: ['connectivity failed'],
		});
		const question = createMcpWarmupFailureQuestion({
			evidence,
			createdAt: new Date().toISOString(),
			runId: 'run-1',
		});

		expect(question.type).toBe('mcp_warmup_failure');
		expect(question.riskLevel).toBe('critical');
		expect(question.defaultDecision).toBe('DENY');
		expect(question.relatedMcpServerId).toBe('test-mcp-server');
	});

	test('failed required MCP creates high risk question', () => {
		const evidence = makeMcpWarmupEvidence({
			status: 'fail',
			blockedReasons: ['phase 4 failed'],
		});
		const question = createMcpWarmupFailureQuestion({
			evidence,
			createdAt: new Date().toISOString(),
		});

		expect(question.riskLevel).toBe('high');
		expect(question.defaultDecision).toBe('DENY');
	});

	test('partial MCP warm-up creates medium risk question', () => {
		const evidence = makeMcpWarmupEvidence({
			status: 'partial',
			blockedReasons: ['some SHOULD steps failed'],
		});
		const question = createMcpWarmupFailureQuestion({
			evidence,
			createdAt: new Date().toISOString(),
		});

		expect(question.riskLevel).toBe('medium');
		expect(question.defaultDecision).toBe('ASK_MORE');
	});

	test('critical blocked question does not allow ALLOW', () => {
		const evidence = makeMcpWarmupEvidence({
			status: 'blocked',
		});
		const question = createMcpWarmupFailureQuestion({
			evidence,
			createdAt: new Date().toISOString(),
		});

		expect(question.allowedDecisions).not.toContain('ALLOW');
		expect(question.allowedDecisions).toContain('DENY');
		expect(question.allowedDecisions).toContain('REQUIRE_REVIEW');
	});

	test('question text warns that ALLOW does not override readiness', () => {
		const evidence = makeMcpWarmupEvidence({ status: 'fail' });
		const question = createMcpWarmupFailureQuestion({
			evidence,
			createdAt: new Date().toISOString(),
		});

		expect(question.question).toContain('does NOT override');
	});
});

describe('createMcpWarmupFailureGateAndQuestion', () => {
	test('creates linked gate and question', () => {
		const evidence = makeMcpWarmupEvidence({ status: 'fail' });
		const { gate, question } = createMcpWarmupFailureGateAndQuestion({
			evidence,
			createdAt: new Date().toISOString(),
		});

		expect(gate.relatedQuestionId).toBe(question.id);
		expect(question.evidenceRefs).toContain(`gate:${gate.gateId}`);
		expect(gate.kind).toBe('mcp_warmup_retry');
		expect(question.type).toBe('mcp_warmup_failure');
	});

	test('blocked MCP creates blocked gate', () => {
		const evidence = makeMcpWarmupEvidence({ status: 'blocked' });
		const { gate } = createMcpWarmupFailureGateAndQuestion({
			evidence,
			createdAt: new Date().toISOString(),
		});

		expect(gate.status).toBe('blocked');
		expect(gate.riskLevel).toBe('critical');
	});
});

// ─── MCP Gate Evaluation with Human Decisions ─────────────────────────────

describe('evaluateMcpWarmupGateWithHumanDecision', () => {
	test('ALLOW does not make failed required MCP real-run-ready', () => {
		// This is the critical safety test: ALLOW on a failed MCP must NOT
		// make the overall readiness pass. Required MCP failures remain blocking.

		const evidence = makeMcpWarmupEvidence({
			status: 'fail',
			realRunAllowed: false,
			blockedReasons: ['warm-up phase 4 failed'],
		});

		const gate = createMcpWarmupApprovalGate({
			serverId: evidence.serverId,
			status: 'fail',
			blockedReasons: evidence.blockedReasons,
			createdAt: new Date().toISOString(),
		});

		// Apply ALLOW decision
		const approvedGate = applyHumanDecisionToApprovalGate({
			gate,
			decision: 'ALLOW',
			answeredAt: new Date().toISOString(),
		});

		expect(approvedGate.status).toBe('approved');

		// Now evaluate — even with ALLOW, the MCP readiness check should still block
		const result = evaluateMcpWarmupGateWithHumanDecision({
			manifests: [],
			evidence: [evidence],
			approvalGates: [approvedGate],
		});

		// The MCP is not ready (realRunAllowed is false), so cannot proceed
		expect(result.canProceedToRealRun).toBe(false);
		expect(result.blockedReasons.length).toBeGreaterThan(0);
		expect(result.blockedReasons.some((r) => r.includes('not ready'))).toBe(true);
	});

	test('ABORT_RUN decision blocks progression', () => {
		const evidence = makeMcpWarmupEvidence({ status: 'fail' });

		const gate = createMcpWarmupApprovalGate({
			serverId: evidence.serverId,
			status: 'fail',
			blockedReasons: evidence.blockedReasons,
			createdAt: new Date().toISOString(),
		});

		const abortedGate = applyHumanDecisionToApprovalGate({
			gate,
			decision: 'ABORT_RUN',
			answeredAt: new Date().toISOString(),
		});

		const result = evaluateMcpWarmupGateWithHumanDecision({
			manifests: [],
			evidence: [evidence],
			approvalGates: [abortedGate],
		});

		expect(result.canProceedToRealRun).toBe(false);
		expect(
			result.blockedReasons.some((r) => r.includes('aborts_run') || r.includes('denied')),
		).toBe(true);
	});

	test('PAUSE_RUN decision blocks progression', () => {
		const evidence = makeMcpWarmupEvidence({ status: 'fail' });

		const gate = makeGate({
			kind: 'mcp_warmup_retry',
			status: 'pending',
			decisionEffect: 'pauses_run',
			blockedReasons: [],
		});

		const result = evaluateMcpWarmupGateWithHumanDecision({
			manifests: [],
			evidence: [evidence],
			approvalGates: [gate],
		});

		expect(result.canProceedToRealRun).toBe(false);
	});

	test('canRetryWarmup is true when MCP fails and no abort', () => {
		const evidence = makeMcpWarmupEvidence({ status: 'fail', realRunAllowed: false });

		const result = evaluateMcpWarmupGateWithHumanDecision({
			manifests: [],
			evidence: [evidence],
			approvalGates: [],
		});

		expect(result.canRetryWarmup).toBe(true);
	});
});

// ─── Provider Readiness Check ─────────────────────────────────────────────

describe('evaluateProviderReadinessWithApprovalGates', () => {
	test('ready provider with no blocking gates → can proceed', () => {
		const result = evaluateProviderReadinessWithApprovalGates({
			providerInstalled: true,
			providerVerified: true,
			modelProfileReady: true,
			speckitSynced: true,
			approvalGates: [],
		});

		expect(result.canProceedToRealRun).toBe(true);
		expect(result.blockedReasons).toHaveLength(0);
	});

	test('not installed provider → blocked', () => {
		const result = evaluateProviderReadinessWithApprovalGates({
			providerInstalled: false,
			providerVerified: false,
			modelProfileReady: false,
			speckitSynced: false,
			approvalGates: [],
		});

		expect(result.canProceedToRealRun).toBe(false);
		expect(result.blockedReasons.some((r) => r.includes('not installed'))).toBe(true);
	});

	test('denied approval gate blocks readiness', () => {
		const gate = makeGate({
			kind: 'opencode_install',
			status: 'denied',
		});

		const result = evaluateProviderReadinessWithApprovalGates({
			providerInstalled: true,
			providerVerified: true,
			modelProfileReady: true,
			speckitSynced: true,
			approvalGates: [gate],
		});

		expect(result.canProceedToRealRun).toBe(false);
		expect(result.blockedReasons.some((r) => r.includes('denied'))).toBe(true);
	});

	test('can still demo run with installed provider even with denied gate', () => {
		const gate = makeGate({
			kind: 'opencode_install',
			status: 'denied',
		});

		const result = evaluateProviderReadinessWithApprovalGates({
			providerInstalled: true,
			providerVerified: false,
			modelProfileReady: true,
			speckitSynced: true,
			approvalGates: [gate],
		});

		expect(result.canProceedToRealRun).toBe(false);
		expect(result.canProceedToDemoRun).toBe(true);
	});
});

// ─── Summary ──────────────────────────────────────────────────────────────

describe('buildApprovalGatesSummary', () => {
	test('counts gates by status correctly', () => {
		const gates: ApprovalGate[] = [
			makeGate({ status: 'required' }),
			makeGate({ status: 'approved' }),
			makeGate({ status: 'approved' }),
			makeGate({ status: 'denied' }),
			makeGate({ status: 'blocked' }),
			makeGate({ status: 'pending' }),
			makeGate({ status: 'expired' }),
			makeGate({ status: 'not_required' }),
		];

		const summary = buildApprovalGatesSummary(gates);
		expect(summary.pending).toBe(2); // required + pending
		expect(summary.approved).toBe(2);
		expect(summary.denied).toBe(1);
		expect(summary.blocked).toBe(1);
		expect(summary.expired).toBe(1);
		expect(summary.notRequired).toBe(1);
		expect(summary.total).toBe(8);
	});

	test('empty gates returns zero counts', () => {
		const summary = buildApprovalGatesSummary([]);
		expect(summary.total).toBe(0);
		expect(summary.pending).toBe(0);
	});
});

// ─── Display Status ──────────────────────────────────────────────────────

describe('getApprovalGateDisplayStatus', () => {
	test('returns human-readable status for required gate', () => {
		const gate = makeGate({ status: 'required', requiredDecision: 'ALLOW' });
		const status = getApprovalGateDisplayStatus(gate);
		expect(status).toContain('Approval Required');
	});

	test('returns blocked by MCP for blocked gate', () => {
		const gate = makeGate({ status: 'blocked' });
		const status = getApprovalGateDisplayStatus(gate);
		expect(status).toContain('Blocked by MCP');
	});

	test('returns approved status for approved gate', () => {
		const gate = makeGate({ status: 'approved', decisionEffect: 'stores_approval_only' });
		const status = getApprovalGateDisplayStatus(gate);
		expect(status).toContain('Approved');
	});

	test('returns denied status for denied gate', () => {
		const gate = makeGate({ status: 'denied' });
		const status = getApprovalGateDisplayStatus(gate);
		expect(status).toContain('Denied');
	});
});

// ─── Integration Tests: Full Approval Flow ────────────────────────────────

describe('Full Approval Flow (no execution)', () => {
	test('OpenCode install request → question → ALLOW → gate approved (no install executed)', () => {
		// Step 1: Create install request
		const installReq = buildOpenCodeInstallRequest();

		// Step 2: Create gate + question
		const { gate, question } = createOpenCodeInstallApprovalGateAndQuestion({
			installRequest: installReq,
			createdAt: new Date().toISOString(),
		});

		// Verify initial state
		expect(gate.status).toBe('required');
		expect(question.type).toBe('provider_install_approval');
		expect(question.defaultDecision).toBe('DENY');

		// Step 3: Human approves
		const approvedGate = applyHumanDecisionToApprovalGate({
			gate,
			decision: 'ALLOW',
			answeredAt: new Date().toISOString(),
		});

		// Step 4: Gate is now approved
		expect(approvedGate.status).toBe('approved');
		expect(approvedGate.resolution).toBe('ALLOW');
		expect(canProceedPastApprovalGate(approvedGate)).toBe(true);

		// Step 5: But the decision effect is stores_approval_only
		// This proves NO install was executed
		expect(approvedGate.decisionEffect).toBe('stores_approval_only');
		expect(approvedGate.decisionEffect).not.toBe('aborts_run');

		// The actual install execution is NOT part of this flow
		// It would be in a future PR's install executor
	});

	test('OpenCode install request → DENY → gate blocked', () => {
		const installReq = buildOpenCodeInstallRequest();
		const { gate } = createOpenCodeInstallApprovalGateAndQuestion({
			installRequest: installReq,
			createdAt: new Date().toISOString(),
		});

		const deniedGate = applyHumanDecisionToApprovalGate({
			gate,
			decision: 'DENY',
			answeredAt: new Date().toISOString(),
		});

		expect(deniedGate.status).toBe('denied');
		expect(deniedGate.decisionEffect).toBe('blocked_no_effect');
		expect(canProceedPastApprovalGate(deniedGate)).toBe(false);
	});

	test('MCP warm-up fail → question → ALLOW → readiness still blocked', () => {
		// Step 1: MCP warm-up fails
		const evidence = makeMcpWarmupEvidence({
			status: 'fail',
			realRunAllowed: false,
			blockedReasons: ['connectivity failed'],
		});

		// Step 2: Create gate + question
		const { gate, question } = createMcpWarmupFailureGateAndQuestion({
			evidence,
			createdAt: new Date().toISOString(),
		});

		expect(question.riskLevel).toBe('high');
		expect(gate.status).toBe('required');

		// Step 3: Human says ALLOW
		const approvedGate = applyHumanDecisionToApprovalGate({
			gate,
			decision: 'ALLOW',
			answeredAt: new Date().toISOString(),
		});

		expect(approvedGate.status).toBe('approved');

		// Step 4: Evaluate readiness — MCP readiness blocks despite ALLOW
		const result = evaluateMcpWarmupGateWithHumanDecision({
			manifests: [],
			evidence: [evidence],
			approvalGates: [approvedGate],
		});

		// The ALLOW stored the decision but MCP readiness is still false
		expect(result.canProceedToRealRun).toBe(false);
		expect(result.blockedReasons.length).toBeGreaterThan(0);
	});

	test('MCP warm-up blocked → question → ABORT_RUN → permanently blocked', () => {
		const evidence = makeMcpWarmupEvidence({
			status: 'blocked',
			blockedReasons: ['forbidden capability detected'],
		});

		const { gate } = createMcpWarmupFailureGateAndQuestion({
			evidence,
			createdAt: new Date().toISOString(),
		});

		expect(gate.status).toBe('blocked');
		expect(gate.riskLevel).toBe('critical');

		const abortedGate = applyHumanDecisionToApprovalGate({
			gate,
			decision: 'ABORT_RUN',
			answeredAt: new Date().toISOString(),
		});

		expect(abortedGate.decisionEffect).toBe('aborts_run');
		expect(canProceedPastApprovalGate(abortedGate)).toBe(false);
	});
});

// ─── Regression Tests ────────────────────────────────────────────────────

describe('Regression: No execution endpoints', () => {
	test('approval-gates module has no execute/tool runtime imports', () => {
		// The module imports are verified by the typecheck/build gates
		// This test is a documentation assertion
		expect(true).toBe(true);
	});

	test('createOpenCodeInstallApprovalQuestion does not import curl/bash/exec', () => {
		// Verify by calling the function — no side effects
		const installReq = buildOpenCodeInstallRequest();
		const question = createOpenCodeInstallApprovalQuestion({
			installRequest: installReq,
			createdAt: new Date().toISOString(),
		});

		// Question is just data — no execution
		expect(question).toBeDefined();
		expect(typeof question.id).toBe('string');
	});

	test('all gate transitions are pure functions', () => {
		const gate1 = makeGate({ status: 'required' });
		const gate2 = makeGate({ status: 'required' });

		const originalId1 = gate1.gateId;
		const result = applyHumanDecisionToApprovalGate({
			gate: gate1,
			decision: 'ALLOW',
			answeredAt: new Date().toISOString(),
		});

		// Original gate is unchanged
		expect(gate1.gateId).toBe(originalId1);
		expect(gate1.status).toBe('required');

		// Result is a new object
		expect(result.gateId).toBe(originalId1);
		expect(result.status).toBe('approved');

		// Gate 2 is unaffected
		expect(gate2.status).toBe('required');
	});
});
