// Positron — Test Report Templates

import type { TestReport, TestCommandExecutionResult } from './test-runner.js';

export function renderTestReportMarkdown(report: TestReport): string {
  const lines = [
    '# Positron Test Report',
    '',
    `**Status:** ${report.status}`,
    '',
    `**Run ID:** \`${report.runId}\``,
    `**Workspace:** \`${report.workspacePath}\``,
    `**Gestartet:** ${report.startedAt}`,
    `**Beendet:** ${report.finishedAt}`,
    '',
    '## Summary',
    report.summary,
    '',
    '## Commands',
    '',
    '| Kind | Command | Exit Code | Duration | Status |',
    '|---|---:|---:|---|',
  ];

  for (const c of report.commands) {
    lines.push(`| ${c.command.kind} | \`${c.command.scriptName ?? c.command.command}\` | ${c.exitCode ?? '-'} | ${(c.durationMs / 1000).toFixed(1)}s | ${c.status} |`);
  }

  if (report.blockedReasons.length > 0) {
    lines.push('', '## Blocked Reasons');
    for (const r of report.blockedReasons) {
      lines.push(`- ${r}`);
    }
  }

  if (report.artifactPath) {
    lines.push('', '## Evidence', `- **Test report:** ${report.artifactPath}`);
  }

  return lines.join('\n');
}

export function renderTestReportComment(report: TestReport): string {
  const lines = [
    '## Positron Test Report',
    '',
    `**Status:** ${report.status}`,
    '',
    '### Commands',
    '| Command | Exit Code | Duration | Result |',
    '|---|---:|---:|---|',
  ];

  for (const c of report.commands) {
    const name = c.command.scriptName ?? `${c.command.command} ${c.command.args.join(' ')}`;
    lines.push(`| \`${name}\` | ${c.exitCode ?? '-'} | ${(c.durationMs / 1000).toFixed(1)}s | ${c.status} |`);
  }

  if (report.artifactPath) {
    lines.push('', '### Evidence', `- Test report: \`${report.artifactPath}\``);
  }

  return lines.join('\n');
}
