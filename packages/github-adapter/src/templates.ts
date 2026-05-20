// Positron — GitHub Kommentar-Templates

/** Run Accepted — Claim-Kommentar */
export function renderAccepted(runId: string, issueNumber: number): string {
  return [
    '## Positron Run Accepted',
    '',
    `**Run ID:** \`${runId}\``,
    `**Issue:** #${issueNumber}`,
    `**Status:** GitHub issue claimed.`,
    `**Next step:** Repository context loading.`,
  ].join('\n');
}

/** Run Status-Update */
export function renderStatusUpdate(
  runId: string,
  phase: string,
  status: string,
  message: string,
): string {
  return [
    '## Positron Run Update',
    '',
    `**Run ID:** \`${runId}\``,
    `**Phase:** \`${phase}\``,
    `**Status:** \`${status}\``,
    '',
    message,
  ].join('\n');
}

/** Run Blocked */
export function renderBlocked(
  runId: string,
  phase: string,
  reason: string,
  evidence: string = '',
): string {
  const lines = [
    '## Positron Blocked',
    '',
    `**Run ID:** \`${runId}\``,
    `**Phase:** \`${phase}\``,
    `**Reason:** ${reason}`,
  ];
  if (evidence) {
    lines.push('', '### Evidence', evidence);
  }
  return lines.join('\n');
}

/** Run Done */
export function renderDone(
  runId: string,
  evidence: string = '',
): string {
  const lines = [
    '## Positron Done',
    '',
    `**Run ID:** \`${runId}\``,
    `**Status:** Completed.`,
  ];
  if (evidence) {
    lines.push('', '### Evidence', evidence);
  }
  return lines.join('\n');
}
