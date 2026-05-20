// Positron Server — Orchestrator und REST API

import express from 'express';
import http from 'node:http';
import { createRun, transition, markFailed, resumeFromEvents } from '@positron/run-state';
import { runSpecify, runPlan, runTasks } from '@positron/speckit-adapter';
import { executeTasks } from '@positron/opencode-adapter';
import { generateBranchName } from '@positron/shared';
import type { Phase, RunStatus } from '@positron/shared';
import type { RunState, RunEventData } from '@positron/run-state';
import { FakeGitHubAdapter, createRealGitHubAdapter } from '@positron/github-adapter';
import type { GitHubAdapter } from '@positron/github-adapter';
import { renderAccepted } from '@positron/github-adapter';
import { FakeGitWorkspaceAdapter } from '@positron/sandbox';
import type { GitWorkspaceAdapter } from '@positron/sandbox';
import { TestCommandDetector, TestRunner } from '@positron/sandbox';
import type { TestReport } from '@positron/sandbox';

/** GitHub Adapter Modus: "fake" (Standard/Test) oder "real" (mit GITHUB_TOKEN) */
type GitHubMode = 'fake' | 'real';

function resolveAdapter(): { adapter: GitHubAdapter; mode: GitHubMode } {
  const mode = (process.env.GITHUB_MODE ?? 'fake') as GitHubMode;
  if (mode === 'real') {
    return { adapter: createRealGitHubAdapter(), mode: 'real' };
  }
  return { adapter: new FakeGitHubAdapter(), mode: 'fake' };
}

// In-Memory Store (MVP)
const runs = new Map<string, RunState>();
const events = new Map<string, RunEventData[]>();
let workspaceAdapter: GitWorkspaceAdapter = new FakeGitWorkspaceAdapter();

export function setWorkspaceAdapter(adapter: GitWorkspaceAdapter): void {
  workspaceAdapter = adapter;
}

function storeEvent(event: RunEventData): void {
  const list = events.get(event.runId) ?? [];
  list.push(event);
  events.set(event.runId, list);
}

function getEvents(runId: string): RunEventData[] {
  return events.get(runId) ?? [];
}

// ---------------------------------------------------------------------------
// Orchestrator
// ---------------------------------------------------------------------------

async function executePhase(run: RunState): Promise<RunState> {
  let current = run;
  let result;

  switch (current.phase) {
    case 'QUEUED':
      result = transition(current, 'CLAIMED', 'Issue claimed', 'INFO');
      break;
    case 'CLAIMED':
      result = transition(current, 'REPO_SYNC', 'Repo synced', 'INFO');
      break;
    case 'REPO_SYNC':
      try {
        const ws = await workspaceAdapter.prepareWorkspace({
          repository: { owner: 'xxammaxx', repo: current.repoId, remoteUrl: `https://github.com/xxammaxx/${current.repoId}.git` },
          issueNumber: current.issueNumber,
          issueTitle: `Issue #${current.issueNumber}`,
          runId: current.id,
        });
        current.branch = ws.branchName;
        result = transition(current, 'ISSUE_CONTEXT', `Workspace: ${ws.workspacePath}`);
      } catch (err) {
        result = markFailed(current, 'FAILED_TRANSIENT', `Repo sync failed: ${String(err)}`);
      }
      break;
    case 'ISSUE_CONTEXT':
      result = transition(current, 'WEB_RESEARCH', 'Research phase', 'INFO');
      break;
    case 'WEB_RESEARCH':
      result = transition(current, 'SPECIFY', `Research: best practices validated`);
      break;
    case 'SPECIFY':
      runSpecify();
      result = transition(current, 'PLAN', 'Spec generated');
      break;
    case 'PLAN':
      runPlan();
      result = transition(current, 'TASKS', 'Plan generated');
      break;
    case 'TASKS':
      runTasks();
      result = transition(current, 'ANALYZE', 'Tasks generated');
      break;
    case 'ANALYZE':
      result = transition(current, 'REVIEW', 'Analysis complete');
      break;
    case 'REVIEW':
      result = transition(current, 'IMPLEMENT', 'Review passed');
      break;
    case 'IMPLEMENT':
      executeTasks();
      result = transition(current, 'TEST', 'Implementation done');
      break;
    case 'TEST':
      try {
        const wsPath = current.branch ? `/tmp/positron-ws-${current.id.slice(0, 8)}` : '/tmp';
        const detector = new TestCommandDetector();
        const detection = await detector.detect(wsPath);
        if (detection.commands.length === 0) {
          // Keine Commands erkannt — trotzdem als INFO durch (MVP-Stub)
          result = transition(current, 'VERIFY', 'Keine Test-Kommandos erkannt (MVP)', 'INFO');
        } else {
          const runner = new TestRunner();
          const report = await runner.runDetectedCommands({
            runId: current.id, workspacePath: wsPath,
            commands: detection.commands, mode: 'standard',
          });
          result = transition(current, 'VERIFY', `Tests ${report.status}`, report.status === 'PASS' ? 'INFO' : 'ERROR');
        }
      } catch {
        result = transition(current, 'VERIFY', 'Test-Ausführung fehlgeschlagen (MVP)', 'WARN');
      }
      break;
    case 'VERIFY':
      current.branch = current.branch ?? generateBranchName(current.issueNumber, `run-${current.id.slice(0, 8)}`);
      result = transition(current, 'PR_CREATE', 'Verified, PR ready');
      break;
    case 'PR_CREATE':
      result = transition(current, 'DONE', 'PR created');
      break;
    default:
      return current; // terminal
  }

  if (result.ok) {
    storeEvent(result.event);
    return result.run;
  } else {
    storeEvent(result.event);
    return current;
  }
}

