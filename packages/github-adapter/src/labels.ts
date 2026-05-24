// Positron — GitHub Label Management

import type { Octokit } from '@octokit/rest';

/**
 * Synchronisiert verwaltete Labels für ein Issue.
 * Fügt Labels hinzu die noch fehlen und belässt bestehende.
 */
export async function syncManagedLabels(
  octokit: Octokit,
  owner: string,
  repo: string,
  issueNumber: number,
  desiredLabels: string[],
): Promise<void> {
  if (desiredLabels.length === 0) return;

  try {
    await octokit.rest.issues.addLabels({
      owner,
      repo,
      issue_number: issueNumber,
      labels: desiredLabels,
    });
  } catch (err) {
    console.warn(`[GitHub Labels] Failed to sync labels for #${issueNumber}:`, String(err));
    throw err;
  }
}
