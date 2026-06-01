// Positron — GitWorkspaceAdapter Contract Tests (QA-007)
// Testet Fake-Implementierung gegen das Interface.

import { describe, it, expect, beforeAll } from 'vitest';
import type { GitWorkspaceAdapter } from '@positron/shared';
import { FakeGitWorkspaceAdapter } from '../fake-adapter.js';

function runGitWorkspaceAdapterContractTests(
  factory: () => GitWorkspaceAdapter | Promise<GitWorkspaceAdapter>,
  label: string,
) {
  describe(`GitWorkspaceAdapter Contract [${label}]`, () => {
    let adapter: GitWorkspaceAdapter;

    beforeAll(async () => {
      adapter = await factory();
    });

    // ─── Interface-Präsenz ───

    it('should have all required methods', () => {
      const methods: (keyof GitWorkspaceAdapter)[] = [
        'prepareWorkspace', 'getStatus', 'getDiff', 'getCurrentBranch',
        'getHeadSha', 'validateWorkspacePath', 'commit', 'push',
      ];
      for (const method of methods) {
        expect(typeof adapter[method]).toBe('function');
      }
    });

    // ─── prepareWorkspace ───

    it('prepareWorkspace: returns prepared workspace', async () => {
      const ws = await adapter.prepareWorkspace({
        repository: { owner: 'test-owner', repo: 'test-repo', remoteUrl: 'https://github.com/test-owner/test-repo.git' },
        issueNumber: 42,
        issueTitle: 'Test Issue',
        runId: 'run-ws-1',
      });
      expect(ws).toBeDefined();
      expect(ws.runId).toBe('run-ws-1');
      expect(ws.owner).toBeDefined();
      expect(ws.repo).toBeDefined();
      expect(ws.workspacePath).toBeDefined();
      expect(ws.branchName).toBeDefined();
    });

    it('prepareWorkspace: generates valid branch name from issue title', async () => {
      const ws = await adapter.prepareWorkspace({
        repository: { owner: 'o', repo: 'r', remoteUrl: 'https://github.com/o/r.git' },
        issueNumber: 99,
        issueTitle: 'Fix: Critical Bug in Production (urgent!)',
        runId: 'run-ws-2',
      });
      expect(ws.branchName).toContain('issue-99');
    });

    // ─── getStatus ───

    it('getStatus: returns status summary', async () => {
      const ws = await adapter.prepareWorkspace({
        repository: { owner: 'o', repo: 'r', remoteUrl: 'https://github.com/o/r.git' },
        issueNumber: 1, issueTitle: 'Status test', runId: 'run-st-1',
      });
      const status = await adapter.getStatus(ws.workspacePath);
      expect(status).toBeDefined();
      expect(status.branch).toBeDefined();
      expect(typeof status.isClean).toBe('boolean');
    });

    // ─── getDiff ───

    it('getDiff: returns diff summary', async () => {
      const ws = await adapter.prepareWorkspace({
        repository: { owner: 'o', repo: 'r', remoteUrl: 'https://github.com/o/r.git' },
        issueNumber: 2, issueTitle: 'Diff test', runId: 'run-diff-1',
      });
      const diff = await adapter.getDiff(ws.workspacePath);
      expect(diff).toBeDefined();
      expect(diff.raw).toBeDefined();
      expect(typeof diff.filesChanged).toBe('number');
    });

    // ─── getCurrentBranch ───

    it('getCurrentBranch: returns branch name', async () => {
      const ws = await adapter.prepareWorkspace({
        repository: { owner: 'o', repo: 'r', remoteUrl: 'https://github.com/o/r.git' },
        issueNumber: 3, issueTitle: 'Branch test', runId: 'run-br-1',
      });
      const branch = await adapter.getCurrentBranch(ws.workspacePath);
      expect(typeof branch).toBe('string');
      expect(branch.length).toBeGreaterThan(0);
    });

    // ─── getHeadSha ───

    it('getHeadSha: returns SHA string', async () => {
      const ws = await adapter.prepareWorkspace({
        repository: { owner: 'o', repo: 'r', remoteUrl: 'https://github.com/o/r.git' },
        issueNumber: 4, issueTitle: 'SHA test', runId: 'run-sha-1',
      });
      const sha = await adapter.getHeadSha(ws.workspacePath);
      expect(typeof sha).toBe('string');
      expect(sha.length).toBeGreaterThanOrEqual(7); // mindestens kurzer SHA
    });

    // ─── validateWorkspacePath ───

    it('validateWorkspacePath: does not throw for valid path', async () => {
      const ws = await adapter.prepareWorkspace({
        repository: { owner: 'o', repo: 'r', remoteUrl: 'https://github.com/o/r.git' },
        issueNumber: 5, issueTitle: 'Validate test', runId: 'run-val-1',
      });
      await expect(
        adapter.validateWorkspacePath(ws.workspacePath),
      ).resolves.toBeUndefined();
    });

    it('validateWorkspacePath: accepts empty path without crash (fake is lenient)', async () => {
      // Fake-Adapter validiert keine Pfade — das ist erwartetes Verhalten
      await expect(
        adapter.validateWorkspacePath(''),
      ).resolves.toBeUndefined();
    });

    // ─── commit ───

    it('commit: creates a commit and returns SHA', async () => {
      const ws = await adapter.prepareWorkspace({
        repository: { owner: 'o', repo: 'r', remoteUrl: 'https://github.com/o/r.git' },
        issueNumber: 6, issueTitle: 'Commit test', runId: 'run-cm-1',
      });
      const result = await adapter.commit(ws.workspacePath, 'fix: test commit');
      expect(result).toBeDefined();
      expect(result.sha).toBeDefined();
    });

    it('commit: accepts any message in fake (no message validation)', async () => {
      const ws = await adapter.prepareWorkspace({
        repository: { owner: 'o', repo: 'r', remoteUrl: 'https://github.com/o/r.git' },
        issueNumber: 7, issueTitle: 'Empty commit msg test', runId: 'run-cm-2',
      });
      // Fake-Adapter validiert keine Commit-Messages
      const result = await adapter.commit(ws.workspacePath, '');
      expect(result.sha).toBeDefined();
    });

    it('commit: rejects commit when no changes (second commit on clean workspace)', async () => {
      const ws = await adapter.prepareWorkspace({
        repository: { owner: 'o', repo: 'r', remoteUrl: 'https://github.com/o/r.git' },
        issueNumber: 8, issueTitle: 'Double commit test', runId: 'run-cm-3',
      });
      await adapter.commit(ws.workspacePath, 'fix: first commit');
      // Zweiter Commit auf clean workspace sollte fehlschlagen
      await expect(
        adapter.commit(ws.workspacePath, 'fix: second commit'),
      ).rejects.toThrow();
    });

    // ─── push ───

    it('push: returns push result with ref', async () => {
      const ws = await adapter.prepareWorkspace({
        repository: { owner: 'o', repo: 'r', remoteUrl: 'https://github.com/o/r.git' },
        issueNumber: 9, issueTitle: 'Push test', runId: 'run-push-1',
      });
      await adapter.commit(ws.workspacePath, 'fix: push test commit');
      const result = await adapter.push({
        workspacePath: ws.workspacePath,
        branch: ws.branchName,
      });
      expect(result).toBeDefined();
      expect(typeof result.pushed).toBe('boolean');
      expect(result.ref).toBeDefined();
    });

    // ─── Fehlerfall: ungültiger Workspace-Pfad ───

    it('all methods handle invalid workspace path gracefully in fake (no path validation)', async () => {
      // Fake-Adapter macht keine Pfad-Validierung — das ist erwartet.
      // Der Real-Adapter würde hier rejecten.
      const invalidPath = '/nonexistent/path/that/does/not/exist';
      // getStatus liefert Fake-Daten auch für invalide Pfade
      const status = await adapter.getStatus(invalidPath);
      expect(status).toBeDefined();
      // getDiff ebenfalls
      const diff = await adapter.getDiff(invalidPath);
      expect(diff).toBeDefined();
    });
  });
}

// ─── Ausführung ───

describe('GitWorkspaceAdapter Contract Suite', () => {
  runGitWorkspaceAdapterContractTests(() => new FakeGitWorkspaceAdapter(), 'Fake');
});
