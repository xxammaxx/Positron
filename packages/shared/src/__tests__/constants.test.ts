import { describe, it, expect } from 'vitest';
import {
  POSITRON_LABELS,
  POSITRON_LABEL_PREFIX,
  MAX_FIX_LOOPS,
  MAX_DIFF_SIZE,
  POLLING_INTERVAL_MS,
  MAX_POLLING_INTERVAL_MS,
  CLI_TIMEOUT_MS,
  CLI_MAX_RETRIES,
  POSITRON_VERSION,
  BRANCH_PREFIX,
  MAX_BRANCH_SLUG_LENGTH,
  PHASE_ORDER,
  TERMINAL_PHASES,
  BLOCKED_PHASES,
  AUTONOMY_LEVELS,
} from '../constants.js';
import { ALL_PHASES } from '../types.js';

describe('POSITRON_LABELS', () => {
  it('should contain all 12 expected labels', () => {
    expect(POSITRON_LABELS).toHaveLength(12);
  });

  it('should all start with positron: prefix', () => {
    for (const label of POSITRON_LABELS) {
      expect(label).toMatch(/^positron:/);
    }
  });

  it('should contain ready and done labels', () => {
    expect(POSITRON_LABELS).toContain('positron:ready');
    expect(POSITRON_LABELS).toContain('positron:done');
  });

  it('should be readonly typed array', () => {
    // as const makes elements readonly but does not Object.freeze()
    const copy: readonly string[] = POSITRON_LABELS;
    expect(copy).toHaveLength(12);
  });
});

describe('POSITRON_LABEL_PREFIX', () => {
  it('should be "positron:"', () => {
    expect(POSITRON_LABEL_PREFIX).toBe('positron:');
  });
});

describe('MAX_FIX_LOOPS', () => {
  it('should be 3', () => {
    expect(MAX_FIX_LOOPS).toBe(3);
  });

  it('should be a positive integer', () => {
    expect(Number.isInteger(MAX_FIX_LOOPS)).toBe(true);
    expect(MAX_FIX_LOOPS).toBeGreaterThan(0);
  });
});

describe('MAX_DIFF_SIZE', () => {
  it('should be 400', () => {
    expect(MAX_DIFF_SIZE).toBe(400);
  });
});

describe('POLLING_INTERVAL_MS', () => {
  it('should be 60000', () => {
    expect(POLLING_INTERVAL_MS).toBe(60_000);
  });
});

describe('MAX_POLLING_INTERVAL_MS', () => {
  it('should be 180000', () => {
    expect(MAX_POLLING_INTERVAL_MS).toBe(180_000);
  });

  it('should be larger than POLLING_INTERVAL_MS', () => {
    expect(MAX_POLLING_INTERVAL_MS).toBeGreaterThan(POLLING_INTERVAL_MS);
  });
});

describe('CLI_TIMEOUT_MS', () => {
  it('should be 120000', () => {
    expect(CLI_TIMEOUT_MS).toBe(120_000);
  });
});

describe('CLI_MAX_RETRIES', () => {
  it('should be 2', () => {
    expect(CLI_MAX_RETRIES).toBe(2);
  });
});

describe('POSITRON_VERSION', () => {
  it('should be a semver-like string', () => {
    expect(POSITRON_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });
});

describe('BRANCH_PREFIX', () => {
  it('should be "positron/issue"', () => {
    expect(BRANCH_PREFIX).toBe('positron/issue');
  });
});

describe('MAX_BRANCH_SLUG_LENGTH', () => {
  it('should be a positive number', () => {
    expect(MAX_BRANCH_SLUG_LENGTH).toBeGreaterThan(0);
  });
});

describe('PHASE_ORDER', () => {
  it('should contain exactly 28 phases', () => {
    expect(PHASE_ORDER).toHaveLength(28);
  });

  it('should contain all phases from ALL_PHASES', () => {
    for (const phase of ALL_PHASES) {
      expect(PHASE_ORDER).toContain(phase);
    }
  });

  it('should contain all phases exactly once', () => {
    const unique = new Set(PHASE_ORDER);
    expect(unique.size).toBe(28);
  });

  it('should start with QUEUED and end with CLEANUP', () => {
    expect(PHASE_ORDER[0]).toBe('QUEUED');
    expect(PHASE_ORDER[PHASE_ORDER.length - 1]).toBe('CLEANUP');
  });

  it('should have DONE before failure phases', () => {
    const doneIndex = PHASE_ORDER.indexOf('DONE');
    const failedIndex = PHASE_ORDER.indexOf('FAILED');
    expect(doneIndex).toBeLessThan(failedIndex);
  });
});

describe('TERMINAL_PHASES', () => {
  it('should contain 5 phases', () => {
    expect(TERMINAL_PHASES).toHaveLength(5);
  });

  it('should contain DONE and all FAILED variants', () => {
    expect(TERMINAL_PHASES).toContain('DONE');
    expect(TERMINAL_PHASES).toContain('FAILED');
    expect(TERMINAL_PHASES).toContain('FAILED_BLOCKED');
    expect(TERMINAL_PHASES).toContain('FAILED_UNSAFE');
    expect(TERMINAL_PHASES).toContain('CLEANUP');
  });

  it('should be a subset of ALL_PHASES', () => {
    for (const phase of TERMINAL_PHASES) {
      expect(ALL_PHASES).toContain(phase);
    }
  });
});

describe('BLOCKED_PHASES', () => {
  it('should contain 5 phases', () => {
    expect(BLOCKED_PHASES).toHaveLength(5);
  });

  it('should contain expected blocked phases', () => {
    expect(BLOCKED_PHASES).toContain('BLOCKED_PUSH');
    expect(BLOCKED_PHASES).toContain('BLOCKED_MERGE');
    expect(BLOCKED_PHASES).toContain('GATE_APPROVE');
    expect(BLOCKED_PHASES).toContain('GATE_REVISE');
    expect(BLOCKED_PHASES).toContain('RESUME_PENDING');
  });

  it('should be a subset of ALL_PHASES', () => {
    for (const phase of BLOCKED_PHASES) {
      expect(ALL_PHASES).toContain(phase);
    }
  });

  it('should not overlap with TERMINAL_PHASES', () => {
    const terminalSet = new Set(TERMINAL_PHASES);
    for (const phase of BLOCKED_PHASES) {
      expect(terminalSet.has(phase)).toBe(false);
    }
  });
});

describe('AUTONOMY_LEVELS', () => {
  it('should have FULL, SEMI, and MANUAL keys', () => {
    expect(AUTONOMY_LEVELS).toHaveProperty('FULL');
    expect(AUTONOMY_LEVELS).toHaveProperty('SEMI');
    expect(AUTONOMY_LEVELS).toHaveProperty('MANUAL');
  });

  it('FULL should be 0', () => {
    expect(AUTONOMY_LEVELS.FULL).toBe(0);
  });

  it('SEMI should be 1', () => {
    expect(AUTONOMY_LEVELS.SEMI).toBe(1);
  });

  it('MANUAL should be 2', () => {
    expect(AUTONOMY_LEVELS.MANUAL).toBe(2);
  });
});
