// Positron — Shared Utils: Comprehensive Tests (QA-021)
// Covers: redactValue(), generateBranchName()

import { describe, expect, test } from 'vitest';
import { redactValue, generateBranchName, redactSecrets } from '../utils.js';

// ---------------------------------------------------------------------------
// redactValue()
// ---------------------------------------------------------------------------
describe('redactValue', () => {
	test('null returns "null"', () => {
		expect(redactValue(null)).toBe('null');
	});

	test('undefined returns "undefined"', () => {
		expect(redactValue(undefined)).toBe('undefined');
	});

	test('empty string returns empty string', () => {
		expect(redactValue('')).toBe('');
	});

	test('normal string returns unchanged', () => {
		expect(redactValue('hello world')).toBe('hello world');
	});

	test('secret-like string is redacted', () => {
		// Using FAKE token — clearly marked as fake for testing
		const fakeToken = 'ghp_abcdefghijklmnopqrstuvwxyz0123456789abcd';
		const result = redactValue(fakeToken);
		expect(result).toContain('ghp_***REDACTED***');
		expect(result).not.toContain('ghp_abcdef');
	});

	test('string containing OpenAI key is redacted', () => {
		// FAKE key — 48+ chars after sk- prefix
		const fakeKey = 'sk-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
		const result = redactValue(`token=${fakeKey}`);
		expect(result).toContain('sk-***REDACTED***');
		expect(result).not.toContain('sk-aaaa');
	});

	test('number is converted to string', () => {
		expect(redactValue(42)).toBe('42');
		expect(redactValue(0)).toBe('0');
		expect(redactValue(-1)).toBe('-1');
	});

	test('boolean is converted to string', () => {
		expect(redactValue(true)).toBe('true');
		expect(redactValue(false)).toBe('false');
	});

	test('object is JSON stringified and redacted', () => {
		// FAKE token inside object
		const obj = {
			name: 'test',
			token: 'ghp_abcdefghijklmnopqrstuvwxyz0123456789abcd',
			nested: { key: 'value' },
		};
		const result = redactValue(obj);
		expect(result).toContain('"name":"test"');
		expect(result).toContain('ghp_***REDACTED***');
		expect(result).toContain('"key":"value"');
		expect(result).not.toContain('ghp_abcdef');
	});

	test('array is JSON stringified and redacted', () => {
		const arr = [1, 'hello', 'ghp_abcdefghijklmnopqrstuvwxyz0123456789abcd'];
		const result = redactValue(arr);
		expect(result).toContain('[1,');
		expect(result).toContain('"hello"');
		expect(result).toContain('ghp_***REDACTED***');
	});

	test('deeply nested object with secrets is fully redacted', () => {
		const deep = {
			level1: {
				level2: {
					secret: 'ghp_abcdefghijklmnopqrstuvwxyz0123456789abcd',
				},
			},
		};
		const result = redactValue(deep);
		expect(result).toContain('ghp_***REDACTED***');
		expect(result).not.toContain('ghp_abcdef');
	});

	test('already redacted value stays redacted', () => {
		const alreadyRedacted = 'token=ghp_***REDACTED***';
		const result = redactValue(alreadyRedacted);
		expect(result).toBe('token=ghp_***REDACTED***');
	});

	test('non-serializable value returns "[Unserializable]"', () => {
		// Create circular reference
		const obj: Record<string, unknown> = { name: 'circular' };
		(obj as Record<string, unknown>).self = obj;

		const result = redactValue(obj);
		// JSON.stringify on circular reference throws TypeError
		expect(result).toBe('[Unserializable]');
	});

	test('value with multiple secret patterns is fully redacted', () => {
		// Multiple FAKE patterns
		const input =
			'gho_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa and ghp_abcdefghijklmnopqrstuvwxyz0123456789abcd';
		const result = redactValue(input);
		expect(result).toContain('gho_***REDACTED***');
		expect(result).toContain('ghp_***REDACTED***');
	});
});

