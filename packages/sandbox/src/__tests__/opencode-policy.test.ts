import { describe, it, expect, afterEach } from 'vitest';
import {
  ALLOWED_OPENCODE_COMMANDS,
  BLOCKED_OPENCODE_COMMANDS,
  ALLOWED_SLASH_COMMANDS,
  validateOpenCodeCommand,
  OpenCodeCommandPolicyError,
} from '../opencode-policy.js';

describe('ALLOWED_OPENCODE_COMMANDS', () => {
  it('should contain base commands', () => {
    expect(ALLOWED_OPENCODE_COMMANDS).toContain('opencode');
    expect(ALLOWED_OPENCODE_COMMANDS).toContain('opencode run');
    expect(ALLOWED_OPENCODE_COMMANDS).toContain('opencode --version');
    expect(ALLOWED_OPENCODE_COMMANDS).toContain('opencode --help');
  });
});

describe('BLOCKED_OPENCODE_COMMANDS', () => {
  it('should contain dangerous commands', () => {
    expect(BLOCKED_OPENCODE_COMMANDS).toContain('opencode --dangerous');
    expect(BLOCKED_OPENCODE_COMMANDS).toContain('opencode --unsafe');
    expect(BLOCKED_OPENCODE_COMMANDS).toContain('opencode --allow-all');
  });
});

describe('ALLOWED_SLASH_COMMANDS', () => {
  it('should contain speckit commands', () => {
    expect(ALLOWED_SLASH_COMMANDS).toContain('speckit.specify');
    expect(ALLOWED_SLASH_COMMANDS).toContain('speckit.plan');
    expect(ALLOWED_SLASH_COMMANDS).toContain('speckit.tasks');
  });
});

describe('validateOpenCodeCommand', () => {
  const originalEnv = process.env;

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('should throw in fake mode (default)', () => {
    delete process.env.POSITRON_OPENCODE_MODE;
    expect(() => validateOpenCodeCommand('opencode')).toThrow(OpenCodeCommandPolicyError);
  });

  it('should throw in fake mode explicitly', () => {
    process.env.POSITRON_OPENCODE_MODE = 'fake';
    expect(() => validateOpenCodeCommand('opencode')).toThrow(OpenCodeCommandPolicyError);
  });

  it('should allow safe commands in real mode', () => {
    process.env.POSITRON_OPENCODE_MODE = 'real';
    expect(() => validateOpenCodeCommand('opencode run --command test')).not.toThrow();
  });

  it('should block dangerous commands in real mode', () => {
    process.env.POSITRON_OPENCODE_MODE = 'real';
    expect(() => validateOpenCodeCommand('opencode --dangerous')).toThrow(OpenCodeCommandPolicyError);
  });

  it('should block unsafe commands in real mode', () => {
    process.env.POSITRON_OPENCODE_MODE = 'real';
    expect(() => validateOpenCodeCommand('opencode --unsafe')).toThrow(OpenCodeCommandPolicyError);
  });

  it('should allow commands containing "opencode" but not blocked pattern', () => {
    process.env.POSITRON_OPENCODE_MODE = 'real';
    expect(() => validateOpenCodeCommand('opencode --version')).not.toThrow();
  });
});

describe('OpenCodeCommandPolicyError', () => {
  it('should be instance of Error', () => {
    const err = new OpenCodeCommandPolicyError('test');
    expect(err).toBeInstanceOf(Error);
  });

  it('should have correct name', () => {
    const err = new OpenCodeCommandPolicyError('test');
    expect(err.name).toBe('OpenCodeCommandPolicyError');
  });
});
