import { describe, it, expect } from 'vitest';
import {
  loadLiveGitHubE2EConfig,
  shouldSkipLiveGitHubE2E,
  shouldSkipLiveGitHubWriteE2E,
  generateLiveRunId,
  liveE2EMarker,
  isAsciiOnly,
} from '../live-e2e.js';

// ==============================
// loadLiveGitHubE2EConfig
// ==============================

describe('loadLiveGitHubE2EConfig', () => {
  it('should return config when all required vars are set', () => {
    const config = loadLiveGitHubE2EConfig({
      GITHUB_TOKEN: 'ghp_test123',
      POSITRON_REPO_OWNER: 'testuser',
      POSITRON_REPO_NAME: 'testrepo',
    });
    expect(config).not.toBeNull();
    expect(config!.owner).toBe('testuser');
    expect(config!.repo).toBe('testrepo');
    expect(config!.token).toBe('ghp_test123');
    expect(config!.allowWrite).toBe(false);
  });

  it('should return null when token is missing', () => {
    const config = loadLiveGitHubE2EConfig({
      POSITRON_REPO_OWNER: 'testuser',
      POSITRON_REPO_NAME: 'testrepo',
    });
    expect(config).toBeNull();
  });

  it('should return null when owner is missing', () => {
    const config = loadLiveGitHubE2EConfig({
      GITHUB_TOKEN: 'ghp_test123',
      POSITRON_REPO_NAME: 'testrepo',
    });
    expect(config).toBeNull();
  });

  it('should return null when repo is missing', () => {
    const config = loadLiveGitHubE2EConfig({
      GITHUB_TOKEN: 'ghp_test123',
      POSITRON_REPO_OWNER: 'testuser',
    });
    expect(config).toBeNull();
  });

  it('should set allowWrite when POSITRON_LIVE_TEST_ALLOW_WRITE=true', () => {
    const config = loadLiveGitHubE2EConfig({
      GITHUB_TOKEN: 'ghp_test123',
      POSITRON_REPO_OWNER: 'testuser',
      POSITRON_REPO_NAME: 'testrepo',
      POSITRON_LIVE_TEST_ALLOW_WRITE: 'true',
    });
    expect(config!.allowWrite).toBe(true);
  });

  it('should set allowWrite=false when env var is not "true"', () => {
    const config = loadLiveGitHubE2EConfig({
      GITHUB_TOKEN: 'ghp_test123',
      POSITRON_REPO_OWNER: 'testuser',
      POSITRON_REPO_NAME: 'testrepo',
      POSITRON_LIVE_TEST_ALLOW_WRITE: 'false',
    });
    expect(config!.allowWrite).toBe(false);
  });
});

// ==============================
// shouldSkipLiveGitHubE2E
// ==============================

describe('shouldSkipLiveGitHubE2E', () => {
  it('should return true when env var is not set', () => {
    expect(shouldSkipLiveGitHubE2E({})).toBe(true);
  });

  it('should return true when env var is not "true"', () => {
    expect(shouldSkipLiveGitHubE2E({ POSITRON_ENABLE_LIVE_GITHUB_TESTS: 'false' })).toBe(true);
    expect(shouldSkipLiveGitHubE2E({ POSITRON_ENABLE_LIVE_GITHUB_TESTS: '1' })).toBe(true);
  });

  it('should return false when env var is "true"', () => {
    expect(shouldSkipLiveGitHubE2E({ POSITRON_ENABLE_LIVE_GITHUB_TESTS: 'true' })).toBe(false);
  });
});

// ==============================
// shouldSkipLiveGitHubWriteE2E
// ==============================

describe('shouldSkipLiveGitHubWriteE2E', () => {
  it('should return true when env var is not set', () => {
    expect(shouldSkipLiveGitHubWriteE2E({})).toBe(true);
  });

  it('should return true when env var is not "true"', () => {
    expect(shouldSkipLiveGitHubWriteE2E({ POSITRON_LIVE_TEST_ALLOW_WRITE: 'false' })).toBe(true);
  });

  it('should return false when env var is "true"', () => {
    expect(shouldSkipLiveGitHubWriteE2E({ POSITRON_LIVE_TEST_ALLOW_WRITE: 'true' })).toBe(false);
  });
});

// ==============================
// generateLiveRunId
// ==============================

describe('generateLiveRunId', () => {
  it('should start with "live-"', () => {
    const id = generateLiveRunId();
    expect(id).toMatch(/^live-/);
  });

  it('should contain a UUID fragment after "live-"', () => {
    const id = generateLiveRunId();
    const uuidPart = id.replace('live-', '');
    expect(uuidPart).toMatch(/^[0-9a-f]{8}$/);
  });

  it('should have total length 13 (live- + 8 hex chars)', () => {
    const id = generateLiveRunId();
    expect(id.length).toBe(13);
  });

  it('should generate unique IDs', () => {
    const ids = new Set<string>();
    for (let i = 0; i < 10; i++) {
      ids.add(generateLiveRunId());
    }
    expect(ids.size).toBe(10);
  });
});

// ==============================
// liveE2EMarker
// ==============================

describe('liveE2EMarker', () => {
  it('should return HTML comment marker', () => {
    const marker = liveE2EMarker('test-run-1');
    expect(marker).toBe('<!-- positron:live-e2e:test-run-1 -->');
  });

  it('should include the runId in the marker', () => {
    const marker = liveE2EMarker('custom-id');
    expect(marker).toContain('custom-id');
    expect(marker).toMatch(/^<!-- /);
    expect(marker).toMatch(/ -->$/);
  });
});

// ==============================
// isAsciiOnly
// ==============================

describe('isAsciiOnly', () => {
  it('should return true for ASCII string', () => {
    expect(isAsciiOnly('Hello, World!')).toBe(true);
    expect(isAsciiOnly('Test 123')).toBe(true);
    expect(isAsciiOnly('')).toBe(true);
  });

  it('should return true for all printable ASCII', () => {
    const ascii = ' !"#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~';
    expect(isAsciiOnly(ascii)).toBe(true);
  });

  it('should return false for non-ASCII (German umlaut)', () => {
    expect(isAsciiOnly('Über')).toBe(false);
  });

  it('should return false for emoji', () => {
    expect(isAsciiOnly('Hello 🎉')).toBe(false);
  });

  it('should return false for Chinese characters', () => {
    expect(isAsciiOnly('你好')).toBe(false);
  });
});
