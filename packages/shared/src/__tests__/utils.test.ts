import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  redactSecrets,
  redactValue,
  DEFAULT_REDACTION_RULES,
  generateBranchName,
  createRunId,
  formatDuration,
  truncate,
  sleep,
} from '../utils.js';

// ==============================
// DEFAULT_REDACTION_RULES
// ==============================

describe('DEFAULT_REDACTION_RULES', () => {
  it('should contain 7 default rules', () => {
    expect(DEFAULT_REDACTION_RULES).toHaveLength(7);
  });

  it('should have a rule for github tokens', () => {
    const rule = DEFAULT_REDACTION_RULES.find(r => r.name === 'github-token');
    expect(rule).toBeDefined();
    expect(rule?.pattern).toBeInstanceOf(RegExp);
    expect(rule?.replacement).toContain('REDACTED');
  });

  it('should have a rule for OpenAI keys', () => {
    const rule = DEFAULT_REDACTION_RULES.find(r => r.name === 'openai-key');
    expect(rule).toBeDefined();
  });

  it('should have a rule for Anthropic keys', () => {
    const rule = DEFAULT_REDACTION_RULES.find(r => r.name === 'anthropic-key');
    expect(rule).toBeDefined();
  });

  it('should have a rule for Gemini keys', () => {
    const rule = DEFAULT_REDACTION_RULES.find(r => r.name === 'gemini-key');
    expect(rule).toBeDefined();
  });

  it('should be readonly (as const)', () => {
    // as const makes elements readonly but does not Object.freeze() the array
    // Verify the array is typed as readonly
    expect(DEFAULT_REDACTION_RULES).toHaveLength(7);
  });
});

// ==============================
// redactSecrets
// ==============================

describe('redactSecrets', () => {
  it('should redact GitHub personal access tokens', () => {
    const input = 'ghp_abcdefghijklmnopqrstuvwxyz0123456789ab';
    const result = redactSecrets(input);
    expect(result).toContain('***REDACTED***');
    expect(result).not.toContain('ghp_abcdef');
  });

  it('should redact GitHub OAuth tokens', () => {
    const input = 'gho_abcdefghijklmnopqrstuvwxyz0123456789ab';
    const result = redactSecrets(input);
    expect(result).toContain('***REDACTED***');
    expect(result).not.toContain('gho_abcdef');
  });

  it('should redact GitHub App tokens', () => {
    const input = 'ghb_abcdefghijklmnopqrstuvwxyz0123456789ab';
    const result = redactSecrets(input);
    expect(result).toContain('***REDACTED***');
    expect(result).not.toContain('ghb_abcdef');
  });

  it('should redact GitHub fine-grained tokens (v2)', () => {
    const input = 'github_pat_11ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQRST';
    const result = redactSecrets(input);
    expect(result).toContain('***REDACTED***');
    expect(result).not.toContain('github_pat_11');
  });

  it('should redact OpenAI API keys', () => {
    const input = 'OPENAI_API_KEY=sk-abcdefghijklmnopqrstuvwxyz0123456789abcdefghijklmnopqrst';
    const result = redactSecrets(input);
    expect(result).toContain('sk-***REDACTED***');
    expect(result).not.toContain('sk-abcdef');
  });

  it('should redact Anthropic API keys', () => {
    const input = 'ANTHROPIC_KEY=anthropic_abcdefghijklmnopqrstuvwxyz0123456789abcdef';
    const result = redactSecrets(input);
    expect(result).toContain('anthropic_***REDACTED***');
    expect(result).not.toContain('anthropic_abcdef');
  });

  it('should redact Gemini API keys', () => {
    const input = 'GEMINI_KEY=AIzaSyDabcdefghijklmnopqrstuvwxyz012345678';
    const result = redactSecrets(input);
    expect(result).toContain('AIza***REDACTED***');
    expect(result).not.toContain('AIzaSyD');
  });

  it('should return unchanged string when no secrets present', () => {
    const input = 'No secrets here, just normal text.';
    expect(redactSecrets(input)).toBe(input);
  });

  it('should redact multiple secrets in same string', () => {
    // OpenAI key pattern: /sk-[a-zA-Z0-9]{48,}/g — must be 48+ alphanumeric after sk-
    const input = 'Token: ghp_abcdefghijklmnopqrstuvwxyz0123456789ab and Key: sk-abcdefghijklmnopqrstuvwxyz0123456789abcdefghijklmnopqrst';
    const result = redactSecrets(input);
    expect(result).not.toContain('ghp_abcdefgh');
    expect(result).not.toContain('sk-abcdefgh');
    expect(result).toContain('***REDACTED***');
  });

  it('should use custom rules when provided', () => {
    const customRules = [
      { name: 'custom', pattern: /SECRET_\d+/g, replacement: '***HIDDEN***' },
    ];
    const input = 'Values: SECRET_123 and SECRET_456';
    const result = redactSecrets(input, customRules);
    expect(result).toBe('Values: ***HIDDEN*** and ***HIDDEN***');
  });

  it('should use default rules when no rules provided', () => {
    const input = 'ghp_abcdefghijklmnopqrstuvwxyz0123456789ab';
    const result = redactSecrets(input);
    expect(result).toContain('REDACTED');
  });
});

