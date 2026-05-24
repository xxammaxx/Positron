// Positron — GitHub Issue Polling

import type { Octokit } from '@octokit/rest';

export interface PollState {
  since?: string;
}

export interface PolledIssue {
  number: number;
  title: string;
  state: string;
  labels: string[];
  url: string;
  updatedAt: string;
  createdAt: string;
}

/**
 * Pollt offene Issues von einem GitHub-Repository.
 */
export async function pollIssues(
  octokit: Octokit,
  owner: string,
  repo: string,
  state?: PollState,
): Promise<PolledIssue[]> {
  const result = await octokit.rest.issues.listForRepo({
    owner,
    repo,
    state: 'open',
    since: state?.since,
    per_page: 100,
    sort: 'updated',
    direction: 'desc',
  });

  return result.data
    .filter(issue => !issue.pull_request)
    .map(issue => ({
      number: issue.number,
      title: issue.title,
      state: issue.state,
      labels: (issue.labels ?? []).map(l => typeof l === 'string' ? l : l.name ?? ''),
      url: issue.html_url,
      updatedAt: issue.updated_at,
      createdAt: issue.created_at,
    }));
}

/**
 * Filtert Issues nach einem Label.
 */
export function filterByLabel(issues: PolledIssue[], label: string): PolledIssue[] {
  return issues.filter(i => i.labels.includes(label));
}

/**
 * Prüft ob ein GitHub-Issue ein Pull Request ist.
 */
export function isPullRequest(issue: { pull_request?: unknown }): boolean {
  return issue.pull_request !== undefined && issue.pull_request !== null;
}
