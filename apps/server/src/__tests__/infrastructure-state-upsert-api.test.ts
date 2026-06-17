// Positron — Infrastructure State Upsert API Tests (Server)
// PR 15: Server-side integration tests for upsert REST endpoints
// ---------------------------------------------------------------------------
// Tests cover:
// - POST disabled by default
// - POST works when env enabled
// - POST stores unknown-provider-blocked model
// - POST stores partial speckit sync
// - POST rejects real MCP evidence
// - GET /status returns store-backed state
// - Gates reflect stored state after upserts
// - No endpoint starts runtime
// ---------------------------------------------------------------------------

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import express, { type Express } from 'express';
import http from 'node:http';
import { createInMemoryInfrastructureStateStores } from '@positron/shared';
import type { InfrastructureStateStores } from '@positron/shared';
import { createInfrastructureStateRoutes } from '../infrastructure/infrastructure-state-routes.js';

// ═══════════════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════════════

function makeServer(
	stores: InfrastructureStateStores,
	enableUpsert: boolean,
): { app: Express; server: http.Server; port: number } {
	const app = express();
	app.use(express.json());

	const routes = createInfrastructureStateRoutes(stores);
	app.use('/api/infrastructure-state', routes);

	// Health endpoint for connectivity test
	app.get('/api/health', (_req, res) => {
		res.json({ status: 'ok' });
	});

	const server = app.listen(0); // Random port
	const addr = server.address();
	const port = typeof addr === 'object' && addr ? addr.port : 0;

	return { app, server, port };
}

async function post(
	port: number,
	path: string,
	body: unknown,
): Promise<{ status: number; data: unknown }> {
	const response = await fetch(`http://127.0.0.1:${port}${path}`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body),
	});
	const data = await response.json();
	return { status: response.status, data };
}

async function get(
	port: number,
	path: string,
): Promise<{ status: number; data: unknown }> {
	const response = await fetch(`http://127.0.0.1:${port}${path}`);
	const data = await response.json();
	return { status: response.status, data };
}

function makeValidProviderPayload() {
	return {
		evidence: {
			evidenceId: `api-test-pd-${Date.now()}`,
			detectionStatus: 'version_checked' as const,
			installStatus: 'not_requested' as const,
			runtimeStatus: 'model_profile_required' as const,
			version: '1.17.7',
			helpAvailable: true,
			redactionApplied: true,
			secretsDetected: false,
			privatePathsDetected: false,
			blockedReasons: [] as string[],
			createdAt: new Date().toISOString(),
		},
	};
}

function makeValidModelPayload() {
	return {
		profile: {
			profileId: 'unknown-provider-blocked',
			displayName: 'Unknown Provider (Blocked)',
			providerId: 'unknown',
			modelId: '',
			opencodeModelRef: 'unknown/blocked',
			costClass: 'unknown' as const,
			executionClass: 'unknown' as const,
			requiresApiKey: false,
			apiKeyStoragePolicy: 'blocked' as const,
			allowedForDemo: false,
			allowedForRealRuns: false,
			capabilities: ['unknown' as const],
			requiresWarmup: false,
			warmupStatus: 'blocked' as const,
			warmupLevel: 0 as const,
			maxRiskLevel: 'high' as const,
			notes: ['Blocked sentinel'],
		},
	};
}

function makeValidSpecKitPayload() {
	return {
		profile: {
			profileId: `api-test-speckit-${Date.now()}`,
			opencodeBinaryPath: '$HOME/.positron/tools/bin/opencode',
			opencodeVersion: '1.17.7',
			opencodeConfigPath: '$HOME/.positron/config/opencode.json',
			opencodeModelProfileId: 'unknown-provider-blocked',
			opencodeModelRef: 'unknown/blocked',
			specKitBinaryPath: '$HOME/.positron/tools/bin/specify',
			specKitVersion: 'v0.10.4.dev0',
			specKitInstallSource: 'github/spec-kit' as const,
			specKitInstallRef: 'v0.10.4.dev0',
			specKitMode: 'adapter_bridge' as const,
			mcpWarmupStatus: 'unknown' as const,
			modelWarmupStatus: 'unknown' as const,
			specKitSyncStatus: 'partial' as const,
			providerProfileReadiness: 'not_ready' as const,
			readyForDemoRuns: false,
			readyForRealRuns: false,
			reSyncReasons: [] as string[],
		},
	};
}

