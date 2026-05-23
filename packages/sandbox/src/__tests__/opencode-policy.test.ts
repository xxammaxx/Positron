// Tests for OpenCode Command Policy (Issue #16)

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  ALLOWED_OPENCODE_COMMANDS,
  ALLOWED_SLASH_COMMANDS,
  validateOpenCodeCommand,
  OpenCodeCommandPolicyError,
} from '../opencode-policy.js';
import { mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';

let cwd: string;

function setupCwd() {
  cwd = join(tmpdir(), `opencode-policy-test-${randomUUID().slice(0, 8)}`);
  mkdirSync(cwd, { recursive: true });
  return cwd;
}

function cleanupCwd() {
  try { rmSync(cwd, { recursive: true, force: true }); } catch { /* */ }
}

describe('ALLOWED_OPENCODE_COMMANDS', () => {
  it('includes run', () => {
    expect(ALLOWED_OPENCODE_COMMANDS.has('run')).toBe(true);
  });
});

describe('ALLOWED_SLASH_COMMANDS', () => {
  it('includes speckit.specify', () => {
    expect(ALLOWED_SLASH_COMMANDS.has('speckit.specify')).toBe(true);
  });
  it('includes speckit.plan', () => {
    expect(ALLOWED_SLASH_COMMANDS.has('speckit.plan')).toBe(true);
  });
  it('includes speckit.tasks', () => {
    expect(ALLOWED_SLASH_COMMANDS.has('speckit.tasks')).toBe(true);
  });
  it('includes speckit.analyze', () => {
    expect(ALLOWED_SLASH_COMMANDS.has('speckit.analyze')).toBe(true);
  });
  it('includes speckit.constitution', () => {
    expect(ALLOWED_SLASH_COMMANDS.has('speckit.constitution')).toBe(true);
  });
  it('includes speckit.clarify', () => {
    expect(ALLOWED_SLASH_COMMANDS.has('speckit.clarify')).toBe(true);
  });
  it('includes speckit.checklist', () => {
    expect(ALLOWED_SLASH_COMMANDS.has('speckit.checklist')).toBe(true);
  });
});

describe('validateOpenCodeCommand', () => {
  beforeEach(() => { cwd = setupCwd(); });
  afterEach(() => { cleanupCwd(); });

  it('allows opencode run --command speckit.specify', () => {
    expect(() =>
      validateOpenCodeCommand('opencode', ['run', '--command', 'speckit.specify', '--format', 'json'], cwd),
    ).not.toThrow();
  });

  it('allows opencode run --command speckit.plan', () => {
    expect(() =>
      validateOpenCodeCommand('opencode', ['run', '--command', 'speckit.plan', '--format', 'json'], cwd),
    ).not.toThrow();
  });

  it('allows opencode run --command speckit.tasks', () => {
    expect(() =>
      validateOpenCodeCommand('opencode', ['run', '--command', 'speckit.tasks'], cwd),
    ).not.toThrow();
  });

  it('allows opencode run with model flag', () => {
    expect(() =>
      validateOpenCodeCommand('opencode', ['run', '-m', 'anthropic/claude-sonnet', '--command', 'speckit.specify'], cwd),
    ).not.toThrow();
  });

  it('rejects non-opencode commands', () => {
    expect(() => validateOpenCodeCommand('python', ['--version'], cwd))
      .toThrow(OpenCodeCommandPolicyError);
  });

  it('rejects missing subcommand', () => {
    expect(() => validateOpenCodeCommand('opencode', [], cwd))
      .toThrow(OpenCodeCommandPolicyError);
  });

  it('rejects unknown slash command', () => {
    expect(() =>
      validateOpenCodeCommand('opencode', ['run', '--command', 'malicious.command'], cwd),
    ).toThrow(OpenCodeCommandPolicyError);
  });

  it('rejects --dangerously-skip-permissions', () => {
    expect(() =>
      validateOpenCodeCommand('opencode', ['run', '--dangerously-skip-permissions', '--command', 'speckit.specify'], cwd),
    ).toThrow(OpenCodeCommandPolicyError);
  });

  it('rejects shell metacharacters', () => {
    expect(() =>
      validateOpenCodeCommand('opencode', ['run', '; rm -rf /'], cwd),
    ).toThrow(OpenCodeCommandPolicyError);
  });

  it('rejects pipe in args', () => {
    expect(() =>
      validateOpenCodeCommand('opencode', ['run', '--command', 'speckit.specify', '|', 'cat'], cwd),
    ).toThrow(OpenCodeCommandPolicyError);
  });

  it('error message mentions supported commands for unknown slash command', () => {
    try {
      validateOpenCodeCommand('opencode', ['run', '--command', 'evil.cmd'], cwd);
      expect.fail('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(OpenCodeCommandPolicyError);
      expect((err as Error).message).toContain('Supported:');
    }
  });
});
