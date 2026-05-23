// Positron — GitHub Status Synchronization: Templates mit Markern

import type { TestReport } from '@positron/sandbox';
import type { EvidenceItem, SafeLlmRunMetadata } from './sync-types.js';

/** Erzeugt einen maschinenlesbaren Marker für Deduplizierung */
export function syncMarker(runId: string, phase: string, kind: string): string {
  return `<!-- positron:run=${runId};phase=${phase};kind=${kind} -->`;
}

export function renderSyncAccepted(runId: string, issueNumber: number, branchName?: string): string {
  return [
    syncMarker(runId, 'CLAIMED', 'accepted'),
    '',
    '## Positron Run Accepted',
    '',
    `**Run ID:** \`${runId}\``,
    `**Issue:** #${issueNumber}`,
    `**Status:** Running`,
    branchName ? `**Branch:** \`${branchName}\`` : '',
    '',
    '### Next step',
    'Repository workspace preparation.',
  ].filter(l => l !== '').join('\n');
}

export function renderSyncPhaseUpdate(runId: string, phase: string, status: string, message: string): string {
  return [
    syncMarker(runId, phase, 'phase-update'),
    '',
    '## Positron Run Update',
    '',
    `**Run ID:** \`${runId}\``,
    `**Phase:** \`${phase}\``,
    `**Status:** \`${status}\``,
    '',
    message,
  ].join('\n');
}

export function renderSyncTestReport(runId: string, report: TestReport, branchName?: string): string {
  const cmdRows = report.commands.map(c => {
    const name = c.command.scriptName ?? `${c.command.command} ${c.command.args.join(' ')}`;
    return `| \`${name}\` | ${c.exitCode ?? '-'} | ${(c.durationMs / 1000).toFixed(1)}s | ${c.status} |`;
  }).join('\n');

  return [
    syncMarker(runId, 'TEST', 'test-report'),
    '',
    '## Positron Test Report',
    '',
    `**Run ID:** \`${runId}\``,
    `**Status:** ${report.status}`,
    '',
    '### Commands',
    '| Kind | Command | Exit Code | Duration | Result |',
    '|---|---:|---:|---|',
    cmdRows,
    '',
    '### Summary',
    report.summary,
    '',
    '### Evidence',
    report.artifactPath ? `- Test report: \`${report.artifactPath}\`` : '',
    branchName ? `- Branch: \`${branchName}\`` : '',
  ].join('\n');
}

export function renderSyncBlocked(runId: string, phase: string, reason: string, evidence?: string): string {
  const lines = [
    syncMarker(runId, phase, 'blocked'),
    '',
    '## Positron Blocked',
    '',
    `**Run ID:** \`${runId}\``,
    `**Phase:** \`${phase}\``,
    `**Reason:** ${reason}`,
  ];
  if (evidence) {
    lines.push('', '### Evidence', evidence);
  }
  lines.push('', 'Manual intervention required before continuing.');
  return lines.join('\n');
}

export function renderSyncFailed(runId: string, phase: string, reason: string, evidence?: string): string {
  const lines = [
    syncMarker(runId, phase, 'failed'),
    '',
    '## Positron Failed',
    '',
    `**Run ID:** \`${runId}\``,
    `**Phase:** \`${phase}\``,
    `**Reason:** ${reason}`,
  ];
  if (evidence) {
    lines.push('', '### Evidence', evidence);
  }
  lines.push('', 'The run did not complete successfully.');
  return lines.join('\n');
}

export function renderSyncDone(runId: string, evidence?: string, branchName?: string): string {
  const lines = [
    syncMarker(runId, 'DONE', 'done'),
    '',
    '## Positron Done',
    '',
    `**Run ID:** \`${runId}\``,
    `**Status:** Completed`,
  ];
  if (evidence) lines.push('', '### Evidence', evidence);
  if (branchName) lines.push(`- Branch: \`${branchName}\``);
  lines.push('', '### Result', 'The issue run completed successfully.');
  return lines.join('\n');
}

