// Positron — Oversight API Tests
// PR 7: Oversight UI Foundation + Human Question Queue
// Tests API endpoints, store, decision safety, and no-execution enforcement.

import { describe, expect, test, beforeAll, afterAll } from 'vitest';
import { createServer } from '../index.js';
import type http from 'node:http';

let server: http.Server;
let baseUrl: string;
const repository = { owner: 'test-owner', repo: 'test-repo' };

beforeAll(async () => {
	process.env.POSITRON_ADMIN_TOKEN = 'positron-admin-dev';
	server = createServer({ repository, dbPath: ':memory:' });
	await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
	const addr = server.address() as { port: number };
	baseUrl = `http://127.0.0.1:${addr.port}`;
});

afterAll(() => {
	process.env.POSITRON_ADMIN_TOKEN = undefined;
	server.close();
});

async function apiPost(path: string, body?: unknown) {
	return fetch(`${baseUrl}${path}`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: body ? JSON.stringify(body) : undefined,
	});
}

async function apiGet(path: string) {
	return fetch(`${baseUrl}${path}`);
}

// ─── Helper: create a question via direct backend injection ──────────────────
// Since there's no public POST /api/oversight/questions endpoint (questions are
// created internally by Positron), we create them through the store for testing.

async function createTestQuestion(overrides?: Record<string, unknown>) {
	const body = {
		id: `hq-test-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
		runId: 'test-run-001',
		issueNumber: 229,
		type: 'approval',
		status: 'open',
		title: 'Test Oversight Question',
		question: 'Should we proceed with this test action?',
		riskLevel: 'medium',
		requestedBy: 'positron',
		proposedAction: 'test_action',
		target: 'test-target',
		evidenceRefs: ['ev-1', 'ev-2'],
		allowedDecisions: ['ALLOW', 'DENY', 'ASK_MORE', 'PAUSE_RUN', 'ABORT_RUN'],
		defaultDecision: 'ASK_MORE',
		createdAt: new Date().toISOString(),
		blockedReasons: [],
		...overrides,
	};

	// Use the store directly to inject a question
	// Fetch first to trigger store init (server already running)
	// We need the server's store — but it's in-memory and private
	// For testing, we use the internal API by posting through the answer endpoint
	// Since we can't directly inject, we use a workaround:
	// Direct store access via dynamic import
	const { createHumanQuestion } = await import('../oversight/human-question-store.js');
	try {
		const q = createHumanQuestion(body as Parameters<typeof createHumanQuestion>[0]);
		return q;
	} catch {
		// Already exists, try to fetch it
		return body;
	}
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('GET /api/oversight/questions', () => {
	test('returns list (empty initially via API)', async () => {
		const res = await apiGet('/api/oversight/questions');
		expect(res.status).toBe(200);
		const data = await res.json();
		expect(data).toHaveProperty('questions');
		expect(data).toHaveProperty('total');
		expect(Array.isArray(data.questions)).toBe(true);
	});
});

describe('GET /api/oversight/questions/:id', () => {
	test('returns 404 for non-existent question', async () => {
		const res = await apiGet('/api/oversight/questions/non-existent-id');
		expect(res.status).toBe(404);
	});
});

describe('POST /api/oversight/questions/:id/answer', () => {
	test('answer with DENY works', async () => {
		const q = await createTestQuestion({ id: 'hq-test-deny-1' });
		const res = await apiPost(`/api/oversight/questions/${q.id}/answer`, {
			decision: 'DENY',
		});
		expect(res.status).toBe(200);
		const data = await res.json();
		expect(data.status).toBe('denied');
		expect(data.decision).toBe('DENY');
	});

	test('answer on answered question fails', async () => {
		const q = await createTestQuestion({ id: 'hq-test-answered-1' });
		// First answer
		await apiPost(`/api/oversight/questions/${q.id}/answer`, { decision: 'DENY' });
		// Second answer should fail
		const res = await apiPost(`/api/oversight/questions/${q.id}/answer`, { decision: 'ALLOW' });
		expect(res.status).toBe(400);
		const data = await res.json();
		expect(data.error).toBeDefined();
	});

	test('answer with disallowed decision fails', async () => {
		// Create a question where ALLOW is not allowed
		const q = await createTestQuestion({
			id: 'hq-test-no-allow-1',
			allowedDecisions: ['DENY', 'ASK_MORE', 'PAUSE_RUN'],
		});
		const res = await apiPost(`/api/oversight/questions/${q.id}/answer`, {
			decision: 'ALLOW',
		});
		expect(res.status).toBe(400);
	});

	test('answer without decision fails', async () => {
		const q = await createTestQuestion({ id: 'hq-test-no-decision-1' });
		const res = await apiPost(`/api/oversight/questions/${q.id}/answer`, {});
		expect(res.status).toBe(400);
	});

	test('critical + ALLOW blocked', async () => {
		const q = await createTestQuestion({
			id: 'hq-test-critical-1',
			riskLevel: 'critical',
			allowedDecisions: ['ALLOW', 'DENY', 'PAUSE_RUN'],
			defaultDecision: 'DENY',
		});
		const res = await apiPost(`/api/oversight/questions/${q.id}/answer`, {
			decision: 'ALLOW',
		});
		expect(res.status).toBe(400);
	});
});

describe('POST /api/oversight/questions/:id/pause-run', () => {
	test('stores decision only, no runtime action', async () => {
		const q = await createTestQuestion({
			id: 'hq-test-pause-1',
			allowedDecisions: ['PAUSE_RUN', 'DENY'],
		});
		const res = await apiPost(`/api/oversight/questions/${q.id}/pause-run`);
		expect(res.status).toBe(200);
		const data = await res.json();
		expect(data.ok).toBe(true);
		expect(data.decision).toBe('PAUSE_RUN');
		// Verify the note confirms no runtime action
		expect(data.note).toContain('No runtime action');
	});
});

describe('POST /api/oversight/questions/:id/abort-run', () => {
	test('stores decision only, no runtime action', async () => {
		const q = await createTestQuestion({
			id: 'hq-test-abort-1',
			allowedDecisions: ['ABORT_RUN', 'DENY'],
		});
		const res = await apiPost(`/api/oversight/questions/${q.id}/abort-run`);
		expect(res.status).toBe(200);
		const data = await res.json();
		expect(data.ok).toBe(true);
		expect(data.decision).toBe('ABORT_RUN');
		expect(data.note).toContain('No runtime action');
	});
});

describe('GET /api/oversight/attention', () => {
	test('returns attention summary', async () => {
		const res = await apiGet('/api/oversight/attention');
		expect(res.status).toBe(200);
		const data = await res.json();
		expect(data).toHaveProperty('openQuestions');
		expect(data).toHaveProperty('criticalQuestions');
		expect(data).toHaveProperty('highRiskQuestions');
		expect(data).toHaveProperty('runsWaitingForHuman');
		expect(typeof data.openQuestions).toBe('number');
		expect(typeof data.criticalQuestions).toBe('number');
	});
});

// ─── Safety: No Execute Endpoints ───────────────────────────────────────────

describe('Safety: No Execute Endpoints', () => {
	test('no POST /api/tool-gateway/execute', async () => {
		const res = await apiPost('/api/tool-gateway/execute', {});
		// Should not exist (404 or not allowed)
		expect([404, 405]).toContain(res.status);
	});

	test('no POST /api/tool-gateway/tools/:id/run', async () => {
		const res = await apiPost('/api/tool-gateway/tools/test/run', {});
		expect([404, 405]).toContain(res.status);
	});

	test('no POST /api/oversight/execute', async () => {
		const res = await apiPost('/api/oversight/execute', {});
		expect(res.status).toBe(404);
	});

	test('no execute button endpoint exists', async () => {
		// Verify Tool Gateway remains read-only
		const res = await apiGet('/api/tool-gateway/status');
		expect(res.status).toBe(200);
		const data = await res.json();
		// Gateway should be disabled by default
		expect(data.gatewayEnabled).toBe(false);
	});
});

// ─── Answer Redaction ───────────────────────────────────────────────────────

describe('Answer Redaction in API', () => {
	test('secret-like patterns in answerText are redacted', async () => {
		const q = await createTestQuestion({
			id: `hq-test-redact-1-${Date.now()}`,
			allowedDecisions: ['ALLOW', 'DENY', 'ASK_MORE'],
		});
		// Submit answer with a github token
		const res = await apiPost(`/api/oversight/questions/${q.id}/answer`, {
			decision: 'ALLOW',
			answerText: 'Use token ghp_1234567890abcdef1234567890abcdef123456',
		});
		// Should fail because answerText contains secrets
		expect(res.status).toBe(400);
	});

	test('clean answerText passes through', async () => {
		const q = await createTestQuestion({
			id: `hq-test-clean-1-${Date.now()}`,
		});
		const res = await apiPost(`/api/oversight/questions/${q.id}/answer`, {
			decision: 'ALLOW',
			answerText: 'I approve this action.',
		});
		expect(res.status).toBe(200);
	});
});
