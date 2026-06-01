import { describe, it, expect } from 'vitest';
import {
  OpenCodeError,
  OpenCodeNotInstalledError,
  OpenCodeCommandNotAllowedError,
  OpenCodeCommandFailedError,
  OpenCodeWorkspaceInvalidError,
  OpenCodeTimeoutError,
  OpenCodeUnsupportedCommandError,
} from '../opencode-errors.js';

describe('OpenCodeError', () => {
  it('should be instance of Error', () => {
    const err = new OpenCodeError('test');
    expect(err).toBeInstanceOf(Error);
  });

  it('should have correct name', () => {
    const err = new OpenCodeError('test');
    expect(err.name).toBe('OpenCodeError');
  });

  it('should store message', () => {
    const err = new OpenCodeError('custom error');
    expect(err.message).toBe('custom error');
  });
});

describe('OpenCodeNotInstalledError', () => {
  it('should be instance of OpenCodeError', () => {
    const err = new OpenCodeNotInstalledError();
    expect(err).toBeInstanceOf(OpenCodeError);
  });

  it('should have correct name', () => {
    const err = new OpenCodeNotInstalledError();
    expect(err.name).toBe('OpenCodeNotInstalledError');
  });

  it('should contain installation reference', () => {
    const err = new OpenCodeNotInstalledError();
    expect(err.message).toContain('not installed');
    expect(err.message).toContain('opencode.ai');
  });
});

describe('OpenCodeCommandNotAllowedError', () => {
  it('should be instance of OpenCodeError', () => {
    const err = new OpenCodeCommandNotAllowedError('run');
    expect(err).toBeInstanceOf(OpenCodeError);
  });

  it('should have correct name', () => {
    const err = new OpenCodeCommandNotAllowedError('run');
    expect(err.name).toBe('OpenCodeCommandNotAllowedError');
  });

  it('should include command name in message', () => {
    const err = new OpenCodeCommandNotAllowedError('execute');
    expect(err.message).toContain('execute');
    expect(err.message).toContain('not allowed');
  });
});

describe('OpenCodeCommandFailedError', () => {
  it('should be instance of OpenCodeError', () => {
    const err = new OpenCodeCommandFailedError('run', 1, 'stderr output');
    expect(err).toBeInstanceOf(OpenCodeError);
  });

  it('should have correct name', () => {
    const err = new OpenCodeCommandFailedError('run', 1, 'stderr output');
    expect(err.name).toBe('OpenCodeCommandFailedError');
  });

  it('should store command, exitCode, stderr', () => {
    const err = new OpenCodeCommandFailedError('implement', 127, 'command not found');
    expect(err.command).toBe('implement');
    expect(err.exitCode).toBe(127);
    expect(err.stderr).toBe('command not found');
  });

  it('should include command and exit code in message', () => {
    const err = new OpenCodeCommandFailedError('plan', 1, 'some error');
    expect(err.message).toContain('plan');
    expect(err.message).toContain('1');
  });

  it('should truncate long stderr in message to 200 chars', () => {
    const longStderr = 'y'.repeat(500);
    const err = new OpenCodeCommandFailedError('cmd', 1, longStderr);
    // Full stderr preserved
    expect(err.stderr.length).toBe(500);
    // Message only contains first 200 chars
    expect(err.message).toContain('y'.repeat(200));
    expect(err.message.length).toBeLessThan(300);
  });
});

describe('OpenCodeWorkspaceInvalidError', () => {
  it('should be instance of OpenCodeError', () => {
    const err = new OpenCodeWorkspaceInvalidError('/bad/path');
    expect(err).toBeInstanceOf(OpenCodeError);
  });

  it('should have correct name', () => {
    const err = new OpenCodeWorkspaceInvalidError('/bad/path');
    expect(err.name).toBe('OpenCodeWorkspaceInvalidError');
  });

  it('should include path in message', () => {
    const err = new OpenCodeWorkspaceInvalidError('/tmp/broken');
    expect(err.message).toContain('/tmp/broken');
    expect(err.message).toContain('invalid');
  });
});

describe('OpenCodeTimeoutError', () => {
  it('should be instance of OpenCodeError', () => {
    const err = new OpenCodeTimeoutError('run', 300000);
    expect(err).toBeInstanceOf(OpenCodeError);
  });

  it('should have correct name', () => {
    const err = new OpenCodeTimeoutError('run', 300000);
    expect(err.name).toBe('OpenCodeTimeoutError');
  });

  it('should include command and timeout in message', () => {
    const err = new OpenCodeTimeoutError('implement', 120000);
    expect(err.message).toContain('implement');
    expect(err.message).toContain('120000');
    expect(err.message).toContain('timed out');
  });
});

describe('OpenCodeUnsupportedCommandError', () => {
  it('should be instance of OpenCodeError', () => {
    const err = new OpenCodeUnsupportedCommandError('deploy');
    expect(err).toBeInstanceOf(OpenCodeError);
  });

  it('should have correct name', () => {
    const err = new OpenCodeUnsupportedCommandError('deploy');
    expect(err.name).toBe('OpenCodeUnsupportedCommandError');
  });

  it('should include command in message', () => {
    const err = new OpenCodeUnsupportedCommandError('destroy');
    expect(err.message).toContain('destroy');
    expect(err.message).toContain('not supported');
  });
});
