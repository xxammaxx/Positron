// Positron — GitHub Kommentar-Templates

/**
 * Rendert einen "Issue accepted"-Kommentar.
 */
export function renderAccepted(runId: string, issueNumber: number, branchName?: string): string {
  return [
    `## ✅ Positron accepted this issue`,
    ``,
    `**Run ID:** \`${runId}\``,
    `**Issue:** #${issueNumber}`,
    branchName ? `**Branch:** \`${branchName}\`` : null,
    ``,
    `_Automated by Positron v3.0_`,
  ].filter(Boolean).join('\n');
}

/**
 * Rendert einen Status-Update-Kommentar.
 */
export function renderStatusUpdate(runId: string, phase: string, status: string, branchName?: string): string {
  return [
    `## 🔄 Positron Status Update`,
    ``,
    `**Run ID:** \`${runId}\``,
    `**Phase:** ${phase}`,
    `**Status:** ${status}`,
    branchName ? `**Branch:** \`${branchName}\`` : null,
    ``,
    `_Automated by Positron v3.0_`,
  ].filter(Boolean).join('\n');
}

/**
 * Rendert einen Blocked-Kommentar.
 */
export function renderBlocked(runId: string, reason: string): string {
  return [
    `## 🚫 Positron blocked`,
    ``,
    `**Run ID:** \`${runId}\``,
    ``,
    `**Reason:** ${reason}`,
    ``,
    `_Automated by Positron v3.0_`,
  ].join('\n');
}

/**
 * Rendert einen Done-Kommentar.
 */
export function renderDone(runId: string, summary: string, branchName?: string): string {
  return [
    `## ✅ Positron completed`,
    ``,
    `**Run ID:** \`${runId}\``,
    branchName ? `**Branch:** \`${branchName}\`` : null,
    ``,
    summary,
    ``,
    `_Automated by Positron v3.0_`,
  ].filter(Boolean).join('\n');
}
