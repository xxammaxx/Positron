/**
 * Cancel Run Handler — Safe run cancellation (Issue #66).
 * Idempotent, status-protected, broadcasts SSE events.
 */

import type { Request, Response } from 'express';
import type { RunState } from '@positron/shared';

interface CancelDeps {
  loadRunFromDb: (runId: string) => RunState | null;
  getDb: () => { prepare: (sql: string) => { get: (...args: unknown[]) => unknown; run: (...args: unknown[]) => void } };
  runSignals: Map<string, string>;
  storeEvent: (runId: string, phase: string, level: string, message: string, payload?: Record<string, unknown>) => void;
  broadcastSSE: (runId: string, event: string, data: Record<string, unknown>) => void;
  createRunId: () => string;
}

export function createCancelHandler(deps: CancelDeps) {
  return async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    // 1. Idempotency check FIRST — even for already-cancelled runs
    const current = deps.loadRunFromDb(id);
    if (!current) {
      res.status(404).json({ error: 'Run not found', runId: id });
      return;
    }

    if (current.status === 'cancelled') {
      res.json({ success: true, runId: id, status: 'cancelled', message: 'Already cancelled (idempotent)' });
      return;
    }

    // 2. Only active or blocked runs can be cancelled
    if (current.status !== 'active' && current.status !== 'blocked') {
      res.status(409).json({
        error: `Cannot cancel run with status '${current.status}'`,
        runId: id,
        status: current.status,
      });
      return;
    }

    // 3. Set ABORT signal for running pipeline
    deps.runSignals.set(id, 'ABORT');

    // 4. Atomic DB update: only cancel if still active/blocked (race condition protection)
    const db = deps.getDb();
    const now = new Date().toISOString();
    const result = db.prepare(
      `UPDATE runs SET status = 'cancelled', finished_at = ? WHERE id = ? AND status IN ('active', 'blocked')`
    ).run(now, id);

    // 5. Check if the update actually changed anything
    if (typeof result === 'object' && result !== null && 'changes' in result && (result as { changes: number }).changes === 0) {
      // Race condition: run status changed between load and update
      res.status(409).json({
        error: 'Run status changed before cancellation could complete',
        runId: id,
      });
      return;
    }

    // 6. Store cancel event
    deps.storeEvent(id, current.phase, 'HUMAN', `Run cancelled by operator`);

    // 7. Broadcast SSE cancellation event
    deps.broadcastSSE(id, 'run-cancelled', {
      runId: id,
      phase: current.phase,
      status: 'cancelled',
      message: 'Run cancelled by operator',
    });

    res.json({ success: true, runId: id, status: 'cancelled' });
  };
}
