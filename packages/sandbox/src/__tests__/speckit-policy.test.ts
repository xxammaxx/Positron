// Tests for Spec Kit Command Policy (Issue #15)

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  isAllowedSpecKitCommand,
  isBlockedSpecKitCommand,
  validateSpecKitCommand,
  SpecKitCommandPolicyError,
  ALLOWED_SPECKIT_COMMANDS,
  BLOCKED_SPECKIT_COMMANDS,
} from '../speckit-policy.js';
import { mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';

let cwd: string;

function setupCwd() {
  cwd = join(tmpdir(), `speckit-policy-test-${randomUUID().slice(0, 8)}`);
  mkdirSync(cwd, { recursive: true });
  return cwd;
}

function cleanupCwd() {
  try { rmSync(cwd, { recursive: true, force: true }); } catch { /* */ }
}

describe('ALLOWED_SPECKIT_COMMANDS', () => {
  it('includes version', () => {
    expect(ALLOWED_SPECKIT_COMMANDS.has('version')).toBe(true);
  });

  it('includes check', () => {
    expect(ALLOWED_SPECKIT_COMMANDS.has('check')).toBe(true);
  });

  it('includes init', () => {
    expect(ALLOWED_SPECKIT_COMMANDS.has('init')).toBe(true);
  });

  it('does NOT include extension', () => {
    expect(ALLOWED_SPECKIT_COMMANDS.has('extension')).toBe(false);
  });

  it('does NOT include arbitrary subcommands', () => {
    expect(ALLOWED_SPECKIT_COMMANDS.has('speckit.specify')).toBe(false);
  });
});

describe('BLOCKED_SPECKIT_COMMANDS', () => {
  it('includes extension', () => {
    expect(BLOCKED_SPECKIT_COMMANDS.has('extension')).toBe(true);
  });

  it('includes preset', () => {
    expect(BLOCKED_SPECKIT_COMMANDS.has('preset')).toBe(true);
  });

  it('includes integration', () => {
    expect(BLOCKED_SPECKIT_COMMANDS.has('integration')).toBe(true);
  });

  it('includes workflow', () => {
    expect(BLOCKED_SPECKIT_COMMANDS.has('workflow')).toBe(true);
  });
});

describe('isAllowedSpecKitCommand', () => {
  it('returns true for version', () => {
    expect(isAllowedSpecKitCommand('version')).toBe(true);
  });

  it('returns true for check', () => {
    expect(isAllowedSpecKitCommand('check')).toBe(true);
  });

  it('returns true for init', () => {
    expect(isAllowedSpecKitCommand('init')).toBe(true);
  });

  it('returns false for blocked commands', () => {
    expect(isAllowedSpecKitCommand('extension')).toBe(false);
    expect(isAllowedSpecKitCommand('preset')).toBe(false);
  });
});

describe('isBlockedSpecKitCommand', () => {
  it('returns true for extension', () => {
    expect(isBlockedSpecKitCommand('extension')).toBe(true);
  });

  it('returns false for allowed commands', () => {
    expect(isBlockedSpecKitCommand('version')).toBe(false);
  });
});

describe('validateSpecKitCommand', () => {
  beforeEach(() => { cwd = setupCwd(); });
  afterEach(() => { cleanupCwd(); });

  it('allows specify version', () => {
    expect(() => validateSpecKitCommand('specify', ['version'], cwd)).not.toThrow();
  });

  it('allows specify check', () => {
    expect(() => validateSpecKitCommand('specify', ['check'], cwd)).not.toThrow();
  });

  it('allows specify init with --integration generic', () => {
    expect(() =>
      validateSpecKitCommand('specify', ['init', '.', '--integration', 'generic', '--force', '--no-git'], cwd),
    ).not.toThrow();
  });

  it('allows specify init with --integration opencode', () => {
    expect(() =>
      validateSpecKitCommand('specify', ['init', '.', '--integration', 'opencode', '--ignore-agent-tools'], cwd),
    ).not.toThrow();
  });

  it('rejects non-specify commands', () => {
    expect(() => validateSpecKitCommand('git', ['status'], cwd)).toThrow(SpecKitCommandPolicyError);
  });

  it('rejects missing subcommand', () => {
    expect(() => validateSpecKitCommand('specify', [], cwd)).toThrow(SpecKitCommandPolicyError);
  });

  it('rejects extension subcommand', () => {
    expect(() => validateSpecKitCommand('specify', ['extension', 'add', 'something'], cwd))
      .toThrow(SpecKitCommandPolicyError);
  });

  it('rejects preset subcommand', () => {
    expect(() => validateSpecKitCommand('specify', ['preset', 'add', 'something'], cwd))
      .toThrow(SpecKitCommandPolicyError);
  });

  it('rejects integration subcommand', () => {
    expect(() => validateSpecKitCommand('specify', ['integration', 'list'], cwd))
      .toThrow(SpecKitCommandPolicyError);
  });

  it('rejects workflow subcommand', () => {
    expect(() => validateSpecKitCommand('specify', ['workflow', 'add', 'something'], cwd))
      .toThrow(SpecKitCommandPolicyError);
  });

  it('rejects unknown subcommands', () => {
    expect(() => validateSpecKitCommand('specify', ['unknown-command'], cwd))
      .toThrow(SpecKitCommandPolicyError);
  });

  it('rejects shell metacharacters in args', () => {
    expect(() => validateSpecKitCommand('specify', ['version', '; rm -rf /'], cwd))
      .toThrow(SpecKitCommandPolicyError);
  });

  it('rejects pipe in args', () => {
    expect(() => validateSpecKitCommand('specify', ['version', '|', 'cat'], cwd))
      .toThrow(SpecKitCommandPolicyError);
  });

  it('rejects --ai flag in init', () => {
    expect(() =>
      validateSpecKitCommand('specify', ['init', '.', '--ai', 'opencode'], cwd),
    ).toThrow(SpecKitCommandPolicyError);
  });

  it('rejects --preset flag in init', () => {
    expect(() =>
      validateSpecKitCommand('specify', ['init', '.', '--preset', 'some-preset'], cwd),
    ).toThrow(SpecKitCommandPolicyError);
  });

  it('rejects --extension flag in init', () => {
    expect(() =>
      validateSpecKitCommand('specify', ['init', '.', '--extension', 'some-ext'], cwd),
    ).toThrow(SpecKitCommandPolicyError);
  });

  it('rejects unsupported integration', () => {
    expect(() =>
      validateSpecKitCommand('specify', ['init', '.', '--integration', 'copilot'], cwd),
    ).toThrow(SpecKitCommandPolicyError);
  });

  it('rejects absolute paths in init', () => {
    expect(() =>
      validateSpecKitCommand('specify', ['init', '/etc/passwd'], cwd),
    ).toThrow(SpecKitCommandPolicyError);
  });

  it('rejects path traversal in init', () => {
    expect(() =>
      validateSpecKitCommand('specify', ['init', '..', '..', 'etc'], cwd),
    ).toThrow(SpecKitCommandPolicyError);
  });

  it('rejects --ai-commands-dir legacy flag', () => {
    expect(() =>
      validateSpecKitCommand('specify', ['init', '.', '--ai-commands-dir', '/tmp'], cwd),
    ).toThrow(SpecKitCommandPolicyError);
  });

  it('error message mentions slash commands for unknown subcommand', () => {
    try {
      validateSpecKitCommand('specify', ['speckit.specify'], cwd);
      expect.fail('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(SpecKitCommandPolicyError);
      expect((err as Error).message).toContain('Agent Slash Command');
    }
  });

  it('version accepts --json flag', () => {
    expect(() => validateSpecKitCommand('specify', ['version', '--json'], cwd)).not.toThrow();
  });

  it('version --features --json is accepted', () => {
    expect(() => validateSpecKitCommand('specify', ['version', '--features', '--json'], cwd)).not.toThrow();
  });
});
