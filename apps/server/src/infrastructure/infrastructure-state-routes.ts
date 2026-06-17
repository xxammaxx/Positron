// Positron — Infrastructure State Upsert API Routes
// PR 15: Safe UPSERT endpoints for Provider/Model/SpecKit/MCP state stores
// ---------------------------------------------------------------------------
// These endpoints store status data ONLY. They NEVER start:
// - OpenCode coding/prompt runs
// - Spec Kit runtime
// - MCP runtime
// - Tool Gateway execution
// - Any shell commands or tool execution
//
// SECURITY:
// - All POST endpoints are disabled by default (require env flag)
// - GET status endpoint is read-only
// - Payloads are validated before storage
// - Secrets are rejected
// - Private paths are redacted
// - redactionApplied is enforced
// - Infrastructure gates are re-evaluated after each upsert
// - No fake PASS values
// ---------------------------------------------------------------------------

import { Router, type Request, type Response } from 'express';
import type { InfrastructureStateStores } from '@positron/shared';
import {
	executeSafeUpsert,
	type InfrastructureStateUpsertResponse,
} from '@positron/shared';
import { getInfrastructureStateStatus } from '@positron/shared';

/**
 * Creates an Express Router with infrastructure state upsert endpoints.
 *
 * @param stores — The infrastructure state stores (from server startup)
 * @returns An Express Router with all infrastructure state routes
 */
export function createInfrastructureStateRoutes(
	stores: InfrastructureStateStores,
): Router {
	const router = Router();

	// ── Helper: Check if upsert is enabled ──────────────────────────────
	function isUpsertEnabled(): boolean {
		const envVal = process.env['POSITRON_ENABLE_INFRASTRUCTURE_STATE_UPSERT'];
		return envVal === 'true' || envVal === '1';
	}

	// ── Helper: Send a 403 response when upsert is blocked ─────────────
	function sendBlocked(res: Response, kind: string): void {
		const response: InfrastructureStateUpsertResponse = {
			status: 'blocked',
			kind: kind as InfrastructureStateUpsertResponse['kind'],
			redacted: true,
			blockedReasons: ['infrastructure_state_upsert_disabled'],
		};
		res.status(403).json(response);
	}

	// ═══════════════════════════════════════════════════════════════════
	// GET /status — Read-only infrastructure state aggregation
	// ═══════════════════════════════════════════════════════════════════
	router.get('/status', async (_req: Request, res: Response) => {
		try {
			const gates = await getInfrastructureStateStatus({
				stores,
			});

			res.json({
				status: gates.overall,
				readyForDemo: gates.readyForDemo,
				readyForReal: gates.readyForReal,
				gates: gates.gates,
				blockedReasons: gates.blockedReasons,
				checkedAt: gates.checkedAt,
				runtimeStarted: false,
				note: 'Read-only status. No runtime started. No OpenCode/MCP/SpecKit/ToolGateway execution.',
			});
		} catch (err) {
			res.status(500).json({
				error: 'Failed to read infrastructure state status',
				details: err instanceof Error ? err.message : String(err),
			});
		}
	});

	// ═══════════════════════════════════════════════════════════════════
	// POST /provider-detection — Upsert Provider Detection State
	// ═══════════════════════════════════════════════════════════════════
	router.post('/provider-detection', async (req: Request, res: Response) => {
		if (!isUpsertEnabled()) {
			sendBlocked(res, 'provider_detection');
			return;
		}

		try {
			const payload = req.body;
			const result = await executeSafeUpsert({
				stores,
				kind: 'provider_detection',
				payload,
				upsertEnabled: true,
			});

			if (result.status === 'blocked' || result.status === 'rejected') {
				res.status(result.status === 'blocked' ? 403 : 400).json(result);
				return;
			}

			res.json({
				...result,
				note: 'Provider detection state stored. No OpenCode runtime started.',
			});
		} catch (err) {
			res.status(500).json({
				status: 'rejected',
				kind: 'provider_detection',
				blockedReasons: [
					`Internal error: ${err instanceof Error ? err.message : String(err)}`,
				],
				redacted: true,
			});
		}
	});

	// ═══════════════════════════════════════════════════════════════════
	// POST /model-profile — Upsert Model Profile State
	// ═══════════════════════════════════════════════════════════════════
	router.post('/model-profile', async (req: Request, res: Response) => {
		if (!isUpsertEnabled()) {
			sendBlocked(res, 'model_profile');
			return;
		}

		try {
			const payload = req.body;
			const result = await executeSafeUpsert({
				stores,
				kind: 'model_profile',
				payload,
				upsertEnabled: true,
			});

			if (result.status === 'blocked' || result.status === 'rejected') {
				res.status(result.status === 'blocked' ? 403 : 400).json(result);
				return;
			}

			res.json({
				...result,
				note: 'Model profile state stored. No model runtime started.',
			});
		} catch (err) {
			res.status(500).json({
				status: 'rejected',
				kind: 'model_profile',
				blockedReasons: [
					`Internal error: ${err instanceof Error ? err.message : String(err)}`,
				],
				redacted: true,
			});
		}
	});

	// ═══════════════════════════════════════════════════════════════════
	// POST /speckit-sync — Upsert Spec Kit Sync State
	// ═══════════════════════════════════════════════════════════════════
	router.post('/speckit-sync', async (req: Request, res: Response) => {
		if (!isUpsertEnabled()) {
			sendBlocked(res, 'speckit_sync');
			return;
		}

		try {
			const payload = req.body;
			const result = await executeSafeUpsert({
				stores,
				kind: 'speckit_sync',
				payload,
				upsertEnabled: true,
			});

			if (result.status === 'blocked' || result.status === 'rejected') {
				res.status(result.status === 'blocked' ? 403 : 400).json(result);
				return;
			}

			res.json({
				...result,
				note: 'Spec Kit sync state stored. No Spec Kit runtime started.',
			});
		} catch (err) {
			res.status(500).json({
				status: 'rejected',
				kind: 'speckit_sync',
				blockedReasons: [
					`Internal error: ${err instanceof Error ? err.message : String(err)}`,
				],
				redacted: true,
			});
		}
	});

	// ═══════════════════════════════════════════════════════════════════
	// POST /mcp-warmup-evidence — Upsert MCP Warm-up Evidence
	// ═══════════════════════════════════════════════════════════════════
	router.post('/mcp-warmup-evidence', async (req: Request, res: Response) => {
		if (!isUpsertEnabled()) {
			sendBlocked(res, 'mcp_warmup_evidence');
			return;
		}

		try {
			const payload = req.body;
			const result = await executeSafeUpsert({
				stores,
				kind: 'mcp_warmup_evidence',
				payload,
				upsertEnabled: true,
			});

			if (result.status === 'blocked' || result.status === 'rejected') {
				res.status(result.status === 'blocked' ? 403 : 400).json(result);
				return;
			}

			res.json({
				...result,
				note: 'MCP warm-up evidence stored. No MCP runtime started.',
			});
		} catch (err) {
			res.status(500).json({
				status: 'rejected',
				kind: 'mcp_warmup_evidence',
				blockedReasons: [
					`Internal error: ${err instanceof Error ? err.message : String(err)}`,
				],
				redacted: true,
			});
		}
	});

	return router;
}
