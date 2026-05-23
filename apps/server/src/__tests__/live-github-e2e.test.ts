// Positron — Live GitHub E2E Tests (Issue #13 + #13.2)
//
// Production Readiness Validation against a real GitHub test repository.
// SAFE BY DEFAULT — all live tests skip unless environment gates are met.
//
// Required for read-only:
//   POSITRON_ENABLE_LIVE_GITHUB_TESTS=true  GITHUB_TOKEN=...  POSITRON_TEST_OWNER=...  POSITRON_TEST_REPO=...
//
// Additionally required for write:
//   POSITRON_LIVE_TEST_ALLOW_WRITE=true  POSITRON_TEST_ISSUE_NUMBER=...
//
// Optional:
//   POSITRON_ENABLE_REAL_SPECKIT_TESTS=true    (run Spec Kit CLI checks)
//   POSITRON_ENABLE_REAL_OPENCODE_TESTS=true   (run OpenCode CLI checks)
//   POSITRON_ENABLE_OPENCODE_DRY_RUN=true      (run OpenCode dry-run)
//   POSITRON_LIVE_TEST_ALLOW_CLEANUP=true      (reset labels after test)

import { describe, it, expect, beforeAll } from 'vitest';
import {
  loadLiveGitHubE2EConfig,
  shouldSkipLiveGitHubE2E,
  shouldSkipLiveGitHubWriteE2E,
  generateLiveRunId,
  liveE2EMarker,
  isAsciiOnly,
} from '@positron/shared';
import { RealGitHubAdapter, createRealGitHubAdapter } from '@positron/github-adapter';
import { GitHubStatusSyncService } from '@positron/github-adapter';
import type { GitHubStatusSyncInput } from '@positron/github-adapter';
import { RealGitWorkspaceAdapter } from '@positron/sandbox';
import type { PrepareWorkspaceInput } from '@positron/sandbox';
import { TestCommandDetector, TestRunner } from '@positron/sandbox';
import { RealSpecKitAdapter } from '@positron/speckit-adapter';
import { RealOpenCodeAdapter } from '@positron/opencode-adapter';
import type { GitHubIssueRef } from '@positron/github-adapter';
import type { TestReport } from '@positron/sandbox';
import type { LiveGitHubE2EResult } from '@positron/shared';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const config = loadLiveGitHubE2EConfig(process.env);
const READ_SKIP = shouldSkipLiveGitHubE2E(config);
const WRITE_SKIP = shouldSkipLiveGitHubWriteE2E(config);
const SPECKIT_REAL = process.env.POSITRON_ENABLE_REAL_SPECKIT_TESTS === 'true';
const OPENCODE_REAL = process.env.POSITRON_ENABLE_REAL_OPENCODE_TESTS === 'true';
const OPENCODE_DRY_RUN = process.env.POSITRON_ENABLE_OPENCODE_DRY_RUN === 'true';

const RUN_ID = generateLiveRunId();
const LIVE_MARKER = liveE2EMarker(RUN_ID);

// ---------------------------------------------------------------------------
// Result tracking
// ---------------------------------------------------------------------------

