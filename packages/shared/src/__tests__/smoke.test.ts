// Positron — Shared Package: Smoke-Tests

import { describe, expect, test } from 'vitest';
import { ALL_PHASES, isTerminalPhase, isValidPhase } from '../types.js';
import { createRunId, formatDuration, sleep, truncate } from '../utils.js';

describe('utils', () => {
	test('createRunId() generiert einen validen UUID', () => {
		const id = createRunId();
		expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
	});

	test('createRunId() mit eigenem Generator', () => {
		const id = createRunId(() => 'custom-id');
		expect(id).toBe('custom-id');
	});

	test('sleep(10) wartet mindestens 10ms', async () => {
		const start = Date.now();
		await sleep(10);
		const elapsed = Date.now() - start;
		expect(elapsed).toBeGreaterThanOrEqual(5);
	});

	test('formatDuration(3661000) gibt "1h 1m 1s" zurück', () => {
		expect(formatDuration(3661000)).toBe('1h 1m 1s');
	});

	test('formatDuration(0) gibt "0s" zurück', () => {
		expect(formatDuration(0)).toBe('0s');
	});

	test('formatDuration(60000) gibt "1m 0s" zurück', () => {
		expect(formatDuration(60000)).toBe('1m 0s');
	});

	test('truncate kürzt Strings korrekt', () => {
		expect(truncate('hello world', 5)).toBe('he...');
		expect(truncate('hello', 10)).toBe('hello');
	});
});

describe('types', () => {
	test('ALL_PHASES enthält QUEUED', () => {
		expect(ALL_PHASES).toContain('QUEUED');
	});

	test("isValidPhase('QUEUED') ist true", () => {
		expect(isValidPhase('QUEUED')).toBe(true);
	});

	test("isValidPhase('INVALID') ist false", () => {
		expect(isValidPhase('INVALID')).toBe(false);
	});

	test("isTerminalPhase('DONE') ist true", () => {
		expect(isTerminalPhase('DONE')).toBe(true);
	});

	test("isTerminalPhase('QUEUED') ist false", () => {
		expect(isTerminalPhase('QUEUED')).toBe(false);
	});
});
