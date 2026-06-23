// Positron — GitHub Adapter: Smoke-Tests

import { beforeEach, describe, expect, it } from 'vitest';
import { FakeGitHubAdapter } from '../fake-adapter.js';
import type { GitHubIssueSummary, GitHubRepositorySummary } from '../types.js';

function makeIssue(
	overrides: Partial<GitHubIssueSummary> & { number: number },
): GitHubIssueSummary {
	return {
		id: overrides.number,
		number: overrides.number,
		title: overrides.title ?? 'Test Issue',
		body: overrides.body ?? null,
		state: overrides.state ?? 'open',
		labels: overrides.labels ?? [],
		assignees: overrides.assignees ?? [],
		htmlUrl: overrides.htmlUrl ?? `https://github.com/owner/repo/issues/${overrides.number}`,
		updatedAt: overrides.updatedAt ?? new Date().toISOString(),
		createdAt: overrides.createdAt ?? new Date().toISOString(),
		isPullRequest: overrides.isPullRequest ?? false,
	};
}

function makeRepo(
	overrides: Partial<GitHubRepositorySummary> & { owner: string; name: string },
): GitHubRepositorySummary {
	return {
		id: overrides.id ?? 1,
		owner: overrides.owner,
		name: overrides.name,
		fullName: overrides.fullName ?? `${overrides.owner}/${overrides.name}`,
		defaultBranch: overrides.defaultBranch ?? 'main',
	};
}

describe('FakeGitHubAdapter', () => {
	let adapter: FakeGitHubAdapter;

	beforeEach(() => {
		adapter = new FakeGitHubAdapter();
	});

	it('listOpenIssues gibt leere Liste zurück wenn keine Issues vorhanden', async () => {
		const issues = await adapter.listOpenIssues('owner', 'repo');
		expect(Array.isArray(issues)).toBe(true);
		expect(issues).toHaveLength(0);
	});

	it('erstellt einen Pull Request', async () => {
		const pr = await adapter.createPullRequest({
			owner: 'owner',
			repo: 'repo',
			title: 'Test PR',
			body: 'Test body',
			head: 'feature-branch',
			base: 'main',
		});
		expect(pr).toHaveProperty('number');
		expect(pr.state).toBe('open');
		expect(pr.head.ref).toBe('feature-branch');
		expect(pr.base.ref).toBe('main');
	});

	it('createPullRequest ist idempotent — gleicher PR wird zurückgegeben', async () => {
		const pr1 = await adapter.createPullRequest({
			owner: 'owner',
			repo: 'repo',
			title: 'Test PR',
			head: 'feature',
			base: 'main',
		});
		const pr2 = await adapter.createPullRequest({
			owner: 'owner',
			repo: 'repo',
			title: 'Test PR',
			head: 'feature',
			base: 'main',
		});
		expect(pr1.number).toBe(pr2.number);
	});

	it('listPullRequests filtert nach state', async () => {
		await adapter.createPullRequest({
			owner: 'owner',
			repo: 'repo',
			title: 'Open PR',
			head: 'feature',
			base: 'main',
		});
		const open = await adapter.listPullRequests({ owner: 'owner', repo: 'repo', state: 'open' });
		expect(open).toHaveLength(1);
	});

	it('schließt ein Issue', async () => {
		adapter.addIssue(makeIssue({ number: 1 }));
		await expect(adapter.closeIssue('owner', 'repo', 1)).resolves.not.toThrow();
	});

	it('closeIssue wirft Fehler bei nicht-existierendem Issue', async () => {
		await expect(adapter.closeIssue('owner', 'repo', 999)).rejects.toThrow('Issue #999 not found');
	});

	it('mergePullRequest merged einen offenen PR', async () => {
		const pr = await adapter.createPullRequest({
			owner: 'owner',
			repo: 'repo',
			title: 'Test PR',
			head: 'feature',
			base: 'main',
		});
		const result = await adapter.mergePullRequest({
			owner: 'owner',
			repo: 'repo',
			prNumber: pr.number,
			strategy: 'squash',
		});
		expect(result.merged).toBe(true);
		expect(result.sha).toBe('fake-merge-sha');
	});

	it('mergePullRequest lehnt nicht-existierenden PR ab', async () => {
		const result = await adapter.mergePullRequest({
			owner: 'owner',
			repo: 'repo',
			prNumber: 999,
			strategy: 'squash',
		});
		expect(result.merged).toBe(false);
		expect(result.message).toBe('PR not found');
	});

	it('addIssueLabels und removeIssueLabel', async () => {
		adapter.addIssue(makeIssue({ number: 1 }));
		await adapter.addIssueLabels({ owner: 'owner', repo: 'repo', issueNumber: 1 }, [
			'positron:running',
		]);
		await adapter.removeIssueLabel(
			{ owner: 'owner', repo: 'repo', issueNumber: 1 },
			'positron:running',
		);
		// Kein Fehler = erfolgreich
	});

	it('getRepository gibt hinzugefügtes Repo zurück', async () => {
		adapter.addRepo(makeRepo({ owner: 'owner', name: 'repo' }));
		const repo = await adapter.getRepository('owner', 'repo');
		expect(repo.name).toBe('repo');
	});

	it('requestReviewers funktioniert', async () => {
		const result = await adapter.requestReviewers({
			owner: 'owner',
			repo: 'repo',
			prNumber: 1,
			reviewers: ['user1'],
		});
		expect(result.requested).toBe(true);
		expect(result.reviewers).toContain('user1');
	});

	it('createIssueComment erzeugt Kommentar', async () => {
		const result = await adapter.createIssueComment(
			{ owner: 'owner', repo: 'repo', issueNumber: 1 },
			'Test comment',
		);
		expect(result.id).toBeGreaterThan(0);
		expect(result.htmlUrl).toContain('issuecomment');
	});
});

describe('Label-Lifecycle Vollständigkeit', () => {
	it('alle Phasen haben eine Label-Definition in LABEL_LIFECYCLE', async () => {
		const { LABEL_LIFECYCLE } = await import('../label-lifecycle.js');
		const { ALL_PHASES } = await import('@positron/shared');

		for (const phase of ALL_PHASES) {
			expect(LABEL_LIFECYCLE).toHaveProperty(phase);
		}
	});
});
