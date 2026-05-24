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
  level: 'INFO' | 'WARN' | 'ERROR' | 'GATE' | 'HUMAN';
  message: string;
  createdAt: string;
}

export interface RunDetail {
  run: RunRecord;
  events: RunEvent[];
}

export interface EvidenceItem {
  kind: string;
  status: string;
  summary: string;
}

export interface PullRequestRef {
  number: number;
  url: string;
}

export interface TestSummary {
  status: string;
  summary: string;
  passed?: number;
  failed?: number;
  total?: number;
  durationMs?: number;
}

export interface RunDetailWithMeta extends RunDetail {
  pr?: PullRequestRef | null;
  testReport?: TestSummary | null;
  evidence?: EvidenceItem[];
  syncComments?: SyncStatusItem[];
}

export interface SyncStatusItem {
  phase: string;
  status: string;
  commentUrl?: string;
  timestamp: string;
}

export interface SafetyState {
  enableMerge: boolean;
  mergeDryRun: boolean;
  enablePush: boolean;
  killSwitch: boolean;
  enableFixLoop: boolean;
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

/** Autonomy level descriptions */
export const AUTONOMY_LEVELS: Record<number, { label: string; description: string }> = {
  0: { label: 'Observer', description: 'Read-only — analyse but never modify' },
  1: { label: 'Research & Spec', description: 'Research and specification — no code changes' },
  2: { label: 'Supervised Build', description: 'Code changes with ask-gates, push after approval' },
  3: { label: 'Autonomous Sandbox', description: 'Autonomous in isolated workspace, no main merge' },
  4: { label: 'CI Auto-PR', description: 'Automatic PR creation, merge only with green checks' },
};
