import { describe, expect, test, beforeEach, afterEach } from 'vitest';
import { applyDogfoodFixtureChange, hasFixtureChanges } from '../dogfood-fixture.js';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

describe('Dogfood Fixture Change Provider', () => {
  const tmpDir = path.join(os.tmpdir(), `positron-fixture-test-${Date.now()}`);
  const workspacePath = path.join(tmpDir, 'workspace');

  beforeEach(() => {
    fs.mkdirSync(workspacePath, { recursive: true });
    // Ensure fixture is disabled by default
    delete process.env.POSITRON_ENABLE_DOGFOOD_FIXTURE_CHANGE;
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    delete process.env.POSITRON_ENABLE_DOGFOOD_FIXTURE_CHANGE;
  });

  test('ohne Flag wird keine Datei geändert', () => {
    const result = applyDogfoodFixtureChange({
      workspacePath,
      runId: 'test-run-id-12345',
      issueNumber: 42,
    });
    expect(result.applied).toBe(false);
    expect(result.summary).toBe('Dogfood fixture disabled');
    expect(fs.existsSync(path.join(workspacePath, '.positron-dogfood.md'))).toBe(false);
  });

  test('mit Flag wird eine Datei erstellt', () => {
    process.env.POSITRON_ENABLE_DOGFOOD_FIXTURE_CHANGE = 'true';

    const result = applyDogfoodFixtureChange({
      workspacePath,
      runId: 'test-run-id-12345',
      issueNumber: 42,
    });

    expect(result.applied).toBe(true);
    expect(result.filePath).toContain('.positron-dogfood.md');
    expect(result.summary).toContain('Fixture change applied');

    const content = fs.readFileSync(result.filePath, 'utf-8');
    expect(content).toContain('# Positron Dogfood Run Artifacts');
    expect(content).toContain('test-run-id-12345');
    expect(content).toContain('#42');
    expect(content).toContain('Dogfood Fixture Change Provider');
  });

  test('mehrere Aufrufe hängen an, überschreiben nicht', () => {
    process.env.POSITRON_ENABLE_DOGFOOD_FIXTURE_CHANGE = 'true';

    applyDogfoodFixtureChange({ workspacePath, runId: 'run-1', issueNumber: 1 });
    applyDogfoodFixtureChange({ workspacePath, runId: 'run-2', issueNumber: 2 });

    const content = fs.readFileSync(path.join(workspacePath, '.positron-dogfood.md'), 'utf-8');
    expect(content).toContain('run-1');
    expect(content).toContain('run-2');
    expect(content).toContain('#1');
    expect(content).toContain('#2');
  });

  test('hasFixtureChanges erkennt vorhandene Datei', () => {
    process.env.POSITRON_ENABLE_DOGFOOD_FIXTURE_CHANGE = 'true';

    expect(hasFixtureChanges({ workspacePath, runId: 'test', issueNumber: 1 })).toBe(false);

    applyDogfoodFixtureChange({ workspacePath, runId: 'test', issueNumber: 1 });

    expect(hasFixtureChanges({ workspacePath, runId: 'test', issueNumber: 1 })).toBe(true);
  });

  test('hasFixtureChanges ohne Flag false', () => {
    delete process.env.POSITRON_ENABLE_DOGFOOD_FIXTURE_CHANGE;

    fs.writeFileSync(path.join(workspacePath, '.positron-dogfood.md'), 'test');

    expect(hasFixtureChanges({ workspacePath, runId: 'test', issueNumber: 1 })).toBe(false);
  });
});
