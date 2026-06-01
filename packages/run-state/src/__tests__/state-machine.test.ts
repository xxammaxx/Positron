import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import {
  VALID_TRANSITIONS,
  canTransition,
  isTerminalPhase,
  isFailurePhase,
  createRun,
  transition,
  markFailed,
  retry,
  resumeFromEvents,
} from '../state-machine.js';
import type { RunState, RunEventData } from '../state-machine.js';
import { ALL_PHASES, type Phase } from '@positron/shared';

// ==============================
// Mock setup for deterministic tests
// ==============================

const FIXED_UUID = '00000000-0000-4000-a000-000000000001';
const FIXED_DATE = '2026-01-01T00:00:00.000Z';
let uuidCounter = 0;

beforeAll(() => {
  vi.spyOn(globalThis.crypto, 'randomUUID').mockImplementation(() => {
    uuidCounter++;
    return `00000000-0000-4000-a000-${String(uuidCounter).padStart(12, '0')}`;
  });
  vi.spyOn(Date.prototype, 'toISOString').mockReturnValue(FIXED_DATE);
});

afterAll(() => {
  vi.restoreAllMocks();
});

// ==============================
// Helper: create a base run for tests
// ==============================

function makeRun(overrides: Partial<RunState> = {}): RunState {
  return {
    id: 'test-run-1',
    repoId: 'testuser/testrepo',
    issueNumber: 42,
    branch: null,
    phase: 'QUEUED',
    status: 'active',
    autonomyLevel: 2,
    attempt: 1,
    startedAt: FIXED_DATE,
    finishedAt: null,
    lastError: null,
    workspacePath: null,
    ...overrides,
  };
}

// ==============================
// VALID_TRANSITIONS — completeness
// ==============================

describe('VALID_TRANSITIONS', () => {
  it('should have entries for all 28 phases', () => {
    const phases = Object.keys(VALID_TRANSITIONS);
    expect(phases).toHaveLength(28);
    for (const phase of ALL_PHASES) {
      expect(VALID_TRANSITIONS).toHaveProperty(phase);
    }
  });

  it('should have QUEUED → [CLAIMED]', () => {
    expect(VALID_TRANSITIONS.QUEUED).toEqual(['CLAIMED']);
  });

  it('should have DONE with no transitions', () => {
    expect(VALID_TRANSITIONS.DONE).toEqual([]);
  });

  it('should have FAILED with no transitions', () => {
    expect(VALID_TRANSITIONS.FAILED).toEqual([]);
  });

  it('should have FAILED_TRANSIENT → [REPO_SYNC, WEB_RESEARCH, SPECIFY, TEST]', () => {
    expect(VALID_TRANSITIONS.FAILED_TRANSIENT).toEqual([
      'REPO_SYNC', 'WEB_RESEARCH', 'SPECIFY', 'TEST',
    ]);
  });

  it('should have GATE_APPROVE → [COMMIT, MERGE, DONE]', () => {
    expect(VALID_TRANSITIONS.GATE_APPROVE).toEqual(['COMMIT', 'MERGE', 'DONE']);
  });

  it('should have GATE_REVISE → [REVIEW, IMPLEMENT]', () => {
    expect(VALID_TRANSITIONS.GATE_REVISE).toEqual(['REVIEW', 'IMPLEMENT']);
  });

  it('all target phases should be valid Phase values', () => {
    for (const [, targets] of Object.entries(VALID_TRANSITIONS)) {
      for (const target of targets) {
        expect(ALL_PHASES).toContain(target);
      }
    }
  });
});

// ==============================
// canTransition
// ==============================

