import { describe, expect, test, afterAll } from 'vitest';
import Database from 'better-sqlite3';
import { checkDatabase } from '../connection.js';

let db: Database.Database;

afterAll(() => {
  if (db?.open) db.close();
});

describe('connection', () => {
  test('openDatabase mit :memory: funktioniert', () => {
    // In-Memory-DB simulieren
    db = new Database(':memory:');
    db.pragma('foreign_keys = ON');
    db.pragma('journal_mode = WAL');

    // Minimal-Schema für Healthcheck
    db.exec(`CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, name TEXT, applied_at TEXT)`);
    db.prepare('INSERT INTO schema_migrations (version, name) VALUES (?,?)').run(1, 'test');

    const result = checkDatabase(db);
    expect(result.ok).toBe(true);
    expect(result.details).toContain('1');
  });

  test('checkDatabase erkennt fehlende Foreign Keys', () => {
    const db2 = new Database(':memory:');
    db2.pragma('foreign_keys = OFF');
    db2.exec(`CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, name TEXT, applied_at TEXT)`);
    const result = checkDatabase(db2);
    expect(result.ok).toBe(false);
    expect(result.details).toContain('foreign_keys');
    db2.close();
  });
});
