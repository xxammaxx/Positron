import { describe, it, expect, vi, beforeEach } from 'vitest';
import { runCommand } from '@positron/sandbox';
import { RealOpenCodeAdapter } from '../real-adapter.js';

vi.mock('@positron/sandbox', async () => {
  const actual = await vi.importActual('@positron/sandbox') as any;
  return { ...actual, runCommand: vi.fn() };
});

describe('RealOpenCodeAdapter', () => {
  let adapter: RealOpenCodeAdapter;

  beforeEach(() => {
    adapter = new RealOpenCodeAdapter('/tmp/evidence');
    vi.mocked(runCommand).mockReset();
  });

  describe('healthCheck', () => {
    it('should return available=true when opencode --version succeeds', async () => {
      vi.mocked(runCommand).mockResolvedValue({
        exitCode: 0, stdout: '1.0.0', stderr: '', durationMs: 100, command: 'opencode --version',
      });
      const result = await adapter.healthCheck('/ws');
      expect(result.available).toBe(true);
      expect(result.version).toBe('1.0.0');
    });

    it('should return available=false on non-zero exit', async () => {
      vi.mocked(runCommand).mockResolvedValue({
        exitCode: 1, stdout: '', stderr: 'not found', durationMs: 50, command: 'opencode --version',
      });
      const result = await adapter.healthCheck('/ws');
      expect(result.available).toBe(false);
    });

    it('should return available=false on spawn error', async () => {
      vi.mocked(runCommand).mockRejectedValue(new Error('ENOENT'));
      const result = await adapter.healthCheck('/ws');
      expect(result.available).toBe(false);
    });
  });

  describe('runSlashCommand', () => {
    it('should return blocked if healthCheck fails', async () => {
      vi.mocked(runCommand).mockResolvedValue({
        exitCode: 1, stdout: '', stderr: 'not found', durationMs: 50, command: 'opencode --version',
      });
      const result = await adapter.runSlashCommand('speckit.specify', {
        runId: 'r1', workspacePath: '/ws', issueTitle: 'Test', issueNumber: 1, mode: 'safe-cli',
      });
      expect(result.status).toBe('blocked');
      expect(result.summary).toContain('not available');
    });
  });
});
