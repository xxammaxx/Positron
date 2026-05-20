// Positron — Test Runner + TestReport

import fs from 'node:fs';
import path from 'node:path';
import { runCommand } from './command-runner.js';
import { renderTestReportComment, renderTestReportMarkdown } from './test-templates.js';
import type { CommandResult } from './command-runner.js';
import type { DetectedTestCommand, TestCommandStatus } from './detector.js';

export interface TestCommandExecutionResult {
  command: DetectedTestCommand;
  status: TestCommandStatus;
  exitCode: number | null;
  durationMs: number;
  stdoutPath?: string;
  stderrPath?: string;
  summary: string;
}

export interface TestReport {
  runId: string;
  workspacePath: string;
  status: 'PASS' | 'FAIL' | 'BLOCKED';
  startedAt: string;
  finishedAt: string;
  commands: TestCommandExecutionResult[];
  blockedReasons: string[];
  summary: string;
  artifactPath?: string;
}

export interface RunOptions {
  runId: string;
  workspacePath: string;
  commands: DetectedTestCommand[];
  mode?: 'smoke' | 'standard' | 'full';
}

const TIMEOUTS: Record<string, number> = {
  test: 120_000, build: 180_000, lint: 120_000,
  typecheck: 120_000, e2e: 300_000,
  default: 120_000,
};

export class TestRunner {
  private artifactsDir(workspacePath: string, runId: string): string {
    const dir = path.join(workspacePath, '.positron', 'runs', runId);
    fs.mkdirSync(dir, { recursive: true });
    return dir;
  }

  async runDetectedCommands(options: RunOptions): Promise<TestReport> {
    const startedAt = new Date().toISOString();
    const { runId, workspacePath, commands: inputCmds } = options;

    if (inputCmds.length === 0) {
      return {
        runId, workspacePath, status: 'BLOCKED', startedAt,
        finishedAt: new Date().toISOString(), commands: [],
        blockedReasons: ['Keine Test-Kommandos erkannt'],
        summary: '', artifactPath: undefined,
      };
    }

    // Auswahl nach Mode
    const selected = selectCommands(inputCmds, options.mode ?? 'standard');
    const results: TestCommandExecutionResult[] = [];
    const blockedReasons: string[] = [];
    const artifactBase = this.artifactsDir(workspacePath, runId);

    for (const cmd of selected) {
      const timeout = TIMEOUTS[cmd.kind] ?? TIMEOUTS.default;
      let result: CommandResult;

      try {
        result = await runCommand(cmd.command, cmd.args, cmd.cwd, { timeoutMs: timeout });
      } catch {
        results.push({
          command: cmd, status: 'blocked',
          exitCode: null, durationMs: 0,
          summary: `Command failed to start: ${cmd.scriptName ?? cmd.command}`,
        });
        blockedReasons.push(`Command failed to start: ${cmd.scriptName}`);
        continue;
      }

      let status: TestCommandStatus;
      if (result.timedOut) {
        status = 'blocked';
        blockedReasons.push(`${cmd.scriptName}: Timeout nach ${timeout}ms`);
      } else if (result.exitCode === null) {
        status = 'blocked';
        blockedReasons.push(`${cmd.scriptName}: Kein Exit-Code`);
      } else if (result.exitCode !== 0) {
        status = 'failed';
      } else {
        status = 'passed';
      }

      // Artifacts
      const stdoutPath = path.join(artifactBase, `${cmd.id}-stdout.log`);
      const stderrPath = path.join(artifactBase, `${cmd.id}-stderr.log`);
      fs.writeFileSync(stdoutPath, result.stdout);
      fs.writeFileSync(stderrPath, result.stderr);

      results.push({
        command: cmd, status,
        exitCode: result.exitCode,
        durationMs: result.durationMs,
        stdoutPath, stderrPath,
        summary: status === 'passed' ? 'OK' : `Exit ${result.exitCode}`,
      });
    }

    // Bewertung
    const overall = evaluateReport(results, blockedReasons);
    const finishedAt = new Date().toISOString();

    const report: TestReport = {
      runId, workspacePath, status: overall, startedAt, finishedAt,
      commands: results, blockedReasons,
      summary: `${overall}: ${results.length} commands, ${results.filter(c => c.status === 'passed').length} passed`,
      artifactPath: path.join(artifactBase, 'test-report.md'),
    };

    // Report speichern
    const artifactDir = path.join(workspacePath, '.positron', 'runs', runId);
    fs.mkdirSync(artifactDir, { recursive: true });
    fs.writeFileSync(path.join(artifactDir, 'test-report.md'), renderTestReportMarkdown(report));

    return report;
  }

  /** Erzeugt GitHub-Kommentar aus TestReport */
  renderComment(report: TestReport): string {
    return renderTestReportComment(report);
  }
}

function selectCommands(
  commands: DetectedTestCommand[],
  mode: 'smoke' | 'standard' | 'full',
): DetectedTestCommand[] {
  switch (mode) {
    case 'smoke':
      return commands.filter(c => c.kind === 'test' || c.kind === 'build').slice(0, 2);
    case 'full':
      return [...commands];
    case 'standard':
    default:
      return commands.filter(c => c.priority <= 5).slice(0, 5);
  }
}

function evaluateReport(
  results: TestCommandExecutionResult[],
  blockedReasons: string[],
): 'PASS' | 'FAIL' | 'BLOCKED' {
  if (results.length === 0) return 'BLOCKED';
  if (blockedReasons.length > 0 && results.every(r => r.status === 'blocked')) return 'BLOCKED';
  if (results.some(r => r.status === 'blocked')) return 'BLOCKED';
  if (results.some(r => r.status === 'failed')) return 'FAIL';
  return 'PASS';
}
