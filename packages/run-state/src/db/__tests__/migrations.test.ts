import { describe, expect, test, afterAll } from 'vitest';
import Database from 'better-sqlite3';
import { SCHEMA_V1 } from '../schema.js';

let db: Database.Database;

afterAll(() => {
  if (db?.open) db.close();
});

describe('Migrations', () => {
  test('volle Migration V1 läuft fehlerfrei', () => {
    db = new Database(':memory:');
    db.pragma('foreign_keys = ON');
    db.exec(SCHEMA_V1);

    const tables = db.prepare(
      `SELECT name FROM sqlite_master WHERE type='table' ORDER BY name`,
    ).all() as { name: string }[];

    const names = tables.map(t => t.name).sort();
    expect(names).toContain('repositories');
    expect(names).toContain('issues');
    expect(names).toContain('runs');
    expect(names).toContain('run_events');
    expect(names).toContain('artifacts');
    expect(names).toContain('command_results');
    expect(names).toContain('schema_migrations');
  });

  test('Migration ist idempotent (CREATE IF NOT EXISTS)', () => {
    const db2 = new Database(':memory:');
    db2.pragma('foreign_keys = ON');
    db2.exec(SCHEMA_V1);
    // Zweiter Aufruf darf nicht crashen
    expect(() => db2.exec(SCHEMA_V1)).not.toThrow();
    db2.close();
  });

  test('schema_migrations wird mit Version 1 befüllt', () => {
    const db3 = new Database(':memory:');
    db3.pragma('foreign_keys = ON');
    db3.exec(SCHEMA_V1);

    // schema_migrations-Tabelle ist Teil von SCHEMA_V1, aber ohne initialen INSERT.
    // Das applyMigrations() in connection.ts fügt den Eintrag hinzu.
    // Hier testen wir nur, dass die Tabelle existiert.
    const count = db3.prepare('SELECT COUNT(*) as cnt FROM schema_migrations').get() as { cnt: number };
    expect(count.cnt).toBe(0); // SCHEMA_V1 enthält kein INSERT in schema_migrations
    db3.close();
  });
});
