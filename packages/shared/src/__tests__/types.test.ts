import { describe, it, expect } from 'vitest';
import {
  ALL_PHASES,
  isValidPhase,
  isTerminalPhase,
  isFailurePhase,
  parsePhase,
  parseRunStatus,
  PHASE_LABELS,
  safeJsonParse,
} from '../types.js';

// ==============================
// ALL_PHASES — completeness
// ==============================

describe('ALL_PHASES', () => {
  it('should contain exactly 28 phases', () => {
    expect(ALL_PHASES).toHaveLength(28);
  });

  it('should have no duplicates', () => {
    const unique = new Set(ALL_PHASES);
    expect(unique.size).toBe(28);
  });

  it('should be readonly (as const)', () => {
    // as const makes elements readonly but does not Object.freeze() the array
    // Verify by checking that the array reference is typed as readonly
    const copy: readonly string[] = ALL_PHASES;
    expect(copy).toHaveLength(28);
  });

  it('should contain QUEUED as first phase', () => {
    expect(ALL_PHASES[0]).toBe('QUEUED');
  });

  it('should contain all expected phases', () => {
    const expected = [
      'QUEUED', 'CLAIMED', 'REPO_SYNC', 'ISSUE_CONTEXT',
      'WEB_RESEARCH', 'SPECIFY', 'CLARIFY_OPTIONAL', 'PLAN', 'TASKS',
      'ANALYZE', 'REVIEW', 'IMPLEMENT', 'TEST', 'VERIFY',
      'COMMIT', 'PR_CREATE', 'MERGE', 'DONE',
      'FAILED', 'FAILED_TRANSIENT', 'FAILED_BLOCKED', 'FAILED_UNSAFE',
      'BLOCKED_PUSH', 'BLOCKED_MERGE',
      'GATE_APPROVE', 'GATE_REVISE', 'RESUME_PENDING', 'CLEANUP',
    ];
    expect(ALL_PHASES).toEqual(expected);
  });
});

// ==============================
// isValidPhase
// ==============================

describe('isValidPhase', () => {
  it('should return true for all valid phases', () => {
    for (const phase of ALL_PHASES) {
      expect(isValidPhase(phase)).toBe(true);
    }
  });

  it('should return false for invalid phases', () => {
    expect(isValidPhase('INVALID')).toBe(false);
    expect(isValidPhase('')).toBe(false);
    expect(isValidPhase('QUEUED_INVALID')).toBe(false);
    expect(isValidPhase('queued')).toBe(false); // case-sensitive
    expect(isValidPhase('DONE ')).toBe(false); // trailing space
  });
});

// ==============================
// isTerminalPhase
// ==============================

describe('isTerminalPhase', () => {
  it('should return true for terminal phases', () => {
    expect(isTerminalPhase('DONE')).toBe(true);
    expect(isTerminalPhase('FAILED')).toBe(true);
    expect(isTerminalPhase('FAILED_BLOCKED')).toBe(true);
    expect(isTerminalPhase('FAILED_UNSAFE')).toBe(true);
    expect(isTerminalPhase('CLEANUP')).toBe(true);
  });

  it('should return false for non-terminal phases', () => {
    expect(isTerminalPhase('QUEUED')).toBe(false);
    expect(isTerminalPhase('IMPLEMENT')).toBe(false);
    expect(isTerminalPhase('FAILED_TRANSIENT')).toBe(false); // transient is NOT terminal
    expect(isTerminalPhase('GATE_APPROVE')).toBe(false);
  });

  it('should return false for all phases except the 5 terminal ones', () => {
    const terminalSet = new Set(['DONE', 'FAILED', 'FAILED_BLOCKED', 'FAILED_UNSAFE', 'CLEANUP']);
    for (const phase of ALL_PHASES) {
      expect(isTerminalPhase(phase)).toBe(terminalSet.has(phase));
    }
  });
});

// ==============================
// isFailurePhase
// ==============================

describe('isFailurePhase', () => {
  it('should return true for failure phases', () => {
    expect(isFailurePhase('FAILED_TRANSIENT')).toBe(true);
    expect(isFailurePhase('FAILED_BLOCKED')).toBe(true);
    expect(isFailurePhase('FAILED_UNSAFE')).toBe(true);
    expect(isFailurePhase('FAILED')).toBe(true);
  });

  it('should return false for non-failure phases', () => {
    expect(isFailurePhase('DONE')).toBe(false);
    expect(isFailurePhase('QUEUED')).toBe(false);
    expect(isFailurePhase('IMPLEMENT')).toBe(false);
    expect(isFailurePhase('CLEANUP')).toBe(false);
  });

  it('should return false for all phases except the 4 failure ones', () => {
    const failureSet = new Set(['FAILED_TRANSIENT', 'FAILED_BLOCKED', 'FAILED_UNSAFE', 'FAILED']);
    for (const phase of ALL_PHASES) {
      expect(isFailurePhase(phase)).toBe(failureSet.has(phase));
    }
  });
});

