// Positron — GitHub Status Synchronization: Templates mit Markern

import type { TestReport } from '@positron/sandbox';

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
