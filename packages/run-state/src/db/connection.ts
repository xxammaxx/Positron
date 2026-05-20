// Positron — Datenbank-Verbindung (better-sqlite3)

import Database from 'better-sqlite3';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';
import { POSITRON_DB_PATH, DB_TIMEOUT_MS } from './constants.js';
import { SCHEMA_V1 } from './schema.js';

/** Öffnet die SQLite-Datenbank mit allen PRAGMAs und führt Migrationen aus. */
export function openDatabase(dbPath?: string): Database.Database {
  const resolvedPath = dbPath ?? resolveDatabasePath();
  const dir = path.dirname(resolvedPath);
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });

  const db = new Database(resolvedPath, {
    timeout: DB_TIMEOUT_MS,
    fileMustExist: false,
  });

  // PRAGMAs setzen
  db.pragma('foreign_keys = ON');
  db.pragma('journal_mode = WAL');
  db.pragma('busy_timeout = 5000');
  db.pragma('synchronous = NORMAL');

  // Migrationen ausführen
  applyMigrations(db);

  return db;
}

/** Standard-Datenbankpfad: ~/.positron/positron.db oder POSITRON_DB_PATH */
export function resolveDatabasePath(): string {
  const configured = process.env.POSITRON_DB_PATH?.trim();
  if (configured) return path.resolve(configured);
  return path.join(os.homedir(), '.positron', 'positron.db');
}

// ---------------------------------------------------------------------------
// Migrationen
// ---------------------------------------------------------------------------

interface Migration {
  version: number;
  name: string;
  up: string; // SQL-DDL
}

const MIGRATIONS: Migration[] = [
  { version: 1, name: 'initial-schema', up: SCHEMA_V1 },
];

function applyMigrations(db: Database.Database): void {
  // Sicherstellen, dass die Migrations-Tabelle existiert (Teil von SCHEMA_V1,
  // aber wir rufen applyMigrations vorsichtshalber nochmal eigens auf)
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  const applied = new Set<number>(
    db.prepare('SELECT version FROM schema_migrations').all()
      .map((r: unknown) => (r as { version: number }).version),
  );

  const run = db.transaction(() => {
    for (const migration of MIGRATIONS.sort((a, b) => a.version - b.version)) {
      if (applied.has(migration.version)) continue;

      db.exec(migration.up);
      db.prepare('INSERT INTO schema_migrations (version, name) VALUES (?, ?)')
        .run(migration.version, migration.name);
    }
  });

  run();

  // Optional: Foreign-Key-Integritäts-Check nach Migration
  const violations = db.pragma('foreign_key_check') as unknown[];
  if (Array.isArray(violations) && violations.length > 0) {
    throw new Error(`FK-Verletzungen nach Migration: ${JSON.stringify(violations)}`);
  }
}

// ---------------------------------------------------------------------------
// Graceful Shutdown
// ---------------------------------------------------------------------------

let activeDb: Database.Database | null = null;

/** Registriert die DB für Graceful Shutdown. */
export function registerDatabase(db: Database.Database): void {
  activeDb = db;
}

/** Schließt die Datenbank (synchron). */
export function closeDatabase(): void {
  if (activeDb?.open) {
    activeDb.close();
    activeDb = null;
  }
}

/** Installiert Signal-Handler für Graceful Shutdown. */
export function installShutdownHandlers(): void {
  const shutdown = (signal: string) => {
    if (activeDb?.open) activeDb.close();
    process.exit(signal === 'SIGINT' ? 130 : 143);
  };

  process.once('SIGINT', () => shutdown('SIGINT'));
  process.once('SIGTERM', () => shutdown('SIGTERM'));
}

// ---------------------------------------------------------------------------
// Healthcheck
// ---------------------------------------------------------------------------

/** Führt einen Datenbank-Healthcheck durch. */
export function checkDatabase(db: Database.Database): { ok: boolean; details: string } {
  try {
    const fk = db.pragma('foreign_keys', { simple: true });
    if (fk !== 1) return { ok: false, details: 'foreign_keys sind nicht aktiv' };

    const quick = db.pragma('quick_check', { simple: true });
    if (quick !== 'ok') return { ok: false, details: `quick_check fehlgeschlagen: ${quick}` };

    // Tabelle existiert und ist querybar
    const count = db.prepare('SELECT COUNT(*) as cnt FROM schema_migrations').get() as { cnt: number };
    return { ok: true, details: `${count.cnt} Migrationen angewendet` };
  } catch (err) {
    return { ok: false, details: String(err) };
  }
}
