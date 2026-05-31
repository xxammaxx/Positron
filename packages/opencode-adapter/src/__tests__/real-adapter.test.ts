// Positron — RealOpenCodeAdapter: Tests

import { describe, expect, test, beforeEach, afterEach, vi } from 'vitest';
import { RealOpenCodeAdapter } from '../real-adapter.js';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

// Mock runCommand to avoid depending on real opencode CLI
vi.mock('@positron/sandbox', () => {
  const mockFn = vi.fn(async (cmd: string, args: string[], _opts: any) => {
    // Simulate opencode --version for health check
    if (args[0] === '--version') {
      return { exitCode: 0, stdout: '1.15.5\n', stderr: '', durationMs: 10, command: 'opencode --version' };
    }
    // Simulate opencode run with JSON error output
    if (args[0] === 'run') {
      return {
        exitCode: 0,
        stdout: '{"type":"error","error":{"data":{"message":"Command not found: spec-driven-development"}}}\n',
        stderr: '',
        durationMs: 50,
        command: `opencode ${args.join(' ')}`,
      };
    }
    return { exitCode: 0, stdout: '', stderr: '', durationMs: 10, command: cmd };
  });
  return { runCommand: mockFn };
});

describe('RealOpenCodeAdapter', () => {
  const tmpWorkspace = fs.mkdtempSync(path.join(os.tmpdir(), 'opencode-test-'));
  const tmpEvidence = path.join(tmpWorkspace, '.positron', 'evidence', 'opencode');

  beforeEach(() => {
    fs.mkdirSync(tmpEvidence, { recursive: true });
    vi.clearAllMocks();
  });

  afterEach(() => {
    fs.rmSync(tmpWorkspace, { recursive: true, force: true });
  });

  test('healthCheck returns available when CLI is installed', async () => {
    const adapter = new RealOpenCodeAdapter(tmpEvidence);
    const health = await adapter.healthCheck(tmpWorkspace);
    expect(health.available).toBe(true);
    expect(health.version).toBeTruthy();
    expect(health.commandPath).toBe('opencode');
  });

  test('runSlashCommand uses spec-driven-development with phaseName', async () => {
    const adapter = new RealOpenCodeAdapter(tmpEvidence);
    const result = await adapter.runSlashCommand('spec-driven-development', {
      runId: 'test-run',
      workspacePath: tmpWorkspace,
      issueTitle: 'Test Issue',
      issueNumber: 42,
      phaseName: 'specify',
    });

    expect(['blocked', 'failed']).toContain(result.status);
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
    expect(result.cwd).toBe(tmpWorkspace);

    // Verify args contain spec-driven-development (the mock always returns failed)
    expect(result.status).toBe('failed');
    expect(result.command).toContain('spec-driven-development');
  });

  test('runImplement delegates to runSlashCommand with implement phase', async () => {
    const adapter = new RealOpenCodeAdapter(tmpEvidence);
    const result = await adapter.runImplement({
      runId: 'test-run',
      workspacePath: tmpWorkspace,
      issueTitle: 'Implement test feature',
      issueNumber: 99,
      autonomyLevel: 2,
    });

    expect(['blocked', 'failed', 'success']).toContain(result.status);
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
    expect(result.cwd).toBe(tmpWorkspace);
  });

  test('extractTextFromOutput parses text events from JSON lines', () => {
    const adapter = new RealOpenCodeAdapter(tmpEvidence);
    const output = [
      '{"type":"step_start","part":{"id":"1"}}',
      '{"type":"text","part":{"text":"## Specification\\n\\nThis is the spec."}}',
      '{"type":"step_finish","part":{"id":"2"}}',
      '{"type":"text","part":{"text":"## Plan\\n\\nStep 1, Step 2."}}',
      '',
    ].join('\n');

    const result = (adapter as any).extractTextFromOutput(output);
    expect(result).toContain('## Specification');
    expect(result).toContain('## Plan');
    expect(result).toContain('This is the spec.');
  });

  test('extractTextFromOutput returns undefined for no text events', () => {
    const adapter = new RealOpenCodeAdapter(tmpEvidence);
    const output = [
      '{"type":"step_start","part":{"id":"1"}}',
      '{"type":"step_finish","part":{"id":"2"}}',
    ].join('\n');

    const result = (adapter as any).extractTextFromOutput(output);
    expect(result).toBeUndefined();
  });

  test('extractTextFromOutput handles empty output', () => {
    const adapter = new RealOpenCodeAdapter(tmpEvidence);
    expect((adapter as any).extractTextFromOutput('')).toBeUndefined();
    expect((adapter as any).extractTextFromOutput('{}')).toBeUndefined();
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
