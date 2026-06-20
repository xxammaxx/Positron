// Positron — Datenbank-Verbindungsverwaltung

import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { POSITRON_DB_PATH, DB_TIMEOUT_MS } from './constants.js';
import { applyMigrations } from './schema.js';

/** Globale Datenbank-Instanz */
let dbInstance: Database.Database | null = null;

/** Liste registrierter Datenbanken für Graceful Shutdown */
const registeredDatabases: Database.Database[] = [];

/**
 * Ermittelt den Standard-Datenbankpfad.
 * Überschreibbar via POSITRON_DB_PATH Umgebungsvariable.
 */
export function resolveDatabasePath(): string {
	return process.env['POSITRON_DB_PATH'] ?? POSITRON_DB_PATH;
}

/**
 * Öffnet die SQLite-Datenbank mit allen PRAGMAs und führt Migrationen aus.
 * @param dbPath Optionaler Pfad zur SQLite-Datei. Default: ~/.positron/positron.db
 */
export function openDatabase(dbPath?: string): Database.Database {
	const resolvedPath = dbPath ?? resolveDatabasePath();

	// Stelle sicher, dass das Verzeichnis existiert
	const dir = path.dirname(resolvedPath);
	if (!fs.existsSync(dir)) {
		fs.mkdirSync(dir, { recursive: true });
	}

	const db = new Database(resolvedPath);

	// PRAGMA-Einstellungen
	db.pragma('journal_mode = WAL');
	db.pragma('foreign_keys = ON');
	db.pragma(`busy_timeout = ${DB_TIMEOUT_MS}`);

	// Migrationen ausführen
	applyMigrations(db);

	dbInstance = db;
	return db;
}

/**
 * Schließt die Datenbank (synchron).
 */
export function closeDatabase(): void {
	if (dbInstance) {
		dbInstance.close();
		dbInstance = null;
	}
}

/**
 * Registriert eine DB-Instanz für Graceful Shutdown.
 */
export function registerDatabase(db: Database.Database): void {
	registeredDatabases.push(db);
}

/**
 * Installiert Signal-Handler für Graceful Shutdown.
 */
export function installShutdownHandlers(): void {
	const shutdown = (): void => {
		for (const db of registeredDatabases) {
			try {
				db.close();
			} catch {
				/* ignore */
			}
		}
		registeredDatabases.length = 0;
		process.exit(0);
	};

	process.on('SIGINT', shutdown);
	process.on('SIGTERM', shutdown);
}

/**
 * Führt einen Datenbank-Healthcheck durch.
 */
export function checkDatabase(db: Database.Database): { ok: boolean; details: string } {
	try {
		const row = db.prepare('SELECT COUNT(*) as cnt FROM runs').get() as { cnt: number } | undefined;
		return { ok: true, details: `Database OK, ${String(row?.cnt ?? 0)} runs` };
	} catch (err) {
		return { ok: false, details: String(err) };
	}
}
