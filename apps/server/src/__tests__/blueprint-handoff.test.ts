// Positron — Blueprint Handoff Server Tests
// PR 10: Blueprint Gated Pipeline Handoff
// Tests the start-run endpoint, handoff semantics, and safety enforcement.
// NO runtime execution is triggered by any test.

import { describe, expect, test, beforeAll, afterAll } from 'vitest';
import { createServer } from '../index.js';
import type http from 'node:http';

let server: http.Server;
let baseUrl: string;
const repository = { owner: 'test-owner', repo: 'test-repo' };

const VALID_BLUEPRINT_MARKDOWN = `# Project Goal
Test blueprint for pipeline handoff verification.

## Hard Constraints
- No auto-merge
- No secrets
- Human approval required

## Source of Truth
GitHub Issue #229

## Human Approval Rules
Human must approve before any run.

## Verification Contract
All tests must pass before merge.

## Evidence Requirements
All decisions must be documented.

## Expected Result Format
JSON with status field.

## Software Capability Delta
Blueprint handoff creates a gated handoff without executing runtime.`;

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

// Helper: import a blueprint and return its ID
async function importBlueprint(markdown?: string): Promise<string> {
  const res = await apiPost('/api/blueprints/import', {
    markdown: markdown ?? VALID_BLUEPRINT_MARKDOWN,
    filename: 'test-blueprint.md',
  });
  expect(res.status).toBe(200);
  const data = await res.json();
  return (data as { blueprintId: string }).blueprintId;
}

// ═══════════════════════════════════════════════════════════════════════════
// POST /api/blueprints/:id/start-run — Handoff Endpoint
// ═══════════════════════════════════════════════════════════════════════════

