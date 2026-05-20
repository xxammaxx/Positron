import { describe, expect, test } from 'vitest';
import { redactSecrets, redactValue } from '../../utils.js';
import type { RedactionRule } from '../../utils.js';

describe('redactSecrets', () => {
  test('maskiert ghp_', () => {
    expect(redactSecrets('ghp_1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r')).toContain('[REDACTED_GITHUB_TOKEN]');
  });

  test('maskiert github_pat_', () => {
    expect(redactSecrets('github_pat_11ABCDEFGHIJKLMNOPQRSTUVWXYZ')).toContain('[REDACTED_GITHUB_PAT]');
  });

  test('maskiert Bearer Token', () => {
    const r = redactSecrets('Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.abc.xyz');
    expect(r).toContain('Bearer [REDACTED]');
  });

  test('maskiert sk- Key', () => {
    expect(redactSecrets('sk-1234567890abcdef1234567890abcdef1234567890abcdef')).toContain('[REDACTED_OPENAI_KEY]');
  });

  test('maskiert anthropic_ Key', () => {
    expect(redactSecrets('anthropic_1234567890abcdef12345')).toContain('[REDACTED_ANTHROPIC_KEY]');
  });

  test('maskiert gemini_ Key', () => {
    expect(redactSecrets('gemini_1234567890abcdef123456')).toContain('[REDACTED_GEMINI_KEY]');
  });

  test('maskiert api_key=value', () => {
    const r = redactSecrets('api_key=supersecret123');
    expect(r).not.toContain('supersecret123');
    expect(r).toContain('[REDACTED]');
  });

  test('unveränderter Text ohne Secrets', () => {
    expect(redactSecrets('Normaler Text.')).toBe('Normaler Text.');
  });

  test('leerer String', () => {
    expect(redactSecrets('')).toBe('');
  });

  test('mehrere Secrets', () => {
    const r = redactSecrets('GH_TOKEN=ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZ123456\nOPENAI_KEY=sk-1234567890abcdef1234567890abcdef1234567890abcdef');
    expect(r).toContain('[REDACTED_GITHUB_TOKEN]');
    expect(r).toContain('[REDACTED_OPENAI_KEY]');
  });

  test('benutzerdefinierte Regeln', () => {
    const rules: RedactionRule[] = [{ name: 'c', pattern: /mein-geheimnis/gi, replacement: '[X]' }];
    expect(redactSecrets('Das ist mein-geheimnis hier.', rules)).toBe('Das ist [X] hier.');
  });
});

describe('redactValue', () => {
  test('maskiert Error-Objekt mit Token', () => {
    const r = redactValue(new Error('Failed with token=ghp_1234567890abcdef'));
    expect(r).not.toContain('ghp_');
  });

  test('maskiert Objekt', () => {
    const r = redactValue({ token: 'sk-1234567890abcdef1234567890abcdef1234567890abcdef', user: 'test' });
    expect(r).not.toContain('sk-123456');
  });

  test('behandelt zirkuläre Referenzen', () => {
    const obj: Record<string, unknown> = {};
    obj.self = obj;
    expect(() => redactValue(obj)).not.toThrow();
  });

  test('behandelt undefined ohne Crash', () => {
    expect(() => redactValue(undefined)).not.toThrow();
    expect(redactValue(undefined)).toBe('[REDACTABLE]');
  });

  test('behandelt Symbol ohne Crash', () => {
    expect(() => redactValue(Symbol('test'))).not.toThrow();
  });

  test('extrahiert Error-Namen und Message', () => {
    const r = redactValue(new TypeError('Ungültiger Token ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZ123456'));
    expect(r).toContain('TypeError');
    expect(r).not.toContain('ghp_');
  });
});
