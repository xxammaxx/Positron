import { describe, expect, test } from 'vitest';
import { FakeGitHubAdapter } from '../fake-adapter.js';
import { GitHubStatusSyncService } from '../sync-service.js';
import type { TestReport } from '@positron/sandbox';

function makeAdapter() {
  const adapter = new FakeGitHubAdapter();
  adapter.addIssue({
    id: 1, number: 123, title: 'Test', body: null, state: 'open',
    labels: ['positron:ready'], assignees: [], htmlUrl: '',
    updatedAt: '', createdAt: '', isPullRequest: false,
  });
  return adapter;
}

function makeInput(overrides = {}) {
  return {
    runId: 'run-1', owner: 'x', repo: 'y', issueNumber: 123,
    phase: 'CLAIMED', status: 'active', ...overrides,
  };
}

describe('GitHubStatusSyncService', () => {
  test('syncRunAccepted — setzt Labels + Kommentar', async () => {
    const adapter = makeAdapter();
    const svc = new GitHubStatusSyncService(adapter);
    const result = await svc.syncRunAccepted(makeInput());

    expect(result.status).toBe('synced');
    expect(result.labelsAdded).toContain('positron:running');
    expect(result.commentId).toBeGreaterThan(0);
  });

  test('syncRunAccepted — Deduplizierung', async () => {
    const adapter = makeAdapter();
    const svc = new GitHubStatusSyncService(adapter);

    await svc.syncRunAccepted(makeInput()); // Erster Call
    const result = await svc.syncRunAccepted(makeInput()); // Zweiter Call

    expect(result.status).toBe('skipped');
  });

  test('syncTestReport — PASS', async () => {
    const adapter = makeAdapter();
    const svc = new GitHubStatusSyncService(adapter);
    const report: TestReport = {
      runId: 'run-1', workspacePath: '/tmp', status: 'PASS',
      startedAt: '', finishedAt: '', commands: [], blockedReasons: [],
      summary: 'All tests passed',
    };

    const result = await svc.syncTestReport(makeInput({ testReport: report }));
    expect(result.status).toBe('synced');
  });

  test('syncBlocked', async () => {
    const adapter = makeAdapter();
    const svc = new GitHubStatusSyncService(adapter);
    const result = await svc.syncBlocked(makeInput({ phase: 'TEST', error: { type: 'test', message: 'No tests found' } }));
    expect(result.status).toBe('synced');
    expect(result.labelsAdded).toContain('positron:blocked');
  });

  test('syncDone', async () => {
    const adapter = makeAdapter();
    const svc = new GitHubStatusSyncService(adapter);
    const result = await svc.syncDone(makeInput({ phase: 'DONE' }));
    expect(result.status).toBe('synced');
  });
});
