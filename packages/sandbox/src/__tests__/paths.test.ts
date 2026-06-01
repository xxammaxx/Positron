import { describe, it, expect } from 'vitest';
import path from 'node:path';
import os from 'node:os';
import {
  createWorkspacePath, createPositronBranchName, validatePath, validateRemoteUrl,
  GitWorkspacePathError, GitRemoteInvalidError,
} from '../paths.js';

describe('createWorkspacePath', () => {
  it('should use custom workspaceRoot when provided', () => {
    const result = createWorkspacePath('run-abcdef12', '/custom/root');
    expect(result).toBe(path.join('/custom/root', 'run-abcd'));
  });

  it('should use process.env fallback when no workspaceRoot provided', () => {
    const oldRoot = process.env.POSITRON_WORKSPACE_ROOT;
    process.env.POSITRON_WORKSPACE_ROOT = '/tmp/env-ws';
    try {
      const result = createWorkspacePath('run-abcdef12');
      expect(result).toBe(path.join('/tmp/env-ws', 'run-abcd'));
    } finally {
      process.env.POSITRON_WORKSPACE_ROOT = oldRoot;
    }
  });

  it('should use default workspace root when neither param nor env is set', () => {
    const oldRoot = process.env.POSITRON_WORKSPACE_ROOT;
    delete process.env.POSITRON_WORKSPACE_ROOT;
    try {
      const result = createWorkspacePath('run-abcdef12');
      // Default is derived from homedir — just verify it doesn't error
      expect(result).toContain('run-abcd');
      expect(result.startsWith('/')).toBe(true);
    } finally {
      process.env.POSITRON_WORKSPACE_ROOT = oldRoot;
    }
  });
});

describe('createPositronBranchName', () => {
  it('should generate correct format', () => {
    expect(createPositronBranchName(42, 'Fix bug')).toBe('positron/issue-42-fix-bug');
  });
  it('should lowercase and slugify', () => {
    expect(createPositronBranchName(1, 'UPPER CASE')).toBe('positron/issue-1-upper-case');
  });
});

describe('validatePath', () => {
  it('should accept absolute path', () => {
    expect(() => validatePath('/tmp/workspace')).not.toThrow();
  });
  it('should reject empty string', () => {
    expect(() => validatePath('')).toThrow(GitWorkspacePathError);
  });
  it('should reject relative path', () => {
    expect(() => validatePath('relative/path')).toThrow(GitWorkspacePathError);
  });
  it('should reject path traversal', () => {
    expect(() => validatePath('/tmp/../etc')).toThrow(GitWorkspacePathError);
  });
});

describe('validateRemoteUrl', () => {
  it('should accept valid HTTPS URL', () => {
    expect(() => validateRemoteUrl('https://github.com/user/repo.git')).not.toThrow();
  });
  it('should reject empty string', () => {
    expect(() => validateRemoteUrl('')).toThrow(GitRemoteInvalidError);
  });
  it('should reject invalid URL', () => {
    expect(() => validateRemoteUrl('not-a-url')).toThrow(GitRemoteInvalidError);
  });
});

describe('GitWorkspacePathError', () => {
  it('should inherit from Error', () => {
    expect(new GitWorkspacePathError('test')).toBeInstanceOf(Error);
  });
});

describe('GitRemoteInvalidError', () => {
  it('should inherit from Error', () => {
    expect(new GitRemoteInvalidError('test')).toBeInstanceOf(Error);
  });
});
