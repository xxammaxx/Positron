// Positron — Commit & Push Policy (Issue #19)

import type { RunState } from '@positron/run-state';

/** Erlaubtes Branch-Präfix-Muster */
export const ALLOWED_BRANCH_PATTERN = /^positron\/issue-\d+/;

/** Geschützte Branches — niemals pushen */
export const PROTECTED_BRANCHES = new Set(['main', 'master', 'develop', 'staging', 'production']);

/** Blockierte Push-Flags */
export const BLOCKED_PUSH_FLAGS = new Set(['--force', '-f', '--force-with-lease', '--delete']);

// ---- Branch Guard ----

export interface BranchGuardResult {
  allowed: boolean;
  reason?: string;
}

export function guardBranch(branch: string): BranchGuardResult {
  if (!branch) return { allowed: false, reason: 'Branch name is empty' };

  if (PROTECTED_BRANCHES.has(branch)) {
    return { allowed: false, reason: `Protected branch '${branch}' cannot be pushed to` };
  }

  if (!ALLOWED_BRANCH_PATTERN.test(branch)) {
    return { allowed: false, reason: `Branch '${branch}' does not match allowed pattern: ${ALLOWED_BRANCH_PATTERN}` };
  }

  return { allowed: true };
}

// ---- Commit Message Generator ----

export interface CommitContext {
  issueNumber: number;
  runId: string;
  phase?: string;
  testResult?: string;
  prNumber?: number;
}

export function generateCommitMessage(ctx: CommitContext, customPrefix?: string): string {
  const prefix = customPrefix ?? 'feat';
  const parts: string[] = [];

  // Typ + Issue-Referenz
  parts.push(`${prefix}(issue-${ctx.issueNumber}): Positron automated changes`);

  // Run Metadata
  const meta: string[] = [];
  if (ctx.phase) meta.push(`Phase: ${ctx.phase}`);
  if (ctx.testResult) meta.push(`Tests: ${ctx.testResult}`);
  if (ctx.prNumber) meta.push(`PR: #${ctx.prNumber}`);
  parts.push(`[${meta.join(', ')}]`);

  // Run ID
  parts.push(`Run: ${ctx.runId.slice(0, 8)}`);

  const msg = parts.join(' ');

  // Max 72 Zeichen pro Zeile für Konvention
  if (msg.length > 72) {
    return `${parts[0]}\n\n${parts.slice(1).join(' ')}`;
  }

  return msg;
}

// ---- Diff Summary ----

export interface DiffSummary {
  filesChanged: number;
  insertions: number;
  deletions: number;
  raw: string;
  truncated: boolean;
}

// ---- Push Policy ----

export interface PushPolicyResult {
  allowed: boolean;
  reason?: string;
}

export function evaluatePushPolicy(branch: string, isForce: boolean, allowFlag: boolean): PushPolicyResult {
  // 1. Nur mit Allow-Flag
  if (!allowFlag) {
    return { allowed: false, reason: 'Push disabled: POSITRON_ENABLE_PUSH not set to true' };
  }

  // 2. Branch validieren
  const branchGuard = guardBranch(branch);
  if (!branchGuard.allowed) {
    return { allowed: false, reason: branchGuard.reason };
  }

  // 3. Kein --force
  if (isForce) {
    return { allowed: false, reason: 'Force push is blocked' };
  }

  return { allowed: true };
}

// ---- Branch Name Validation ----

export function isValidPositronBranch(branch: string): boolean {
  return ALLOWED_BRANCH_PATTERN.test(branch) && !PROTECTED_BRANCHES.has(branch);
}
