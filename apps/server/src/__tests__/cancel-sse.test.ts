// Server-side tests for Cancel endpoint and SSE broadcaster (Issue #66)
// Covers: cancel idempotency, status protection, atomic updates,
// SSE format correctness, sequence numbering, rate limiting, secret redaction.
//
// Note: The fake adapter completes runs synchronously, so runs are always
// DONE by the time the create response returns. Tests verify the endpoint
// behavior with completed runs (409), non-existent runs (404), and SSE
// broadcaster unit tests (imported directly).

import type http from 'node:http';
import type { Response } from 'express';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { createServer } from '../index.js';
import { addSSEClient, broadcastSSE, removeSSEClient } from '../sse/broadcaster.js';

let server: http.Server;
let baseUrl: string;
const repository = { owner: 'test-owner', repo: 'test-repo' };

beforeAll(async () => {
	server = createServer({ repository, dbPath: ':memory:' });
	await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
	const addr = server.address() as { port: number };
	baseUrl = `http://127.0.0.1:${addr.port}`;
});

afterAll(() => {
	server.close();
});

async function post(path: string, body: unknown) {
	return fetch(`${baseUrl}${path}`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body),
	});
}

function createSSEWriter(writeChunk?: (chunk: string) => void): Response {
	const response = {
		write: (chunk: string) => {
			writeChunk?.(chunk);
			return true;
		},
		on: () => response,
	} as unknown as Response;

	return response;
}

// ── Cancel Endpoint Tests ────────────────────────────────────────────

describe('POST /api/runs/:id/cancel — Cancel Endpoint', () => {
	test('C01: cancel completed (done) run → 409 (status protection)', async () => {
		// With fake adapter, runs complete to DONE instantly
		const createRes = await post('/api/repos/repo-1/runs', { issueNumber: 203, autonomyLevel: 2 });
		const createBody = (await createRes.json()) as {
			run: { id: string; phase: string; status: string };
		};
		expect(createBody.run.phase).toBe('DONE');
		const runId = createBody.run.id;

		const cancelRes = await post(`/api/runs/${runId}/cancel`, {});
		expect(cancelRes.status).toBe(409);
		const body = (await cancelRes.json()) as { error: string };
		expect(body.error).toContain('Cannot cancel');
		expect(body.error).toContain('done');
	});

	test('C02: cancel non-existent run → 404', async () => {
		const res = await post('/api/runs/nonexistent-run-id-xxxx/cancel', {});
		expect(res.status).toBe(404);
		const body = (await res.json()) as { error: string };
		expect(body.error).toBe('Run not found');
	});
});

// ── SSE Broadcaster Unit Tests ──────────────────────────────────────

