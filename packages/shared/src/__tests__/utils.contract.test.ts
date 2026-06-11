/**
 * Shared Utils Contract Tests (QA-023)
 *
 * Verifies the PUBLIC API contract of @positron/shared's utility functions.
 * Tests exported behavior guarantees, NOT internal implementation details.
 *
 * Contract guarantees:
 * - redactValue() never leaks secret patterns in plaintext
 * - generateBranchName() produces safe, deterministic branch names
 * - createRunId() generates unique, non-empty IDs
 * - formatDuration() produces stable human-readable strings
 * - truncate() limits output length
 * - sleep() resolves after the specified time
 */

import { describe, it, expect } from 'vitest';
import {
	redactValue,
	generateBranchName,
	createRunId,
	formatDuration,
	truncate,
	sleep,
} from '@positron/shared';

// ---------------------------------------------------------------------------
// Contract: redactValue()
// ---------------------------------------------------------------------------
describe('redactValue() contract', () => {
	it('returns "null" for null input', () => {
		expect(redactValue(null)).toBe('null');
	});

	it('returns "undefined" for undefined input', () => {
		expect(redactValue(undefined)).toBe('undefined');
	});

	it('returns string representation for numbers', () => {
		expect(redactValue(42)).toBe('42');
		expect(redactValue(0)).toBe('0');
		expect(redactValue(-1)).toBe('-1');
	});

	it('returns string representation for booleans', () => {
		expect(redactValue(true)).toBe('true');
		expect(redactValue(false)).toBe('false');
	});

	it('returns string representation for plain strings', () => {
		expect(redactValue('hello')).toBe('hello');
		expect(redactValue('')).toBe('');
	});

	it('redacts GitHub PAT tokens in strings', () => {
		const result = redactValue('token=ghp_abcdefghijklmnopqrstuvwxyz1234567890');
		expect(result).not.toContain('ghp_abcdefghijklmnopqrstuvwxyz1234567890');
		expect(result).toContain('***REDACTED***');
	});

	it('redacts GitHub OAuth tokens in strings', () => {
		const result = redactValue('gho_abcdefghijklmnopqrstuvwxyz1234567890');
		expect(result).toContain('***REDACTED***');
		expect(result).not.toContain('gho_abcdefghijklmnopqrstuvwxyz1234567890');
	});

	it('redacts OpenAI API keys in strings', () => {
		// Must be >= 48 chars after "sk-" prefix to match the regex pattern
		const fakeKey = `sk-${'a'.repeat(48)}`;
		const result = redactValue(`Authorization: Bearer ${fakeKey}`);
		expect(result).toContain('***REDACTED***');
		expect(result).not.toContain(fakeKey);
	});

	it('redacts Anthropic API keys in strings', () => {
		const result = redactValue('x-api-key: anthropic_abcdefghijklmnopqrstuvwxyz1234567890ABCDEFGH');
		expect(result).toContain('***REDACTED***');
		expect(result).not.toContain('anthropic_abcdefghijklmnopqrstuvwxyz1234567890ABCDEFGH');
	});

	it('redacts secrets inside object values', () => {
		const fakeOpenAI = `sk-${'b'.repeat(48)}`;
		const input = {
			user: 'test',
			token: 'ghp_abcdefghijklmnopqrstuvwxyz1234567890',
			nested: { key: fakeOpenAI },
		};
		const result = redactValue(input);
		expect(result).toContain('***REDACTED***');
		expect(result).not.toContain('ghp_abcdefghijklmnopqrstuvwxyz1234567890');
		expect(result).not.toContain(fakeOpenAI);
	});

	it('redacts secrets inside array values', () => {
		const input = ['ghp_abcdefghijklmnopqrstuvwxyz1234567890', 'safe-value'];
		const result = redactValue(input);
		expect(result).toContain('***REDACTED***');
		expect(result).not.toContain('ghp_abcdefghijklmnopqrstuvwxyz1234567890');
		expect(result).toContain('safe-value');
	});

	it('is safe — no throw on any primitive type', () => {
		for (const val of [null, undefined, 0, 1, -1, 0.5, '', 'text', true, false]) {
			expect(() => redactValue(val)).not.toThrow();
		}
	});

	it('handles empty objects and arrays safely', () => {
		expect(() => redactValue({})).not.toThrow();
		expect(() => redactValue([])).not.toThrow();
	});

	it('does NOT mutate the input (returns new string)', () => {
		const input = { token: 'ghp_abcdefghijklmnopqrstuvwxyz1234567890' };
		const before = JSON.stringify(input);
		redactValue(input);
		expect(JSON.stringify(input)).toBe(before);
	});

	it('always returns a string', () => {
		const values = [null, undefined, 0, true, false, 'text', {}, [], { a: 1 }];
		for (const val of values) {
			const result = redactValue(val);
			expect(typeof result).toBe('string');
		}
	});
});

