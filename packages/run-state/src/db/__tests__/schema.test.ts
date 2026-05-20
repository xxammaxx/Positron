import { describe, expect, test, beforeAll } from 'vitest';
import Database from 'better-sqlite3';

let db: Database.Database;

beforeAll(() => {
  db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  db.exec(`
    CREATE TABLE repositories (
      id TEXT PRIMARY KEY,
      owner TEXT NOT NULL,
      name TEXT NOT NULL,
      url TEXT NOT NULL,
      local_path TEXT NOT NULL,
      default_branch TEXT,
      enabled INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE issues (
      id TEXT PRIMARY KEY,
      repo_id TEXT NOT NULL REFERENCES repositories(id) ON DELETE RESTRICT,
      number INTEGER NOT NULL,
      title TEXT NOT NULL,
      state TEXT NOT NULL DEFAULT 'open',
      labels_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(labels_json)),
      last_seen_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE runs (
      id TEXT PRIMARY KEY,
      repo_id TEXT NOT NULL REFERENCES repositories(id) ON DELETE RESTRICT,
      issue_number INTEGER NOT NULL,
      branch TEXT,
      phase TEXT NOT NULL DEFAULT 'QUEUED',
      status TEXT NOT NULL DEFAULT 'active',
      autonomy_level INTEGER NOT NULL DEFAULT 0,
      attempt INTEGER NOT NULL DEFAULT 0,
      started_at TEXT,
      finished_at TEXT
    );
    CREATE TABLE run_events (
      id TEXT PRIMARY KEY,
      run_id TEXT NOT NULL REFERENCES runs(id) ON DELETE RESTRICT,
      phase TEXT NOT NULL,
      level TEXT NOT NULL DEFAULT 'INFO',
      message TEXT NOT NULL,
      payload_json TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE artifacts (
      id TEXT PRIMARY KEY,
      run_id TEXT NOT NULL REFERENCES runs(id) ON DELETE RESTRICT,
      kind TEXT NOT NULL,
      path TEXT NOT NULL,
      sha256 TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE command_results (
      id TEXT PRIMARY KEY,
      run_id TEXT NOT NULL REFERENCES runs(id) ON DELETE RESTRICT,
      command TEXT NOT NULL,
      exit_code INTEGER,
      stdout_path TEXT,
      stderr_path TEXT,
      duration_ms INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
});

describe('Schema', () => {
  test('repositories — INSERT und SELECT', () => {
    db.prepare(`INSERT INTO repositories (id, owner, name, url, local_path) VALUES (?,?,?,?,?)`)
      .run('r1', 'xxammaxx', 'Positron', 'https://github.com/xxammaxx/Positron', '/tmp/positron');

    const row = db.prepare('SELECT * FROM repositories WHERE id = ?').get('r1') as Record<string, unknown>;
    expect(row.owner).toBe('xxammaxx');
    expect(row.enabled).toBe(1);
  });

  test('issues — INSERT mit JSON-Labels', () => {
    db.prepare(`INSERT INTO repositories (id, owner, name, url, local_path) VALUES (?,?,?,?,?)`)
      .run('r2', 'test', 'test-repo', 'https://example.com', '/tmp/test');

    const labels = ['bug', 'mvp-1'];
    db.prepare(`INSERT INTO issues (id, repo_id, number, title, labels_json) VALUES (?,?,?,?,?)`)
      .run('i1', 'r2', 1, 'Test-Issue', JSON.stringify(labels));

    const row = db.prepare('SELECT * FROM issues WHERE id = ?').get('i1') as Record<string, unknown>;
    expect(JSON.parse(row.labels_json as string)).toEqual(labels);
  });

  test('runs — INSERT und SELECT', () => {
    db.prepare(`INSERT INTO runs (id, repo_id, issue_number, autonomy_level) VALUES (?,?,?,?)`)
      .run('run1', 'r2', 1, 2);

    const row = db.prepare('SELECT * FROM runs WHERE id = ?').get('run1') as Record<string, unknown>;
    expect(row.phase).toBe('QUEUED');
    expect(row.status).toBe('active');
    expect(row.autonomy_level).toBe(2);
  });

  test('run_events — INSERT', () => {
    db.prepare(`INSERT INTO run_events (id, run_id, phase, level, message) VALUES (?,?,?,?,?)`)
      .run('evt1', 'run1', 'CLAIMED', 'INFO', 'Issue claimed');

    const row = db.prepare('SELECT * FROM run_events WHERE id = ?').get('evt1') as Record<string, unknown>;
    expect(row.message).toBe('Issue claimed');
  });

  test('artifacts — INSERT', () => {
    db.prepare(`INSERT INTO artifacts (id, run_id, kind, path, sha256) VALUES (?,?,?,?,?)`)
      .run('art1', 'run1', 'spec', 'specs/feature/spec.md', 'abc123');

    const row = db.prepare('SELECT * FROM artifacts WHERE id = ?').get('art1') as Record<string, unknown>;
    expect(row.kind).toBe('spec');
  });

  test('command_results — INSERT', () => {
    db.prepare(`INSERT INTO command_results (id, run_id, command, exit_code, duration_ms) VALUES (?,?,?,?,?)`)
      .run('cmd1', 'run1', 'npm test', 0, 1234);

    const row = db.prepare('SELECT * FROM command_results WHERE id = ?').get('cmd1') as Record<string, unknown>;
    expect(row.exit_code).toBe(0);
  });
});

describe('Constraints', () => {
  test('Foreign-Key-Verletzung wird abgelehnt', () => {
    expect(() => {
      db.prepare(`INSERT INTO issues (id, repo_id, number, title) VALUES (?,?,?,?)`)
        .run('i99', 'nonexistent', 99, 'Bad');
    }).toThrow();
  });

  test('JSON-Check lehnt ungültiges JSON ab', () => {
    expect(() => {
      db.prepare(`INSERT INTO issues (id, repo_id, number, title, labels_json) VALUES (?,?,?,?,?)`)
        .run('i2', 'r2', 2, 'Bad JSON', 'not-json');
    }).toThrow();
  });

  test('DELETE mit RESTRICT auf referenzierte Tabelle', () => {
    expect(() => {
      db.prepare('DELETE FROM repositories WHERE id = ?').run('r2');
    }).toThrow();
  });
});
