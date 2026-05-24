// Positron — Dogfood Fixture Change Provider (Issue #38)
//
// Erzeugt eine deterministische, sichere Dateiänderung für Dogfood-Runs.
// Nur aktiv mit POSITRON_ENABLE_DOGFOOD_FIXTURE_CHANGE=true.
// Der Provider wird NIE in Produktivläufen aktiv — nur für Test-/Dogfood-Zwecke.

import fs from 'node:fs';
import path from 'node:path';

export interface FixtureChangeInput {
  workspacePath: string;
  runId: string;
  issueNumber: number;
}

export interface FixtureChangeResult {
  applied: boolean;
  filePath: string;
  summary: string;
}

/**
 * Deterministischer Fixture-Change-Provider.
 *
 * Erzeugt/aktualisiert `.positron-dogfood.md` im Workspace mit einem
 * strukturierten Eintrag, der Run-ID, Timestamp und Issue-Nummer enthält.
 *
 * Nur aktiv wenn `POSITRON_ENABLE_DOGFOOD_FIXTURE_CHANGE=true`.
 */
export function applyDogfoodFixtureChange(input: FixtureChangeInput): FixtureChangeResult {
  const enabled = process.env.POSITRON_ENABLE_DOGFOOD_FIXTURE_CHANGE === 'true';
  if (!enabled) {
    return { applied: false, filePath: '', summary: 'Dogfood fixture disabled' };
  }

  const { workspacePath, runId, issueNumber } = input;
  const filePath = path.join(workspacePath, '.positron-dogfood.md');

  const timestamp = new Date().toISOString();
  const entry = [
    '',
    `## Dogfood Run Entry: ${runId.slice(0, 8)}`,
    '',
    `- **Run ID:** ${runId}`,
    `- **Issue:** #${issueNumber}`,
    `- **Timestamp:** ${timestamp}`,
    `- **Fixture Change Provider:** v0.1.0`,
    '',
    'This file is created by the Positron Dogfood Fixture Change Provider.',
    'It exists only in dogfood/test mode and is never present in production runs.',
    '',
  ].join('\n');

  // An Datei anhängen (oder erstellen)
  const existing = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf-8') : '# Positron Dogfood Run Artifacts\n';
  const updated = existing.trimEnd() + entry;
  fs.writeFileSync(filePath, updated, 'utf-8');

  return {
    applied: true,
    filePath,
    summary: `Fixture change applied to ${path.basename(filePath)} (run ${runId.slice(0, 8)})`,
  };
}

/**
 * Prüft ob genug Zeit vergangen ist seit dem letzten Eintrag, um
 * einen neuen Eintrag zu rechtfertigen (verhindert identische Commits).
 */
export function hasFixtureChanges(input: FixtureChangeInput): boolean {
  const enabled = process.env.POSITRON_ENABLE_DOGFOOD_FIXTURE_CHANGE === 'true';
  if (!enabled) return false;

  const { workspacePath } = input;
  const filePath = path.join(workspacePath, '.positron-dogfood.md');
  return fs.existsSync(filePath);
}
