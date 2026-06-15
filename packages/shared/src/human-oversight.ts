// Positron — Human Oversight: Question Types, Decisions, and Validation
// PR 7: Oversight UI Foundation + Human Question Queue
// This module defines the human oversight contract.
// No execution — decisions are stored, not acted upon.

// ─── Human Question Types ────────────────────────────────────────────────────

export type HumanQuestionType =
	| 'clarification'
	| 'approval'
	| 'risk_acceptance'
	| 'stop_ask'
	| 'missing_context'
	| 'tool_permission'
	| 'merge_approval'
	| 'provider_install_approval'
	| 'mcp_warmup_failure'
	| 'model_warmup_failure'
	| 'speckit_sync_failure'
	| 'blueprint_validation_failure'
	| 'blueprint_start_approval';

export const ALL_HUMAN_QUESTION_TYPES: readonly HumanQuestionType[] = [
	'clarification',
	'approval',
	'risk_acceptance',
	'stop_ask',
	'missing_context',
	'tool_permission',
	'merge_approval',
	'provider_install_approval',
	'mcp_warmup_failure',
	'model_warmup_failure',
	'speckit_sync_failure',
	'blueprint_validation_failure',
	'blueprint_start_approval',
];

export type HumanQuestionStatus =
	| 'open'
	| 'answered'
	| 'denied'
	| 'expired'
	| 'cancelled';

export const ALL_HUMAN_QUESTION_STATUSES: readonly HumanQuestionStatus[] = [
	'open',
	'answered',
	'denied',
	'expired',
	'cancelled',
];

export type HumanDecision =
	| 'ALLOW'
	| 'DENY'
	| 'ASK_MORE'
	| 'REQUIRE_DRY_RUN'
	| 'REQUIRE_BACKUP'
	| 'REQUIRE_REVIEW'
	| 'PAUSE_RUN'
	| 'ABORT_RUN';

export const ALL_HUMAN_DECISIONS: readonly HumanDecision[] = [
	'ALLOW',
	'DENY',
	'ASK_MORE',
	'REQUIRE_DRY_RUN',
	'REQUIRE_BACKUP',
	'REQUIRE_REVIEW',
	'PAUSE_RUN',
	'ABORT_RUN',
];

export type HumanRiskLevel = 'low' | 'medium' | 'high' | 'critical';

export const ALL_HUMAN_RISK_LEVELS: readonly HumanRiskLevel[] = [
	'low',
	'medium',
	'high',
	'critical',
];

export type HumanQuestionRequester =
	| 'positron'
	| 'opencode'
	| 'reviewer'
	| 'mcp'
	| 'system'
	| 'blueprint'
	| 'tool_gateway';

export const ALL_HUMAN_QUESTION_REQUESTERS: readonly HumanQuestionRequester[] = [
	'positron',
	'opencode',
	'reviewer',
	'mcp',
	'system',
	'blueprint',
	'tool_gateway',
];

// ─── Human Question Model ────────────────────────────────────────────────────

export interface HumanQuestion {
	id: string;
	runId?: string;
	issueNumber?: number;
	type: HumanQuestionType;
	status: HumanQuestionStatus;
	title: string;
	question: string;
	riskLevel: HumanRiskLevel;
	requestedBy: HumanQuestionRequester;
	relatedMcpServerId?: string;
	relatedToolName?: string;
	proposedAction?: string;
	target?: string;
	evidenceRefs: string[];
	allowedDecisions: HumanDecision[];
	defaultDecision: HumanDecision;
	createdAt: string;
	expiresAt?: string;
	answeredAt?: string;
	answerText?: string;
	decision?: HumanDecision;
	blockedReasons: string[];
}

// ─── Answer Request ──────────────────────────────────────────────────────────

export interface AnswerHumanQuestionRequest {
	decision: HumanDecision;
	answerText?: string;
	requireDryRun?: boolean;
	requireBackup?: boolean;
	requireReview?: boolean;
}

// ─── Redacted Question (for evidence/transport) ──────────────────────────────

