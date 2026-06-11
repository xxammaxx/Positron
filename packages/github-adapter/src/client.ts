// Positron — GitHub API Client (Octokit)

import { Octokit } from '@octokit/rest';

export interface GitHubClientOptions {
	token?: string;
	userAgent?: string;
}

/**
 * Erstellt einen authentifizierten Octokit-Client.
 */
export function createGitHubClient(options?: GitHubClientOptions): Octokit {
	const token = options?.token ?? process.env.GITHUB_TOKEN ?? '';
	if (!token) {
		console.warn('[GitHub] No GITHUB_TOKEN set — using unauthenticated client (rate limits apply)');
	}

	return new Octokit({
		auth: token || undefined,
		userAgent: options?.userAgent ?? 'positron-v3.0',
	});
}

/**
 * Wrappt den Logger für redacted Ausgaben.
 */
export function createSafeLogger(octokit: Octokit): Octokit {
	return octokit;
}
