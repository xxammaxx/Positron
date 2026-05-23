// Tests for FakeOpenCodeAdapter (Issue #16)

import { describe, it, expect, beforeEach } from 'vitest';
import { FakeOpenCodeAdapter, FAKE_OPENCODE_HEALTH_AVAILABLE, FAKE_OPENCODE_HEALTH_UNAVAILABLE } from '../fake-adapter.js';
import type { OpenCodeRunInput } from '@positron/shared';

const baseInput: OpenCodeRunInput = {
  runId: 'test-run-1',
  workspacePath: '/tmp/test-workspace',
  issueTitle: 'Test Issue',
  issueNumber: 16,
  mode: 'safe-cli',
};

const detectOnlyInput: OpenCodeRunInput = { ...baseInput, mode: 'detect-only' };

describe('FakeOpenCodeAdapter — healthCheck', () => {
  it('returns available=true by default', async () => {
    const adapter = new FakeOpenCodeAdapter();
    const health = await adapter.healthCheck('/tmp/test');
    expect(health.available).toBe(true);
    expect(health.version).toBe('1.15.5');
  });

  it('returns available=false when configured', async () => {
    const adapter = new FakeOpenCodeAdapter(FAKE_OPENCODE_HEALTH_UNAVAILABLE);
    const health = await adapter.healthCheck('/tmp/test');
    expect(health.available).toBe(false);
  });

  it('setUnavailable works', async () => {
    const adapter = new FakeOpenCodeAdapter();
    adapter.setUnavailable('test reason');
    const health = await adapter.healthCheck('/tmp/test');
    expect(health.available).toBe(false);
    expect(health.reason).toBe('test reason');
  });
});

describe('FakeOpenCodeAdapter — runSlashCommand', () => {
  it('returns success in safe-cli mode', async () => {
    const adapter = new FakeOpenCodeAdapter();
    const result = await adapter.runSlashCommand('speckit.specify', baseInput);
    expect(result.status).toBe('success');
    expect(result.exitCode).toBe(0);
    expect(result.sessionId).toBeDefined();
  });

  it('returns skipped in detect-only mode', async () => {
    const adapter = new FakeOpenCodeAdapter();
    const result = await adapter.runSlashCommand('speckit.specify', detectOnlyInput);
    expect(result.status).toBe('skipped');
  });

  it('returns failed when shouldFail=true', async () => {
    const adapter = new FakeOpenCodeAdapter();
    adapter.setShouldFailCommands(true);
    const result = await adapter.runSlashCommand('speckit.plan', baseInput);
    expect(result.status).toBe('failed');
  });

  it('uses preconfigured result', async () => {
    const adapter = new FakeOpenCodeAdapter();
    adapter.setCommandResult('speckit.tasks', {
      phase: 'tasks',
      status: 'success',
      command: 'opencode',
      args: [],
      cwd: '/tmp',
      exitCode: 0,
      durationMs: 100,
      summary: 'Custom result',
    });
    const result = await adapter.runSlashCommand('speckit.tasks', baseInput);
    expect(result.summary).toBe('Custom result');
  });
});

describe('FakeOpenCodeAdapter — runImplement', () => {
  it('returns success in safe-cli mode', async () => {
    const adapter = new FakeOpenCodeAdapter();
    const result = await adapter.runImplement(baseInput);
    expect(result.status).toBe('success');
  });

  it('returns skipped in detect-only mode', async () => {
    const adapter = new FakeOpenCodeAdapter();
    const result = await adapter.runImplement(detectOnlyInput);
    expect(result.status).toBe('skipped');
  });
});

describe('FakeOpenCodeAdapter — call log', () => {
  it('tracks command calls', async () => {
    const adapter = new FakeOpenCodeAdapter();
    await adapter.healthCheck('/tmp');
    await adapter.runSlashCommand('speckit.specify', baseInput);
    await adapter.runImplement(baseInput);

    const log = adapter.getCommandCallLog();
    expect(log).toContain('healthCheck');
    expect(log).toContain('runSlashCommand:speckit.specify');
    expect(log).toContain('runImplement');
  });
});
