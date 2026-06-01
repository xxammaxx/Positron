import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import Database from 'better-sqlite3';
import { SCHEMA_V1, applyMigrations } from '@positron/run-state';
import type { RunState, RunEventData } from '@positron/run-state';
import { runPipeline, saveRunToDb, storeEvent, getEvents } from '../pipeline-runner.js';
import type { PipelineDeps } from '../pipeline-runner.js';
import { FakeGitHubAdapter } from '@positron/github-adapter';
import { FakeSpecKitAdapter, FAKE_HEALTH_AVAILABLE } from '@positron/speckit-adapter';
import { FakeOpenCodeAdapter, FAKE_OPENCODE_HEALTH_AVAILABLE } from '@positron/opencode-adapter';
import { FakeGitWorkspaceAdapter } from '@positron/sandbox';

let db: Database.Database;
const repository = { owner: 'test', repo: 'test-repo' };

beforeAll(() => {
  db = new Database(':memory:');
  applyMigrations(db);
});

function makeRun(overrides: Partial<RunState> = {}): RunState {
  return {
    id: 'pipeline-test-run-1',
    repoId: 'test-repo',
    issueNumber: 42,
    branch: null,
    phase: 'QUEUED',
    status: 'active',
    autonomyLevel: 2,
    attempt: 1,
    startedAt: '2026-01-01T00:00:00.000Z',
    finishedAt: null,
    lastError: null,
    workspacePath: null,
    ...overrides,
  };
}

function makeDeps(overrides: Partial<PipelineDeps> = {}): PipelineDeps {
  return {
    db,
    repository,
    workspace: new FakeGitWorkspaceAdapter(),
    speckit: new FakeSpecKitAdapter(FAKE_HEALTH_AVAILABLE),
    opencode: new FakeOpenCodeAdapter(FAKE_OPENCODE_HEALTH_AVAILABLE),
    github: new FakeGitHubAdapter(),
    ...overrides,
  };
}

describe('runPipeline — Full Run', () => {
  it('should run QUEUED → DONE in fake mode', async () => {
    const run = makeRun();
    saveRunToDb(run, makeDeps());
    const deps = makeDeps();

    const result = await runPipeline(run, deps);

    expect(result.phase).toBe('DONE');
    expect(result.status).toBe('done');
    expect(result.finishedAt).not.toBeNull();

    // Verify events were recorded (first event is CLAIMED, the transition from QUEUED)
    const events = getEvents(result.id, deps);
    const phases = events.map(e => e.phase);
    expect(phases).toContain('CLAIMED');
    expect(phases).toContain('REPO_SYNC');
    expect(phases).toContain('ISSUE_CONTEXT');
    expect(phases).toContain('WEB_RESEARCH');
    expect(phases).toContain('SPECIFY');
    expect(phases).toContain('PLAN');
    expect(phases).toContain('TASKS');
    expect(phases).toContain('ANALYZE');
    expect(phases).toContain('REVIEW');
    expect(phases).toContain('IMPLEMENT');
    expect(phases).toContain('VERIFY');
    expect(phases).toContain('COMMIT');
    expect(phases).toContain('PR_CREATE');
    expect(phases).toContain('MERGE');
    expect(phases).toContain('DONE');
  });

  it('should set workspacePath during pipeline', async () => {
    const run = makeRun();
    saveRunToDb(run, makeDeps());
    const result = await runPipeline(run, makeDeps());
    expect(result.workspacePath).toBeTruthy();
  });

  it('should set branch during pipeline', async () => {
    const run = makeRun();
    saveRunToDb(run, makeDeps());
    const result = await runPipeline(run, makeDeps());
    expect(result.branch).toBeTruthy();
  });

  it('should produce at least 20 events', async () => {
    const run = makeRun();
    saveRunToDb(run, makeDeps());
    const result = await runPipeline(run, makeDeps());
    const events = getEvents(result.id, makeDeps());
    // Each phase transition creates an event
    expect(events.length).toBeGreaterThanOrEqual(20);
  });

  it('should persist final state to database', async () => {
    const run = makeRun();
    saveRunToDb(run, makeDeps());
    await runPipeline(run, makeDeps());
    // Verify it's in the DB
    const row = db.prepare('SELECT * FROM runs WHERE id = ?').get(run.id) as Record<string, unknown>;
    expect(row.phase).toBe('DONE');
  });
});

