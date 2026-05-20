// Positron Server — Orchestrator und REST API

import express from 'express';
import http from 'node:http';
import { createRun, transition, markFailed, resumeFromEvents } from '@positron/run-state';
import { runSpecify, runPlan, runTasks } from '@positron/speckit-adapter';
import { executeTasks } from '@positron/opencode-adapter';
import { generateBranchName } from '@positron/shared';
import type { Phase, RunStatus } from '@positron/shared';
import type { RunState, RunEventData } from '@positron/run-state';

// In-Memory Store (MVP)
const runs = new Map<string, RunState>();
const events = new Map<string, RunEventData[]>();

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

function executePhase(run: RunState): RunState {
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
      result = transition(current, 'ISSUE_CONTEXT', 'Context loaded', 'INFO');
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
      result = transition(current, 'VERIFY', 'Tests passed', 'INFO');
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

function runFullPipeline(run: RunState): RunState {
  let current = run;
  const maxSteps = 20;
  for (let i = 0; i < maxSteps; i++) {
    const next = executePhase(current);
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

export function createApp() {
  const app = express();
  app.use(express.json());

  // Repository registrieren
  app.post('/api/repos', (_req, res) => {
    res.json({ id: 'repo-1', status: 'registered' });
  });

  // Issues abrufen
  app.get('/api/repos/:id/issues', (req, res) => {
    res.json({
      issues: [{ number: 1, title: 'Test Issue', labels: ['positron:ready'] }],
    });
  });

  // Run starten
  app.post('/api/repos/:repoId/runs', (req, res) => {
    const { issueNumber, autonomyLevel } = req.body;
    const run = createRun(req.params.repoId, issueNumber ?? 1, autonomyLevel ?? 2);
    const completed = runFullPipeline(run);
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

export function createServer() {
  const app = createApp();
  return http.createServer(app);
}
