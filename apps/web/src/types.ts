// Positron Web UI — Frontend Types

export interface RunRecord {
  id: string;
  repoId: string;
  issueNumber: number;
  branch: string | null;
  phase: string;
  status: string;
  autonomyLevel: number;
  attempt: number;
  startedAt: string;
  finishedAt: string | null;
}

export interface RunEvent {
  id: string;
  runId: string;
  phase: string;
  level: 'INFO' | 'WARN' | 'ERROR';
  message: string;
  createdAt: string;
}

export interface RunDetail {
  run: RunRecord;
  events: RunEvent[];
}

export interface GitHubIssueSummary {
  number: number;
  title: string;
  state: string;
  labels: string[];
  htmlUrl: string;
  updatedAt: string;
}

export interface RepoInfo {
  id: string;
  status: string;
  mode: string;
}

export interface HealthStatus {
  status: string;
  runs: number;
}
