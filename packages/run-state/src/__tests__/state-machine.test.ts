import { describe, expect, test } from 'vitest';
import {
  createRun, transition, canTransition,
  markFailed, retry, resumeFromEvents, VALID_TRANSITIONS,
} from '../state-machine.js';
import type { RunState, RunEventData } from '../state-machine.js';
import { ALL_PHASES, MAX_FIX_LOOPS } from '@positron/shared';
import type { Phase } from '@positron/shared';

const PHASES = ALL_PHASES as unknown as Phase[];

describe('canTransition', () => {
  test('erlaubte Übergänge', () => {
    expect(canTransition('QUEUED', 'CLAIMED')).toBe(true);
    expect(canTransition('CLAIMED', 'REPO_SYNC')).toBe(true);
    expect(canTransition('REPO_SYNC', 'ISSUE_CONTEXT')).toBe(true);
    expect(canTransition('TEST', 'VERIFY')).toBe(true);
    expect(canTransition('PR_CREATE', 'DONE')).toBe(true);
  });

  test('verbotene Übergänge', () => {
    expect(canTransition('QUEUED', 'DONE')).toBe(false);
    expect(canTransition('DONE', 'QUEUED')).toBe(false);
  });

  test('Terminale Phasen haben keine Ausgänge', () => {
    for (const phase of ['DONE', 'FAILED_BLOCKED', 'FAILED_UNSAFE'] as const) {
      expect(VALID_TRANSITIONS[phase]).toEqual([]);
    }
  });

  test('alle VALID_TRANSITIONS-Keys sind gültige Phasen', () => {
    for (const target of VALID_TRANSITIONS.QUEUED) {
      expect(PHASES).toContain(target);
    }
  });

  test('Transition-Matrix ist vollständig', () => {
    for (const from of PHASES) {
      for (const to of PHASES) {
        expect(canTransition(from, to)).toBe(
          (VALID_TRANSITIONS[from] as readonly string[]).includes(to),
        );
      }
    }
  });
});

describe('transition', () => {
  test('erfolgreicher Übergang', () => {
    const run = createRun('r1', 1, 2);
    const result = transition(run, 'CLAIMED', 'Issue claimed');
    expect(result.ok).toBe(true);
    expect(result.run.phase).toBe('CLAIMED');
    expect(result.event.phase).toBe('CLAIMED');
  });

  test('abgelehnter Übergang', () => {
    const run = createRun('r1', 1, 2);
    const result = transition(run, 'DONE', 'Versuch');
    expect(result.ok).toBe(false);
    expect(result.run.phase).toBe('QUEUED');
    expect(result.event.level).toBe('ERROR');
  });

  test('Failed-Phase setzt lastError', () => {
    const run = createRun('r1', 1, 2);
    // QUEUED → CLAIMED → FAILED_BLOCKED (CLAIMED erlaubt FAILED_BLOCKED)
    const claimed = transition(run, 'CLAIMED', 'OK');
    const failed = transition(claimed.run, 'FAILED_BLOCKED', 'Reason');
    expect(failed.ok).toBe(true);
    expect(failed.run.lastError).toBe('Reason');
  });
});

describe('markFailed', () => {
  test('setzt Fehlerzustand', () => {
    const run = createRun('r1', 1, 2);
    const claimed = transition(run, 'CLAIMED', 'OK');
    const failed = markFailed(claimed.run, 'FAILED_BLOCKED', 'Token fehlt');
    expect(failed.ok).toBe(true);
    expect(failed.run.phase).toBe('FAILED_BLOCKED');
  });
});

describe('retry', () => {
  test('erfolgreicher Retry aus FAILED_TRANSIENT', () => {
    const run = createRun('r1', 1, 2);
    // QUEUED → CLAIMED → FAILED_TRANSIENT
    expect(canTransition('QUEUED', 'CLAIMED')).toBe(true);
    expect(canTransition('CLAIMED', 'FAILED_TRANSIENT')).toBe(true);
    
    const claimed = transition(run, 'CLAIMED', 'OK');
    expect(claimed.ok).toBe(true);
    
    const failed = markFailed(claimed.run, 'FAILED_TRANSIENT', 'Timeout');
    expect(failed.ok).toBe(true);
    expect(failed.run.phase).toBe('FAILED_TRANSIENT');
    
    const result = retry(failed.run);
    expect(result.ok).toBe(true);
    expect(result.run.phase).toBe('QUEUED');
    expect(result.run.attempt).toBe(2);
  });

  test(`blockiert nach ${MAX_FIX_LOOPS} Retries`, () => {
    let run = createRun('r1', 1, 2);
    // Simuliere 3 FAILED_TRANSIENT → Retry Zyklen
    for (let i = 1; i <= MAX_FIX_LOOPS; i++) {
      const claimed = transition(run, 'CLAIMED', 'OK');
      const failed = markFailed(claimed.run, 'FAILED_TRANSIENT', 'Fehler');
      run = failed.run;
      if (i < MAX_FIX_LOOPS) {
        const r = retry(run);
        run = r.run;
      }
    }
    // 3. Retry schlägt fehl
    const final = retry(run);
    expect(final.ok).toBe(false);
  });

  test('Retry nur aus FAILED_TRANSIENT', () => {
    const run = createRun('r1', 1, 2);
    const result = retry(run);
    expect(result.ok).toBe(false);
  });
});

describe('resumeFromEvents', () => {
  test('leerer Event-Stream → neuer Run', () => {
    const run = resumeFromEvents('rid', 'repo', 5, []);
    expect(run.phase).toBe('QUEUED');
    expect(run.id).toBe('rid');
  });

  test('rekonstruiert aus Events', () => {
    const events: RunEventData[] = [
      { id: 'e1', runId: 'rid', phase: 'CLAIMED', level: 'INFO', message: 'Claimed', payload: null, createdAt: '2026-01-01T00:00:00Z' },
      { id: 'e2', runId: 'rid', phase: 'REPO_SYNC', level: 'INFO', message: 'Synced', payload: null, createdAt: '2026-01-01T00:01:00Z' },
      { id: 'e3', runId: 'rid', phase: 'FAILED_BLOCKED', level: 'ERROR', message: 'Blocked', payload: null, createdAt: '2026-01-01T00:02:00Z' },
    ];
    const run = resumeFromEvents('rid', 'repo', 5, events);
    expect(run.phase).toBe('FAILED_BLOCKED');
    expect(run.status).toBe('blocked');
    expect(run.lastError).toBe('Blocked');
  });
});

describe('createRun', () => {
  test('erzeugt Run im QUEUED', () => {
    const run = createRun('r1', 42, 2);
    expect(run.phase).toBe('QUEUED');
    expect(run.status).toBe('active');
    expect(run.issueNumber).toBe(42);
    expect(run.autonomyLevel).toBe(2);
  });
});
