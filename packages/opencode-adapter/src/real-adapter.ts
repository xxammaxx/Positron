// Positron — RealOpenCodeAdapter
// Reale OpenCode CLI Integration (Issue #16)

import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { redactSecrets, redactValue } from '@positron/shared';
import type {
  OpenCodeAdapter, OpenCodeHealth, OpenCodeCommandResult,
  OpenCodeRunInput,
} from '@positron/shared';
import { OpenCodeCommandFailedError } from '@positron/shared';
import { validateOpenCodeCommand } from '@positron/sandbox';

const CLI_TIMEOUT_MS = 300_000; // 5 minutes for OpenCode (LLM calls)
const MAX_BUFFER = 1_000_000;

function logDir(workspacePath: string, runId: string): string {
  const dir = join(workspacePath, '.positron', 'runs', runId);
  mkdirSync(dir, { recursive: true });
  return dir;
}

/**
 * RealOpenCodeAdapter — führt echte OpenCode CLI-Kommandos aus.
 *
 * Modi:
 * - detect-only: nur CLI-Erkennung, keine Kommandos
 * - safe-cli: erlaubte Kommandos (opencode run --command speckit.*)
 */
export class RealOpenCodeAdapter implements OpenCodeAdapter {
  async healthCheck(workspacePath: string): Promise<OpenCodeHealth> {
    const resolved = resolve(workspacePath);

    // which opencode
    const whichResult = await runSafe('which', ['opencode'], resolved, 10_000);
    if (whichResult.exitCode !== 0 || !whichResult.stdout.trim()) {
      return {
        available: false,
        reason: 'OpenCode CLI (opencode) is not installed. Install with: curl -fsSL https://opencode.ai/install | bash',
      };
    }

    const commandPath = whichResult.stdout.trim();

    // opencode --version
    const versionResult = await runSafe('opencode', ['--version'], resolved, 30_000);
    const version = parseVersion(versionResult.stdout);

    return {
      available: versionResult.exitCode === 0,
      version: version ?? versionResult.stdout.trim().slice(0, 100),
      commandPath,
      reason: versionResult.exitCode !== 0 ? `opencode --version failed with exit code ${versionResult.exitCode}` : undefined,
    };
  }

  /**
   * Führt einen Spec Kit Slash Command über OpenCode aus.
   *
   * Beispiel: runSlashCommand('speckit.specify', input)
   * → opencode run --command speckit.specify --format json [args]
   */
  async runSlashCommand(
    slashCommand: string,
    input: OpenCodeRunInput,
  ): Promise<OpenCodeCommandResult> {
    const start = Date.now();
    const cwd = resolve(input.workspacePath);

    // detect-only: kein Kommando
    if (input.mode === 'detect-only') {
      return {
        phase: mapCommandToPhase(slashCommand),
        status: 'skipped',
        command: 'opencode',
        args: ['run', '--command', slashCommand],
        cwd,
        exitCode: null,
        durationMs: Date.now() - start,
        summary: `Skipped: mode=detect-only. Run with mode=safe-cli to execute.`,
      };
    }

    const args = [
      'run',
      '--command', slashCommand,
      '--format', 'json',
    ];

    // Add model if specified
    if (input.model) {
      args.push('-m', input.model);
    }

    try {
      validateOpenCodeCommand('opencode', args, cwd);
    } catch (err) {
      return {
        phase: mapCommandToPhase(slashCommand),
        status: 'blocked',
        command: 'opencode',
        args,
        cwd,
        exitCode: null,
        durationMs: Date.now() - start,
        summary: `Blocked by policy: ${redactSecrets(String(err))}`,
        blockedReason: redactSecrets(String(err)),
      };
    }

    const dir = logDir(cwd, input.runId);
    const stdoutPath = join(dir, `opencode-${slashCommand}-stdout.log`);
    const stderrPath = join(dir, `opencode-${slashCommand}-stderr.log`);

    try {
      const result = await runSafe('opencode', args, cwd, CLI_TIMEOUT_MS);

      writeFileSync(stdoutPath, redactSecrets(result.stdout), 'utf-8');
      writeFileSync(stderrPath, redactSecrets(result.stderr), 'utf-8');

      const ok = result.exitCode === 0;

      // Try to extract session ID from stdout (JSON output)
      let sessionId: string | undefined;
      try {
        const lines = result.stdout.trim().split('\n');
        for (const line of lines) {
          const parsed = JSON.parse(line);
          if (parsed.session_id) { sessionId = parsed.session_id; break; }
          if (parsed.type === 'result' && parsed.session_id) { sessionId = parsed.session_id; break; }
        }
      } catch { /* not JSON or no session */ }

      return {
        phase: mapCommandToPhase(slashCommand),
        status: ok ? 'success' : 'failed',
        command: 'opencode',
        args,
        cwd,
        exitCode: result.exitCode,
        durationMs: Date.now() - start,
        stdoutPath,
        stderrPath,
        summary: ok
          ? `OpenCode /${slashCommand} completed successfully`
          : `OpenCode /${slashCommand} failed with exit code ${result.exitCode}`,
        sessionId,
      };
    } catch (err) {
      return {
        phase: mapCommandToPhase(slashCommand),
        status: 'failed',
        command: 'opencode',
        args,
        cwd,
        exitCode: null,
        durationMs: Date.now() - start,
        summary: `OpenCode /${slashCommand} error: ${redactValue(err)}`,
      };
    }
  }

