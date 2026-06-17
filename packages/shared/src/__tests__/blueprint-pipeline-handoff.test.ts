// Positron — Blueprint Pipeline Handoff Tests
// PR 10: Blueprint Gated Pipeline Handoff
// Tests for types, gate evaluator, evidence mapping, and run intent.
// All functions are PURE — no runtime execution in any test.

import { describe, it, expect } from 'vitest';
import {
	evaluateBlueprintPipelineHandoff,
	buildHandoffEvidence,
	createRunIntent,
	createHandoffId,
	isBlueprintPipelineHandoffStatus,
	isBlueprintPipelineGateKind,
	isBlueprintPipelineGateResultStatus,
	ALL_BLUEPRINT_PIPELINE_GATE_KINDS,
	ALL_BLUEPRINT_PIPELINE_HANDOFF_STATUSES,
	ALL_PIPELINE_GATE_RESULT_STATUSES,
	type EvaluateHandoffInput,
	type BlueprintPipelineHandoff,
	type BlueprintPipelineGateResult,
} from '../blueprint-pipeline-handoff.js';

// ─── Helpers ───────────────────────────────────────────────────────────────

function makeInput(overrides: Partial<EvaluateHandoffInput> = {}): EvaluateHandoffInput {
	return {
		blueprintValidationStatus: 'pass',
		hasHumanApproval: true,
		providerProfileReady: true,
		modelWarmupPass: true,
		specKitSyncPass: true,
		mcpWarmupPass: true,
		toolGatewaySafe: true,
		hasBlockingSecurityWarnings: false,
		createdAt: '2026-06-15T12:00:00Z',
		blueprintId: 'bp-test-123',
		runPlanId: 'rp-test-456',
		humanQuestionId: 'hq-test-789',
		approvalGateId: 'ag-test-012',
		...overrides,
	};
}

// ─── Type Guards ───────────────────────────────────────────────────────────

describe('type guards', () => {
	it('isBlueprintPipelineHandoffStatus validates status values', () => {
		expect(isBlueprintPipelineHandoffStatus('blocked')).toBe(true);
		expect(isBlueprintPipelineHandoffStatus('waiting_for_human')).toBe(true);
		expect(isBlueprintPipelineHandoffStatus('waiting_for_gates')).toBe(true);
		expect(isBlueprintPipelineHandoffStatus('ready_for_pipeline')).toBe(true);
		expect(isBlueprintPipelineHandoffStatus('runtime_not_implemented')).toBe(true);
		expect(isBlueprintPipelineHandoffStatus('invalid')).toBe(false);
		expect(isBlueprintPipelineHandoffStatus(123)).toBe(false);
		expect(isBlueprintPipelineHandoffStatus(null)).toBe(false);
		expect(isBlueprintPipelineHandoffStatus(undefined)).toBe(false);
	});

	it('isBlueprintPipelineGateKind validates gate kinds', () => {
		expect(isBlueprintPipelineGateKind('blueprint_validation')).toBe(true);
		expect(isBlueprintPipelineGateKind('human_approval')).toBe(true);
		expect(isBlueprintPipelineGateKind('provider_profile')).toBe(true);
		expect(isBlueprintPipelineGateKind('model_warmup')).toBe(true);
		expect(isBlueprintPipelineGateKind('speckit_sync')).toBe(true);
		expect(isBlueprintPipelineGateKind('mcp_warmup')).toBe(true);
		expect(isBlueprintPipelineGateKind('tool_gateway')).toBe(true);
		expect(isBlueprintPipelineGateKind('security_warnings')).toBe(true);
		expect(isBlueprintPipelineGateKind('unknown_kind')).toBe(false);
	});

	it('isBlueprintPipelineGateResultStatus validates result statuses', () => {
		expect(isBlueprintPipelineGateResultStatus('pass')).toBe(true);
		expect(isBlueprintPipelineGateResultStatus('partial')).toBe(true);
		expect(isBlueprintPipelineGateResultStatus('fail')).toBe(true);
		expect(isBlueprintPipelineGateResultStatus('blocked')).toBe(true);
		expect(isBlueprintPipelineGateResultStatus('not_checked')).toBe(true);
		expect(isBlueprintPipelineGateResultStatus('unknown')).toBe(false);
	});

	it('ALL constants are properly exported', () => {
		expect(ALL_BLUEPRINT_PIPELINE_GATE_KINDS).toHaveLength(8);
		expect(ALL_BLUEPRINT_PIPELINE_HANDOFF_STATUSES).toHaveLength(5);
		expect(ALL_PIPELINE_GATE_RESULT_STATUSES).toHaveLength(5);
	});
});

