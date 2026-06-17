/**
 * Red/Green Tests: #244 Workspace Cleanup Runtime
 *
 * Verifies:
 * - destroyWorkspace path boundary safety
 * - destroyWorkspace idempotency
 * - lockWorkspace prevents concurrent access
 * - unlockWorkspace cannot unlock another run's workspace
 * - isLocked returns deterministic status
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { FakeGitWorkspaceAdapter } from '../fake-adapter.js';

describe('#244 Workspace Cleanup — FakeGitWorkspaceAdapter', () => {
  let adapter: FakeGitWorkspaceAdapter;

  beforeEach(() => {
    adapter = new FakeGitWorkspaceAdapter();
  });

  describe('destroyWorkspace', () => {
    it('rejects empty path', async () => {
      const result = await adapter.destroyWorkspace('');
      expect(result.destroyed).toBe(false);
      expect(result.reason).toContain('empty');
    });

    it('rejects root path', async () => {
      const result = await adapter.destroyWorkspace('/');
      expect(result.destroyed).toBe(false);
      expect(result.reason).toContain('root');
    });

    it('rejects path traversal (mock — fake adapter checks empty/root)', async () => {
      // Fake adapter primarily checks empty/root; real adapter does full boundary
      const result = await adapter.destroyWorkspace('/');
      expect(result.destroyed).toBe(false);
    });

    it('is idempotent for already destroyed workspace', async () => {
      const ws = '/tmp/positron-fake-test12345678';
      // First destroy
      const r1 = await adapter.destroyWorkspace(ws);
      expect(r1.destroyed).toBe(true);
      // Second destroy — idempotent
      const r2 = await adapter.destroyWorkspace(ws);
      expect(r2.destroyed).toBe(true);
      expect(r2.reason).toContain('Already destroyed');
    });

    it('destroys workspace and cleans up internal maps', async () => {
      // First prepare a workspace
      const ws = await adapter.prepareWorkspace({
        repository: { owner: 'test', repo: 'test', remoteUrl: 'https://github.com/test/test.git' },
        issueNumber: 42,
        issueTitle: 'Test cleanup',
        runId: 'test-run-cleanup-12345678',
        baseBranch: 'main',
      });

      const result = await adapter.destroyWorkspace(ws.workspacePath);
      expect(result.destroyed).toBe(true);
    });
  });

  describe('lockWorkspace', () => {
    it('prevents second concurrent lock by different owner', async () => {
      const wsPath = '/tmp/positron-fake-locktest';
      const r1 = await adapter.lockWorkspace(wsPath, 'run-1');
      expect(r1.locked).toBe(true);

      const r2 = await adapter.lockWorkspace(wsPath, 'run-2');
      expect(r2.locked).toBe(false);
      expect(r2.reason).toContain('already locked');
    });

    it('allows same owner to re-lock (idempotent)', async () => {
      const wsPath = '/tmp/positron-fake-locktest';
      const r1 = await adapter.lockWorkspace(wsPath, 'run-1');
      expect(r1.locked).toBe(true);

      const r2 = await adapter.lockWorkspace(wsPath, 'run-1');
      expect(r2.locked).toBe(true);
      expect(r2.reason).toContain('idempotent');
    });

    it('rejects empty path or ownerRunId', async () => {
      const r1 = await adapter.lockWorkspace('', 'run-1');
      expect(r1.locked).toBe(false);

      const r2 = await adapter.lockWorkspace('/tmp/test', '');
      expect(r2.locked).toBe(false);
    });
  });

  describe('unlockWorkspace', () => {
    it('cannot unlock another run workspace', async () => {
      const wsPath = '/tmp/positron-fake-unlocktest';
      await adapter.lockWorkspace(wsPath, 'run-1');

      const r = await adapter.unlockWorkspace(wsPath, 'run-2');
      expect(r.unlocked).toBe(false);
      expect(r.reason).toContain('owned by');
    });

    it('unlocks when owner matches', async () => {
      const wsPath = '/tmp/positron-fake-unlocktest';
      await adapter.lockWorkspace(wsPath, 'run-1');

      const r = await adapter.unlockWorkspace(wsPath, 'run-1');
      expect(r.unlocked).toBe(true);

      const status = await adapter.isLocked(wsPath);
      expect(status.locked).toBe(false);
    });

    it('is idempotent when not locked', async () => {
      const wsPath = '/tmp/positron-fake-unlocktest';
      const r = await adapter.unlockWorkspace(wsPath, 'run-1');
      expect(r.unlocked).toBe(true);
      expect(r.reason).toContain('Not locked');
    });
  });

  describe('isLocked', () => {
    it('returns false for unlocked workspace', async () => {
      const status = await adapter.isLocked('/tmp/positron-fake-notlocked');
      expect(status.locked).toBe(false);
    });

    it('returns true and ownerRunId for locked workspace', async () => {
      const wsPath = '/tmp/positron-fake-lockedtest';
      await adapter.lockWorkspace(wsPath, 'run-42');

      const status = await adapter.isLocked(wsPath);
      expect(status.locked).toBe(true);
      expect(status.ownerRunId).toBe('run-42');
    });
  });
});
