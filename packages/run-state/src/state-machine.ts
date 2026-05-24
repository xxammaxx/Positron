// Positron — Run State Machine (reaktiv, keine Side Effects)

import type { Phase, RunStatus, EventLevel } from '@positron/shared';
import { ALL_PHASES, MAX_FIX_LOOPS } from '@positron/shared';
import { createRunId } from '@positron/shared';

// ---------------------------------------------------------------------------
// Transition-Tabelle
// ---------------------------------------------------------------------------

export const VALID_TRANSITIONS: Readonly<Record<Phase, readonly Phase[]>> = {
  QUEUED: ['CLAIMED'],
  CLAIMED: ['REPO_SYNC', 'FAILED_TRANSIENT', 'FAILED_BLOCKED'],
  REPO_SYNC: ['ISSUE_CONTEXT', 'FAILED_TRANSIENT'],
  ISSUE_CONTEXT: ['WEB_RESEARCH', 'FAILED_TRANSIENT'],
  WEB_RESEARCH: ['SPECIFY', 'FAILED_TRANSIENT'],
  SPECIFY: ['CLARIFY_OPTIONAL', 'PLAN', 'FAILED_TRANSIENT'],
  CLARIFY_OPTIONAL: ['PLAN', 'FAILED_TRANSIENT'],
  PLAN: ['TASKS', 'FAILED_TRANSIENT'],
  TASKS: ['ANALYZE', 'FAILED_TRANSIENT'],
  ANALYZE: ['REVIEW', 'FAILED_TRANSIENT'],
  REVIEW: ['IMPLEMENT', 'PLAN', 'TASKS', 'FAILED_TRANSIENT'],
  IMPLEMENT: ['TEST', 'FAILED_TRANSIENT', 'FAILED_BLOCKED'],
  TEST: ['VERIFY', 'IMPLEMENT', 'FAILED_TRANSIENT', 'FAILED_BLOCKED'],
  VERIFY: ['COMMIT', 'FAILED_BLOCKED'],
  COMMIT: ['PR_CREATE', 'FAILED_BLOCKED'],
  PR_CREATE: ['MERGE', 'DONE', 'FAILED_BLOCKED'],
  MERGE: ['DONE', 'FAILED_BLOCKED'],
  DONE: [],
  FAILED_TRANSIENT: [], // Nur via retry()
  FAILED_BLOCKED: [],
  FAILED_UNSAFE: [],
} as const;

// ---------------------------------------------------------------------------
// Typen
// ---------------------------------------------------------------------------

export interface RunState {
  id: string;
  repoId: string;
  issueNumber: number;
  branch: string | null;
  phase: Phase;
  status: RunStatus;
  autonomyLevel: number;
  attempt: number;
  startedAt: string;
  finishedAt: string | null;
  lastError: string | null;
  /** Workspace path from prepareWorkspace (Issue #36) */
  workspacePath: string | null;
}

