/**
 * Issue #373 — Complete Auth Contract Parity Test
 *
 * Validates that ALL requireAdmin-protected client write methods
 * in api.ts use adminRequest() (sending X-Admin-Token header),
 * not the unauthenticated request() helper.
 *
 * Also validates that public GET endpoints remain unchanged
 * and do NOT receive an admin header.
 *
 * ── Auth Contract ────────────────────────────────────────────
 * READ endpoint → request()  (no auth needed)
 * ADMIN-PROTECTED WRITE endpoint → adminRequest()
 *
 * ── Security ─────────────────────────────────────────────────
 * Token values are never logged or printed.
 * Test token is test-only: positron-test-token-dev
 */

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

const TEST_TOKEN = 'positron-test-token-dev';
const WRONG_TOKEN = 'wrong-token-value';

// ── Helpers ───────────────────────────────────────────────────

function setToken(token: string) {
	localStorage.setItem('positron_admin_token', token);
}

function clearToken() {
	localStorage.removeItem('positron_admin_token');
}

function mockFetch(status: number, body: unknown) {
	const fn = vi.fn().mockImplementation(async (_url: string, init?: RequestInit) => {
		const headers = init?.headers as Record<string, string> | undefined;
		return {
			ok: status >= 200 && status < 300,
			status,
			json: async () => body,
			_requestUrl: _url,
			_requestHeaders: headers ?? {},
		} as Response & {
			_requestUrl: string;
			_requestHeaders: Record<string, string>;
		};
	});
	return fn;
}

function lastTokenHeader(mock: ReturnType<typeof vi.fn>): string {
	const calls = mock.mock.calls;
	if (calls.length === 0) return '__NO_CALLS__';
	const init = calls[calls.length - 1]?.[1] as RequestInit | undefined;
	const headers = init?.headers as Record<string, string> | undefined;
	return headers?.['X-Admin-Token'] ?? '__HEADER_NOT_FOUND__';
}

function lastUrl(mock: ReturnType<typeof vi.fn>): string {
	const calls = mock.mock.calls;
	return (calls[calls.length - 1]?.[0] as string) ?? '__NO_URL__';
}

function lastMethod(mock: ReturnType<typeof vi.fn>): string {
	const calls = mock.mock.calls;
	const init = calls[calls.length - 1]?.[1] as RequestInit | undefined;
	return init?.method ?? '__NO_METHOD__';
}

function lastBody(mock: ReturnType<typeof vi.fn>): unknown {
	const calls = mock.mock.calls;
	const init = calls[calls.length - 1]?.[1] as RequestInit | undefined;
	try {
		return JSON.parse(init?.body as string);
	} catch {
		return init?.body;
	}
}

// ── Shared permissive mock ────────────────────────────────────

const OK_BODY = { success: true, ok: true };

// ════════════════════════════════════════════════════════════════
// Protected Write Endpoints — Must send X-Admin-Token
// ════════════════════════════════════════════════════════════════

describe('Auth Contract: Protected Write Endpoints (Issue #373)', () => {
	beforeEach(() => {
		clearToken();
	});

	afterEach(() => {
		clearToken();
		vi.restoreAllMocks();
	});

	// ── Type helpers ─────────────────────────────────────────
	const importFn = () => import('../api');
	type ApiType = Awaited<ReturnType<typeof importFn>>['api'];

	// ── Table-driven auth header test ────────────────────────

	const protectedMethods = [
		{
			name: 'createRepo',
			call: (api: ApiType) => api.createRepo('test-owner', 'test-repo'),
			endpoint: '/api/repos',
			method: 'POST',
			bodyKeys: ['owner', 'name'],
		},
		{
			name: 'startRun',
			call: (api: ApiType) => api.startRun('repo-1', 42, 3),
			endpoint: '/api/repos/repo-1/runs',
			method: 'POST',
			bodyKeys: ['issueNumber', 'autonomyLevel'],
		},
		{
			name: 'controlRun',
			call: (api: ApiType) => api.controlRun('run-1', 'pause'),
			endpoint: '/api/runs/run-1/control',
			method: 'POST',
			bodyKeys: ['action'],
		},
		{
			name: 'approveGate',
			call: (api: ApiType) => api.approveGate('run-1', 'looks good'),
			endpoint: '/api/runs/run-1/gate',
			method: 'POST',
			bodyKeys: ['action', 'reason'],
		},
		{
			name: 'reviseGate',
			call: (api: ApiType) => api.reviseGate('run-1', 'needs work'),
			endpoint: '/api/runs/run-1/gate',
			method: 'POST',
			bodyKeys: ['action', 'reason'],
		},
		{
			name: 'saveEvidence',
			call: (api: ApiType) => api.saveEvidence('run-1', 'test-report', '{"pass":true}'),
			endpoint: '/api/evidence',
			method: 'POST',
			bodyKeys: ['runId', 'kind', 'content'],
		},
		{
			name: 'updateSafety',
			call: (api: ApiType) => api.updateSafety('enableMerge', true),
			endpoint: '/api/safety',
			method: 'POST',
			bodyKeys: ['key', 'value'],
		},
		{
			name: 'cancelRun',
			call: (api: ApiType) => api.cancelRun('run-1'),
			endpoint: '/api/runs/run-1/cancel',
			method: 'POST',
			bodyKeys: [],
		},
	];

	for (const entry of protectedMethods) {
		describe(`api.${entry.name}()`, () => {
			// Test 1: Valid token → X-Admin-Token present
			test('sends X-Admin-Token header with valid token', async () => {
				setToken(TEST_TOKEN);
				const fm = mockFetch(201, OK_BODY);
				globalThis.fetch = fm as unknown as typeof fetch;

				const { api } = await importFn();
				await entry.call(api);

				expect(fm).toHaveBeenCalledTimes(1);
				expect(lastTokenHeader(fm)).toBe(TEST_TOKEN);
			});

			// Test 2: No token → empty string sent → server rejects
			test('rejects when no token is in localStorage (server 401)', async () => {
				clearToken();
				const fm = mockFetch(401, { error: 'Invalid admin token' });
				globalThis.fetch = fm as unknown as typeof fetch;

				const { api } = await importFn();
				await expect(entry.call(api)).rejects.toThrow();
				expect(fm).toHaveBeenCalledTimes(1);
			});

			// Test 3: Wrong token → X-Admin-Token present but server returns 401
			test('sends wrong token header (server returns 401)', async () => {
				setToken(WRONG_TOKEN);
				const fm = mockFetch(401, { error: 'Invalid admin token' });
				globalThis.fetch = fm as unknown as typeof fetch;

				const { api } = await importFn();
				await expect(entry.call(api)).rejects.toThrow();
				expect(lastTokenHeader(fm)).toBe(WRONG_TOKEN);
			});

			// Test 4: Correct URL
			test(`calls ${entry.endpoint}`, async () => {
				setToken(TEST_TOKEN);
				const fm = mockFetch(201, OK_BODY);
				globalThis.fetch = fm as unknown as typeof fetch;

				const { api } = await importFn();
				await entry.call(api);

				expect(lastUrl(fm)).toBe(entry.endpoint);
			});

			// Test 5: Correct HTTP method
			test(`uses ${entry.method} method`, async () => {
				setToken(TEST_TOKEN);
				const fm = mockFetch(201, OK_BODY);
				globalThis.fetch = fm as unknown as typeof fetch;

				const { api } = await importFn();
				await entry.call(api);

				expect(lastMethod(fm)).toBe(entry.method);
			});

			// Test 6: Body contains expected keys
			if (entry.bodyKeys.length > 0) {
				test('forwards expected body fields', async () => {
					setToken(TEST_TOKEN);
					const fm = mockFetch(201, OK_BODY);
					globalThis.fetch = fm as unknown as typeof fetch;

					const { api } = await importFn();
					await entry.call(api);

					const body = lastBody(fm);
					for (const key of entry.bodyKeys) {
						expect(body).toHaveProperty(key);
					}
				});
			}
		});
	}
});