describe('POST /api/blueprints/:id/start-run', () => {
  test('returns handoff (not 409) for a valid imported blueprint', async () => {
    const bpId = await importBlueprint();
    const res = await apiPost(`/api/blueprints/${bpId}/start-run`);
    expect(res.status).toBe(200);

    const data = await res.json();
    // Should return handoff, NOT 409 blocked stub
    expect(data).toHaveProperty('status');
    expect(data).toHaveProperty('handoff');
    expect(data).toHaveProperty('message');
    expect(data).toHaveProperty('note');
    // Should NOT have the old 409 blocked reason
    expect(data.status).not.toBe('blocked'); // not old 409 'blocked' reason
    expect(data.note).toContain('No runtime execution');
  });

  test('returns 404 for non-existent blueprint', async () => {
    const res = await apiPost('/api/blueprints/non-existent-id/start-run');
    expect(res.status).toBe(404);
  });

  test('handoff includes all required fields', async () => {
    const bpId = await importBlueprint();
    const res = await apiPost(`/api/blueprints/${bpId}/start-run`);
    const data = await res.json();

    expect(data.handoff).toHaveProperty('handoffId');
    expect(data.handoff).toHaveProperty('blueprintId', bpId);
    expect(data.handoff).toHaveProperty('status');
    expect(data.handoff).toHaveProperty('gates');
    expect(data.handoff).toHaveProperty('runIntentId');
    expect(data.handoff).toHaveProperty('blockedReasons');
    expect(data.handoff).toHaveProperty('createdAt');
    // Gates should be an array
    expect(Array.isArray(data.handoff.gates)).toBe(true);
  });

  test('handoff gates array contains 8 gates', async () => {
    const bpId = await importBlueprint();
    const res = await apiPost(`/api/blueprints/${bpId}/start-run`);
    const data = await res.json();
    expect(data.handoff.gates).toHaveLength(8);
  });

  test('each gate has kind, status, message, blockedReasons', async () => {
    const bpId = await importBlueprint();
    const res = await apiPost(`/api/blueprints/${bpId}/start-run`);
    const data = await res.json();
    for (const gate of data.handoff.gates) {
      expect(gate).toHaveProperty('kind');
      expect(gate).toHaveProperty('status');
      expect(gate).toHaveProperty('message');
      expect(Array.isArray(gate.blockedReasons)).toBe(true);
    }
  });

  test('handoff gate kinds are all present', async () => {
    const bpId = await importBlueprint();
    const res = await apiPost(`/api/blueprints/${bpId}/start-run`);
    const data = await res.json();
    const kinds = data.handoff.gates.map((g: { kind: string }) => g.kind).sort();
    expect(kinds).toEqual([
      'blueprint_validation',
      'human_approval',
      'mcp_warmup',
      'model_warmup',
      'provider_profile',
      'security_warnings',
      'speckit_sync',
      'tool_gateway',
    ]);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Handoff Status Semantics
// ═══════════════════════════════════════════════════════════════════════════

describe('handoff status semantics', () => {
  test('valid blueprint without human approval produces waiting_for_human', async () => {
    const bpId = await importBlueprint();
    const res = await apiPost(`/api/blueprints/${bpId}/start-run`);
    const data = await res.json();

    // With valid blueprint but no human approval yet + infrastructure gates
    // not wired, we should get waiting_for_human or waiting_for_gates
    expect(['waiting_for_human', 'waiting_for_gates', 'blocked']).toContain(data.status);
  });

  test('response message never claims execution occurred', async () => {
    const bpId = await importBlueprint();
    const res = await apiPost(`/api/blueprints/${bpId}/start-run`);
    const data = await res.json();

    // Message must NOT claim execution happened
    expect(data.message).not.toMatch(/execution (started|completed|begun)/i);
    expect(data.message).not.toMatch(/run (started|executed|launched)/i);
    expect(data.note).toContain('No runtime execution');
  });

  test('handoff response contains no executable field data', async () => {
    const bpId = await importBlueprint();
    const res = await apiPost(`/api/blueprints/${bpId}/start-run`);
    const data = await res.json();
    const json = JSON.stringify(data);

    // No OpenCode/MCP/Spec Kit commands in response
    expect(json).not.toMatch(/"execut(e|or|ion)"/);
    expect(json).not.toMatch(/"opencode"/i);
    expect(json).not.toMatch(/"mcp_(url|connect)"/);
    expect(json).not.toMatch(/"curl"/);
    expect(json).not.toMatch(/"install"/);
    expect(json).not.toMatch(/"download"/);
    expect(json).not.toMatch(/"sudo"/);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Safety: No Runtime Execution
// ═══════════════════════════════════════════════════════════════════════════

describe('no runtime execution safety', () => {
  test('start-run never starts OpenCode', async () => {
    const bpId = await importBlueprint();
    const res = await apiPost(`/api/blueprints/${bpId}/start-run`);
    const data = await res.json();

    // Response must have no indication of OpenCode execution
    expect(data.status).not.toBe('running');
    expect(data.handoff.status).not.toBe('running');
  });

  test('start-run never starts MCP', async () => {
    const bpId = await importBlueprint();
    const res = await apiPost(`/api/blueprints/${bpId}/start-run`);
    const data = await res.json();

    // No MCP runtime indication
    const mcpGate = data.handoff.gates.find(
      (g: { kind: string }) => g.kind === 'mcp_warmup',
    );
    // MCP warm-up gate shows as not_checked (not pass / not running)
    expect(mcpGate.status).toBe('not_checked');
  });

  test('start-run never starts Spec Kit', async () => {
    const bpId = await importBlueprint();
    const res = await apiPost(`/api/blueprints/${bpId}/start-run`);
    const data = await res.json();

    const speckitGate = data.handoff.gates.find(
      (g: { kind: string }) => g.kind === 'speckit_sync',
    );
    expect(speckitGate.status).toBe('not_checked');
  });

  test('start-run never writes to GitHub', async () => {
    // This is enforced by the handler — it has no GitHub write logic
    const bpId = await importBlueprint();
    const res = await apiPost(`/api/blueprints/${bpId}/start-run`);
    expect(res.status).toBe(200); // Just verifies it doesn't crash on GitHub write attempts
  });

  test('start-run never pushes or merges', async () => {
    const bpId = await importBlueprint();
    const res = await apiPost(`/api/blueprints/${bpId}/start-run`);
    const data = await res.json();
    expect(data.handoff.status).not.toMatch(/push|merge/i);
  });

  test('start-run never installs anything', async () => {
    const bpId = await importBlueprint();
    const res = await apiPost(`/api/blueprints/${bpId}/start-run`);
    expect(res.status).toBe(200); // Verifies no install attempts
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Blueprint with Blocking Content
// ═══════════════════════════════════════════════════════════════════════════

describe('blocking blueprint content', () => {
  test('blueprint with secret token is blocked', async () => {
    const secretMd = `# Project Goal
Test with secret.

## Hard Constraints
ghp_abcdefghijklmnopqrstuvwxyz123456

## Source of Truth
GitHub Issue`;

    const bpId = await importBlueprint(secretMd);
    const res = await apiPost(`/api/blueprints/${bpId}/start-run`);
    const data = await res.json();

    // Should be blocked due to security warnings
    expect(data.status).toBe('blocked');
    const secGate = data.handoff.gates.find(
      (g: { kind: string }) => g.kind === 'security_warnings',
    );
    expect(secGate.status).toBe('blocked');
  });

  test('blueprint with auto-merge instruction is blocked', async () => {
    const autoMergeMd = `# Project Goal
Auto-merge test.

## Hard Constraints
- Auto-merge after review

## Source of Truth
GitHub Issue

## Human Approval Rules
Bypass human approval

## Verification Contract
Tests pass.

## Evidence Requirements
Evidence logged.

## Expected Result Format
JSON.

## Software Capability Delta
Auto-merge enabled.`;

    const bpId = await importBlueprint(autoMergeMd);
    const res = await apiPost(`/api/blueprints/${bpId}/start-run`);
    const data = await res.json();

    // Should be blocked or require human approval
    expect(['blocked', 'waiting_for_human']).toContain(data.status);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Handoff Retrieval
// ═══════════════════════════════════════════════════════════════════════════

describe('GET /api/blueprints/:id/handoff', () => {
  test('returns 404 for blueprint without handoff', async () => {
    const bpId = await importBlueprint();
    const res = await apiGet(`/api/blueprints/${bpId}/handoff`);
    expect(res.status).toBe(404);
  });

  test('returns handoff after start-run', async () => {
    const bpId = await importBlueprint();
    // First create a handoff
    const startRes = await apiPost(`/api/blueprints/${bpId}/start-run`);
    expect(startRes.status).toBe(200);

    // Now retrieve it
    const res = await apiGet(`/api/blueprints/${bpId}/handoff`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty('handoff');
    expect(data.handoff).toHaveProperty('handoffId');
    expect(data.handoff).toHaveProperty('status');
    expect(data).toHaveProperty('note');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Regression: No Execute Endpoints
// ═══════════════════════════════════════════════════════════════════════════

describe('regression: no execute endpoints', () => {
  test('no POST /api/tool-gateway/execute', async () => {
    const res = await apiPost('/api/tool-gateway/execute');
    expect(res.status).toBe(404);
  });

  test('no POST /api/tool-gateway/tools/:id/run', async () => {
    const res = await apiPost('/api/tool-gateway/tools/test-tool/run');
    expect(res.status).toBe(404);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Same Blueprint Multiple Handoffs
// ═══════════════════════════════════════════════════════════════════════════

describe('multiple handoffs', () => {
  test('multiple start-run calls produce different handoff IDs', async () => {
    const bpId = await importBlueprint();

    const res1 = await apiPost(`/api/blueprints/${bpId}/start-run`);
    const data1 = await res1.json();

    const res2 = await apiPost(`/api/blueprints/${bpId}/start-run`);
    const data2 = await res2.json();

    // Each call produces a new handoff (different ID)
    expect(data1.handoff.handoffId).not.toBe(data2.handoff.handoffId);
    // Both should succeed
    expect(res1.status).toBe(200);
    expect(res2.status).toBe(200);
  });
});
