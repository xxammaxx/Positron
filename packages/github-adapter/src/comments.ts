// Positron — Issue-Kommentare

import type { Octokit } from '@octokit/rest';

/** Schreibt einen Markdown-Kommentar in ein Issue. */
export async function writeComment(
  octokit: Octokit,
  owner: string,
  repo: string,
  issueNumber: number,
  markdown: string,
): Promise<{ id: number; url: string }> {
  const { data } = await octokit.rest.issues.createComment({
    owner, repo, issue_number: issueNumber, body: markdown,
  });

  return { id: data.id, url: data.html_url };
}

/** Generiert einen HTML-Kommentar-Marker für Wiedererkennung. */
export function commentMarker(phase: string, issueNumber: number): string {
  return `<!-- positron:${phase}:issue-${issueNumber} -->`;
}
