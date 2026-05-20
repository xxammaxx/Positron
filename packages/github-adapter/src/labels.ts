// Positron — Label-Management via GitHub API

import type { Octokit } from '@octokit/rest';
import { POSITRON_LABEL_PREFIX } from '@positron/shared';

/** Synchronisiert Positron-Labels auf einem Issue (idempotentes Diffing). */
export async function syncManagedLabels(
  octokit: Octokit,
  owner: string,
  repo: string,
  issueNumber: number,
  desiredLabels: string[],
  managedPrefix: string = POSITRON_LABEL_PREFIX,
): Promise<{ added: string[]; removed: string[] }> {
  const { data: current } = await octokit.rest.issues.listLabelsOnIssue({
    owner, repo, issue_number: issueNumber,
    per_page: 100,
  });

  const currentNames = current.map(l => l.name);
  const managedCurrent = currentNames.filter(n => n.startsWith(managedPrefix));

  const toAdd = desiredLabels.filter(n => !currentNames.includes(n));
  const toRemove = managedCurrent.filter(n => !desiredLabels.includes(n));

  if (toAdd.length > 0) {
    await octokit.rest.issues.addLabels({
      owner, repo, issue_number: issueNumber, labels: toAdd,
    });
  }

  const removed: string[] = [];
  for (const name of toRemove) {
    try {
      await octokit.rest.issues.removeLabel({
        owner, repo, issue_number: issueNumber, name,
      });
      removed.push(name);
    } catch {
      // Label existiert nicht mehr — ignoriere
    }
  }

  return { added: toAdd, removed };
}
