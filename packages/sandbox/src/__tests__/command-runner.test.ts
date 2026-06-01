import { describe, it, expect } from 'vitest';
import { GitCommandError, GitCommandFailedError, GitCommandPolicyError } from '../command-runner.js';

describe('GitCommandError', () => {
  it('should inherit Error', () => {
    expect(new GitCommandError('test')).toBeInstanceOf(Error);
    expect(new GitCommandError('test').name).toBe('GitCommandError');
  });
});

describe('GitCommandFailedError', () => {
  it('should include exit code', () => {
    const e = new GitCommandFailedError('git status', 128, 'fatal');
    expect(e.message).toContain('128');
  });
});

describe('GitCommandPolicyError', () => {
  it('should have correct name', () => {
    expect(new GitCommandPolicyError('blocked').name).toBe('GitCommandPolicyError');
  });
});
