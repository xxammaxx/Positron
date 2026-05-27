/**
 * Cancel Run Handler — Stub for Issue #65 build compatibility.
 * Full implementation will be provided in Issue #66 (Live Operations Pass).
 */

import type { Request, Response } from 'express';
import { runSignals } from '../signals.js';
import { broadcastSSE } from '../sse/broadcaster.js';

export function createCancelHandler(_deps: { db: unknown }) {
  return async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    // Stub: set abort signal and respond
    runSignals.set(id, 'ABORT');
    broadcastSSE(id, 'run-cancelled', { runId: id, status: 'cancelled', message: 'Cancelled (stub)' });

    res.json({ success: true, runId: id, status: 'cancelled' });
  };
}
