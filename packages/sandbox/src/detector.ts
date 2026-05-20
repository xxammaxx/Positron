// Positron — Test Command Detection

import fs from 'node:fs';
import path from 'node:path';

export type TestCommandKind = 'test' | 'unit' | 'e2e' | 'build' | 'lint' | 'typecheck' | 'coverage' | 'unknown';
export type TestCommandStatus = 'pending' | 'passed' | 'failed' | 'blocked' | 'skipped';

export interface DetectedTestCommand {
  id: string;
  kind: TestCommandKind;
  command: string;
  args: string[];
  cwd: string;
  source: 'package.json' | 'heuristic' | 'config' | 'manual';
  scriptName?: string;
  priority: number;
  reason: string;
  estimatedRisk: 'low' | 'medium' | 'high';
}

export interface TestCommandDetectionResult {
  workspacePath: string;
  packageManager: 'npm' | 'pnpm' | 'yarn' | 'bun' | 'unknown';
  commands: DetectedTestCommand[];
  blockedReasons: string[];
}

/** Erlaubte Script-Namen */
const ALLOWED_SCRIPTS = new Set([
  'test', 'test:unit', 'test:e2e', 'test:integration',
  'build', 'lint', 'typecheck', 'check', 'coverage',
]);

/** Geblockte Script-Namen (Watch, Dev, Deploy, etc.) */
const BLOCKED_SCRIPTS = new Set([
  'dev', 'start', 'serve', 'watch', 'test:watch', 'preview',
  'release', 'deploy', 'publish', 'postinstall', 'preinstall', 'prepare',
]);

/** Gefährliche Scripts — Command-Inhalte, die nie ausgeführt werden */
const DANGEROUS_PATTERNS = [
  /rm\s+-rf/, /sudo\b/, /curl\s+\|/, /wget\s+\|/, /git\s+push/, /git\s+commit/,
  /docker\s+(?:rm|system\s+prune)/, /shutdown/, /reboot/,
];

export class TestCommandDetector {
  async detect(workspacePath: string): Promise<TestCommandDetectionResult> {
    const pkgPath = path.join(workspacePath, 'package.json');
    const blockedReasons: string[] = [];

    if (!fs.existsSync(pkgPath)) {
      blockedReasons.push('Kein package.json gefunden');
      return { workspacePath, packageManager: 'unknown', commands: [], blockedReasons };
    }

    let pkg: Record<string, unknown>;
    try {
      pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
    } catch {
      blockedReasons.push('package.json konnte nicht geparst werden');
      return { workspacePath, packageManager: 'unknown', commands: [], blockedReasons };
    }

    const packageManager = detectPackageManager(workspacePath);
    const scripts = pkg.scripts as Record<string, string> | undefined;

    if (!scripts || Object.keys(scripts).length === 0) {
      blockedReasons.push('Keine Scripts in package.json');
      return { workspacePath, packageManager, commands: [], blockedReasons };
    }

    const commands: DetectedTestCommand[] = [];
    let id = 0;

    for (const [name, script] of Object.entries(scripts)) {
      if (BLOCKED_SCRIPTS.has(name)) {
        blockedReasons.push(`Script "${name}" ist geblockt (Watch/Dev/Deploy)`);
        continue;
      }

      if (!ALLOWED_SCRIPTS.has(name)) {
        continue;
      }

      // Prüfe gefährliche Muster im Script-Inhalt
      if (DANGEROUS_PATTERNS.some(p => p.test(script))) {
        blockedReasons.push(`Script "${name}" enthält gefährliches Muster`);
        continue;
      }

      const kind = classifyKind(name);
      const risk = classifyRisk(name, script);
      const priority = computePriority(kind);

      commands.push({
        id: `cmd-${++id}`,
        kind,
        command: 'npm',
        args: ['run', name],
        cwd: workspacePath,
        source: 'package.json',
        scriptName: name,
        priority,
        reason: `Script "${name}" aus package.json`,
        estimatedRisk: risk,
      });
    }

    // Sortiere nach Priorität (niedrigste Zahl = höchste Priorität)
    commands.sort((a, b) => a.priority - b.priority);

    return { workspacePath, packageManager, commands, blockedReasons };
  }
}

/** Sucht nach Lockfiles */
function detectPackageManager(workspacePath: string): 'npm' | 'pnpm' | 'yarn' | 'bun' | 'unknown' {
  if (fs.existsSync(path.join(workspacePath, 'pnpm-lock.yaml'))) return 'pnpm';
  if (fs.existsSync(path.join(workspacePath, 'yarn.lock'))) return 'yarn';
  if (fs.existsSync(path.join(workspacePath, 'bun.lock')) || fs.existsSync(path.join(workspacePath, 'bun.lockb'))) return 'bun';
  if (fs.existsSync(path.join(workspacePath, 'package-lock.json'))) return 'npm';
  return 'unknown';
}

function classifyKind(name: string): TestCommandKind {
  const m = new Map<string, TestCommandKind>([
    ['test', 'test'], ['test:unit', 'unit'], ['test:integration', 'unit'],
    ['test:e2e', 'e2e'], ['build', 'build'], ['lint', 'lint'],
    ['typecheck', 'typecheck'], ['check', 'lint'], ['coverage', 'coverage'],
  ]);
  return m.get(name) ?? 'unknown';
}

function classifyRisk(_name: string, script: string): 'low' | 'medium' | 'high' {
  if (/e2e|playwright|cypress|selenium/i.test(script)) return 'medium';
  if (DANGEROUS_PATTERNS.some(p => p.test(script))) return 'high';
  return 'low';
}

function computePriority(kind: TestCommandKind): number {
  const p = new Map<TestCommandKind, number>([
    ['test', 1], ['unit', 2], ['build', 3], ['typecheck', 4],
    ['lint', 5], ['coverage', 6], ['e2e', 7], ['unknown', 99],
  ]);
  return p.get(kind) ?? 99;
}
