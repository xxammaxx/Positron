import { describe, it, expect } from 'vitest';
import {
  loadRepositoryConfig,
  loadPositronRuntimeConfig,
  normalizeRepositoryConfig,
  isValidOwner,
  isValidRepo,
  buildRemoteUrl,
} from '../repository-config.js';

// ==============================
// loadRepositoryConfig
// ==============================

describe('loadRepositoryConfig', () => {
  it('should return config when owner and repo are set', () => {
    const config = loadRepositoryConfig({
      POSITRON_REPO_OWNER: 'testuser',
      POSITRON_REPO_NAME: 'testrepo',
    });
    expect(config).not.toBeNull();
    expect(config!.owner).toBe('testuser');
    expect(config!.repo).toBe('testrepo');
    expect(config!.defaultBranch).toBe('main');
  });

  it('should return null when owner is missing', () => {
    const config = loadRepositoryConfig({
      POSITRON_REPO_NAME: 'testrepo',
    });
    expect(config).toBeNull();
  });

  it('should return null when repo is missing', () => {
    const config = loadRepositoryConfig({
      POSITRON_REPO_OWNER: 'testuser',
    });
    expect(config).toBeNull();
  });

  it('should return null when both are missing', () => {
    const config = loadRepositoryConfig({});
    expect(config).toBeNull();
  });

  it('should use defaultBranch from env', () => {
    const config = loadRepositoryConfig({
      POSITRON_REPO_OWNER: 'testuser',
      POSITRON_REPO_NAME: 'testrepo',
      POSITRON_REPO_DEFAULT_BRANCH: 'develop',
    });
    expect(config!.defaultBranch).toBe('develop');
  });

  it('should use custom remoteUrl when provided', () => {
    const config = loadRepositoryConfig({
      POSITRON_REPO_OWNER: 'testuser',
      POSITRON_REPO_NAME: 'testrepo',
      POSITRON_REPO_REMOTE_URL: 'https://git.example.com/testuser/testrepo.git',
    });
    expect(config!.remoteUrl).toBe('https://git.example.com/testuser/testrepo.git');
  });

  it('should not set remoteUrl when not provided', () => {
    const config = loadRepositoryConfig({
      POSITRON_REPO_OWNER: 'testuser',
      POSITRON_REPO_NAME: 'testrepo',
    });
    expect(config!.remoteUrl).toBeUndefined();
  });

  it('should fall back to process.env when env param is omitted', () => {
    // Set process.env values
    const oldOwner = process.env.POSITRON_REPO_OWNER;
    const oldRepo = process.env.POSITRON_REPO_NAME;
    process.env.POSITRON_REPO_OWNER = 'env-owner';
    process.env.POSITRON_REPO_NAME = 'env-repo';
    try {
      const config = loadRepositoryConfig();
      expect(config).not.toBeNull();
      expect(config!.owner).toBe('env-owner');
      expect(config!.repo).toBe('env-repo');
    } finally {
      process.env.POSITRON_REPO_OWNER = oldOwner;
      process.env.POSITRON_REPO_NAME = oldRepo;
    }
  });
});

// ==============================
// loadPositronRuntimeConfig
// ==============================

describe('loadPositronRuntimeConfig', () => {
  it('should return config with default githubMode=fake', () => {
    const config = loadPositronRuntimeConfig({
      POSITRON_REPO_OWNER: 'testuser',
      POSITRON_REPO_NAME: 'testrepo',
    });
    expect(config).not.toBeNull();
    expect(config!.githubMode).toBe('fake');
    expect(config!.githubTokenPresent).toBe(false);
  });

  it('should detect GITHUB_TOKEN presence', () => {
    const config = loadPositronRuntimeConfig({
      POSITRON_REPO_OWNER: 'testuser',
      POSITRON_REPO_NAME: 'testrepo',
      GITHUB_TOKEN: 'ghp_test123',
    });
    expect(config!.githubTokenPresent).toBe(true);
  });

  it('should use GITHUB_MODE when set', () => {
    const config = loadPositronRuntimeConfig({
      POSITRON_REPO_OWNER: 'testuser',
      POSITRON_REPO_NAME: 'testrepo',
      GITHUB_MODE: 'real',
    });
    expect(config!.githubMode).toBe('real');
  });

  it('should capture workspaceRoot', () => {
    const config = loadPositronRuntimeConfig({
      POSITRON_REPO_OWNER: 'testuser',
      POSITRON_REPO_NAME: 'testrepo',
      POSITRON_WORKSPACE_ROOT: '/workspace',
    });
    expect(config!.workspaceRoot).toBe('/workspace');
  });

  it('should return null when repository config missing', () => {
    const config = loadPositronRuntimeConfig({
      GITHUB_TOKEN: 'ghp_test123',
    });
    expect(config).toBeNull();
  });

  it('should fall back to process.env when env param omitted', () => {
    const oldOwner = process.env.POSITRON_REPO_OWNER;
    const oldRepo = process.env.POSITRON_REPO_NAME;
    process.env.POSITRON_REPO_OWNER = 'runtime-owner';
    process.env.POSITRON_REPO_NAME = 'runtime-repo';
    try {
      const config = loadPositronRuntimeConfig();
      expect(config).not.toBeNull();
      expect(config!.githubMode).toBe('fake');
    } finally {
      process.env.POSITRON_REPO_OWNER = oldOwner;
      process.env.POSITRON_REPO_NAME = oldRepo;
    }
  });
});

