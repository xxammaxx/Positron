// Positron — State Machine für Run-Management

import crypto from 'node:crypto';
import type { Phase, RunStatus, EventLevel, GateType, GateResult } from '@positron/shared';

/**
 * Vollständiger Zustand eines Runs.
 */
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
  /** Phase 1 (#243): Dedicated evidence directory path. */
  evidencePath: string | null;
  /** Phase 1 (#243): Whether the workspace is currently locked. */
  workspaceLocked: boolean;
  /** #246: Accumulated gate results for this run. */
  gateResults?: GateResult[];
}

/**
 * Ein einzelnes Run-Event.
 */
export interface RunEventData {
  id: string;
  runId: string;
  phase: Phase;
  level: EventLevel;
  message: string;
  payload: Record<string, unknown> | null;
  createdAt: string;
}

/**
 * Run-Store Interface für Persistenz.
 */
export interface RunStore {
  saveRun(run: RunState): void;
  loadRun(runId: string): RunState | null;
  appendEvent(event: RunEventData): void;
  getEvents(runId: string): RunEventData[];
}

/**
 * Ergebnis eines Transitions-Versuchs.
 */
export interface TransitionResult {
  ok: boolean;
  run: RunState;
  event: RunEventData;
}

/**
 * #246: Gate evaluator function signature.
 * Receives the gate type, run state, and optional context.
 * Returns a GateResult indicating whether the gate passed.
 */
export type GateEvaluator = (
  gate: GateType,
  run: RunState,
  context?: Record<string, unknown>,
) => Promise<GateResult> | GateResult;

/**
 * #246: Registry of gate evaluators keyed by GateType.
 */
const gateEvaluators = new Map<GateType, GateEvaluator>();

/**
 * #246: Register a gate evaluator for a specific gate type.
 * Only one evaluator per gate type; re-registration overwrites.
 */
export function registerGateEvaluator(gate: GateType, evaluator: GateEvaluator): void {
  gateEvaluators.set(gate, evaluator);
}

/**
 * #246: Clear all registered gate evaluators (for testing).
 */
export function clearGateEvaluators(): void {
  gateEvaluators.clear();
}

/**
 * #246: Evaluate all registered gates for a given phase transition.
 * Returns a GateLayerResult-like structure.
 */
