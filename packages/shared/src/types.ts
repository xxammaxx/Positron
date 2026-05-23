// Positron — Gemeinsame TypeScript-Typen

/** Phasen der Positron-Run-State-Machine */
export type Phase =
  | 'QUEUED' | 'CLAIMED' | 'REPO_SYNC' | 'ISSUE_CONTEXT'
  | 'WEB_RESEARCH' | 'SPECIFY' | 'CLARIFY_OPTIONAL'
  | 'PLAN' | 'TASKS' | 'ANALYZE' | 'REVIEW' | 'IMPLEMENT'
  | 'TEST' | 'VERIFY' | 'COMMIT' | 'PR_CREATE' | 'DONE'
  | 'FAILED_TRANSIENT' | 'FAILED_BLOCKED' | 'FAILED_UNSAFE';

/** Terminale Phasen (keine weiteren Übergänge) */
export type TerminalPhase = 'DONE' | 'FAILED_BLOCKED' | 'FAILED_UNSAFE';

/** Fehlerphasen */
export type FailurePhase = 'FAILED_TRANSIENT' | 'FAILED_BLOCKED' | 'FAILED_UNSAFE';

/** Status eines Runs */
export type RunStatus = 'active' | 'blocked' | 'done' | 'failed';

/** Autonomie-Level (0 = Observer, 4 = CI Auto-PR) */
export type AutonomyLevel = 0 | 1 | 2 | 3 | 4;

/** Ereignis-Schwere im Run-Log */
export type EventLevel = 'INFO' | 'WARN' | 'ERROR' | 'GATE' | 'HUMAN';

/** Vordefinierte Positron-Label-Namen */
export type PositronLabel =
  | 'positron:ready' | 'positron:running' | 'positron:research'
  | 'positron:repo-sync' | 'positron:planning' | 'positron:implementing'
  | 'positron:testing' | 'positron:blocked'
  | 'positron:failed' | 'positron:pr-created' | 'positron:done';

export const ALL_PHASES: readonly Phase[] = [
  'QUEUED', 'CLAIMED', 'REPO_SYNC', 'ISSUE_CONTEXT',
  'WEB_RESEARCH', 'SPECIFY', 'CLARIFY_OPTIONAL',
  'PLAN', 'TASKS', 'ANALYZE', 'REVIEW', 'IMPLEMENT',
  'TEST', 'VERIFY', 'COMMIT', 'PR_CREATE', 'DONE',
  'FAILED_TRANSIENT', 'FAILED_BLOCKED', 'FAILED_UNSAFE',
] as const;
