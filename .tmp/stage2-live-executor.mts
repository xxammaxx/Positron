/**
 * Positron Stage 2 — Live Single Comment Executor
 *
 * Executes exactly ONE createIssueComment through the approved harness path:
 * Stage2WriteSandboxPolicy → Stage2RuntimeWriteHarness → Stage2IssueCommentWriter
 * → RealGitHubAdapter.createIssueComment()
 *
 * Reads POSITRON_STAGE2_GITHUB_TOKEN from environment (never printed/echoed).
 * Must unset after execution.
 *
 * Run: npx tsx .tmp/stage2-live-executor.mts
 */

import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { Octokit } from '@octokit/rest';
import {
  Stage2RuntimeWriteHarness,
  createStage2WriteHarness,
  RealGitHubAdapter,
} from '@positron/github-adapter';
import type {
  Stage2IssueCommentWriter,
  Stage2WriteAuditEvent,
} from '@positron/github-adapter';

// ==========================================================================
// Bridge: Wraps RealGitHubAdapter behind Stage2IssueCommentWriter interface
// ==========================================================================

class RealGitHubAdapterBridge implements Stage2IssueCommentWriter {
  private readonly adapter: RealGitHubAdapter;

  constructor(octokit: Octokit) {
    this.adapter = new RealGitHubAdapter(octokit);
  }

  async createIssueComment(input: {
    owner: string;
    repo: string;
    issueNumber: number;
    body: string;
  }): Promise<{ id?: string | number; url?: string; createdAt?: string }> {
    const result = await this.adapter.createIssueComment(
      { owner: input.owner, repo: input.repo, issueNumber: input.issueNumber },
      input.body,
    );
    return {
      id: result.id,
      url: result.htmlUrl,
      createdAt: result.createdAt,
    };
  }
}

// ==========================================================================
// Audit Sink: logs to stdout (redacted)
// ==========================================================================

const auditSink = {
  record(event: Stage2WriteAuditEvent): void {
    console.log('[AUDIT]', JSON.stringify(event));
  },
};

// ==========================================================================
// Main Execution
// ==========================================================================

async function main(): Promise<void> {
  console.log('=== Positron Stage 2 Live Single Comment Executor ===');
  console.log(`Timestamp: ${new Date().toISOString()}`);

  // --- 1. Read body ---
  const bodyText = readFileSync(
    '.tmp/stage2-single-comment-core-body.txt',
    'utf8',
  );

  // --- 2. Verify body hash ---
  const actualHash = createHash('sha256').update(bodyText, 'utf8').digest('hex');
  const expectedHash = '48be36a2eccb9dc4a1e90c336cbec0045a13e44048d56dfcac83da5d228f371e';
  console.log(`Body SHA-256 match: ${actualHash === expectedHash ? 'PASS' : 'FAIL'}`);
  console.log(`Body length: ${bodyText.length} bytes`);
  if (actualHash !== expectedHash) {
    console.error(`Hash mismatch! Expected: ${expectedHash}, Got: ${actualHash}`);
    process.exit(1);
  }

  // --- 3. Read token (never printed) ---
  const token = process.env['POSITRON_STAGE2_GITHUB_TOKEN'];
  if (!token) {
    console.error('POSITRON_STAGE2_GITHUB_TOKEN is not set');
    process.exit(1);
  }
  console.log('Token: [PRESENT, REDACTED]');

  // --- 4. Create Octokit + Adapter Bridge ---
  const octokit = new Octokit({
    auth: token,
    userAgent: 'positron-v3.0-stage2-live',
  });
  const bridge = new RealGitHubAdapterBridge(octokit);

  // --- 5. Create Harness with fakeMode=false ---
  const harness: Stage2RuntimeWriteHarness = createStage2WriteHarness({
    allowedRepository: 'xxammaxx/positron-sandbox',
    allowedIssueNumber: 1,
    adapter: bridge,
    auditSink,
    config: {
      fakeMode: false,   // REAL write
      enabled: true,
      maxWritesPerRun: 1,
    },
  });

  // --- 6. Execute ---
  console.log('\n--- Executing harness ---');
  console.log(`  Repository: xxammaxx/positron-sandbox`);
  console.log(`  Issue: #1`);
  console.log(`  Operation: createIssueComment`);
  console.log(`  Idempotency Key: e2cab0b797a942a0`);
  console.log(`  Body SHA-256: ${actualHash}`);
  console.log(`  Mode: LIVE (fakeMode=false)`);

  const result = await harness.execute({
    repository: 'xxammaxx/positron-sandbox',
    issueNumber: 1,
    operation: 'createIssueComment',
    bodyText,
    idempotencyKey: 'e2cab0b797a942a0',
    humanApproved: true,
    previewGenerated: true,
    expectedBodyHash: actualHash,
    pushEnabled: false,
    mergeKillSwitchActive: true,
  });

  // --- 7. Report result (no tokens) ---
  console.log('\n--- Harness Result ---');
  console.log(`  success: ${result.success}`);
  console.log(`  policyAllowed: ${result.policyAllowed}`);
  console.log(`  writeExecuted: ${result.writeExecuted}`);
  console.log(`  mode: ${result.mode}`);
  console.log(`  writeCount: ${result.writeCount}`);
  if (result.reason) {
    console.log(`  reason: ${result.reason}`);
  }
  if (result.commentResult) {
    console.log(`  commentId: ${result.commentResult.id}`);
    console.log(`  commentUrl: ${result.commentResult.url}`);
    console.log(`  commentCreatedAt: ${result.commentResult.createdAt}`);
  }
  if (result.auditEvent) {
    console.log(`  auditTokenValue: ${result.auditEvent.tokenValue}`);
    console.log(`  auditResult: ${result.auditEvent.result}`);
  }

  // --- 8. Final status ---
  const exitCode = result.success && result.writeExecuted ? 0 : 1;
  console.log(`\nExit code: ${exitCode}`);
  process.exit(exitCode);
}

main().catch((err: unknown) => {
  const msg = err instanceof Error ? err.message : String(err);
  console.error('FATAL:', msg);
  process.exit(1);
});
