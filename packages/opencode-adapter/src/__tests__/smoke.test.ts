// Positron — OpenCode Adapter: Smoke-Tests

import { describe, expect, test } from 'vitest';
import { FakeOpenCodeAdapter, FAKE_OPENCODE_HEALTH_AVAILABLE, FAKE_OPENCODE_HEALTH_UNAVAILABLE } from '../fake-adapter.js';

describe('FakeOpenCodeAdapter', () => {
  test('healthCheck mit Standard-Health', async () => {
    const adapter = new FakeOpenCodeAdapter();
    const health = await adapter.healthCheck('/tmp');
    expect(health.available).toBe(true);
    expect(health.version).toBe('0.1.0-fake');
  });

  test('healthCheck mit UNAVAILABLE', async () => {
    const adapter = new FakeOpenCodeAdapter(FAKE_OPENCODE_HEALTH_UNAVAILABLE);
    const health = await adapter.healthCheck('/tmp');
    expect(health.available).toBe(false);
  });

  test('runSlashCommand ruft Kommando-Log', async () => {
    const adapter = new FakeOpenCodeAdapter();
    const result = await adapter.runSlashCommand('speckit.specify', {
      runId: 'test',
      workspacePath: '/tmp',
      issueTitle: 'test',
    });
    expect(result.status).toBe('success');
    expect(adapter.getCommandCallLog()).toContain('runSlashCommand:speckit.specify');
  });

  test('runImplement mit Standard-Verhalten', async () => {
    const adapter = new FakeOpenCodeAdapter();
    const result = await adapter.runImplement({
      runId: 'test',
      workspacePath: '/tmp',
      issueTitle: 'test',
    });
    expect(result.status).toBe('success');
    expect(result.summary).toContain('implementation completed');
  });

  test('setShouldFailCommands(true) lässt runImplement fehlschlagen', async () => {
    const adapter = new FakeOpenCodeAdapter();
    adapter.setShouldFailCommands(true);
    const result = await adapter.runImplement({
      runId: 'test',
      workspacePath: '/tmp',
      issueTitle: 'test',
    });
    expect(result.status).toBe('failed');
  });

  test('clearCallLog leert das Log', () => {
    const adapter = new FakeOpenCodeAdapter();
    adapter.clearCallLog();
    expect(adapter.getCommandCallLog()).toHaveLength(0);
  });
});
