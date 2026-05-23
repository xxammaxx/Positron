// Positron — Sichere Git-Kommando-Ausführung

import { spawn } from 'node:child_process';
import { statSync } from 'node:fs';
import { redactSecrets } from '@positron/shared';
import { validateSpecKitCommand, SpecKitCommandPolicyError } from './speckit-policy.js';
import { validateOpenCodeCommand, OpenCodeCommandPolicyError } from './opencode-policy.js';

export interface CommandResult {
  command: string;
  args: string[];
  cwd: string;
  exitCode: number | null;
  stdout: string;
  stderr: string;
  durationMs: number;
  timedOut: boolean;
}

export interface RunCommandOptions {
  timeoutMs?: number;
  maxBuffer?: number;
}

/** Nur diese Kommandos sind erlaubt */
const ALLOWED_COMMANDS = new Set([
  'git', 'git-lfs', 'npm', 'npx', 'node', 'specify', 'opencode',
]);

/** Git-Subkommandos: erlaubt */
const ALLOWED_SUBCOMMANDS = new Set([
  'clone', 'fetch', 'status', 'diff', 'branch', 'switch',
  'checkout', 'rev-parse', 'remote', 'worktree', 'log',
  'symbolic-ref', 'config', 'init', 'add', 'restore',
]);

/** Git-Subkommandos: verboten */
const FORBIDDEN_SUBCOMMANDS = new Set([
  'push', 'commit', 'reset', 'clean', 'merge', 'rebase',
]);

/** Validiert und führt ein Git-Kommando sicher aus. */
export async function runCommand(
  command: string,
  args: string[],
  cwd: string,
  options: RunCommandOptions = {},
): Promise<CommandResult> {
  validateCommand(command, args, cwd);

  const start = Date.now();

  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      shell: false,
      timeout: options.timeoutMs ?? 60_000,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: buildSafeEnv(),
    });

    let stdout = '';
    let stderr = '';

    const append = (buf: Buffer) => {
      const text = redactSecrets(buf.toString());
      return text.slice(0, options.maxBuffer ?? 1_000_000);
    };
    child.stdout?.on('data', (d: Buffer) => { stdout += append(d); });
    child.stderr?.on('data', (d: Buffer) => { stderr += append(d); });

    child.on('close', (code, signal) => {
      resolve({
        command, args, cwd,
        exitCode: code,
        stdout: stdout.slice(0, options.maxBuffer ?? 1_000_000),
        stderr: stderr.slice(0, options.maxBuffer ?? 1_000_000),
        durationMs: Date.now() - start,
        timedOut: signal === 'SIGTERM',
      });
    });

    child.on('error', (err) => {
      reject(new GitCommandFailedError(redactSecrets(err.message), command, args));
    });
  });
}

function validateCommand(command: string, args: string[], cwd: string): void {
  if (!ALLOWED_COMMANDS.has(command)) {
    throw new GitCommandPolicyError(`Forbidden command: ${command}`);
  }

  // Git-spezifische Subcommand-Validierung
  if (command === 'git') {
    const sub = args[0];
    if (FORBIDDEN_SUBCOMMANDS.has(sub)) {
      throw new GitCommandPolicyError(`Forbidden subcommand: git ${sub}`);
    }
    if (sub && !ALLOWED_SUBCOMMANDS.has(sub)) {
      throw new GitCommandPolicyError(`Unknown subcommand: git ${sub}`);
    }
  }

  // Spec Kit Subcommand-Validierung (Issue #15)
  if (command === 'specify') {
    try {
      validateSpecKitCommand(command, args, cwd);
    } catch (err) {
      if (err instanceof SpecKitCommandPolicyError) {
        throw new GitCommandPolicyError(err.message);
      }
      throw err;
    }
  }

  // OpenCode Subcommand-Validierung (Issue #16)
  if (command === 'opencode') {
    try {
      validateOpenCodeCommand(command, args, cwd);
    } catch (err) {
      if (err instanceof OpenCodeCommandPolicyError) {
        throw new GitCommandPolicyError(err.message);
      }
      throw err;
    }
  }

  // Shell-Metacharacters in args
  for (const arg of args) {
    if (/[;|&`$#!<>~]/.test(arg)) {
      throw new GitCommandPolicyError(`Shell metacharacter in argument: ${arg}`);
    }
  }

  // cwd muss existieren
  try {
    const stat = statSync(cwd);
    if (!stat.isDirectory()) throw new Error();
  } catch {
    throw new GitWorkspacePathError(`Invalid cwd: ${cwd}`);
  }
}

function buildSafeEnv(): NodeJS.ProcessEnv {
  return {
    PATH: process.env.PATH ?? '/usr/local/bin:/usr/bin:/bin',
    HOME: process.env.HOME ?? '/tmp',
    GIT_TERMINAL_PROMPT: '0',
    GCM_INTERACTIVE: 'never',
  };
}

// Errors
export class GitCommandError extends Error {
  constructor(msg: string, public readonly command?: string, public readonly args?: string[]) {
    super(msg); this.name = 'GitCommandError';
  }
}
export class GitCommandFailedError extends GitCommandError {
  constructor(msg: string, command?: string, args?: string[]) {
    super(msg, command, args); this.name = 'GitCommandFailedError';
  }
}
export class GitCommandPolicyError extends GitCommandError {
  constructor(msg: string) { super(msg); this.name = 'GitCommandPolicyError'; }
}
export class GitWorkspacePathError extends Error {
  constructor(msg: string) { super(msg); this.name = 'GitWorkspacePathError'; }
}
