/**
 * Demo Live Run Handler — Stub for Issue #65 build compatibility.
 * Full implementation will be provided in Issue #66 (Live Operations Pass).
 */

import type { Request, Response } from 'express';

interface DemoDeps {
  createRun: () => { runId: string };
  saveRunToDb: (run: unknown) => void;
}

export function createDemoLiveRunHandler(_deps: DemoDeps) {
  return async (_req: Request, res: Response): Promise<void> => {
    // Stub: return a demo run that won't actually stream events
    res.json({
      success: true,
      runId: 'demo-live-stub',
      status: 'active',
      message: 'Demo live run stub — full implementation in Issue #66',
    });
  };
}
