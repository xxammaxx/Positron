// Positron — Human Oversight Tests
// PR 7: Oversight UI Foundation + Human Question Queue
// Tests for type validation, policy rules, redaction, and safety enforcement.

import { describe, test, expect } from 'vitest';
import {
	isHumanQuestionType,
	isHumanQuestionStatus,
	isHumanDecision,
	isHumanRiskLevel,
	validateHumanQuestion,
	validateHumanQuestionAnswer,
	canAnswerHumanQuestion,
	isDecisionAllowed,
	getSafeDefaultDecisionForRisk,
	getTimeoutDecision,
	doesTimeoutProduceAllow,
	redactHumanAnswerText,
	containsSecretsPattern,
	redactHumanQuestionForEvidence,
	buildHumanOversightEvidence,
	createHumanQuestionId,
} from '../human-oversight.js';
import type {
	HumanQuestion,
	AnswerHumanQuestionRequest,
} from '../human-oversight.js';

// ─── Test Helpers ────────────────────────────────────────────────────────────

function makeValidQuestion(overrides?: Partial<HumanQuestion>): HumanQuestion {
	return {
		id: createHumanQuestionId(),
		runId: 'run-001',
		issueNumber: 229,
		type: 'approval',
		status: 'open',
		title: 'Test Question',
		question: 'Should we proceed with this action?',
		riskLevel: 'medium',
		requestedBy: 'positron',
		proposedAction: 'install_opencode',
		target: 'opencode v2.4.0',
		evidenceRefs: ['evidence/tool-gateway-status.json'],
		allowedDecisions: ['ALLOW', 'DENY', 'ASK_MORE', 'PAUSE_RUN'],
		defaultDecision: 'ASK_MORE',
		createdAt: new Date().toISOString(),
		blockedReasons: [],
		...overrides,
	};
}

// ─── Type Guards ─────────────────────────────────────────────────────────────

describe('Type Guards', () => {
	test('isHumanQuestionType returns true for valid types', () => {
		expect(isHumanQuestionType('approval')).toBe(true);
		expect(isHumanQuestionType('clarification')).toBe(true);
		expect(isHumanQuestionType('mcp_warmup_failure')).toBe(true);
		expect(isHumanQuestionType('blueprint_start_approval')).toBe(true);
	});

	test('isHumanQuestionType returns false for invalid types', () => {
		expect(isHumanQuestionType('invalid')).toBe(false);
		expect(isHumanQuestionType('')).toBe(false);
		expect(isHumanQuestionType(null)).toBe(false);
		expect(isHumanQuestionType(undefined)).toBe(false);
		expect(isHumanQuestionType(42)).toBe(false);
	});

	test('isHumanDecision returns true for valid decisions', () => {
		expect(isHumanDecision('ALLOW')).toBe(true);
		expect(isHumanDecision('DENY')).toBe(true);
		expect(isHumanDecision('PAUSE_RUN')).toBe(true);
		expect(isHumanDecision('ABORT_RUN')).toBe(true);
		expect(isHumanDecision('REQUIRE_REVIEW')).toBe(true);
	});

	test('isHumanDecision returns false for invalid', () => {
		expect(isHumanDecision('EXECUTE')).toBe(false);
		expect(isHumanDecision('MERGE')).toBe(false);
		expect(isHumanDecision('')).toBe(false);
	});
});

// ─── Question Validation ─────────────────────────────────────────────────────

