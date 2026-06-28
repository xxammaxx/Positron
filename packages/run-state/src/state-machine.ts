// Positron — State Machine für Run-Management

import crypto from 'node:crypto';
import type { EventLevel, Phase, RunStatus } from '@positron/shared';

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
 * Issue #244: Workspace cleanup callback type.
 * Called when the state machine transitions to CLEANUP phase.
 */
export type WorkspaceCleanupFn = (
	workspacePath: string,
	runId: string,
) => Promise<{ cleaned: boolean; reason?: string }>;

/**
 * Issue #244: Registered workspace cleanup function.
 */
let workspaceCleanupFn: WorkspaceCleanupFn | null = null;

/**
 * Issue #244: Register a workspace cleanup function.
 */
export function registerWorkspaceCleanup(fn: WorkspaceCleanupFn): void {
	workspaceCleanupFn = fn;
}

/**
 * Issue #244: Get current workspace cleanup function (for testing).
 */
export function getWorkspaceCleanupFn(): WorkspaceCleanupFn | null {
	return workspaceCleanupFn;
}

/**
 * Issue #244: Run workspace cleanup. Called on CLEANUP transition.
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
	};
}

/**
 * Prüft ob eine Phase terminal ist (keine weiteren Übergänge).
 * DONE, FAILED_BLOCKED, and FAILED_UNSAFE are terminal even though
 * they may transition to CLEANUP (automatic post-processing).
 */
export function isTerminalPhase(phase: Phase): boolean {
	const allowed = VALID_TRANSITIONS[phase];
	if (!allowed || allowed.length === 0) return true;
	// DONE/FAILED_BLOCKED/FAILED_UNSAFE → CLEANUP only - still terminal
	if (allowed.length === 1 && allowed[0] === 'CLEANUP') return true;
	return false;
}

/**
 * Prüft ob eine Phase ein Fehlerzustand ist.
 */
export function isFailurePhase(phase: Phase): boolean {
	return (
		phase === 'FAILED' ||
		phase === 'FAILED_TRANSIENT' ||
		phase === 'FAILED_BLOCKED' ||
		phase === 'FAILED_UNSAFE'
	);
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
