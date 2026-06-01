// Positron — Pipeline Safety Decision Helpers
// Pure functions extracted from pipeline-runner.ts for testability.
// Level A Safety Module — must maintain 100% coverage.

/**
 * Prüft ob Push erlaubt ist.
 */
export function isPushAllowed(env?: Record<string, string | undefined>): boolean {
  return (env ?? process.env).POSITRON_ENABLE_PUSH === 'true';
}

/**
 * Prüft ob Merge erlaubt ist.
 */
export function isMergeAllowed(env?: Record<string, string | undefined>): boolean {
  return (env ?? process.env).POSITRON_ENABLE_MERGE === 'true';
}

/**
 * Prüft ob Merge-Kill-Switch aktiv ist.
 * Default: true (sicher — blockiert Merge).
 */
export function isMergeKillSwitchActive(env?: Record<string, string | undefined>): boolean {
  const val = (env ?? process.env).POSITRON_MERGE_KILL_SWITCH;
  return val !== 'false'; // default: kill switch ON
}

/**
 * Prüft ob Merge-Dry-Run aktiv ist.
 */
export function isMergeDryRun(env?: Record<string, string | undefined>): boolean {
  return (env ?? process.env).POSITRON_MERGE_DRY_RUN === 'true';
}

/**
 * Prüft ob Fix-Loop aktiv ist.
 */
export function isFixLoopEnabled(env?: Record<string, string | undefined>): boolean {
  return (env ?? process.env).POSITRON_ENABLE_FIX_LOOP === 'true';
}

/**
 * Entscheidet, ob ein Commit möglich ist (hat der Workspace Changes?).
 */
export function hasWorkspaceChanges(isClean: boolean): boolean {
  return !isClean;
}

/**
 * Prüft ob MaxAttempts gesetzt sind (für Fix-Loop).
 */
export function resolveMaxAttempts(env?: Record<string, string | undefined>, defaultMax = 3): number {
  const val = (env ?? process.env).POSITRON_MAX_FIX_LOOPS;
  if (val === undefined || val === '') return defaultMax;
  const parsed = parseInt(val, 10);
  return isNaN(parsed) ? defaultMax : parsed;
}

/**
 * Prüft ob Strict Test Mode aktiv ist.
 */
export function isStrictTestMode(env?: Record<string, string | undefined>): boolean {
  return (env ?? process.env).POSITRON_STRICT_TEST_MODE === 'true';
}

/**
 * Prüft ob Real SpecKit aktiv ist.
 */
export function isRealSpecKitEnabled(env?: Record<string, string | undefined>): boolean {
  return (env ?? process.env).POSITRON_ENABLE_REAL_SPECKIT === 'true';
}

/**
 * Phasen-Result-Mapping: Bestimmt den korrekten Failure-Typ.
 */
export type FailureKind = 'FAILED' | 'FAILED_TRANSIENT' | 'FAILED_BLOCKED' | 'FAILED_UNSAFE';

export function mapFailureKind(reason: string, isTransient = false, isBlocked = true, isUnsafe = false): FailureKind {
  if (isUnsafe) return 'FAILED_UNSAFE';
  if (isBlocked && !isTransient) return 'FAILED_BLOCKED';
  if (isTransient) return 'FAILED_TRANSIENT';
  return 'FAILED';
}
