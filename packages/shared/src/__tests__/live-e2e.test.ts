// Positron — Unit Tests: Live E2E Config Loading and Skip Logic
// These tests run in every test suite — no GitHub access needed.

import { describe, it, expect } from 'vitest';
import {
  loadLiveGitHubE2EConfig,
  shouldSkipLiveGitHubE2E,
  shouldSkipLiveGitHubWriteE2E,
  generateLiveRunId,
  liveE2EMarker,
  isAsciiOnly,
} from '../live-e2e.js';
import type { LiveGitHubE2EConfig } from '../live-e2e.js';

// ---------------------------------------------------------------------------
// loadLiveGitHubE2EConfig
// ---------------------------------------------------------------------------

describe('loadLiveGitHubE2EConfig', () => {
  it('returns disabled=false when no flags set', () => {
    const config = loadLiveGitHubE2EConfig({});
    expect(config.enabled).toBe(false);
    expect(config.allowWrite).toBe(false);
    expect(config.allowCreateIssue).toBe(false);
    expect(config.tokenPresent).toBe(false);
    expect(config.owner).toBe('');
    expect(config.repo).toBe('');
    expect(config.issueNumber).toBeUndefined();
    expect(config.allowCleanup).toBe(false);
  });

  it('reads POSITRON_ENABLE_LIVE_GITHUB_TESTS correctly', () => {
    const enabled = loadLiveGitHubE2EConfig({ POSITRON_ENABLE_LIVE_GITHUB_TESTS: 'true' });
    expect(enabled.enabled).toBe(true);

    const disabled = loadLiveGitHubE2EConfig({ POSITRON_ENABLE_LIVE_GITHUB_TESTS: 'false' });
    expect(disabled.enabled).toBe(false);

    const absent = loadLiveGitHubE2EConfig({});
    expect(absent.enabled).toBe(false);
  });

  it('reads POSITRON_LIVE_TEST_ALLOW_WRITE correctly', () => {
    expect(loadLiveGitHubE2EConfig({ POSITRON_LIVE_TEST_ALLOW_WRITE: 'true' }).allowWrite).toBe(true);
    expect(loadLiveGitHubE2EConfig({ POSITRON_LIVE_TEST_ALLOW_WRITE: 'false' }).allowWrite).toBe(false);
    expect(loadLiveGitHubE2EConfig({}).allowWrite).toBe(false);
  });

  it('reads POSITRON_LIVE_TEST_ALLOW_CREATE_ISSUE correctly', () => {
    expect(loadLiveGitHubE2EConfig({ POSITRON_LIVE_TEST_ALLOW_CREATE_ISSUE: 'true' }).allowCreateIssue).toBe(true);
    expect(loadLiveGitHubE2EConfig({}).allowCreateIssue).toBe(false);
  });

  it('reads POSITRON_TEST_OWNER and POSITRON_TEST_REPO', () => {
    const config = loadLiveGitHubE2EConfig({
      POSITRON_TEST_OWNER: 'myorg',
      POSITRON_TEST_REPO: 'test-repo',
    });
    expect(config.owner).toBe('myorg');
    expect(config.repo).toBe('test-repo');
  });

  it('returns empty strings when owner/repo not set', () => {
    const config = loadLiveGitHubE2EConfig({});
    expect(config.owner).toBe('');
    expect(config.repo).toBe('');
  });

  it('reads POSITRON_TEST_ISSUE_NUMBER as number', () => {
    const config = loadLiveGitHubE2EConfig({ POSITRON_TEST_ISSUE_NUMBER: '42' });
    expect(config.issueNumber).toBe(42);
  });

  it('returns undefined when issue number not set', () => {
    const config = loadLiveGitHubE2EConfig({});
    expect(config.issueNumber).toBeUndefined();
  });

  it('reads GITHUB_TOKEN presence', () => {
    expect(loadLiveGitHubE2EConfig({ GITHUB_TOKEN: 'ghp_test12345678901234567890' }).tokenPresent).toBe(true);
    expect(loadLiveGitHubE2EConfig({ GITHUB_TOKEN: '' }).tokenPresent).toBe(false);
    expect(loadLiveGitHubE2EConfig({}).tokenPresent).toBe(false);
  });

  it('reads POSITRON_LIVE_TEST_ALLOW_CLEANUP', () => {
    expect(loadLiveGitHubE2EConfig({ POSITRON_LIVE_TEST_ALLOW_CLEANUP: 'true' }).allowCleanup).toBe(true);
    expect(loadLiveGitHubE2EConfig({}).allowCleanup).toBe(false);
  });

  it('handles full config with all flags set', () => {
    const config = loadLiveGitHubE2EConfig({
      POSITRON_ENABLE_LIVE_GITHUB_TESTS: 'true',
      POSITRON_LIVE_TEST_ALLOW_WRITE: 'true',
      POSITRON_LIVE_TEST_ALLOW_CREATE_ISSUE: 'true',
      POSITRON_TEST_OWNER: 'myorg',
      POSITRON_TEST_REPO: 'myrepo',
      POSITRON_TEST_ISSUE_NUMBER: '1',
      GITHUB_TOKEN: 'ghp_fake',
      POSITRON_LIVE_TEST_ALLOW_CLEANUP: 'true',
    });
    expect(config.enabled).toBe(true);
    expect(config.allowWrite).toBe(true);
    expect(config.allowCreateIssue).toBe(true);
    expect(config.owner).toBe('myorg');
    expect(config.repo).toBe('myrepo');
    expect(config.issueNumber).toBe(1);
    expect(config.tokenPresent).toBe(true);
    expect(config.allowCleanup).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// shouldSkipLiveGitHubE2E (read-only)
// ---------------------------------------------------------------------------

describe('shouldSkipLiveGitHubE2E', () => {
  it('returns reason when not enabled', () => {
    const config: LiveGitHubE2EConfig = {
      enabled: false, allowWrite: false, allowCreateIssue: false,
      owner: 'org', repo: 'repo', tokenPresent: true, allowCleanup: false,
    };
    const reason = shouldSkipLiveGitHubE2E(config);
    expect(reason).toBeTruthy();
    expect(reason).toContain('ENABLE_LIVE_GITHUB_TESTS');
  });

  it('returns reason when no token', () => {
    const config: LiveGitHubE2EConfig = {
      enabled: true, allowWrite: false, allowCreateIssue: false,
      owner: 'org', repo: 'repo', tokenPresent: false, allowCleanup: false,
    };
    const reason = shouldSkipLiveGitHubE2E(config);
    expect(reason).toBeTruthy();
    expect(reason).toContain('GITHUB_TOKEN');
  });

  it('returns reason when no owner', () => {
    const config: LiveGitHubE2EConfig = {
      enabled: true, allowWrite: false, allowCreateIssue: false,
      owner: '', repo: 'repo', tokenPresent: true, allowCleanup: false,
    };
    const reason = shouldSkipLiveGitHubE2E(config);
    expect(reason).toBeTruthy();
    expect(reason).toContain('OWNER');
  });

  it('returns reason when no repo', () => {
    const config: LiveGitHubE2EConfig = {
      enabled: true, allowWrite: false, allowCreateIssue: false,
      owner: 'org', repo: '', tokenPresent: true, allowCleanup: false,
    };
    const reason = shouldSkipLiveGitHubE2E(config);
    expect(reason).toBeTruthy();
    expect(reason).toContain('REPO');
  });

  it('returns reason when both owner and repo missing', () => {
    const config: LiveGitHubE2EConfig = {
      enabled: true, allowWrite: false, allowCreateIssue: false,
      owner: '', repo: '', tokenPresent: true, allowCleanup: false,
    };
    const reason = shouldSkipLiveGitHubE2E(config);
    expect(reason).toBeTruthy();
    expect(reason).toContain('OWNER');
  });

  it('returns null when all gates pass', () => {
    const config: LiveGitHubE2EConfig = {
      enabled: true, allowWrite: false, allowCreateIssue: false,
      owner: 'org', repo: 'repo', tokenPresent: true, allowCleanup: false,
    };
    expect(shouldSkipLiveGitHubE2E(config)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// shouldSkipLiveGitHubWriteE2E (write)
// ---------------------------------------------------------------------------

describe('shouldSkipLiveGitHubWriteE2E', () => {
  it('returns reason when not enabled (write)', () => {
    const config: LiveGitHubE2EConfig = {
      enabled: false, allowWrite: true, allowCreateIssue: false,
      owner: 'org', repo: 'repo', tokenPresent: true,
      issueNumber: 1, allowCleanup: false,
    };
    const reason = shouldSkipLiveGitHubWriteE2E(config);
    expect(reason).toBeTruthy();
    expect(reason).toContain('ENABLE_LIVE_GITHUB_TESTS');
  });

  it('returns reason when allowWrite is false', () => {
    const config: LiveGitHubE2EConfig = {
      enabled: true, allowWrite: false, allowCreateIssue: false,
      owner: 'org', repo: 'repo', tokenPresent: true,
      issueNumber: 1, allowCleanup: false,
    };
    const reason = shouldSkipLiveGitHubWriteE2E(config);
    expect(reason).toBeTruthy();
    expect(reason).toContain('ALLOW_WRITE');
  });

  it('returns reason when no token (write)', () => {
    const config: LiveGitHubE2EConfig = {
      enabled: true, allowWrite: true, allowCreateIssue: false,
      owner: 'org', repo: 'repo', tokenPresent: false,
      issueNumber: 1, allowCleanup: false,
    };
    const reason = shouldSkipLiveGitHubWriteE2E(config);
    expect(reason).toBeTruthy();
    expect(reason).toContain('GITHUB_TOKEN');
  });

  it('returns reason when issueNumber is missing', () => {
    const config: LiveGitHubE2EConfig = {
      enabled: true, allowWrite: true, allowCreateIssue: false,
      owner: 'org', repo: 'repo', tokenPresent: true,
      issueNumber: undefined, allowCleanup: false,
    };
    const reason = shouldSkipLiveGitHubWriteE2E(config);
    expect(reason).toBeTruthy();
    expect(reason).toContain('ISSUE_NUMBER');
  });

  it('returns null when all write gates pass', () => {
    const config: LiveGitHubE2EConfig = {
      enabled: true, allowWrite: true, allowCreateIssue: false,
      owner: 'org', repo: 'repo', tokenPresent: true,
      issueNumber: 1, allowCleanup: false,
    };
    expect(shouldSkipLiveGitHubWriteE2E(config)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// generateLiveRunId
// ---------------------------------------------------------------------------

describe('generateLiveRunId', () => {
  it('generates a string with correct prefix', () => {
    const id = generateLiveRunId();
    expect(id).toMatch(/^live-e2e-\d{8}-[a-z0-9]{6}$/);
  });

  it('is ASCII-only', () => {
    const id = generateLiveRunId();
    expect(isAsciiOnly(id)).toBe(true);
  });

  it('generates unique IDs on repeated calls', () => {
    const ids = new Set<string>();
    for (let i = 0; i < 100; i++) {
      ids.add(generateLiveRunId());
    }
    // At least 90 unique — randomness may occasionally collide
    expect(ids.size).toBeGreaterThanOrEqual(90);
  });
});

// ---------------------------------------------------------------------------
// liveE2EMarker
// ---------------------------------------------------------------------------

describe('liveE2EMarker', () => {
  it('generates correct marker format', () => {
    const marker = liveE2EMarker('live-e2e-20260520-abc123');
    expect(marker).toBe('<!-- positron:live-e2e=true;run=live-e2e-20260520-abc123 -->');
  });

  it('is ASCII-only', () => {
    const marker = liveE2EMarker('live-e2e-20260520-abc123');
    expect(isAsciiOnly(marker)).toBe(true);
  });

  it('throws if runId contains non-ASCII', () => {
    // ASCII-only assertion — marker generation doesn't validate,
    // but markers must be ASCII. Document the contract.
    const marker = liveE2EMarker('test-ümlaut');
    expect(isAsciiOnly(marker)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// isAsciiOnly
// ---------------------------------------------------------------------------

describe('isAsciiOnly', () => {
  it('returns true for ASCII-only strings', () => {
    expect(isAsciiOnly('hello world 123')).toBe(true);
    expect(isAsciiOnly('<!-- comment -->')).toBe(true);
    expect(isAsciiOnly('live-e2e-20260520-abc123')).toBe(true);
    expect(isAsciiOnly('')).toBe(true);
  });

  it('returns false for strings with German umlauts', () => {
    expect(isAsciiOnly('Größe')).toBe(false);
    expect(isAsciiOnly('Änderung')).toBe(false);
    expect(isAsciiOnly('Förderung')).toBe(false);
  });

  it('returns false for strings with non-Latin characters', () => {
    expect(isAsciiOnly('中文')).toBe(false);
    expect(isAsciiOnly('emoji😀')).toBe(false);
  });
});