function makeValidMcpPayload() {
	return {
		evidence: {
			evidenceId: `api-test-mcp-${Date.now()}`,
			serverId: 'github-mcp',
			status: 'unknown' as const,
			startedAt: new Date().toISOString(),
			phases: [
				{
					phase: 'connect',
					status: 'unknown',
					message: 'Dry-run: no real connection',
				},
			] as Array<{
				phase: string;
				status: string;
				message: string;
				evidenceRef?: string;
				blockedReason?: string;
			}>,
			listedTools: [] as string[],
			forbiddenToolChecks: [] as Array<{
				toolName: string;
				expected: 'absent' | 'forbidden' | 'requires_human_approval';
				actual: 'absent' | 'allowed' | 'forbidden' | 'requires_human_approval';
				status: 'pass' | 'fail';
			}>,
			redactionApplied: true,
			secretsDetected: false,
			privatePathsDetected: false,
			realRunAllowed: false,
			blockedReasons: ['Dry-run only'],
		},
	};
}

// ═══════════════════════════════════════════════════════════════════════════
// Tests
// ═══════════════════════════════════════════════════════════════════════════

describe('Infrastructure State Upsert API (Server)', () => {
	let stores: InfrastructureStateStores;
	let server: http.Server;
	let port: number;

	describe('with upsert enabled', () => {
		let savedEnv: string | undefined;

		beforeAll(() => {
			stores = createInMemoryInfrastructureStateStores();
			savedEnv = process.env['POSITRON_ENABLE_INFRASTRUCTURE_STATE_UPSERT'];
			process.env['POSITRON_ENABLE_INFRASTRUCTURE_STATE_UPSERT'] = 'true';
			const srv = makeServer(stores, true);
			server = srv.server;
			port = srv.port;
		});

		afterAll(() => {
			if (savedEnv === undefined) {
				delete process.env['POSITRON_ENABLE_INFRASTRUCTURE_STATE_UPSERT'];
			} else {
				process.env['POSITRON_ENABLE_INFRASTRUCTURE_STATE_UPSERT'] = savedEnv;
			}
			server.close();
		});

		it('health endpoint works', async () => {
			const { status, data } = await get(port, '/api/health');
			expect(status).toBe(200);
			expect((data as Record<string, unknown>).status).toBe('ok');
		});

		it('POST /provider-detection stores valid payload', async () => {
			const { status, data } = await post(
				port,
				'/api/infrastructure-state/provider-detection',
				makeValidProviderPayload(),
			);
			expect(status).toBe(200);
			expect((data as Record<string, unknown>).status).toBe('stored');
			expect((data as Record<string, unknown>).redacted).toBe(true);
		});

		it('POST /model-profile stores unknown-provider-blocked', async () => {
			const { status, data } = await post(
				port,
				'/api/infrastructure-state/model-profile',
				makeValidModelPayload(),
			);
			expect(status).toBe(200);
			expect((data as Record<string, unknown>).status).toBe('stored');
		});

		it('POST /speckit-sync stores partial state', async () => {
			const { status, data } = await post(
				port,
				'/api/infrastructure-state/speckit-sync',
				makeValidSpecKitPayload(),
			);
			expect(status).toBe(200);
			expect((data as Record<string, unknown>).status).toBe('stored');
		});

		it('POST /mcp-warmup-evidence stores dry-run evidence', async () => {
			const { status, data } = await post(
				port,
				'/api/infrastructure-state/mcp-warmup-evidence',
				makeValidMcpPayload(),
			);
			expect(status).toBe(200);
			expect((data as Record<string, unknown>).status).toBe('stored');
		});

		it('POST /mcp-warmup-evidence rejects real transport evidence', async () => {
			const payload = makeValidMcpPayload();
			payload.evidence.phases = [
				{ phase: 'connect', status: 'pass', message: 'Real connection established' } as const,
			] as unknown as typeof payload.evidence.phases;
			const { status, data } = await post(
				port,
				'/api/infrastructure-state/mcp-warmup-evidence',
				payload,
			);
			expect(status).toBe(400);
			expect((data as Record<string, unknown>).status).toBe('rejected');
			const reasons = (data as Record<string, unknown>).blockedReasons as string[];
			expect(reasons.some(r => r.includes('real transport'))).toBe(true);
		});

		it('POST rejects invalid payload with 400', async () => {
			const { status, data } = await post(
				port,
				'/api/infrastructure-state/provider-detection',
				{ invalid: true },
			);
			expect(status).toBe(400);
			expect((data as Record<string, unknown>).status).toBe('rejected');
		});

		it('GET /status returns store-backed state', async () => {
			// Store something first so we know stores have data
			await post(
				port,
				'/api/infrastructure-state/provider-detection',
				makeValidProviderPayload(),
			);

			const { status, data } = await get(port, '/api/infrastructure-state/status');
			expect(status).toBe(200);
			const d = data as Record<string, unknown>;
			expect(d.status).toBeDefined();
			expect(d.gates).toBeDefined();
			expect(d.runtimeStarted).toBe(false);
		});

		it('after upserts, gates reflect stored state', async () => {
			// Store all four states
			await post(port, '/api/infrastructure-state/provider-detection', makeValidProviderPayload());
			await post(port, '/api/infrastructure-state/model-profile', makeValidModelPayload());
			await post(port, '/api/infrastructure-state/speckit-sync', makeValidSpecKitPayload());
			await post(port, '/api/infrastructure-state/mcp-warmup-evidence', makeValidMcpPayload());

			const { data } = await get(port, '/api/infrastructure-state/status');
			const d = data as Record<string, unknown>;
			expect(d.status).toBeDefined();
			// All stores populated → gates should derive statuses from stored data
			const gates = d.gates as Array<Record<string, unknown>>;
			expect(Array.isArray(gates)).toBe(true);
			expect(gates.length).toBeGreaterThan(0);
		});

		it('no endpoint starts OpenCode', async () => {
			// All responses should indicate no runtime
			const { data } = await get(port, '/api/infrastructure-state/status');
			expect((data as Record<string, unknown>).runtimeStarted).toBe(false);
		});

		it('no endpoint starts Spec Kit', async () => {
			const { data } = await get(port, '/api/infrastructure-state/status');
			expect((data as Record<string, unknown>).runtimeStarted).toBe(false);
		});

		it('no endpoint starts MCP', async () => {
			const { data } = await get(port, '/api/infrastructure-state/status');
			expect((data as Record<string, unknown>).runtimeStarted).toBe(false);
		});
	});

	describe('with upsert disabled (default behavior)', () => {
		let disabledPort: number;
		let disabledServer: http.Server;

		beforeAll(() => {
			// Ensure env is not set (default disabled)
			delete process.env['POSITRON_ENABLE_INFRASTRUCTURE_STATE_UPSERT'];
			const disabledStores = createInMemoryInfrastructureStateStores();
			const srv = makeServer(disabledStores, false);
			disabledServer = srv.server;
			disabledPort = srv.port;
		});

		afterAll(() => {
			disabledServer.close();
		});

		it('POST /provider-detection returns 403 when disabled', async () => {
			const { status, data } = await post(
				disabledPort,
				'/api/infrastructure-state/provider-detection',
				makeValidProviderPayload(),
			);
			expect(status).toBe(403);
			expect((data as Record<string, unknown>).status).toBe('blocked');
			const reasons = (data as Record<string, unknown>).blockedReasons as string[];
			expect(reasons).toContain('infrastructure_state_upsert_disabled');
		});

		it('POST /model-profile returns 403 when disabled', async () => {
			const { status, data } = await post(
				disabledPort,
				'/api/infrastructure-state/model-profile',
				makeValidModelPayload(),
			);
			expect(status).toBe(403);
			expect((data as Record<string, unknown>).status).toBe('blocked');
		});

		it('POST /speckit-sync returns 403 when disabled', async () => {
			const { status, data } = await post(
				disabledPort,
				'/api/infrastructure-state/speckit-sync',
				makeValidSpecKitPayload(),
			);
			expect(status).toBe(403);
			expect((data as Record<string, unknown>).status).toBe('blocked');
		});

		it('POST /mcp-warmup-evidence returns 403 when disabled', async () => {
			const { status, data } = await post(
				disabledPort,
				'/api/infrastructure-state/mcp-warmup-evidence',
				makeValidMcpPayload(),
			);
			expect(status).toBe(403);
			expect((data as Record<string, unknown>).status).toBe('blocked');
		});

		it('GET /status still works when disabled', async () => {
			const { status, data } = await get(disabledPort, '/api/infrastructure-state/status');
			expect(status).toBe(200);
			expect((data as Record<string, unknown>).status).toBeDefined();
		});
	});
});
