// Positron — Real OpenCode Adapter

import fs from 'node:fs';
import path from 'node:path';
import { runCommand } from '@positron/sandbox';
import type { OpenCodeAdapter, OpenCodeHealth, OpenCodeCommandResult, OpenCodeRunInput } from '@positron/shared';

/**
 * RealOpenCodeAdapter — führt echte OpenCode CLI-Kommandos aus.
 *
 * Quality-of-Life-Features:
 * - Speichert CLI-Output als Evidence-Dateien (stdout/stderr)
 * - Grapfulcher Fallback wenn CLI nicht installiert
 * - Timeout-Handling via runCommand
 */
export class RealOpenCodeAdapter implements OpenCodeAdapter {
  private evidenceDir: string;

  constructor(evidenceDir?: string) {
    // Default-Evidence-Pfad unter .positron/
    this.evidenceDir = evidenceDir ?? '.positron/evidence/opencode';
  }

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

    // Graceful fallback: CLI-Check vorab
    const health = await this.healthCheck(input.workspacePath);
    if (!health.available) {
      return {
        phase: this.mapPhase(slashCommand),
        status: 'blocked',
        command: `opencode run --command ${slashCommand}`,
        args: [],
        cwd: input.workspacePath,
        exitCode: null,
        durationMs: 0,
        summary: `OpenCode CLI not available: ${health.reason ?? 'unknown'}`,
        blockedReason: health.reason,
      };
    }

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

      // CLI-Output als Evidence-Dateien speichern
      const evidencePaths = this.saveEvidence(slashCommand, result.stdout, result.stderr);

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
        stdoutPath: evidencePaths.stdoutPath,
        stderrPath: evidencePaths.stderrPath,
        blockedReason: result.exitCode !== 0 ? result.stderr.slice(0, 200) : undefined,
      };
    } catch (err) {
      const errMsg = String(err);
      return {
        phase: this.mapPhase(slashCommand),
        status: 'failed',
        command: `opencode ${args.join(' ')}`,
        args,
        cwd: input.workspacePath,
        exitCode: null,
        durationMs: Date.now() - startTime,
        summary: `Slash command "${slashCommand}" failed: ${errMsg.slice(0, 200)}`,
        blockedReason: errMsg,
      };
    }
  }

  /**
   * Führt OpenCode für die IMPLEMENT-Phase aus (Code-Änderungen).
   */
  async runImplement(input: OpenCodeRunInput): Promise<OpenCodeCommandResult> {
    const startTime = Date.now();

    // Graceful fallback: CLI-Check vorab
    const health = await this.healthCheck(input.workspacePath);
    if (!health.available) {
      return {
        phase: 'implement',
        status: 'blocked',
        command: 'opencode run --prompt "... (implementation)"',
        args: [],
        cwd: input.workspacePath,
        exitCode: null,
        durationMs: 0,
        summary: `OpenCode CLI not available: ${health.reason ?? 'unknown'}`,
        blockedReason: health.reason,
      };
    }

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

      // CLI-Output als Evidence-Dateien speichern
      const evidencePaths = this.saveEvidence('implement', result.stdout, result.stderr);

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
        stdoutPath: evidencePaths.stdoutPath,
        stderrPath: evidencePaths.stderrPath,
        blockedReason: result.exitCode !== 0 ? result.stderr.slice(0, 200) : undefined,
      };
    } catch (err) {
      const errMsg = String(err);
      return {
        phase: 'implement',
        status: 'failed',
        command: `opencode run --prompt "... (${input.issueTitle})"`,
        args,
        cwd: input.workspacePath,
        exitCode: null,
        durationMs: Date.now() - startTime,
        summary: `Implementation failed: ${errMsg.slice(0, 200)}`,
        blockedReason: errMsg,
      };
    }
  }

  /**
   * Speichert CLI-Output als Evidence-Dateien.
   * Erzeugt .positron/evidence/opencode/<command>-stdout.txt und ...-stderr.txt
   */
  private saveEvidence(command: string, stdout: string, stderr: string): { stdoutPath?: string; stderrPath?: string } {
    try {
      const dir = path.join(this.evidenceDir, command.replace(/[^a-z0-9.-]/gi, '_'));
      fs.mkdirSync(dir, { recursive: true });
      const timestamp = Date.now();
      const stdoutPath = path.join(dir, `stdout-${timestamp}.txt`);
      const stderrPath = path.join(dir, `stderr-${timestamp}.txt`);
      if (stdout) fs.writeFileSync(stdoutPath, stdout, 'utf-8');
      if (stderr) fs.writeFileSync(stderrPath, stderr, 'utf-8');
      return {
        stdoutPath: stdout ? stdoutPath : undefined,
        stderrPath: stderr ? stderrPath : undefined,
      };
    } catch {
      // Evidence-Speicherung ist nicht kritisch — bei Fehler einfach überspringen
      return {};
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