describe('validateHumanQuestion', () => {
	test('valid HumanQuestion passes', () => {
		const q = makeValidQuestion();
		const result = validateHumanQuestion(q);
		expect(result.valid).toBe(true);
		expect(result.errors).toHaveLength(0);
	});

	test('missing id fails', () => {
		const q = makeValidQuestion({ id: '' });
		const result = validateHumanQuestion(q);
		expect(result.valid).toBe(false);
		expect(result.errors).toContain('id must be a non-empty string');
	});

	test('invalid type fails', () => {
		const q = makeValidQuestion({ type: 'not_a_type' as never });
		expect(validateHumanQuestion(q).valid).toBe(false);
	});

	test('invalid status fails', () => {
		const q = makeValidQuestion({ status: 'running' as never });
		expect(validateHumanQuestion(q).valid).toBe(false);
	});

	test('critical question cannot default ALLOW', () => {
		const q = makeValidQuestion({
			riskLevel: 'critical',
			defaultDecision: 'ALLOW',
			allowedDecisions: ['ALLOW', 'DENY', 'PAUSE_RUN'],
		});
		const result = validateHumanQuestion(q);
		expect(result.valid).toBe(false);
		expect(result.errors.some((e) => e.includes('critical'))).toBe(true);
	});

	test('critical question with DENY default passes', () => {
		const q = makeValidQuestion({
			riskLevel: 'critical',
			defaultDecision: 'DENY',
			allowedDecisions: ['DENY', 'PAUSE_RUN', 'ABORT_RUN'],
		});
		const result = validateHumanQuestion(q);
		expect(result.valid).toBe(true);
	});

	test('defaultDecision must be in allowedDecisions', () => {
		const q = makeValidQuestion({
			defaultDecision: 'ALLOW',
			allowedDecisions: ['DENY', 'PAUSE_RUN'],
		});
		const result = validateHumanQuestion(q);
		expect(result.valid).toBe(false);
		expect(result.errors.some((e) => e.includes('defaultDecision'))).toBe(true);
	});

	test('question with secret patterns fails', () => {
		const q = makeValidQuestion({
			question: 'Use token ghp_abcdefghijklmnopqrstuvwxyz1234567890AB',
		});
		const result = validateHumanQuestion(q);
		expect(result.valid).toBe(false);
		expect(result.errors.some((e) => e.includes('secret'))).toBe(true);
	});

	test('answerText with secret patterns fails', () => {
		const q = makeValidQuestion({
			answerText: 'My key is sk-abcdefghijklmnopqrstuvwxyz123456',
		});
		const result = validateHumanQuestion(q);
		expect(result.valid).toBe(false);
		expect(result.errors.some((e) => e.includes('answerText'))).toBe(true);
	});

	test('empty allowedDecisions fails', () => {
		const q = makeValidQuestion({ allowedDecisions: [] });
		const result = validateHumanQuestion(q);
		expect(result.valid).toBe(false);
		expect(result.errors.some((e) => e.includes('allowedDecisions'))).toBe(true);
	});

	test('null value fails', () => {
		expect(validateHumanQuestion(null).valid).toBe(false);
	});

	test('non-object value fails', () => {
		expect(validateHumanQuestion('string').valid).toBe(false);
	});
});

// ─── Answer Validation ──────────────────────────────────────────────────────

describe('validateHumanQuestionAnswer', () => {
	test('valid answer passes', () => {
		const q = makeValidQuestion();
		const input: AnswerHumanQuestionRequest = { decision: 'ALLOW' };
		const result = validateHumanQuestionAnswer(q, input);
		expect(result.valid).toBe(true);
	});

	test('answered question cannot be answered again', () => {
		const q = makeValidQuestion({ status: 'answered', decision: 'ALLOW' });
		const input: AnswerHumanQuestionRequest = { decision: 'DENY' };
		const result = validateHumanQuestionAnswer(q, input);
		expect(result.valid).toBe(false);
		expect(result.errors.some((e) => e.includes('already'))).toBe(true);
	});

	test('denied question cannot be answered again', () => {
		const q = makeValidQuestion({ status: 'denied', decision: 'DENY' });
		const input: AnswerHumanQuestionRequest = { decision: 'ALLOW' };
		const result = validateHumanQuestionAnswer(q, input);
		expect(result.valid).toBe(false);
		expect(result.errors.some((e) => e.includes('already'))).toBe(true);
	});

	test('expired question cannot be answered', () => {
		const q = makeValidQuestion({ status: 'expired' });
		const input: AnswerHumanQuestionRequest = { decision: 'ASK_MORE' };
		const result = validateHumanQuestionAnswer(q, input);
		expect(result.valid).toBe(false);
		expect(result.errors.some((e) => e.includes('expired'))).toBe(true);
	});

	test('cancelled question cannot be answered', () => {
		const q = makeValidQuestion({ status: 'cancelled' });
		const input: AnswerHumanQuestionRequest = { decision: 'ASK_MORE' };
		const result = validateHumanQuestionAnswer(q, input);
		expect(result.valid).toBe(false);
		expect(result.errors.some((e) => e.includes('cancelled'))).toBe(true);
	});

	test('ALLOW must be explicitly allowed', () => {
		const q = makeValidQuestion({
			allowedDecisions: ['DENY', 'PAUSE_RUN'],
		});
		const input: AnswerHumanQuestionRequest = { decision: 'ALLOW' };
		const result = validateHumanQuestionAnswer(q, input);
		expect(result.valid).toBe(false);
		expect(result.errors.some((e) => e.includes('not in allowed'))).toBe(true);
	});

	test('critical + ALLOW fails', () => {
		const q = makeValidQuestion({
			riskLevel: 'critical',
			allowedDecisions: ['ALLOW', 'DENY', 'PAUSE_RUN', 'ABORT_RUN'],
			defaultDecision: 'DENY',
		});
		const input: AnswerHumanQuestionRequest = { decision: 'ALLOW' };
		const result = validateHumanQuestionAnswer(q, input);
		expect(result.valid).toBe(false);
		expect(result.errors.some((e) => e.includes('critical'))).toBe(true);
	});

	test('answerText with secrets fails', () => {
		const q = makeValidQuestion();
		const input: AnswerHumanQuestionRequest = {
			decision: 'ALLOW',
			answerText: 'Use token sk-abcdefghijklmnopqrstuvwxyz123456',
		};
		const result = validateHumanQuestionAnswer(q, input);
		expect(result.valid).toBe(false);
		expect(result.errors.some((e) => e.includes('secret'))).toBe(true);
	});

	test('disallowed decision fails', () => {
		const q = makeValidQuestion({
			allowedDecisions: ['DENY', 'ASK_MORE'],
		});
		const input: AnswerHumanQuestionRequest = { decision: 'ABORT_RUN' };
		const result = validateHumanQuestionAnswer(q, input);
		expect(result.valid).toBe(false);
		expect(result.errors.some((e) => e.includes('not in allowed'))).toBe(true);
	});
});

