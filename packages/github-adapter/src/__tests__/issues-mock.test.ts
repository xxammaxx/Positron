import { describe, expect, test, vi } from 'vitest';
import { pollIssues, filterByLabel, isPullRequest } from '../issues.js';
import type { Octokit } from '@octokit/rest';
import { RequestError } from '@octokit/request-error';
import type { PollState } from '../issues.js';

// Hilfsfunktion: Mock-Octokit
function mockOctokit(overrides: Partial<ReturnType<typeof createMockResponse>> = {}) {
  return {
    paginate: vi.fn(),
    rest: { issues: { listForRepo: vi.fn() } },
    ...overrides,
  } as unknown as Octokit;
}

function createMockResponse(issues: Array<Partial<{
  number: number; title: string; state: string;
  labels: Array<string | { name: string }>;
  updated_at: string; html_url: string; pull_request?: unknown;
}>> = []) {
  return {
    data: issues.map(i => ({
      number: i.number ?? 1,
      title: i.title ?? 'Test Issue',
      state: i.state ?? 'open',
      labels: i.labels ?? [],
      updated_at: i.updated_at ?? '2026-01-01T00:00:00Z',
      html_url: i.html_url ?? `https://github.com/test/repo/issues/${i.number ?? 1}`,
      pull_request: i.pull_request,
    })),
    headers: { etag: '"abc123"' },
  };
}

describe('pollIssues — mocked Octokit', () => {
  test('filtert Pull Requests aus Issues-Liste', async () => {
    const octokit = mockOctokit();
    const response = createMockResponse([
      { number: 1, title: 'Bug fix', updated_at: '2026-01-01T00:00:00Z' },
      { number: 2, title: 'PR', pull_request: { url: '...' }, updated_at: '2026-01-02T00:00:00Z' },
      { number: 3, title: 'Feature', updated_at: '2026-01-03T00:00:00Z' },
    ]);
    (octokit.paginate as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      response.data.filter(i => !i.pull_request)
    );

    const state: PollState = {};
    const issues = await pollIssues(octokit, 'test', 'repo', state);

    expect(issues).toHaveLength(2);
    expect(issues[0].number).toBe(1);
    expect(issues[1].number).toBe(3);
    expect(state.since).toBe('2026-01-03T00:00:00Z');
  });

  test('behandelt 304 Not Modified', async () => {
    const octokit = mockOctokit();
    const err = new RequestError('Not Modified', 304, {
      request: { method: 'GET', url: 'https://api.github.com', headers: {} },
    });
    (octokit.paginate as ReturnType<typeof vi.fn>).mockRejectedValueOnce(err);

    const state: PollState = { since: '2026-01-01T00:00:00Z' };
    const issues = await pollIssues(octokit, 'test', 'repo', state);

    expect(issues).toEqual([]);
    // state.since bleibt unverändert
    expect(state.since).toBe('2026-01-01T00:00:00Z');
  });

  test('propagiert andere Fehler (400, 403, 500)', async () => {
    const octokit = mockOctokit();
    const err = new RequestError('Forbidden', 403, {
      request: { method: 'GET', url: 'https://api.github.com', headers: {} },
    });
    (octokit.paginate as ReturnType<typeof vi.fn>).mockRejectedValueOnce(err);

    await expect(pollIssues(octokit, 'test', 'repo')).rejects.toThrow('Forbidden');
  });

  test('paginate wird mit korrekten Parametern aufgerufen', async () => {
    const octokit = mockOctokit();
    (octokit.paginate as ReturnType<typeof vi.fn>).mockResolvedValueOnce([]);

    const state: PollState = {};
    await pollIssues(octokit, 'xxammaxx', 'Positron', state);

    const paginateCall = (octokit.paginate as ReturnType<typeof vi.fn>).mock.calls[0];
    const params = paginateCall[1];
    expect(params.owner).toBe('xxammaxx');
    expect(params.repo).toBe('Positron');
    expect(params.state).toBe('open');
    expect(params.per_page).toBe(100);
  });

  test('sendet If-None-Match Header wenn etag vorhanden', async () => {
    const octokit = mockOctokit();
    (octokit.paginate as ReturnType<typeof vi.fn>).mockResolvedValueOnce([]);

    const state: PollState = { etag: '"def456"' };
    await pollIssues(octokit, 'test', 'repo', state);

    const params = (octokit.paginate as ReturnType<typeof vi.fn>).mock.calls[0][1];
    expect(params.headers['if-none-match']).toBe('"def456"');
  });
});

describe('filterByLabel', () => {
  test('findet Issues mit Label', () => {
    const issues = [{ number: 1, title: 'Bug', state: 'open', labels: ['bug', 'mvp'], updatedAt: '', url: '' }];
    expect(filterByLabel(issues, 'bug')).toHaveLength(1);
    expect(filterByLabel(issues, 'nonexistent')).toHaveLength(0);
  });
});

describe('isPullRequest', () => {
  test('erkennt PR an pull_request-Key', () => {
    expect(isPullRequest({ number: 1, title: '', state: '', labels: [], updated_at: '', html_url: '', pull_request: { url: 'x' } })).toBe(true);
    expect(isPullRequest({ number: 1, title: '', state: '', labels: [], updated_at: '', html_url: '' })).toBe(false);
    expect(isPullRequest({ number: 1, title: '', state: '', labels: [], updated_at: '', html_url: '', pull_request: undefined })).toBe(false);
  });
});
