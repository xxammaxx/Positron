import { describe, expect, test } from 'vitest';
import { cleanForSpeech, redactForSpeech, truncateForSpeech } from '../redact-for-speech.js';

describe('redactForSpeech', () => {
	test('redacts GitHub PAT (ghp_)', () => {
		const input = 'Token is ghp_abcdefghijklmnopqrstuvwxyz1234567890';
		const result = redactForSpeech(input);
		expect(result).not.toContain('ghp_');
		expect(result).toContain('[TOKEN]');
	});

	test('redacts GitHub PAT (github_pat_)', () => {
		const input = 'Using github_pat_11ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890';
		const result = redactForSpeech(input);
		expect(result).not.toContain('github_pat_');
		expect(result).toContain('[TOKEN]');
	});

	test('redacts OpenAI-style API key (sk-)', () => {
		const input = 'API key: sk-abcdefghijklmnopqrstuvwxyz123456';
		const result = redactForSpeech(input);
		expect(result).not.toContain('sk-');
		expect(result).toContain('[API_KEY]');
	});

	test('redacts Anthropic-style API key (ant-)', () => {
		const input = 'Key: ant-api1234567890abcdefghijklmnop';
		const result = redactForSpeech(input);
		expect(result).not.toContain('ant-api');
		expect(result).toContain('[API_KEY]');
	});

	test('redacts SSH private key paths', () => {
		const input = 'Key at /home/user/.ssh/id_rsa was used';
		const result = redactForSpeech(input);
		expect(result).not.toContain('/home/user/.ssh/id_rsa');
		expect(result).toContain('[PATH]');
	});

	test('redacts /root/.ssh paths', () => {
		const input = 'Using /root/.ssh/authorized_keys';
		const result = redactForSpeech(input);
		expect(result).not.toContain('/root/.ssh/authorized_keys');
		expect(result).toContain('[PATH]');
	});

	test('redacts macOS SSH paths', () => {
		const input = 'Found /Users/dev/.ssh/config';
		const result = redactForSpeech(input);
		expect(result).not.toContain('/Users/dev/.ssh/config');
		expect(result).toContain('[PATH]');
	});

	test('redacts email addresses', () => {
		const input = 'Contact user@example.com for help';
		const result = redactForSpeech(input);
		expect(result).not.toContain('user@example.com');
		expect(result).toContain('[EMAIL]');
	});

	test('redacts password in key=value format', () => {
		const input = 'password=supersecret123 should not be spoken';
		const result = redactForSpeech(input);
		expect(result).not.toContain('supersecret123');
		expect(result).toContain('[SECRET]');
	});

	test('redacts token in key:value format', () => {
		const input = 'token: abcdefghijk-secret-token';
		const result = redactForSpeech(input);
		expect(result).not.toContain('abcdefghijk-secret-token');
		expect(result).toContain('[SECRET]');
	});

	test('redacts JWT tokens', () => {
		const input =
			'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U';
		const result = redactForSpeech(input);
		expect(result).toContain('[TOKEN]');
	});

	test('redacts ENV-style secrets', () => {
		const input = 'GITHUB_TOKEN=ghp_secretToken12345678901234567890';
		const result = redactForSpeech(input);
		expect(result).toContain('[TOKEN]');
	});

	test('preserves normal text unchanged', () => {
		const input = 'Run completed successfully';
		const result = redactForSpeech(input);
		expect(result).toBe(input);
	});

	test('preserves safe phase names unchanged', () => {
		const input = 'Phase IMPLEMENT failed';
		const result = redactForSpeech(input);
		expect(result).toBe(input);
	});

	test('redacts AWS access key (AKIA)', () => {
		const input = 'Key: AKIA1234567890ABCDEF';
		const result = redactForSpeech(input);
		expect(result).not.toContain('AKIA');
		expect(result).toContain('[TOKEN]');
	});

	test('redacts AWS access key (ASIA)', () => {
		const input = 'Token ASIA1234567890ABCDEF for session';
		const result = redactForSpeech(input);
		expect(result).not.toContain('ASIA');
		expect(result).toContain('[TOKEN]');
	});

	test('redacts Bearer token', () => {
		const input =
			'Authorization: Bearer eyJhbGciOiJSUzI1NiJ9.eyJpc3MiOiJqd3QifQ.signature1234567890';
		const result = redactForSpeech(input);
		expect(result).not.toContain('eyJhbGci');
		expect(result).toContain('Bearer [TOKEN]');
	});

	test('redacts Slack bot token (xoxb-)', () => {
		const input = 'Token: xoxb-123456789012-123456789012-abcdefghijklmnopqrstuvwx';
		const result = redactForSpeech(input);
		expect(result).not.toContain('xoxb-');
		expect(result).toContain('[TOKEN]');
	});

	test('redacts Slack user token (xoxp-)', () => {
		const input = 'Using xoxp-123456789012-123456789012-abcdefghijklmnopqrstuvwx';
		const result = redactForSpeech(input);
		expect(result).not.toContain('xoxp-');
		expect(result).toContain('[TOKEN]');
	});

	test('redacts npm token', () => {
		const input = 'npm_token: npm_abcdefghijklmnopqrstuvwxyz1234567890';
		const result = redactForSpeech(input);
		expect(result).not.toContain('npm_abcdef');
		expect(result).toContain('[TOKEN]');
	});

	test('redacts PEM certificate blocks', () => {
		const input =
			'Cert: -----BEGIN CERTIFICATE-----\nABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/\n-----END CERTIFICATE-----';
		const result = redactForSpeech(input);
		expect(result).not.toContain('BEGIN CERTIFICATE');
		expect(result).toContain('[CERTIFICATE]');
	});

	test('handles empty string', () => {
		expect(redactForSpeech('')).toBe('');
	});

	test('does not produce "undefined" or "null" in output', () => {
		const result = redactForSpeech('some text with ghp_token123456789012345678901234567890');
		expect(result).not.toContain('undefined');
		expect(result).not.toContain('null');
	});
});

describe('truncateForSpeech', () => {
	test('returns text unchanged when under maxLen', () => {
		expect(truncateForSpeech('Hello')).toBe('Hello');
	});

	test('truncates long text to 200 chars with ellipsis', () => {
		const long = 'A'.repeat(300);
		const result = truncateForSpeech(long);
		expect(result.length).toBe(200);
		expect(result.endsWith('…')).toBe(true);
	});

	test('does not truncate text at exactly maxLen', () => {
		const exact = 'A'.repeat(200);
		const result = truncateForSpeech(exact);
		expect(result).toBe(exact);
		expect(result.length).toBe(200);
	});

	test('respects custom maxLen', () => {
		const long = 'A'.repeat(100);
		const result = truncateForSpeech(long, 30);
		expect(result.length).toBe(30);
		expect(result.endsWith('…')).toBe(true);
	});
});

describe('cleanForSpeech', () => {
	test('pipeline: redacts then truncates', () => {
		const input = 'Token ghp_abc' + 'x'.repeat(300);
		const result = cleanForSpeech(input, 50);
		expect(result).toContain('[TOKEN]');
		expect(result.length).toBeLessThanOrEqual(50);
	});

	test('cleanForSpeech does not produce undefined/null', () => {
		const result = cleanForSpeech('Normal text with ghp_123456789012345678901234567890123456');
		expect(result).not.toContain('undefined');
		expect(result).not.toContain('null');
	});
});
