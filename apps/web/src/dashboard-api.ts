// Operator Dashboard — Enhanced API (Issue #28)
import type { RunRecord, RunDetail, RunDetailWithMeta, HealthStatus, SafetyState, EvidenceItem, PullRequestRef, TestSummary, RunEvent } from './types.js';
import type { AdapterHealth, MergeGateStatus } from './dashboard-types.js';

const BASE = '/api';

async function fetchJSON<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json() as Promise<T>;
}

export async function registerRepo() {
  return fetchJSON<{ id: string; status: string; mode: string }>(`${BASE}/repos`, { method: 'POST' });
}

export async function listIssues(repoId: string) {
  const d = await fetchJSON<{ issues: any[] }>(`${BASE}/repos/${repoId}/issues`);
  return d.issues;
}

export async function startRun(repoId: string, issueNumber: number) {
  return fetchJSON<RunDetail>(`${BASE}/repos/${repoId}/runs`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ issueNumber, autonomyLevel: 2 }),
  });
}

export async function listRuns() {
  const d = await fetchJSON<{ runs: RunRecord[] }>(`${BASE}/runs`);
  return d.runs;
}

export async function getRunDetail(runId: string) {
  const detail = await fetchJSON<RunDetail>(`${BASE}/runs/${runId}`);
  return enrichDetail(detail);
}

export async function checkHealth() {
  return fetchJSON<HealthStatus>(`${BASE}/health`);
}

export async function getAdapterHealth() {
  return fetchJSON<AdapterHealth>(`${BASE}/adapters/health`);
}

export async function getMergeStatus(runId: string) {
  return fetchJSON<MergeGateStatus>(`${BASE}/runs/${runId}/merge-status`);
}

export async function getSafetyState() {
  return fetchJSON<SafetyState>(`${BASE}/safety`);
}

export async function controlRun(runId: string, action: 'pause' | 'abort' | 'resume' | 'retry') {
  return fetchJSON<{ ok: boolean; action: string; runId: string }>(`${BASE}/runs/${runId}/control`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action }),
  });
}

/**
 * Enrich run detail with meta info extracted from events.
 * This avoids backend changes — we parse structured data from event messages.
 */
export function enrichDetail(detail: RunDetail): RunDetailWithMeta {
  const { run, events } = detail;

  // Extract PR reference from events
  const pr = extractPR(events);

  // Extract test summary
  const testReport = extractTestReport(events);

  // Build evidence from events
  const evidence = buildEvidenceFromEvents(run, events);

  // Build sync status from events that mention GitHub sync
  const syncComments = extractSyncStatus(events);

  return { ...detail, pr, testReport, evidence, syncComments };
}

/** Extract PR number and URL from event messages like "PR #5 created: https://..." */
function extractPR(events: RunEvent[]): PullRequestRef | null {
  for (const ev of events) {
    const match = ev.message.match(/PR\s+#(\d+)\s+created:\s+(https?:\/\/\S+)/);
    if (match) {
      return { number: parseInt(match[1], 10), url: match[2] };
    }
    // Also check for merge event mentions
    const mergeMatch = ev.message.match(/PR\s+#(\d+)\s+merged:\s+(https?:\/\/\S+)/);
    if (mergeMatch) {
      return { number: parseInt(mergeMatch[1], 10), url: mergeMatch[2] };
    }
  }
  return null;
}

/** Extract test summary from TEST phase events */
function extractTestReport(events: RunEvent[]): TestSummary | null {
  const testEvents = events.filter(e => e.phase === 'TEST');
  if (testEvents.length === 0) return null;

  // Determine status from events
  const hasError = testEvents.some(e => e.level === 'ERROR');
  const lastMsg = testEvents[testEvents.length - 1]?.message ?? '';

  return {
    status: hasError ? 'FAIL' : 'PASS',
    summary: lastMsg,
    total: testEvents.length,
  };
}

/** Build evidence items from run state and events */
function buildEvidenceFromEvents(run: RunRecord, events: RunEvent[]): EvidenceItem[] {
  const items: EvidenceItem[] = [];

  // Phase reached = evidence
  const phasesReached = new Set(events.map(e => e.phase));
  for (const phase of phasesReached) {
    const hasError = events.some(e => e.phase === phase && e.level === 'ERROR');
    items.push({
      kind: `phase:${phase}`,
      status: hasError ? 'fail' : 'pass',
      summary: `Phase ${phase} ${hasError ? 'failed' : 'completed'}`,
    });
  }

  // Branch evidence
  if (run.branch) {
    items.push({ kind: 'branch', status: 'pass', summary: `Branch: ${run.branch}` });
  }

  // Test evidence
  const testEvents = events.filter(e => e.phase === 'TEST');
  if (testEvents.length > 0) {
    const pass = testEvents.some(e => e.message.includes('PASS'));
    items.push({
      kind: 'test',
      status: pass ? 'pass' : 'fail',
      summary: pass ? 'Tests passed' : 'Tests had issues',
    });
  }

  return items;
}

/** Extract GitHub sync status from events mentioning "GitHub sync" */
function extractSyncStatus(events: RunEvent[]): { phase: string; status: string; timestamp: string }[] {
  return events
    .filter(e => e.message.toLowerCase().includes('sync'))
    .map(e => ({
      phase: e.phase,
      status: e.level === 'ERROR' ? 'failed' : e.level === 'WARN' ? 'warn' : 'ok',
      timestamp: e.createdAt,
    }));
}
