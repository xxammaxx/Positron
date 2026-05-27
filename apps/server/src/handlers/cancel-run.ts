/**
 * Cancel Run Handler — Safe run cancellation (Issue #66).
 * Idempotent, status-protected, broadcasts SSE events.
 */

import type { Request, Response } from 'express';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createCancelHandler(deps: Record<string, any>) {
  return async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    const current = deps.loadRunFromDb(id);
    if (!current) {
      res.status(404).json({ error: 'Run not found', runId: id });
      return;
    }

    if (current.status === 'cancelled') {
      res.json({ success: true, runId: id, status: 'cancelled', message: 'Already cancelled (idempotent)' });
      return;
    }

    if (current.status !== 'active' && current.status !== 'blocked') {
      res.status(409).json({ error: `Cannot cancel run with status '${current.status}'`, runId: id, status: current.status });
      return;
    }

    deps.runSignals.set(id, 'ABORT');

    const db = deps.getDb();
    const now = new Date().toISOString();
    const result = db.prepare(`UPDATE runs SET status = 'cancelled', finished_at = ? WHERE id = ? AND status IN ('active', 'blocked')`).run(now, id);

    if (result && result.changes === 0) {
      res.status(409).json({ error: 'Run status changed before cancellation could complete', runId: id });
      return;
    }

    deps.storeEvent(id, current.phase, 'HUMAN', 'Run cancelled by operator');
    deps.broadcastSSE(id, 'run-cancelled', {
      runId: id, phase: current.phase, status: 'cancelled', message: 'Run cancelled by operator',
    });

    res.json({ success: true, runId: id, status: 'cancelled' });
  };
}