// ─── Decision Helpers ───────────────────────────────────────────────────────

describe('Decision Helpers', () => {
	test('canAnswerHumanQuestion returns true for open', () => {
		const q = makeValidQuestion({ status: 'open' });
		expect(canAnswerHumanQuestion(q)).toBe(true);
	});

	test('canAnswerHumanQuestion returns false for answered', () => {
		const q = makeValidQuestion({ status: 'answered' });
		expect(canAnswerHumanQuestion(q)).toBe(false);
	});

	test('isDecisionAllowed respects allowedDecisions', () => {
		const q = makeValidQuestion({ allowedDecisions: ['ALLOW', 'DENY'] });
		expect(isDecisionAllowed(q, 'ALLOW')).toBe(true);
		expect(isDecisionAllowed(q, 'ABORT_RUN')).toBe(false);
	});

	test('getSafeDefaultDecisionForRisk — critical returns DENY', () => {
		expect(getSafeDefaultDecisionForRisk('critical')).toBe('DENY');
	});

	test('getSafeDefaultDecisionForRisk — high returns ASK_MORE', () => {
		expect(getSafeDefaultDecisionForRisk('high')).toBe('ASK_MORE');
	});

	test('getSafeDefaultDecisionForRisk — low returns ALLOW', () => {
		expect(getSafeDefaultDecisionForRisk('low')).toBe('ALLOW');
	});
});

// ─── Timeout Policy ─────────────────────────────────────────────────────────

describe('Timeout Policy', () => {
	test('timeout never ALLOW', () => {
		const q = makeValidQuestion({ riskLevel: 'low' });
		expect(getTimeoutDecision(q)).not.toBe('ALLOW');

		const q2 = makeValidQuestion({ riskLevel: 'high' });
		expect(getTimeoutDecision(q2)).not.toBe('ALLOW');

		const q3 = makeValidQuestion({ riskLevel: 'critical' });
		expect(getTimeoutDecision(q3)).not.toBe('ALLOW');
	});

	test('doesTimeoutProduceAllow is always false', () => {
		const q = makeValidQuestion();
		expect(doesTimeoutProduceAllow(q)).toBe(false);
	});

	test('timeout returns DENY for all risk levels', () => {
		for (const risk of ['low', 'medium', 'high', 'critical'] as const) {
			const q = makeValidQuestion({ riskLevel: risk });
			expect(getTimeoutDecision(q)).toBe('DENY');
		}
	});
});

// ─── Redaction ──────────────────────────────────────────────────────────────