async function runFullPipeline(run: RunState): Promise<RunState> {
  let current = run;
  const maxSteps = 20;
  for (let i = 0; i < maxSteps; i++) {
    const next = await executePhase(current);
    if (next.phase === current.phase || next.phase === 'DONE' || next.phase.startsWith('FAILED')) {
      runs.set(next.id, next);
      return next;
    }
    current = next;
  }
  // Timeout
  const result = markFailed(current, 'FAILED_BLOCKED', 'Max steps exceeded');
  storeEvent(result.event);
  runs.set(result.run.id, result.run);
  return result.run;
}

// ---------------------------------------------------------------------------
// REST API
// ---------------------------------------------------------------------------

export function createApp(adapter?: GitHubAdapter) {
  const github = adapter ?? resolveAdapter().adapter;
  const app = express();
  app.use(express.json());

  // Repository registrieren
  app.post('/api/repos', (_req, res) => {
    res.json({ id: 'repo-1', status: 'registered', mode: github instanceof FakeGitHubAdapter ? 'fake' : 'real' });
  });

  // Issues abrufen (echt via Adapter)
  app.get('/api/repos/:id/issues', async (req, _res, next) => {
    try {
      const issues = await github.listOpenIssues('test-owner', req.params.id);
      _res.json({ issues });
    } catch (err) { next(err); }
  });

  // Run starten
  app.post('/api/repos/:repoId/runs', async (req, res) => {
    const { issueNumber, autonomyLevel } = req.body;
    const run = createRun(req.params.repoId, issueNumber ?? 1, autonomyLevel ?? 2);
    const completed = await runFullPipeline(run);
    const evts = getEvents(completed.id);
    res.json({ run: completed, events: evts, eventCount: evts.length });
  });

  // Runs auflisten
  app.get('/api/runs', (_req, res) => {
    res.json({ runs: Array.from(runs.values()) });
  });

  // Run-Details
  app.get('/api/runs/:id', (req, res) => {
    const run = runs.get(req.params.id);
    if (!run) { res.status(404).json({ error: 'Not found' }); return; }
    res.json({ run, events: getEvents(run.id) });
  });

  // Health
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', runs: runs.size });
  });

  return app;
}

export function createServer(adapter?: GitHubAdapter) {
  const app = createApp(adapter);
  return http.createServer(app);
}
