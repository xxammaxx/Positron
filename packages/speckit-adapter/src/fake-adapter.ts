// Positron — FakeSpecKitAdapter
// Test-Double für Spec Kit Adapter (Issue #15)

import { resolve } from 'node:path';
import type {
  SpecKitAdapter, SpecKitHealth, SpecKitCommandResult,
  SpecKitArtifactRef, SpecKitRunInput,
} from '@positron/shared';

/**
 * Vordefinierte Fake-Health-Ergebnisse.
 */
export const FAKE_HEALTH_AVAILABLE: SpecKitHealth = {
  available: true,
  version: '0.8.12',
  commandPath: '/usr/local/bin/specify',
  supportsOpencode: true,
};

export const FAKE_HEALTH_UNAVAILABLE: SpecKitHealth = {
  available: false,
  reason: 'Spec Kit CLI (specify) is not installed or not in PATH.',
};

/**
 * FakeSpecKitAdapter — konfigurierbarer Test-Double.
 *
 * Unterstützt alle drei Modi:
 * - detect-only: CLI-Erkennung und Artefakt-Detection
 * - artifact-only: nur Artefakt-Detection
 * - safe-cli: erlaubte CLI-Kommandos
 *
 * Konfigurierbar über:
 * - setHealth(): CLI-Verfügbarkeit setzen
 * - setArtifacts(): Vorhandene Artefakte setzen
 * - setCommandResults(): Vordefinierte Kommando-Ergebnisse
 */
export class FakeSpecKitAdapter implements SpecKitAdapter {
  private health: SpecKitHealth;
  private artifacts: SpecKitArtifactRef[] = [];
  private commandCallLog: string[] = [];
  private shouldFailInit = false;

  constructor(health?: SpecKitHealth) {
    this.health = health ?? FAKE_HEALTH_AVAILABLE;
  }

  /** CLI Health-Status setzen (für Tests) */
  setHealth(health: SpecKitHealth): void {
    this.health = health;
  }

  /** CLI als verfügbar markieren */
  setAvailable(version?: string): void {
    this.health = {
      available: true,
      version: version ?? '0.8.12',
      commandPath: '/usr/local/bin/specify',
      supportsOpencode: true,
    };
  }

  /** CLI als nicht verfügbar markieren */
  setUnavailable(reason?: string): void {
    this.health = {
      available: false,
      reason: reason ?? 'Spec Kit CLI not installed',
    };
  }

  /** Artefakte vordefinieren (für detectArtifacts) */
  setArtifacts(artifacts: SpecKitArtifactRef[]): void {
    this.artifacts = artifacts;
  }

  /** Init soll fehlschlagen */
  setInitFails(shouldFail: boolean): void {
    this.shouldFailInit = shouldFail;
  }

  /** Liste aller aufgerufenen Kommandos (für Assertions) */
  getCommandCallLog(): string[] {
    return [...this.commandCallLog];
  }

  /** Command Call Log zurücksetzen */
  clearCallLog(): void {
    this.commandCallLog = [];
  }

  // --- SpecKitAdapter Implementation ---

  async healthCheck(_workspacePath: string): Promise<SpecKitHealth> {
    this.commandCallLog.push('healthCheck');
    return { ...this.health };
  }

  async initialize(input: SpecKitRunInput): Promise<SpecKitCommandResult> {
    this.commandCallLog.push('initialize');
    const cwd = resolve(input.workspacePath);

    if (this.shouldFailInit) {
      return {
        phase: 'init',
        status: 'failed',
        command: 'specify',
        args: ['init', '.', '--integration', input.aiAgent ?? 'generic'],
        cwd,
        exitCode: 1,
        durationMs: 100,
        summary: 'Spec Kit init failed (simulated)',
        artifacts: [],
      };
    }

    if (input.mode === 'detect-only' || input.mode === 'artifact-only') {
      return {
        phase: 'init',
        status: 'skipped',
        command: 'specify',
        args: ['init', '.', '--integration', input.aiAgent ?? 'generic'],
        cwd,
        exitCode: null,
        durationMs: 5,
        summary: `Init skipped: mode=${input.mode}`,
        artifacts: this.artifacts,
      };
    }

    return {
      phase: 'init',
      status: 'success',
      command: 'specify',
      args: ['init', '.', '--integration', input.aiAgent ?? 'generic'],
      cwd,
      exitCode: 0,
      durationMs: 250,
      stdoutPath: `${cwd}/.positron/runs/${input.runId}/speckit-init-stdout.log`,
      stderrPath: `${cwd}/.positron/runs/${input.runId}/speckit-init-stderr.log`,
      summary: `Spec Kit initialized. Detected ${this.artifacts.length} artifacts.`,
      artifacts: this.artifacts,
    };
  }

  async detectArtifacts(_input: SpecKitRunInput): Promise<SpecKitArtifactRef[]> {
    this.commandCallLog.push('detectArtifacts');
    return [...this.artifacts];
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

  // --- Helpers ---

  private slashCommandResult(
    phase: string,
    input: SpecKitRunInput,
  ): SpecKitCommandResult {
    const cwd = resolve(input.workspacePath);

    if (input.mode === 'detect-only' || input.mode === 'artifact-only') {
      const phaseArtifacts = this.artifacts.filter(a => {
        if (phase === 'specify') return a.kind === 'spec';
        if (phase === 'plan') return ['plan', 'research', 'data-model', 'quickstart', 'contract'].includes(a.kind);
        if (phase === 'tasks') return a.kind === 'tasks';
        if (phase === 'analyze') return true;
        return false;
      });

      return {
        phase: phase as SpecKitCommandResult['phase'],
        status: phaseArtifacts.length > 0 ? 'success' : 'skipped',
        command: 'specify',
        args: [],
        cwd,
        exitCode: null,
        durationMs: 5,
        summary: phaseArtifacts.length > 0
          ? `Detected ${phaseArtifacts.length} existing ${phase} artifact(s).`
          : `No ${phase} artifacts found. /speckit.${phase} is an Agent Slash Command.`,
        artifacts: phaseArtifacts,
        blockedReason: phaseArtifacts.length === 0
          ? `/speckit.${phase} requires agent execution`
          : undefined,
      };
    }

    return {
      phase: phase as SpecKitCommandResult['phase'],
      status: 'blocked',
      command: 'specify',
      args: [],
      cwd,
      exitCode: null,
      durationMs: 5,
      summary: `/speckit.${phase} is an Agent Slash Command, not a CLI subcommand. Requires agent execution.`,
      artifacts: [],
      blockedReason: `/speckit.${phase} requires agent execution`,
    };
  }
}