// ════════════════════════════════════════════════════════════════
// Public GET Endpoints — Must NOT send X-Admin-Token
// ════════════════════════════════════════════════════════════════

describe('Auth Contract: Public GET Endpoints (no admin header)', () => {
	beforeEach(() => {
		clearToken();
	});

	afterEach(() => {
		clearToken();
		vi.restoreAllMocks();
	});

	const publicGets = [
		{ name: 'getHealth', call: (api: ApiType) => api.getHealth() },
		{ name: 'getRepos', call: (api: ApiType) => api.getRepos() },
		{
			name: 'getManagedTargetProjects',
			call: (api: ApiType) => api.getManagedTargetProjects(),
		},
		{
			name: 'getRepoIssues',
			call: (api: ApiType) => api.getRepoIssues('repo-1'),
		},
		{ name: 'getRuns', call: (api: ApiType) => api.getRuns() },
		{
			name: 'getRunById',
			call: (api: ApiType) => api.getRunById('run-1'),
		},
		{
			name: 'getArtifact',
			call: (api: ApiType) => api.getArtifact('run-1', 'spec'),
		},
		{
			name: 'getEvidence',
			call: (api: ApiType) => api.getEvidence(),
		},
		{
			name: 'getMcpSettings',
			call: (api: ApiType) => api.getMcpSettings(),
		},
		{
			name: 'getTestModes',
			call: (api: ApiType) => api.getTestModes(),
		},
		{ name: 'getSafety', call: (api: ApiType) => api.getSafety() },
		{
			name: 'getTestReport',
			call: (api: ApiType) => api.getTestReport('run-1'),
		},
		{
			name: 'getBlueprint',
			call: (api: ApiType) => api.getBlueprint('owner', 'repo', 1),
		},
	];

	const _importFn = () => import('../api');
	type ApiType = Awaited<ReturnType<typeof _importFn>>['api'];

	for (const entry of publicGets) {
		test(`api.${entry.name}() does NOT send X-Admin-Token`, async () => {
			// Even with a token set, public GETs should not send it
			setToken(TEST_TOKEN);

			const fm = mockFetch(200, OK_BODY);
			globalThis.fetch = fm as unknown as typeof fetch;

			const { api } = await import('../api');
			await entry.call(api);

			const tokenSent = lastTokenHeader(fm);
			expect(tokenSent).toBe('__HEADER_NOT_FOUND__');
		});
	}
});

// ════════════════════════════════════════════════════════════════
// Negative: No hardcoded token
// ════════════════════════════════════════════════════════════════

describe('Auth Contract: No Hardcoded Token', () => {
	afterEach(() => {
		clearToken();
		vi.restoreAllMocks();
	});

	test('getAdminToken() returns empty string when no token is set', async () => {
		clearToken();
		// getAdminToken is exported — import dynamically (ESM-compatible)
		const { getAdminToken } = await import('../api');
		expect(getAdminToken()).toBe('');
	});

	test('adminRequest sends empty header when no token is set (fail-closed client)', async () => {
		clearToken();

		const fm = mockFetch(401, { error: 'Invalid admin token' });
		globalThis.fetch = fm as unknown as typeof fetch;

		const { api } = await import('../api');
		await expect(api.cancelRun('run-1')).rejects.toThrow();
		expect(fm).toHaveBeenCalledTimes(1);

		const tokenSent = lastTokenHeader(fm);
		expect(tokenSent).toBe('');
	});
});
