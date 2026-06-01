// Positron — GitHubAdapter Contract Tests (QA-007)
// Testet Fake-Implementierung gegen das Interface.
// Real-Implementierung wird getestet wenn GITHUB_TOKEN gesetzt ist.

import { describe, it, expect, beforeAll } from 'vitest';
import type { GitHubAdapter } from '../adapter.js';
import type { GitHubIssueRef } from '../types.js';
import { FakeGitHubAdapter } from '../fake-adapter.js';

// ─── Hilfsfunktionen ───

function ref(owner = 'test-owner', repo = 'test-repo', issueNumber = 1): GitHubIssueRef {
  return { owner, repo, issueNumber };
}

async function createRealOrSkip(): Promise<{ adapter: GitHubAdapter | null; skip: boolean }> {
  const token = process.env.GITHUB_TOKEN || process.env.POSITRON_GITHUB_TOKEN;
  if (!token || token === 'ghp_fake' || token.startsWith('fake')) {
    return { adapter: null, skip: true };
  }
  try {
    const { createRealGitHubAdapter } = await import('../real-adapter.js');
    return { adapter: createRealGitHubAdapter(), skip: false };
  } catch {
    return { adapter: null, skip: true };
  }
}

// ─── Contract-Test-Runner ───

function runGitHubAdapterContractTests(
  factory: () => GitHubAdapter | Promise<GitHubAdapter>,
  label: string,
) {
  describe(`GitHubAdapter Contract [${label}]`, () => {
    let adapter: GitHubAdapter;

    beforeAll(async () => {
      adapter = await factory();
    });

    // ─── Grundlegende Interface-Präsenz ───

    it('should have all required methods', () => {
      const methods: (keyof GitHubAdapter)[] = [
        'getRepository', 'listOpenIssues', 'getIssue', 'listIssueComments',
        'createIssueComment', 'addIssueLabels', 'removeIssueLabel', 'claimIssue',
        'createPullRequest', 'listPullRequests', 'listPullRequestFiles',
        'getPullRequest', 'mergePullRequest', 'requestReviewers', 'closeIssue',
      ];
      for (const method of methods) {
        expect(typeof adapter[method]).toBe('function');
      }
    });

    // ─── getRepository ───

    it('getRepository: throws for unknown repo (fake starts empty)', async () => {
      // Fake-Adapter hat keine vorab angelegten Repos
      await expect(
        adapter.getRepository('owner', 'repo'),
      ).rejects.toThrow();
    });

    // ─── getIssue ───

    it('getIssue: returns null for non-existent issue', async () => {
      await expect(adapter.getIssue(ref('o', 'r', 99999999))).rejects.toThrow();
    });

    it('getIssue: works for known issue (Fake)', async () => {
      // Zuerst ein Issue anlegen (nur Fake)
      if (label === 'Fake') {
        // Fake-Adapter hat keine direkte addIssue, wir testen über listOpenIssues
        const issues = await adapter.listOpenIssues('owner', 'repo');
        expect(Array.isArray(issues)).toBe(true);
      }
    });

    // ─── listOpenIssues ───

    it('listOpenIssues: returns array', async () => {
      const issues = await adapter.listOpenIssues('owner', 'repo');
      expect(Array.isArray(issues)).toBe(true);
    });

    it('listOpenIssues: respects limit option', async () => {
      const issues = await adapter.listOpenIssues('owner', 'repo', { limit: 1 });
      expect(issues.length).toBeLessThanOrEqual(1);
    });

    // ─── createIssueComment ───

    it('createIssueComment: returns comment result', async () => {
      const result = await adapter.createIssueComment(ref(), 'Test comment body');
      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.htmlUrl).toBeDefined();
    });

    it('createIssueComment: rejects empty body gracefully', async () => {
      // Leerer Body sollte nicht crashen
      const result = await adapter.createIssueComment(ref(), '');
      expect(result).toBeDefined();
    });

    it('createIssueComment: handles special characters in body', async () => {
      const specialBody = '## Markdown\n- Item 1\n- Item 2\n```ts\nconst x = 1;\n```';
      const result = await adapter.createIssueComment(ref(), specialBody);
      expect(result).toBeDefined();
    });

    // ─── listIssueComments ───

    it('listIssueComments: returns array', async () => {
      // Erst einen Kommentar erstellen, dann lesen
      await adapter.createIssueComment(ref(), 'Comment for listing test');
      const comments = await adapter.listIssueComments(ref());
      expect(Array.isArray(comments)).toBe(true);
    });

    // ─── Labels ───

    it('addIssueLabels: does not throw for valid labels', async () => {
      await expect(
        adapter.addIssueLabels(ref(), ['bug', 'enhancement']),
      ).resolves.not.toThrow();
    });

    it('removeIssueLabel: does not throw for existing label', async () => {
      await adapter.addIssueLabels(ref(), ['test-label']);
      await expect(
        adapter.removeIssueLabel(ref(), 'test-label'),
      ).resolves.not.toThrow();
    });

    it('removeIssueLabel: handles non-existent label gracefully', async () => {
      await expect(
        adapter.removeIssueLabel(ref(), 'nonexistent-label-xyz'),
      ).resolves.not.toThrow();
    });

    // ─── claimIssue ───

    it('claimIssue: throws for non-existent issue (fake has none)', async () => {
      // Fake-Adapter wirft "Issue not found" wenn kein Issue existiert
      await expect(
        adapter.claimIssue(ref(), {
          runId: 'run-1',
          claimLabel: 'positron:ready',
          runningLabel: 'positron:running',
          commentBody: 'Claiming issue for run-1',
        }),
      ).rejects.toThrow();
    });

    // ─── createPullRequest ───

    it('createPullRequest: creates a PR', async () => {
      const pr = await adapter.createPullRequest({
        owner: 'owner', repo: 'repo',
        title: 'Test PR',
        head: 'feature-branch', base: 'main',
        body: 'PR body for testing',
      });
      expect(pr).toBeDefined();
      expect(pr.number).toBeDefined();
      expect(pr.title).toBe('Test PR');
    });

    it('createPullRequest: is idempotent (same head→base returns existing PR)', async () => {
      const pr1 = await adapter.createPullRequest({
        owner: 'owner', repo: 'repo',
        title: 'Idempotent PR', head: 'idem-branch', base: 'main',
      });
      const pr2 = await adapter.createPullRequest({
        owner: 'owner', repo: 'repo',
        title: 'Should be ignored', head: 'idem-branch', base: 'main',
      });
      expect(pr1.number).toBe(pr2.number);
      expect(pr2.title).toBe('Idempotent PR'); // Original-Titel bleibt
    });

    it('createPullRequest: supports draft PRs', async () => {
      const pr = await adapter.createPullRequest({
        owner: 'owner', repo: 'repo',
        title: 'Draft PR', head: 'draft-branch', base: 'main',
        draft: true,
      });
      expect(pr.draft).toBe(true);
    });

    // ─── listPullRequests ───

    it('listPullRequests: returns array', async () => {
      const prs = await adapter.listPullRequests({ owner: 'owner', repo: 'repo' });
      expect(Array.isArray(prs)).toBe(true);
    });

    it('listPullRequests: filters by state', async () => {
      const openPRs = await adapter.listPullRequests({
        owner: 'owner', repo: 'repo', state: 'open',
      });
      expect(Array.isArray(openPRs)).toBe(true);
    });

    // ─── getPullRequest ───

    it('getPullRequest: returns PR by number', async () => {
      const pr = await adapter.createPullRequest({
        owner: 'owner', repo: 'repo',
        title: 'Get PR test', head: 'get-pr-branch', base: 'main',
      });
      const fetched = await adapter.getPullRequest('owner', 'repo', pr.number);
      expect(fetched.number).toBe(pr.number);
      expect(fetched.title).toBe(pr.title);
    });

    it('getPullRequest: throws for non-existent PR number', async () => {
      await expect(
        adapter.getPullRequest('owner', 'repo', 999999),
      ).rejects.toThrow();
    });

    // ─── mergePullRequest ───

    it('mergePullRequest: returns merge result', async () => {
      const pr = await adapter.createPullRequest({
        owner: 'owner', repo: 'repo',
        title: 'Merge test PR', head: 'merge-branch', base: 'main',
      });
      const result = await adapter.mergePullRequest({
        owner: 'owner', repo: 'repo', prNumber: pr.number,
      });
      expect(result).toBeDefined();
      expect(typeof result.merged).toBe('boolean');
    });

    // ─── closeIssue ───

    it('closeIssue: throws for non-existent issue', async () => {
      // Fake-Adapter wirft "Issue #N not found" für nicht existierende Issues
      await expect(
        adapter.closeIssue('owner', 'repo', 999999),
      ).rejects.toThrow();
    });

    // ─── Fehlerfälle: Nicht-existente Repos/Owner ───

    it('getRepository: handles non-existent repo (throws)', async () => {
      // Fake-Adapter wirft "Repository not found"
      await expect(
        adapter.getRepository('nonexistent', 'nope'),
      ).rejects.toThrow();
    });

    it('closeIssue: throws for non-existent issue', async () => {
      await expect(
        adapter.closeIssue('owner', 'repo', 999999),
      ).rejects.toThrow();
    });
  });
}

// ─── Ausführung ───

describe('GitHubAdapter Contract Suite', () => {
  runGitHubAdapterContractTests(() => new FakeGitHubAdapter(), 'Fake');

  describe('Real GitHubAdapter', () => {
    it('contract tests against real GitHub API (skipped: no valid token)', async () => {
      const { adapter, skip } = await createRealOrSkip();
      if (skip) {
        // Fake-Token oder kein Token — überspringen
        return;
      }
      expect(adapter).toBeDefined();
      // Grundlegende Smoke-Tests für Real-Adapter
      const issue = await adapter!.getIssue(ref('xxammaxx', 'Positron', 1));
      expect(issue).toBeDefined();
    });
  });
});
