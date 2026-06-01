import { describe, it, expect, afterEach } from 'vitest';
import { resolveAdapter, resolveRepositoryConfig } from '../config/runtime-config.js';
import { FakeGitHubAdapter } from '@positron/github-adapter';

describe('resolveAdapter', () => {
  const OLD_ENV = process.env;

  afterEach(() => {
    process.env = { ...OLD_ENV };
  });

  it('should return fake mode by default', () => {
    delete process.env.POSITRON_GITHUB_MODE;
    delete process.env.GITHUB_MODE;
    const result = resolveAdapter();
    expect(result.mode).toBe('fake');
    expect(result.adapter).toBeInstanceOf(FakeGitHubAdapter);
  });

  it('should prioritize POSITRON_GITHUB_MODE', () => {
    process.env.POSITRON_GITHUB_MODE = 'fake';
    process.env.GITHUB_MODE = 'real';
    const result = resolveAdapter();
    expect(result.mode).toBe('fake');
  });

  it('should use provided adapter directly', () => {
    const adapter = new FakeGitHubAdapter();
    const result = resolveAdapter(adapter);
    expect(result.mode).toBe('fake');
    expect(result.adapter).toBe(adapter);
  });

  it('should warn in production with fake mode', () => {
    const warnings: string[] = [];
    const mockLog = { warn: (msg: string) => { warnings.push(msg); } };
    process.env.NODE_ENV = 'production';
    process.env.POSITRON_GITHUB_MODE = 'fake';
    resolveAdapter(undefined, mockLog);
    expect(warnings.length).toBeGreaterThan(0);
    expect(warnings[0]).toContain('PRODUCTION');
  });

  it('should NOT crash in production when log is not provided', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.POSITRON_GITHUB_MODE;
    const result = resolveAdapter();
    expect(result.mode).toBe('fake');
    // Should handle the absence of log gracefully (no crash)
  });

  it('should detect real mode from POSITRON_GITHUB_MODE', () => {
    process.env.POSITRON_GITHUB_MODE = 'real';
    const result = resolveAdapter();
    expect(result.mode).toBe('real');
    // Uses createRealGitHubAdapter internally — no outbound calls in constructor
  });

  it('should fall back to GITHUB_MODE (legacy) when POSITRON_GITHUB_MODE not set', () => {
    delete process.env.POSITRON_GITHUB_MODE;
    process.env.GITHUB_MODE = 'fake';
    const result = resolveAdapter();
    expect(result.mode).toBe('fake');
  });

  it('should detect non-Fake adapter as real mode', () => {
    // Pass a mock that is NOT FakeGitHubAdapter → triggers instanceof false branch
    const mockAdapter = {
      createIssue: async () => ({ number: 1, htmlUrl: 'url' }),
    } as any;
    const result = resolveAdapter(mockAdapter);
    expect(result.mode).toBe('real');
  });
});

describe('resolveRepositoryConfig', () => {
  const OLD_ENV = process.env;

  afterEach(() => {
    process.env = { ...OLD_ENV };
  });

  it('should use provided config directly', () => {
    const result = resolveRepositoryConfig({ owner: 'test', repo: 'repo' });
    expect(result.owner).toBe('test');
    expect(result.repo).toBe('repo');
  });

  it('should throw when env vars missing', () => {
    delete process.env.POSITRON_REPO_OWNER;
    delete process.env.POSITRON_REPO_NAME;
    expect(() => resolveRepositoryConfig()).toThrow('POSITRON_REPO_OWNER');
  });

  it('should load from env when no config provided', () => {
    process.env.POSITRON_REPO_OWNER = 'envuser';
    process.env.POSITRON_REPO_NAME = 'envrepo';
    const result = resolveRepositoryConfig();
    expect(result.owner).toBe('envuser');
    expect(result.repo).toBe('envrepo');
  });
});