  async runImplement(input: OpenCodeRunInput): Promise<OpenCodeCommandResult> {
    const start = Date.now();
    const cwd = resolve(input.workspacePath);

    if (input.mode === 'detect-only') {
      return {
        phase: 'implement',
        status: 'skipped',
        command: 'opencode',
        args: ['run'],
        cwd,
        exitCode: null,
        durationMs: Date.now() - start,
        summary: 'Implement skipped: mode=detect-only.',
      };
    }

    // IMPLEMENT is a free-form prompt, not a slash command
    const prompt = `Implement the changes described in the tasks. Issue: ${input.issueTitle}. ${input.issueBody ?? ''}`;
    const args = ['run', '--format', 'json', prompt];

    try {
      validateOpenCodeCommand('opencode', ['run'], cwd);
    } catch (err) {
      return {
        phase: 'implement',
        status: 'blocked',
        command: 'opencode',
        args: ['run', '...'],
        cwd,
        exitCode: null,
        durationMs: Date.now() - start,
        summary: `Implement blocked by policy: ${redactSecrets(String(err))}`,
        blockedReason: redactSecrets(String(err)),
      };
    }

    const dir = logDir(cwd, input.runId);
    const stdoutPath = join(dir, 'opencode-implement-stdout.log');
    const stderrPath = join(dir, 'opencode-implement-stderr.log');

    try {
      const result = await runSafe('opencode', args, cwd, CLI_TIMEOUT_MS * 2); // 10 min for implement

      writeFileSync(stdoutPath, redactSecrets(result.stdout), 'utf-8');
      writeFileSync(stderrPath, redactSecrets(result.stderr), 'utf-8');

      return {
        phase: 'implement',
        status: result.exitCode === 0 ? 'success' : 'failed',
        command: 'opencode',
        args: ['run', '...'],
        cwd,
        exitCode: result.exitCode,
        durationMs: Date.now() - start,
        stdoutPath,
        stderrPath,
        summary: result.exitCode === 0
          ? 'OpenCode implement completed'
          : `OpenCode implement failed with exit code ${result.exitCode}`,
      };
    } catch (err) {
      return {
        phase: 'implement',
        status: 'failed',
        command: 'opencode',
        args: ['run', '...'],
        cwd,
        exitCode: null,
        durationMs: Date.now() - start,
        summary: `OpenCode implement error: ${redactValue(err)}`,
      };
    }
  }
}

// --- Helpers ---

interface SafeResult {
  stdout: string;
  stderr: string;
  exitCode: number | null;
  durationMs: number;
  timedOut: boolean;
}

function runSafe(
  command: string, args: string[], cwd: string, timeoutMs: number,
): Promise<SafeResult> {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd, shell: false, timeout: timeoutMs,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: {
        PATH: process.env.PATH ?? '/usr/local/bin:/usr/bin:/bin',
        HOME: process.env.HOME ?? '/tmp',
      },
    });

    let stdout = '';
    let stderr = '';

    child.stdout?.on('data', (d: Buffer) => {
      stdout += redactSecrets(d.toString()).slice(0, MAX_BUFFER);
    });
    child.stderr?.on('data', (d: Buffer) => {
      stderr += redactSecrets(d.toString()).slice(0, MAX_BUFFER);
    });

    child.on('close', (code, signal) => {
      resolve({
        stdout: stdout.slice(0, MAX_BUFFER),
        stderr: stderr.slice(0, MAX_BUFFER),
        exitCode: code,
        durationMs: Date.now() - start,
        timedOut: signal === 'SIGTERM',
      });
    });

    child.on('error', (err) => {
      reject(new OpenCodeCommandFailedError(
        `${command} ${args[0] ?? ''}`, null, redactSecrets(err.message),
      ));
    });
  });
}

function parseVersion(stdout: string): string | undefined {
  const firstLine = stdout.split('\n')[0]?.trim();
  if (!firstLine) return undefined;
  const match = firstLine.match(/(\d+\.\d+\.\d+[^\s]*)/);
  return match?.[1] ?? (firstLine.length < 100 ? firstLine : undefined);
}

function mapCommandToPhase(slashCmd: string): OpenCodeCommandResult['phase'] {
  const cmd = slashCmd.replace(/^speckit\./, '');
  if (['constitution', 'specify', 'clarify', 'plan', 'tasks', 'analyze', 'checklist', 'implement'].includes(cmd)) {
    return cmd as OpenCodeCommandResult['phase'];
  }
  return 'implement';
}

export default RealOpenCodeAdapter;
