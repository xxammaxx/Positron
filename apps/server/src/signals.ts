/**
 * Run Signals — Stub for Issue #65 build compatibility.
 * Full implementation will be provided in Issue #66 (Live Operations Pass).
 */

export type RunControlAction = 'PAUSE' | 'ABORT' | 'RESUME' | 'RETRY';

/** In-memory abort signals per run (maps runId → Signal) */
export const runSignals = new Map<string, string>();
/** Resume target phase for interrupted runs */
export const resumePhaseTarget = new Map<string, string>();

export function checkRunSignal(runId: string, _phase?: string): string | null {
  return runSignals.get(runId) ?? null;
}
