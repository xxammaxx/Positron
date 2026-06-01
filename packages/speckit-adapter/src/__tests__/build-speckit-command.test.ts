import { describe, it, expect } from 'vitest';
import {
  buildSpecKitVersionCommand, buildSpecKitInitCommand, validateSpecKitMode,
  buildSpecKitRunCommand, classifySpecKitResult,
} from '../build-speckit-command.js';

describe('buildSpecKitVersionCommand', () => {
  it('should return version arg', () => {
    expect(buildSpecKitVersionCommand()).toEqual(['version']);
  });
});

describe('buildSpecKitInitCommand', () => {
  it('should include init and integration flag', () => {
    const args = buildSpecKitInitCommand('opencode');
    expect(args[0]).toBe('init');
    expect(args[1]).toBe('--integration');
    expect(args[2]).toBe('opencode');
  });

  it('should default to generic agent', () => {
    const args = buildSpecKitInitCommand();
    expect(args[2]).toBe('generic');
  });
});

describe('validateSpecKitMode', () => {
  it('should allow safe-cli mode', () => {
    expect(validateSpecKitMode('safe-cli')).toBe('ok');
  });
  it('should allow artifact-only mode', () => {
    expect(validateSpecKitMode('artifact-only')).toBe('ok');
  });
  it('should allow detect-only mode', () => {
    expect(validateSpecKitMode('detect-only')).toBe('ok');
  });
  it('should block unknown modes', () => {
    expect(validateSpecKitMode('unsafe')).toBe('blocked');
    expect(validateSpecKitMode('dangerous')).toBe('blocked');
  });
});

describe('buildSpecKitRunCommand', () => {
  it('should return null for artifact-only mode (no CLI)', () => {
    expect(buildSpecKitRunCommand('specify', 'artifact-only')).toBeNull();
  });
  it('should return args for safe-cli mode', () => {
    const args = buildSpecKitRunCommand('plan', 'safe-cli');
    expect(args).toEqual(['plan', '--format', 'json']);
  });
});

describe('classifySpecKitResult', () => {
  it('should classify exit 0 as success', () => {
    const r = classifySpecKitResult({ exitCode: 0, stdout: 'ok', stderr: '', durationMs: 100 }, 'init');
    expect(r.status).toBe('success');
  });

  it('should classify non-zero as failed', () => {
    const r = classifySpecKitResult({ exitCode: 1, stdout: '', stderr: 'error', durationMs: 50 }, 'init');
    expect(r.status).toBe('failed');
    expect(r.summary).toContain('error');
  });

  it('should classify null exit as failed', () => {
    const r = classifySpecKitResult({ exitCode: null, stdout: '', stderr: '', durationMs: 0 }, 'check');
    expect(r.status).toBe('failed');
    expect(r.summary).toContain('not executed');
  });
});