// ---------------------------------------------------------------------------
// Contract: generateBranchName()
// ---------------------------------------------------------------------------
describe('generateBranchName() contract', () => {
	it('produces expected Positron branch format', () => {
		const name = generateBranchName(42, 'Add cool feature');
		expect(name).toMatch(/^positron\/issue-42-/);
	});

	it('converts title to lowercase slug', () => {
		const name = generateBranchName(1, 'Fix THE Bug NOW');
		expect(name).toBe('positron/issue-1-fix-the-bug-now');
	});

	it('removes special characters from title', () => {
		const name = generateBranchName(1, 'Fix: bug! @#$%^&*()');
		expect(name).toBe('positron/issue-1-fix-bug');
	});

	it('removes shell metacharacters from slug', () => {
		const name = generateBranchName(99, 'cat /etc/passwd; rm -rf /');
		// The format prefix contains slash: positron/issue-N-slug
		// Verify the slug part (after issue-N-) contains no shell chars
		const slug = name.replace(/^positron\/issue-\d+-/, '');
		expect(slug).not.toContain('/');
		expect(slug).not.toContain(';');
		expect(slug).not.toContain(' ');
		expect(name).not.toContain(';');
		expect(name).not.toContain(' ');
		expect(name).toBe('positron/issue-99-cat-etc-passwd-rm-rf');
	});

	it('removes path traversal segments', () => {
		const name = generateBranchName(1, '../../../etc/passwd');
		expect(name).not.toContain('../');
		expect(name).not.toContain('..');
	});

	it('handles German umlauts by stripping them (ASCII-safe)', () => {
		const name = generateBranchName(1, 'Überarbeitung der Benutzerführung');
		// Umlauts are non-ASCII, so they get stripped by the regex
		expect(name).not.toContain('Ü');
		expect(name).not.toContain('ä');
		expect(name).not.toContain('ö');
		expect(name).not.toContain('ü');
		expect(name).toBe('positron/issue-1-berarbeitung-der-benutzerf-hrung');
	});

	it('truncates long titles', () => {
		const longTitle = 'A'.repeat(100);
		const name = generateBranchName(1, longTitle);
		// The slug is truncated to 50 chars
		const slug = name.replace('positron/issue-1-', '');
		expect(slug.length).toBeLessThanOrEqual(50);
	});

	it('produces deterministic output for same input', () => {
		const title = 'Test issue for deterministic output';
		const name1 = generateBranchName(42, title);
		const name2 = generateBranchName(42, title);
		expect(name1).toBe(name2);
	});

	it('handles empty title', () => {
		const name = generateBranchName(1, '');
		// Should at minimum contain the issue number
		expect(name).toContain('issue-1');
		expect(name).not.toContain('--');
	});

	it('handles title with only special characters', () => {
		const name = generateBranchName(1, '!@#$%^&*()');
		// All special chars stripped; branch format should still be valid
		expect(name).toContain('positron/issue-1');
		// The slug part (after "positron/issue-N-") should not start or end with hyphens
		const slug = name.replace(/^positron\/issue-\d+-/, '');
		if (slug.length > 0) {
			expect(slug).not.toMatch(/^-/);
			expect(slug).not.toMatch(/-$/);
		}
	});

	it('produces valid Git branch name (no spaces, no shell chars)', () => {
		const dangerous = [
			'add feature',
			'fix: stuff; rm -rf /',
			'test `id`',
			'eval $(evil)',
			'branch|pipe',
		];
		for (const title of dangerous) {
			const name = generateBranchName(1, title);
			expect(name).not.toContain(' ');
			expect(name).not.toContain(';');
			expect(name).not.toContain('`');
			expect(name).not.toContain('$');
			expect(name).not.toContain('|');
			expect(name).not.toContain('(');
			expect(name).not.toContain(')');
		}
	});

	it('handles varying issue numbers', () => {
		for (const num of [1, 42, 999, 10000]) {
			const name = generateBranchName(num, 'test');
			expect(name).toContain(`issue-${num}`);
		}
	});
});

