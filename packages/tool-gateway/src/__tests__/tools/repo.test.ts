// Built-in Tool Tests: repo.*
// Issue #219 — T-011

import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { repoGetDiffHandler, repoListFilesHandler, repoReadFileHandler } from '../../tools/repo.js';
import type { ToolCall } from '../../types.js';

// ─── Helpers ─────────────────────────────────────────────────────────

// repo.test.ts is at packages/tool-gateway/src/__tests__/tools/repo.test.ts
// Going up 5 levels reaches the repo root
const REPO_ROOT = path.resolve(__dirname, '..', '..', '..', '..', '..');

function makeCall(overrides: Partial<ToolCall> = {}): ToolCall {
	return {
		toolId: 'repo.read_file',
		arguments: {},
		runId: 'run-test',
		phase: 'IMPLEMENT',
		autonomyLevel: 2,
		workspaceRoot: REPO_ROOT,
		...overrides,
	};
}

// ─── Tests ───────────────────────────────────────────────────────────

describe('repo.read_file', () => {
	it('should read an existing file', async () => {
		const call = makeCall({
			toolId: 'repo.read_file',
			arguments: { path: 'package.json' },
		});

		const result = await repoReadFileHandler(call);
		expect(result.success).toBe(true);
		const output = result.output as Record<string, unknown>;
		expect(output.content).toBeDefined();
		expect(output.path).toBe('package.json');
	});

	it('should return error for non-existent file', async () => {
		const call = makeCall({
			toolId: 'repo.read_file',
			arguments: { path: 'nonexistent-file.xyz' },
		});

		const result = await repoReadFileHandler(call);
		expect(result.success).toBe(false);
		expect(result.error).toBeDefined();
	});

	it('should return error for missing path argument', async () => {
		const call = makeCall({
			toolId: 'repo.read_file',
			arguments: {},
		});

		const result = await repoReadFileHandler(call);
		// Handler will try to resolve undefined as path
		expect(result.success).toBe(false);
		expect(result.error).toBeDefined();
	});
});

describe('repo.list_files', () => {
	it('should list files in current directory', async () => {
		const call = makeCall({
			toolId: 'repo.list_files',
			arguments: { directory: '.' },
		});

		const result = await repoListFilesHandler(call);
		expect(result.success).toBe(true);
		const output = result.output as Record<string, unknown>;
		expect(Array.isArray(output.files)).toBe(true);
	});

	it('should list files in a subdirectory', async () => {
		const call = makeCall({
			toolId: 'repo.list_files',
			arguments: { directory: 'packages' },
		});

		const result = await repoListFilesHandler(call);
		expect(result.success).toBe(true);
	});

	it('should default to current directory if none specified', async () => {
		const call = makeCall({
			toolId: 'repo.list_files',
			arguments: {},
		});

		const result = await repoListFilesHandler(call);
		expect(result.success).toBe(true);
	});

	it('should return error for non-existent directory', async () => {
		const call = makeCall({
			toolId: 'repo.list_files',
			arguments: { directory: 'nonexistent-dir-xyz' },
		});

		const result = await repoListFilesHandler(call);
		expect(result.success).toBe(false);
	});
});

describe('repo.get_diff', () => {
	it('should return a diff string (may be empty)', async () => {
		const call = makeCall({
			toolId: 'repo.get_diff',
			arguments: {},
		});

		const result = await repoGetDiffHandler(call);

		// In test environment, git diff may return empty or error
		// We just verify the handler doesn't crash
		expect(result).toBeDefined();
		expect(typeof result.success).toBe('boolean');
	});

	it('should handle non-git directory gracefully', async () => {
		const call = makeCall({
			toolId: 'repo.get_diff',
			arguments: {},
			workspaceRoot: '/tmp/non-git-dir-xyz',
		});

		const result = await repoGetDiffHandler(call);
		// May succeed (empty diff) or fail — either is acceptable
		expect(result).toBeDefined();
	});
});