// ─── Handoff ID Generation ─────────────────────────────────────────────────

describe('createHandoffId', () => {
	it('generates unique IDs with handoff prefix', () => {
		const id1 = createHandoffId();
		const id2 = createHandoffId();
		expect(id1).toMatch(/^handoff-/);
		expect(id2).toMatch(/^handoff-/);
		expect(id1).not.toBe(id2);
	});
});

// ─── Gate Evaluator ────────────────────────────────────────────────────────

describe('evaluateBlueprintPipelineHandoff', () => {
	// ── All Gates Pass ──────────────────────────────────────────────────────

	it('returns ready_for_pipeline when all gates pass', () => {
		const input = makeInput();
		const result = evaluateBlueprintPipelineHandoff(input);

		expect(result.status).toBe('ready_for_pipeline');
		expect(result.gates).toHaveLength(8);
		expect(result.gates.every((g) => g.status === 'pass')).toBe(true);
		expect(result.blockedReasons).toHaveLength(0);
		expect(result.blueprintId).toBe('bp-test-123');
		expect(result.runPlanId).toBe('rp-test-456');
		expect(result.humanQuestionId).toBe('hq-test-789');
		expect(result.approvalGateId).toBe('ag-test-012');
	});

	it('ready_for_pipeline has correct gate messages', () => {
		const result = evaluateBlueprintPipelineHandoff(makeInput());
		// Check a few key messages
		const bpGate = result.gates.find((g) => g.kind === 'blueprint_validation');
		expect(bpGate?.message).toContain('passed');
		const humanGate = result.gates.find((g) => g.kind === 'human_approval');
		expect(humanGate?.message).toContain('granted');
	});

	// ── Blueprint Validation Blocked ─────────────────────────────────────────

	it('blocks when blueprint validation is blocked', () => {
		const result = evaluateBlueprintPipelineHandoff(
			makeInput({ blueprintValidationStatus: 'blocked' }),
		);
		expect(result.status).toBe('blocked');
		const bpGate = result.gates.find((g) => g.kind === 'blueprint_validation');
		expect(bpGate?.status).toBe('blocked');
		expect(result.blockedReasons.length).toBeGreaterThan(0);
	});

	it('waiting_for_human when blueprint validation fails', () => {
		const result = evaluateBlueprintPipelineHandoff(
			makeInput({ blueprintValidationStatus: 'fail' }),
		);
		expect(result.status).toBe('waiting_for_human');
		const bpGate = result.gates.find((g) => g.kind === 'blueprint_validation');
		expect(bpGate?.status).toBe('fail');
	});

	it('waiting_for_human when blueprint validation is partial', () => {
		const result = evaluateBlueprintPipelineHandoff(
			makeInput({ blueprintValidationStatus: 'partial' }),
		);
		expect(result.status).toBe('waiting_for_human');
	});

	// ── Human Approval ──────────────────────────────────────────────────────

	it('waiting_for_human when human approval is missing', () => {
		const result = evaluateBlueprintPipelineHandoff(makeInput({ hasHumanApproval: false }));
		expect(result.status).toBe('waiting_for_human');
		const humanGate = result.gates.find((g) => g.kind === 'human_approval');
		expect(humanGate?.status).toBe('not_checked');
		expect(humanGate?.message).toContain('required');
	});

	// ── Infrastructure Gates Not Ready ──────────────────────────────────────

	it('waiting_for_gates when provider profile is not ready', () => {
		const result = evaluateBlueprintPipelineHandoff(makeInput({ providerProfileReady: false }));
		expect(result.status).toBe('waiting_for_gates');
		const gate = result.gates.find((g) => g.kind === 'provider_profile');
		expect(gate?.status).toBe('not_checked');
	});

	it('waiting_for_gates when model warm-up has not passed', () => {
		const result = evaluateBlueprintPipelineHandoff(makeInput({ modelWarmupPass: false }));
		expect(result.status).toBe('waiting_for_gates');
		const gate = result.gates.find((g) => g.kind === 'model_warmup');
		expect(gate?.status).toBe('not_checked');
	});

	it('waiting_for_gates when Spec Kit sync has not passed', () => {
		const result = evaluateBlueprintPipelineHandoff(makeInput({ specKitSyncPass: false }));
		expect(result.status).toBe('waiting_for_gates');
		const gate = result.gates.find((g) => g.kind === 'speckit_sync');
		expect(gate?.status).toBe('not_checked');
	});

	it('waiting_for_gates when MCP warm-up has not passed', () => {
		const result = evaluateBlueprintPipelineHandoff(makeInput({ mcpWarmupPass: false }));
		expect(result.status).toBe('waiting_for_gates');
		const gate = result.gates.find((g) => g.kind === 'mcp_warmup');
		expect(gate?.status).toBe('not_checked');
	});

	it('waiting_for_gates when tool gateway is not safe', () => {
		const result = evaluateBlueprintPipelineHandoff(makeInput({ toolGatewaySafe: false }));
		expect(result.status).toBe('waiting_for_gates');
		const gate = result.gates.find((g) => g.kind === 'tool_gateway');
		expect(gate?.status).toBe('not_checked');
	});

	// ── Security Warnings ───────────────────────────────────────────────────

	it('blocks when there are blocking security warnings', () => {
		const result = evaluateBlueprintPipelineHandoff(
			makeInput({ hasBlockingSecurityWarnings: true }),
		);
		expect(result.status).toBe('blocked');
		const secGate = result.gates.find((g) => g.kind === 'security_warnings');
		expect(secGate?.status).toBe('blocked');
		expect(secGate?.message).toContain('Blocking security warnings');
	});

	it('security warnings block even when all other gates pass', () => {
		const result = evaluateBlueprintPipelineHandoff(
			makeInput({
				hasBlockingSecurityWarnings: true,
				hasHumanApproval: true,
				providerProfileReady: true,
			}),
		);
		expect(result.status).toBe('blocked');
	});

	// ── Priority Chain ──────────────────────────────────────────────────────

	it('blocked validation takes priority over missing human approval', () => {
		const result = evaluateBlueprintPipelineHandoff(
			makeInput({
				blueprintValidationStatus: 'blocked',
				hasHumanApproval: false,
			}),
		);
		expect(result.status).toBe('blocked');
	});

	it('security warnings take priority over all other failures', () => {
		const result = evaluateBlueprintPipelineHandoff(
			makeInput({
				hasBlockingSecurityWarnings: true,
				hasHumanApproval: true,
				providerProfileReady: true,
				modelWarmupPass: true,
				specKitSyncPass: true,
				mcpWarmupPass: true,
			}),
		);
		expect(result.status).toBe('blocked');
	});

	it('human approval takes priority over infrastructure gates', () => {
		const result = evaluateBlueprintPipelineHandoff(
			makeInput({
				hasHumanApproval: false,
				providerProfileReady: false,
			}),
		);
		expect(result.status).toBe('waiting_for_human');
	});

	// ── Blocked Reasons ─────────────────────────────────────────────────────

	it('accumulates blocked reasons from all failed gates', () => {
		const result = evaluateBlueprintPipelineHandoff(
			makeInput({
				blueprintValidationStatus: 'blocked',
				hasHumanApproval: false,
			}),
		);
		// Should have reasons from blueprint validation gate (and human approval gate)
		expect(result.blockedReasons.length).toBeGreaterThan(0);
	});

	it('empty blocked reasons when all gates pass', () => {
		const result = evaluateBlueprintPipelineHandoff(makeInput());
		expect(result.blockedReasons).toHaveLength(0);
	});

	// ── Gate Count ──────────────────────────────────────────────────────────

	it('produces exactly 8 gates', () => {
		const result = evaluateBlueprintPipelineHandoff(makeInput());
		expect(result.gates).toHaveLength(8);
	});

	it('all gate kinds are represented', () => {
		const result = evaluateBlueprintPipelineHandoff(makeInput());
		const kinds = result.gates.map((g) => g.kind).sort();
		expect(kinds).toEqual([
			'blueprint_validation',
			'human_approval',
			'mcp_warmup',
			'model_warmup',
			'provider_profile',
			'security_warnings',
			'speckit_sync',
			'tool_gateway',
		]);
	});

	// ── Metadata ────────────────────────────────────────────────────────────

	it('preserves input metadata in handoff', () => {
		const input = makeInput();
		const result = evaluateBlueprintPipelineHandoff(input);
		expect(result.blueprintId).toBe(input.blueprintId);
		expect(result.runPlanId).toBe(input.runPlanId);
		expect(result.humanQuestionId).toBe(input.humanQuestionId);
		expect(result.approvalGateId).toBe(input.approvalGateId);
		expect(result.createdAt).toBe(input.createdAt);
	});

	it('handles missing optional fields gracefully', () => {
		const result = evaluateBlueprintPipelineHandoff(
			makeInput({ runPlanId: undefined, humanQuestionId: undefined, approvalGateId: undefined }),
		);
		expect(result.status).toBe('ready_for_pipeline');
		expect(result.runPlanId).toBeUndefined();
		expect(result.humanQuestionId).toBeUndefined();
		expect(result.approvalGateId).toBeUndefined();
	});

	// ── Not-Checked Status ──────────────────────────────────────────────────

	it('infrastructure gates show as not_checked when not ready', () => {
		const result = evaluateBlueprintPipelineHandoff(
			makeInput({
				providerProfileReady: false,
				modelWarmupPass: false,
				specKitSyncPass: false,
				mcpWarmupPass: false,
				toolGatewaySafe: false,
			}),
		);
		expect(result.status).toBe('waiting_for_gates');
		const failing = result.gates.filter((g) => g.status === 'not_checked');
		expect(failing.length).toBeGreaterThanOrEqual(5);
	});

	// ── Partial/Fail Validation Status Handling ────────────────────────────

	it('mapBlueprintValidationStatus correctly converts statuses', () => {
		// pass → pass
		const r1 = evaluateBlueprintPipelineHandoff(makeInput({ blueprintValidationStatus: 'pass' }));
		expect(r1.gates.find((g) => g.kind === 'blueprint_validation')?.status).toBe('pass');

		// partial → partial
		const r2 = evaluateBlueprintPipelineHandoff(
			makeInput({ blueprintValidationStatus: 'partial' }),
		);
		expect(r2.gates.find((g) => g.kind === 'blueprint_validation')?.status).toBe('partial');

		// fail → fail
		const r3 = evaluateBlueprintPipelineHandoff(makeInput({ blueprintValidationStatus: 'fail' }));
		expect(r3.gates.find((g) => g.kind === 'blueprint_validation')?.status).toBe('fail');

		// blocked → blocked
		const r4 = evaluateBlueprintPipelineHandoff(
			makeInput({ blueprintValidationStatus: 'blocked' }),
		);
		expect(r4.gates.find((g) => g.kind === 'blueprint_validation')?.status).toBe('blocked');

		// not_checked → not_checked
		const r5 = evaluateBlueprintPipelineHandoff(
			makeInput({ blueprintValidationStatus: 'not_checked' }),
		);
		expect(r5.gates.find((g) => g.kind === 'blueprint_validation')?.status).toBe('not_checked');
	});

	// ── ready_for_pipeline does NOT imply execution ─────────────────────────

	it('ready_for_pipeline has no runIntentId set in evaluator (caller sets it)', () => {
		const result = evaluateBlueprintPipelineHandoff(makeInput());
		expect(result.status).toBe('ready_for_pipeline');
		// runIntentId is NOT set by the evaluator — it's set by the caller
		expect(result.runIntentId).toBeUndefined();
		// ready_for_pipeline is just a status — no execution happens
	});

	it('status messages never mention execution or starting', () => {
		const result = evaluateBlueprintPipelineHandoff(makeInput());
		for (const gate of result.gates) {
			// None of the gate messages should imply execution is happening
			expect(gate.message).not.toMatch(/execut(e|ing|ion)/i);
			expect(gate.message).not.toMatch(/start(ing|ed) (run|open|mcp|spec)/i);
		}
	});
});

