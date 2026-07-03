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
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { FakeGitWorkspaceAdapter } from '../fake-adapter.js';
import { RealGitWorkspaceAdapter } from '../real-adapter.js';

// ── Fake Adapter Tests ──

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

		it('rejects whitespace-only path', async () => {
			const result = await adapter.destroyWorkspace('   ');
			expect(result.destroyed).toBe(false);
			expect(result.reason).toContain('empty');
		});

		it('rejects root path (/)', async () => {
			const result = await adapter.destroyWorkspace('/');
			expect(result.destroyed).toBe(false);
			expect(result.reason).toContain('root');
		});

		it('rejects root path (\\)', async () => {
			const result = await adapter.destroyWorkspace('\\');
			expect(result.destroyed).toBe(false);
			expect(result.reason).toContain('root');
		});

		it('is idempotent for already destroyed workspace', async () => {
			const ws = '/tmp/positron-fake-test12345678';
			const r1 = await adapter.destroyWorkspace(ws);
			expect(r1.destroyed).toBe(true);
			const r2 = await adapter.destroyWorkspace(ws);
			expect(r2.destroyed).toBe(true);
			expect(r2.reason).toContain('Already destroyed');
		});

		it('destroys workspace and cleans up internal maps', async () => {
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

		it('releases lock after workspace destruction', async () => {
			const ws = await adapter.prepareWorkspace({
				repository: { owner: 'test', repo: 'test', remoteUrl: 'https://github.com/test/test.git' },
				issueNumber: 42,
				issueTitle: 'Test cleanup lock',
				runId: 'test-run-cleanup-lock',
				baseBranch: 'main',
			});

			await adapter.lockWorkspace(ws.workspacePath, 'test-run-cleanup-lock');
			await adapter.destroyWorkspace(ws.workspacePath);
			const status = await adapter.isLocked(ws.workspacePath);
			expect(status.locked).toBe(false);
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

		it('rejects empty path', async () => {
			const r1 = await adapter.lockWorkspace('', 'run-1');
			expect(r1.locked).toBe(false);
			expect(r1.reason).toContain('required');
		});

		it('rejects empty ownerRunId', async () => {
			const r2 = await adapter.lockWorkspace('/tmp/test', '');
			expect(r2.locked).toBe(false);
			expect(r2.reason).toContain('required');
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
			expect(status.ownerRunId).toBeUndefined();
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

// ── Real Adapter Tests ──

describe('#244 Workspace Cleanup — RealGitWorkspaceAdapter', () => {
	let adapter: RealGitWorkspaceAdapter;
	let tmpDir: string;

	beforeEach(() => {
		adapter = new RealGitWorkspaceAdapter();
		tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'positron-test-'));
	});

	afterEach(() => {
		if (fs.existsSync(tmpDir)) {
			fs.rmSync(tmpDir, { recursive: true, force: true });
		}
	});

	describe('destroyWorkspace — path safety', () => {
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

		it('rejects path traversal (..)', async () => {
			const result = await adapter.destroyWorkspace(path.join(tmpDir, '..', 'outside'));
			expect(result.destroyed).toBe(false);
			// On Unix: "path traversal" in the normalized check
			// On Windows: "outside workspace root" because .. resolves outside boundary first
			const hasTraversalGuard = result.reason?.includes('path traversal') ?? false;
			const hasBoundaryGuard = result.reason?.includes('outside workspace') ?? false;
			expect(hasTraversalGuard || hasBoundaryGuard).toBe(true);
		});

		it('rejects path outside workspace root', async () => {
			// Create a path that is clearly outside the default workspace root
			const outsidePath = path.join(os.tmpdir(), 'definitely-outside-positron');
			fs.mkdirSync(outsidePath, { recursive: true });
			try {
				const result = await adapter.destroyWorkspace(outsidePath);
				expect(result.destroyed).toBe(false);
				expect(result.reason).toContain('outside workspace root');
			} finally {
				fs.rmSync(outsidePath, { recursive: true, force: true });
			}
		});

		it('actually deletes an existing directory', async () => {
			const testDir = path.join(tmpDir, 'test-workspace');
			fs.mkdirSync(testDir, { recursive: true });
			fs.writeFileSync(path.join(testDir, 'test.txt'), 'hello');

			// Need to override workspaceRoot to allow this test
			const customAdapter = new RealGitWorkspaceAdapter();
			// Use process.env to set workspace root to tmpDir for this test
			const originalRoot = process.env['POSITRON_WORKSPACE_ROOT'];
			process.env['POSITRON_WORKSPACE_ROOT'] = tmpDir;
			const testAdapter = new RealGitWorkspaceAdapter();

			const result = await testAdapter.destroyWorkspace(testDir);
			expect(result.destroyed).toBe(true);
			expect(fs.existsSync(testDir)).toBe(false);

			process.env['POSITRON_WORKSPACE_ROOT'] = originalRoot;
		});

		it('is idempotent — already destroyed workspace returns success', async () => {
			const testDir = path.join(tmpDir, 'already-gone');
			// Don't create the dir — should still succeed (idempotent)
			const originalRoot = process.env['POSITRON_WORKSPACE_ROOT'];
			process.env['POSITRON_WORKSPACE_ROOT'] = tmpDir;
			const testAdapter = new RealGitWorkspaceAdapter();

			const result = await testAdapter.destroyWorkspace(testDir);
			expect(result.destroyed).toBe(true);
			expect(result.reason).toContain('already removed');

			process.env['POSITRON_WORKSPACE_ROOT'] = originalRoot;
		});
	});

	describe('lockWorkspace', () => {
		it('prevents concurrent lock by different owner', async () => {
			const r1 = await adapter.lockWorkspace(tmpDir, 'run-1');
			expect(r1.locked).toBe(true);

			const r2 = await adapter.lockWorkspace(tmpDir, 'run-2');
			expect(r2.locked).toBe(false);
			expect(r2.reason).toContain('already locked');
		});

		it('allows same owner to re-lock (idempotent)', async () => {
			await adapter.lockWorkspace(tmpDir, 'run-1');
			const r = await adapter.lockWorkspace(tmpDir, 'run-1');
			expect(r.locked).toBe(true);
			expect(r.reason).toContain('idempotent');
		});
	});

	describe('unlockWorkspace', () => {
		it('validates ownership before unlocking', async () => {
			await adapter.lockWorkspace(tmpDir, 'run-1');
			const r = await adapter.unlockWorkspace(tmpDir, 'run-2');
			expect(r.unlocked).toBe(false);
			expect(r.reason).toContain('owned by');
		});

		it('unlocks successfully when owner matches', async () => {
			await adapter.lockWorkspace(tmpDir, 'run-1');
			const r = await adapter.unlockWorkspace(tmpDir, 'run-1');
			expect(r.unlocked).toBe(true);
		});
	});

	describe('isLocked', () => {
		it('returns false for unlocked workspace', async () => {
			const status = await adapter.isLocked(tmpDir);
			expect(status.locked).toBe(false);
		});

		it('returns true and ownerRunId when locked', async () => {
			await adapter.lockWorkspace(tmpDir, 'run-42');
			const status = await adapter.isLocked(tmpDir);
			expect(status.locked).toBe(true);
			expect(status.ownerRunId).toBe('run-42');
		});
	});
});
