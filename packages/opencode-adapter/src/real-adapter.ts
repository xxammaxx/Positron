// Positron — Real OpenCode Adapter

import { runCommand } from '@positron/sandbox';
import type { OpenCodeAdapter, OpenCodeHealth, OpenCodeCommandResult, OpenCodeRunInput } from '@positron/shared';
import { OpenCodeNotInstalledError, OpenCodeTimeoutError } from '@positron/shared';

/**
 * RealOpenCodeAdapter — führt echte OpenCode CLI-Kommandos aus.
 *
 * Modi:
 * - detect-only: nur CLI-Erkennung, keine Kommandos
 * - safe-cli: erlaubte Kommandos (opencode run --command speckit.*)
 */
export class RealOpenCodeAdapter implements OpenCodeAdapter {
  /**
   * Prüft ob die OpenCode CLI verfügbar ist.
   */
  async healthCheck(workspacePath: string): Promise<OpenCodeHealth> {
    try {
      const result = await runCommand('opencode', ['--version'], {
        cwd: workspacePath,
        timeout: 10_000,
      });

      if (result.exitCode === 0) {
        const version = result.stdout.trim();
        return {
          available: true,
          version: version || 'unknown',
          commandPath: 'opencode',
        };
      }

      return { available: false, reason: `opencode --version exited with code ${String(result.exitCode)}` };
    } catch {
      return { available: false, reason: 'OpenCode CLI not found or not executable' };
    }
  }

  /**
   * Führt einen Spec Kit Slash Command über OpenCode aus.
   *
   * Beispiel: runSlashCommand('speckit.specify', input)
   * → opencode run --command speckit.specify --format json [args]
   */
  async runSlashCommand(slashCommand: string, input: OpenCodeRunInput): Promise<OpenCodeCommandResult> {
    const startTime = Date.now();

    const args = [
      'run',
      '--command', slashCommand,
      '--format', 'json',
    ];

    if (input.issueNumber) {
      args.push('--issue', String(input.issueNumber));
    }
    if (input.mode) {
      args.push('--mode', input.mode);
    }

    try {
      const result = await runCommand('opencode', args, {
        cwd: input.workspacePath,
        timeout: 300_000, // 5 Minuten für Agent-Kommandos
      });

      return {
        phase: this.mapPhase(slashCommand),
        status: result.exitCode === 0 ? 'success' : 'failed',
        command: `opencode ${args.join(' ')}`,
        args,
        cwd: input.workspacePath,
        exitCode: result.exitCode,
        durationMs: Date.now() - startTime,
        summary: result.exitCode === 0
          ? `Slash command "${slashCommand}" completed`
          : `Slash command "${slashCommand}" failed: ${result.stderr.slice(0, 200)}`,
        stdoutPath: undefined,
        stderrPath: undefined,
        blockedReason: result.exitCode !== 0 ? result.stderr.slice(0, 200) : undefined,
      };
    } catch (err) {
      return {
        phase: this.mapPhase(slashCommand),
        status: 'failed',
        command: `opencode ${args.join(' ')}`,
        args,
        cwd: input.workspacePath,
        exitCode: null,
        durationMs: Date.now() - startTime,
        summary: `Slash command "${slashCommand}" failed: ${String(err).slice(0, 200)}`,
        blockedReason: String(err),
      };
    }
  }

  /**
   * Führt OpenCode für die IMPLEMENT-Phase aus (Code-Änderungen).
   */
  async runImplement(input: OpenCodeRunInput): Promise<OpenCodeCommandResult> {
    const startTime = Date.now();

    const args = [
      'run',
      '--prompt', `Implement the changes for Issue #${input.issueNumber ?? '?'}: ${input.issueTitle}`,
      '--workspace', input.workspacePath,
    ];

    if (input.autonomyLevel !== undefined) {
      args.push('--autonomy', String(input.autonomyLevel));
    }

    try {
      const result = await runCommand('opencode', args, {
        cwd: input.workspacePath,
        timeout: 600_000, // 10 Minuten für Implementation
      });

      return {
        phase: 'implement',
        status: result.exitCode === 0 ? 'success' : 'failed',
        command: `opencode run --prompt "... (${input.issueTitle})"`,
        args,
        cwd: input.workspacePath,
        exitCode: result.exitCode,
        durationMs: Date.now() - startTime,
        summary: result.exitCode === 0
          ? 'Implementation completed successfully'
          : `Implementation failed: ${result.stderr.slice(0, 200)}`,
        blockedReason: result.exitCode !== 0 ? result.stderr.slice(0, 200) : undefined,
      };
    } catch (err) {
      return {
        phase: 'implement',
        status: 'failed',
        command: `opencode run --prompt "... (${input.issueTitle})"`,
        args,
        cwd: input.workspacePath,
        exitCode: null,
        durationMs: Date.now() - startTime,
        summary: `Implementation failed: ${String(err).slice(0, 200)}`,
        blockedReason: String(err),
      };
    }
  }

  /**
   * Mapped Slash-Command-Namen auf Phasen.
   */
  private mapPhase(slashCommand: string): OpenCodeCommandResult['phase'] {
    const phaseMap: Record<string, OpenCodeCommandResult['phase']> = {
      'speckit.specify': 'specify',
      'speckit.plan': 'plan',
      'speckit.tasks': 'tasks',
      'speckit.analyze': 'analyze',
      'speckit.constitution': 'constitution',
      'speckit.clarify': 'clarify',
      'speckit.checklist': 'checklist',
    };
    return phaseMap[slashCommand] ?? 'implement';
  }
}

export default RealOpenCodeAdapter;
