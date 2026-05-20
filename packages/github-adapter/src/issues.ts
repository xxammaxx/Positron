// Positron — Issue Polling und Verwaltung

import type { Octokit } from '@octokit/rest';
import { RequestError } from '@octokit/request-error';

export interface PollState {
  since?: string;
  etag?: string;
}

export interface PolledIssue {
  number: number;
  title: string;
  state: string;
  labels: string[];
  updatedAt: string;
  url: string;
}

interface GitHubIssue {
  number: number;
  title: string;
  state: string;
  labels: (string | { name: string })[];
  updated_at: string;
  html_url: string;
  pull_request?: unknown;
}

/** Labelt Issues aus Rohdaten in PolledIssue um. */
function mapIssue(issue: GitHubIssue): PolledIssue {
  return {
    number: issue.number,
    title: issue.title,
    state: issue.state,
    labels: issue.labels.map(l => (typeof l === 'string' ? l : l.name ?? '')),
    updatedAt: issue.updated_at,
    url: issue.html_url,
  };
}

/** Ruft alle offenen Issues ab (paginiert). Filtert Pull Requests und behandelt 304. */
export async function pollIssues(
  octokit: Octokit,
  owner: string,
  repo: string,
  state: PollState = {},
): Promise<PolledIssue[]> {
  try {
    const allIssues = await octokit.paginate(octokit.rest.issues.listForRepo, {
      owner, repo,
      state: 'open' as const,
      sort: 'updated' as const,
      direction: 'asc' as const,
      since: state.since,
      per_page: 100,
      headers: {
        ...(state.etag ? { 'if-none-match': state.etag } : {}),
      },
    }, (response) => {
      state.etag = response.headers.etag ?? undefined;
      return (response.data as GitHubIssue[]).filter(i => !i.pull_request);
    });

    const newest = allIssues.at(-1)?.updated_at;
    if (newest) state.since = newest;

    return allIssues.map(mapIssue);
  } catch (err) {
    // 304 Not Modified — keine neuen Issues
    if (err instanceof RequestError && err.status === 304) {
      return [];
    }
    throw err;
  }
}

/** Filtert Issues mit einem bestimmten Label. */
export function filterByLabel(issues: PolledIssue[], label: string): PolledIssue[] {
  return issues.filter(i => i.labels.includes(label));
}

/** Prüft ob ein Issue ein PR ist (Pull-Request-Key existiert). */
export function isPullRequest(issue: GitHubIssue): boolean {
  return 'pull_request' in issue && issue.pull_request !== undefined && issue.pull_request !== null;
}
