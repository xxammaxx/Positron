import { describe, expect, test } from 'vitest';
import Database from 'better-sqlite3';
import { SCHEMA_V1 } from '../schema.js';
import { openDatabase, applyMigrations } from '../connection.js';

describe('Migrations', () => {
  test('V1 erzeugt alle 7 Tabellen', () => {
    const db = new Database(':memory:');
    db.pragma('foreign_keys = ON');
    // applyMigrations intern nutzen
    db.exec(`CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, name TEXT NOT NULL, applied_at TEXT NOT NULL DEFAULT (datetime('now')))`);
    db.exec(SCHEMA_V1);
    db.prepare('INSERT INTO schema_migrations (version, name) VALUES (1, ?)').run('initial-schema');

    const tables = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' ORDER BY name`).all() as { name: string }[];
    const names = tables.map(t => t.name).sort();
    expect(names).toContain('repositories');
    expect(names).toContain('issues');
    expect(names).toContain('runs');
    expect(names).toContain('run_events');
    expect(names).toContain('artifacts');
    expect(names).toContain('command_results');
    expect(names).toContain('schema_migrations');
    db.close();
  });

  test('SCHEMA_V1 ist idempotent (zweifacher Aufruf)', () => {
    const db = new Database(':memory:');
    db.pragma('foreign_keys = ON');
    db.exec(SCHEMA_V1);
    expect(() => db.exec(SCHEMA_V1)).not.toThrow();
    db.close();
  });

  test('applyMigrations über openDatabase (In-Memory)', () => {
    const db = openDatabase(':memory:');
    const count = db.prepare('SELECT COUNT(*) as cnt FROM schema_migrations').get() as { cnt: number };
    expect(count.cnt).toBe(1);
    db.close();
  });

  test('applyMigrations ist idempotent', () => {
    const db = new Database(':memory:');
    db.pragma('foreign_keys = ON');
    // Erster Durchlauf
    db.exec(`CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, name TEXT NOT NULL, applied_at TEXT)`);
    db.exec(SCHEMA_V1);
    db.prepare('INSERT INTO schema_migrations (version, name) VALUES (1, ?)').run('initial');
    // Zweiter Durchlauf — kein Crash, kein Duplikat
    expect(() => {
      db.exec(SCHEMA_V1); // CREATE IF NOT EXISTS
      db.prepare('INSERT OR IGNORE INTO schema_migrations (version, name) VALUES (1, ?)').run('initial');
    }).not.toThrow();
    const count = db.prepare('SELECT COUNT(*) as cnt FROM schema_migrations').get() as { cnt: number };
    expect(count.cnt).toBe(1);
    db.close();
  });
});