export interface RedactedHumanQuestion {
	id: string;
	runId?: string;
	issueNumber?: number;
	type: HumanQuestionType;
	status: HumanQuestionStatus;
	title: string;
	question: string;
	riskLevel: HumanRiskLevel;
	requestedBy: HumanQuestionRequester;
	relatedMcpServerId?: string;
	relatedToolName?: string;
	proposedAction?: string;
	target?: string;
	evidenceRefs: string[];
	allowedDecisions: HumanDecision[];
	defaultDecision: HumanDecision;
	createdAt: string;
	expiresAt?: string;
	answeredAt?: string;
	// answerText is intentionally omitted
	decision?: HumanDecision;
	blockedReasons: string[];
	// Redaction metadata
	answerTextRedacted: boolean;
	hasBlockedSecrets: boolean;
}

// ─── Validation Result ───────────────────────────────────────────────────────

export interface HumanQuestionValidationResult {
	valid: boolean;
	errors: string[];
}

// ─── Attention Summary ───────────────────────────────────────────────────────

export interface OversightAttention {
	openQuestions: number;
	criticalQuestions: number;
	highRiskQuestions: number;
	runsWaitingForHuman: number;
}

// ─── Type Guards ─────────────────────────────────────────────────────────────

export function isHumanQuestionType(value: unknown): value is HumanQuestionType {
	return typeof value === 'string' && (ALL_HUMAN_QUESTION_TYPES as readonly string[]).includes(value);
}

export function isHumanQuestionStatus(value: unknown): value is HumanQuestionStatus {
	return typeof value === 'string' && (ALL_HUMAN_QUESTION_STATUSES as readonly string[]).includes(value);
}

export function isHumanDecision(value: unknown): value is HumanDecision {
	return typeof value === 'string' && (ALL_HUMAN_DECISIONS as readonly string[]).includes(value);
}

export function isHumanRiskLevel(value: unknown): value is HumanRiskLevel {
	return typeof value === 'string' && (ALL_HUMAN_RISK_LEVELS as readonly string[]).includes(value);
}

// ─── Validation ──────────────────────────────────────────────────────────────

export function validateHumanQuestion(value: unknown): HumanQuestionValidationResult {
	const errors: string[] = [];

	if (!value || typeof value !== 'object') {
		return { valid: false, errors: ['Value must be a non-null object'] };
	}

	const q = value as Record<string, unknown>;

	// Required string fields
	if (typeof q.id !== 'string' || q.id.length === 0) errors.push('id must be a non-empty string');
	if (typeof q.type !== 'string' || !isHumanQuestionType(q.type)) errors.push(`type must be a valid HumanQuestionType, got: ${String(q.type)}`);
	if (typeof q.status !== 'string' || !isHumanQuestionStatus(q.status)) errors.push(`status must be a valid HumanQuestionStatus, got: ${String(q.status)}`);
	if (typeof q.title !== 'string' || q.title.length === 0) errors.push('title must be a non-empty string');
	if (typeof q.question !== 'string' || q.question.length === 0) errors.push('question must be a non-empty string');
	if (typeof q.riskLevel !== 'string' || !isHumanRiskLevel(q.riskLevel)) errors.push(`riskLevel must be a valid HumanRiskLevel, got: ${String(q.riskLevel)}`);
	if (typeof q.requestedBy !== 'string' || !(ALL_HUMAN_QUESTION_REQUESTERS as readonly string[]).includes(q.requestedBy as string)) {
		errors.push(`requestedBy must be a valid HumanQuestionRequester, got: ${String(q.requestedBy)}`);
	}
	if (typeof q.defaultDecision !== 'string' || !isHumanDecision(q.defaultDecision)) errors.push(`defaultDecision must be a valid HumanDecision, got: ${String(q.defaultDecision)}`);
	if (typeof q.createdAt !== 'string' || q.createdAt.length === 0) errors.push('createdAt must be a non-empty string');

	// Evidence refs must be an array of strings
	if (!Array.isArray(q.evidenceRefs)) {
		errors.push('evidenceRefs must be an array');
	} else if (!q.evidenceRefs.every((r: unknown) => typeof r === 'string')) {
		errors.push('evidenceRefs must contain only strings');
	}

	// Allowed decisions must be an array of valid decisions
	if (!Array.isArray(q.allowedDecisions)) {
		errors.push('allowedDecisions must be an array');
	} else if (!q.allowedDecisions.every((d: unknown) => isHumanDecision(d))) {
		errors.push('allowedDecisions must contain only valid HumanDecision values');
	}

	// Blocked reasons must be an array of strings
	if (!Array.isArray(q.blockedReasons)) {
		errors.push('blockedReasons must be an array');
	}

	// ─── Safety Rules ──────────────────────────────────────────────────────

	// Critical risk must not default to ALLOW
	if (q.riskLevel === 'critical' && q.defaultDecision === 'ALLOW') {
		errors.push('SAFETY: critical risk level cannot default to ALLOW');
	}

	// Allowed decisions must not be empty
	if (Array.isArray(q.allowedDecisions) && q.allowedDecisions.length === 0) {
		errors.push('allowedDecisions cannot be empty');
	}

	// Default decision must be in allowedDecisions
	if (Array.isArray(q.allowedDecisions) && isHumanDecision(q.defaultDecision) && !q.allowedDecisions.includes(q.defaultDecision)) {
		errors.push('defaultDecision must be one of the allowedDecisions');
	}

	// Secret-like patterns in question text → fail (should not appear)
	if (typeof q.question === 'string' && containsSecretsPattern(q.question)) {
		errors.push('SAFETY: question text contains secret-like patterns');
	}
	if (typeof q.answerText === 'string' && containsSecretsPattern(q.answerText)) {
		errors.push('SAFETY: answerText contains secret-like patterns — must be redacted before storing');
	}

	return { valid: errors.length === 0, errors };
}

