// Positron — Fake OpenCode Adapter (für Tests)

import type { OpenCodeAdapter, OpenCodeHealth, OpenCodeCommandResult, OpenCodeRunInput } from '@positron/shared';

export const FAKE_OPENCODE_HEALTH_AVAILABLE: OpenCodeHealth = {
  available: true,
  version: '0.1.0-fake',
  commandPath: '/usr/local/bin/opencode',
};

export const FAKE_OPENCODE_HEALTH_UNAVAILABLE: OpenCodeHealth = {
  available: false,
  reason: 'Fake: OpenCode CLI not available',
};

/**
 * FakeOpenCodeAdapter — konfigurierbarer Test-Double.
 */
export class FakeOpenCodeAdapter implements OpenCodeAdapter {
  private health: OpenCodeHealth;
  private commandCallLog: string[] = [];
  private shouldFailCommands = false;
  private commandResults = new Map<string, OpenCodeCommandResult>();

  constructor(health: OpenCodeHealth = FAKE_OPENCODE_HEALTH_AVAILABLE) {
    this.health = health;
  }

  setHealth(health: OpenCodeHealth): void {
    this.health = health;
  }

  setAvailable(version = '0.1.0'): void {
    this.health = { available: true, version, commandPath: '/usr/local/bin/opencode' };
  }

  setUnavailable(reason = 'CLI not found'): void {
    this.health = { available: false, reason };
  }

  setShouldFailCommands(fail: boolean): void {
    this.shouldFailCommands = fail;
  }

  setCommandResult(command: string, result: OpenCodeCommandResult): void {
    this.commandResults.set(command, result);
  }

  getCommandCallLog(): string[] {
    return [...this.commandCallLog];
  }

  clearCallLog(): void {
    this.commandCallLog = [];
  }

  async healthCheck(_workspacePath: string): Promise<OpenCodeHealth> {
    this.commandCallLog.push('healthCheck');
    return this.health;
  }

  async runSlashCommand(slashCommand: string, input: OpenCodeRunInput): Promise<OpenCodeCommandResult> {
    this.commandCallLog.push(`runSlashCommand:${slashCommand}`);

    if (this.shouldFailCommands) {
      return this.makeResult(slashCommand, 'failed', 'Fake: command failed', input);
    }

    const customResult = this.commandResults.get(slashCommand);
    if (customResult) return customResult;

    return this.makeResult(slashCommand, 'success', `Fake: executed ${slashCommand}`, input);
  }

  async runImplement(input: OpenCodeRunInput): Promise<OpenCodeCommandResult> {
    this.commandCallLog.push('runImplement');

    if (this.shouldFailCommands) {
      return this.makeResult('implement', 'failed', 'Fake: implementation failed', input);
    }

    const customResult = this.commandResults.get('implement');
    if (customResult) return customResult;

    return this.makeResult('implement', 'success', 'Fake: implementation completed', input);
  }

  private makeResult(
    command: string,
    status: 'success' | 'failed' | 'blocked' | 'skipped',
    summary: string,
    input: OpenCodeRunInput,
  ): OpenCodeCommandResult {
    return {
      phase: 'implement',
      status,
      command,
      args: [],
      cwd: input.workspacePath,
      exitCode: status === 'success' ? 0 : 1,
      durationMs: 0,
      summary,
    };
  }
}
