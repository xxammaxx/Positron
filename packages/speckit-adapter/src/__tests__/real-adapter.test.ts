import { describe, it, expect, vi, beforeEach } from 'vitest';
import { runCommand } from '@positron/sandbox';
import { RealSpecKitAdapter } from '../real-adapter.js';

vi.mock('@positron/sandbox', async () => {
  const actual = await vi.importActual('@positron/sandbox') as any;
  return { ...actual, runCommand: vi.fn() };
});

describe('RealSpecKitAdapter', () => {
  let adapter: RealSpecKitAdapter;

  beforeEach(() => {
    adapter = new RealSpecKitAdapter();
    vi.mocked(runCommand).mockReset();
  });

  describe('healthCheck', () => {
    it('should return available=true when specify version succeeds', async () => {
      vi.mocked(runCommand).mockResolvedValue({
        exitCode: 0, stdout: '2.0.0', stderr: '', durationMs: 100, command: 'specify version',
      });
      const result = await adapter.healthCheck('/ws');
      expect(result.available).toBe(true);
      expect(result.version).toBe('2.0.0');
    });

    it('should return available=false on non-zero exit', async () => {
      vi.mocked(runCommand).mockResolvedValue({
        exitCode: 127, stdout: '', stderr: 'command not found', durationMs: 50, command: 'specify version',
      });
      const result = await adapter.healthCheck('/ws');
      expect(result.available).toBe(false);
    });

    it('should return available=false on exception', async () => {
      vi.mocked(runCommand).mockRejectedValue(new Error('ENOENT'));
      const result = await adapter.healthCheck('/ws');
      expect(result.available).toBe(false);
      expect(result.reason).toContain('not found');
    });
  });

  describe('initialize', () => {
    it('should throw in non-safe-cli mode', async () => {
      await expect(adapter.initialize({
        runId: 'r1', workspacePath: '/ws', issueTitle: 'T', issueNumber: 1, mode: 'artifact-only', aiAgent: 'generic',
      })).rejects.toThrow('not allowed');
    });

    it('should succeed in safe-cli mode', async () => {
      vi.mocked(runCommand).mockResolvedValue({
        exitCode: 0, stdout: 'Initialized', stderr: '', durationMs: 200, command: 'specify init',
      });
      const result = await adapter.initialize({
        runId: 'r1', workspacePath: '/ws', issueTitle: 'T', issueNumber: 1, mode: 'safe-cli', aiAgent: 'opencode',
      });
      expect(result.status).toBe('success');
    });
  });
});
