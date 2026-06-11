// Positron — GitHub Issue Comments

import type { Octokit } from '@octokit/rest';

/**
 * Schreibt einen Kommentar in ein GitHub-Issue.
 */
export async function writeComment(
	octokit: Octokit,
	owner: string,
	repo: string,
	issueNumber: number,
	body: string,
): Promise<{ id: number; url: string }> {
	const result = await octokit.rest.issues.createComment({
		owner,
		repo,
		issue_number: issueNumber,
		body,
	});

	return { id: result.data.id, url: result.data.html_url };
}

/**
 * Erzeugt einen eindeutigen Marker für Positron-Kommentare.
 */
export function commentMarker(runId: string, phase: string): string {
	return `<!-- positron:${runId}:${phase} -->`;
}
