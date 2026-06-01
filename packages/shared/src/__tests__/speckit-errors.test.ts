import { describe, it, expect } from 'vitest';
import {
  SpecKitError,
  SpecKitNotInstalledError,
  SpecKitCommandNotAllowedError,
  SpecKitCommandFailedError,
  SpecKitWorkspaceInvalidError,
  SpecKitArtifactNotFoundError,
  SpecKitTimeoutError,
  SpecKitUnsupportedCommandError,
} from '../speckit-errors.js';

describe('SpecKitError', () => {
  it('should be instance of Error', () => {
    const err = new SpecKitError('test');
    expect(err).toBeInstanceOf(Error);
  });

  it('should have correct name', () => {
    const err = new SpecKitError('test');
    expect(err.name).toBe('SpecKitError');
  });

  it('should store message', () => {
    const err = new SpecKitError('custom message');
    expect(err.message).toBe('custom message');
  });
});

describe('SpecKitNotInstalledError', () => {
  it('should be instance of SpecKitError', () => {
    const err = new SpecKitNotInstalledError();
    expect(err).toBeInstanceOf(SpecKitError);
  });

  it('should have correct name', () => {
    const err = new SpecKitNotInstalledError();
    expect(err.name).toBe('SpecKitNotInstalledError');
  });

  it('should contain installation instructions', () => {
    const err = new SpecKitNotInstalledError();
    expect(err.message).toContain('not installed');
    expect(err.message).toContain('spec-kit');
  });
});

describe('SpecKitCommandNotAllowedError', () => {
  it('should be instance of SpecKitError', () => {
    const err = new SpecKitCommandNotAllowedError('specify');
    expect(err).toBeInstanceOf(SpecKitError);
  });

  it('should have correct name', () => {
    const err = new SpecKitCommandNotAllowedError('specify');
    expect(err.name).toBe('SpecKitCommandNotAllowedError');
  });

  it('should include command name in message', () => {
    const err = new SpecKitCommandNotAllowedError('plan');
    expect(err.message).toContain('plan');
    expect(err.message).toContain('not allowed');
  });
});

describe('SpecKitCommandFailedError', () => {
  it('should be instance of SpecKitError', () => {
    const err = new SpecKitCommandFailedError('specify', 1, 'error output');
    expect(err).toBeInstanceOf(SpecKitError);
  });

  it('should have correct name', () => {
    const err = new SpecKitCommandFailedError('specify', 1, 'error output');
    expect(err.name).toBe('SpecKitCommandFailedError');
  });

  it('should store command, exitCode, stderr', () => {
    const err = new SpecKitCommandFailedError('plan', 2, 'fatal error');
    expect(err.command).toBe('plan');
    expect(err.exitCode).toBe(2);
    expect(err.stderr).toBe('fatal error');
  });

  it('should include command and exit code in message', () => {
    const err = new SpecKitCommandFailedError('specify', 42, 'some stderr');
    expect(err.message).toContain('specify');
    expect(err.message).toContain('42');
  });

  it('should truncate long stderr in message to 200 chars', () => {
    const longStderr = 'x'.repeat(500);
    const err = new SpecKitCommandFailedError('cmd', 1, longStderr);
    // Full stderr stored
    expect(err.stderr.length).toBe(500);
    // Message only has first 200 chars of stderr
    expect(err.message).toContain('x'.repeat(200));
    expect(err.message.length).toBeLessThan(300);
  });
});

describe('SpecKitWorkspaceInvalidError', () => {
  it('should be instance of SpecKitError', () => {
    const err = new SpecKitWorkspaceInvalidError('/bad/path');
    expect(err).toBeInstanceOf(SpecKitError);
  });

  it('should have correct name', () => {
    const err = new SpecKitWorkspaceInvalidError('/bad/path');
    expect(err.name).toBe('SpecKitWorkspaceInvalidError');
  });

  it('should include path in message', () => {
    const err = new SpecKitWorkspaceInvalidError('/tmp/test');
    expect(err.message).toContain('/tmp/test');
    expect(err.message).toContain('invalid');
  });
});

describe('SpecKitArtifactNotFoundError', () => {
  it('should be instance of SpecKitError', () => {
    const err = new SpecKitArtifactNotFoundError('spec', '/path/to/.specify/spec.md');
    expect(err).toBeInstanceOf(SpecKitError);
  });

  it('should have correct name', () => {
    const err = new SpecKitArtifactNotFoundError('spec', '/path');
    expect(err.name).toBe('SpecKitArtifactNotFoundError');
  });

  it('should include kind and path in message', () => {
    const err = new SpecKitArtifactNotFoundError('plan', '/workspace/.specify/plan.md');
    expect(err.message).toContain('plan');
    expect(err.message).toContain('/workspace/.specify/plan.md');
    expect(err.message).toContain('not found');
  });
});

describe('SpecKitTimeoutError', () => {
  it('should be instance of SpecKitError', () => {
    const err = new SpecKitTimeoutError('specify', 30000);
    expect(err).toBeInstanceOf(SpecKitError);
  });

  it('should have correct name', () => {
    const err = new SpecKitTimeoutError('specify', 30000);
    expect(err.name).toBe('SpecKitTimeoutError');
  });

  it('should include command and timeout in message', () => {
    const err = new SpecKitTimeoutError('plan', 60000);
    expect(err.message).toContain('plan');
    expect(err.message).toContain('60000');
    expect(err.message).toContain('timed out');
  });
});

describe('SpecKitUnsupportedCommandError', () => {
  it('should be instance of SpecKitError', () => {
    const err = new SpecKitUnsupportedCommandError('unknown-cmd');
    expect(err).toBeInstanceOf(SpecKitError);
  });

  it('should have correct name', () => {
    const err = new SpecKitUnsupportedCommandError('unknown-cmd');
    expect(err.name).toBe('SpecKitUnsupportedCommandError');
  });

  it('should include command in message', () => {
    const err = new SpecKitUnsupportedCommandError('deploy');
    expect(err.message).toContain('deploy');
    expect(err.message).toContain('not supported');
  });
});
