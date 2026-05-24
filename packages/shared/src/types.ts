// Positron — Zentrale Typdefinitionen

/** Phasen der Positron-Run-State-Machine (kanonische 27 Werte) */
export type Phase =
  | 'QUEUED'
  | 'CLAIMED'
  | 'REPO_SYNC'
  | 'ISSUE_CONTEXT'
  | 'WEB_RESEARCH'
  | 'SPECIFY'
  | 'CLARIFY_OPTIONAL'
  | 'PLAN'
  | 'TASKS'
  | 'ANALYZE'
  | 'REVIEW'
  | 'IMPLEMENT'
  | 'TEST'
  | 'VERIFY'
  | 'COMMIT'
  | 'PR_CREATE'
  | 'MERGE'
  | 'DONE'
  | 'FAILED'
  | 'FAILED_TRANSIENT'
  | 'FAILED_BLOCKED'
  | 'FAILED_UNSAFE'
  | 'BLOCKED_PUSH'
  | 'BLOCKED_MERGE'
  | 'GATE_APPROVE'
  | 'GATE_REVISE'
  | 'RESUME_PENDING'
  | 'CLEANUP';

/** Terminale Phasen (keine weiteren Übergänge) */
export type TerminalPhase = 'DONE' | 'FAILED' | 'FAILED_BLOCKED' | 'FAILED_UNSAFE' | 'CLEANUP';

/** Fehlerphasen */
export type FailurePhase = 'FAILED_TRANSIENT' | 'FAILED_BLOCKED' | 'FAILED_UNSAFE' | 'FAILED';

/** Status eines Runs (4 Werte — kompatibel mit shared) */
export type RunStatus = 'active' | 'blocked' | 'done' | 'failed';

/** Autonomie-Level (0 = Observer, 4 = CI Auto-PR) */
export type AutonomyLevel = 0 | 1 | 2 | 3 | 4;

/** Ereignis-Schwere im Run-Log */
export type EventLevel = 'INFO' | 'WARN' | 'ERROR' | 'GATE' | 'HUMAN';

/** Vordefinierte Positron-Label-Namen */
export type PositronLabel =
  | 'positron:ready'
  | 'positron:running'
  | 'positron:research'
  | 'positron:repo-sync'
  | 'positron:planning'
  | 'positron:implementing'
  | 'positron:testing'
  | 'positron:blocked'
  | 'positron:failed'
  | 'positron:pr-created'
  | 'positron:merged'
  | 'positron:done';

/** Alle Phasen als konstantes Array */
export const ALL_PHASES: readonly Phase[] = [
  'QUEUED',
  'CLAIMED',
  'REPO_SYNC',
  'ISSUE_CONTEXT',
  'WEB_RESEARCH',
  'SPECIFY',
  'CLARIFY_OPTIONAL',
  'PLAN',
  'TASKS',
  'ANALYZE',
  'REVIEW',
  'IMPLEMENT',
  'TEST',
  'VERIFY',
  'COMMIT',
  'PR_CREATE',
  'MERGE',
  'DONE',
  'FAILED',
  'FAILED_TRANSIENT',
  'FAILED_BLOCKED',
  'FAILED_UNSAFE',
  'BLOCKED_PUSH',
  'BLOCKED_MERGE',
  'GATE_APPROVE',
  'GATE_REVISE',
  'RESUME_PENDING',
  'CLEANUP',
] as const;

/** Prüft ob ein String eine gültige Phase ist */
export function isValidPhase(value: string): value is Phase {
  return (ALL_PHASES as readonly string[]).includes(value);
}

/** Prüft ob eine Phase terminal ist */
export function isTerminalPhase(phase: Phase): phase is TerminalPhase {
  return phase === 'DONE' || phase === 'FAILED' || phase === 'FAILED_BLOCKED' || phase === 'FAILED_UNSAFE' || phase === 'CLEANUP';
}

/** Prüft ob eine Phase ein Fehlerzustand ist */
export function isFailurePhase(phase: Phase): phase is FailurePhase {
  return phase === 'FAILED_TRANSIENT' || phase === 'FAILED_BLOCKED' || phase === 'FAILED_UNSAFE' || phase === 'FAILED';
}