export async function evaluateGates(
  gatesToCheck: GateType[],
  run: RunState,
  context?: Record<string, unknown>,
): Promise<{ allPassed: boolean; gates: GateResult[]; blockingFailures: number }> {
  const results: GateResult[] = [];
  let blockingFailures = 0;

  for (const gate of gatesToCheck) {
    const evaluator = gateEvaluators.get(gate);
    if (!evaluator) {
      // No evaluator registered → gate is missing, which means BLOCKED
      const result: GateResult = {
        gate,
        passed: false,
        blocking: true,
        reason: `No evaluator registered for gate "${gate}"`,
        evaluatedAt: new Date().toISOString(),
      };
      results.push(result);
      blockingFailures++;
      continue;
    }
    try {
      const result = await evaluator(gate, run, context);
      results.push(result);
      if (!result.passed && result.blocking) {
        blockingFailures++;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const result: GateResult = {
        gate,
        passed: false,
        blocking: true,
        reason: `Gate evaluator threw: ${msg}`,
        evaluatedAt: new Date().toISOString(),
      };
      results.push(result);
      blockingFailures++;
    }
  }

  return {
    allPassed: blockingFailures === 0,
    gates: results,
    blockingFailures,
  };
}

/**
 * #246: Map of phase transitions that require specific gate checks.
 * Key: target phase → gates that must pass before entering.
 * Uses only GateType values that exist in the type definition.
 */
export const PHASE_GATE_REQUIREMENTS: Readonly<Partial<Record<Phase, GateType[]>>> = {
  COMMIT: ['pre_write', 'evidence_required'],
  PR_CREATE: ['pre_pr', 'evidence_required'],
  MERGE: ['pre_merge', 'security', 'human_approval'],
  DONE: ['evidence_required'],
};

/**
 * #246: Check if a target phase requires gate evaluation.
 */
export function getRequiredGatesForPhase(targetPhase: Phase): GateType[] {
  return PHASE_GATE_REQUIREMENTS[targetPhase] ?? [];
}

/**
 * #244: Workspace cleanup callback type.
 * Called when the state machine transitions to CLEANUP phase.
 */
export type WorkspaceCleanupFn = (
  workspacePath: string,
  runId: string,
) => Promise<{ cleaned: boolean; reason?: string }>;

/**
 * #244: Registered workspace cleanup function.
 */
let workspaceCleanupFn: WorkspaceCleanupFn | null = null;

/**
 * #244: Register a workspace cleanup function.
 */
export function registerWorkspaceCleanup(fn: WorkspaceCleanupFn): void {
  workspaceCleanupFn = fn;
}

/**
 * #244: Get current workspace cleanup function (for testing).
 */
export function getWorkspaceCleanupFn(): WorkspaceCleanupFn | null {
  return workspaceCleanupFn;
}

/**
 * #244: Run workspace cleanup. Called on CLEANUP transition.
 */
export async function runCleanup(run: RunState): Promise<{ cleaned: boolean; reason?: string }> {
  if (!run.workspacePath) {
    return { cleaned: true, reason: 'No workspace path to clean up' };
  }
  if (!workspaceCleanupFn) {
    return { cleaned: false, reason: 'No workspace cleanup function registered' };
  }
  try {
    return await workspaceCleanupFn(run.workspacePath, run.id);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { cleaned: false, reason: `Cleanup failed: ${msg}` };
  }
}

/**
 * #246: Attempt a phase transition with gate enforcement.
 *
 * Evaluates required gates for the target phase before transitioning.
 * If any blocking gate fails, the transition is rejected.
 * Otherwise, the transition proceeds normally.
 *
 * This is the primary enforcement point for GateType runtime checks.
 * Callers SHOULD use this instead of raw transition() for gated phases.
 */
export async function tryTransitionWithGates(
  run: RunState,
  to: Phase,
  message: string,
  level: EventLevel = 'INFO',
  payload: Record<string, unknown> | null = null,
  context?: Record<string, unknown>,
): Promise<TransitionResult> {
  // Validate transition first — fail early if invalid
  if (!canTransition(run.phase, to)) {
    const event = createEvent(run, to, 'ERROR', `Invalid transition: ${run.phase} → ${to}`, null);
    return { ok: false, run: { ...run, lastError: event.message }, event };
  }

  // Evaluate required gates
  const requiredGates = getRequiredGatesForPhase(to);
  if (requiredGates.length > 0) {
    const gateResult = await evaluateGates(requiredGates, run, context);

    // Accumulate gate results on the run
    const updatedRun: RunState = {
      ...run,
      gateResults: [...(run.gateResults ?? []), ...gateResult.gates],
    };

    if (!gateResult.allPassed) {
      const failedGates = gateResult.gates
        .filter((g) => !g.passed && g.blocking)
        .map((g) => g.gate)
        .join(', ');
      const event = createEvent(
        updatedRun,
        to,
        'ERROR',
        `Gate enforcement failed: blocking gates not passed: ${failedGates}`,
        { gateResult },
      );
      return {
        ok: false,
        run: { ...updatedRun, lastError: event.message },
        event,
      };
    }

    // Proceed with transition using updated run (with gate results)
    const result = transition(updatedRun, to, message, level, payload);
    return result;
  }

  // No gates required — proceed normally
  return transition(run, to, message, level, payload);
}

/**
 * Valide Transitionen: Map von Phase → erlaubte Folgephasen.
 * Basierend auf Blueprint.md §5.2.
 */
export const VALID_TRANSITIONS: Readonly<Record<Phase, readonly Phase[]>> = {
  QUEUED: ['CLAIMED'],
  CLAIMED: ['REPO_SYNC', 'FAILED_BLOCKED'],
  REPO_SYNC: ['ISSUE_CONTEXT', 'FAILED_TRANSIENT'],
  ISSUE_CONTEXT: ['WEB_RESEARCH'],
  WEB_RESEARCH: ['SPECIFY', 'FAILED_TRANSIENT'],
  SPECIFY: ['CLARIFY_OPTIONAL', 'PLAN'],
  CLARIFY_OPTIONAL: ['PLAN'],
  PLAN: ['TASKS'],
  TASKS: ['ANALYZE'],
  ANALYZE: ['REVIEW'],
  REVIEW: ['IMPLEMENT', 'PLAN', 'TASKS'],
  IMPLEMENT: ['TEST', 'FAILED_BLOCKED'],
  TEST: ['VERIFY', 'IMPLEMENT', 'FAILED_BLOCKED'],
  VERIFY: ['COMMIT', 'FAILED_BLOCKED'],
  COMMIT: ['PR_CREATE', 'FAILED_BLOCKED'],
  PR_CREATE: ['MERGE', 'DONE', 'FAILED_BLOCKED'],
  MERGE: ['DONE'],
  DONE: ['CLEANUP'],
  FAILED: [],
  FAILED_TRANSIENT: ['REPO_SYNC', 'WEB_RESEARCH', 'SPECIFY', 'TEST'],
  FAILED_BLOCKED: ['CLEANUP'],
  FAILED_UNSAFE: ['CLEANUP'],
  BLOCKED_PUSH: [],
  BLOCKED_MERGE: [],
  GATE_APPROVE: ['COMMIT', 'MERGE', 'DONE'],
  GATE_REVISE: ['REVIEW', 'IMPLEMENT'],
  RESUME_PENDING: ['QUEUED', 'TEST', 'VERIFY'],
  CLEANUP: [],
};

/**
 * Prüft ob ein Übergang von einer Phase zu einer anderen gültig ist.
 */
export function canTransition(from: Phase, to: Phase): boolean {
  const allowed = VALID_TRANSITIONS[from];
  if (!allowed) return false;
  return allowed.includes(to);
}

/**
 * Erstellt einen neuen Run.
 */
export function createRun(repoId: string, issueNumber: number, autonomyLevel: number): RunState {
  return {
    id: generateRunId(),
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
    evidencePath: null,
    workspaceLocked: false,
    gateResults: [],
  };
}

/**
 * Validiert einen Zustandsübergang und führt ihn aus.
 */
export function transition(
  run: RunState,
  to: Phase,
  message: string,
  level: EventLevel = 'INFO',
  payload: Record<string, unknown> | null = null,
): TransitionResult {
  // Prüfe ob der Übergang gültig ist
  if (!canTransition(run.phase, to)) {
    const event = createEvent(run, to, 'ERROR', `Invalid transition: ${run.phase} → ${to}`, null);
    return { ok: false, run: { ...run, lastError: event.message }, event };
  }

  const newRun: RunState = {
    ...run,
    phase: to,
    status: to === 'DONE' ? 'done' : to.startsWith('FAILED') ? 'failed' : 'active',
    lastError: to.startsWith('FAILED') ? message : null,
  };

  if (to === 'DONE' || to.startsWith('FAILED')) {
    newRun.finishedAt = new Date().toISOString();
  }

  const event = createEvent(run, to, level, message, payload);
  return { ok: true, run: newRun, event };
}

/**
 * Markiert einen Run als fehlgeschlagen.
 */
export function markFailed(
  run: RunState,
  kind: 'FAILED' | 'FAILED_TRANSIENT' | 'FAILED_BLOCKED' | 'FAILED_UNSAFE',
  reason: string,
): TransitionResult {
  const status: RunStatus = kind === 'FAILED_BLOCKED' || kind === 'FAILED' ? 'blocked' : 'failed';
  const newRun: RunState = {
    ...run,
    phase: kind,
    status,
    lastError: reason,
    finishedAt: new Date().toISOString(),
  };

  const event: RunEventData = {
    id: generateRunId(),
    runId: run.id,
    phase: kind,
    level: 'ERROR',
    message: reason,
    payload: { failedPhase: run.phase, reason },
    createdAt: new Date().toISOString(),
  };

  return { ok: true, run: newRun, event };
}

/**
 * Versucht einen Run neu zu starten (nur aus FAILED_TRANSIENT).
 */
export function retry(run: RunState): TransitionResult {
  if (run.phase !== 'FAILED_TRANSIENT') {
    const event: RunEventData = {
      id: generateRunId(),
      runId: run.id,
      phase: run.phase,
      level: 'ERROR',
      message: `Cannot retry: run is in phase "${run.phase}", not FAILED_TRANSIENT`,
      payload: null,
      createdAt: new Date().toISOString(),
    };
    return { ok: false, run, event };
  }

  const newRun: RunState = {
    ...run,
    phase: 'TEST',
    status: 'active',
    attempt: run.attempt + 1,
    lastError: null,
    finishedAt: null,
  };

  const event: RunEventData = {
    id: generateRunId(),
    runId: run.id,
    phase: 'TEST',
    level: 'INFO',
    message: `Retry attempt ${newRun.attempt} — resuming from TEST`,
    payload: { previousAttempt: run.attempt },
    createdAt: new Date().toISOString(),
  };

  return { ok: true, run: newRun, event };
}

/**
 * Setzt einen Run anhand seiner Events fort (Resume-by-State).
 * WICHTIG: Der erste Parameter ist runId, NICHT repoId.
 */
export function resumeFromEvents(
  runId: string,
  repoId: string,
  issueNumber: number,
  events: RunEventData[],
): RunState {
  // Finde die letzte erfolgreich abgeschlossene Phase
  const completedPhases = new Set<Phase>();
  for (const event of events) {
    if (event.level === 'INFO' || event.level === 'GATE') {
      completedPhases.add(event.phase);
    }
  }

  // Bestimme die nächste Phase nach der letzten abgeschlossenen
  const phaseOrder: readonly Phase[] = [
    'QUEUED', 'CLAIMED', 'REPO_SYNC', 'ISSUE_CONTEXT',
    'WEB_RESEARCH', 'SPECIFY', 'CLARIFY_OPTIONAL',
    'PLAN', 'TASKS', 'ANALYZE', 'REVIEW', 'IMPLEMENT',
    'TEST', 'VERIFY', 'COMMIT', 'PR_CREATE', 'MERGE', 'DONE',
    'FAILED', 'FAILED_TRANSIENT', 'FAILED_BLOCKED', 'FAILED_UNSAFE',
    'BLOCKED_PUSH', 'BLOCKED_MERGE', 'GATE_APPROVE', 'GATE_REVISE',
    'RESUME_PENDING', 'CLEANUP',
  ];

  let lastPhase: Phase = 'QUEUED';
  for (const phase of phaseOrder) {
    if (completedPhases.has(phase)) {
      lastPhase = phase;
    }
  }

  return {
    id: runId,
    repoId,
    issueNumber,
    branch: null,
    phase: lastPhase,
    status: 'active',
    autonomyLevel: 2,
    attempt: 1,
    startedAt: new Date().toISOString(),
    finishedAt: null,
    lastError: null,
    workspacePath: null,
    evidencePath: null,
    workspaceLocked: false,
    gateResults: [],
  };
}

/**
 * Prüft ob eine Phase terminal ist.
 * DONE, FAILED_BLOCKED, and FAILED_UNSAFE are terminal even though
 * they may transition to CLEANUP (automatic post-processing).
 */
export function isTerminalPhase(phase: Phase): boolean {
  const allowed = VALID_TRANSITIONS[phase];
  if (!allowed || allowed.length === 0) return true;
  // DONE/FAILED_BLOCKED/FAILED_UNSAFE → CLEANUP only — still terminal
  if (allowed.length === 1 && allowed[0] === 'CLEANUP') return true;
  return false;
}

/**
 * Prüft ob eine Phase ein Fehlerzustand ist.
 */
export function isFailurePhase(phase: Phase): boolean {
  return phase === 'FAILED' || phase === 'FAILED_TRANSIENT' || phase === 'FAILED_BLOCKED' || phase === 'FAILED_UNSAFE';
}

/**
 * Generiert eine eindeutige Run-ID.
 */
function generateRunId(): string {
  return crypto.randomUUID();
}

/**
 * Erzeugt ein Event-Objekt für einen Transitions-Versuch.
 */
function createEvent(
  run: RunState,
  to: Phase,
  level: EventLevel,
  message: string,
  payload: Record<string, unknown> | null,
): RunEventData {
  return {
    id: generateRunId(),
    runId: run.id,
    phase: to,
    level,
    message,
    payload,
    createdAt: new Date().toISOString(),
  };
}
