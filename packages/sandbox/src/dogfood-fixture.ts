// Positron — Dogfood Fixture Change Provider

import fs from 'node:fs';
import path from 'node:path';

export interface FixtureChangeInput {
  workspacePath: string;
  runId: string;
  issueNumber: number;
}

export interface FixtureChangeResult {
  applied: boolean;
  filePath?: string;
  summary: string;
}

/**
 * Wendet eine vordefinierte Änderung für Selbst-Tests an.
 * Erstellt eine Datei .positron-fixture-<issueNumber>.md mit Metadaten.
 * Nur aktiv wenn POSITRON_ENABLE_DOGFOOD_FIXTURE_CHANGE=true.
 */
export function applyDogfoodFixtureChange(input: FixtureChangeInput): FixtureChangeResult {
  if (process.env['POSITRON_ENABLE_DOGFOOD_FIXTURE_CHANGE'] !== 'true') {
    return { applied: false, summary: 'Dogfood fixture change disabled' };
  }

  const { workspacePath, runId, issueNumber } = input;
  const fileName = `.positron-fixture-${issueNumber}.md`;
  const filePath = path.join(workspacePath, fileName);

  try {
    const content = [
      `# Positron Dogfood Fixture`,
      ``,
      `**Run ID:** ${runId}`,
      `**Issue:** #${issueNumber}`,
      `**Created:** ${new Date().toISOString()}`,
      ``,
      `This file was created automatically by Positron's dogfood fixture change provider.`,
      `It serves as a deterministic change for PR validation.`,
      ``,
      `## Purpose`,
      ``,
      `1. Verify that Positron can create, stage, commit, and push file changes`,
      `2. Provide a predictable diff for PR body generation and review`,
      `3. Validate the end-to-end change lifecycle without requiring a real codebase change`,
    ].join('\n');

    fs.writeFileSync(filePath, content, 'utf-8');

    return {
      applied: true,
      filePath,
      summary: `Created dogfood fixture: ${fileName}`,
    };
  } catch (err) {
    return {
      applied: false,
      summary: `Failed to create dogfood fixture: ${String(err)}`,
    };
  }
}

/**
 * Prüft ob Dogfood-Fixture-Änderungen vorhanden sind.
 */
export function hasFixtureChanges(workspacePath: string): number {
  if (!fs.existsSync(workspacePath)) return 0;

  let count = 0;
  try {
    const files = fs.readdirSync(workspacePath);
    for (const file of files) {
      if (file.startsWith('.positron-fixture-')) {
        count++;
      }
    }
  } catch {
    return 0;
  }
  return count;
}
