import { describe, it, expect } from 'vitest';
import {
  POSITRON_DB_PATH,
  DB_TIMEOUT_MS,
  MAX_EVENTS_PER_RUN,
  MAX_RUNS,
  PRAGMA_SETTINGS,
} from '../../db/constants.js';

describe('POSITRON_DB_PATH', () => {
  it('should end with .positron/positron.db', () => {
    expect(POSITRON_DB_PATH).toMatch(/\.positron\/positron\.db$/);
  });

  it('should be an absolute path', () => {
    expect(POSITRON_DB_PATH.startsWith('/')).toBe(true);
  });
});

describe('DB_TIMEOUT_MS', () => {
  it('should be 5000', () => {
    expect(DB_TIMEOUT_MS).toBe(5000);
  });
});

describe('MAX_EVENTS_PER_RUN', () => {
  it('should be a positive integer', () => {
    expect(MAX_EVENTS_PER_RUN).toBeGreaterThan(0);
    expect(Number.isInteger(MAX_EVENTS_PER_RUN)).toBe(true);
  });
});

describe('MAX_RUNS', () => {
  it('should be a positive integer', () => {
    expect(MAX_RUNS).toBeGreaterThan(0);
    expect(Number.isInteger(MAX_RUNS)).toBe(true);
  });
});

describe('PRAGMA_SETTINGS', () => {
  it('should use WAL journal mode', () => {
    expect(PRAGMA_SETTINGS.journalMode).toBe('WAL');
  });

  it('should enable foreign keys', () => {
    expect(PRAGMA_SETTINGS.foreignKeys).toBe('ON');
  });

  it('should set busyTimeout from DB_TIMEOUT_MS', () => {
    expect(PRAGMA_SETTINGS.busyTimeout).toBe(DB_TIMEOUT_MS);
  });
});
