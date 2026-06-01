import { describe, it, expect, beforeAll } from 'vitest';
import Database from 'better-sqlite3';
import { SCHEMA_V1, applyMigrations } from '@positron/run-state';
import { saveRunToDb, loadRunFromDb, storeEvent, getEvents } from '../pipeline-runner.js';
import type { PipelineDeps } from '../pipeline-runner.js';
import type { RunState, RunEventData } from '@positron/run-state';

let db: Database.Database;
let deps: PipelineDeps;

beforeAll(() => {
  db = new Database(':memory:');
  applyMigrations(db);
  deps = {
    db,
    repository: { owner: 'test', repo: 'test-repo' },
    workspace: {} as PipelineDeps['workspace'],
    speckit: {} as PipelineDeps['speckit'],
    opencode: {} as PipelineDeps['opencode'],
    github: {} as PipelineDeps['github'],
  };
});

function makeRun(overrides: Partial<RunState> = {}): RunState {
  return {
    id: 'test-run-1',
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

function makeEvent(overrides: Partial<RunEventData> = {}): RunEventData {
  return {
    id: 'evt-1',
    runId: 'test-run-1',
    phase: 'QUEUED',
    level: 'INFO',
    message: 'test event',
    payload: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('saveRunToDb', () => {
  it('should insert a run into the database', () => {
    const run = makeRun();
    saveRunToDb(run, deps);
    const row = db.prepare('SELECT * FROM runs WHERE id = ?').get(run.id) as Record<string, unknown>;
    expect(row).toBeDefined();
    expect(row.phase).toBe('QUEUED');
    expect(row.status).toBe('active');
    expect(row.issue_number).toBe(42);
  });

  it('should upsert on second save', () => {
    const run = makeRun({ phase: 'CLAIMED', status: 'active' });
    saveRunToDb(run, deps);
    const row = db.prepare('SELECT * FROM runs WHERE id = ?').get(run.id) as Record<string, unknown>;
    expect(row.phase).toBe('CLAIMED');
  });

  it('should create repo entry automatically', () => {
    const run = makeRun({ id: 'run-different-repo', repoId: 'other-repo' });
    saveRunToDb(run, deps);
    const repo = db.prepare('SELECT * FROM repositories WHERE id = ?').get('other-repo') as Record<string, unknown>;
    expect(repo).toBeDefined();
  });
});

describe('loadRunFromDb', () => {
  it('should load a previously saved run', () => {
    const run = makeRun({ id: 'load-test-run', issueNumber: 99 });
    saveRunToDb(run, deps);

    const loaded = loadRunFromDb('load-test-run', deps);
    expect(loaded).not.toBeNull();
    expect(loaded!.id).toBe('load-test-run');
    expect(loaded!.issueNumber).toBe(99);
    expect(loaded!.phase).toBe('QUEUED');
  });

  it('should return null for non-existent run', () => {
    const loaded = loadRunFromDb('nonexistent', deps);
    expect(loaded).toBeNull();
  });
});

describe('storeEvent', () => {
  it('should insert an event', () => {
    const evt = makeEvent({ id: 'evt-store-1', message: 'test message' });
    storeEvent(evt, deps);
    const row = db.prepare('SELECT * FROM run_events WHERE id = ?').get('evt-store-1') as Record<string, unknown>;
    expect(row).toBeDefined();
    expect(row.message).toBe('test message');
  });
});

describe('getEvents', () => {
  it('should retrieve events for a run', () => {
    const run = makeRun({ id: 'run-events-2', repoId: 'test-repo', issueNumber: 99 });
    saveRunToDb(run, deps);
    storeEvent(makeEvent({ id: 'evt-get-1', runId: 'run-events-2', phase: 'QUEUED', createdAt: '2026-01-01T00:00:01.000Z' }), deps);
    storeEvent(makeEvent({ id: 'evt-get-2', runId: 'run-events-2', phase: 'CLAIMED', createdAt: '2026-01-01T00:00:02.000Z' }), deps);

    const events = getEvents('run-events-2', deps);
    expect(events.length).toBe(2);
    expect(events[0]?.phase).toBe('QUEUED');
    expect(events[1]?.phase).toBe('CLAIMED');
  });

  it('should return empty array for run with no events', () => {
    const events = getEvents('no-events-run', deps);
    expect(events).toEqual([]);
  });
});
