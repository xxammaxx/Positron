// Positron Run State Package — Barrel Export
export { openDatabase, resolveDatabasePath, closeDatabase, registerDatabase, installShutdownHandlers, checkDatabase, applyMigrations } from './db/connection.js';
export { POSITRON_DB_PATH, DB_TIMEOUT_MS } from './db/constants.js';
export { SCHEMA_V1 } from './db/schema.js';
export { VALID_TRANSITIONS, createRun, canTransition, transition, markFailed, retry, resumeFromEvents } from './state-machine.js';
export type { RunState, RunEventData, RunStore, TransitionResult } from './state-machine.js';