// ==============================
// normalizeRepositoryConfig
// ==============================

describe('normalizeRepositoryConfig', () => {
  it('should fill defaultBranch when missing', () => {
    const result = normalizeRepositoryConfig({
      owner: 'testuser',
      repo: 'testrepo',
    });
    expect(result.defaultBranch).toBe('main');
  });

  it('should fill remoteUrl when missing', () => {
    const result = normalizeRepositoryConfig({
      owner: 'testuser',
      repo: 'testrepo',
    });
    expect(result.remoteUrl).toBe('https://github.com/testuser/testrepo.git');
  });

  it('should preserve existing defaultBranch', () => {
    const result = normalizeRepositoryConfig({
      owner: 'testuser',
      repo: 'testrepo',
      defaultBranch: 'develop',
    });
    expect(result.defaultBranch).toBe('develop');
  });

  it('should preserve existing remoteUrl', () => {
    const result = normalizeRepositoryConfig({
      owner: 'testuser',
      repo: 'testrepo',
      remoteUrl: 'https://git.example.com/testuser/testrepo.git',
    });
    expect(result.remoteUrl).toBe('https://git.example.com/testuser/testrepo.git');
  });

  it('should throw when owner is missing', () => {
    expect(() => normalizeRepositoryConfig({
      owner: '',
      repo: 'testrepo',
    })).toThrow('requires owner and repo');
  });

  it('should throw when repo is missing', () => {
    expect(() => normalizeRepositoryConfig({
      owner: 'testuser',
      repo: '',
    })).toThrow('requires owner and repo');
  });
});

// ==============================
// isValidOwner
// ==============================

describe('isValidOwner', () => {
  it('should accept valid owner names', () => {
    expect(isValidOwner('testuser')).toBe(true);
    expect(isValidOwner('test-user')).toBe(true);
    expect(isValidOwner('TestUser123')).toBe(true);
    expect(isValidOwner('a')).toBe(true);
  });

  it('should reject empty string', () => {
    expect(isValidOwner('')).toBe(false);
  });

  it('should reject names with underscores', () => {
    expect(isValidOwner('test_user')).toBe(false);
  });

  it('should reject names with dots', () => {
    expect(isValidOwner('test.user')).toBe(false);
  });

  it('should reject names over 39 characters', () => {
    const long = 'a'.repeat(40);
    expect(isValidOwner(long)).toBe(false);
  });

  it('should accept names at 39 characters', () => {
    const max = 'a'.repeat(39);
    expect(isValidOwner(max)).toBe(true);
  });
});

// ==============================
// isValidRepo
// ==============================

describe('isValidRepo', () => {
  it('should accept valid repo names', () => {
    expect(isValidRepo('testrepo')).toBe(true);
    expect(isValidRepo('test-repo')).toBe(true);
    expect(isValidRepo('test.repo')).toBe(true);
    expect(isValidRepo('test_repo')).toBe(true);
    expect(isValidRepo('TestRepo123')).toBe(true);
  });

  it('should reject empty string', () => {
    expect(isValidRepo('')).toBe(false);
  });

  it('should accept names at 100 characters', () => {
    const max = 'a'.repeat(100);
    expect(isValidRepo(max)).toBe(true);
  });

  it('should reject names over 100 characters', () => {
    const long = 'a'.repeat(101);
    expect(isValidRepo(long)).toBe(false);
  });
});

// ==============================
// buildRemoteUrl
// ==============================

describe('buildRemoteUrl', () => {
  it('should build correct URL', () => {
    const url = buildRemoteUrl('testuser', 'testrepo');
    expect(url).toBe('https://github.com/testuser/testrepo.git');
  });

  it('should throw for invalid owner', () => {
    expect(() => buildRemoteUrl('', 'testrepo')).toThrow('Ungültiger GitHub-Owner');
  });

  it('should throw for invalid repo', () => {
    expect(() => buildRemoteUrl('testuser', '')).toThrow('Ungültiger Repository-Name');
  });

  it('should throw for very long owner', () => {
    expect(() => buildRemoteUrl('toolong_owner_name', 'repo')).toThrow('Ungültiger GitHub-Owner');
  });
});
