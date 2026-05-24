// Positron — GitHub Status Sync Service

import type { GitHubAdapter } from './adapter.js';
import type { GitHubIssueRef, GitHubIssueComment } from './types.js';
import type { TestReport } from '@positron/sandbox';
import type { EvidenceItem, SafeLlmRunMetadata } from './sync-types.js';
import { redactSecrets } from '@positron/shared';
import {
  renderSyncAccepted, renderSyncPhaseUpdate, renderSyncTestReport,
  renderSyncBlocked, renderSyncFailed, renderSyncDone, renderSyncPrCreated, renderSyncMerged,
  syncMarker, truncateComment,
} from './sync-templates.js';
import { getLabelsForPhase } from './label-lifecycle.js';

export type { EvidenceItem, SafeLlmRunMetadata } from './sync-types.js';

export interface GitHubStatusSyncInput {
  runId: string;
  owner: string;
  repo: string;
  issueNumber: number;
  phase: string;
  status: string;
  message?: string;
  branchName?: string;
  workspacePath?: string;
  testReport?: TestReport;
  error?: { type: string; message: string; phase?: string };
  /** Optional live-test marker prepended only for live GitHub E2E writes. */
  liveMarker?: string;
  /** Evidence-Items für den GitHub-Kommentar (Issue #13.1) */
  evidence?: EvidenceItem[];
  /** Sichere LLM-Metadaten für den GitHub-Kommentar (Issue #13.1) */
  llmMetadata?: SafeLlmRunMetadata[];
  /** PR-Nummer für PR-spezifische Syncs */
  prNumber?: number;
  /** PR URL für PR-spezifische Syncs */
  prUrl?: string;
}

export interface GitHubStatusSyncResult {
  status: 'synced' | 'skipped' | 'failed';
  labelsAdded: string[];
  labelsRemoved: string[];
  commentId?: number;
  commentUrl?: string;
  reason?: string;
}

export class GitHubStatusSyncService {
  constructor(private adapter: GitHubAdapter) {}

  private ref(input: GitHubStatusSyncInput): GitHubIssueRef {
    return { owner: input.owner, repo: input.repo, issueNumber: input.issueNumber };
  }

  /** Prüft ob ein Kommentar mit gleichem Marker bereits existiert */
  private async isDuplicate(ref: GitHubIssueRef, marker: string): Promise<boolean> {
    const comments = await this.adapter.listIssueComments(ref);
    return comments.some(c => c.body.includes(marker));
  }

  /** Schreibt Kommentar mit Deduplizierung. Erzwingt write=true für Schreiboperation */
  private async syncComment(
    input: GitHubStatusSyncInput, commentBody: string,
  ): Promise<{ commentId?: number; commentUrl?: string; skipped: boolean }> {
    const bodyWithLiveMarker = input.liveMarker
      ? `${input.liveMarker}\n\n${commentBody}`
      : commentBody;
    const marker = extractMarker(bodyWithLiveMarker);
    if (!marker) return { skipped: true };

    const isDup = await this.isDuplicate(this.ref(input), marker);
    if (isDup) return { skipped: true };

    const body = truncateComment(redactSecrets(bodyWithLiveMarker));
    const result = await this.adapter.createIssueComment(this.ref(input), body);
    return { commentId: result.id, commentUrl: result.htmlUrl, skipped: false };
  }

  /** Synchronisiert Labels gemäß Lifecycle */
  private async syncLabels(
    ref: GitHubIssueRef, phase: string, reportStatus?: string,
  ): Promise<{ added: string[]; removed: string[] }> {
    const lifecycle = getLabelsForPhase(phase, reportStatus);
    const added: string[] = [];
    const removed: string[] = [];

    for (const label of lifecycle.add) {
      try { await this.adapter.addIssueLabels(ref, [label]); added.push(label); } catch { /* toleriere */ }
    }
    for (const label of lifecycle.remove) {
      try { await this.adapter.removeIssueLabel(ref, label); removed.push(label); } catch { /* toleriere 404 */ }
    }
    return { added, removed };
  }

  async syncRunAccepted(input: GitHubStatusSyncInput): Promise<GitHubStatusSyncResult> {
    try {
      const comment = renderSyncAccepted(input.runId, input.issueNumber, input.branchName);
      const { commentId, commentUrl, skipped } = await this.syncComment(input, comment);
      const labels = await this.syncLabels(this.ref(input), 'CLAIMED');
      return { status: skipped ? 'skipped' : 'synced', labelsAdded: labels.added, labelsRemoved: labels.removed, commentId, commentUrl };
    } catch (err) {
      return { status: 'failed', labelsAdded: [], labelsRemoved: [], reason: redactSecrets(String(err)) };
    }
  }

  async syncPhaseUpdate(input: GitHubStatusSyncInput): Promise<GitHubStatusSyncResult> {
    try {
      const comment = renderSyncPhaseUpdate(input.runId, input.phase, input.status, input.message ?? '');
      const { commentId, commentUrl, skipped } = await this.syncComment(input, comment);
      return { status: skipped ? 'skipped' : 'synced', labelsAdded: [], labelsRemoved: [], commentId, commentUrl };
    } catch (err) {
      return { status: 'failed', labelsAdded: [], labelsRemoved: [], reason: redactSecrets(String(err)) };
    }
  }

