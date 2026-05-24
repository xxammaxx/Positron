// Positron Web — Frontend Typdefinitionen
// Hinweis: Phase und RunStatus sind kompatibel mit dem Backend (@positron/shared)

export type Phase =
  | 'QUEUED' | 'CLAIMED' | 'REPO_SYNC' | 'ISSUE_CONTEXT'
  | 'WEB_RESEARCH' | 'SPECIFY' | 'CLARIFY_OPTIONAL' | 'PLAN' | 'TASKS'
  | 'ANALYZE' | 'REVIEW' | 'IMPLEMENT' | 'TEST' | 'VERIFY'
  | 'COMMIT' | 'PR_CREATE' | 'MERGE' | 'DONE' | 'FAILED'
  | 'FAILED_TRANSIENT' | 'FAILED_BLOCKED' | 'FAILED_UNSAFE'
  | 'BLOCKED_PUSH' | 'BLOCKED_MERGE' | 'GATE_APPROVE'
  | 'GATE_REVISE' | 'RESUME_PENDING' | 'CLEANUP';

export const ALL_PHASES: readonly Phase[] = [
  'QUEUED', 'CLAIMED', 'REPO_SYNC', 'ISSUE_CONTEXT',
  'WEB_RESEARCH', 'SPECIFY', 'CLARIFY_OPTIONAL', 'PLAN', 'TASKS',
  'ANALYZE', 'REVIEW', 'IMPLEMENT', 'TEST', 'VERIFY',
  'COMMIT', 'PR_CREATE', 'MERGE', 'DONE', 'FAILED',
  'FAILED_TRANSIENT', 'FAILED_BLOCKED', 'FAILED_UNSAFE',
  'BLOCKED_PUSH', 'BLOCKED_MERGE', 'GATE_APPROVE',
  'GATE_REVISE', 'RESUME_PENDING', 'CLEANUP',
] as const;

export const PHASE_LABELS: Record<Phase, string> = {
  QUEUED: 'Warteschlange',
  CLAIMED: 'Übernommen',
  REPO_SYNC: 'Repository-Sync',
  ISSUE_CONTEXT: 'Issue-Kontext',
  WEB_RESEARCH: 'Web-Recherche',
  SPECIFY: 'Anforderungsanalyse',
  CLARIFY_OPTIONAL: 'Klarstellung',
  PLAN: 'Planung',
  TASKS: 'Aufgaben',
  ANALYZE: 'Analyse',
  REVIEW: 'Code-Review',
  IMPLEMENT: 'Implementierung',
  TEST: 'Tests',
  VERIFY: 'Verifikation',
  COMMIT: 'Committen',
  PR_CREATE: 'Pull Request',
  MERGE: 'Zusammenführen',
  DONE: 'Abgeschlossen',
  FAILED: 'Fehlgeschlagen',
  FAILED_TRANSIENT: 'Fehler (wiederholbar)',
  FAILED_BLOCKED: 'Fehler (blockiert)',
  FAILED_UNSAFE: 'Fehler (unsicher)',
  BLOCKED_PUSH: 'Push blockiert',
  BLOCKED_MERGE: 'Merge blockiert',
  GATE_APPROVE: 'Genehmigung erforderlich',
  GATE_REVISE: 'Überarbeitung erforderlich',
  RESUME_PENDING: 'Wiederaufnahme ausstehend',
  CLEANUP: 'Bereinigung',
};

export type RunStatus = 'active' | 'blocked' | 'done' | 'failed';

export const STATUS_LABEL: Record<RunStatus, string> = {
  active: 'Läuft',
  blocked: 'Blockiert',
  done: 'Abgeschlossen',
  failed: 'Fehlgeschlagen',
};

export type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';

export interface Repository {
  id: string;
  owner: string;
  name: string;
  url: string;
  localPath: string | null;
  enabled: boolean;
  createdAt: string;
}

export interface Issue {
  id: string;
  repoId: string;
  number: number;
  title: string;
  state: 'open' | 'closed';
  labels: string[];
  lastSeenAt: string;
}

export interface Run {
  id: string;
  repoId: string;
  issueNumber: number;
  branch: string | null;
  phase: Phase;
  status: RunStatus;
  autonomyLevel: number;
  attempt: number;
  lastError: string | null;
  workspacePath: string | null;
  startedAt: string;
  finishedAt: string | null;
}

export interface RunEvent {
  id: string;
  runId: string;
  phase: Phase;
  level: LogLevel;
  message: string;
  payload: Record<string, unknown>;
  createdAt: string;
}

export interface Artifact {
  content: string;
  kind: string;
  createdAt: string;
}

export interface Metrics {
  totalRuns: number;
  runsByPhase: Partial<Record<Phase, number>>;
  runsByStatus: Partial<Record<RunStatus, number>>;
  avgDurationMs: number;
  successRate: number;
}

export interface HealthStatus {
  status: 'ok' | 'degraded' | 'error';
  adapters: Record<string, boolean>;
  uptime: number;
}

export interface ApiError {
  error: string;
  code?: string;
  details?: unknown;
}
