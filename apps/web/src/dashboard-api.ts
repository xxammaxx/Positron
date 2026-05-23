// Operator Dashboard — Enhanced API (Issue #22)
import type { RunRecord, RunDetail, HealthStatus } from './types.js';
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
  return fetchJSON<RunDetail>(`${BASE}/runs/${runId}`);
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
