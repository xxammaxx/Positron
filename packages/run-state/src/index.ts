// Positron — Run State Package: Zentrale Exporte

export { openDatabase, resolveDatabasePath, closeDatabase, registerDatabase, installShutdownHandlers, checkDatabase } from './db/connection.js';
export { POSITRON_DB_PATH, DB_TIMEOUT_MS } from './db/constants.js';
export { SCHEMA_V1, applyMigrations } from './db/schema.js';
export { VALID_TRANSITIONS, createRun, canTransition, transition, markFailed, retry, resumeFromEvents, isTerminalPhase, isFailurePhase, registerGateEvaluator, clearGateEvaluators, evaluateGates, getRequiredGatesForPhase, PHASE_GATE_REQUIREMENTS, registerWorkspaceCleanup, runCleanup, getWorkspaceCleanupFn, tryTransitionWithGates } from './state-machine.js';
export type { RunState, RunEventData, RunStore, TransitionResult, GateEvaluator, WorkspaceCleanupFn } from './state-machine.js';
