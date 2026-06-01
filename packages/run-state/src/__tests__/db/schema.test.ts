import { describe, it, expect, beforeAll } from 'vitest';
import Database from 'better-sqlite3';
import { SCHEMA_V1, applyMigrations } from '../../db/schema.js';

let db: Database.Database;

beforeAll(() => {
  db = new Database(':memory:');
  applyMigrations(db);
});

describe('SCHEMA_V1', () => {
  it('should contain CREATE TABLE statements for all expected tables', () => {
    const tables = ['repositories', 'issues', 'runs', 'run_events', 'artifacts', 'command_results', 'run_signals', 'settings'];
    for (const table of tables) {
      expect(SCHEMA_V1).toContain(`CREATE TABLE IF NOT EXISTS ${table}`);
    }
  });

  it('should contain CREATE INDEX statements', () => {
    expect(SCHEMA_V1).toContain('CREATE INDEX IF NOT EXISTS');
  });
});

describe('applyMigrations', () => {
  it('should create all tables in database', () => {
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all() as { name: string }[];
    const tableNames = tables.map(t => t.name);
    expect(tableNames).toContain('repositories');
    expect(tableNames).toContain('issues');
    expect(tableNames).toContain('runs');
    expect(tableNames).toContain('run_events');
    expect(tableNames).toContain('artifacts');
    expect(tableNames).toContain('command_results');
    expect(tableNames).toContain('run_signals');
    expect(tableNames).toContain('settings');
  });

  it('should have exactly 8 tables (excluding sqlite internal)', () => {
    const count = db.prepare("SELECT COUNT(*) as cnt FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").get() as { cnt: number };
    expect(count.cnt).toBe(8);
  });

  it('should create indexes', () => {
    const indexes = db.prepare("SELECT name FROM sqlite_master WHERE type='index' AND name NOT LIKE 'sqlite_autoindex%'").all() as { name: string }[];
    const indexNames = indexes.map(i => i.name);
    expect(indexNames).toContain('idx_runs_repo_id');
    expect(indexNames).toContain('idx_runs_phase');
    expect(indexNames).toContain('idx_runs_status');
    expect(indexNames).toContain('idx_runs_started_at');
    expect(indexNames).toContain('idx_run_events_run_id');
    expect(indexNames).toContain('idx_run_events_created');
    expect(indexNames).toContain('idx_artifacts_run_id');
    expect(indexNames).toContain('idx_issues_repo_id');
    expect(indexNames).toContain('idx_run_signals_run_id');
    expect(indexNames).toContain('idx_repositories_owner_name');
  });

  it('should be idempotent (calling applyMigrations twice does not fail)', () => {
    // Call applyMigrations again — should not throw
    expect(() => applyMigrations(db)).not.toThrow();
  });

  it('should have runs table with expected columns', () => {
    const cols = db.prepare("PRAGMA table_info('runs')").all() as { name: string }[];
    const colNames = cols.map(c => c.name);
    expect(colNames).toContain('id');
    expect(colNames).toContain('repo_id');
    expect(colNames).toContain('issue_number');
    expect(colNames).toContain('branch');
    expect(colNames).toContain('phase');
    expect(colNames).toContain('status');
    expect(colNames).toContain('autonomy_level');
    expect(colNames).toContain('attempt');
    expect(colNames).toContain('last_error');
    expect(colNames).toContain('workspace_path');
    expect(colNames).toContain('started_at');
    expect(colNames).toContain('finished_at');
  });

  it('should have run_events table with expected columns', () => {
    const cols = db.prepare("PRAGMA table_info('run_events')").all() as { name: string }[];
    const colNames = cols.map(c => c.name);
    expect(colNames).toContain('id');
    expect(colNames).toContain('run_id');
    expect(colNames).toContain('phase');
    expect(colNames).toContain('level');
    expect(colNames).toContain('message');
    expect(colNames).toContain('payload_json');
    expect(colNames).toContain('created_at');
  });
});
