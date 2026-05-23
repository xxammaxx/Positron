import { describe, expect, test } from 'vitest';
import { FakeGitHubAdapter } from '../fake-adapter.js';
import { GitHubStatusSyncService } from '../sync-service.js';
import type { TestReport } from '@positron/sandbox';
import { liveE2EMarker } from '@positron/shared';

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

  // Issue #13.1 — Tests für FAILED_TRANSIENT lifecycle
  test('syncFailed — setzt positron:failed Label', async () => {
    const adapter = makeAdapter();
    const svc = new GitHubStatusSyncService(adapter);
    const result = await svc.syncFailed(makeInput({
      phase: 'TEST',
      error: { type: 'test', message: 'Tests failed: 3 of 10' },
    }));
    expect(result.status).toBe('synced');
    expect(result.labelsAdded).toContain('positron:failed');
    expect(result.labelsAdded).not.toContain('positron:blocked');
  });

  test('syncFailed — entfernt running/repo-sync/research/testing/done/blocked', async () => {
    const adapter = makeAdapter();
    // Pre-set some labels to verify removal via addIssueLabels
    await adapter.addIssueLabels({ owner: 'x', repo: 'y', issueNumber: 123 }, [
      'positron:running', 'positron:repo-sync', 'positron:research',
      'positron:testing', 'positron:done', 'positron:blocked',
    ]);
    const svc = new GitHubStatusSyncService(adapter);
    const result = await svc.syncFailed(makeInput({
      phase: 'FAILED_TRANSIENT',
      error: { type: 'fatal', message: 'Critical failure' },
    }));
    expect(result.status).toBe('synced');
    expect(result.labelsAdded).toContain('positron:failed');
    expect(result.labelsRemoved).toContain('positron:running');
    expect(result.labelsRemoved).toContain('positron:repo-sync');
    expect(result.labelsRemoved).toContain('positron:research');
    expect(result.labelsRemoved).toContain('positron:testing');
    expect(result.labelsRemoved).toContain('positron:done');
    expect(result.labelsRemoved).toContain('positron:blocked');
  });

  test('syncBlocked — setzt positron:blocked, nicht failed', async () => {
    const adapter = makeAdapter();
    const svc = new GitHubStatusSyncService(adapter);
    const result = await svc.syncBlocked(makeInput({
      phase: 'TEST',
      error: { type: 'blocker', message: 'No test framework found' },
    }));
    expect(result.status).toBe('synced');
    expect(result.labelsAdded).toContain('positron:blocked');
    expect(result.labelsAdded).not.toContain('positron:failed');
  });

  test('syncDone — setzt positron:done, entfernt failed', async () => {
    const adapter = makeAdapter();
    await adapter.addIssueLabels({ owner: 'x', repo: 'y', issueNumber: 123 }, [
      'positron:running', 'positron:failed',
    ]);
    const svc = new GitHubStatusSyncService(adapter);
    const result = await svc.syncDone(makeInput({ phase: 'DONE' }));
    expect(result.status).toBe('synced');
    expect(result.labelsAdded).toContain('positron:done');
    expect(result.labelsRemoved).toContain('positron:failed');
  });

  test('syncPhaseUpdate — akzeptiert liveMarker und behält Umlaute', async () => {
    const adapter = makeAdapter();
    const svc = new GitHubStatusSyncService(adapter);
    const result = await svc.syncPhaseUpdate(makeInput({
      phase: 'RESEARCH',
      status: 'active',
      message: 'Größe prüfen',
      liveMarker: liveE2EMarker('live-e2e-20260521-abc123'),
    }));

    expect(result.status).toBe('synced');

    const comments = await adapter.listIssueComments({ owner: 'x', repo: 'y', issueNumber: 123 });
    expect(comments[0].body).toContain('<!-- positron:live-e2e=true -->');
    expect(comments[0].body).toContain('Größe prüfen');
  });
});
