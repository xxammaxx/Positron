import { describe, expect, test } from 'vitest';
import { createPositronBranchName, validateRemoteUrl, createWorkspacePath } from '../paths.js';
import { GitRemoteInvalidError } from '../paths.js';

describe('createPositronBranchName', () => {
  test('normaler Titel', () => {
    expect(createPositronBranchName(10, 'Git Workspace Adapter')).toBe('positron/issue-10-git-workspace-adapter');
  });

  test('Umlaute', () => {
    expect(createPositronBranchName(5, 'Hinzufügen')).toBe('positron/issue-5-hinzufuegen');
  });

  test('Sonderzeichen entfernt', () => {
    expect(createPositronBranchName(1, 'fix: auth / login (urgent)!')).toBe('positron/issue-1-fix-auth-login-urgent');
  });

  test('Path traversal geblockt', () => {
    const name = createPositronBranchName(1, '../../evil');
    expect(name).not.toContain('..');
    expect(name).toBe('positron/issue-1-evil');
  });

  test('Shell injection geblockt', () => {
    const name = createPositronBranchName(1, '$(rm -rf /)');
    expect(name).not.toContain('$');
    expect(name).not.toContain('(');
  });

  test('"main" als Titel ist sicher', () => {
    const name = createPositronBranchName(1, 'main');
    expect(name).not.toBe('main');
    expect(name).toBe('positron/issue-1-main');
  });

  test('newline im Titel wird entfernt', () => {
    const name = createPositronBranchName(1, 'feature\nmain');
    expect(name).not.toContain('\n');
  });
});

describe('validateRemoteUrl', () => {
  test('HTTPS GitHub URL', () => {
    expect(validateRemoteUrl('https://github.com/xxammaxx/Positron.git')).toBe('https://github.com/xxammaxx/Positron.git');
  });

  test('HTTPS ohne .git', () => {
    expect(validateRemoteUrl('https://github.com/xxammaxx/Positron')).toBe('https://github.com/xxammaxx/Positron.git');
  });

  test('SSH GitHub URL', () => {
    expect(validateRemoteUrl('git@github.com:xxammaxx/Positron.git')).toBe('git@github.com:xxammaxx/Positron.git');
  });

  test('evil host geblockt', () => {
    expect(() => validateRemoteUrl('https://evil.com/repo.git')).toThrow(GitRemoteInvalidError);
  });

  test('file:// geblockt', () => {
    expect(() => validateRemoteUrl('file:///etc/passwd')).toThrow(GitRemoteInvalidError);
  });

  test('relativer Pfad geblockt', () => {
    expect(() => validateRemoteUrl('../../repo')).toThrow(GitRemoteInvalidError);
  });
});

describe('createWorkspacePath', () => {
  test('liegt innerhalb WORKSPACE_ROOT', () => {
    const p = createWorkspacePath('xxammaxx', 'Positron', 10, 'abc123');
    expect(p).toContain('workspaces/xxammaxx/Positron/runs/issue-10-abc123');
  });
});
