// Positron — Fake Git Workspace Adapter (für Tests)

import type {
  GitWorkspaceAdapter,
  PrepareWorkspaceInput,
  PreparedWorkspace,
  GitStatusSummary,
  GitDiffSummary,
  PushOptions,
} from '@positron/shared';

/**
 * Fake-Git-Workspace-Adapter für Tests.
 * Simuliert alle Git-Operationen ohne echte Git-Calls.
 * 
 * Wichtig: _hasChanges wird nach prepareWorkspace() auf true gesetzt,
 * damit die Pipeline nicht bei NO_CHANGES_TO_COMMIT blockiert.
 */
export class FakeGitWorkspaceAdapter implements GitWorkspaceAdapter {
  private workspaces = new Map<string, PreparedWorkspace>();
  private fileStates = new Map<string, Map<string, string>>();
  private _hasChanges = false;

  async prepareWorkspace(input: PrepareWorkspaceInput): Promise<PreparedWorkspace> {
    const { repository, issueNumber, issueTitle, runId, baseBranch } = input;

    const workspacePath = `/tmp/positron-fake-${runId.slice(0, 8)}`;
    const branchName = `positron/issue-${issueNumber}-${issueTitle
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 50)}`;

    const workspace: PreparedWorkspace = {
      runId,
      owner: repository.owner,
      repo: repository.repo,
      workspacePath,
      branchName,
      baseBranch: baseBranch ?? 'main',
      defaultBranch: baseBranch ?? 'main',
      headSha: 'fake-sha-abc123',
      isNewClone: true,
      isNewBranch: true,
    };

    this.workspaces.set(runId, workspace);
    this.fileStates.set(runId, new Map());
    // Simuliere dass OpenCode Änderungen gemacht hat
    this._hasChanges = true;

    return workspace;
  }

  async getStatus(workspacePath: string): Promise<GitStatusSummary> {
    return {
      branch: this._currentBranch ?? 'positron/issue-42-fake',
      isClean: !this._hasChanges,
      ahead: this._hasChanges ? 1 : 0,
      behind: 0,
      staged: this._hasChanges ? ['README.md', 'src/index.ts'] : [],
      unstaged: [],
      untracked: [],
      conflicted: [],
    };
  }

  private _currentBranch: string | null = null;

  async getDiff(
    _workspacePath: string,
    _options?: { staged?: boolean; baseRef?: string },
  ): Promise<GitDiffSummary> {
    return {
      raw: 'diff --git a/fake.ts b/fake.ts\nindex abc..def 100644\n--- a/fake.ts\n+++ b/fake.ts\n@@ -1 +1 @@\n-old content\n+new content',
      filesChanged: 1,
      insertions: 1,
      deletions: 1,
    };
  }

  async getCurrentBranch(workspacePath: string): Promise<string> {
    return this._currentBranch ?? 'positron/issue-42-fake-branch';
  }

  async getHeadSha(_workspacePath: string): Promise<string> {
    return 'fake-sha-abc123';
  }

  async validateWorkspacePath(_workspacePath: string): Promise<void> {
    // Im Fake-Modus immer valide
  }

  async commit(_workspacePath: string, _message: string): Promise<{ sha: string }> {
    if (!this._hasChanges) {
      throw new Error('NO_CHANGES_TO_COMMIT');
    }
    this._hasChanges = false;
    return { sha: `fake-commit-sha-${Date.now()}` };
  }

  async push(_options: PushOptions): Promise<{ pushed: boolean; ref: string }> {
    return { pushed: true, ref: `origin/${this._currentBranch ?? 'positron/issue-42-fake'}` };
  }
}
