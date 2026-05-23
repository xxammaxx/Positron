import { describe, expect, test } from 'vitest';
import { ALL_PHASES, POSITRON_LABELS, POSITRON_VERSION, MAX_FIX_LOOPS, MAX_DIFF_SIZE, POLLING_INTERVAL_MS, BRANCH_PREFIX, MAX_BRANCH_SLUG_LENGTH } from '../index.js';

describe('types', () => {
  test('ALL_PHASES enthält 21 Phasen', () => {
    expect(ALL_PHASES.length).toBe(21);
    expect(ALL_PHASES).toContain('QUEUED');
    expect(ALL_PHASES).toContain('DONE');
    expect(ALL_PHASES).toContain('FAILED_UNSAFE');
  });

  test('ALL_PHASES ohne Duplikate', () => {
    expect(new Set(ALL_PHASES).size).toBe(ALL_PHASES.length);
  });
});

describe('constants', () => {
  test('POSITRON_LABELS sind 12 (ready, running, research, repo-sync, planning, implementing, testing, blocked, failed, pr-created, merged, done)', () => {
    expect(POSITRON_LABELS.length).toBe(12);
  });

  test('POSITRON_LABELS enthält positron:ready', () => {
    expect(POSITRON_LABELS).toContain('positron:ready');
  });

  test('POSITRON_LABELS enthält positron:failed', () => {
    expect(POSITRON_LABELS).toContain('positron:failed');
  });

  test('POSITRON_LABELS enthält positron:repo-sync', () => {
    expect(POSITRON_LABELS).toContain('positron:repo-sync');
  });

  test('POSITRON_LABELS enthält positron:blocked', () => {
    expect(POSITRON_LABELS).toContain('positron:blocked');
  });

  test('POSITRON_LABELS enthält positron:done', () => {
    expect(POSITRON_LABELS).toContain('positron:done');
  });

  test('POSITRON_LABELS ohne Duplikate', () => {
    expect(new Set(POSITRON_LABELS).size).toBe(POSITRON_LABELS.length);
  });
  test('MAX_FIX_LOOPS = 3', () => { expect(MAX_FIX_LOOPS).toBe(3); });
  test('MAX_DIFF_SIZE = 400', () => { expect(MAX_DIFF_SIZE).toBe(400); });
  test('POLLING_INTERVAL_MS = 60_000', () => { expect(POLLING_INTERVAL_MS).toBe(60_000); });
  test('BRANCH_PREFIX', () => { expect(BRANCH_PREFIX).toBe('positron/issue'); });
  test('VERSION', () => { expect(POSITRON_VERSION).toBe('0.1.0'); });
  test('MAX_BRANCH_SLUG_LENGTH = 50', () => { expect(MAX_BRANCH_SLUG_LENGTH).toBe(50); });
});
