// Positron — Fake Git Workspace Adapter (für Tests)

import fs from 'node:fs';
import type {
  GitWorkspaceAdapter, PreparedWorkspace, PrepareWorkspaceInput,
  GitStatusSummary, GitDiffSummary,
} from './adapter.js';
import { createWorkspacePath, createPositronBranchName, validatePath, validateRemoteUrl } from './paths.js';

export class FakeGitWorkspaceAdapter implements GitWorkspaceAdapter {
  private workspaces = new Map<string, PreparedWorkspace>();
  private statuses = new Map<string, GitStatusSummary>();
  private diffs = new Map<string, GitDiffSummary>();
  private branches = new Map<string, string>();
  private shas = new Map<string, string>();

  constructor() {
    // Vorhandenes Positron-Workspace-Verzeichnis erstellen
    const root = process.env.POSITRON_WORKSPACE_ROOT;
    if (root && !fs.existsSync(root)) {
      fs.mkdirSync(root, { recursive: true, mode: 0o700 });
    }
  }

  async prepareWorkspace(input: PrepareWorkspaceInput): Promise<PreparedWorkspace> {
    const { repository, issueNumber, issueTitle, runId } = input;
    validateRemoteUrl(repository.remoteUrl);
    const workspacePath = createWorkspacePath(repository.owner, repository.repo, issueNumber, runId);
    validatePath(workspacePath);

    // Verzeichnis simulieren
    if (!fs.existsSync(workspacePath)) {
      fs.mkdirSync(workspacePath, { recursive: true, mode: 0o700 });
      fs.writeFileSync(`${workspacePath}/.git`, ''); // Dummy .git
    }

    const branchName = createPositronBranchName(issueNumber, issueTitle);
    const defaultBranch = 'main';
    const baseBranch = input.baseBranch ?? defaultBranch;
    const isNewBranch = !this.branches.has(branchName);

    const ws: PreparedWorkspace = {
      runId, owner: repository.owner, repo: repository.repo,
      workspacePath, branchName, baseBranch, defaultBranch,
      headSha: 'abc123def456', isNewClone: true, isNewBranch,
    };

    this.workspaces.set(workspacePath, ws);
    this.branches.set(branchName, workspacePath);
    this.statuses.set(workspacePath, {
      branch: branchName, isClean: true, ahead: 0, behind: 0,
      staged: [], unstaged: [], untracked: [], conflicted: [],
    });
    this.diffs.set(workspacePath, { raw: '', filesChanged: 0 });
    this.shas.set(workspacePath, 'abc123def456');

    return ws;
  }

  async getStatus(workspacePath: string): Promise<GitStatusSummary> {
    return this.statuses.get(workspacePath) ?? {
      branch: 'unknown', isClean: true, ahead: 0, behind: 0,
      staged: [], unstaged: [], untracked: [], conflicted: [],
    };
  }

  async getDiff(workspacePath: string): Promise<GitDiffSummary> {
    return this.diffs.get(workspacePath) ?? { raw: '', filesChanged: 0 };
  }

  async getCurrentBranch(workspacePath: string): Promise<string> {
    const ws = this.workspaces.get(workspacePath);
    return ws?.branchName ?? 'unknown';
  }

  async getHeadSha(workspacePath: string): Promise<string> {
    return this.shas.get(workspacePath) ?? '000000000000';
  }

  async validateWorkspacePath(workspacePath: string): Promise<void> {
    validatePath(workspacePath);
  }

  // --- Push/Commit Methods (Issue #19) ---

  private commits = new Map<string, { sha: string; message: string }>();

  async commit(workspacePath: string, message: string): Promise<{ sha: string }> {
    const sha = `fake-commit-${Date.now().toString(16)}`;
    this.commits.set(workspacePath, { sha, message });
    this.shas.set(workspacePath, sha);
    return { sha };
  }

  async push(options: import('./adapter.js').PushOptions): Promise<{ pushed: boolean; ref: string }> {
    if (options.force) throw new Error('Force push blocked');
    return { pushed: true, ref: `refs/heads/${options.branch}` };
  }

  // Test-Hilfsmethoden
  setDirty(workspacePath: string, file: string): void {
    this.statuses.set(workspacePath, {
      branch: this.workspaces.get(workspacePath)?.branchName ?? 'main',
      isClean: false, ahead: 0, behind: 0,
      staged: [], unstaged: [file], untracked: [], conflicted: [],
    });
  }
}