describe('Redaction', () => {
	test('redactHumanAnswerText redacts ghp_ tokens', () => {
		const input = 'Use token ghp_abcdefghijklmnopqrstuvwxyz1234567890AB';
		const result = redactHumanAnswerText(input);
		expect(result).not.toContain('ghp_');
		expect(result).toContain('***-REDACTED-SECRET-***');
	});

	test('redactHumanAnswerText redacts sk- tokens', () => {
		const input = 'Key: sk-abcdefghijklmnopqrstuvwxyz1234567890abcdef';
		const result = redactHumanAnswerText(input);
		expect(result).not.toContain('sk-');
		expect(result).toContain('***-REDACTED-SECRET-***');
	});

	test('redactHumanAnswerText redacts github_pat_ tokens', () => {
		const input = 'PAT: github_pat_11ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890';
		const result = redactHumanAnswerText(input);
		expect(result).not.toContain('github_pat_');
		expect(result).toContain('***-REDACTED-SECRET-***');
	});

	test('redactHumanAnswerText redacts Bearer tokens', () => {
		const input = 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9';
		const result = redactHumanAnswerText(input);
		expect(result).not.toContain('Bearer ');
		expect(result).toContain('***-REDACTED-SECRET-***');
	});

	test('redactHumanAnswerText redacts anthropic_ keys', () => {
		const input = 'Key: anthropic_claude-v1-20240229';
		const result = redactHumanAnswerText(input);
		expect(result).not.toContain('anthropic_');
		expect(result).toContain('***-REDACTED-SECRET-***');
	});

	test('redactHumanAnswerText redacts AIza keys', () => {
		const input = 'Google key: AIzaSyD-abcdefghijklmnopqrstuvwxyz123456';
		const result = redactHumanAnswerText(input);
		expect(result).not.toContain('AIza');
		expect(result).toContain('***-REDACTED-SECRET-***');
	});

	test('redactHumanAnswerText redacts BEGIN PRIVATE KEY blocks', () => {
		const input = '-----BEGIN RSA PRIVATE KEY-----\nMIIBOgIBAAJBAKj34GkxFhD90vcNLYLInFEX6Ppy1tPf9Cn+tBhJQawE\n-----END RSA PRIVATE KEY-----';
		const result = redactHumanAnswerText(input);
		expect(result).not.toContain('BEGIN RSA PRIVATE KEY');
		expect(result).toContain('***-REDACTED-SECRET-***');
	});

	test('redactHumanAnswerText preserves clean text', () => {
		const input = 'I approve this action. Please proceed with caution.';
		const result = redactHumanAnswerText(input);
		expect(result).toBe(input);
	});

	test('containsSecretsPattern detects secrets', () => {
		expect(containsSecretsPattern('ghp_1234567890abcdef1234567890abcdef123456')).toBe(true);
		expect(containsSecretsPattern('No secrets here')).toBe(false);
		expect(containsSecretsPattern('Bearer token123')).toBe(true);
	});

	test('redacted evidence excludes raw answerText', () => {
		const q = makeValidQuestion({
			answerText: 'I approve this',
			decision: 'ALLOW',
		});
		const redacted = redactHumanQuestionForEvidence(q);
		expect(redacted.answerTextRedacted).toBe(true);
		expect((redacted as unknown as Record<string, unknown>).answerText).toBeUndefined();
	});

	test('redacted evidence preserves safe fields', () => {
		const q = makeValidQuestion();
		const redacted = redactHumanQuestionForEvidence(q);
		expect(redacted.id).toBe(q.id);
		expect(redacted.title).toBe(q.title);
		expect(redacted.riskLevel).toBe(q.riskLevel);
		expect(redacted.type).toBe(q.type);
		expect(redacted.answerTextRedacted).toBe(false);
		expect(redacted.hasBlockedSecrets).toBe(false);
	});

	test('redacted evidence flags secret-containing answerText', () => {
		const q = makeValidQuestion({
			answerText: 'Use token ghp_abcdefghijklmnopqrstuvwxyz1234567890AB',
		});
		const redacted = redactHumanQuestionForEvidence(q);
		expect(redacted.answerTextRedacted).toBe(true);
		expect(redacted.hasBlockedSecrets).toBe(true);
	});

	test('redacted evidence omits answerText entirely', () => {
		const q = makeValidQuestion({ answerText: 'Some text' });
		const redacted = redactHumanQuestionForEvidence(q);
		// answerText should not appear in the redacted version
		const keys = Object.keys(redacted);
		expect(keys).not.toContain('answerText');
	});
});

// ─── Evidence Building ─────────────────────────────────────────────────────

