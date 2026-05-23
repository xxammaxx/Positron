// Positron — Label Lifecycle Mapping

/** Label-Lifecycle: welche Labels pro Phase gesetzt/entfernt werden */
export interface PhaseLabels {
  add: string[];
  remove: string[];
}

export const LABEL_LIFECYCLE: Record<string, PhaseLabels> = {
  CLAIMED: {
    add: ['positron:running'],
    remove: ['positron:ready', 'positron:done', 'positron:blocked', 'positron:failed'],
  },
  REPO_SYNC: {
    add: ['positron:repo-sync'],
    remove: ['positron:testing', 'positron:done', 'positron:failed'],
  },
  TEST: {
    add: ['positron:testing'],
    remove: ['positron:repo-sync', 'positron:failed'],
  },
  BLOCKED: {
    add: ['positron:blocked'],
    remove: ['positron:running', 'positron:repo-sync', 'positron:research', 'positron:testing', 'positron:done', 'positron:failed'],
  },
  FAILED_TRANSIENT: {
    add: ['positron:failed'],
    remove: ['positron:running', 'positron:repo-sync', 'positron:research', 'positron:testing', 'positron:done', 'positron:blocked'],
  },
  FAILED_UNSAFE: {
    add: ['positron:failed'],
    remove: ['positron:running', 'positron:repo-sync', 'positron:research', 'positron:testing', 'positron:done', 'positron:blocked'],
  },
  FAILED_BLOCKED: {
    add: ['positron:blocked'],
    remove: ['positron:running', 'positron:repo-sync', 'positron:research', 'positron:testing', 'positron:done', 'positron:failed'],
  },
  DONE: {
    add: ['positron:done'],
    remove: ['positron:running', 'positron:repo-sync', 'positron:research', 'positron:testing', 'positron:blocked', 'positron:failed'],
  },
  PR_CREATED: {
    add: ['positron:pr-created'],
    remove: ['positron:running', 'positron:repo-sync', 'positron:research', 'positron:testing', 'positron:blocked', 'positron:failed'],
  },
  MERGED: {
    add: ['positron:merged'],
    remove: ['positron:pr-created', 'positron:running', 'positron:done', 'positron:blocked', 'positron:failed'],
  },
};

/** Berechnet Labels für eine Phase */
export function getLabelsForPhase(phase: string, reportStatus?: string): PhaseLabels {
  // reportStatus takes priority for terminal phases
  if (reportStatus === 'BLOCKED') return LABEL_LIFECYCLE['BLOCKED'];
  if (reportStatus === 'FAIL') return LABEL_LIFECYCLE['FAILED_TRANSIENT'];
  if (reportStatus === 'PASS') return LABEL_LIFECYCLE['DONE'];

  // Map failure phases to their specific lifecycle entries
  const key = phase === 'FAILED_BLOCKED' ? 'FAILED_BLOCKED'
    : phase === 'FAILED_UNSAFE' ? 'FAILED_UNSAFE'
    : phase === 'FAILED_TRANSIENT' ? 'FAILED_TRANSIENT'
    : phase;
  return key ? LABEL_LIFECYCLE[key] ?? { add: [], remove: [] } : { add: [], remove: [] };
}