// ─── Answer Validation ───────────────────────────────────────────────────────

export function validateHumanQuestionAnswer(
	question: HumanQuestion,
	input: AnswerHumanQuestionRequest,
): HumanQuestionValidationResult {
	const errors: string[] = [];

	// Cannot answer an already answered/denied/expired question
	if (question.status === 'answered' || question.status === 'denied') {
		errors.push(`Question is already ${question.status} — cannot be answered again`);
	}
	if (question.status === 'expired') {
		errors.push('Question has expired — cannot be answered');
	}
	if (question.status === 'cancelled') {
		errors.push('Question has been cancelled — cannot be answered');
	}

	// Decision must be valid
	if (!isHumanDecision(input.decision)) {
		errors.push(`Invalid decision: ${String(input.decision)}`);
	}

	// Decision must be in allowedDecisions
	if (!question.allowedDecisions.includes(input.decision)) {
		errors.push(`Decision "${input.decision}" is not in allowed decisions: [${question.allowedDecisions.join(', ')}]`);
	}

	// ALLOW must be explicitly in allowedDecisions
	if (input.decision === 'ALLOW' && !question.allowedDecisions.includes('ALLOW')) {
		errors.push('ALLOW is not permitted for this question');
	}

	// Critical risk + ALLOW = universal block
	if (question.riskLevel === 'critical' && input.decision === 'ALLOW') {
		errors.push('SAFETY: ALLOW cannot be applied to questions with critical risk level');
	}

	// Answer text must not contain secrets
	if (input.answerText && containsSecretsPattern(input.answerText)) {
		errors.push('SAFETY: answerText contains secret-like patterns — redact before submitting');
	}

	return { valid: errors.length === 0, errors };
}

// ─── Decision Helpers ────────────────────────────────────────────────────────

export function canAnswerHumanQuestion(question: HumanQuestion): boolean {
	return question.status === 'open';
}

export function isDecisionAllowed(question: HumanQuestion, decision: HumanDecision): boolean {
	return question.allowedDecisions.includes(decision);
}

export function getSafeDefaultDecisionForRisk(riskLevel: HumanRiskLevel): HumanDecision {
	switch (riskLevel) {
		case 'critical':
			return 'DENY'; // Critical defaults to DENY, never ALLOW
		case 'high':
			return 'ASK_MORE';
		case 'medium':
			return 'ASK_MORE';
		case 'low':
			return 'ALLOW';
	}
}

// ─── Timeout Policy ──────────────────────────────────────────────────────────

/**
 * Returns the decision to apply when a question times out.
 * Timeout must NEVER result in ALLOW.
 */
export function getTimeoutDecision(_question: HumanQuestion): HumanDecision {
	// Safety: timeout always means DENY or PAUSE_RUN
	// For critical/high risk, DENY is the safe default
	// For medium/low, PAUSE_RUN keeps the run waiting for human
	return 'DENY';
}

/**
 * Checks whether a timeout for a given risk level would produce ALLOW.
 * This should ALWAYS be false.
 */
export function doesTimeoutProduceAllow(question: HumanQuestion): boolean {
	const decision = getTimeoutDecision(question);
	return decision === 'ALLOW';
}

