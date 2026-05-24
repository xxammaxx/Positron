// Positron Web — API Client

import type {
  Repository,
  Issue,
  Run,
  Artifact,
  Metrics,
  HealthStatus,
  ApiError,
} from './types.js';

const BASE = '/api';

async function request<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({
      error: res.statusText,
    }))) as ApiError;
    throw new Error(err.error ?? res.statusText);
  }
  return res.json() as Promise<T>;
}

export const api = {
  // Health
  getHealth(): Promise<HealthStatus> {
    return request<HealthStatus>('/health');
  },

  // Repositories
  getRepos(): Promise<{ repos: Repository[]; total: number }> {
    return request<{ repos: Repository[]; total: number }>('/repos');
  },

  createRepo(owner: string, name: string): Promise<Repository> {
    return request<Repository>('/repos', {
      method: 'POST',
      body: JSON.stringify({ owner, name }),
    });
  },

  getRepoIssues(repoId: string): Promise<{ issues: Issue[] }> {
    return request<{ issues: Issue[] }>(`/repos/${repoId}/issues`);
  },

  // Runs
  getRuns(params?: {
    page?: number;
    limit?: number;
    repoId?: string;
  }): Promise<{ runs: Run[]; total: number }> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));
    if (params?.repoId) searchParams.set('repoId', params.repoId);
    const qs = searchParams.toString();
    return request<{ runs: Run[]; total: number }>(
      `/runs${qs ? `?${qs}` : ''}`,
    );
  },

  getRunById(id: string): Promise<Run> {
    return request<Run>(`/runs/${id}`);
  },

  startRun(
    repoId: string,
    issueNumber: number,
    autonomyLevel?: number,
  ): Promise<Run> {
    return request<Run>(`/repos/${repoId}/runs`, {
      method: 'POST',
      body: JSON.stringify({ issueNumber, autonomyLevel }),
    });
  },

  controlRun(
    runId: string,
    action: 'pause' | 'resume' | 'abort',
  ): Promise<{ success: boolean }> {
    return request<{ success: boolean }>(`/runs/${runId}/control`, {
      method: 'POST',
      body: JSON.stringify({ action }),
    });
  },

  // Gates
  approveGate(
    runId: string,
    reason?: string,
  ): Promise<{ success: boolean }> {
    return request<{ success: boolean }>(`/runs/${runId}/gate`, {
      method: 'POST',
      body: JSON.stringify({ action: 'approve', reason }),
    });
  },

  reviseGate(
    runId: string,
    reason: string,
  ): Promise<{ success: boolean }> {
    return request<{ success: boolean }>(`/runs/${runId}/gate`, {
      method: 'POST',
      body: JSON.stringify({ action: 'revise', reason }),
    });
  },

  // Artifacts
  getArtifact(
    runId: string,
    kind: 'spec' | 'plan' | 'tasks' | 'diff',
  ): Promise<Artifact> {
    return request<Artifact>(`/runs/${runId}/artifacts/${kind}`);
  },

  // Metrics
  getMetrics(): Promise<Metrics> {
    return request<Metrics>('/metrics');
  },
};
