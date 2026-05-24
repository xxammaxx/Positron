// Positron — Command Runner für Sandbox-Operationen

import { spawn } from 'node:child_process';
import { EOL } from 'node:os';

/** Ergebnis eines ausgeführten Kommandos */
export interface CommandResult {
  exitCode: number | null;
  stdout: string;
  stderr: string;
  durationMs: number;
  command: string;
}

/** Optionen für command-runner */
export interface RunCommandOptions {
  /** Working Directory */
  cwd: string;
  /** Timeout in Millisekunden (default: 120000 = 2 Minuten) */
  timeout?: number;
  /** Umgebungsvariablen */
  env?: Record<string, string | undefined>;
}

/**
 * Führt ein Kommando in einem Child Process aus.
 * Nutzt spawn (nicht exec) für streaming output.
 */
export async function runCommand(
  command: string,
  args: string[],
  options: RunCommandOptions,
): Promise<CommandResult> {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const timeoutMs = options.timeout ?? 120_000;

    const child = spawn(command, args, {
      cwd: options.cwd,
      env: { ...process.env, ...options.env },
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    let timedOut = false;

    const timeout = setTimeout(() => {
      timedOut = true;
      child.kill('SIGTERM');
    }, timeoutMs);

    child.stdout?.on('data', (data: Buffer) => {
      stdout += data.toString();
    });

    child.stderr?.on('data', (data: Buffer) => {
      stderr += data.toString();
    });

    child.on('close', (exitCode: number | null) => {
      clearTimeout(timeout);
      const durationMs = Date.now() - startTime;

      if (timedOut) {
        reject(new Error(`Command timed out after ${timeoutMs}ms: ${command} ${args.join(' ')}`));
        return;
      }

      resolve({
        exitCode,
        stdout,
        stderr,
        durationMs,
        command: `${command} ${args.join(' ')}`,
      });
    });

    child.on('error', (err: Error) => {
      clearTimeout(timeout);
      reject(new Error(`Failed to spawn command: ${err.message}`));
    });
  });
}

/**
 * Führt ein Kommando mit Timeout aus.
 */
export async function runCommandWithTimeout(
  command: string,
  args: string[],
  options: RunCommandOptions,
  timeoutMs: number,
): Promise<CommandResult> {
  return runCommand(command, args, { ...options, timeout: timeoutMs });
}

/** Fehler bei Git-Kommandos */
export class GitCommandError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GitCommandError';
  }
}

export class GitCommandFailedError extends GitCommandError {
  constructor(command: string, exitCode: number, stderr: string) {
    super(`Git command failed: ${command} (exit ${exitCode}): ${stderr.slice(0, 200)}`);
    this.name = 'GitCommandFailedError';
  }
}

export class GitCommandPolicyError extends GitCommandError {
  constructor(message: string) {
    super(message);
    this.name = 'GitCommandPolicyError';
  }
}