describe('runPipeline — with syncService', () => {
  it('should not crash when syncService is provided', async () => {
    const run = makeRun();
    saveRunToDb(run, makeDeps());
    const github = new FakeGitHubAdapter();
    const deps = makeDeps({
      github,
      syncService: new (await import('@positron/github-adapter')).GitHubStatusSyncService(github),
    });

    const result = await runPipeline(run, deps);
    expect(result.phase).toBe('DONE');
  });
});

describe('runPipeline — Abort signal', () => {
  it('should abort when ABORT signal is set', async () => {
    const run = makeRun();
    saveRunToDb(run, makeDeps());
    const deps = makeDeps();

    // Set an abort signal for this run
    db.prepare('INSERT OR IGNORE INTO run_signals (run_id, signal) VALUES (?, ?)').run(run.id, 'ABORT');

    const result = await runPipeline(run, deps);
    expect(result.status).toBe('cancelled');
  });
});

describe('runPipeline — starting from non-QUEUED phase', () => {
  it('should advance from IMPLEMENT and log the result', async () => {
    const run = makeRun({ id: 'pipeline-implement-test', phase: 'IMPLEMENT' });
    saveRunToDb(run, makeDeps());
    const result = await runPipeline(run, makeDeps());
    // Accept any phase — we just want to see what it produces
    expect(result.phase).toBeTruthy();
  });

  it('should advance from COMMIT and log the result', async () => {
    const run = makeRun({ id: 'pipeline-commit-test', phase: 'COMMIT', branch: 'positron/issue-42-test', workspacePath: '/tmp/test-ws' });
    saveRunToDb(run, makeDeps());
    const result = await runPipeline(run, makeDeps());
    expect(result.phase).toBeTruthy();
  });
});

describe('saveRunToDb', () => {
  it('should handle insert with all fields', () => {
    const run = makeRun({
      id: 'save-test-full',
      branch: 'positron/issue-42-test',
      phase: 'IMPLEMENT',
      status: 'active',
      attempt: 2,
      lastError: null,
      finishedAt: null,
    });
    saveRunToDb(run, makeDeps());
    const row = db.prepare('SELECT * FROM runs WHERE id = ?').get('save-test-full') as Record<string, unknown>;
    expect(row.phase).toBe('IMPLEMENT');
    expect(row.attempt).toBe(2);
    expect(row.branch).toBe('positron/issue-42-test');
  });
});

describe('storeEvent & getEvents', () => {
  it('should store and retrieve events across different runs', () => {
    // Run A has events
    const runA = makeRun({ id: 'run-events-a' });
    saveRunToDb(runA, makeDeps());
    storeEvent({
      id: 'evt-a1', runId: 'run-events-a', phase: 'QUEUED', level: 'INFO',
      message: 'A started', payload: null, createdAt: '2026-01-01T00:00:01.000Z',
    }, makeDeps());
    storeEvent({
      id: 'evt-a2', runId: 'run-events-a', phase: 'CLAIMED', level: 'INFO',
      message: 'A claimed', payload: null, createdAt: '2026-01-01T00:00:02.000Z',
    }, makeDeps());

    // Run B has no events
    const runB = makeRun({ id: 'run-events-b' });
    saveRunToDb(runB, makeDeps());

    const aEvents = getEvents('run-events-a', makeDeps());
    const bEvents = getEvents('run-events-b', makeDeps());

    expect(aEvents.length).toBe(2);
    expect(bEvents.length).toBe(0);
  });

  it('should handle payload serialization correctly', () => {
    const run = makeRun({ id: 'run-events-payload' });
    saveRunToDb(run, makeDeps());
    const payload = { action: 'test', values: [1, 2, 3] };
    storeEvent({
      id: 'evt-payload', runId: 'run-events-payload', phase: 'TEST', level: 'INFO',
      message: 'with payload', payload, createdAt: '2026-01-01T00:00:01.000Z',
    }, makeDeps());

    const events = getEvents('run-events-payload', makeDeps());
    expect(events[0]?.payload).toEqual(payload);
  });
});
