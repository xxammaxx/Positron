/**
 * Demo Live Run Handler — Creates demo run with seeded events and evidence (Issue #66).
 * Security-gated: only available in dev mode or with POSITRON_ENABLE_DEMO_LIVE=1.
 */

import type { Request, Response } from 'express';
import type { RunState } from '@positron/shared';

interface DemoDeps {
  createRun: (repoId: string, issueNumber: number) => { runId: string };
  saveRunToDb: (run: RunState) => void;
  storeEvent: (runId: string, phase: string, level: string, message: string, payload?: Record<string, unknown>) => void;
  saveArtifact: (runId: string, kind: string, content: string) => void;
  broadcastSSE: (runId: string, event: string, data: Record<string, unknown>) => void;
  createRunId: () => string;
  repository: { id: string; owner: string; name: string };
}

const DEMO_EVENTS = [
  { phase: 'SPECIFY', level: 'INFO', message: '📋 Loading specification...' },
  { phase: 'SPECIFY', level: 'INFO', message: '📄 Specification generated (3 user stories)' },
  { phase: 'PLAN', level: 'INFO', message: '🗂️ Creating implementation plan...' },
  { phase: 'PLAN', level: 'INFO', message: '📋 Plan: 5 tasks identified' },
  { phase: 'TASKS', level: 'INFO', message: '📝 Breaking down into atomic tasks...' },
  { phase: 'TASKS', level: 'INFO', message: '✅ 5 tasks created' },
  { phase: 'REVIEW', level: 'INFO', message: '🔍 Starting code review...' },
  { phase: 'REVIEW', level: 'WARN', message: '⚠️ 2 minor style issues found (auto-fixable)' },
  { phase: 'IMPLEMENT', level: 'INFO', message: '🛠️ Implementing feature...' },
  { phase: 'TEST', level: 'INFO', message: '🧪 Running tests...' },
  { phase: 'TEST', level: 'WARN', message: 'FAKE_API_TOKEN=sk-****-redacted (demo token, pre-redacted)' },
];

const DEMO_ARTIFACTS = [
  { kind: 'spec', content: '# Demo Spec\n\n1. User can view runs\n2. User can cancel runs\n3. User can see evidence' },
  { kind: 'test-results', content: 'Tests: 66/66 passed, 5 skipped' },
];

export function createDemoLiveRunHandler(deps: DemoDeps) {
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
      const runState: RunState = {
        ...run,
        id: runId,
        repoId: deps.repository.id,
        issueNumber: 9999,
        status: 'active',
        phase: 'SPECIFY',
        autonomyLevel: 2,
        attempt: 1,
        lastError: null,
        workspacePath: null,
        startedAt: new Date().toISOString(),
        finishedAt: null,
      };
      deps.saveRunToDb(runState);

      // Seed demo events with delays via SSE broadcasts
      for (const evt of DEMO_EVENTS) {
        deps.storeEvent(runId, evt.phase, evt.level, evt.message);
        deps.broadcastSSE(runId, 'run-event', {
          runId, phase: evt.phase, level: evt.level, message: evt.message,
          createdAt: new Date().toISOString(),
        });
      }

      // Seed demo artifacts
      for (const art of DEMO_ARTIFACTS) {
        deps.saveArtifact(runId, art.kind, art.content);
        deps.broadcastSSE(runId, 'run-evidence-created', {
          runId, kind: art.kind, summary: `Demo ${art.kind} artifact`,
          createdAt: new Date().toISOString(),
        });
      }

      // Update to DONE
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