// ---------------------------------------------------------------------------
// generateBranchName()
// ---------------------------------------------------------------------------
describe('generateBranchName', () => {
	test('simple title generates valid branch name', () => {
		const result = generateBranchName(42, 'My Feature');
		expect(result).toBe('positron/issue-42-my-feature');
	});

	test('title with spaces is hyphenated', () => {
		const result = generateBranchName(1, 'Add new feature');
		expect(result).toBe('positron/issue-1-add-new-feature');
	});

	test('title with special characters removes them', () => {
		const result = generateBranchName(10, 'Fix: login (bug #123)');
		expect(result).toBe('positron/issue-10-fix-login-bug-123');
	});

	test('title with umlauts is downcased (umlauts removed by regex)', () => {
		// Non-ASCII chars like äöü get removed by [^a-z0-9] regex
		const result = generateBranchName(5, 'Überarbeitung der Anforderung');
		// 'Ü' → removed, 'ä'→removed, etc.
		expect(result).toMatch(/^positron\/issue-5-/);
		// Should not contain raw umlauts
		expect(result).not.toContain('Ü');
		expect(result).not.toContain('Ä');
		expect(result).not.toContain('Ö');
		expect(result).not.toContain('ü');
		expect(result).not.toContain('ä');
		expect(result).not.toContain('ö');
		expect(result).not.toContain('ß');
		expect(result).not.toContain('é');
		expect(result).not.toContain('è');
	});

	test('title with shell metacharacters is sanitized', () => {
		// Semicolons, backticks, pipes should be removed
		const result = generateBranchName(99, 'test; rm -rf / `echo pwned` | cat /etc/passwd');
		expect(result).not.toContain(';');
		expect(result).not.toContain('`');
		expect(result).not.toContain('|');
		expect(result).not.toContain('$');
		// Should produce safe output
		expect(result).toMatch(/^positron\/issue-99-/);
	});

	test('title with path traversal segments is sanitized', () => {
		const result = generateBranchName(1, '../../../etc/passwd');
		// The branch prefix "positron/" contains a slash — that's expected.
		// The slug portion should not contain dots or additional slashes from the title.
		const slug = result.slice('positron/'.length);
		expect(slug).not.toContain('/');
		expect(slug).not.toContain('..');
		expect(result).toMatch(/^positron\/issue-1-/);
	});

	test('very long title is truncated (slug max 50 chars)', () => {
		const longTitle =
			'This is a very long title that exceeds the maximum slug length for a branch name in the positron format which should be truncated properly';
		const result = generateBranchName(42, longTitle);

		// Extract the slug portion after "positron/issue-42-"
		const slug = result.slice('positron/issue-42-'.length);
		expect(slug.length).toBeLessThanOrEqual(50);
		expect(result).toMatch(/^positron\/issue-42-/);
	});

	test('empty title produces minimal branch name', () => {
		const result = generateBranchName(7, '');
		// Empty title → no slug (but still a valid branch name)
		expect(result).toBe('positron/issue-7-');
	});

	test('title with only special characters produces minimal slug', () => {
		const result = generateBranchName(3, '!!!###@@@');
		// All special chars removed → no slug
		expect(result).toBe('positron/issue-3-');
	});

	test('deterministic output: same input → same output', () => {
		const result1 = generateBranchName(23, 'Test Feature');
		const result2 = generateBranchName(23, 'Test Feature');
		expect(result1).toBe(result2);
	});

	test('leading and trailing hyphens are stripped', () => {
		const result = generateBranchName(1, '--- Leading and trailing ---');
		expect(result).not.toMatch(/^-/);
		expect(result).not.toMatch(/-$/);
		expect(result).toBe('positron/issue-1-leading-and-trailing');
	});

	test('consecutive special characters collapse to single hyphen', () => {
		const result = generateBranchName(8, 'foo!!!bar???baz');
		expect(result).not.toContain('--');
		expect(result).toBe('positron/issue-8-foo-bar-baz');
	});

	test('title with numbers preserved', () => {
		const result = generateBranchName(1, 'Version 2.0 Update');
		expect(result).toBe('positron/issue-1-version-2-0-update');
	});
});
