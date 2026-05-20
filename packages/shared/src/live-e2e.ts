// Positron — Live E2E Test Configuration (Issue #13)

/**
 * Configuration for live GitHub E2E tests.
 * All fields default to safe (disabled) values.
 */
export interface LiveGitHubE2EConfig {
  /** Master enable gate: POSITRON_ENABLE_LIVE_GITHUB_TESTS */
  enabled: boolean;
  /** Write operations gate: POSITRON_LIVE_TEST_ALLOW_WRITE */
  allowWrite: boolean;
  /** Issue creation gate: POSITRON_LIVE_TEST_ALLOW_CREATE_ISSUE */
  allowCreateIssue: boolean;
  /** Target repository owner: POSITRON_TEST_OWNER */
  owner: string;
  /** Target repository name: POSITRON_TEST_REPO */
  repo: string;
  /** Existing test issue number: POSITRON_TEST_ISSUE_NUMBER */
  issueNumber?: number;
  /** Whether a GitHub token is present: GITHUB_TOKEN */
  tokenPresent: boolean;
  /** Cleanup gate: POSITRON_LIVE_TEST_ALLOW_CLEANUP */
  allowCleanup: boolean;
}

/**
 * Load the live E2E configuration from environment variables.
 * Returns a safe-by-default config — everything disabled unless
 * explicitly enabled via environment flags.
 */
export function loadLiveGitHubE2EConfig(env: Record<string, string | undefined> = process.env): LiveGitHubE2EConfig {
  return {
    enabled: env['POSITRON_ENABLE_LIVE_GITHUB_TESTS'] === 'true',
    allowWrite: env['POSITRON_LIVE_TEST_ALLOW_WRITE'] === 'true',
    allowCreateIssue: env['POSITRON_LIVE_TEST_ALLOW_CREATE_ISSUE'] === 'true',
    owner: env['POSITRON_TEST_OWNER'] ?? '',
    repo: env['POSITRON_TEST_REPO'] ?? '',
    issueNumber: env['POSITRON_TEST_ISSUE_NUMBER']
      ? parseInt(env['POSITRON_TEST_ISSUE_NUMBER'], 10)
      : undefined,
    tokenPresent: typeof env['GITHUB_TOKEN'] === 'string' && env['GITHUB_TOKEN'].length > 0,
    allowCleanup: env['POSITRON_LIVE_TEST_ALLOW_CLEANUP'] === 'true',
  };
}

/**
 * Determine if live GitHub E2E tests should be skipped.
 *
 * @returns A skip reason string if tests should be skipped,
 *          or `null` if tests can proceed.
 */
export function shouldSkipLiveGitHubE2E(config: LiveGitHubE2EConfig): string | null {
  if (!config.enabled) {
    return 'POSITRON_ENABLE_LIVE_GITHUB_TESTS is not set to "true"';
  }
  if (!config.tokenPresent) {
    return 'GITHUB_TOKEN is not set';
  }
  if (!config.owner || !config.repo) {
    return 'POSITRON_TEST_OWNER and POSITRON_TEST_REPO must both be set';
  }
  return null;
}

/**
 * Determine if live GitHub E2E **write** tests should be skipped.
 * Write tests require all read gates PLUS the allowWrite flag.
 *
 * @returns A skip reason string or `null` if write tests can proceed.
 */
export function shouldSkipLiveGitHubWriteE2E(config: LiveGitHubE2EConfig): string | null {
  const readSkip = shouldSkipLiveGitHubE2E(config);
  if (readSkip) return readSkip;
  if (!config.allowWrite) {
    return 'POSITRON_LIVE_TEST_ALLOW_WRITE is not set to "true"';
  }
  if (config.issueNumber === undefined) {
    return 'POSITRON_TEST_ISSUE_NUMBER must be set for write tests';
  }
  return null;
}

/**
 * Generate a unique, machine-readable live test run ID.
 *
 * Format: `live-e2e-YYYYMMDD-<6-char-random>`
 * The random component uses lowercase alphanumeric characters.
 * Guaranteed ASCII-only, safe for HTML comment markers.
 */
export function generateLiveRunId(): string {
  const now = new Date();
  const datePart = now.toISOString().slice(0, 10).replace(/-/g, '');
  const randomPart = Math.random().toString(36).slice(2, 8);
  return `live-e2e-${datePart}-${randomPart}`;
}

/**
 * Live test comment marker.
 * Must be included in every comment written by live tests.
 * Guaranteed ASCII-only for reliable machine parsing.
 */
export function liveE2EMarker(runId: string): string {
  return `<!-- positron:live-e2e=true;run=${runId} -->`;
}

/**
 * Validate that a live test marker is ASCII-only.
 */
export function isAsciiOnly(value: string): boolean {
  return /^[\x20-\x7E]*$/.test(value);
}

/**
 * Live E2E test result interface.
 * Captures the outcome of a live test run for reporting.
 */
export interface LiveGitHubE2EResult {
  status: 'passed' | 'failed' | 'skipped';
  runId: string;
  issueNumber?: number;
  commentsWritten: number;
  labelsAdded: string[];
  labelsRemoved: string[];
  workspacePrepared: boolean;
  testReportStatus?: 'PASS' | 'FAIL' | 'BLOCKED';
  reason?: string;
}
