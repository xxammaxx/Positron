import { describe, expect, test } from 'vitest';
import { FakeGitWorkspaceAdapter } from '../fake-adapter.js';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

// Setze Workspace-Root für Tests
process.env.POSITRON_WORKSPACE_ROOT = path.join(os.tmpdir(), `positron-workspace-test-${Date.now()}`);

const adapter = new FakeGitWorkspaceAdapter();

describe('FakeGitWorkspaceAdapter — Integration', () => {
  test('prepareWorkspace erzeugt Workspace', async () => {
    const ws = await adapter.prepareWorkspace({
      repository: { owner: 'xxammaxx', repo: 'Positron', remoteUrl: 'https://github.com/xxammaxx/Positron.git' },
      issueNumber: 10, issueTitle: 'Git Workspace Adapter', runId: 'run-1',
    });

    expect(ws.owner).toBe('xxammaxx');
    expect(ws.repo).toBe('Positron');
    expect(ws.branchName).toBe('positron/issue-10-git-workspace-adapter');
    expect(ws.defaultBranch).toBe('main');
    expect(ws.headSha).toBeDefined();
    expect(ws.isNewClone).toBe(true);
    expect(ws.isNewBranch).toBe(true);
    expect(fs.existsSync(ws.workspacePath)).toBe(true);
  });

  test('getStatus nach prepare', async () => {
    const ws = await adapter.prepareWorkspace({
      repository: { owner: 'x', repo: 'y', remoteUrl: 'https://github.com/x/y.git' },
      issueNumber: 1, issueTitle: 'Test', runId: 'run-2',
    });

    const status = await adapter.getStatus(ws.workspacePath);
    expect(status.branch).toBe('positron/issue-1-test');
    expect(status.isClean).toBe(true);
  });

  test('getHeadSha', async () => {
    const ws = await adapter.prepareWorkspace({
      repository: { owner: 'x', repo: 'y', remoteUrl: 'https://github.com/x/y.git' },
      issueNumber: 2, issueTitle: 'Test', runId: 'run-3',
    });

    const sha = await adapter.getHeadSha(ws.workspacePath);
    expect(sha).toBeDefined();
    expect(sha.length).toBeGreaterThan(0);
  });

  test('setDirty und Status', async () => {
    const ws = await adapter.prepareWorkspace({
      repository: { owner: 'x', repo: 'y', remoteUrl: 'https://github.com/x/y.git' },
      issueNumber: 3, issueTitle: 'Dirty Test', runId: 'run-4',
    });

    adapter.setDirty(ws.workspacePath, 'src/main.ts');
    const status = await adapter.getStatus(ws.workspacePath);
    expect(status.isClean).toBe(false);
    expect(status.unstaged).toContain('src/main.ts');
  });

  test('malicious title behandelt', async () => {
    const ws = await adapter.prepareWorkspace({
      repository: { owner: 'x', repo: 'y', remoteUrl: 'https://github.com/x/y.git' },
      issueNumber: 999, issueTitle: '../../evil $(rm -rf /)', runId: 'run-safe',
    });

    expect(ws.branchName).not.toContain('..');
    expect(ws.branchName).not.toContain('$');
    expect(ws.workspacePath).not.toContain('..');
  });
});