describe('canTransition', () => {
  it('should allow valid transitions', () => {
    expect(canTransition('QUEUED', 'CLAIMED')).toBe(true);
    expect(canTransition('CLAIMED', 'REPO_SYNC')).toBe(true);
    expect(canTransition('IMPLEMENT', 'TEST')).toBe(true);
    expect(canTransition('MERGE', 'DONE')).toBe(true);
  });

  it('should reject invalid transitions', () => {
    expect(canTransition('QUEUED', 'DONE')).toBe(false);
    expect(canTransition('QUEUED', 'IMPLEMENT')).toBe(false);
    expect(canTransition('DONE', 'QUEUED')).toBe(false);
    expect(canTransition('IMPLEMENT', 'DONE')).toBe(false);
  });

  it('should reject transitions from terminal phases', () => {
    expect(canTransition('DONE', 'QUEUED')).toBe(false);
    expect(canTransition('FAILED', 'QUEUED')).toBe(false);
    expect(canTransition('FAILED_BLOCKED', 'REPO_SYNC')).toBe(false);
    expect(canTransition('CLEANUP', 'ANYTHING' as Phase)).toBe(false);
  });

  it('should return false for unknown from-phase', () => {
    expect(canTransition('NONEXISTENT' as Phase, 'QUEUED')).toBe(false);
  });

  it('should allow all valid pairs exhaustively', () => {
    for (const [from, targets] of Object.entries(VALID_TRANSITIONS)) {
      for (const to of targets) {
        expect(canTransition(from as Phase, to)).toBe(true);
      }
    }
  });

  it('should be consistent: if canTransition(A,B) then A is not terminal', () => {
    for (const from of ALL_PHASES) {
      if (isTerminalPhase(from)) {
        for (const to of ALL_PHASES) {
          expect(canTransition(from, to)).toBe(false);
        }
      }
    }
  });
});

// ==============================
// isTerminalPhase
// ==============================

describe('isTerminalPhase', () => {
  it('should return true for phases with no outgoing transitions', () => {
    expect(isTerminalPhase('DONE')).toBe(true);
    expect(isTerminalPhase('FAILED')).toBe(true);
    expect(isTerminalPhase('FAILED_BLOCKED')).toBe(true);
    expect(isTerminalPhase('FAILED_UNSAFE')).toBe(true);
    expect(isTerminalPhase('BLOCKED_PUSH')).toBe(true);
    expect(isTerminalPhase('BLOCKED_MERGE')).toBe(true);
    expect(isTerminalPhase('CLEANUP')).toBe(true);
  });

  it('should return false for phases with outgoing transitions', () => {
    expect(isTerminalPhase('QUEUED')).toBe(false);
    expect(isTerminalPhase('IMPLEMENT')).toBe(false);
    expect(isTerminalPhase('FAILED_TRANSIENT')).toBe(false);
  });

  it('should be consistent with VALID_TRANSITIONS for all phases', () => {
    for (const phase of ALL_PHASES) {
      const empty = (VALID_TRANSITIONS[phase] ?? []).length === 0;
      expect(isTerminalPhase(phase)).toBe(empty);
    }
  });
});

// ==============================
// isFailurePhase
// ==============================

describe('isFailurePhase', () => {
  it('should return true for failure phases', () => {
    expect(isFailurePhase('FAILED')).toBe(true);
    expect(isFailurePhase('FAILED_TRANSIENT')).toBe(true);
    expect(isFailurePhase('FAILED_BLOCKED')).toBe(true);
    expect(isFailurePhase('FAILED_UNSAFE')).toBe(true);
  });

  it('should return false for non-failure phases', () => {
    expect(isFailurePhase('QUEUED')).toBe(false);
    expect(isFailurePhase('DONE')).toBe(false);
    expect(isFailurePhase('IMPLEMENT')).toBe(false);
  });
});

// ==============================
// createRun
// ==============================

