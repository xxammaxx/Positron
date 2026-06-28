// Positron — Real Git Workspace Adapter

import fs from 'node:fs';
import path from 'node:path';
import type {
	GitDiffSummary,
	GitStatusSummary,
	GitWorkspaceAdapter,
	PrepareWorkspaceInput,
	PreparedWorkspace,
	PushOptions,
} from '@positron/shared';
import { GitCommandError, GitCommandFailedError, runCommand } from './command-runner.js';
import { evaluatePushPolicy, generateCommitMessage } from './commit-policy.js';
import { validatePath, validateRemoteUrl } from './paths.js';

/**
 * Echter Git-Workspace-Adapter.
 * Führt echte Git-Operationen via child_process aus.
 */
export class RealGitWorkspaceAdapter implements GitWorkspaceAdapter {
	async prepareWorkspace(input: PrepareWorkspaceInput): Promise<PreparedWorkspace> {
		const { repository, issueNumber, issueTitle, runId, baseBranch } = input;
		validateRemoteUrl(repository.remoteUrl);

		const workspacePath = path.join(
			process.env['POSITRON_WORKSPACE_ROOT'] ?? path.join(process.cwd(), '.positron', 'workspaces'),
			runId.slice(0, 8),
		);

		const branchName = `positron/issue-${issueNumber}-${issueTitle
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-+|-+$/g, '')
			.slice(0, 50)}`;

		const defaultBranch = baseBranch ?? 'main';
		let isNewClone = false;
		let isNewBranch = false;
		let headSha: string | undefined;

		if (!fs.existsSync(workspacePath)) {
			// Repository klonen
			fs.mkdirSync(workspacePath, { recursive: true });
			const result = await runCommand('git', ['clone', repository.remoteUrl, workspacePath], {
				cwd: process.cwd(),
				timeout: 300_000,
			});
			if (result.exitCode !== 0) {
				throw new GitCommandFailedError('git clone', result.exitCode ?? 1, result.stderr);
			}
			isNewClone = true;
		}

		// Branch erstellen/wechseln
		const branchResult = await runCommand('git', ['checkout', '-b', branchName], {
			cwd: workspacePath,
			timeout: 30_000,
		});

		if (branchResult.exitCode !== 0) {
			// Branch existiert bereits — einfach checkout
			await runCommand('git', ['checkout', branchName], {
				cwd: workspacePath,
				timeout: 30_000,
			});
		} else {
			isNewBranch = true;
		}

		// SHA abrufen
		const shaResult = await runCommand('git', ['rev-parse', 'HEAD'], {
			cwd: workspacePath,
			timeout: 10_000,
		});
		headSha = shaResult.stdout.trim();

		return {
			runId,
			owner: repository.owner,
			repo: repository.repo,
			workspacePath,
			branchName,
			baseBranch: defaultBranch,
			defaultBranch,
			headSha,
			isNewClone,
			isNewBranch,
		};
	}

	async getStatus(workspacePath: string): Promise<GitStatusSummary> {
		validatePath(workspacePath);

		const result = await runCommand('git', ['status', '--porcelain'], {
			cwd: workspacePath,
			timeout: 10_000,
		});

		const lines = result.stdout.trim().split('\n').filter(Boolean);
		const staged: string[] = [];
		const unstaged: string[] = [];
		const untracked: string[] = [];
		const conflicted: string[] = [];

		for (const line of lines) {
			const status = line.slice(0, 2);
			const file = line.slice(3);
			if (status === '??') {
				untracked.push(file);
			} else if (status[0] !== ' ') {
				staged.push(file);
			}
			if (status[1] !== ' ' && status[1] !== '?' && status[0] === ' ') {
				unstaged.push(file);
			}
			if (status.includes('U') || status.includes('DD') || status.includes('AA')) {
				conflicted.push(file);
			}
		}

		// Branch ermitteln
		const branchResult = await runCommand('git', ['rev-parse', '--abbrev-ref', 'HEAD'], {
			cwd: workspacePath,
			timeout: 5_000,
		});

		return {
			branch: branchResult.stdout.trim(),
			isClean: lines.length === 0,
			ahead: 0,
			behind: 0,
			staged,
			unstaged,
			untracked,
			conflicted,
		};
	}

	async getDiff(
		workspacePath: string,
		options?: { staged?: boolean; baseRef?: string },
	): Promise<GitDiffSummary> {
		validatePath(workspacePath);

		const args = ['diff'];
		if (options?.staged) args.push('--cached');
		if (options?.baseRef) args.push(options.baseRef);

		const result = await runCommand('git', args, {
			cwd: workspacePath,
			timeout: 10_000,
		});

		const raw = result.stdout;
		const filesChanged = raw.split('\ndiff --git ').length - 1;

		// Einfügungen und Löschungen zählen
		let insertions = 0;
		let deletions = 0;
		for (const line of raw.split('\n')) {
			if (line.startsWith('+') && !line.startsWith('+++')) insertions++;
			if (line.startsWith('-') && !line.startsWith('---')) deletions++;
		}

		return { raw, filesChanged, insertions, deletions };
	}

	async getCurrentBranch(workspacePath: string): Promise<string> {
		validatePath(workspacePath);
		const result = await runCommand('git', ['rev-parse', '--abbrev-ref', 'HEAD'], {
			cwd: workspacePath,
			timeout: 5_000,
		});
		return result.stdout.trim();
	}

	async getHeadSha(workspacePath: string): Promise<string> {
		validatePath(workspacePath);
		const result = await runCommand('git', ['rev-parse', 'HEAD'], {
			cwd: workspacePath,
			timeout: 5_000,
		});
		return result.stdout.trim();
	}

	async validateWorkspacePath(workspacePath: string): Promise<void> {
		validatePath(workspacePath);
		if (!fs.existsSync(workspacePath)) {
			throw new GitCommandError(`Workspace path does not exist: "${workspacePath}"`);
		}
	}

	async commit(workspacePath: string, message: string): Promise<{ sha: string }> {
		validatePath(workspacePath);

		// Stage all changes
		await runCommand('git', ['add', '-A'], { cwd: workspacePath, timeout: 30_000 });

		// Commit
		const result = await runCommand('git', ['commit', '-m', message], {
			cwd: workspacePath,
			timeout: 30_000,
		});

		if (result.exitCode !== 0) {
			throw new GitCommandFailedError('git commit', result.exitCode ?? 1, result.stderr);
		}

		const shaResult = await runCommand('git', ['rev-parse', 'HEAD'], {
			cwd: workspacePath,
			timeout: 5_000,
		});

		return { sha: shaResult.stdout.trim() };
	}

	async push(options: PushOptions): Promise<{ pushed: boolean; ref: string }> {
		const { workspacePath, branch, remote } = options;

		validatePath(workspacePath);

		// Push-Policy prüfen
		const policy = evaluatePushPolicy(branch, []);
		if (!policy.allowed) {
			throw new GitCommandError(`Push blocked: ${policy.reason ?? 'unknown'}`);
		}

		const remoteName = remote ?? 'origin';
		const result = await runCommand('git', ['push', remoteName, branch], {
			cwd: workspacePath,
			timeout: 120_000,
		});

		if (result.exitCode !== 0) {
			throw new GitCommandFailedError('git push', result.exitCode ?? 1, result.stderr);
		}

		return { pushed: true, ref: `${remoteName}/${branch}` };
	}
}
