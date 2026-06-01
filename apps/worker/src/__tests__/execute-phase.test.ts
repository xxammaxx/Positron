import { describe, it, expect, beforeAll } from 'vitest';
import Database from 'better-sqlite3';
import { SCHEMA_V1, applyMigrations } from '@positron/run-state';
import { executePhase, runPipeline, saveRunToDb } from '../pipeline-runner.js';
import type { PipelineDeps } from '../pipeline-runner.js';
import type { RunState } from '@positron/run-state';
import { FakeGitHubAdapter } from '@positron/github-adapter';
import { FakeSpecKitAdapter, FAKE_HEALTH_AVAILABLE } from '@positron/speckit-adapter';
import { FakeOpenCodeAdapter, FAKE_OPENCODE_HEALTH_AVAILABLE } from '@positron/opencode-adapter';
import { FakeGitWorkspaceAdapter } from '@positron/sandbox';

let db: Database.Database;
const repository = { owner: 'test', repo: 'test-repo' };

beforeAll(() => {
  db = new Database(':memory:');
  applyMigrations(db);
  db.exec("INSERT OR IGNORE INTO repositories (id, owner, name, url) VALUES ('test-repo', 'test', 'test-repo', '')");
});

function makeRun(overrides: Partial<RunState> = {}): RunState {
  return {
    id: 'ep-run-' + Math.random().toString(36).slice(2, 8),
    repoId: 'test-repo',
    issueNumber: 42,
    branch: null,
    phase: 'QUEUED',
    status: 'active',
    autonomyLevel: 2,
    attempt: 1,
    startedAt: new Date().toISOString(),
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

describe('executePhase — single phase transitions', () => {
  it('QUEUED transitions to CLAIMED', async () => {
    const result = await executePhase(makeRun(), makeDeps());
    expect(result.phase).toBe('CLAIMED');
  });

  it('CLAIMED transitions to REPO_SYNC', async () => {
    const run = makeRun({ phase: 'CLAIMED' });
    const result = await executePhase(run, makeDeps());
    expect(result.phase).toBe('REPO_SYNC');
  });

  it('REPO_SYNC transitions to ISSUE_CONTEXT and sets workspacePath', async () => {
    const run = makeRun({ phase: 'REPO_SYNC' });
    const result = await executePhase(run, makeDeps());
    expect(result.phase).toBe('ISSUE_CONTEXT');
    expect(result.workspacePath).toBeTruthy();
    expect(result.branch).toBeTruthy();
  });

  it('ISSUE_CONTEXT transitions to WEB_RESEARCH', async () => {
    const run = makeRun({ phase: 'ISSUE_CONTEXT' });
    const result = await executePhase(run, makeDeps());
    expect(result.phase).toBe('WEB_RESEARCH');
  });

  it('SPECIFY transitions to PLAN with artifact-only mode', async () => {
    const run = makeRun({ phase: 'SPECIFY', workspacePath: '/tmp/test-ws' });
    const result = await executePhase(run, makeDeps());
    expect(result.phase).toBe('PLAN');
  });

  it('PLAN transitions to TASKS', async () => {
    const run = makeRun({ phase: 'PLAN', workspacePath: '/tmp/test-ws' });
    const result = await executePhase(run, makeDeps());
    expect(result.phase).toBe('TASKS');
  });

  it('TASKS transitions to ANALYZE', async () => {
    const run = makeRun({ phase: 'TASKS', workspacePath: '/tmp/test-ws' });
    const result = await executePhase(run, makeDeps());
    expect(result.phase).toBe('ANALYZE');
  });

  it('ANALYZE transitions to REVIEW', async () => {
    const run = makeRun({ phase: 'ANALYZE', workspacePath: '/tmp/test-ws' });
    const result = await executePhase(run, makeDeps());
    expect(result.phase).toBe('REVIEW');
  });

  it('REVIEW transitions to IMPLEMENT (artifacts exist)', async () => {
    const run = makeRun({ phase: 'REVIEW' });
    const deps = makeDeps();
    saveRunToDb(run, deps); // Must exist in DB for FK constraint
    // Pre-seed artifacts so REVIEW passes
    db.prepare("INSERT OR IGNORE INTO artifacts (id, run_id, kind) VALUES (?, ?, 'spec')").run('a1', run.id);
    db.prepare("INSERT OR IGNORE INTO artifacts (id, run_id, kind) VALUES (?, ?, 'plan')").run('a2', run.id);
    db.prepare("INSERT OR IGNORE INTO artifacts (id, run_id, kind) VALUES (?, ?, 'tasks')").run('a3', run.id);
    const result = await executePhase(run, deps);
    expect(result.phase).toBe('IMPLEMENT');
  });

  it('REVIEW fails to FAILED_BLOCKED when artifacts missing', async () => {
    const run = makeRun({ phase: 'REVIEW' });
    const deps = makeDeps();
    saveRunToDb(run, deps); // Run exists but no artifacts
    const result = await executePhase(run, deps);
    expect(result.phase).toBe('FAILED_BLOCKED');
    expect(result.lastError).toContain('missing artifacts');
  });

  it('IMPLEMENT transitions to TEST', async () => {
    const run = makeRun({ phase: 'IMPLEMENT', branch: 'positron/issue-42-test', workspacePath: '/tmp/test-ws' });
    const result = await executePhase(run, makeDeps());
    expect(result.phase).toBe('TEST');
  });

  it('TEST passes to VERIFY with no test commands', async () => {
    const run = makeRun({ phase: 'TEST', branch: 'positron/issue-42-test', workspacePath: '/tmp/test-ws' });
    const result = await executePhase(run, makeDeps());
    expect(result.phase).toBe('VERIFY');
  });
});
