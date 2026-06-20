// Positron — GitHub Sync Kommentar-Templates

import type { TestReport } from '@positron/shared';
import type { EvidenceItem, SafeLlmRunMetadata } from './sync-types.js';

/**
 * Erzeugt einen maschinenlesbaren Marker für Deduplizierung.
 */
export function syncMarker(runId: string, phase: string, kind: string): string {
	return `<!-- positron:run=${runId};phase=${phase};kind=${kind} -->`;
}

/**
 * Rendert den "Accepted"-Kommentar.
 */
export function renderSyncAccepted(
	runId: string,
	issueNumber: number,
	branchName?: string,
): string {
	const marker = syncMarker(runId, 'CLAIMED', 'accepted');
	return [
		marker,
		`## ✅ Run Accepted`,
		``,
		`**Run ID:** \`${runId}\``,
		`**Issue:** #${issueNumber}`,
		branchName ? `**Branch:** \`${branchName}\`` : null,
		``,
		`Positron hat dieses Issue übernommen.`,
		`_Automated by Positron v3.0_`,
	]
		.filter(Boolean)
		.join('\n');
}

/**
 * Rendert den Phase-Update-Kommentar.
 */
export function renderSyncPhaseUpdate(
	runId: string,
	phase: string,
	status: string,
	message: string,
): string {
	const marker = syncMarker(runId, phase, 'phase-update');
	return [
		marker,
		`## 🔄 Phase Update`,
		``,
		`**Run ID:** \`${runId}\``,
		`**Phase:** ${phase}`,
		`**Status:** ${status}`,
		message ? `**Message:** ${message}` : null,
		``,
		`_Automated by Positron v3.0_`,
	]
		.filter(Boolean)
		.join('\n');
}

/**
 * Rendert den Test-Report-Kommentar.
 */
export function renderSyncTestReport(
	runId: string,
	report: TestReport,
	branchName?: string,
): string {
	const marker = syncMarker(runId, 'TEST', 'test-report');
	const statusIcon = report.status === 'passed' ? '✅' : report.status === 'failed' ? '❌' : '⏭️';
	return [
		marker,
		`### ${statusIcon} Test Report`,
		``,
		`**Run ID:** \`${runId}\``,
		branchName ? `**Branch:** \`${branchName}\`` : null,
		``,
		`| Metric | Value |`,
		`|--------|-------|`,
		`| Status | ${report.status} |`,
		`| Passed | ${report.passed} |`,
		`| Failed | ${report.failed} |`,
		`| Total  | ${report.total} |`,
		`| Time   | ${report.durationMs}ms |`,
		``,
		`**${report.summary}**`,
		``,
		`_Automated by Positron v3.0_`,
	].join('\n');
}

/**
 * Rendert den Blocked-Kommentar.
 */
export function renderSyncBlocked(
	runId: string,
	phase: string,
	reason: string,
	evidence?: string,
): string {
	const marker = syncMarker(runId, phase, 'blocked');
	return [
		marker,
		`## 🚫 Run Blocked`,
		``,
		`**Run ID:** \`${runId}\``,
		`**Phase:** ${phase}`,
		``,
		`**Reason:** ${reason}`,
		evidence ? `\n${evidence}` : null,
		``,
		`_Automated by Positron v3.0_`,
	]
		.filter(Boolean)
		.join('\n');
}

/**
 * Rendert den Failed-Kommentar.
 */
export function renderSyncFailed(
	runId: string,
	phase: string,
	reason: string,
	evidence?: string,
): string {
	const marker = syncMarker(runId, phase, 'failed');
	return [
		marker,
		`## ❌ Run Failed`,
		``,
		`**Run ID:** \`${runId}\``,
		`**Phase:** ${phase}`,
		``,
		`**Reason:** ${reason}`,
		evidence ? `\n${evidence}` : null,
		``,
		`_Automated by Positron v3.0_`,
	]
		.filter(Boolean)
		.join('\n');
}

/**
 * Rendert den Done-Kommentar.
 */
export function renderSyncDone(runId: string, evidence?: string, branchName?: string): string {
	const marker = syncMarker(runId, 'DONE', 'done');
	return [
		marker,
		`## ✅ Run Completed`,
		``,
		`**Run ID:** \`${runId}\``,
		branchName ? `**Branch:** \`${branchName}\`` : null,
		evidence ?? '',
		``,
		`_Automated by Positron v3.0_`,
	]
		.filter(Boolean)
		.join('\n');
}

/**
 * Kürzt zu lange Kommentare (GitHub-Limit ~65k).
 */
export function truncateComment(body: string, maxLength = 64000): string {
	if (body.length <= maxLength) return body;
	return body.slice(0, maxLength) + '\n\n<!-- truncated -->';
}

/**
 * Rendert Evidence-Items als Markdown-Tabelle.
 */
export function renderEvidenceSection(evidence: EvidenceItem[], _runId: string): string {
	if (evidence.length === 0) return '';
	const rows = evidence.map((e) => {
		const icon =
			e.status === 'pass' ? '✅' : e.status === 'fail' ? '❌' : e.status === 'blocked' ? '🚫' : '⏭️';
		return `| ${e.kind} | ${icon} ${e.status} | ${e.summary} |`;
	});
	return [
		`### 📋 Evidence`,
		``,
		`| Kind | Status | Summary |`,
		`|------|--------|---------|`,
		...rows,
		``,
	].join('\n');
}

/**
 * Rendert sichere LLM-Metadaten als Markdown.
 */
export function renderLlmMetadataSection(_metadata: SafeLlmRunMetadata[], _runId: string): string {
	return '';
}

/**
 * Rendert PR-Creation-Kommentar.
 */
export function renderSyncPrCreated(
	runId: string,
	prNumber?: number,
	prUrl?: string,
	branchName?: string,
	issueNumber?: number,
): string {
	const marker = syncMarker(runId, 'PR_CREATED', 'pr-created');
	return [
		marker,
		`## 🔀 Pull Request Created`,
		``,
		`**Run ID:** \`${runId}\``,
		prNumber ? `**PR:** #${prNumber}` : null,
		prUrl ? `**URL:** ${prUrl}` : null,
		branchName ? `**Branch:** \`${branchName}\`` : null,
		issueNumber ? `**Closes:** #${issueNumber}` : null,
		``,
		`_Automated by Positron v3.0_`,
	]
		.filter(Boolean)
		.join('\n');
}

/**
 * Rendert Merge-Kommentar.
 */
export function renderSyncMerged(
	runId: string,
	prNumber?: number,
	prUrl?: string,
	branchOrSha?: string,
): string {
	const marker = syncMarker(runId, 'MERGED', 'merged');
	return [
		marker,
		`## 🎉 Pull Request Merged`,
		``,
		`**Run ID:** \`${runId}\``,
		prNumber ? `**PR:** #${prNumber}` : null,
		prUrl ? `**URL:** ${prUrl}` : null,
		branchOrSha ? `**Branch/SHA:** \`${branchOrSha}\`` : null,
		``,
		`_Automated by Positron v3.0_`,
	]
		.filter(Boolean)
		.join('\n');
}
