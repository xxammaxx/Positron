import { describe, expect, test, beforeAll, afterAll } from 'vitest';
import { createServer } from '../index.js';
import type http from 'node:http';

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

async function get(path: string) {
  return fetch(`${baseUrl}${path}`);
}

describe('POST /api/repos/:repoId/runs', () => {
  test('vollständiger Run durchläuft alle Phasen — erreicht DONE', async () => {
    // Fake-Adapter simuliert jetzt Änderungen nach prepareWorkspace
    // → Run erreicht COMMIT → PR_CREATE → MERGE (dry-run) → DONE
    const res = await post('/api/repos/repo-1/runs', { issueNumber: 42, autonomyLevel: 2 });
    expect(res.status).toBe(200);
    const body = await res.json() as { run: { phase: string; status: string; attempt: number; repoId: string; lastError: string | null }; events: Array<{ phase: string }>; eventCount: number };
    expect(body.run.phase).toBe('DONE');
    expect(body.run.status).toBe('done');
    expect(body.run.repoId).toBe('test-repo');
    // Sollte deutlich mehr Events haben als vorher (da der Run komplett durchläuft)
    expect(body.eventCount).toBeGreaterThanOrEqual(18);
  });

  test('zwei aufeinanderfolgende Runs — beide erreichen DONE', async () => {
    const r1 = await post('/api/repos/repo-1/runs', { issueNumber: 1 });
    const b1 = await r1.json() as { run: { id: string; phase: string; lastError: string | null } };
    expect(b1.run.phase).toBe('DONE');

    const r2 = await post('/api/repos/repo-2/runs', { issueNumber: 2 });
    const b2 = await r2.json() as { run: { id: string; phase: string } };
    expect(b2.run.phase).toBe('DONE');
    expect(b2.run.id).not.toBe(b1.run.id);
  });
});

describe('GET /api/runs', () => {
  test('listet alle Runs', async () => {
    await post('/api/repos/repo-a/runs', { issueNumber: 1 });
    const res = await get('/api/runs');
    const body = await res.json() as { runs: Array<unknown> };
    expect(body.runs.length).toBeGreaterThanOrEqual(1);
  });
});

describe('GET /api/health', () => {
  test('Health-Endpunkt antwortet', async () => {
    const res = await get('/api/health');
    const body = await res.json() as { status: string };
    expect(body.status).toBe('ok');
  });
});

describe('Run Resume', () => {
  test('Run-Details via GET /api/runs/:id', async () => {
    const create = await post('/api/repos/repo/runs', { issueNumber: 99 });
    const createBody = await create.json() as { run: { id: string } };
    const res = await get(`/api/runs/${createBody.run.id}`);
    const body = await res.json() as { run: { phase: string }; events: Array<unknown> };
    // Run sollte DONE sein, nicht FAILED_BLOCKED
    expect(body.run.phase).toBe('DONE');
    expect(body.events.length).toBeGreaterThan(0);
  });
});