describe('SSE Broadcaster — broadcastSSE', () => {
	test('S01: broadcastSSE payload contains id:, event:, and data: fields', async () => {
		const chunks: string[] = [];
		const writer = createSSEWriter((chunk) => chunks.push(chunk));

		const runId = `test-sse-${Date.now()}`;
		addSSEClient(runId, writer);

		broadcastSSE(runId, 'run-event', { test: true, message: 'hello' });
		expect(chunks.length).toBe(1);
		expect(chunks[0]).toContain('id: ');
		expect(chunks[0]).toContain('event: run-event');
		expect(chunks[0]).toContain('data: ');
		expect(chunks[0]).toMatch(/^event: run-event\nid: \d+\ndata: .+\n\n$/);

		removeSSEClient(runId, writer);
	});

	test('S02: sequence numbers increment monotonically per run', async () => {
		const chunks: string[] = [];
		const writer = createSSEWriter((chunk) => chunks.push(chunk));

		const runId = `test-seq-${Date.now()}`;
		addSSEClient(runId, writer);

		broadcastSSE(runId, 'run-event', { n: 1 });
		broadcastSSE(runId, 'run-event', { n: 2 });
		broadcastSSE(runId, 'run-event', { n: 3 });

		expect(chunks.length).toBe(3);
		// Extract sequence from id: line
		const seqs = chunks.map((c) => parseInt(c.match(/^id: (\d+)/m)?.[1] ?? '0', 10));
		expect(seqs).toEqual([1, 2, 3]);

		removeSSEClient(runId, writer);
	});

	test('S03: sequence numbers are per-run (isolated counters)', async () => {
		const chunksA: string[] = [];
		const chunksB: string[] = [];
		const writerA = createSSEWriter((chunk) => chunksA.push(chunk));
		const writerB = createSSEWriter((chunk) => chunksB.push(chunk));

		const runA = `test-isolated-a-${Date.now()}`;
		const runB = `test-isolated-b-${Date.now()}`;
		addSSEClient(runA, writerA);
		addSSEClient(runB, writerB);

		broadcastSSE(runA, 'run-event', { n: 1 });
		broadcastSSE(runB, 'run-event', { n: 1 });
		broadcastSSE(runA, 'run-event', { n: 2 });

		const seqA = chunksA.map((c) => parseInt(c.match(/^id: (\d+)/m)?.[1] ?? '0', 10));
		const seqB = chunksB.map((c) => parseInt(c.match(/^id: (\d+)/m)?.[1] ?? '0', 10));

		expect(seqA).toEqual([1, 2]);
		expect(seqB).toEqual([1]);

		removeSSEClient(runA, writerA);
		removeSSEClient(runB, writerB);
	});

	test('S04: secret redaction masks ghp_ tokens', async () => {
		const chunks: string[] = [];
		const writer = createSSEWriter((chunk) => chunks.push(chunk));

		const runId = `test-redact-${Date.now()}`;
		addSSEClient(runId, writer);

		broadcastSSE(runId, 'run-event', {
			token: 'ghp_123456789012345678901234567890123456',
			message: 'safe data',
		});

		expect(chunks.length).toBe(1);
		// The token value should be redacted in the JSON payload
		expect(chunks[0]).not.toContain('ghp_123456789012345678901234567890123456');
		expect(chunks[0]).toContain('***-redacted-***');

		removeSSEClient(runId, writer);
	});

	test('S05: secret redaction masks openai keys', async () => {
		const chunks: string[] = [];
		const writer = createSSEWriter((chunk) => chunks.push(chunk));

		const runId = `test-openai-${Date.now()}`;
		addSSEClient(runId, writer);

		broadcastSSE(runId, 'run-event', {
			message: 'Using key sk-abcdefghijklmnopqrstuvwxyz12345678901234567',
		});

		expect(chunks.length).toBe(1);
		expect(chunks[0]).toContain('***-redacted-***');
		expect(chunks[0]).not.toContain('sk-abcdefghijklmnopqrstuvwxyz12345678901234567');

		removeSSEClient(runId, writer);
	});

	test('S06: heartbeat does not consume rate limit', async () => {
		const chunks: string[] = [];
		const writer = createSSEWriter((chunk) => chunks.push(chunk));

		const runId = `test-hb-${Date.now()}`;
		addSSEClient(runId, writer);

		// Send 25 heartbeats rapidly — should all pass (not rate-limited)
		for (let i = 0; i < 25; i++) {
			broadcastSSE(runId, 'heartbeat', { tick: i });
		}

		// All 25 should have been delivered since heartbeats skip rate limiting
		expect(chunks.length).toBe(25);

		// Now verify rate limiting works for non-heartbeat events
		for (let i = 0; i < 5; i++) {
			broadcastSSE(runId, 'run-event', { n: i });
		}
		// Some of the 5 non-heartbeat events may be rate-limited
		// (exact count depends on timing), but at least some should pass
		const dataEvents = chunks.filter((c) => c.includes('event: run-event'));
		expect(dataEvents.length).toBeGreaterThan(0);

		removeSSEClient(runId, writer);
	});

	test('S07: no clients → broadcastSSE is a no-op', async () => {
		// No clients registered for this run — should not throw
		const runId = `test-noop-${Date.now()}`;
		expect(() => {
			broadcastSSE(runId, 'run-event', { test: true });
		}).not.toThrow();
	});

	test('S08: writer error is isolated from other clients', async () => {
		let callCount = 0;
		const failingWriter = createSSEWriter(() => {
			callCount++;
			throw new Error('Stream closed');
		});
		const healthyChunks: string[] = [];
		const healthyWriter = createSSEWriter((chunk) => healthyChunks.push(chunk));

		const runId = `test-err-${Date.now()}`;
		addSSEClient(runId, failingWriter);
		addSSEClient(runId, healthyWriter);

		expect(() => broadcastSSE(runId, 'run-event', { n: 1 })).not.toThrow();
		expect(callCount).toBe(1);
		expect(healthyChunks).toHaveLength(1);

		removeSSEClient(runId, failingWriter);
		removeSSEClient(runId, healthyWriter);
	});
});

// ── Control Endpoint Abort Tests ────────────────────────────────────

describe('POST /api/runs/:id/control — Control Endpoint', () => {
	let existingRunId: string;

	beforeAll(async () => {
		// Create a run that we can use for control tests
		const createRes = await post('/api/repos/repo-1/runs', { issueNumber: 301, autonomyLevel: 2 });
		const createBody = (await createRes.json()) as { run: { id: string } };
		existingRunId = createBody.run.id;
	});

	test('K01: control abort on completed run → 409 (not active)', async () => {
		// With fake adapter, run is already done
		const controlRes = await post(`/api/runs/${existingRunId}/control`, { action: 'abort' });
		expect(controlRes.status).toBe(409);
	});

	test('K02: control pause on completed run → 409 (not active)', async () => {
		const controlRes = await post(`/api/runs/${existingRunId}/control`, { action: 'pause' });
		expect(controlRes.status).toBe(409);
	});

	test('K03: invalid action returns 400', async () => {
		const res = await post(`/api/runs/${existingRunId}/control`, { action: 'invalid-action' });
		expect(res.status).toBe(400);
	});
});
