// Positron — RealSpecKitAdapter
// Reale Spec Kit CLI Integration (Issue #15)

import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { redactSecrets, redactValue } from '@positron/shared';
import type {
  SpecKitAdapter, SpecKitHealth, SpecKitCommandResult,
  SpecKitArtifactRef, SpecKitRunInput, SpecKitPhase,
} from '@positron/shared';
import { SpecKitCommandFailedError } from '@positron/shared';
import { validateSpecKitCommand } from '@positron/sandbox';
import { scanWorkspace } from './artifact-scanner.js';

/** Timeout für CLI-Kommandos (ms) */
const CLI_TIMEOUT_MS = 120_000;

/** Max Buffer für stdout/stderr */
const MAX_BUFFER = 1_000_000;

/** Pfad für Logdateien unter dem Workspace */
function logDir(workspacePath: string, runId: string): string {
  const dir = join(workspacePath, '.positron', 'runs', runId);
  mkdirSync(dir, { recursive: true });
  return dir;
}

/**
 * RealSpecKitAdapter — führt echte Spec Kit CLI-Kommandos aus.
 *
 * Modi:
 * - detect-only: nur CLI-Erkennung und Artefakt-Detection
 * - artifact-only: nur Artefakt-Detection, keine Kommandos
 * - safe-cli: erlaubte CLI-Kommandos (version, check, init)
 *
 * Slash-Commands (/speckit.specify etc.) werden ehrlich als BLOCKED dokumentiert.
 */
export class RealSpecKitAdapter implements SpecKitAdapter {
  /**
   * Prüft ob das `specify` CLI verfügbar ist.
   * Führt `specify version` aus und parst die Ausgabe.
   */
  async healthCheck(workspacePath: string): Promise<SpecKitHealth> {
    const resolved = resolve(workspacePath);

    // 1. Prüfe ob specify im PATH ist
    const whichResult = await runSafe('which', ['specify'], resolved, 10_000);
    if (whichResult.exitCode !== 0 || !whichResult.stdout.trim()) {
      return {
        available: false,
        reason: 'Spec Kit CLI (specify) is not installed or not in PATH. Install with: uvx --from git+https://github.com/github/spec-kit.git specify init <project>',
      };
    }

    const commandPath = whichResult.stdout.trim();

    // 2. Führe specify version aus
    const versionResult = await runSafe('specify', ['version'], resolved, 30_000);
    if (versionResult.exitCode !== 0) {
      return {
        available: false,
        commandPath,
        reason: `specify version failed with exit code ${versionResult.exitCode}`,
      };
    }

    // 3. Parse Version
    const version = parseVersion(versionResult.stdout);

    // 4. Prüfe opencode-Unterstützung via specify version --features --json
    let supportsOpencode = false;
    try {
      // specify version --features --json gibt JSON mit verfügbaren Features/Integrations zurück
      const featuresResult = await runSafe('specify', ['version', '--features', '--json'], resolved, 30_000);
      if (featuresResult.exitCode === 0) {
        const parsed = JSON.parse(featuresResult.stdout);
        // Prüfe ob opencode in den Integrationen gelistet ist
        if (parsed?.integrations?.includes?.('opencode') || parsed?.features?.opencode) {
          supportsOpencode = true;
        }
      }
    } catch {
      // Features-Check optional — kein Block
    }

    return {
      available: true,
      version,
      commandPath,
      supportsOpencode,
    };
  }

