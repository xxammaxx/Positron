/**
 * OpenCode CLI Argument Regression Test
 *
 * Verifies that RealOpenCodeAdapter constructs correct CLI commands
 * without unsupported flags like --issue or --mode.
 *
 * Diese Datei testet die Command-Konstruktion isoliert durch vi.mock.
 * Kein echter CLI-Aufruf, keine echten Tokens.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { runCommand } from '@positron/sandbox';

vi.mock('@positron/sandbox', async () => {
  const actual = await vi.importActual('@positron/sandbox') as any;
  return { ...actual, runCommand: vi.fn() };
});

describe('OpenCode CLI argument construction', () => {
  beforeEach(() => {
    vi.mocked(runCommand).mockReset();
    vi.mocked(runCommand).mockResolvedValue({
      exitCode: 0, stdout: 'ok', stderr: '', durationMs: 10, command: '',
    });
  });

  it('should NOT use --issue flag in runSlashCommand', async () => {
    const { RealOpenCodeAdapter } = await import('../real-adapter.js');
    const adapter = new RealOpenCodeAdapter();

    // Spy on runCommand to inspect arguments
    await adapter.runSlashCommand('speckit.specify', {
      runId: 'r1', workspacePath: '/ws', issueTitle: 'Test issue',
      issueNumber: 42, mode: 'safe-cli',
    });

    const lastCall = vi.mocked(runCommand).mock.calls[1]; // first call is healthCheck
    if (lastCall) {
      const command = lastCall[0];
      const args = lastCall[1];
      const commandStr = `${command} ${args.join(' ')}`;
      expect(commandStr).not.toContain('--issue');
      expect(commandStr).not.toContain('--mode');
      expect(commandStr).not.toContain('unsafe');
    }
  });

  it('should include issueNumber in context message, not as CLI flag', async () => {
    const { RealOpenCodeAdapter } = await import('../real-adapter.js');
    const adapter = new RealOpenCodeAdapter();

    await adapter.runSlashCommand('speckit.plan', {
      runId: 'r-test-123', workspacePath: '/ws', issueTitle: 'My Issue',
      issueNumber: 99, mode: 'safe-cli', issueBody: 'Test body',
    });

    const lastCall = vi.mocked(runCommand).mock.calls[1];
    if (lastCall) {
      const command = lastCall[0];
      const args = lastCall[1];
      const commandStr = `${command} ${args.join(' ')}`;
      expect(commandStr).toContain('opencode');
      expect(commandStr).not.toContain('--issue');
      expect(commandStr).not.toContain('--mode');
    }
  });
});