/** Kürzt zu lange Kommentare (GitHub-Limit ~65k) */
export function truncateComment(body: string, maxLength = 25_000): string {
  if (body.length <= maxLength) return body;
  return body.slice(0, maxLength) + '\n\n_Output truncated. Full artifact stored locally._';
}

/** Rendert Evidence-Items als Markdown-Tabelle für GitHub-Kommentare */
export function renderEvidenceSection(evidence: EvidenceItem[], runId: string): string {
  if (evidence.length === 0) return '';

  const rows = evidence.map(item => {
    const statusEmoji = item.status === 'pass' ? ':white_check_mark:'
      : item.status === 'fail' ? ':x:'
      : item.status === 'blocked' ? ':no_entry:'
      : item.status === 'partial' ? ':warning:'
      : ':grey_question:';
    return `| ${statusEmoji} | \`${item.kind}\` | ${item.summary} |`;
  }).join('\n');

  return [
    syncMarker(runId, 'EVIDENCE', 'evidence-section'),
    '',
    '## Evidence',
    '',
    '| Status | Kind | Summary |',
    '|--------|------|---------|',
    rows,
  ].join('\n');
}

/** Rendert sichere LLM-Metadaten als Markdown für GitHub-Kommentare.
 *  Keine vollständigen Prompts, keine Secrets, keine erfundenen Provider/Modelle. */
export function renderLlmMetadataSection(metadata: SafeLlmRunMetadata[], runId: string): string {
  if (metadata.length === 0) return '';

  const rows = metadata.map(m => {
    const providerDisplay = m.provider ?? '_unknown_';
    const modelDisplay = m.model ?? '_unknown_';
    const tokens = m.promptTokens !== undefined && m.completionTokens !== undefined
      ? `${m.promptTokens} / ${m.completionTokens}`
      : '_unknown_';
    const promptHash = m.promptHash ? `\`${m.promptHash.slice(0, 12)}\`` : '_n/a_';
    const role = m.agentRole ? `\`${m.agentRole}\`` : '_n/a_';
    return `| ${providerDisplay} | ${modelDisplay} | ${promptHash} | ${tokens} | ${role} |`;
  }).join('\n');

  return [
    syncMarker(runId, 'LLM_METADATA', 'llm-metadata'),
    '',
    '## LLM Run Metadata',
    '',
    '| Provider | Model | Prompt Hash | Tokens (in/out) | Role |',
    '|----------|-------|-------------|-----------------|------|',
    rows,
    '',
    '_No full prompts or secrets are included in this report._',
  ].join('\n');
}

/** Renderer für PR-Erstellungs-Kommentar (Issue #17) */
export function renderSyncPrCreated(
  runId: string, prNumber?: number, prUrl?: string,
  branchName?: string, issueNumber?: number,
): string {
  const header = [
    syncMarker(runId, 'PR_CREATE', 'pr-created'),
    '',
    '## Pull Request Created',
    '',
  ];

  if (prUrl && prNumber) {
    header.push(`**Pull Request:** [#${prNumber}](${prUrl})`);
  } else if (prUrl) {
    header.push(`**Pull Request:** ${prUrl}`);
  }
  if (branchName) {
    header.push(`**Branch:** \`${branchName}\``);
  }
  if (issueNumber) {
    header.push(`**Closes:** #${issueNumber}`);
  }

  header.push('');
  header.push('---');
  header.push('');

  return header.join('\n');
}

/** Renderer für Merge-Kommentar (Issue #20) */
export function renderSyncMerged(
  runId: string, prNumber?: number, prUrl?: string, mergeSha?: string,
): string {
  return [
    syncMarker(runId, 'MERGED', 'merged'),
    '',
    '## Pull Request Merged',
    '',
    prUrl && prNumber ? `**Pull Request:** [#${prNumber}](${prUrl})` : '',
    mergeSha ? `**Merge SHA:** \`${mergeSha.slice(0, 7)}\`` : '',
    '',
    '---',
    '',
  ].filter(Boolean).join('\n');
}