  async syncTestReport(input: GitHubStatusSyncInput): Promise<GitHubStatusSyncResult> {
    try {
      const report = input.testReport;
      if (!report) return { status: 'failed', labelsAdded: [], labelsRemoved: [], reason: 'Kein TestReport' };

      const comment = renderSyncTestReport(input.runId, report, input.branchName);
      const { commentId, commentUrl, skipped } = await this.syncComment(input, comment);
      const labels = await this.syncLabels(this.ref(input), 'TEST', report.status);
      return { status: skipped ? 'skipped' : 'synced', labelsAdded: labels.added, labelsRemoved: labels.removed, commentId, commentUrl };
    } catch (err) {
      return { status: 'failed', labelsAdded: [], labelsRemoved: [], reason: redactSecrets(String(err)) };
    }
  }

  async syncBlocked(input: GitHubStatusSyncInput): Promise<GitHubStatusSyncResult> {
    try {
      const reason = input.error?.message ?? 'Run blocked';
      const comment = renderSyncBlocked(input.runId, input.phase, reason);
      const { commentId, commentUrl, skipped } = await this.syncComment(input, comment);
      const labels = await this.syncLabels(this.ref(input), 'BLOCKED');
      return { status: skipped ? 'skipped' : 'synced', labelsAdded: labels.added, labelsRemoved: labels.removed, commentId, commentUrl };
    } catch (err) {
      return { status: 'failed', labelsAdded: [], labelsRemoved: [], reason: redactSecrets(String(err)) };
    }
  }

  async syncFailed(input: GitHubStatusSyncInput): Promise<GitHubStatusSyncResult> {
    try {
      const reason = input.error?.message ?? 'Run failed';
      const comment = renderSyncFailed(input.runId, input.phase, reason);
      const { commentId, commentUrl, skipped } = await this.syncComment(input, comment);
      const labels = await this.syncLabels(this.ref(input), 'FAILED_TRANSIENT');
      return { status: skipped ? 'skipped' : 'synced', labelsAdded: labels.added, labelsRemoved: labels.removed, commentId, commentUrl };
    } catch (err) {
      return { status: 'failed', labelsAdded: [], labelsRemoved: [], reason: redactSecrets(String(err)) };
    }
  }

  async syncDone(input: GitHubStatusSyncInput): Promise<GitHubStatusSyncResult> {
    try {
      const comment = renderSyncDone(input.runId, input.testReport?.artifactPath, input.branchName);
      const { commentId, commentUrl, skipped } = await this.syncComment(input, comment);
      const labels = await this.syncLabels(this.ref(input), 'DONE');
      return { status: skipped ? 'skipped' : 'synced', labelsAdded: labels.added, labelsRemoved: labels.removed, commentId, commentUrl };
    } catch (err) {
      return { status: 'failed', labelsAdded: [], labelsRemoved: [], reason: redactSecrets(String(err)) };
    }
  }

  /** Synchronisiert PR-Erstellung: PR-Link-Kommentar + Labels */
  async syncPrCreated(input: GitHubStatusSyncInput): Promise<GitHubStatusSyncResult> {
    try {
      const comment = renderSyncPrCreated(
        input.runId, input.prNumber, input.prUrl,
        input.branchName, input.issueNumber,
      );
      const { commentId, commentUrl, skipped } = await this.syncComment(input, comment);
      const labels = await this.syncLabels(this.ref(input), 'PR_CREATED');
      return { status: skipped ? 'skipped' : 'synced', labelsAdded: labels.added, labelsRemoved: labels.removed, commentId, commentUrl };
    } catch (err) {
      return { status: 'failed', labelsAdded: [], labelsRemoved: [], reason: redactSecrets(String(err)) };
    }
  }

  async syncMerged(input: GitHubStatusSyncInput): Promise<GitHubStatusSyncResult> {
    try {
      const comment = renderSyncMerged(input.runId, input.prNumber, input.prUrl, input.branchName);
      const { commentId, commentUrl, skipped } = await this.syncComment(input, comment);
      const labels = await this.syncLabels(this.ref(input), 'MERGED');
      // GitHub-Issue nach erfolgreichem Merge schließen (Task 2)
      try {
        await this.adapter.closeIssue(input.owner, input.repo, input.issueNumber);
      } catch {
        // Issue-Close darf den Sync nicht fehlschlagen lassen
      }
      return { status: skipped ? 'skipped' : 'synced', labelsAdded: labels.added, labelsRemoved: labels.removed, commentId, commentUrl };
    } catch (err) {
      return { status: 'failed', labelsAdded: [], labelsRemoved: [], reason: redactSecrets(String(err)) };
    }
  }
}

function extractMarker(body: string): string | null {
  const m = body.match(/<!--\s*positron:run=([^;]+);phase=([^;]+);kind=([^-\s][^\s]*)\s*-->/);
  return m ? m[0] : null;
}
