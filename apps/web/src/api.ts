// Positron Web UI — API Client
import type { RepoInfo, GitHubIssueSummary, RunRecord, RunDetail, HealthStatus } from './types.js';

const BASE = '/api';

async function fetchJSON<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json() as Promise<T>;
}

export async function registerRepo(): Promise<RepoInfo> {
  return fetchJSON<RepoInfo>(`${BASE}/repos`, { method: 'POST' });
}

export async function listIssues(repoId: string): Promise<GitHubIssueSummary[]> {
  const data = await fetchJSON<{ issues: GitHubIssueSummary[] }>(`${BASE}/repos/${repoId}/issues`);
  return data.issues;
}

export async function startRun(repoId: string, issueNumber: number): Promise<RunDetail> {
  return fetchJSON<RunDetail>(`${BASE}/repos/${repoId}/runs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ issueNumber, autonomyLevel: 2 }),
  });
}

export async function listRuns(): Promise<RunRecord[]> {
  const data = await fetchJSON<{ runs: RunRecord[] }>(`${BASE}/runs`);
  return data.runs;
}

export async function getRunDetail(runId: string): Promise<RunDetail> {
  return fetchJSON<RunDetail>(`${BASE}/runs/${runId}`);
}

export async function checkHealth(): Promise<HealthStatus> {
  return fetchJSON<HealthStatus>(`${BASE}/health`);
}
