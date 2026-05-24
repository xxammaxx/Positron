// Positron — Sandbox Package: Smoke-Tests

import { describe, expect, test } from 'vitest';
import { runCommand } from '../command-runner.js';
import { FakeGitWorkspaceAdapter } from '../fake-adapter.js';
import { TestCommandDetector } from '../detector.js';
import { validatePath, createWorkspacePath } from '../paths.js';
import { TestRunner } from '../test-runner.js';
import { evaluatePushPolicy, guardBranch, generateCommitMessage } from '../commit-policy.js';

describe('FakeGitWorkspaceAdapter', () => {
  test('prepareWorkspace wirft keinen Fehler', async () => {
    const adapter = new FakeGitWorkspaceAdapter();
    const result = await adapter.prepareWorkspace({
      repository: { owner: 'test', repo: 'test', remoteUrl: 'https://github.com/test/test.git' },
      issueNumber: 42,
      issueTitle: 'Test Issue',
      runId: 'test-run-123',
      baseBranch: 'main',
    });

    expect(result).toBeDefined();
    expect(result.branchName).toContain('positron/issue-42');
    expect(result.workspacePath).toContain('positron-fake-');
  });

  test('getStatus: anfangs clean, nach prepareWorkspace dirty', async () => {
    const adapter = new FakeGitWorkspaceAdapter();
    // Vor prepareWorkspace: clean
    const statusBefore = await adapter.getStatus('/fake/path');
    expect(statusBefore.isClean).toBe(true);

    // Nach prepareWorkspace: dirty (simuliert Änderungen)
    await adapter.prepareWorkspace({
      repository: { owner: 'test', repo: 'test', remoteUrl: 'https://github.com/test/test.git' },
      issueNumber: 42, issueTitle: 'Test',
      runId: 'test-run-status', baseBranch: 'main',
    });
    const statusAfter = await adapter.getStatus('/fake/path');
    expect(statusAfter.isClean).toBe(false);
    expect(statusAfter.branch).toBeDefined();
  });

  test('commit: nach prepareWorkspace erfolgreich, danach NO_CHANGES', async () => {
    const adapter = new FakeGitWorkspaceAdapter();
    await adapter.prepareWorkspace({
      repository: { owner: 'test', repo: 'test', remoteUrl: 'https://github.com/test/test.git' },
      issueNumber: 42, issueTitle: 'Test',
      runId: 'test-run-commit', baseBranch: 'main',
    });
    // Erster Commit: erfolgreich (weil _hasChanges=true)
    const result = await adapter.commit('/fake/path', 'test commit');
    expect(result.sha).toContain('fake-commit-sha-');
    // Zweiter Commit: schlägt fehl (weil _hasChanges=false)
    await expect(
      adapter.commit('/fake/path', 'second commit')
    ).rejects.toThrow('NO_CHANGES_TO_COMMIT');
  });
});

describe('paths', () => {
  test('validatePath akzeptiert absolute Pfade', () => {
    expect(() => validatePath('/valid/path')).not.toThrow();
  });

  test('validatePath lehnt relative Pfade ab', () => {
    expect(() => validatePath('relative/path')).toThrow();
  });

  test('createWorkspacePath erzeugt Pfad mit Run-ID', () => {
    const p = createWorkspacePath('abc12345-def', '/tmp/test');
    expect(p).toContain('/tmp/test/abc12345');
  });
});

describe('commit-policy', () => {
  test('guardBranch lehnt main ab', () => {
    expect(guardBranch('main').allowed).toBe(false);
  });

  test('guardBranch erlaubt positron/issue-*', () => {
    expect(guardBranch('positron/issue-42-test').allowed).toBe(true);
  });

  test('evaluatePushPolicy lehnt ohne POSITRON_ENABLE_PUSH ab', () => {
    // env ist in Tests nicht gesetzt
    const result = evaluatePushPolicy('positron/issue-42-test', []);
    expect(result.allowed).toBe(false);
  });

  test('generateCommitMessage erzeugt korrektes Format', () => {
    const msg = generateCommitMessage(42, 'fix the thing');
    expect(msg).toContain('feat(issue-42)');
    expect(msg).toContain('fix the thing');
  });
});
