// Positron — Gemeinsame Interfaces (Datenmodell)

export interface Repository {
  id: string;
  owner: string;
  name: string;
  url: string;
  localPath: string;
  defaultBranch: string | null;
  enabled: boolean;
  createdAt: string;
}

export interface IssueRecord {
  id: string;
  repoId: string;
  number: number;
  title: string;
  state: string;
  labels: string[];
  lastSeenAt: string;
}

export interface RunRecord {
  id: string;
  repoId: string;
  issueNumber: number;
  branch: string | null;
  phase: string;
  status: string;
  autonomyLevel: number;
  attempt: number;
  startedAt: string | null;
  finishedAt: string | null;
}

export interface RunEventRecord {
  id: string;
  runId: string;
  phase: string;
  level: string;
  message: string;
  payload: Record<string, unknown> | null;
  createdAt: string;
}

export interface ArtifactRecord {
  id: string;
  runId: string;
  kind: string;
  path: string;
  sha256: string | null;
  createdAt: string;
}

export interface CommandResultRecord {
  id: string;
  runId: string;
  command: string;
  exitCode: number | null;
  stdoutPath: string | null;
  stderrPath: string | null;
  durationMs: number | null;
  createdAt: string;
}
