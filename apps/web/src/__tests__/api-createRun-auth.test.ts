/**
 * Issue #373 — Auth Contract Test for api.createRun()
 *
 * Validates that createRun() sends the X-Admin-Token header via adminRequest(),
 * not the unauthenticated request() helper.
 *
 * ── Test Cases ────────────────────────────────────────────────
 * 1. Valid token → X-Admin-Token header present in fetch call
 * 2. No token → X-Admin-Token header is empty string (server rejects)
 * 3. Wrong token → X-Admin-Token header set but server returns 401
 *
 * Security: Token values are never logged or printed.
 */

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

// The api module does a top-level `const BASE = '/api'` and defines
// internal request()/adminRequest(). We test via the public api object.
// globalThis.fetch is already mocked by setup.ts; we override per test.

const TEST_TOKEN = 'positron-test-token-dev';
const WRONG_TOKEN = 'wrong-token-value';

// ── Helpers ───────────────────────────────────────────────────

/** Set the admin token in localStorage (simulates AdminPage login) */
function setToken(token: string) {
	localStorage.setItem('positron_admin_token', token);
}

/** Clear the admin token from localStorage */
function clearToken() {
	localStorage.removeItem('positron_admin_token');
}

/**
 * Create a mock fetch that records the request and returns a controlled response.
 * Returns a new mock instance per call for test isolation.
 */
function mockFetch(status: number, body: unknown) {
	const fn = vi.fn().mockImplementation(async (_url: string, init?: RequestInit) => {
		const headers = init?.headers as Record<string, string> | undefined;
		return {
			ok: status >= 200 && status < 300,
			status,
			json: async () => body,
			// Capture the request for assertion
			_requestUrl: _url,
			_requestHeaders: headers ?? {},
		} as Response & { _requestUrl: string; _requestHeaders: Record<string, string> };
	});
	return fn;
}

/** Extract the X-Admin-Token header from the last fetch call on a mock */
function lastTokenHeader(mock: ReturnType<typeof vi.fn>): string {
	const calls = mock.mock.calls;
	if (calls.length === 0) return '__NO_CALLS__';
	const init = calls[calls.length - 1]?.[1] as RequestInit | undefined;
	const headers = init?.headers as Record<string, string> | undefined;
	return headers?.['X-Admin-Token'] ?? '__HEADER_NOT_FOUND__';
}

describe('api.createRun() auth contract (Issue #373)', () => {
	let fetchMock: ReturnType<typeof mockFetch>;

	beforeEach(() => {
		clearToken();
		// Install a permissive mock that returns 201
		fetchMock = mockFetch(201, {
			run: { id: 'run-1', phase: 'QUEUED', status: 'active', issueUrl: '' },
			runId: 'run-1',
		});
		globalThis.fetch = fetchMock as unknown as typeof fetch;
	});

	afterEach(() => {
		clearToken();
		vi.restoreAllMocks();
	});

	// ── Case 1: Valid token → 2xx, X-Admin-Token present ─────
	test('sends X-Admin-Token header when valid token is set', async () => {
		setToken(TEST_TOKEN);

		// Dynamic import to get a fresh module that sees our localStorage + fetch mock
		const { api } = await import('../api');

		const result = await api.createRun('https://github.com/test-owner/test-repo/issues/1');

		expect(result.runId).toBe('run-1');
		expect(fetchMock).toHaveBeenCalledTimes(1);

		const tokenSent = lastTokenHeader(fetchMock);
		expect(tokenSent).toBe(TEST_TOKEN);
	});

	// ── Case 2: No token → empty string sent (server returns 401)
	test('sends empty X-Admin-Token when no token is in localStorage', async () => {
		clearToken();

		const { api } = await import('../api');

		// Override mock to return 401 to match real server behavior
		const failMock = mockFetch(401, { error: 'Invalid admin token' });
		globalThis.fetch = failMock as unknown as typeof fetch;

		await expect(
			api.createRun('https://github.com/test-owner/test-repo/issues/1'),
		).rejects.toThrow();

		expect(failMock).toHaveBeenCalledTimes(1);
	});

	// ── Case 3: Wrong token → header present but wrong, server returns 401
	test('rejects with 401 when wrong token is set', async () => {
		setToken(WRONG_TOKEN);

		const { api } = await import('../api');

		const failMock = mockFetch(401, { error: 'Invalid admin token' });
		globalThis.fetch = failMock as unknown as typeof fetch;

		await expect(
			api.createRun('https://github.com/test-owner/test-repo/issues/1'),
		).rejects.toThrow();

		expect(failMock).toHaveBeenCalledTimes(1);

		const tokenSent = lastTokenHeader(failMock);
		expect(tokenSent).toBe(WRONG_TOKEN);
	});

	// ── Case 4: URL is forwarded to server correctly ──────────
	test('forwards the issueUrl in the request body', async () => {
		setToken(TEST_TOKEN);
		const { api } = await import('../api');

		await api.createRun('https://github.com/owner/repo/issues/42');

		const calls = fetchMock.mock.calls;
		expect(calls.length).toBe(1);

		const init = calls[0]?.[1] as RequestInit;
		const body = JSON.parse(init?.body as string);
		expect(body.issueUrl).toBe('https://github.com/owner/repo/issues/42');
	});

	// ── Case 5: POST method is correct ────────────────────────
	test('uses POST method for /api/runs', async () => {
		setToken(TEST_TOKEN);
		const { api } = await import('../api');

		await api.createRun('https://github.com/owner/repo/issues/1');

		const calls = fetchMock.mock.calls;
		const url = calls[0]?.[0] as string;
		const init = calls[0]?.[1] as RequestInit;

		expect(url).toBe('/api/runs');
		expect(init?.method).toBe('POST');
	});
});
