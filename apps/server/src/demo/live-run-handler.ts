/**
 * Demo Live Run Handler — Creates demo run with seeded events and evidence (Issue #66).
 * Security-gated: only available in dev mode or with POSITRON_ENABLE_DEMO_LIVE=1.
 */

import type { Request, Response } from 'express';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createDemoLiveRunHandler(deps: Record<string, any>) {
  return async (_req: Request, res: Response): Promise<void> => {
    // Security gate
    if (process.env.NODE_ENV === 'production' && process.env.POSITRON_ENABLE_DEMO_LIVE !== '1') {
      res.status(403).json({ error: 'Demo live run is disabled in production' });
      return;
    }

    try {
      const runId = `demo-live-${deps.createRunId().slice(0, 8)}`;

      // Create and save the run
      const run = deps.createRun(deps.repository.id, 9999);
      const runState = {
        ...run,
        id: runId,
        repoId: deps.repository.id,
        issueNumber: 9999,
        status: 'active' as const,
        phase: 'SPECIFY' as const,
        autonomyLevel: 2,
        attempt: 1,
        lastError: null,
        workspacePath: null,
        startedAt: new Date().toISOString(),
        finishedAt: null,
      };
      deps.saveRunToDb(runState);

      const DEMO_EVENTS = [
        { phase: 'SPECIFY', level: 'INFO', message: 'Demo: Loading specification...' },
        { phase: 'SPECIFY', level: 'INFO', message: 'Demo: Specification generated (3 user stories)' },
        { phase: 'PLAN', level: 'INFO', message: 'Demo: Creating implementation plan...' },
        { phase: 'TASKS', level: 'INFO', message: 'Demo: Breaking into atomic tasks...' },
        { phase: 'REVIEW', level: 'INFO', message: 'Demo: Starting code review...' },
        { phase: 'IMPLEMENT', level: 'INFO', message: 'Demo: Implementing feature...' },
        { phase: 'TEST', level: 'INFO', message: 'Demo: Running tests...' },
        { phase: 'TEST', level: 'WARN', message: 'Demo: FAKE_API_TOKEN=***-redacted (demo token)' },
      ];

      for (const evt of DEMO_EVENTS) {
        deps.storeEvent(runId, evt.phase, evt.level, evt.message, {});
        deps.broadcastSSE(runId, 'run-event', {
          runId, phase: evt.phase, level: evt.level, message: evt.message,
          createdAt: new Date().toISOString(),
        });
      }

      const DEMO_ARTIFACTS = [
        { kind: 'spec', content: '# Demo Spec\n\n1. User can view runs\n2. User can cancel runs' },
        { kind: 'test-results', content: 'Tests: 66/66 passed' },
      ];

      for (const art of DEMO_ARTIFACTS) {
        deps.saveArtifact(runId, art.kind, art.content);
        deps.broadcastSSE(runId, 'run-evidence-created', {
          runId, kind: art.kind, summary: `Demo ${art.kind} artifact`,
          createdAt: new Date().toISOString(),
        });
      }

      deps.broadcastSSE(runId, 'run-update', { phase: 'DONE', status: 'done' });

      res.json({
        success: true,
        runId,
        status: 'done',
        demo: true,
        message: 'Demo live run created and populated with events and evidence',
        events: DEMO_EVENTS.length,
        artifacts: DEMO_ARTIFACTS.length,
      });
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Failed to create demo run',
      });
    }
  };
}