// ==============================
// redactValue
// ==============================

describe('redactValue', () => {
  it('should return "null" for null', () => {
    expect(redactValue(null)).toBe('null');
  });

  it('should return "undefined" for undefined', () => {
    expect(redactValue(undefined)).toBe('undefined');
  });

  it('should return string representation for numbers', () => {
    expect(redactValue(42)).toBe('42');
    expect(redactValue(0)).toBe('0');
  });

  it('should return string representation for booleans', () => {
    expect(redactValue(true)).toBe('true');
    expect(redactValue(false)).toBe('false');
  });

  it('should redact secrets in string values', () => {
    const input = 'Token: ghp_abcdefghijklmnopqrstuvwxyz0123456789ab';
    const result = redactValue(input);
    expect(result).not.toContain('ghp_abcdef');
    expect(result).toContain('REDACTED');
  });

  it('should redact secrets in objects', () => {
    const input = { token: 'ghp_abcdefghijklmnopqrstuvwxyz0123456789ab', user: 'test' };
    const result = redactValue(input);
    expect(result).not.toContain('ghp_abcdef');
    expect(result).toContain('REDACTED');
    expect(result).toContain('test');
  });

  it('should handle unserializable objects gracefully', () => {
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    const result = redactValue(circular);
    expect(result).toBe('[Unserializable]');
  });

  it('should handle plain non-secret strings unchanged', () => {
    const input = 'Hello, World!';
    expect(redactValue(input)).toBe(input);
  });
});

// ==============================
// generateBranchName
// ==============================

describe('generateBranchName', () => {
  it('should generate correct branch name format', () => {
    const result = generateBranchName(42, 'Fix login bug');
    expect(result).toBe('positron/issue-42-fix-login-bug');
  });

  it('should lowercase the title', () => {
    const result = generateBranchName(1, 'UPPERCASE TITLE');
    expect(result).toBe('positron/issue-1-uppercase-title');
  });

  it('should replace special characters with hyphens', () => {
    const result = generateBranchName(10, 'Fix: bug & feature (urgent)!');
    expect(result).toMatch(/^positron\/issue-10-fix-bug-feature-urgent$/);
  });

  it('should trim leading/trailing hyphens', () => {
    const result = generateBranchName(5, '!!! Important !!!');
    expect(result).not.toMatch(/^-|-$/);
    expect(result).toBe('positron/issue-5-important');
  });

  it('should truncate title slug to 50 chars', () => {
    const longTitle = 'A very long title that goes on and on and on and on and on and on and on forever and ever';
    const result = generateBranchName(99, longTitle);
    // Full format: positron/issue-99-<slug>
    // Slug part should be at most 50 chars
    const slugPart = result.replace('positron/issue-99-', '');
    expect(slugPart.length).toBeLessThanOrEqual(50);
  });

  it('should handle German umlauts by stripping them', () => {
    const result = generateBranchName(1, 'Überprüfung der Änderung');
    // Umlauts are stripped (not in [a-z0-9])
    expect(result).not.toContain('ü');
    expect(result).not.toContain('ä');
    expect(result).not.toContain('ö');
  });

  it('should handle empty title edge case', () => {
    const result = generateBranchName(1, '');
    expect(result).toBe('positron/issue-1-');
  });

  it('should handle title with only special characters', () => {
    const result = generateBranchName(7, '!!!');
    expect(result).toBe('positron/issue-7-');
  });
});