  /**
   * Führt `specify init` im Workspace aus.
   *
   * Nur erlaubt in safe-cli Mode.
   * Verwendet --integration opencode oder --integration generic.
   */
  async initialize(input: SpecKitRunInput): Promise<SpecKitCommandResult> {
    const start = Date.now();
    const cwd = resolve(input.workspacePath);
    const dir = logDir(cwd, input.runId);
    const aiAgent = input.aiAgent === 'opencode' ? 'opencode' : 'generic';

    // detect-only und artifact-only: kein init
    if (input.mode === 'detect-only' || input.mode === 'artifact-only') {
      const artifacts = await this.detectArtifacts(input);
      return {
        phase: 'init',
        status: 'skipped',
        command: 'specify',
        args: ['init', '.', '--integration', aiAgent],
        cwd,
        exitCode: null,
        durationMs: Date.now() - start,
        summary: `Init skipped: mode=${input.mode}. Run with mode=safe-cli to execute.`,
        artifacts,
      };
    }

    // safe-cli: führe specify init aus
    const args = ['init', '.', '--integration', aiAgent, '--ignore-agent-tools', '--force', '--no-git'];
    const cmd = 'specify';

    // Validiere Kommando
    try {
      validateSpecKitCommand(cmd, args, cwd);
    } catch (err) {
      return {
        phase: 'init',
        status: 'blocked',
        command: cmd,
        args,
        cwd,
        exitCode: null,
        durationMs: Date.now() - start,
        summary: `Init blocked by policy: ${redactSecrets(String(err))}`,
        artifacts: [],
        blockedReason: redactSecrets(String(err)),
      };
    }

    const stdoutPath = join(dir, 'speckit-init-stdout.log');
    const stderrPath = join(dir, 'speckit-init-stderr.log');

    try {
      const result = await runSafe(cmd, args, cwd, CLI_TIMEOUT_MS);

      // Schreibe Logs
      writeFileSync(stdoutPath, redactSecrets(result.stdout), 'utf-8');
      writeFileSync(stderrPath, redactSecrets(result.stderr), 'utf-8');

      const artifacts = scanWorkspace(cwd);
      const ok = result.exitCode === 0;

      return {
        phase: 'init',
        status: ok ? 'success' : 'failed',
        command: cmd,
        args,
        cwd,
        exitCode: result.exitCode,
        durationMs: Date.now() - start,
        stdoutPath,
        stderrPath,
        summary: ok
          ? `Spec Kit initialized with integration=${aiAgent}. Detected ${artifacts.length} artifacts.`
          : `Spec Kit init failed with exit code ${result.exitCode}`,
        artifacts,
      };
    } catch (err) {
      return {
        phase: 'init',
        status: 'failed',
        command: cmd,
        args,
        cwd,
        exitCode: null,
        durationMs: Date.now() - start,
        summary: `Init error: ${redactValue(err)}`,
        artifacts: [],
      };
    }
  }

  /**
   * Erkennt vorhandene Spec Kit Artefakte ohne Kommandos auszuführen.
   */
  async detectArtifacts(input: SpecKitRunInput): Promise<SpecKitArtifactRef[]> {
    const cwd = resolve(input.workspacePath);
    return scanWorkspace(cwd);
  }

  /**
   * SPECIFY-Phase: Agent Slash Command — nicht direkt CLI-ausführbar.
   *
   * In artifact-only: erkennt specs/<feature>/spec.md
   * In safe-cli: BLOCKED (braucht Agent)
   */
  async runSpecify(input: SpecKitRunInput): Promise<SpecKitCommandResult> {
    return this.agentSlashCommandResult('specify', input,
      'The /speckit.specify command is an Agent Slash Command, not a direct CLI subcommand. ' +
      'It must be executed by an AI coding agent (like opencode) after `specify init`. ' +
      'Positron can detect existing spec artifacts but cannot generate new specs without an agent.',
    );
  }

  /**
   * PLAN-Phase: Agent Slash Command — nicht direkt CLI-ausführbar.
   */
  async runPlan(input: SpecKitRunInput): Promise<SpecKitCommandResult> {
    return this.agentSlashCommandResult('plan', input,
      'The /speckit.plan command is an Agent Slash Command, not a direct CLI subcommand. ' +
      'It must be executed by an AI coding agent. ' +
      'Positron can detect existing plan artifacts but cannot generate new plans without an agent.',
    );
  }

  /**
   * TASKS-Phase: Agent Slash Command — nicht direkt CLI-ausführbar.
   */
  async runTasks(input: SpecKitRunInput): Promise<SpecKitCommandResult> {
    return this.agentSlashCommandResult('tasks', input,
      'The /speckit.tasks command is an Agent Slash Command, not a direct CLI subcommand. ' +
      'It must be executed by an AI coding agent. ' +
      'Positron can detect existing task artifacts but cannot generate new tasks without an agent.',
    );
  }

  /**
   * ANALYZE-Phase: Agent Slash Command — nicht direkt CLI-ausführbar.
   */
  async runAnalyze(input: SpecKitRunInput): Promise<SpecKitCommandResult> {
    return this.agentSlashCommandResult('analyze', input,
      'The /speckit.analyze command is an Agent Slash Command, not a direct CLI subcommand. ' +
      'It must be executed by an AI coding agent. ' +
      'Positron can detect existing analysis-related artifacts but cannot run analysis without an agent.',
    );
  }