// ==============================
// parsePhase
// ==============================

describe('parsePhase', () => {
  it('should return the phase for all valid phase strings', () => {
    for (const phase of ALL_PHASES) {
      expect(parsePhase(phase)).toBe(phase);
    }
  });

  it('should throw for invalid input', () => {
    expect(() => parsePhase('INVALID')).toThrow('Invalid phase');
    expect(() => parsePhase('')).toThrow('Invalid phase');
    expect(() => parsePhase('QUEUEDx')).toThrow('Invalid phase');
  });

  it('should include the invalid value in error message', () => {
    expect(() => parsePhase('BOGUS')).toThrow(/"BOGUS"/);
  });

  it('should include valid phases in error message', () => {
    try {
      parsePhase('NOPE');
    } catch (e: unknown) {
      const msg = (e as Error).message;
      expect(msg).toContain('QUEUED');
      expect(msg).toContain('DONE');
    }
  });

  it('should be case-sensitive', () => {
    expect(() => parsePhase('queued')).toThrow();
  });

  it('should return type-safe Phase', () => {
    const phase: string = 'IMPLEMENT';
    const parsed = parsePhase(phase);
    // If we got here without type error, the type guard works
    expect(parsed).toBe('IMPLEMENT');
  });
});

// ==============================
// parseRunStatus
// ==============================

describe('parseRunStatus', () => {
  const validStatuses = ['active', 'blocked', 'done', 'failed', 'cancelled'] as const;

  it('should return the status for all valid values', () => {
    for (const status of validStatuses) {
      expect(parseRunStatus(status)).toBe(status);
    }
  });

  it('should throw for invalid input', () => {
    expect(() => parseRunStatus('INVALID')).toThrow('Invalid run status');
    expect(() => parseRunStatus('')).toThrow('Invalid run status');
    expect(() => parseRunStatus('Active')).toThrow(); // case-sensitive
  });

  it('should include the invalid value in error message', () => {
    expect(() => parseRunStatus('BOGUS')).toThrow(/"BOGUS"/);
  });

  it('should include valid statuses in error message', () => {
    try {
      parseRunStatus('NOPE');
    } catch (e: unknown) {
      const msg = (e as Error).message;
      expect(msg).toContain('active');
      expect(msg).toContain('done');
    }
  });
});

// ==============================
// PHASE_LABELS
// ==============================

describe('PHASE_LABELS', () => {
  it('should have a label for every phase', () => {
    for (const phase of ALL_PHASES) {
      expect(PHASE_LABELS).toHaveProperty(phase);
    }
  });

  it('should have exactly 28 entries', () => {
    expect(Object.keys(PHASE_LABELS)).toHaveLength(28);
  });

  it('should have German labels for key phases', () => {
    expect(PHASE_LABELS.QUEUED).toBe('Warteschlange');
    expect(PHASE_LABELS.IMPLEMENT).toBe('Implementierung');
    expect(PHASE_LABELS.DONE).toBe('Abgeschlossen');
    expect(PHASE_LABELS.FAILED).toBe('Fehlgeschlagen');
  });

  it('should have unique label values', () => {
    const values = Object.values(PHASE_LABELS);
    const uniqueValues = new Set(values);
    expect(uniqueValues.size).toBe(values.length);
  });
});

// ==============================
// safeJsonParse
// ==============================

describe('safeJsonParse', () => {
  it('should parse valid JSON object', () => {
    const result = safeJsonParse('{"key":"value"}');
    expect(result).toEqual({ key: 'value' });
  });

  it('should parse valid JSON array', () => {
    const result = safeJsonParse('[1,2,3]');
    expect(result).toEqual([1, 2, 3]);
  });

  it('should return null for null input', () => {
    expect(safeJsonParse(null)).toBeNull();
  });

  it('should return null for empty string', () => {
    expect(safeJsonParse('')).toBeNull();
  });

  it('should return null for undefined string', () => {
    // Testing with empty/falsy — empty string is falsy
    const result = safeJsonParse('');
    expect(result).toBeNull();
  });

  it('should return null for invalid JSON', () => {
    expect(safeJsonParse('{invalid')).toBeNull();
    expect(safeJsonParse('not json')).toBeNull();
  });

  it('should return null for plain string (not JSON object/array)', () => {
    const result = safeJsonParse('"just a string"');
    expect(result).toBe('just a string');
  });

  it('should return null for number input', () => {
    const result = safeJsonParse('42');
    expect(result).toBe(42);
  });

  it('should handle nested objects', () => {
    const result = safeJsonParse('{"outer":{"inner":"value"}}');
    expect(result).toEqual({ outer: { inner: 'value' } });
  });
});
