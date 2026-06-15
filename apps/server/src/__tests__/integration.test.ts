import { describe, expect, test, beforeAll, afterAll } from 'vitest';
import { createServer } from '../index.js';
import type http from 'node:http';

let server: http.Server;
let baseUrl: string;
const repository = { owner: 'test-owner', repo: 'test-repo' };
// Dev default token, same as in index.ts
const DEV_ADMIN_TOKEN = 'positron-admin-dev';

beforeAll(async () => {
	// Set the admin token via env so SecretManager picks it up (env provider first)
	process.env['POSITRON_ADMIN_TOKEN'] = DEV_ADMIN_TOKEN;
	server = createServer({ repository, dbPath: ':memory:' });
	await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
	const addr = server.address() as { port: number };
	baseUrl = `http://127.0.0.1:${addr.port}`;
});

afterAll(() => {
	delete process.env['POSITRON_ADMIN_TOKEN'];
	server.close();
});

async function post(path: string, body: unknown) {
	return fetch(`${baseUrl}${path}`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body),
	});
}

async function get(path: string) {
	return fetch(`${baseUrl}${path}`);
}

async function getWithToken(path: string, token: string) {
	return fetch(`${baseUrl}${path}`, {
		headers: { 'X-Admin-Token': token },
	});
}

describe('POST /api/repos/:repoId/runs', () => {
	// QA-027: Reactivated — the POST /api/repos/:repoId/runs route has an
	// inline fallback (runFullPipeline) that runs synchronously when
	// BullMQ/Redis is unavailable. Tests go through this fallback path
	// and complete in-process. ~500ms BullMQ connection timeout per test.
	test('vollständiger Run durchläuft alle Phasen — erreicht DONE', async () => {
		// Fake-Adapter simuliert jetzt Änderungen nach prepareWorkspace
		// → Run erreicht COMMIT → PR_CREATE → MERGE (dry-run) → DONE
		const res = await post('/api/repos/repo-1/runs', {
			issueNumber: 42,
			autonomyLevel: 2,
		});
		expect(res.status).toBe(200);
		const body = (await res.json()) as {
			run: {
				phase: string;
				status: string;
				attempt: number;
				repoId: string;
				lastError: string | null;
			};
			events: Array<{ phase: string }>;
			eventCount: number;
		};
		expect(body.run.phase).toBe('DONE');
		expect(body.run.status).toBe('done');
		expect(body.run.repoId).toBe('test-repo');
		// Sollte deutlich mehr Events haben als vorher (da der Run komplett durchläuft)
		expect(body.eventCount).toBeGreaterThanOrEqual(15);
	});

	test('zwei aufeinanderfolgende Runs — beide erreichen DONE', async () => {
		const r1 = await post('/api/repos/repo-1/runs', { issueNumber: 1 });
		const b1 = (await r1.json()) as {
			run: { id: string; phase: string; lastError: string | null };
		};
		expect(b1.run.phase).toBe('DONE');

		const r2 = await post('/api/repos/repo-2/runs', { issueNumber: 2 });
		const b2 = (await r2.json()) as { run: { id: string; phase: string } };
		expect(b2.run.phase).toBe('DONE');
		expect(b2.run.id).not.toBe(b1.run.id);
	});
});

describe('GET /api/runs', () => {
	test('listet alle Runs', async () => {
		const createRes = await post('/api/repos/repo-a/runs', { issueNumber: 1 });
		expect(createRes.status).toBe(200);
		const res = await get('/api/runs');
		const body = (await res.json()) as {
			runs: Array<unknown>;
			total?: number;
			pagination?: { total: number };
		};
		// Support both new paginated format and old format
		const runList = body.runs ?? [];
		const total = body.pagination?.total ?? body.total ?? runList.length;
		expect(total).toBeGreaterThanOrEqual(1);
	});
});

describe('GET /api/health', () => {
	test('Health-Endpunkt antwortet', async () => {
		const res = await get('/api/health');
		const body = (await res.json()) as { status: string };
		expect(body.status).toBe('ok');
	});
});

describe('Run Resume', () => {
	// QA-027: Reactivated — same inline fallback as above.
	test('Run-Details via GET /api/runs/:id', async () => {
		const create = await post('/api/repos/repo/runs', { issueNumber: 99 });
		const createBody = (await create.json()) as { run: { id: string } };
		const res = await get(`/api/runs/${createBody.run.id}`);
		const body = (await res.json()) as {
			run: { phase: string };
			events: Array<unknown>;
		};
		// Run sollte DONE sein, nicht FAILED_BLOCKED
		expect(body.run.phase).toBe('DONE');
		expect(body.events.length).toBeGreaterThan(0);
	});
});

describe('Admin Auth Middleware', () => {
	test('GET /api/admin/stats ohne Token → 401', async () => {
		const res = await get('/api/admin/stats');
		expect(res.status).toBe(401);
		const body = (await res.json()) as { error: string };
		expect(body.error).toContain('admin token');
	});

	test('GET /api/admin/stats mit falschem Token → 401', async () => {
		const res = await getWithToken('/api/admin/stats', 'wrong-token');
		expect(res.status).toBe(401);
		const body = (await res.json()) as { error: string };
		expect(body.error).toContain('admin token');
	});

	test('GET /api/admin/stats mit gültigem Token → 200', async () => {
		const res = await getWithToken('/api/admin/stats', DEV_ADMIN_TOKEN);
		expect(res.status).toBe(200);
		const body = (await res.json()) as {
			runs: { total: number };
			repositories: number;
		};
		expect(body).toHaveProperty('runs');
		expect(body.runs).toHaveProperty('total');
		expect(body).toHaveProperty('repositories');
		expect(body).toHaveProperty('events');
		expect(body).toHaveProperty('artifacts');
	});
});

