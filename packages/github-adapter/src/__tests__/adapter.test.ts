import { describe, expect, test } from 'vitest';
import { FakeGitHubAdapter } from '../fake-adapter.js';
import { renderAccepted } from '../templates.js';
import type { GitHubIssueSummary } from '../types.js';

function makeIssue(overrides: Partial<GitHubIssueSummary> = {}): GitHubIssueSummary {
  return {
    id: 1, number: 123, title: 'Test Issue', body: null, state: 'open',
    labels: ['bug', 'positron:ready'], assignees: [], htmlUrl: 'https://example.com',
    updatedAt: '2026-01-01T00:00:00Z', createdAt: '2026-01-01T00:00:00Z',
    isPullRequest: false, ...overrides,
  };
}

describe('FakeGitHubAdapter — claimIssue', () => {
  test('claimt Issue mit positron:ready', async () => {
    const adapter = new FakeGitHubAdapter();
    adapter.addIssue(makeIssue());

    const result = await adapter.claimIssue(
      { owner: 'x', repo: 'y', issueNumber: 123 },
      {
        runId: 'run-1',
        claimLabel: 'positron:ready',
        runningLabel: 'positron:running',
        readyLabel: 'positron:ready',
        commentBody: renderAccepted('run-1', 123),
      },
    );

    expect(result.status).toBe('claimed');
    if (result.status === 'claimed') {
      expect(result.commentId).toBeGreaterThan(0);
    }
  });

  test('not_ready wenn ready-Label fehlt', async () => {
    const adapter = new FakeGitHubAdapter();
    adapter.addIssue(makeIssue({ labels: ['bug'] }));

    const result = await adapter.claimIssue(
      { owner: 'x', repo: 'y', issueNumber: 123 },
      {
        runId: 'run-1', claimLabel: 'positron:ready',
        runningLabel: 'positron:running', readyLabel: 'positron:ready',
        commentBody: renderAccepted('run-1', 123),
      },
    );

    expect(result.status).toBe('not_ready');
  });

  test('already_claimed wenn running-Label bereits gesetzt', async () => {
    const adapter = new FakeGitHubAdapter();
    adapter.addIssue(makeIssue({ labels: ['positron:ready', 'positron:running'] }));

    // Füge existierenden Kommentar hinzu
    await adapter.createIssueComment(
      { owner: 'x', repo: 'y', issueNumber: 123 },
      renderAccepted('existing-run', 123),
    );

    const result = await adapter.claimIssue(
      { owner: 'x', repo: 'y', issueNumber: 123 },
      {
        runId: 'new-run', claimLabel: 'positron:ready',
        runningLabel: 'positron:running', readyLabel: 'positron:ready',
        commentBody: renderAccepted('new-run', 123),
      },
    );

    expect(result.status).toBe('already_claimed');
  });

  test('setzt running-Label nach Claim', async () => {
    const adapter = new FakeGitHubAdapter();
    const issue = makeIssue();
    adapter.addIssue(issue);

    await adapter.claimIssue(
      { owner: 'x', repo: 'y', issueNumber: 123 },
      {
        runId: 'run-1', claimLabel: 'positron:ready',
        runningLabel: 'positron:running', readyLabel: 'positron:ready',
        commentBody: renderAccepted('run-1', 123),
      },
    );

    const updated = await adapter.getIssue({ owner: 'x', repo: 'y', issueNumber: 123 });
    expect(updated.labels).toContain('positron:running');
  });
});

describe('FakeGitHubAdapter — CRUD', () => {
  test('listOpenIssues filtert nach Labels', async () => {
    const adapter = new FakeGitHubAdapter();
    adapter.addIssue(makeIssue({ number: 1, labels: ['positron:ready'] }));
    adapter.addIssue(makeIssue({ number: 2, labels: ['bug'] }));

    const result = await adapter.listOpenIssues('x', 'y', { labels: ['positron:ready'] });
    expect(result).toHaveLength(1);
    expect(result[0].number).toBe(1);
  });

  test('createIssueComment und listIssueComments', async () => {
    const adapter = new FakeGitHubAdapter();
    adapter.addIssue(makeIssue());

    await adapter.createIssueComment({ owner: 'x', repo: 'y', issueNumber: 123 }, 'Hello');
    const comments = await adapter.listIssueComments({ owner: 'x', repo: 'y', issueNumber: 123 });
    expect(comments).toHaveLength(1);
    expect(comments[0].body).toBe('Hello');
  });

  test('addIssueLabels und removeIssueLabel', async () => {
    const adapter = new FakeGitHubAdapter();
    adapter.addIssue(makeIssue({ labels: ['bug'] }));

    await adapter.addIssueLabels({ owner: 'x', repo: 'y', issueNumber: 123 }, ['positron:running']);
    const issue = await adapter.getIssue({ owner: 'x', repo: 'y', issueNumber: 123 });
    expect(issue.labels).toContain('positron:running');

    await adapter.removeIssueLabel({ owner: 'x', repo: 'y', issueNumber: 123 }, 'bug');
    const updated = await adapter.getIssue({ owner: 'x', repo: 'y', issueNumber: 123 });
    expect(updated.labels).not.toContain('bug');
  });
});
