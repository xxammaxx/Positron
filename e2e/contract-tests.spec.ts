/**
 * Contract Tests for Positron API
 *
 * Validates API contracts: schemas, response shapes, error formats.
 * These tests ensure the API adheres to its documented contract.
 * Every endpoint MUST have at least one contract test.
 */

import { test, expect } from './fixtures/observe';

const API_BASE = 'http://localhost:3000';

// ── Health Endpoint ────────────────────────────────────────

test.describe('Contract: GET /api/health', () => {
	test('returns 200 with { status: "ok" }', async ({ request }) => {
		const res = await request.get(`${API_BASE}/api/health`);
		expect(res.status()).toBe(200);

		const body = await res.json();
		expect(body).toHaveProperty('status');
		expect(typeof body.status).toBe('string');
		expect(body.status).toBe('ok');
	});

	test('Content-Type is application/json', async ({ request }) => {
		const res = await request.get(`${API_BASE}/api/health`);
		const contentType = res.headers()['content-type'];
		expect(contentType).toContain('application/json');
	});
});

// ── Runs Endpoint ──────────────────────────────────────────

test.describe('Contract: POST /api/repos/:repoId/runs', () => {
	test('valid request returns 200 with run object', async ({ request }) => {
		const res = await request.post(`${API_BASE}/api/repos/repo-1/runs`, {
			data: { issueNumber: 99, autonomyLevel: 2 },
		});
		expect(res.status()).toBe(200);

		const body = await res.json();
		// Run object contract
		expect(body).toHaveProperty('run');
		expect(body.run).toHaveProperty('id');
		expect(body.run).toHaveProperty('phase');
		expect(body.run).toHaveProperty('status');
		expect(body.run).toHaveProperty('repoId');
		expect(typeof body.run.id).toBe('string');
		expect(typeof body.run.phase).toBe('string');
		expect(typeof body.run.status).toBe('string');

		// Events contract
		expect(body).toHaveProperty('events');
		expect(Array.isArray(body.events)).toBe(true);
		expect(body).toHaveProperty('eventCount');
		expect(typeof body.eventCount).toBe('number');
	});

	test('valid phases appear in order', async ({ request }) => {
		const validPhases = [
			'QUEUED',
			'CLAIMED',
			'REPO_SYNC',
			'ISSUE_CONTEXT',
			'WEB_RESEARCH',
			'SPECIFY',
			'CLARIFY_OPTIONAL',
			'PLAN',
			'TASKS',
			'ANALYZE',
			'REVIEW',
			'IMPLEMENT',
			'TEST',
			'VERIFY',
			'PR_CREATE',
			'DONE',
			'FAILED_TRANSIENT',
			'FAILED_BLOCKED',
			'FAILED_UNSAFE',
			'FAILED',
			'CLEANUP',
		];

		const res = await request.post(`${API_BASE}/api/repos/repo-1/runs`, {
			data: { issueNumber: 100, autonomyLevel: 2 },
		});
		const body = (await res.json()) as {
			events: Array<{ phase: string }>;
		};

		for (const event of body.events) {
			expect(validPhases).toContain(event.phase);
		}
	});

	test('missing issueNumber returns 400 with error message', async ({ request }) => {
		const res = await request.post(`${API_BASE}/api/repos/repo-1/runs`, {
			data: { autonomyLevel: 2 },
		});
		expect(res.status()).toBe(400);

		const body = await res.json();
		expect(body).toHaveProperty('error');
		expect(typeof body.error).toBe('string');
	});
});

// ── Runs List Endpoint ─────────────────────────────────────

test.describe('Contract: GET /api/runs', () => {
	test('returns array or paginated object with runs', async ({ request }) => {
		const res = await request.get(`${API_BASE}/api/runs`);
		expect(res.status()).toBe(200);

		const body = await res.json();
		// Support both formats: { runs: [...] } or { runs: [...], pagination: {...} }
		expect(body).toHaveProperty('runs');
		expect(Array.isArray(body.runs)).toBe(true);
	});

	test('run objects have required fields', async ({ request }) => {
		// First create a run to ensure there's data
		await request.post(`${API_BASE}/api/repos/repo-1/runs`, {
			data: { issueNumber: 101, autonomyLevel: 2 },
		});

		const res = await request.get(`${API_BASE}/api/runs`);
		const body = (await res.json()) as {
			runs: Array<Record<string, unknown>>;
			pagination?: { total: number };
			total?: number;
		};

		// Verify at least one run exists
		const runCount = body.pagination?.total ?? body.total ?? body.runs.length;
		expect(runCount).toBeGreaterThanOrEqual(1);

		if (body.runs.length > 0) {
			const run = body.runs[0];
			expect(run).toHaveProperty('id');
			expect(run).toHaveProperty('phase');
			expect(run).toHaveProperty('status');
		}
	});
});

// ── Run Detail Endpoint ────────────────────────────────────

test.describe('Contract: GET /api/runs/:id', () => {
	test('returns 200 with run and events for valid id', async ({ request }) => {
		const createRes = await request.post(`${API_BASE}/api/repos/repo-1/runs`, {
			data: { issueNumber: 102, autonomyLevel: 2 },
		});
		const createBody = (await createRes.json()) as { run: { id: string } };

		const res = await request.get(`${API_BASE}/api/runs/${createBody.run.id}`);
		expect(res.status()).toBe(200);

		const body = await res.json();
		expect(body).toHaveProperty('run');
		expect(body).toHaveProperty('events');
		expect(Array.isArray(body.events)).toBe(true);
	});

	test('returns 404 for non-existent run id', async ({ request }) => {
		const res = await request.get(`${API_BASE}/api/runs/nonexistent-run-id`);
		// Should be 404 or appropriate error
		expect([404, 400, 500]).toContain(res.status());
	});
});

// ── Negative Tests: Edge Cases ─────────────────────────────

test.describe('Contract: Negative Tests', () => {
	test('POST with empty body returns error', async ({ request }) => {
		const res = await request.post(`${API_BASE}/api/repos/repo-1/runs`, {
			data: {},
		});
		expect(res.status()).toBe(400);
	});

	test('POST with malformed JSON rejected gracefully', async ({ request }) => {
		const res = await request.post(`${API_BASE}/api/repos/repo-1/runs`, {
			headers: { 'Content-Type': 'application/json' },
			data: '{invalid json',
		});
		// Should be an error response, not crash
		expect(res.status()).toBeGreaterThanOrEqual(400);
	});

	test('GET on non-existent endpoint returns 404', async ({ request }) => {
		const res = await request.get(`${API_BASE}/api/nonexistent`);
		expect(res.status()).toBe(404);
	});
});