// ── Tool Gateway Monitoring (Issue #224) ─────────────────────────────

describe('GET /api/tool-gateway/status', () => {
	test('returns gateway disabled by default', async () => {
		const res = await get('/api/tool-gateway/status');
		expect(res.status).toBe(200);
		const body = (await res.json()) as {
			gatewayEnabled: boolean;
			mcpExposeEnabled: boolean;
			registeredTools: number;
			sealed: boolean;
			runtimeActive: boolean;
		};
		expect(body.gatewayEnabled).toBe(false);
		expect(body.runtimeActive).toBe(false);
		expect(body.sealed).toBe(true);
	});

	test('shows MCP exposure disabled by default', async () => {
		const res = await get('/api/tool-gateway/status');
		const body = (await res.json()) as { mcpExposeEnabled: boolean };
		expect(body.mcpExposeEnabled).toBe(false);
	});

	test('returns all expected status fields', async () => {
		const res = await get('/api/tool-gateway/status');
		const body = (await res.json()) as Record<string, unknown>;
		expect(body).toHaveProperty('gatewayEnabled');
		expect(body).toHaveProperty('mcpExposeEnabled');
		expect(body).toHaveProperty('registeredTools');
		expect(body).toHaveProperty('sealed');
		expect(body).toHaveProperty('runtimeActive');
		expect(body).toHaveProperty('enforcePathBoundaries');
		expect(body).toHaveProperty('enforceEgress');
		expect(body).toHaveProperty('redactSecrets');
	});
});

describe('GET /api/tool-gateway/tools', () => {
	test('returns 8 built-in tools', async () => {
		const res = await get('/api/tool-gateway/tools');
		expect(res.status).toBe(200);
		const body = (await res.json()) as {
			tools: Array<{ id: string }>;
			total: number;
		};
		expect(body.total).toBe(8);
		expect(body.tools).toHaveLength(8);
	});

	test('each tool has required metadata fields', async () => {
		const res = await get('/api/tool-gateway/tools');
		const body = (await res.json()) as {
			tools: Array<Record<string, unknown>>;
		};

		for (const tool of body.tools) {
			expect(tool).toHaveProperty('id');
			expect(tool).toHaveProperty('category');
			expect(tool).toHaveProperty('title');
			expect(tool).toHaveProperty('description');
			expect(tool).toHaveProperty('riskLevel');
			expect(tool).toHaveProperty('requiredAutonomyLevel');
			expect(tool).toHaveProperty('approvalMode');
			expect(tool).toHaveProperty('allowedPhases');
			expect(tool).toHaveProperty('egressPolicy');
			expect(tool).toHaveProperty('evidenceRequirements');
			expect(tool).toHaveProperty('inputSchema');
			expect(tool).toHaveProperty('outputSchema');
		}
	});

	test('built-in tools include expected IDs', async () => {
		const res = await get('/api/tool-gateway/tools');
		const body = (await res.json()) as {
			tools: Array<{ id: string }>;
		};
		const ids = body.tools.map((t) => t.id).sort();

		expect(ids).toContain('repo.read_file');
		expect(ids).toContain('repo.list_files');
		expect(ids).toContain('repo.get_diff');
		expect(ids).toContain('tests.detect');
		expect(ids).toContain('tests.run_selected');
		expect(ids).toContain('evidence.append');
		expect(ids).toContain('github.read_issue');
		expect(ids).toContain('github.comment_evidence_draft');
	});

	test('response does not include handler functions', async () => {
		const res = await get('/api/tool-gateway/tools');
		const body = (await res.json()) as {
			tools: Array<Record<string, unknown>>;
		};
		const bodyStr = JSON.stringify(body);

		// No function serialization (arrow, function keyword, or native code)
		expect(bodyStr).not.toContain('=>');
		expect(bodyStr).not.toContain('function');
		expect(bodyStr).not.toContain('[native code]');
	});

	test('response does not include secrets', async () => {
		const res = await get('/api/tool-gateway/tools');
		const bodyStr = JSON.stringify(await res.json());

		// No secret-like patterns
		expect(bodyStr).not.toMatch(/ghp_[a-zA-Z0-9]{36}/);
		expect(bodyStr).not.toMatch(/sk-[a-zA-Z0-9]{32,}/);
		expect(bodyStr).not.toMatch(/github_pat_/);
	});

	test('tools include correct risk levels', async () => {
		const res = await get('/api/tool-gateway/tools');
		const body = (await res.json()) as {
			tools: Array<{ id: string; riskLevel: string }>;
		};

		const readTools = body.tools.filter((t) => t.id.startsWith('repo.'));
		for (const tool of readTools) {
			expect(tool.riskLevel).toBe('read');
		}

		const writeTool = body.tools.find((t) => t.id === 'tests.run_selected');
		expect(writeTool?.riskLevel).toBe('write');

		const evidenceTool = body.tools.find((t) => t.id === 'evidence.append');
		expect(evidenceTool?.riskLevel).toBe('write');
	});
});
