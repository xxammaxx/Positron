// Positron — Dogfood Fixture Change Provider
//
// **DEVELOPMENT-ONLY TOOL**: This module exists exclusively for testing Positron
// against itself ("dogfooding"). It creates artificial, deterministic file changes
// so the pipeline can validate commit/PR creation without requiring real code changes.
//
// **DO NOT USE IN PRODUCTION.** It creates `.positron-fixture-*.md` files that
// pollute the workspace and produce meaningless commits.
//
// Guards:
//   1. POSITRON_ENABLE_DOGFOOD_FIXTURE_CHANGE=true must be explicitly set
//   2. A `.positron-dogfood` marker file must exist in the workspace root
//
// Without both conditions, the function returns `applied: false` immediately.

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
 * Applies a predefined change for self-testing (dogfooding).
 *
 * Creates a file `.positron-fixture-<issueNumber>.md` with metadata.
 * Only active when BOTH conditions are met:
 *   1. POSITRON_ENABLE_DOGFOOD_FIXTURE_CHANGE=true
 *   2. A `.positron-dogfood` marker file exists in the workspace root
 *
 * This is a development-only tool for testing Positron itself.
 * Never use in production pipelines.
 */
export function applyDogfoodFixtureChange(input: FixtureChangeInput): FixtureChangeResult {
  if (process.env['POSITRON_ENABLE_DOGFOOD_FIXTURE_CHANGE'] !== 'true') {
    return { applied: false, summary: 'Dogfood fixture change disabled (env var not set)' };
  }

  const { workspacePath, runId, issueNumber } = input;

  // Guard: workspace must contain a .positron-dogfood marker file
  const markerPath = path.join(workspacePath, '.positron-dogfood');
  if (!fs.existsSync(markerPath)) {
    return { applied: false, summary: 'Dogfood fixture change disabled (no .positron-dogfood marker in workspace)' };
  }

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
