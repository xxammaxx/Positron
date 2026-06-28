/**
 * Run Signals — Database-backed run control signals.
 *
 * Signals (PAUSE, ABORT, RESUME, RETRY) are persisted in the `run_signals`
 * table so they survive server restarts. The `target_phase` column records
 * the desired resume target for RESUME signals.
 */

import type Database from 'better-sqlite3';

export type RunControlAction = 'PAUSE' | 'ABORT' | 'RESUME' | 'RETRY';

/** Module-level database reference — set via initSignalsDb(). */
let _db: Database.Database | null = null;

/**
 * Initialise the signals module with a database connection.
 * Must be called once after the database has been opened.
 */
export function initSignalsDb(db: Database.Database): void {
	_db = db;
}

function getDb(): Database.Database {
	if (!_db) throw new Error('Signals DB not initialised. Call initSignalsDb() first.');
	return _db;
}

/**
 * Persist a run-control signal.
 *
 * INSERT OR REPLACE ensures idempotency — calling setRunSignal twice with
 * the same (runId, signal) pair simply updates `target_phase` and `created_at`.
 */
export function setRunSignal(runId: string, signal: string, targetPhase?: string): void {
	const db = getDb();
	db.prepare(`
    INSERT OR REPLACE INTO run_signals (run_id, signal, target_phase, created_at)
    VALUES (?, ?, ?, datetime('now'))
  `).run(runId, signal, targetPhase ?? null);
}

/**
 * Remove a specific signal for a run.
 */
export function clearRunSignal(runId: string, signal: string): void {
	const db = getDb();
	db.prepare('DELETE FROM run_signals WHERE run_id = ? AND signal = ?').run(runId, signal);
}

/**
 * Check for an active run-control signal.
 *
 * When `phase` is provided, only signals whose `target_phase` matches the
 * current phase (or has no target_phase restriction) are considered.
 *
 * Returns the signal name (e.g. 'PAUSE', 'ABORT', 'RESUME', 'RETRY') or
 * `null` when no signal is set.
 */
export function checkRunSignal(runId: string, phase?: string): string | null {
	const db = getDb();

	let row: { signal: string; target_phase: string | null } | undefined;

	if (phase) {
		row = db
			.prepare(`
      SELECT signal, target_phase FROM run_signals
      WHERE run_id = ?
        AND (target_phase = ? OR target_phase IS NULL)
      ORDER BY created_at DESC
      LIMIT 1
    `)
			.get(runId, phase) as { signal: string; target_phase: string | null } | undefined;
	} else {
		row = db
			.prepare(`
      SELECT signal, target_phase FROM run_signals
      WHERE run_id = ?
      ORDER BY created_at DESC
      LIMIT 1
    `)
			.get(runId) as { signal: string; target_phase: string | null } | undefined;
	}

	return row?.signal ?? null;
}

/**
 * Retrieve the `target_phase` stored alongside a RESUME signal.
 * Returns `null` when no RESUME signal with a target_phase exists for the run.
 */
export function getResumePhaseTarget(runId: string): string | null {
	const db = getDb();
	const row = db
		.prepare(`
    SELECT target_phase FROM run_signals
    WHERE run_id = ? AND signal = 'RESUME' AND target_phase IS NOT NULL
    ORDER BY created_at DESC
    LIMIT 1
  `)
		.get(runId) as { target_phase: string } | undefined;

	return row?.target_phase ?? null;
}
