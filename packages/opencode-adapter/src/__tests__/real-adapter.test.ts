// Positron — RealOpenCodeAdapter: Tests

import { describe, expect, test, beforeEach, afterEach } from 'vitest';
import { RealOpenCodeAdapter } from '../real-adapter.js';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

describe('RealOpenCodeAdapter', () => {
  const tmpWorkspace = fs.mkdtempSync(path.join(os.tmpdir(), 'opencode-test-'));
  const tmpEvidence = path.join(tmpWorkspace, '.positron', 'evidence', 'opencode');

  beforeEach(() => {
    fs.mkdirSync(tmpEvidence, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tmpWorkspace, { recursive: true, force: true });
  });

  test('healthCheck returns available when CLI is installed', async () => {
    const adapter = new RealOpenCodeAdapter(tmpEvidence);
    const health = await adapter.healthCheck(tmpWorkspace);
    // If opencode CLI is installed, it reports available with a version
    if (health.available) {
      expect(health.version).toBeTruthy();
      expect(health.commandPath).toBe('opencode');
    } else {
      // Graceful fallback when not installed
      expect(health.reason).toBeTruthy();
      expect(health.reason!.length).toBeGreaterThan(5);
    }
  });

  test('runSlashCommand errors gracefully when opencode fails', async () => {
    const adapter = new RealOpenCodeAdapter(tmpEvidence);
    const result = await adapter.runSlashCommand('speckit.specify', {
      runId: 'test-run',
      workspacePath: tmpWorkspace,
      issueTitle: 'Test Issue',
      issueNumber: 42,
    });

    // Should not throw — returns failed/blocked status gracefully
    expect(['blocked', 'failed']).toContain(result.status);
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
    expect(result.cwd).toBe(tmpWorkspace);
  });

  test('runImplement errors gracefully when opencode fails', async () => {
    const adapter = new RealOpenCodeAdapter(tmpEvidence);
    const result = await adapter.runImplement({
      runId: 'test-run',
      workspacePath: tmpWorkspace,
      issueTitle: 'Implement test feature',
      issueNumber: 99,
      autonomyLevel: 2,
    });

    // Should not throw — returns failed/blocked status gracefully
    expect(['blocked', 'failed']).toContain(result.status);
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
    expect(result.cwd).toBe(tmpWorkspace);
  });

  test('saveEvidence creates output files', async () => {
    const adapter = new RealOpenCodeAdapter(tmpEvidence);

    // Access private saveEvidence via any cast for testing
    const result = (adapter as any).saveEvidence('test-command', 'stdout content', 'stderr content');

    expect(result.stdoutPath).toBeTruthy();
    expect(result.stderrPath).toBeTruthy();

    // Verify files were created
    expect(fs.existsSync(result.stdoutPath)).toBe(true);
    expect(fs.existsSync(result.stderrPath)).toBe(true);

    // Verify content
    const stdoutContent = fs.readFileSync(result.stdoutPath, 'utf-8');
    const stderrContent = fs.readFileSync(result.stderrPath, 'utf-8');
    expect(stdoutContent).toBe('stdout content');
    expect(stderrContent).toBe('stderr content');
  });

  test('saveEvidence handles empty output gracefully', async () => {
    const adapter = new RealOpenCodeAdapter(tmpEvidence);
    const result = (adapter as any).saveEvidence('empty-command', '', '');

    // No stdout or stderr means no files written
    expect(result.stdoutPath).toBeUndefined();
    expect(result.stderrPath).toBeUndefined();
  });

  test('saveEvidence uses command-specific subdirectories', async () => {
    const adapter = new RealOpenCodeAdapter(tmpEvidence);
    const r1 = (adapter as any).saveEvidence('specify', 'out1', 'err1');
    const r2 = (adapter as any).saveEvidence('implement', 'out2', 'err2');

    // Different commands should use different directories
    expect(r1.stdoutPath).toBeTruthy();
    expect(r2.stdoutPath).toBeTruthy();
    expect(path.dirname(r1.stdoutPath)).not.toBe(path.dirname(r2.stdoutPath));
  });
});
