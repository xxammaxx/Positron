// Positron — Label Lifecycle Mapping

/** Label-Lifecycle: welche Labels pro Phase gesetzt/entfernt werden */
export interface PhaseLabels {
  add: string[];
  remove: string[];
}

export const LABEL_LIFECYCLE: Record<string, PhaseLabels> = {
  CLAIMED: {
    add: ['positron:running'],
    remove: ['positron:ready', 'positron:done', 'positron:blocked'],
  },
  REPO_SYNC: {
    add: ['positron:research'],
    remove: ['positron:testing', 'positron:done'],
  },
  TEST: {
    add: ['positron:testing'],
    remove: ['positron:research'],
  },
  BLOCKED: {
    add: ['positron:blocked'],
    remove: ['positron:running', 'positron:research', 'positron:testing', 'positron:done'],
  },
  FAILED: {
    add: ['positron:blocked'],
    remove: ['positron:running', 'positron:research', 'positron:testing', 'positron:done'],
  },
  DONE: {
    add: ['positron:done'],
    remove: ['positron:running', 'positron:research', 'positron:testing', 'positron:blocked'],
  },
};

/** Berechnet Labels für eine Phase */
export function getLabelsForPhase(phase: string, reportStatus?: string): PhaseLabels {
  if (reportStatus === 'BLOCKED') return LABEL_LIFECYCLE['BLOCKED'];
  if (reportStatus === 'FAIL') return LABEL_LIFECYCLE['FAILED'];
  if (reportStatus === 'PASS') return LABEL_LIFECYCLE['DONE'];

  const key = phase === 'FAILED_BLOCKED' ? 'BLOCKED'
    : phase === 'FAILED_UNSAFE' ? 'BLOCKED'
    : phase;
  return key ? LABEL_LIFECYCLE[key] ?? { add: [], remove: [] } : { add: [], remove: [] };
}
