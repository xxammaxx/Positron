import { describe, it, expect, afterEach } from 'vitest';
import {
  ALLOWED_SPECKIT_COMMANDS,
  BLOCKED_SPECKIT_COMMANDS,
  isAllowedSpecKitCommand,
  isBlockedSpecKitCommand,
  validateSpecKitCommand,
  SpecKitCommandPolicyError,
} from '../speckit-policy.js';

describe('ALLOWED_SPECKIT_COMMANDS', () => {
  it('should contain allowed commands', () => {
    expect(ALLOWED_SPECKIT_COMMANDS).toContain('specify version');
    expect(ALLOWED_SPECKIT_COMMANDS).toContain('specify init');
  });
});

describe('BLOCKED_SPECKIT_COMMANDS', () => {
  it('should contain blocked commands', () => {
    expect(BLOCKED_SPECKIT_COMMANDS).toContain('specify --force');
    expect(BLOCKED_SPECKIT_COMMANDS).toContain('specify --dangerous');
  });
});

describe('isAllowedSpecKitCommand', () => {
  it('should return true for allowed commands', () => {
    expect(isAllowedSpecKitCommand('specify version')).toBe(true);
    expect(isAllowedSpecKitCommand('specify --version')).toBe(true);
    expect(isAllowedSpecKitCommand('specify init ./myproject')).toBe(true);
    expect(isAllowedSpecKitCommand('specify check')).toBe(true);
  });

  it('should return false for unknown commands', () => {
    expect(isAllowedSpecKitCommand('specify deploy')).toBe(false);
    expect(isAllowedSpecKitCommand('unknown')).toBe(false);
  });
});

describe('isBlockedSpecKitCommand', () => {
  it('should return true for blocked commands', () => {
    expect(isBlockedSpecKitCommand('specify --force')).toBe(true);
    expect(isBlockedSpecKitCommand('specify --force --verbose')).toBe(true);
  });

  it('should return false for safe commands', () => {
    expect(isBlockedSpecKitCommand('specify version')).toBe(false);
  });
});

describe('validateSpecKitCommand', () => {
  const originalEnv = process.env;

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('should throw in fake mode (default)', () => {
    delete process.env.POSITRON_SPECKIT_MODE;
    expect(() => validateSpecKitCommand('specify version')).toThrow(SpecKitCommandPolicyError);
  });

  it('should throw in fake mode explicitly', () => {
    process.env.POSITRON_SPECKIT_MODE = 'fake';
    expect(() => validateSpecKitCommand('specify version')).toThrow(SpecKitCommandPolicyError);
  });

  it('should not throw for allowed commands in real mode', () => {
    process.env.POSITRON_SPECKIT_MODE = 'real';
    expect(() => validateSpecKitCommand('specify version')).not.toThrow();
  });

  it('should throw for blocked commands in real mode', () => {
    process.env.POSITRON_SPECKIT_MODE = 'real';
    expect(() => validateSpecKitCommand('specify --force')).toThrow(SpecKitCommandPolicyError);
  });

  it('should throw for unknown commands in real mode', () => {
    process.env.POSITRON_SPECKIT_MODE = 'real';
    expect(() => validateSpecKitCommand('specify deploy')).toThrow(SpecKitCommandPolicyError);
  });
});

describe('SpecKitCommandPolicyError', () => {
  it('should be instance of Error', () => {
    const err = new SpecKitCommandPolicyError('test');
    expect(err).toBeInstanceOf(Error);
  });

  it('should have correct name', () => {
    const err = new SpecKitCommandPolicyError('test');
    expect(err.name).toBe('SpecKitCommandPolicyError');
  });
});
