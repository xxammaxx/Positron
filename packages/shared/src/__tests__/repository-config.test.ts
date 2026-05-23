import { describe, expect, test } from 'vitest';
import {
  buildRemoteUrl,
  isValidOwner,
  isValidRepo,
  loadPositronRuntimeConfig,
  loadRepositoryConfig,
  normalizeRepositoryConfig,
} from '../repository-config.js';

describe('repository config', () => {
  test('loadRepositoryConfig returns null when required env is missing', () => {
    expect(loadRepositoryConfig({})).toBeNull();
  });

  test('loadRepositoryConfig reads and trims env values', () => {
    const config = loadRepositoryConfig({
      POSITRON_REPO_OWNER: '  test-owner  ',
      POSITRON_REPO_NAME: '  test-repo  ',
      POSITRON_REPO_DEFAULT_BRANCH: '  main  ',
      POSITRON_REPO_REMOTE_URL: '  https://github.com/test-owner/test-repo.git  ',
    });

    expect(config).toEqual({
      owner: 'test-owner',
      repo: 'test-repo',
      defaultBranch: 'main',
      remoteUrl: 'https://github.com/test-owner/test-repo.git',
    });
  });

  test('loadRepositoryConfig rejects invalid owner/repo values', () => {
    expect(loadRepositoryConfig({
      POSITRON_REPO_OWNER: '../evil',
      POSITRON_REPO_NAME: 'repo',
    })).toBeNull();

    expect(loadRepositoryConfig({
      POSITRON_REPO_OWNER: 'owner',
      POSITRON_REPO_NAME: 'bad/repo',
    })).toBeNull();
  });

  test('normalizeRepositoryConfig builds a remote URL when omitted', () => {
    const config = normalizeRepositoryConfig({
      owner: 'owner',
      repo: 'repo',
    });

    expect(config.remoteUrl).toBe('https://github.com/owner/repo.git');
  });

  test('loadPositronRuntimeConfig reads mode, token, repository and workspace root', () => {
    const runtime = loadPositronRuntimeConfig({
      GITHUB_MODE: 'real',
      GITHUB_TOKEN: 'ghp_testtoken12345678901234567890',
      POSITRON_REPO_OWNER: 'owner',
      POSITRON_REPO_NAME: 'repo',
      POSITRON_WORKSPACE_ROOT: '/tmp/positron',
    });

    expect(runtime).toEqual({
      githubMode: 'real',
      githubTokenPresent: true,
      repository: {
        owner: 'owner',
        repo: 'repo',
        remoteUrl: 'https://github.com/owner/repo.git',
      },
      workspaceRoot: '/tmp/positron',
    });
  });

  test('isValidOwner and isValidRepo enforce the allowed character set', () => {
    expect(isValidOwner('owner-1')).toBe(true);
    expect(isValidRepo('repo_1')).toBe(true);
    expect(isValidOwner('../owner')).toBe(false);
    expect(isValidRepo('repo/evil')).toBe(false);
    expect(isValidRepo('https://github.com/owner/repo')).toBe(false);
  });

  test('buildRemoteUrl returns a normalized GitHub URL', () => {
    expect(buildRemoteUrl('owner', 'repo')).toBe('https://github.com/owner/repo.git');
  });
});
