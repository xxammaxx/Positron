// Positron — Sandbox Package: Smoke-Tests

import path from 'node:path';
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

  test('getStatus: nach prepareWorkspace dirty (simuliert Änderungen), nach commit clean', async () => {
    const adapter = new FakeGitWorkspaceAdapter();
    const result = await adapter.prepareWorkspace({
      repository: { owner: 'test', repo: 'test', remoteUrl: 'https://github.com/test/test.git' },
      issueNumber: 42, issueTitle: 'Test',
      runId: 'test-run-status', baseBranch: 'main',
    });
    const wsPath = result.workspacePath;

    // Nach prepareWorkspace ist der Workspace dirty (simuliert Änderungen für Pipeline)
    const statusBefore = await adapter.getStatus(wsPath);
    expect(statusBefore.isClean).toBe(false);
    expect(statusBefore.branch).toBeDefined();

    // Nach commit ist der Workspace clean
    await adapter.commit(wsPath, 'test');
    const statusAfter = await adapter.getStatus(wsPath);
    expect(statusAfter.isClean).toBe(true);
  });

  test('commit: nach prepareWorkspace dirty → commit erfolgreich, danach clean', async () => {
    const adapter = new FakeGitWorkspaceAdapter();
    const result = await adapter.prepareWorkspace({
      repository: { owner: 'test', repo: 'test', remoteUrl: 'https://github.com/test/test.git' },
      issueNumber: 42, issueTitle: 'Test',
      runId: 'test-run-commit', baseBranch: 'main',
    });
    const wsPath = result.workspacePath;

    // Nach prepareWorkspace: dirty → commit erfolgreich
    const commitResult = await adapter.commit(wsPath, 'test commit');
    expect(commitResult.sha).toContain('fake-commit-sha-');

    // Zweiter Commit: schlägt fehl (weil dirty nach erstem Commit zurückgesetzt wurde)
    await expect(
      adapter.commit(wsPath, 'second commit')
    ).rejects.toThrow('NO_CHANGES_TO_COMMIT');

    // simulateChange → wieder dirty → commit erfolgreich
    adapter.simulateChange(wsPath);
    const thirdCommit = await adapter.commit(wsPath, 'third commit');
    expect(thirdCommit.sha).toContain('fake-commit-sha-');
  });

  test('simulateFileChange setzt dirty-Flag und fileStates — getStatus spiegelt die Dateien', async () => {
    const adapter = new FakeGitWorkspaceAdapter();
    const result = await adapter.prepareWorkspace({
      repository: { owner: 'test', repo: 'test', remoteUrl: 'https://github.com/test/test.git' },
      issueNumber: 42, issueTitle: 'File Change Test',
      runId: 'test-run-file', baseBranch: 'main',
    });
    const wsPath = result.workspacePath;

    // Nach prepareWorkspace: dirty mit Fallback-Dateien (keine simulierten Files)
    const statusDefault = await adapter.getStatus(wsPath);
    expect(statusDefault.isClean).toBe(false);
    expect(statusDefault.staged).toEqual(['README.md', 'src/index.ts']);

    // simulateFileChange → die simulierten Dateien erscheinen in staged
    adapter.simulateFileChange(wsPath, 'src/foo.ts');
    adapter.simulateFileChange(wsPath, 'config.json');
    const status = await adapter.getStatus(wsPath);
    expect(status.isClean).toBe(false);
    expect(status.staged).toEqual(expect.arrayContaining(['src/foo.ts', 'config.json']));
    expect(status.staged.length).toBe(2);

    // commit soll funktionieren
    const commitResult = await adapter.commit(wsPath, 'add foo.ts + config.json');
    expect(commitResult.sha).toContain('fake-commit-sha-');

    // Nach Commit: clean, keine staged files
    const statusAfter = await adapter.getStatus(wsPath);
    expect(statusAfter.isClean).toBe(true);
    expect(statusAfter.staged).toEqual([]);
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
    expect(p).toContain(path.normalize('/tmp/test/abc12345'));
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
