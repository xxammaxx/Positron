// Positron — FakeOpenCodeAdapter
// Test-Double für OpenCode Adapter (Issue #16)

import { resolve } from 'node:path';
import type {
  OpenCodeAdapter, OpenCodeHealth, OpenCodeCommandResult,
  OpenCodeRunInput,
} from '@positron/shared';

export const FAKE_OPENCODE_HEALTH_AVAILABLE: OpenCodeHealth = {
  available: true,
  version: '1.15.5',
  commandPath: '/usr/local/bin/opencode',
};

export const FAKE_OPENCODE_HEALTH_UNAVAILABLE: OpenCodeHealth = {
  available: false,
  reason: 'OpenCode CLI is not installed.',
};

export class FakeOpenCodeAdapter implements OpenCodeAdapter {
  private health: OpenCodeHealth;
  private commandCallLog: string[] = [];
  private shouldFailCommands = false;
  private commandResults: Map<string, OpenCodeCommandResult> = new Map();

  constructor(health?: OpenCodeHealth) {
    this.health = health ?? FAKE_OPENCODE_HEALTH_AVAILABLE;
  }

  setHealth(health: OpenCodeHealth): void { this.health = health; }
  setAvailable(version?: string): void {
    this.health = { ...FAKE_OPENCODE_HEALTH_AVAILABLE, version };
  }
  setUnavailable(reason?: string): void {
    this.health = { available: false, reason: reason ?? 'CLI not found' };
  }
  setShouldFailCommands(fail: boolean): void { this.shouldFailCommands = fail; }
  setCommandResult(command: string, result: OpenCodeCommandResult): void {
    this.commandResults.set(command, result);
  }
  getCommandCallLog(): string[] { return [...this.commandCallLog]; }
  clearCallLog(): void { this.commandCallLog = []; }

  async healthCheck(_workspacePath: string): Promise<OpenCodeHealth> {
    this.commandCallLog.push('healthCheck');
    return { ...this.health };
  }

  async runSlashCommand(
    slashCommand: string,
    input: OpenCodeRunInput,
  ): Promise<OpenCodeCommandResult> {
    this.commandCallLog.push(`runSlashCommand:${slashCommand}`);
    const cwd = resolve(input.workspacePath);

    // Pre-configured result?
    const preconfigured = this.commandResults.get(slashCommand);
    if (preconfigured) return { ...preconfigured, cwd };

    if (this.shouldFailCommands) {
      return {
        phase: 'specify',
        status: 'failed',
        command: 'opencode',
        args: ['run', '--command', slashCommand],
        cwd,
        exitCode: 1,
        durationMs: 500,
        summary: `OpenCode /${slashCommand} failed (simulated)`,
      };
    }

    if (input.mode === 'detect-only') {
      return {
        phase: 'specify',
        status: 'skipped',
        command: 'opencode',
        args: ['run', '--command', slashCommand],
        cwd,
        exitCode: null,
        durationMs: 5,
        summary: `Skipped: mode=detect-only`,
      };
    }

    return {
      phase: 'specify',
      status: 'success',
      command: 'opencode',
      args: ['run', '--command', slashCommand, '--format', 'json'],
      cwd,
      exitCode: 0,
      durationMs: 250,
      stdoutPath: `${cwd}/.positron/runs/${input.runId}/opencode-${slashCommand}-stdout.log`,
      stderrPath: `${cwd}/.positron/runs/${input.runId}/opencode-${slashCommand}-stderr.log`,
      summary: `OpenCode /${slashCommand} completed successfully (simulated)`,
      sessionId: `fake-session-${Date.now()}`,
    };
  }

  async runImplement(input: OpenCodeRunInput): Promise<OpenCodeCommandResult> {
    this.commandCallLog.push('runImplement');
    const cwd = resolve(input.workspacePath);

    if (input.mode === 'detect-only') {
      return {
        phase: 'implement',
        status: 'skipped',
        command: 'opencode',
        args: ['run', '...'],
        cwd,
        exitCode: null,
        durationMs: 5,
        summary: 'Implement skipped: mode=detect-only',
      };
    }

    return {
      phase: 'implement',
      status: 'success',
      command: 'opencode',
      args: ['run', '...'],
      cwd,
      exitCode: 0,
      durationMs: 500,
      stdoutPath: `${cwd}/.positron/runs/${input.runId}/opencode-implement-stdout.log`,
      stderrPath: `${cwd}/.positron/runs/${input.runId}/opencode-implement-stderr.log`,
      summary: 'OpenCode implement completed (simulated)',
      sessionId: `fake-session-${Date.now()}`,
    };
  }
}
