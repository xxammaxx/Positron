// Positron — SpecKit Adapter: Smoke-Tests

import { describe, expect, test } from 'vitest';
import {
	FakeSpecKitAdapter,
	FAKE_HEALTH_AVAILABLE,
	FAKE_HEALTH_UNAVAILABLE,
} from '../fake-adapter.js';
import { scanWorkspace, isPathSafe, computeSha256 } from '../artifact-scanner.js';

describe('FakeSpecKitAdapter', () => {
	test('healthCheck mit Standard-Health', async () => {
		const adapter = new FakeSpecKitAdapter();
		const health = await adapter.healthCheck('/tmp');
		expect(health.available).toBe(true);
		expect(health.version).toBe('0.1.0-fake');
	});

	test('healthCheck mit UNAVAILABLE', async () => {
		const adapter = new FakeSpecKitAdapter(FAKE_HEALTH_UNAVAILABLE);
		const health = await adapter.healthCheck('/tmp');
		expect(health.available).toBe(false);
	});

	test('initialize ruft Kommando-Log', async () => {
		const adapter = new FakeSpecKitAdapter();
		await adapter.initialize({ runId: 'test', workspacePath: '/tmp', issueTitle: 'test' });
		const log = adapter.getCommandCallLog();
		expect(log).toContain('initialize');
	});

	test('runSpecify in artifact-only mode', async () => {
		const adapter = new FakeSpecKitAdapter();
		const result = await adapter.runSpecify({
			runId: 'test',
			workspacePath: '/tmp',
			issueTitle: 'test',
			mode: 'artifact-only',
		});
		expect(result.status).toBe('skipped');
	});

	test('runSpecify in safe-cli mode', async () => {
		const adapter = new FakeSpecKitAdapter();
		const result = await adapter.runSpecify({
			runId: 'test',
			workspacePath: '/tmp',
			issueTitle: 'test',
			mode: 'safe-cli',
		});
		expect(result.status).toBe('blocked');
		expect(result.blockedReason).toContain('Agent Slash Command');
	});

	test('clearCallLog leert das Log', () => {
		const adapter = new FakeSpecKitAdapter();
		adapter.clearCallLog();
		expect(adapter.getCommandCallLog()).toHaveLength(0);
	});
});

describe('artifact-scanner', () => {
	test('scanWorkspace bei nicht-existierendem Pfad', () => {
		const results = scanWorkspace('/nonexistent/path');
		expect(results).toHaveLength(0);
	});

	test('isPathSafe erkennt sichere Pfade', () => {
		expect(isPathSafe('/base', 'file.txt')).toBe(true);
		expect(isPathSafe('/base', '/base/file.txt')).toBe(true);
	});

	test('isPathSafe erkennt unsichere Pfade', () => {
		expect(isPathSafe('/base', '../etc/passwd')).toBe(false);
	});
});