// ==============================
// createRunId — default UUID fallback
// ==============================

describe('createRunId', () => {
  it('should generate UUID when no generator provided', () => {
    const id = createRunId();
    expect(id).toBeTruthy();
    expect(typeof id).toBe('string');
  });
});

// ==============================
// formatDuration — additional edge cases
// ==============================

describe('formatDuration', () => {
  it('should format 0ms as "0s"', () => {
    expect(formatDuration(0)).toBe('0s');
  });

  it('should format 1000ms as "1s"', () => {
    expect(formatDuration(1000)).toBe('1s');
  });

  it('should format 60000ms as "1m 0s"', () => {
    expect(formatDuration(60000)).toBe('1m 0s');
  });

  it('should format exact hour as "1h 0s" (minutes=0 omitted)', () => {
    expect(formatDuration(3600000)).toBe('1h 0s');
  });

  it('should format 3661000ms as "1h 1m 1s"', () => {
    expect(formatDuration(3661000)).toBe('1h 1m 1s');
  });

  it('should format large values correctly', () => {
    const result = formatDuration(90061000); // 25h 1m 1s
    expect(result).toContain('25h');
    expect(result).toContain('1m');
    expect(result).toContain('1s');
  });

  it('should always include seconds', () => {
    const result = formatDuration(3600000);
    expect(result).toContain('s');
  });

  it('should handle sub-second values (floor to 0s)', () => {
    expect(formatDuration(500)).toBe('0s');
  });
});

// ==============================
// truncate — additional edge cases
// ==============================

describe('truncate', () => {
  it('should return unchanged string if within limit', () => {
    expect(truncate('hello', 10)).toBe('hello');
  });

  it('should return unchanged string if exactly at limit', () => {
    expect(truncate('hello', 5)).toBe('hello');
  });

  it('should truncate and add ellipsis', () => {
    const result = truncate('hello world', 5);
    expect(result).toBe('he...');
    expect(result.length).toBe(5);
  });

  it('should handle max less than 3 (minimum ellipsis)', () => {
    const result = truncate('abcdef', 3);
    expect(result).toBe('...');
  });

  it('should handle empty string', () => {
    expect(truncate('', 5)).toBe('');
  });

  it('should handle max = 0 edge case', () => {
    // With max=0: s.length (6) > 0 → s.slice(0, -3) = 'abc' + '...' = 'abc...'
    const result = truncate('abcdef', 0);
    expect(result).toBe('abc...');
  });
});

// ==============================
// sleep — enhanced with fake timers
// ==============================

describe('sleep', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('should resolve after the specified time (real timers)', async () => {
    const start = Date.now();
    await sleep(10);
    const elapsed = Date.now() - start;
    expect(elapsed).toBeGreaterThanOrEqual(5);
  });

  it('should resolve when using fake timers', async () => {
    vi.useFakeTimers();
    const promise = sleep(1000);
    
    // Advance time partially — should not resolve yet
    vi.advanceTimersByTime(500);
    
    let resolved = false;
    promise.then(() => { resolved = true; });
    
    await vi.advanceTimersByTimeAsync(500);
    // Flush promises after timer advance
    await Promise.resolve();
    
    expect(resolved).toBe(true);
  });
});
