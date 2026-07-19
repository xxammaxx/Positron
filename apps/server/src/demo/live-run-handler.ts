/**
 * Demo Live Run Handler — Creates a real run and executes the full pipeline, streaming events via SSE (Issue #66, #3).
 * No synthetic events. All events come from actual pipeline execution through the configured adapters.
 * Security-gated: only available in dev mode or with POSITRON_ENABLE_DEMO_LIVE=1.
 */

import type { RunEventData, RunState } from '@positron/run-state';
import type { EventLevel, Phase } from '@positron/shared';
import type { Request, Response } from 'express';

/** Dependencies interface — strongly typed to prevent silent mismatches like the old Record<string,any>. */
export interface DemoLiveRunDeps {
	/** Creates a fresh RunState object (not persisted yet). */
	createRun: (repoId: string, issueNumber: number, autonomyLevel: number) => RunState;
	/** Persists a run to the DB (INSERT/UPDATE). */
	saveRunToDb: (run: RunState) => void;
	/** Persists a run event and broadcasts it via SSE. Takes a single RunEventData object. */
	storeEvent: (event: RunEventData) => void;
	/** Saves an artifact (spec, plan, tasks, etc.) and broadcasts evidence-created via SSE. */
	saveArtifact: (runId: string, kind: string, content: string | string[]) => void;
	/** Writes SSE event data to all registered clients for a run. */
	broadcastSSE: (runId: string, event: string, data: Record<string, unknown>) => void;
	/** Generates a unique ID (crypto.randomUUID). */
	createRunId: () => string;
	/** Repository config (owner, repo, defaultBranch, etc.). */
	repository: {
		id: string;
		owner: string;
		repo: string;
		defaultBranch?: string;
		remoteUrl?: string;
	};

	// --- Pipeline execution & SSE streaming ---

	/** Executes the full Positron pipeline for the given run, returning the final state.
	 *  This executes ALL phases using the configured adapters (fake or real).
	 *  Each phase transition calls storeEvent() which automatically broadcasts SSE. */
	runPipeline: (run: RunState) => Promise<RunState>;
	/** Registers the response as an SSE client for a run — pipeline events will stream to this client. */
	addSSEClient: (runId: string, res: Response) => void;
	/** Removes a previously registered SSE client. */
	removeSSEClient: (runId: string, res: Response) => void;
	/** Loads all events for a run from the DB (chronological). */
	getEvents: (runId: string) => RunEventData[];
}

export function createDemoLiveRunHandler(deps: DemoLiveRunDeps) {
	return async (req: Request, res: Response): Promise<void> => {
		// Security gate
		if (process.env.NODE_ENV === 'production' && process.env.POSITRON_ENABLE_DEMO_LIVE !== '1') {
			res.status(403).json({ error: 'Demo live run is disabled in production' });
			return;
		}

		try {
			const { blueprint, issueNumber } =
				(req.body as { blueprint?: string; issueNumber?: number }) ?? {};
			let issueNum = Number.parseInt(process.env.POSITRON_DEFAULT_ISSUE_NUMBER ?? '56', 10);
			if (issueNumber !== undefined && issueNumber !== null) {
				const parsed = Number(issueNumber);
				if (Number.isInteger(parsed) && parsed >= 1 && parsed <= 999999) {
					issueNum = parsed;
				}
			}

			// ── 1. Create a real run in the database (persisted) ──────────────────
			const repoId = deps.repository.id ?? `${deps.repository.owner}/${deps.repository.repo}`;
			const run = deps.createRun(repoId, issueNum, 2);
			deps.saveRunToDb(run);

			// ── 2. Store an initial event (visible in SSE stream + DB) ───────────
			deps.storeEvent({
				id: deps.createRunId(),
				runId: run.id,
				phase: 'QUEUED' as Phase,
				level: 'HUMAN' as EventLevel,
				message: `Demo live run created for Issue #${issueNum}`,
				payload: {
					blueprint: blueprint ?? null,
					issueNumber: issueNum,
					source: 'demo-live-run',
				},
				createdAt: new Date().toISOString(),
			});

			// ── 3. Set up SSE streaming ──────────────────────────────────────────
			res.writeHead(200, {
				'Content-Type': 'text/event-stream',
				'Cache-Control': 'no-cache',
				Connection: 'keep-alive',
				'X-Accel-Buffering': 'no',
			});

			// Send initial state (run metadata + all events so far) to the client
			const initialEvents = deps.getEvents(run.id);
			const initialState = {
				run,
				events: initialEvents,
				message: 'Demo live run started — streaming real pipeline events via SSE',
				demo: true,
			};
			res.write(`event: initial\ndata: ${JSON.stringify(initialState)}\n\n`);

			// Register as SSE client so storeEvent() -> broadcastSSE() writes to this response
			deps.addSSEClient(run.id, res);

			// ── 4. Execute the REAL pipeline — all events come from actual execution ──
			//    Each phase transition calls deps.storeEvent() internally (via the orchestrator),
			//    which in turn calls broadcastSSE() -> this client receives each event live.
			const finalRun = await deps.runPipeline(run);

			// ── 5. Send completion event ─────────────────────────────────────────
			res.write(
				`event: done\ndata: ${JSON.stringify({
					runId: finalRun.id,
					status: finalRun.status,
					phase: finalRun.phase,
					demo: true,
					message: 'Pipeline complete — all events streamed from real adapter execution',
				})}\n\n`,
			);

			// ── 6. Cleanup ───────────────────────────────────────────────────────
			deps.removeSSEClient(run.id, res);
			res.end();
		} catch (err) {
			// If the pipeline or setup fails, send an error event via SSE
			// (headers may or may not be sent — try SSE, fallback to JSON)
			try {
				res.write(
					`event: error\ndata: ${JSON.stringify({
						error: err instanceof Error ? err.message : 'Failed to create demo live run',
						demo: true,
					})}\n\n`,
				);
				res.end();
			} catch {
				// Headers already sent or connection closed — nothing to do
			}
		}
	};
}