// ─── Redaction ───────────────────────────────────────────────────────────────

const SECRET_PATTERNS = [
	/ghp_[a-zA-Z0-9]{36}/g,
	/github_pat_[a-zA-Z0-9_]{22,}/g,
	/sk-[a-zA-Z0-9\-_]{16,}/g,
	/AIza[0-9A-Za-z\-_]{35}/g,
	/anthropic_[a-zA-Z0-9\-_]{10,}/g,
	/Bearer\s+[a-zA-Z0-9\-_\.]+/g,
	/-----BEGIN\s.*PRIVATE KEY-----[\s\S]*?-----END\s.*PRIVATE KEY-----/g,
];

/**
 * Check if a string contains patterns that look like secrets.
 */
export function containsSecretsPattern(text: string): boolean {
	for (const pattern of SECRET_PATTERNS) {
		const testPattern = new RegExp(pattern.source, 'g');
		if (testPattern.test(text)) return true;
	}
	return false;
}

/**
 * Redact secrets from answer text.
 * This ensures no secrets end up in stored answers or evidence.
 */
export function redactHumanAnswerText(text: string): string {
	let redacted = text;
	for (const pattern of SECRET_PATTERNS) {
		redacted = redacted.replace(pattern, '***-REDACTED-SECRET-***');
	}
	return redacted;
}

/**
 * Redact a HumanQuestion for transport/evidence.
 * Answer text, raw tokens, and private paths are excluded.
 */
export function redactHumanQuestionForEvidence(question: HumanQuestion): RedactedHumanQuestion {
	const hasBlockedSecrets = question.answerText ? containsSecretsPattern(question.answerText) : false;
	const answerRedacted = !!question.answerText;

	// Check question text for secrets
	const questionHasSecrets = containsSecretsPattern(question.question);
	const safeQuestion = questionHasSecrets
		? redactHumanAnswerText(question.question)
		: question.question;

	const result: RedactedHumanQuestion = {
		id: question.id,
		runId: question.runId,
		issueNumber: question.issueNumber,
		type: question.type,
		status: question.status,
		title: question.title,
		riskLevel: question.riskLevel,
		requestedBy: question.requestedBy,
		relatedMcpServerId: question.relatedMcpServerId,
		relatedToolName: question.relatedToolName,
		proposedAction: question.proposedAction,
		target: question.target,
		evidenceRefs: question.evidenceRefs,
		allowedDecisions: question.allowedDecisions,
		defaultDecision: question.defaultDecision,
		createdAt: question.createdAt,
		expiresAt: question.expiresAt,
		answeredAt: question.answeredAt,
		decision: question.decision,
		blockedReasons: question.blockedReasons,
		question: safeQuestion,
		answerTextRedacted: answerRedacted,
		hasBlockedSecrets: hasBlockedSecrets || questionHasSecrets,
	};

	return result;
}

// ─── Evidence Event Types ────────────────────────────────────────────────────

export type HumanOversightEventType =
	| 'human-question-created'
	| 'human-question-answered'
	| 'human-question-denied'
	| 'human-decision-applied'
	| 'run-paused-by-human'
	| 'run-aborted-by-human'
	| 'human-question-expired';

export interface HumanOversightEvidence {
	eventType: HumanOversightEventType;
	questionId: string;
	runId?: string;
	issueNumber?: number;
	questionType: HumanQuestionType;
	riskLevel: HumanRiskLevel;
	decision?: HumanDecision;
	timestamp: string;
	redactedQuestion: RedactedHumanQuestion;
}

/**
 * Build an evidence record for a human oversight event.
 * All sensitive data is redacted.
 */
export function buildHumanOversightEvidence(
	eventType: HumanOversightEventType,
	question: HumanQuestion,
): HumanOversightEvidence {
	return {
		eventType,
		questionId: question.id,
		runId: question.runId,
		issueNumber: question.issueNumber,
		questionType: question.type,
		riskLevel: question.riskLevel,
		decision: question.decision,
		timestamp: new Date().toISOString(),
		redactedQuestion: redactHumanQuestionForEvidence(question),
	};
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Create a minimal valid question ID.
 */
export function createHumanQuestionId(): string {
	const timestamp = Date.now().toString(36);
	const random = Math.random().toString(36).substring(2, 10);
	return `hq-${timestamp}-${random}`;
}