  // --- Private Helpers ---

  /**
   * Erzeugt ein BLOCKED/SKIPPED Ergebnis für Agent Slash Commands.
   */
  private async agentSlashCommandResult(
    phase: SpecKitPhase,
    input: SpecKitRunInput,
    blockedReason: string,
  ): Promise<SpecKitCommandResult> {
    const start = Date.now();
    const cwd = resolve(input.workspacePath);

    // In artifact-only mode: detectiere vorhandene Artefakte
    if (input.mode === 'artifact-only' || input.mode === 'detect-only') {
      const artifacts = await this.detectArtifacts(input);
      const phaseArtifacts = this.filterArtifactsForPhase(artifacts, phase);
      return {
        phase,
        status: phaseArtifacts.length > 0 ? 'success' : 'skipped',
        command: 'specify',
        args: [],
        cwd,
        exitCode: null,
        durationMs: Date.now() - start,
        summary: phaseArtifacts.length > 0
          ? `Detected ${phaseArtifacts.length} existing ${phase} artifact(s).`
          : `No ${phase} artifacts found. ${blockedReason}`,
        artifacts: phaseArtifacts,
        blockedReason: phaseArtifacts.length === 0 ? blockedReason : undefined,
      };
    }

    // In safe-cli mode: BLOCKED — kann nicht direkt ausgeführt werden
    return {
      phase,
      status: 'blocked',
      command: 'specify',
      args: [],
      cwd,
      exitCode: null,
      durationMs: Date.now() - start,
      summary: blockedReason,
      artifacts: [],
      blockedReason,
    };
  }

  /**
   * Filtert Artefakte basierend auf der Phase.
   */
  private filterArtifactsForPhase(artifacts: SpecKitArtifactRef[], phase: SpecKitPhase): SpecKitArtifactRef[] {
    const phaseKindMap: Partial<Record<SpecKitPhase, SpecKitArtifactRef['kind'][]>> = {
      constitution: ['constitution'],
      specify: ['spec'],
      plan: ['plan', 'research', 'data-model', 'quickstart', 'contract'],
      tasks: ['tasks'],
      checklist: ['checklist'],
      analyze: ['spec', 'plan', 'tasks', 'research', 'checklist', 'contract', 'data-model'],
    };

    const wantedKinds = phaseKindMap[phase] ?? [];
    return artifacts.filter(a => wantedKinds.includes(a.kind));
  }
}

// --- Safely Run a Command (no shell, no injection) ---

interface SafeResult {
  stdout: string;
  stderr: string;
  exitCode: number | null;
  durationMs: number;
  timedOut: boolean;
}

function runSafe(
  command: string,
  args: string[],
  cwd: string,
  timeoutMs: number,
): Promise<SafeResult> {
  const start = Date.now();

  return new Promise((resolve, reject) => {
    // Nutze spawn mit shell:false für maximale Sicherheit
    const child = spawn(command, args, {
      cwd,
      shell: false,
      timeout: timeoutMs,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: {
        PATH: process.env.PATH ?? '/usr/local/bin:/usr/bin:/bin',
        HOME: process.env.HOME ?? '/tmp',
      },
    });

    let stdout = '';
    let stderr = '';

    child.stdout?.on('data', (d: Buffer) => {
      const text = redactSecrets(d.toString());
      stdout += text.slice(0, MAX_BUFFER);
    });

    child.stderr?.on('data', (d: Buffer) => {
      const text = redactSecrets(d.toString());
      stderr += text.slice(0, MAX_BUFFER);
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
      reject(new SpecKitCommandFailedError(
        `${command} ${args[0] ?? ''}`,
        null,
        redactSecrets(err.message),
      ));
    });
  });
}

/**
 * Parst die Version aus `specify version` Output.
 * Erwartet Zeile mit "specify" gefolgt von einer Version.
 */
function parseVersion(stdout: string): string | undefined {
  // Suche nach Version in der ersten Zeile oder nach "specify X.Y.Z"
  const match = stdout.match(/specify\s+v?(\d+\.\d+\.\d+[^\s]*)/i)
    ?? stdout.match(/version[:\s]+(\d+\.\d+\.\d+[^\s]*)/i);
  if (match) return match[1];

  // Fallback: erste Zeile bereinigen
  const firstLine = stdout.split('\n')[0]?.trim();
  if (firstLine && firstLine.length < 100) return firstLine;

  return undefined;
}

export default RealSpecKitAdapter;
