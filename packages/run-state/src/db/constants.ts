// Positron — Run State Datenbank-Konstanten

import os from 'node:os';
import path from 'node:path';

/** Standard-Pfad zur SQLite-Datenbank */
export const POSITRON_DB_PATH = path.join(os.homedir(), '.positron', 'positron.db');

/** Timeout für Datenbank-Operationen in ms */
export const DB_TIMEOUT_MS = 5000;

/** Maximale Anzahl von Events pro Run */
export const MAX_EVENTS_PER_RUN = 10000;

/** Maximale Anzahl von Runs */
export const MAX_RUNS = 1000;

/** SQLite PRAGMA-Einstellungen */
export const PRAGMA_SETTINGS = {
	journalMode: 'WAL',
	foreignKeys: 'ON',
	busyTimeout: DB_TIMEOUT_MS,
} as const;