// ---------------------------------------------------------------------------
// Contract: createRunId()
// ---------------------------------------------------------------------------
describe('createRunId() contract', () => {
	it('returns a non-empty string', () => {
		const id = createRunId();
		expect(typeof id).toBe('string');
		expect(id.length).toBeGreaterThan(0);
	});

	it('generates unique IDs on consecutive calls', () => {
		const ids = new Set<string>();
		for (let i = 0; i < 100; i++) {
			ids.add(createRunId());
		}
		expect(ids.size).toBe(100);
	});

	it('is UUID-format by default', () => {
		const id = createRunId();
		// UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
		expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
	});

	it('accepts custom ID generator', () => {
		let counter = 0;
		const customGen = () => `custom-${++counter}`;
		const id1 = createRunId(customGen);
		const id2 = createRunId(customGen);

		expect(id1).toBe('custom-1');
		expect(id2).toBe('custom-2');
	});
});

// ---------------------------------------------------------------------------
// Contract: formatDuration()
// ---------------------------------------------------------------------------
describe('formatDuration() contract', () => {
	it('formats seconds-only duration', () => {
		expect(formatDuration(1000)).toBe('1s');
		expect(formatDuration(59000)).toBe('59s');
	});

	it('formats minutes and seconds', () => {
		expect(formatDuration(60000)).toBe('1m 0s');
		expect(formatDuration(61000)).toBe('1m 1s');
	});

	it('formats hours, minutes, and seconds', () => {
		expect(formatDuration(3661000)).toBe('1h 1m 1s');
		// Zero-minute components are omitted in the implementation
		expect(formatDuration(3600000)).toBe('1h 0s');
	});

	it('handles zero duration', () => {
		expect(formatDuration(0)).toBe('0s');
	});

	it('handles large durations', () => {
		const result = formatDuration(90061000); // 25h 1m 1s
		expect(result).toContain('h');
		expect(result).toContain('m');
		expect(result).toContain('s');
	});

	it('always returns a string ending with "s" (seconds component)', () => {
		for (const ms of [0, 1000, 60000, 3600000, 3661000]) {
			const result = formatDuration(ms);
			expect(typeof result).toBe('string');
			expect(result).toMatch(/s$/);
		}
	});
});

// ---------------------------------------------------------------------------
// Contract: truncate()
// ---------------------------------------------------------------------------
describe('truncate() contract', () => {
	it('returns the original string if within max length', () => {
		expect(truncate('hello', 10)).toBe('hello');
		expect(truncate('hello', 5)).toBe('hello');
	});

	it('truncates and appends "..." when exceeding max length', () => {
		const result = truncate('hello world', 8);
		expect(result).toBe('hello...');
		expect(result.length).toBe(8);
	});

	it('handles empty string', () => {
		expect(truncate('', 5)).toBe('');
	});

	it('returns "..." for string longer than max with max <= 3', () => {
		const result = truncate('hello', 3);
		expect(result.length).toBe(3);
		expect(result).toContain('.');
	});

	it('returns original when exactly at max length', () => {
		expect(truncate('hello', 5)).toBe('hello');
	});
});

// ---------------------------------------------------------------------------
// Contract: sleep()
// ---------------------------------------------------------------------------
describe('sleep() contract', () => {
	it('resolves after the specified time', async () => {
		const start = Date.now();
		await sleep(50);
		const elapsed = Date.now() - start;
		// Allow some tolerance for timer precision
		expect(elapsed).toBeGreaterThanOrEqual(40);
	});

	it('returns a Promise', () => {
		const result = sleep(10);
		expect(result).toBeInstanceOf(Promise);
	});

	it('resolves to undefined', async () => {
		const result = await sleep(1);
		expect(result).toBeUndefined();
	});

	it('handles zero milliseconds', async () => {
		const start = Date.now();
		await sleep(0);
		const elapsed = Date.now() - start;
		expect(elapsed).toBeLessThan(100);
	});
});