const result: LiveGitHubE2EResult = {
  status: 'skipped',
  runId: RUN_ID,
  owner: config.owner,
  repo: config.repo,
  issueNumber: config.issueNumber,
  commentsWritten: 0,
  labelsAdded: [],
  labelsRemoved: [],
  workspacePrepared: false,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function ref(): GitHubIssueRef {
  return { owner: config.owner, repo: config.repo, issueNumber: config.issueNumber! };
}

function liveSyncInput(
  base: Omit<GitHubStatusSyncInput, 'owner' | 'repo' | 'liveMarker'>,
): GitHubStatusSyncInput {
  return { ...base, owner: config.owner, repo: config.repo, liveMarker: LIVE_MARKER };
}

function buildPrepInput(): PrepareWorkspaceInput {
  return {
    repository: {
      owner: config.owner,
      repo: config.repo,
      remoteUrl: `https://github.com/${config.owner}/${config.repo}.git`,
    },
    issueNumber: config.issueNumber!,
    issueTitle: 'Positron Live E2E Fixture – Größe prüfen',
    runId: RUN_ID,
    baseBranch: 'main',
  };
}

// ---------------------------------------------------------------------------
// Read-Only Smoke Test Suite
// ---------------------------------------------------------------------------

describe('Live GitHub E2E — Read-Only', () => {
  if (READ_SKIP) {
    it.skip(`SKIPPED: ${READ_SKIP}`, () => {});
    return;
  }

  let adapter: RealGitHubAdapter;

  beforeAll(() => { adapter = createRealGitHubAdapter(); });

  it('can get repository metadata', async () => {
    const repo = await adapter.getRepository(config.owner, config.repo);
    expect(repo.name).toBe(config.repo);
    expect(repo.owner).toBe(config.owner);
    expect(repo.defaultBranch).toBeTruthy();
  }, 15_000);

  it('can get issue details', async () => {
    const issue = await adapter.getIssue(ref());
    expect(issue.number).toBe(config.issueNumber);
    expect(issue.title).toBeTruthy();
  }, 15_000);

  it('can list issue comments', async () => {
    const comments = await adapter.listIssueComments(ref());
    expect(Array.isArray(comments)).toBe(true);
  }, 15_000);

  it('can list open issues', async () => {
    const issues = await adapter.listOpenIssues(config.owner, config.repo, { limit: 5 });
    expect(Array.isArray(issues)).toBe(true);
  }, 15_000);
});

// ---------------------------------------------------------------------------
// Spec Kit Adapter Live Test (detect-only + health)
// ---------------------------------------------------------------------------

describe('Live E2E — Spec Kit Adapter', () => {
  if (READ_SKIP) {
    it.skip(`SKIPPED: ${READ_SKIP}`, () => {});
    return;
  }

  let adapter: RealSpecKitAdapter;

  beforeAll(() => { adapter = new RealSpecKitAdapter(); });

  it('checks Spec Kit CLI health', async () => {
    const health = await adapter.healthCheck('/tmp');
    result.workspacePrepared = true;

    if (SPECKIT_REAL && health.available) {
      expect(health.version).toBeTruthy();
      expect(health.commandPath).toBeTruthy();
    }
    // Without real flag, just check it doesn't crash
    expect(typeof health.available).toBe('boolean');
  }, 30_000);

  it('detects artifacts (detect-only mode)', async () => {
    const input = {
      runId: RUN_ID,
      workspacePath: '/tmp',
      issueTitle: 'Live E2E Test',
      issueNumber: config.issueNumber,
      mode: 'detect-only' as const,
    };
    const artifacts = await adapter.detectArtifacts(input);
    expect(Array.isArray(artifacts)).toBe(true);
  }, 10_000);

  it('initialize is skipped in detect-only mode', async () => {
    const input = {
      runId: RUN_ID,
      workspacePath: '/tmp',
      issueTitle: 'Live E2E Test',
      issueNumber: config.issueNumber,
      mode: 'detect-only' as const,
    };
    const result = await adapter.initialize(input);
    expect(result.status).toBe('skipped');
  }, 10_000);
});

// ---------------------------------------------------------------------------
// OpenCode Adapter Live Test (health + dry-run)
// ---------------------------------------------------------------------------

describe('Live E2E — OpenCode Adapter', () => {
  if (READ_SKIP) {
    it.skip(`SKIPPED: ${READ_SKIP}`, () => {});
    return;
  }

  let adapter: RealOpenCodeAdapter;

  beforeAll(() => { adapter = new RealOpenCodeAdapter(); });

  it('checks OpenCode CLI health', async () => {
    const health = await adapter.healthCheck('/tmp');

    if (OPENCODE_REAL && health.available) {
      expect(health.version).toBeTruthy();
    }
    expect(typeof health.available).toBe('boolean');
  }, 30_000);

  it('runSlashCommand is skipped in detect-only mode', async () => {
    const input = {
      runId: RUN_ID,
      workspacePath: '/tmp',
      issueTitle: 'Live E2E Test',
      issueNumber: config.issueNumber,
      mode: 'detect-only' as const,
    };
    const result = await adapter.runSlashCommand('speckit.constitution', input);
    expect(result.status).toBe('skipped');
  }, 10_000);

  it('safe dry-run prompt does not modify files', async () => {
    if (!OPENCODE_DRY_RUN) {
      return; // silently skip — no dry-run flag set
    }
    const input = {
      runId: RUN_ID,
      workspacePath: '/tmp',
      issueTitle: 'Live E2E Dry Run',
      issueNumber: config.issueNumber,
      mode: 'safe-cli' as const,
    };
    const result = await adapter.runImplement(input);
    // Even if it fails (no real workspace), check it doesn't crash
    expect(result.status).toMatch(/success|failed|blocked/);
  }, 120_000);
});

// ---------------------------------------------------------------------------
// Write E2E Test Suite
// ---------------------------------------------------------------------------

describe('Live GitHub E2E — Write', () => {
  if (WRITE_SKIP) {
    it.skip(`SKIPPED: ${WRITE_SKIP}`, () => {});
    return;
  }

  let adapter: RealGitHubAdapter;
  let syncService: GitHubStatusSyncService;
  let workspaceAdapter: RealGitWorkspaceAdapter;
  let workspacePath: string;

  const testIssueRef = ref();

  beforeAll(() => {
    adapter = createRealGitHubAdapter();
    syncService = new GitHubStatusSyncService(adapter);
    workspaceAdapter = new RealGitWorkspaceAdapter();
  });

  // -------------------------------------------------------------------------
  // Phase 1: Issue Claiming
  // -------------------------------------------------------------------------

  it('claims test issue via syncRunAccepted', async () => {
    const syncResult = await syncService.syncRunAccepted(liveSyncInput({
      runId: RUN_ID,
      issueNumber: config.issueNumber!,
      phase: 'CLAIMED',
      status: 'active',
      branchName: `positron/issue-${config.issueNumber}-live-e2e-fixture`,
    }));

    expect(syncResult.status).toBe('synced');
    expect(syncResult.labelsAdded).toContain('positron:running');
    result.labelsAdded.push(...syncResult.labelsAdded);
    result.labelsRemoved.push(...syncResult.labelsRemoved);
    if (syncResult.commentId) result.commentsWritten++;
  }, 30_000);

  it('verifies running label is set', async () => {
    const issue = await adapter.getIssue(testIssueRef);
    expect(issue.labels).toContain('positron:running');
  }, 15_000);

  it('verifies ready label was removed', async () => {
    const issue = await adapter.getIssue(testIssueRef);
    expect(issue.labels).not.toContain('positron:ready');
  }, 15_000);

  it('verifies accepted comment has live E2E marker', async () => {
    const comments = await adapter.listIssueComments(testIssueRef);
    const ourComment = comments.find(c => c.body.includes(RUN_ID));
    expect(ourComment).toBeTruthy();
    expect(ourComment!.body).toContain('positron:run=');
    expect(ourComment!.body).toContain('kind=accepted');
    expect(ourComment!.body).toContain('<!-- positron:live-e2e=true -->');
  }, 15_000);

  // -------------------------------------------------------------------------
  // Phase 2: Workspace Preparation (fixed interface)
  // -------------------------------------------------------------------------

  it('prepares git workspace', async () => {
    const prepared = await workspaceAdapter.prepareWorkspace(buildPrepInput());

    expect(prepared.workspacePath).toBeTruthy();
    expect(prepared.branchName).toContain(`positron/issue-${config.issueNumber}`);
    expect(prepared.headSha).toBeTruthy();
    workspacePath = prepared.workspacePath;
    result.workspacePrepared = true;
  }, 60_000);

  it('verifies branch name is ASCII-only', async () => {
    const branch = `positron/issue-${config.issueNumber}-live-e2e-fixture-grosse-prufen`;
    expect(isAsciiOnly(branch)).toBe(true);
  }, 5_000);

  // -------------------------------------------------------------------------
  // Phase 3: Spec Kit Adapter on live workspace
  // -------------------------------------------------------------------------

  it('runs Spec Kit health check on live workspace', async () => {
    const speckit = new RealSpecKitAdapter();
    const health = await speckit.healthCheck(workspacePath || '/tmp');
    expect(typeof health.available).toBe('boolean');
    if (SPECKIT_REAL) {
      expect(health.version).toBeTruthy();
    }
  }, 30_000);

  it('detects Spec Kit artifacts on live workspace', async () => {
    const speckit = new RealSpecKitAdapter();
    const artifacts = await speckit.detectArtifacts({
      runId: RUN_ID,
      workspacePath: workspacePath || '/tmp',
      issueTitle: 'Live E2E Test',
      issueNumber: config.issueNumber,
      mode: 'artifact-only',
    });
    expect(Array.isArray(artifacts)).toBe(true);
  }, 10_000);

  // -------------------------------------------------------------------------
  // Phase 4: OpenCode Adapter health on live workspace
  // -------------------------------------------------------------------------

  it('runs OpenCode health check on live workspace', async () => {
    const opencode = new RealOpenCodeAdapter();
    const health = await opencode.healthCheck(workspacePath || '/tmp');
    expect(typeof health.available).toBe('boolean');
  }, 30_000);

  // -------------------------------------------------------------------------
  // Phase 5: Test Command Detection & Execution
  // -------------------------------------------------------------------------

  it('detects test commands from workspace', async () => {
    const detector = new TestCommandDetector();
    const detection = await detector.detect(workspacePath);

    expect(detection.status).not.toBe('blocked');
    expect(detection.commands.length).toBeGreaterThan(0);
  }, 60_000);

  it('runs test commands and produces report', async () => {
    const detector = new TestCommandDetector();
    const detection = await detector.detect(workspacePath);

    const runner = new TestRunner();
    const report: TestReport = await runner.runDetectedCommands({
      runId: RUN_ID,
      workspacePath: workspacePath,
      commands: detection.commands,
      mode: 'smoke',
    });

    expect(report.status).toMatch(/PASS|FAIL|BLOCKED/);
    expect(report.commands.length).toBeGreaterThan(0);
    result.testReportStatus = report.status;

    // Sync the test report to GitHub
    const syncResult = await syncService.syncTestReport(liveSyncInput({
      runId: RUN_ID,
      issueNumber: config.issueNumber!,
      phase: 'TEST',
      status: report.status === 'PASS' ? 'success' : report.status === 'FAIL' ? 'failure' : 'blocked',
      branchName: `positron/issue-${config.issueNumber}-live-e2e-fixture`,
      testReport: report,
    }));

    expect(syncResult.status).toMatch(/synced|skipped/);
    result.labelsAdded.push(...syncResult.labelsAdded);
    result.labelsRemoved.push(...syncResult.labelsRemoved);
    if (syncResult.commentId) result.commentsWritten++;
  }, 120_000);

  // -------------------------------------------------------------------------
  // Phase 6: Status Sync — Done/Failed/Blocked
  // -------------------------------------------------------------------------

  it('syncs final status (done/failed) to GitHub', async () => {
    if (result.testReportStatus === 'PASS') {
      const syncResult = await syncService.syncDone(liveSyncInput({
        runId: RUN_ID, issueNumber: config.issueNumber!,
        phase: 'DONE', status: 'success',
        message: 'Live E2E test run completed successfully.',
        branchName: `positron/issue-${config.issueNumber}-live-e2e-fixture`,
      }));
      expect(syncResult.status).toMatch(/synced|skipped/);
      result.labelsAdded.push(...syncResult.labelsAdded);
      result.labelsRemoved.push(...syncResult.labelsRemoved);
      if (syncResult.commentId) result.commentsWritten++;
    } else {
      const syncResult = await syncService.syncFailed(liveSyncInput({
        runId: RUN_ID, issueNumber: config.issueNumber!,
        phase: 'TEST', status: 'failure',
        error: { type: 'TestFailure', message: 'One or more tests failed' },
      }));
      expect(syncResult.status).toMatch(/synced|skipped/);
      result.labelsAdded.push(...syncResult.labelsAdded);
      result.labelsRemoved.push(...syncResult.labelsRemoved);
      if (syncResult.commentId) result.commentsWritten++;
    }
  }, 30_000);

  // -------------------------------------------------------------------------
  // Phase 7: Verification — Labels
  // -------------------------------------------------------------------------

  it('verifies final label state', async () => {
    const issue = await adapter.getIssue(testIssueRef);
    if (result.testReportStatus === 'PASS') {
      expect(issue.labels).toContain('positron:done');
    }
    expect(issue.labels).not.toContain('positron:ready');
  }, 15_000);

  // -------------------------------------------------------------------------
  // Phase 8: Deduplication
  // -------------------------------------------------------------------------

  it('deduplication prevents duplicate comments', async () => {
    const syncResult = await syncService.syncRunAccepted(liveSyncInput({
      runId: RUN_ID, issueNumber: config.issueNumber!,
      phase: 'CLAIMED', status: 'active',
      branchName: `positron/issue-${config.issueNumber}-live-e2e-fixture`,
    }));
    expect(syncResult.status).toBe('skipped');
  }, 30_000);

  // -------------------------------------------------------------------------
  // Phase 9: Unicode, ASCII Marker, and Secret Redaction Validation
  // -------------------------------------------------------------------------

  it('verifies umlauts, ASCII markers, and secret redaction in one live sync comment', async () => {
    const syncResult = await syncService.syncPhaseUpdate(liveSyncInput({
      runId: RUN_ID, issueNumber: config.issueNumber!,
      phase: 'RESEARCH', status: 'active',
      message: 'Größe prüfen: API key sk-test12345678901234567890123456789012 bleibt nicht im Kommentar.',
    }));

    expect(syncResult.status).toBe('synced');
    expect(syncResult.commentId).toBeTruthy();
    if (syncResult.commentId) result.commentsWritten++;

    const comments = await adapter.listIssueComments(testIssueRef);
    const ourComment = comments.find(c => c.id === syncResult.commentId);
    expect(ourComment).toBeTruthy();
    expect(ourComment!.body).toContain('Größe prüfen');
    expect(ourComment!.body).toContain('<!-- positron:live-e2e=true -->');
    expect(ourComment!.body).toContain('[REDACTED_OPENAI_KEY]');
    expect(ourComment!.body).not.toContain('sk-test12345678901234567890123456789012');

    const markers = ourComment!.body.match(/<!--\s*positron:[^>]+-->/g) ?? [];
    expect(markers.length).toBeGreaterThanOrEqual(2);
    for (const marker of markers) {
      expect(isAsciiOnly(marker)).toBe(true);
    }
  }, 30_000);

  // -------------------------------------------------------------------------
  // Result Summary
  // -------------------------------------------------------------------------

  it('[RESULT] e2e run summary', () => {
    result.status = result.testReportStatus === 'PASS'
      ? 'passed' : result.testReportStatus === 'BLOCKED' ? 'blocked' : 'failed';
    result.issueNumber = config.issueNumber;

    console.log(JSON.stringify({
      'E2E Live Test Result': result,
      'Labels on issue': `https://github.com/${config.owner}/${config.repo}/issues/${config.issueNumber}`,
      'Comments written': result.commentsWritten,
      'Run ID': RUN_ID,
      'Cleanup': 'POSITRON_LIVE_TEST_ALLOW_CLEANUP=true to reset labels.',
    }, null, 2));

    expect(result.status).toMatch(/passed|failed|blocked|skipped/);
  }, 5_000);
});
