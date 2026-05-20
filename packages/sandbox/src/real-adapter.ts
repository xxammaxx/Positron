// Positron — Real Git Workspace Adapter (clone-per-run)

import fs from 'node:fs';
import path from 'node:path';
import { runCommand } from './command-runner.js';
import { createWorkspacePath, createPositronBranchName, validatePath, validateRemoteUrl } from './paths.js';
import type {
  GitWorkspaceAdapter, PreparedWorkspace, PrepareWorkspaceInput,
  GitStatusSummary, GitDiffSummary,
} from './adapter.js';

export class RealGitWorkspaceAdapter implements GitWorkspaceAdapter {
  async prepareWorkspace(input: PrepareWorkspaceInput): Promise<PreparedWorkspace> {
    const { repository, issueNumber, issueTitle, runId } = input;
    const remoteUrl = validateRemoteUrl(repository.remoteUrl);
    const workspacePath = createWorkspacePath(repository.owner, repository.repo, issueNumber, runId);
    validatePath(workspacePath);

    const branchName = createPositronBranchName(issueNumber, issueTitle);
    let isNewClone = false;
    let isNewBranch = false;

    // Prüfen ob Workspace bereits existiert
    if (fs.existsSync(workspacePath)) {
      // Prüfen ob es ein Git-Repo ist
      const gitDir = path.join(workspacePath, '.git');
      if (!fs.existsSync(gitDir)) {
        throw new Error(`Workspace path exists but is not a git repo: ${workspacePath}`);
      }

      // Fetch
      await runCommand('git', ['fetch', 'origin'], workspacePath);

      // Prüfen ob Branch existiert
      const branchResult = await runCommand('git', ['rev-parse', '--verify', branchName], workspacePath);
      if (branchResult.exitCode !== 0) {
        isNewBranch = true;
      }
    } else {
      // Clone
      fs.mkdirSync(workspacePath, { recursive: true, mode: 0o700 });
      await runCommand('git', ['clone', '--single-branch', remoteUrl, workspacePath], path.dirname(workspacePath));
      isNewClone = true;
      isNewBranch = true;
    }

    // Default-Branch erkennen
    let defaultBranch = 'main';
    const symRef = await runCommand('git', ['symbolic-ref', 'refs/remotes/origin/HEAD'], workspacePath);
    if (symRef.exitCode === 0) {
      const ref = symRef.stdout.trim();
      defaultBranch = ref.replace('refs/remotes/origin/', '');
    }

    const baseBranch = input.baseBranch ?? defaultBranch;

    // Auf Base-Branch wechseln und fetchen
    await runCommand('git', ['fetch', 'origin', baseBranch], workspacePath);
    await runCommand('git', ['checkout', baseBranch], workspacePath);

    // Positron-Branch erstellen oder auschecken
    if (isNewBranch) {
      await runCommand('git', ['checkout', '-b', branchName], workspacePath);
    } else {
      await runCommand('git', ['checkout', branchName], workspacePath);
    }

    // HEAD SHA
    const shaResult = await runCommand('git', ['rev-parse', 'HEAD'], workspacePath);
    const headSha = shaResult.exitCode === 0 ? shaResult.stdout.trim() : undefined;

    return {
      runId, owner: repository.owner, repo: repository.repo,
      workspacePath, branchName, baseBranch, defaultBranch,
      headSha, isNewClone, isNewBranch,
    };
  }

  async getStatus(workspacePath: string): Promise<GitStatusSummary> {
    const branch = await this.getCurrentBranch(workspacePath);

    const result = await runCommand('git', ['status', '--porcelain=v1', '--branch'], workspacePath);
    const lines = result.stdout.split('\n').filter(l => l.trim());

    const staged: string[] = [];
    const unstaged: string[] = [];
    const untracked: string[] = [];
    const conflicted: string[] = [];
    let ahead = 0;
    let behind = 0;

    for (const line of lines) {
      if (line.startsWith('## ')) {
        const m = line.match(/\[ahead\s+(\d+)\]/);
        if (m) ahead = Number(m[1]);
        const b = line.match(/\[behind\s+(\d+)\]/);
        if (b) behind = Number(b[1]);
        continue;
      }
      const code = line.slice(0, 2);
      const file = line.slice(3);
      if (['DD', 'AU', 'UD', 'UA', 'DU', 'AA', 'UU'].includes(code)) {
        conflicted.push(file);
      } else if (code[0] !== ' ' && code[0] !== '?') {
        staged.push(file);
      } else if (code[1] !== ' ') {
        unstaged.push(file);
      } else if (code === '??') {
        untracked.push(file);
      }
    }

    return {
      branch,
      isClean: staged.length === 0 && unstaged.length === 0 && untracked.length === 0 && conflicted.length === 0,
      ahead, behind, staged, unstaged, untracked, conflicted,
    };
  }

  async getDiff(workspacePath: string, options?: { staged?: boolean; baseRef?: string }): Promise<GitDiffSummary> {
    const args = ['diff'];
    if (options?.staged) args.push('--staged');
    if (options?.baseRef) args.push(options.baseRef);
    args.push('--stat');

    const result = await runCommand('git', args, workspacePath);
    const raw = result.stdout;

    let filesChanged = 0;
    let insertions: number | undefined;
    let deletions: number | undefined;

    const lastLine = raw.trim().split('\n').pop() ?? '';
    const statMatch = lastLine.match(/(\d+)\s+files?\s+changed/);
    if (statMatch) filesChanged = Number(statMatch[1]);
    const insMatch = lastLine.match(/(\d+)\s+insertions?/);
    if (insMatch) insertions = Number(insMatch[1]);
    const delMatch = lastLine.match(/(\d+)\s+deletions?/);
    if (delMatch) deletions = Number(delMatch[1]);

    return { raw, filesChanged, insertions, deletions };
  }

  async getCurrentBranch(workspacePath: string): Promise<string> {
    const result = await runCommand('git', ['rev-parse', '--abbrev-ref', 'HEAD'], workspacePath);
    return result.stdout.trim();
  }

  async getHeadSha(workspacePath: string): Promise<string> {
    const result = await runCommand('git', ['rev-parse', 'HEAD'], workspacePath);
    return result.stdout.trim();
  }

  async validateWorkspacePath(workspacePath: string): Promise<void> {
    validatePath(workspacePath);
    const gitDir = path.join(workspacePath, '.git');
    if (!fs.existsSync(gitDir)) {
      throw new Error(`Not a git repository: ${workspacePath}`);
    }
  }
}