describe('createRun', () => {
  it('should create a run with QUEUED phase', () => {
    const run = createRun('testuser/testrepo', 42, 2);
    expect(run.phase).toBe('QUEUED');
    expect(run.status).toBe('active');
    expect(run.repoId).toBe('testuser/testrepo');
    expect(run.issueNumber).toBe(42);
    expect(run.autonomyLevel).toBe(2);
    expect(run.attempt).toBe(1);
  });

  it('should generate a UUID-based id', () => {
    const run = createRun('testuser/testrepo', 1, 0);
    expect(run.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  });

  it('should set startedAt and null finishedAt/lastError', () => {
    const run = createRun('testuser/testrepo', 1, 0);
    expect(run.startedAt).toBe(FIXED_DATE);
    expect(run.finishedAt).toBeNull();
    expect(run.lastError).toBeNull();
    expect(run.branch).toBeNull();
    expect(run.workspacePath).toBeNull();
  });
});

// ==============================
// transition
// ==============================

describe('transition', () => {
  it('should perform valid transition', () => {
    const run = makeRun({ phase: 'QUEUED' });
    const result = transition(run, 'CLAIMED', 'Claiming issue');
    expect(result.ok).toBe(true);
    expect(result.run.phase).toBe('CLAIMED');
    expect(result.run.status).toBe('active');
    expect(result.event.level).toBe('INFO');
    expect(result.event.message).toBe('Claiming issue');
  });

  it('should set status=done for DONE phase', () => {
    const run = makeRun({ phase: 'MERGE' });
    const result = transition(run, 'DONE', 'Completed');
    expect(result.ok).toBe(true);
    expect(result.run.status).toBe('done');
    expect(result.run.finishedAt).not.toBeNull();
  });

  it('should set status=failed for FAILED phases', () => {
    const run = makeRun({ phase: 'IMPLEMENT' });
    const result = transition(run, 'FAILED_BLOCKED', 'Blocked by gate');
    expect(result.ok).toBe(true);
    expect(result.run.status).toBe('failed');
    expect(result.run.lastError).toBe('Blocked by gate');
  });

  it('should set finishedAt for DONE and FAILED phases', () => {
    // DONE
    const run1 = makeRun({ phase: 'MERGE' });
    const r1 = transition(run1, 'DONE', 'done');
    expect(r1.run.finishedAt).toBe(FIXED_DATE);

    // FAILED — valid transition: IMPLEMENT → FAILED_BLOCKED
    const run2 = makeRun({ phase: 'IMPLEMENT' });
    const r2 = transition(run2, 'FAILED_BLOCKED', 'blocked');
    expect(r2.run.finishedAt).toBe(FIXED_DATE);
  });

  it('should NOT set finishedAt for non-terminal phases', () => {
    const run = makeRun({ phase: 'QUEUED' });
    const result = transition(run, 'CLAIMED', 'claimed');
    expect(result.run.finishedAt).toBeNull();
  });

  it('should return ok=false for invalid transition', () => {
    const run = makeRun({ phase: 'QUEUED' });
    const result = transition(run, 'DONE', 'invalid jump');
    expect(result.ok).toBe(false);
    expect(result.run.phase).toBe('QUEUED'); // unchanged
    expect(result.event.level).toBe('ERROR');
  });

  it('should set lastError on failure transitions', () => {
    const run = makeRun({ phase: 'IMPLEMENT' });
    const result = transition(run, 'FAILED_BLOCKED', 'Something broke');
    expect(result.run.lastError).toBe('Something broke');
  });

  it('should clear lastError on non-failure transitions', () => {
    const run = makeRun({ phase: 'QUEUED', lastError: 'previous error' });
    const result = transition(run, 'CLAIMED', 'claiming');
    expect(result.run.lastError).toBeNull();
  });

  it('should use custom event level', () => {
    const run = makeRun({ phase: 'QUEUED' });
    const result = transition(run, 'CLAIMED', 'test', 'GATE', { foo: 'bar' });
    expect(result.event.level).toBe('GATE');
    expect(result.event.payload).toEqual({ foo: 'bar' });
  });

  it('should not mutate original run object', () => {
    const run = makeRun({ phase: 'QUEUED' });
    const original = { ...run };
    transition(run, 'CLAIMED', 'test');
    expect(run.phase).toBe(original.phase);
    expect(run.status).toBe(original.status);
  });

  it('should include run.id in event', () => {
    const run = makeRun({ phase: 'QUEUED', id: 'my-run-id' });
    const result = transition(run, 'CLAIMED', 'test');
    expect(result.event.runId).toBe('my-run-id');
  });
});

// ==============================
// markFailed
// ==============================

describe('markFailed', () => {
  it('should mark as FAILED', () => {
    const run = makeRun({ phase: 'IMPLEMENT' });
    const result = markFailed(run, 'FAILED', 'Unknown error');
    expect(result.ok).toBe(true);
    expect(result.run.phase).toBe('FAILED');
    expect(result.run.status).toBe('blocked');
    expect(result.run.lastError).toBe('Unknown error');
    expect(result.run.finishedAt).toBe(FIXED_DATE);
  });

  it('should mark as FAILED_TRANSIENT with status=failed', () => {
    const run = makeRun({ phase: 'SPECIFY' });
    const result = markFailed(run, 'FAILED_TRANSIENT', 'Network timeout');
    expect(result.run.phase).toBe('FAILED_TRANSIENT');
    expect(result.run.status).toBe('failed');
    expect(result.run.lastError).toBe('Network timeout');
  });

  it('should mark as FAILED_BLOCKED with status=blocked', () => {
    const run = makeRun({ phase: 'COMMIT' });
    const result = markFailed(run, 'FAILED_BLOCKED', 'Push rejected');
    expect(result.run.phase).toBe('FAILED_BLOCKED');
    expect(result.run.status).toBe('blocked');
  });

  it('should mark as FAILED_UNSAFE with status=failed', () => {
    const run = makeRun({ phase: 'REVIEW' });
    const result = markFailed(run, 'FAILED_UNSAFE', 'Unsafe code detected');
    expect(result.run.phase).toBe('FAILED_UNSAFE');
    expect(result.run.status).toBe('failed');
  });

  it('should include failedPhase in event payload', () => {
    const run = makeRun({ phase: 'TEST' });
    const result = markFailed(run, 'FAILED', 'Tests failed');
    expect(result.event.payload).toEqual({
      failedPhase: 'TEST',
      reason: 'Tests failed',
    });
  });

  it('should set event level to ERROR', () => {
    const run = makeRun({ phase: 'QUEUED' });
    const result = markFailed(run, 'FAILED', 'err');
    expect(result.event.level).toBe('ERROR');
  });

  it('should not mutate original run', () => {
    const run = makeRun({ phase: 'IMPLEMENT' });
    const original = { ...run };
    markFailed(run, 'FAILED', 'error');
    expect(run.phase).toBe(original.phase);
  });
});

// ==============================
// retry
// ==============================

describe('retry', () => {
  it('should retry from FAILED_TRANSIENT', () => {
    const run = makeRun({
      phase: 'FAILED_TRANSIENT',
      status: 'failed',
      attempt: 1,
      lastError: 'Old error',
      finishedAt: FIXED_DATE,
    });
    const result = retry(run);
    expect(result.ok).toBe(true);
    expect(result.run.phase).toBe('TEST');
    expect(result.run.status).toBe('active');
    expect(result.run.attempt).toBe(2);
    expect(result.run.lastError).toBeNull();
    expect(result.run.finishedAt).toBeNull();
  });

  it('should fail to retry from non-FAILED_TRANSIENT phases', () => {
    const run = makeRun({ phase: 'QUEUED' });
    const result = retry(run);
    expect(result.ok).toBe(false);
    expect(result.run.phase).toBe('QUEUED');
  });

  it('should fail to retry from FAILED', () => {
    const run = makeRun({ phase: 'FAILED' });
    const result = retry(run);
    expect(result.ok).toBe(false);
  });

  it('should fail to retry from FAILED_BLOCKED', () => {
    const run = makeRun({ phase: 'FAILED_BLOCKED' });
    const result = retry(run);
    expect(result.ok).toBe(false);
  });

  it('should increment attempt on retry', () => {
    const run = makeRun({ phase: 'FAILED_TRANSIENT', attempt: 3 });
    const result = retry(run);
    expect(result.run.attempt).toBe(4);
  });

  it('should include previousAttempt in event payload', () => {
    const run = makeRun({ phase: 'FAILED_TRANSIENT', attempt: 5 });
    const result = retry(run);
    expect(result.event.payload).toEqual({ previousAttempt: 5 });
  });
});

// ==============================
// resumeFromEvents
// ==============================

describe('resumeFromEvents', () => {
  it('should return QUEUED if no events', () => {
    const run = resumeFromEvents('run-1', 'owner/repo', 42, []);
    expect(run.phase).toBe('QUEUED');
    expect(run.id).toBe('run-1');
    expect(run.repoId).toBe('owner/repo');
    expect(run.issueNumber).toBe(42);
  });

  it('should return last completed phase from INFO events', () => {
    const events: RunEventData[] = [
      { id: 'e1', runId: 'run-1', phase: 'QUEUED', level: 'INFO', message: 'start', payload: null, createdAt: FIXED_DATE },
      { id: 'e2', runId: 'run-1', phase: 'CLAIMED', level: 'INFO', message: 'claimed', payload: null, createdAt: FIXED_DATE },
      { id: 'e3', runId: 'run-1', phase: 'REPO_SYNC', level: 'INFO', message: 'synced', payload: null, createdAt: FIXED_DATE },
    ];
    const run = resumeFromEvents('run-1', 'owner/repo', 42, events);
    expect(run.phase).toBe('REPO_SYNC');
  });

  it('should consider GATE events as completed', () => {
    const events: RunEventData[] = [
      { id: 'e1', runId: 'run-1', phase: 'QUEUED', level: 'INFO', message: 'start', payload: null, createdAt: FIXED_DATE },
      { id: 'e2', runId: 'run-1', phase: 'GATE_APPROVE', level: 'GATE', message: 'approved', payload: null, createdAt: FIXED_DATE },
    ];
    const run = resumeFromEvents('run-1', 'owner/repo', 42, events);
    expect(run.phase).toBe('GATE_APPROVE');
  });

  it('should skip ERROR events', () => {
    const events: RunEventData[] = [
      { id: 'e1', runId: 'run-1', phase: 'QUEUED', level: 'INFO', message: 'start', payload: null, createdAt: FIXED_DATE },
      { id: 'e2', runId: 'run-1', phase: 'CLAIMED', level: 'ERROR', message: 'failed to claim', payload: null, createdAt: FIXED_DATE },
      { id: 'e3', runId: 'run-1', phase: 'REPO_SYNC', level: 'INFO', message: 'synced', payload: null, createdAt: FIXED_DATE },
    ];
    const run = resumeFromEvents('run-1', 'owner/repo', 42, events);
    // CLAIMED is ERROR → skipped. Last completed is REPO_SYNC.
    // But wait: the loop scans phaseOrder and finds QUEUED completed, skips CLAIMED (ERROR), finds REPO_SYNC completed.
    expect(run.phase).toBe('REPO_SYNC');
  });

  it('should handle out-of-order events correctly', () => {
    const events: RunEventData[] = [
      { id: 'e2', runId: 'run-1', phase: 'SPECIFY', level: 'INFO', message: 'spec done', payload: null, createdAt: FIXED_DATE },
      { id: 'e1', runId: 'run-1', phase: 'QUEUED', level: 'INFO', message: 'start', payload: null, createdAt: FIXED_DATE },
    ];
    const run = resumeFromEvents('run-1', 'owner/repo', 42, events);
    // Both are completed, SPECIFY appears later in phaseOrder than QUEUED.
    expect(run.phase).toBe('SPECIFY');
  });

  it('should default autonomyLevel to 2', () => {
    const run = resumeFromEvents('run-1', 'owner/repo', 42, []);
    expect(run.autonomyLevel).toBe(2);
  });

  it('should default attempt to 1', () => {
    const run = resumeFromEvents('run-1', 'owner/repo', 42, []);
    expect(run.attempt).toBe(1);
  });
});
