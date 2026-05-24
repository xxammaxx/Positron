// Positron — Test Command Detector

import fs from 'node:fs';
import path from 'node:path';
import { runCommand } from './command-runner.js';

/** Art des Test-Kommandos */
export type TestCommandKind = 'vitest' | 'jest' | 'mocha' | 'pytest' | 'go-test' | 'cargo-test' | 'rspec' | 'unknown';

/** Status des Test-Kommandos */
export type TestCommandStatus = 'detected' | 'not_found' | 'error';

/** Ein erkanntes Test-Kommando */
export interface DetectedTestCommand {
  kind: TestCommandKind;
  command: string;
  args: string[];
  detectedBy: 'package.json' | 'config-file' | 'file-presence' | 'framework-heuristic';
}

/** Ergebnis der Test-Erkennung */
export interface TestCommandDetectionResult {
  commands: DetectedTestCommand[];
  framework: string | null;
  status: TestCommandStatus;
}

/**
 * TestCommandDetector Klasse.
 * Erkennt Test-Kommandos in einem Repository-Pfad.
 * Analysiert package.json, Konfigurationsdateien und Dateistruktur.
 */
export class TestCommandDetector {
  async detect(repoPath: string): Promise<TestCommandDetectionResult> {
    return detectCommands(repoPath);
  }
}

/**
 * Erkennt Test-Kommandos in einem Repository-Pfad (Funktionsform).
 */
async function detectCommands(repoPath: string): Promise<TestCommandDetectionResult> {
  const commands: DetectedTestCommand[] = [];

  // package.json analysieren
  const packageJsonPath = path.join(repoPath, 'package.json');
  if (fs.existsSync(packageJsonPath)) {
    try {
      const content = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8')) as Record<string, unknown>;
      const scripts = content['scripts'] as Record<string, string> | undefined;

      if (scripts) {
        // vitest
        if (scripts['test']?.includes('vitest')) {
          commands.push({
            kind: 'vitest',
            command: 'npx',
            args: ['vitest', 'run'],
            detectedBy: 'package.json',
          });
        }
        // jest
        else if (scripts['test']?.includes('jest')) {
          commands.push({
            kind: 'jest',
            command: 'npx',
            args: ['jest'],
            detectedBy: 'package.json',
          });
        }
        // mocha
        else if (scripts['test']?.includes('mocha')) {
          commands.push({
            kind: 'mocha',
            command: 'npx',
            args: ['mocha'],
            detectedBy: 'package.json',
          });
        }
      }
    } catch {
      // JSON parse error — ignorieren
    }
  }

  // pyproject.toml / pytest
  if (fs.existsSync(path.join(repoPath, 'pyproject.toml'))) {
    commands.push({
      kind: 'pytest',
      command: 'python',
      args: ['-m', 'pytest'],
      detectedBy: 'config-file',
    });
  }

  // go.mod
  if (fs.existsSync(path.join(repoPath, 'go.mod'))) {
    commands.push({
      kind: 'go-test',
      command: 'go',
      args: ['test', './...'],
      detectedBy: 'config-file',
    });
  }

  // Cargo.toml
  if (fs.existsSync(path.join(repoPath, 'Cargo.toml'))) {
    commands.push({
      kind: 'cargo-test',
      command: 'cargo',
      args: ['test'],
      detectedBy: 'config-file',
    });
  }

  // Gemfile / rspec
  if (fs.existsSync(path.join(repoPath, 'Gemfile'))) {
    commands.push({
      kind: 'rspec',
      command: 'bundle',
      args: ['exec', 'rspec'],
      detectedBy: 'file-presence',
    });
  }

  // Fallback: npm test
  if (commands.length === 0 && fs.existsSync(packageJsonPath)) {
    commands.push({
      kind: 'unknown',
      command: 'npm',
      args: ['test'],
      detectedBy: 'framework-heuristic',
    });
  }

  const framework = commands.length > 0 ? commands[0]!.kind : null;

  return {
    commands,
    framework,
    status: commands.length > 0 ? 'detected' : 'not_found',
  };
}