describe('Evidence Building', () => {
	test('buildHumanOversightEvidence creates valid evidence', () => {
		const q = makeValidQuestion({ decision: 'ALLOW' });
		const evidence = buildHumanOversightEvidence('human-question-answered', q);
		expect(evidence.eventType).toBe('human-question-answered');
		expect(evidence.questionId).toBe(q.id);
		expect(evidence.decision).toBe('ALLOW');
		expect(evidence.redactedQuestion.answerTextRedacted).toBeDefined();
		expect(evidence.timestamp).toBeDefined();
	});

	test('buildHumanOversightEvidence for denied question', () => {
		const q = makeValidQuestion({ decision: 'DENY' });
		const evidence = buildHumanOversightEvidence('human-question-denied', q);
		expect(evidence.eventType).toBe('human-question-denied');
		expect(evidence.decision).toBe('DENY');
	});

	test('evidence does not contain raw answerText', () => {
		const q = makeValidQuestion({
			answerText: 'sensitive info',
			decision: 'ALLOW',
		});
		const evidence = buildHumanOversightEvidence('human-question-answered', q);
		expect((evidence.redactedQuestion as unknown as Record<string, unknown>).answerText).toBeUndefined();
	});
});

// ─── ID Generation ──────────────────────────────────────────────────────────

describe('createHumanQuestionId', () => {
	test('generates unique IDs', () => {
		const ids = new Set<string>();
		for (let i = 0; i < 100; i++) {
			ids.add(createHumanQuestionId());
		}
		expect(ids.size).toBe(100);
	});

	test('ID starts with hq-', () => {
		const id = createHumanQuestionId();
		expect(id.startsWith('hq-')).toBe(true);
	});
});

// ─── Full Integration Scenarios ─────────────────────────────────────────────

describe('Integration Scenarios', () => {
	test('ALLOW works for permitted low-risk action', () => {
		const q = makeValidQuestion({
			riskLevel: 'low',
			allowedDecisions: ['ALLOW', 'DENY', 'ASK_MORE'],
			defaultDecision: 'ASK_MORE',
		});
		expect(validateHumanQuestion(q).valid).toBe(true);

		const input: AnswerHumanQuestionRequest = { decision: 'ALLOW' };
		expect(validateHumanQuestionAnswer(q, input).valid).toBe(true);
	});

	test('DENY works for any risk level', () => {
		for (const risk of ['low', 'medium', 'high', 'critical'] as const) {
			const q = makeValidQuestion({
				riskLevel: risk,
				allowedDecisions: ['DENY', 'ASK_MORE', 'PAUSE_RUN', 'ABORT_RUN'],
				defaultDecision: risk === 'critical' ? 'DENY' : 'ASK_MORE',
			});
			expect(validateHumanQuestion(q).valid).toBe(true);

			const input: AnswerHumanQuestionRequest = { decision: 'DENY' };
			expect(validateHumanQuestionAnswer(q, input).valid).toBe(true);
		}
	});

	test('PAUSE_RUN stores decision, no runtime action', () => {
		const q = makeValidQuestion({
			allowedDecisions: ['PAUSE_RUN', 'DENY'],
		});
		const input: AnswerHumanQuestionRequest = { decision: 'PAUSE_RUN' };
		expect(validateHumanQuestionAnswer(q, input).valid).toBe(true);
	});

	test('ABORT_RUN stores decision, no runtime action', () => {
		const q = makeValidQuestion({
			allowedDecisions: ['ABORT_RUN', 'DENY'],
		});
		const input: AnswerHumanQuestionRequest = { decision: 'ABORT_RUN' };
		expect(validateHumanQuestionAnswer(q, input).valid).toBe(true);
	});

	test('critical question with ALLOW blocked in validation', () => {
		const q = makeValidQuestion({
			riskLevel: 'critical',
			allowedDecisions: ['ALLOW', 'DENY', 'PAUSE_RUN'],
			defaultDecision: 'DENY',
		});
		// Question itself is valid (critical + DENY default is fine)
		expect(validateHumanQuestion(q).valid).toBe(true);
		// But ALLOW answer is blocked
		const input: AnswerHumanQuestionRequest = { decision: 'ALLOW' };
		expect(validateHumanQuestionAnswer(q, input).valid).toBe(false);
	});

	test('answer text with github token redacted before storage', () => {
		const input = 'Secret: ghp_1234567890abcdef1234567890abcdef123456';
		const redacted = redactHumanAnswerText(input);
		expect(redacted).not.toMatch(/ghp_/);
		expect(containsSecretsPattern(redacted)).toBe(false);
	});

	test('multiple secrets in answer text all redacted', () => {
		const input = 'ghp_aaa111bbb222ccc333ddd444eee555fff666ggg777 sk-proj-1234567890abcdef';
		const redacted = redactHumanAnswerText(input);
		expect(redacted).not.toMatch(/ghp_/);
		expect(redacted).not.toMatch(/sk-/);
	});
});