// ─── Evidence Mapping ──────────────────────────────────────────────────────

describe('buildHandoffEvidence', () => {
	it('maps blocked handoff to blueprint-handoff-blocked event', () => {
		const input = makeInput({ blueprintValidationStatus: 'blocked' });
		const handoff = evaluateBlueprintPipelineHandoff(input);
		const evidence = buildHandoffEvidence(handoff);
		expect(evidence.event).toBe('blueprint-handoff-blocked');
		expect(evidence.status).toBe('blocked');
	});

	it('maps waiting_for_human to blueprint-handoff-waiting-for-human event', () => {
		const input = makeInput({ hasHumanApproval: false });
		const handoff = evaluateBlueprintPipelineHandoff(input);
		const evidence = buildHandoffEvidence(handoff);
		expect(evidence.event).toBe('blueprint-handoff-waiting-for-human');
		expect(evidence.status).toBe('waiting_for_human');
	});

	it('maps waiting_for_gates to blueprint-handoff-waiting-for-gates event', () => {
		const input = makeInput({ providerProfileReady: false });
		const handoff = evaluateBlueprintPipelineHandoff(input);
		const evidence = buildHandoffEvidence(handoff);
		expect(evidence.event).toBe('blueprint-handoff-waiting-for-gates');
		expect(evidence.status).toBe('waiting_for_gates');
	});

	it('maps ready_for_pipeline to blueprint-handoff-ready-for-pipeline event', () => {
		const handoff = evaluateBlueprintPipelineHandoff(makeInput());
		const evidence = buildHandoffEvidence(handoff);
		expect(evidence.event).toBe('blueprint-handoff-ready-for-pipeline');
		expect(evidence.status).toBe('ready_for_pipeline');
	});

	it('counts pass/block/not_checked gates correctly', () => {
		const handoff = evaluateBlueprintPipelineHandoff(makeInput());
		const evidence = buildHandoffEvidence(handoff);
		expect(evidence.gateCount).toBe(8);
		expect(evidence.passCount).toBe(8);
		expect(evidence.blockCount).toBe(0);
		expect(evidence.notCheckedCount).toBe(0);
	});

	it('counts blocked gates correctly when validation is blocked', () => {
		const input = makeInput({ blueprintValidationStatus: 'blocked' });
		const handoff = evaluateBlueprintPipelineHandoff(input);
		const evidence = buildHandoffEvidence(handoff);
		expect(evidence.blockCount).toBeGreaterThan(0);
	});

	it('counts not_checked gates correctly when infrastructure is missing', () => {
		const input = makeInput({
			providerProfileReady: false,
			modelWarmupPass: false,
			specKitSyncPass: false,
			mcpWarmupPass: false,
		});
		const handoff = evaluateBlueprintPipelineHandoff(input);
		const evidence = buildHandoffEvidence(handoff);
		expect(evidence.notCheckedCount).toBe(4);
	});

	it('redacts paths from blockedReasons', () => {
		const handoff: BlueprintPipelineHandoff = {
			handoffId: 'h-test',
			blueprintId: 'bp-test',
			status: 'blocked',
			gates: [],
			blockedReasons: [
				'Issue with /home/user/secret/file.txt',
				'Blocked by C:\\Users\\admin\\config',
			],
			createdAt: '2026-01-01T00:00:00Z',
		};
		const evidence = buildHandoffEvidence(handoff);
		// Paths should be redacted in evidence, not silently dropped.
		// The reason structure is preserved; only path content is replaced.
		expect(evidence.blockedReasons).toHaveLength(2);
		expect(evidence.blockedReasons[0]).toContain('[path-redacted]');
		expect(evidence.blockedReasons[0]).not.toContain('/home/user/secret');
		expect(evidence.blockedReasons[1]).toContain('[path-redacted]');
		expect(evidence.blockedReasons[1]).not.toContain('Users\\\\admin');
	});

	it('preserves blockedReasons without paths', () => {
		const handoff: BlueprintPipelineHandoff = {
			handoffId: 'h-test',
			blueprintId: 'bp-test',
			status: 'blocked',
			gates: [],
			blockedReasons: ['Blueprint validation failed', 'Security warnings detected'],
			createdAt: '2026-01-01T00:00:00Z',
		};
		const evidence = buildHandoffEvidence(handoff);
		expect(evidence.blockedReasons).toHaveLength(2);
		expect(evidence.blockedReasons).toContain('Blueprint validation failed');
		expect(evidence.blockedReasons).toContain('Security warnings detected');
	});

	it('preserves metadata in evidence', () => {
		const handoff = evaluateBlueprintPipelineHandoff(makeInput());
		const evidence = buildHandoffEvidence(handoff);
		expect(evidence.handoffId).toBe(handoff.handoffId);
		expect(evidence.blueprintId).toBe(handoff.blueprintId);
		expect(evidence.runPlanId).toBe(handoff.runPlanId);
		expect(evidence.createdAt).toBe(handoff.createdAt);
	});

	it('evidence contains no secrets or raw data', () => {
		const handoff = evaluateBlueprintPipelineHandoff(makeInput());
		const evidence = buildHandoffEvidence(handoff);
		const json = JSON.stringify(evidence);
		// No secret patterns
		expect(json).not.toMatch(/ghp_/);
		expect(json).not.toMatch(/github_pat_/);
		expect(json).not.toMatch(/sk-/);
		expect(json).not.toMatch(/AIza/);
		// No raw markdown
		expect(json).not.toMatch(/###/);
		expect(json).not.toMatch(/```/);
	});
});

// ─── Run Intent ────────────────────────────────────────────────────────────

describe('createRunIntent', () => {
	it('creates a run intent with correct status mapping', () => {
		const intent = createRunIntent('bp-1', 'rp-1', 'waiting_for_gates');
		expect(intent.source).toBe('blueprint');
		expect(intent.blueprintId).toBe('bp-1');
		expect(intent.runPlanId).toBe('rp-1');
		expect(intent.status).toBe('waiting_for_gates');
	});

	it('maps blocked handoff to blocked intent', () => {
		const intent = createRunIntent('bp-1', 'rp-1', 'blocked');
		expect(intent.status).toBe('blocked');
	});

	it('maps waiting_for_human to waiting_for_human intent', () => {
		const intent = createRunIntent('bp-1', 'rp-1', 'waiting_for_human');
		expect(intent.status).toBe('waiting_for_human');
	});

	it('maps ready_for_pipeline to ready_for_pipeline intent', () => {
		const intent = createRunIntent('bp-1', 'rp-1', 'ready_for_pipeline');
		expect(intent.status).toBe('ready_for_pipeline');
	});

	it('maps runtime_not_implemented to draft intent', () => {
		const intent = createRunIntent('bp-1', 'rp-1', 'runtime_not_implemented');
		expect(intent.status).toBe('draft');
	});

	it('generates unique IDs', () => {
		const i1 = createRunIntent('bp-1', 'rp-1', 'ready_for_pipeline');
		const i2 = createRunIntent('bp-2', 'rp-2', 'ready_for_pipeline');
		expect(i1.runIntentId).not.toBe(i2.runIntentId);
	});

	it('run intent ID follows naming pattern', () => {
		const intent = createRunIntent('bp-1', 'rp-1', 'ready_for_pipeline');
		expect(intent.runIntentId).toMatch(/^intent-/);
	});

	it('run intent is non-execution — no execution fields', () => {
		const intent = createRunIntent('bp-1', 'rp-1', 'ready_for_pipeline');
		const keys = Object.keys(intent);
		// Should not have execution-related fields
		expect(keys).not.toContain('executor');
		expect(keys).not.toContain('startedAt');
		expect(keys).not.toContain('executionStatus');
		expect(keys).not.toContain('pid');
	});
});

// ─── Regression: No Execution Semantics ────────────────────────────────────

describe('execution safety', () => {
	it('evaluator is a pure function — same input produces same output', () => {
		const input = makeInput();
		const r1 = evaluateBlueprintPipelineHandoff(input);
		const r2 = evaluateBlueprintPipelineHandoff(input);
		// Except for handoffId (timestamps), all fields should match
		expect(r1.status).toBe(r2.status);
		expect(r1.blockedReasons).toEqual(r2.blockedReasons);
		expect(r1.gates.length).toBe(r2.gates.length);
	});

	it('handoff object has no executable fields', () => {
		const handoff = evaluateBlueprintPipelineHandoff(makeInput());
		const json = JSON.stringify(handoff);
		// No execution commands
		expect(json).not.toMatch(/"execut(e|or|ion)"/);
		expect(json).not.toMatch(/"start_run"/);
		expect(json).not.toMatch(/"run_now"/);
		expect(json).not.toMatch(/"install"/);
		expect(json).not.toMatch(/"download"/);
		expect(json).not.toMatch(/"curl"/);
		// No MCP connection details
		expect(json).not.toMatch(/"mcp_url"/);
		expect(json).not.toMatch(/"mcp_connect"/);
	});

	it('ready_for_pipeline does not contain any trigger word', () => {
		const handoff = evaluateBlueprintPipelineHandoff(makeInput());
		expect(handoff.status).toBe('ready_for_pipeline');
		// The status string itself is fine — but no other action fields
		for (const gate of handoff.gates) {
			expect(gate.blockedReasons.join()).not.toMatch(/start|execut|run_now/i);
		}
	});

	it('blockedReasons never contain file paths', () => {
		const result = evaluateBlueprintPipelineHandoff(makeInput());
		for (const reason of result.blockedReasons) {
			expect(reason).not.toMatch(/^[A-Z]:\\/); // Windows paths
			expect(reason).not.toMatch(/^\/[a-z]+\//); // Unix paths
		}
	});
});
