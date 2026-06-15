// Positron — Human Question Store (In-Memory)
// PR 7: Oversight UI Foundation + Human Question Queue
//
// This store manages HumanQuestion lifecycle: create, list, answer, cancel, expire.
// It stores decisions ONLY — no tool execution, no OpenCode/MCP/Spec Kit runtime.

import type {
	HumanQuestion,
	HumanQuestionStatus,
	HumanDecision,
	AnswerHumanQuestionRequest,
	OversightAttention,
	HumanRiskLevel,
} from '@positron/shared';

// ─── In-Memory Store ─────────────────────────────────────────────────────────

const questions: Map<string, HumanQuestion> = new Map();

// ─── Store Operations ────────────────────────────────────────────────────────

export function createHumanQuestion(question: HumanQuestion): HumanQuestion {
	if (questions.has(question.id)) {
		throw new Error(`HumanQuestion with id "${question.id}" already exists`);
	}
	questions.set(question.id, { ...question });
	return { ...question };
}

export function listHumanQuestions(
	filter?: { status?: HumanQuestionStatus; runId?: string },
): HumanQuestion[] {
	let results = Array.from(questions.values());

	if (filter?.status) {
		results = results.filter((q) => q.status === filter.status);
	}
	if (filter?.runId) {
		results = results.filter((q) => q.runId === filter.runId);
	}

	// Sort by creation date, newest first
	return results.sort(
		(a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
	);
}

export function getHumanQuestion(id: string): HumanQuestion | undefined {
	const q = questions.get(id);
	return q ? { ...q } : undefined;
}

export function answerHumanQuestion(
	id: string,
	input: AnswerHumanQuestionRequest,
): HumanQuestion {
	const q = questions.get(id);
	if (!q) {
		throw new Error(`HumanQuestion "${id}" not found`);
	}

	const updated: HumanQuestion = {
		...q,
		status: input.decision === 'DENY' ? 'denied' : 'answered',
		decision: input.decision,
		answerText: input.answerText,
		answeredAt: new Date().toISOString(),
	};

	questions.set(id, updated);
	return { ...updated };
}

export function cancelHumanQuestion(id: string): HumanQuestion {
	const q = questions.get(id);
	if (!q) {
		throw new Error(`HumanQuestion "${id}" not found`);
	}

	const updated: HumanQuestion = {
		...q,
		status: 'cancelled',
		answeredAt: new Date().toISOString(),
	};

	questions.set(id, updated);
	return { ...updated };
}

export function expireHumanQuestion(id: string): HumanQuestion {
	const q = questions.get(id);
	if (!q) {
		throw new Error(`HumanQuestion "${id}" not found`);
	}

	const updated: HumanQuestion = {
		...q,
		status: 'expired',
		// Timeout never ALLOWs — default to DENY
		decision: 'DENY',
		answeredAt: new Date().toISOString(),
	};

	questions.set(id, updated);
	return { ...updated };
}

export function getOversightAttention(): OversightAttention {
	const all = Array.from(questions.values());
	const open = all.filter((q) => q.status === 'open');

	// Count unique runIds among open questions
	const runIds = new Set(open.filter((q) => q.runId).map((q) => q.runId!));

	return {
		openQuestions: open.length,
		criticalQuestions: open.filter((q) => q.riskLevel === 'critical').length,
		highRiskQuestions: open.filter((q) => q.riskLevel === 'high').length,
		runsWaitingForHuman: runIds.size,
	};
}

// ─── Timeout Sweep ───────────────────────────────────────────────────────────

/**
 * Check for expired questions and auto-expire them.
 * Timeout decision is always DENY (never ALLOW).
 * Returns the list of expired question IDs.
 */
export function sweepExpiredQuestions(now: Date = new Date()): string[] {
	const expired: string[] = [];
	const nowIso = now.toISOString();

	for (const [id, q] of questions) {
		if (q.status !== 'open') continue;
		if (q.expiresAt && q.expiresAt < nowIso) {
			try {
				expireHumanQuestion(id);
				expired.push(id);
			} catch {
				// already expired or removed
			}
		}
	}

	return expired;
}

// ─── Question Creation Helper ────────────────────────────────────────────────

export function countQuestionsByRisk(riskLevel: HumanRiskLevel): number {
	return Array.from(questions.values()).filter(
		(q) => q.status === 'open' && q.riskLevel === riskLevel,
	).length;
}

/**
 * Clear all questions (mainly for testing).
 */
export function clearAllQuestions(): void {
	questions.clear();
}

/**
 * Get total count of all questions regardless of status.
 */
export function totalQuestionCount(): number {
	return questions.size;
}