export interface RunEventData {
  id: string;
  runId: string;
  phase: Phase;
  level: EventLevel;
  message: string;
  payload: Record<string, unknown> | null;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Store Interface (für DI / Testbarkeit)
// ---------------------------------------------------------------------------

export interface RunStore {
  saveRun(run: RunState): void;
  loadRun(runId: string): RunState | null;
  appendEvent(event: RunEventData): void;
  getEvents(runId: string): RunEventData[];
}

// ---------------------------------------------------------------------------
// Core
// ---------------------------------------------------------------------------

export function createRun(repoId: string, issueNumber: number, autonomyLevel: number): RunState {
  return {
    id: createRunId(),
    repoId,
    issueNumber,
    branch: null,
    phase: 'QUEUED',
    status: 'active',
    autonomyLevel,
    attempt: 1,
    startedAt: new Date().toISOString(),
    finishedAt: null,
    lastError: null,
    workspacePath: null,
  };
}

export function canTransition(from: Phase, to: Phase): boolean {
  return (VALID_TRANSITIONS[from] as readonly Phase[]).includes(to);
}

export interface TransitionResult {
  ok: boolean;
  run: RunState;
  event: RunEventData;
}

export function transition(
  run: RunState,
  to: Phase,
  message: string,
  level: EventLevel = 'INFO',
  payload: Record<string, unknown> | null = null,
): TransitionResult {
  if (!canTransition(run.phase, to)) {
    return {
      ok: false,
      run,
      event: makeEvent(run, run.phase, 'ERROR',
        `Ungültiger Übergang: ${run.phase} → ${to}`),
    };
  }

  const updated: RunState = {
    ...run,
    phase: to,
    status: deriveStatus(to),
    finishedAt: isTerminal(to) ? new Date().toISOString() : run.finishedAt,
    lastError: to.startsWith('FAILED') ? message : run.lastError,
  };

  const event = makeEvent(updated, to, level, message, payload);
  return { ok: true, run: updated, event };
}

export function markFailed(
  run: RunState,
  kind: 'FAILED_TRANSIENT' | 'FAILED_BLOCKED' | 'FAILED_UNSAFE',
  reason: string,
): TransitionResult {
  return transition(run, kind, reason, 'ERROR', { failedPhase: run.phase });
}

export function retry(run: RunState): TransitionResult {
  if (run.phase !== 'FAILED_TRANSIENT') {
    return { ok: false, run, event: makeEvent(run, run.phase, 'ERROR', 'Nur aus FAILED_TRANSIENT retrybar') };
  }
  if (run.attempt >= MAX_FIX_LOOPS) {
    return { ok: false, run, event: makeEvent(run, run.phase, 'ERROR',
      `Max Fix-Loops (${MAX_FIX_LOOPS}) erreicht`),
    };
  }

  const retried: RunState = {
    ...run,
    phase: 'QUEUED',
    status: 'active',
    attempt: run.attempt + 1,
    lastError: null,
  };

  return { ok: true, run: retried, event: makeEvent(retried, 'QUEUED', 'INFO',
    `Retry ${retried.attempt}/${MAX_FIX_LOOPS}`) };
}

// ---------------------------------------------------------------------------
// Resume
// ---------------------------------------------------------------------------

export function resumeFromEvents(
  runId: string,
  repoId: string,
  issueNumber: number,
  events: RunEventData[],
): RunState {
  if (events.length === 0) {
    const run = createRun(repoId, issueNumber, 0);
    return { ...run, id: runId, startedAt: new Date().toISOString() };
  }

  // Start vom ersten Event
  const first = events[0];
  let run: RunState = {
    id: runId,
    repoId,
    issueNumber,
    branch: null,
    phase: first.phase,
    status: deriveStatus(first.phase),
    autonomyLevel: 0,
    attempt: 1,
    startedAt: first.createdAt,
    finishedAt: null,
    lastError: null,
    workspacePath: null,
  };

  // Events sequenziell anwenden (vereinfacht: Phase aus Event übernehmen)
  for (let i = 1; i < events.length; i++) {
    const evt = events[i];
    run = {
      ...run,
      phase: evt.phase,
      status: deriveStatus(evt.phase),
      finishedAt: isTerminal(evt.phase) ? evt.createdAt : null,
      lastError: evt.level === 'ERROR' ? evt.message : run.lastError,
    };
    if (evt.phase === 'FAILED_TRANSIENT') run.attempt++;
  }

  return run;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function deriveStatus(phase: Phase): RunStatus {
  if (phase === 'DONE') return 'done';
  if (phase.startsWith('FAILED')) return phase === 'FAILED_TRANSIENT' ? 'active' : 'blocked';
  return 'active';
}

function isTerminal(phase: Phase): boolean {
  return phase === 'DONE' || phase === 'FAILED_BLOCKED' || phase === 'FAILED_UNSAFE';
}

function makeEvent(
  run: RunState,
  phase: Phase,
  level: EventLevel,
  message: string,
  payload: Record<string, unknown> | null = null,
): RunEventData {
  return {
    id: createRunId(),
    runId: run.id,
    phase,
    level,
    message,
    payload,
    createdAt: new Date().toISOString(),
  };
}
