// Positron — Fake SpecKit Adapter (für Tests)

import type { SpecKitAdapter, SpecKitHealth, SpecKitCommandResult, SpecKitArtifactRef, SpecKitRunInput } from '@positron/shared';

/** Vordefinierte Fake-Health-Ergebnisse */
export const FAKE_HEALTH_AVAILABLE: SpecKitHealth = {
  available: true,
  version: '0.1.0-fake',
  commandPath: '/usr/local/bin/specify',
  supportsOpencode: true,
};

export const FAKE_HEALTH_UNAVAILABLE: SpecKitHealth = {
  available: false,
  reason: 'Fake: SpecKit CLI not available',
};

/**
 * FakeSpecKitAdapter — konfigurierbarer Test-Double.
 * Unterstützt detect-only, artifact-only und safe-cli Modi.
 */
export class FakeSpecKitAdapter implements SpecKitAdapter {
  private health: SpecKitHealth;
  private artifacts: SpecKitArtifactRef[] = [];
  private commandCallLog: string[] = [];
  private shouldFailInit = false;

  constructor(health: SpecKitHealth = FAKE_HEALTH_AVAILABLE) {
    this.health = health;
  }

  setHealth(health: SpecKitHealth): void {
    this.health = health;
  }

  setAvailable(version = '0.1.0'): void {
    this.health = { available: true, version, commandPath: '/usr/local/bin/specify', supportsOpencode: true };
  }

  setUnavailable(reason = 'CLI not found'): void {
    this.health = { available: false, reason };
  }

  setArtifacts(artifacts: SpecKitArtifactRef[]): void {
    this.artifacts = artifacts;
  }

  setInitFails(shouldFail: boolean): void {
    this.shouldFailInit = shouldFail;
  }

  getCommandCallLog(): string[] {
    return [...this.commandCallLog];
  }

  clearCallLog(): void {
    this.commandCallLog = [];
  }

  async healthCheck(_workspacePath: string): Promise<SpecKitHealth> {
    this.commandCallLog.push('healthCheck');
    return this.health;
  }

  async initialize(input: SpecKitRunInput): Promise<SpecKitCommandResult> {
    this.commandCallLog.push('initialize');
    if (this.shouldFailInit) {
      return this.makeResult('init', 'failed', 'Initialization failed (fake)', input);
    }
    return this.makeResult('init', 'success', `Spec Kit initialized: ${input.workspacePath}`, input);
  }

  async detectArtifacts(_input: SpecKitRunInput): Promise<SpecKitArtifactRef[]> {
    this.commandCallLog.push('detectArtifacts');
    return this.artifacts;
  }

  async runSpecify(input: SpecKitRunInput): Promise<SpecKitCommandResult> {
    this.commandCallLog.push('runSpecify');
    return this.slashCommandResult('specify', input);
  }

  async runPlan(input: SpecKitRunInput): Promise<SpecKitCommandResult> {
    this.commandCallLog.push('runPlan');
    return this.slashCommandResult('plan', input);
  }

  async runTasks(input: SpecKitRunInput): Promise<SpecKitCommandResult> {
    this.commandCallLog.push('runTasks');
    return this.slashCommandResult('tasks', input);
  }

  async runAnalyze(input: SpecKitRunInput): Promise<SpecKitCommandResult> {
    this.commandCallLog.push('runAnalyze');
    return this.slashCommandResult('analyze', input);
  }

  private makeResult(
    phase: string,
    status: 'success' | 'failed' | 'blocked' | 'skipped',
    summary: string,
    input: SpecKitRunInput,
  ): SpecKitCommandResult {
    return {
      phase: phase as SpecKitCommandResult['phase'],
      status,
      command: `specify ${phase}`,
      args: [phase],
      cwd: input.workspacePath,
      exitCode: status === 'success' ? 0 : 1,
      durationMs: 0,
      summary,
      artifacts: this.artifacts,
    };
  }

  private slashCommandResult(
    phase: string,
    input: SpecKitRunInput,
  ): SpecKitCommandResult {
    if (input.mode === 'safe-cli') {
      return {
        phase: phase as SpecKitCommandResult['phase'],
        status: 'blocked',
        command: `specify ${phase}`,
        args: [phase],
        cwd: input.workspacePath,
        exitCode: null,
        durationMs: 0,
        summary: `Agent Slash Command (/${phase}) — not executable via CLI directly`,
        artifacts: this.artifacts,
        blockedReason: 'Agent Slash Command — use opencode run --command speckit.' + phase,
      };
    }

    // artifact-only or detect-only mode
    return {
      phase: phase as SpecKitCommandResult['phase'],
      status: 'skipped',
      command: `specify ${phase}`,
      args: [phase],
      cwd: input.workspacePath,
      exitCode: null,
      durationMs: 0,
      summary: `Detected artifacts for phase: ${phase}`,
      artifacts: this.artifacts,
    };
  }
}
