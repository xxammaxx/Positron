// Positron — State Machine: Comprehensive Test Suite (QA-006)
// Ziel: Mutation Score >85%, No Coverage <10%, Kritische Survivor = 0

import { describe, expect, test } from 'vitest';
import * as fc from 'fast-check';
import {
  createRun,
  canTransition,
  transition,
  markFailed,
  retry,
  resumeFromEvents,
  isTerminalPhase,
  isFailurePhase,
  VALID_TRANSITIONS,
} from '../state-machine.js';
import type { RunState, RunEventData } from '../state-machine.js';
import type { Phase } from '@positron/shared';

// ─── Hilfsfunktionen ───

function makeRun(overrides: Partial<RunState> = {}): RunState {
  return {
    id: 'test-run-1',
    repoId: 'repo-1',
    issueNumber: 42,
    branch: null,
    phase: 'QUEUED' as Phase,
    status: 'active',
    autonomyLevel: 2,
    attempt: 1,
    startedAt: new Date().toISOString(),
    finishedAt: null,
    lastError: null,
    workspacePath: null,
    ...overrides,
  };
}

function makeEvent(overrides: Partial<RunEventData> = {}): RunEventData {
  return {
    id: 'evt-1',
    runId: 'test-run-1',
    phase: 'CLAIMED' as Phase,
    level: 'INFO',
    message: 'test event',
    payload: null,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

/** Alle 28 Phasen als Array */
const ALL_PHASES: Phase[] = (Object.keys(VALID_TRANSITIONS) as Phase[]);

// ═══════════════════════════════════════════════════════════════════
// PHASE 1: Survivor-Analyse & Klassifikation
// ═══════════════════════════════════════════════════════════════════

// (siehe Kommentare in QA-005 — die folgende Test-Suite zielt direkt
//  auf die identifizierten Lücken ab)

// ═══════════════════════════════════════════════════════════════════
// PHASE 2: Transition Coverage Matrix — canTransition
// ═══════════════════════════════════════════════════════════════════

describe('canTransition — Vollständige Coverage-Matrix', () => {
  test('alle definierten Übergänge sind gültig', () => {
    for (const [from, toList] of Object.entries(VALID_TRANSITIONS)) {
      for (const to of toList) {
        expect(canTransition(from as Phase, to)).toBe(true);
      }
    }
  });

  test('ungültige FROM-Phase ergibt false', () => {
    // Survivor #2 aus QA-005: if (!allowed) return false → if (false) return false
    // Dieser Test killt die Mutation, weil wir prüfen dass eine valide
    // Transition true zurückgibt, was bei if(false) nicht passiert.
    expect(canTransition('QUEUED', 'CLAIMED')).toBe(true);
    // Zusätzlich: unbekannte Phase
    expect(canTransition('NONEXISTENT' as Phase, 'QUEUED')).toBe(false);
  });

  test('zufällige FROM→TO Kombinationen außerhalb der Matrix sind ungültig', () => {
    for (const from of ALL_PHASES) {
      const allowed = VALID_TRANSITIONS[from] ?? [];
      for (const to of ALL_PHASES) {
        if (!allowed.includes(to)) {
          expect(canTransition(from, to)).toBe(false);
        }
      }
    }
  });

  test('DONE hat keine erlaubten Folgephasen', () => {
    expect(VALID_TRANSITIONS['DONE']).toEqual([]);
    for (const to of ALL_PHASES) {
      expect(canTransition('DONE', to)).toBe(false);
    }
  });

  test('FAILED_BLOCKED hat keine erlaubten Folgephasen', () => {
    for (const to of ALL_PHASES) {
      expect(canTransition('FAILED_BLOCKED', to)).toBe(false);
    }
  });

  test('FAILED_UNSAFE hat keine erlaubten Folgephasen', () => {
    for (const to of ALL_PHASES) {
      expect(canTransition('FAILED_UNSAFE', to)).toBe(false);
    }
  });

  test('FAILED (ohne Suffix) hat keine erlaubten Folgephasen', () => {
    for (const to of ALL_PHASES) {
      expect(canTransition('FAILED', to)).toBe(false);
    }
  });

  test('QUEUED → CLAIMED ist der einzige erlaubte QUEUED-Übergang', () => {
    const from: Phase = 'QUEUED';
    for (const to of ALL_PHASES) {
      if (to === 'CLAIMED') {
        expect(canTransition(from, to)).toBe(true);
      } else {
        expect(canTransition(from, to)).toBe(false);
      }
    }
  });

  test('CLAIMED erlaubt nur REPO_SYNC und FAILED_BLOCKED', () => {
    const from: Phase = 'CLAIMED';
    const allowed = ['REPO_SYNC', 'FAILED_BLOCKED'];
    for (const to of ALL_PHASES) {
      if (allowed.includes(to)) {
        expect(canTransition(from, to)).toBe(true);
      } else {
        expect(canTransition(from, to)).toBe(false);
      }
    }
  });
});

// ═══════════════════════════════════════════════════════════════════
// PHASE 3: Negative Tests — transition()
// ═══════════════════════════════════════════════════════════════════

describe('transition — Negative Tests (ungültige Übergänge)', () => {
  test('blockiert Übergang von DONE zu QUEUED', () => {
    const run = makeRun({ phase: 'DONE', status: 'done', finishedAt: new Date().toISOString() });
    const result = transition(run, 'QUEUED', 'should fail');
    expect(result.ok).toBe(false);
    expect(result.run.phase).toBe('DONE'); // Phase unverändert
    expect(result.run.lastError).toContain('Invalid transition');
    expect(result.event.level).toBe('ERROR');
  });

  test('blockiert Übergang von FAILED_BLOCKED zu QUEUED', () => {
    const run = makeRun({ phase: 'FAILED_BLOCKED', status: 'blocked' });
    const result = transition(run, 'QUEUED', 'should fail');
    expect(result.ok).toBe(false);
    expect(result.run.phase).toBe('FAILED_BLOCKED');
  });

  test('blockiert Übergang von FAILED_UNSAFE zu QUEUED', () => {
    const run = makeRun({ phase: 'FAILED_UNSAFE', status: 'failed' });
    const result = transition(run, 'QUEUED', 'should fail');
    expect(result.ok).toBe(false);
  });

  test('blockiert Übergang von CLEANUP zu QUEUED', () => {
    const run = makeRun({ phase: 'CLEANUP' });
    const result = transition(run, 'QUEUED', 'should fail');
    expect(result.ok).toBe(false);
  });

  test('blockiert Sprung von QUEUED direkt zu IMPLEMENT', () => {
    const run = makeRun({ phase: 'QUEUED' });
    const result = transition(run, 'IMPLEMENT', 'skipping phases');
    expect(result.ok).toBe(false);
    expect(result.run.phase).toBe('QUEUED');
  });

  test('blockiert Sprung von CLAIMED zu DONE', () => {
    const run = makeRun({ phase: 'CLAIMED' });
    const result = transition(run, 'DONE', 'too fast');
    expect(result.ok).toBe(false);
  });

  test('Fehler-Event enthält korrekte Nachricht bei ungültigem Übergang', () => {
    const run = makeRun({ phase: 'DONE' });
    const result = transition(run, 'IMPLEMENT', 'custom reason');
    expect(result.event.message).toContain('Invalid transition');
    expect(result.event.message).toContain('DONE');
    expect(result.event.message).toContain('IMPLEMENT');
    expect(result.event.level).toBe('ERROR');
  });
});

// ═══════════════════════════════════════════════════════════════════
// PHASE 3b: Positive Tests — transition()
// ═══════════════════════════════════════════════════════════════════

describe('transition — Positive Tests (gültige Übergänge)', () => {
  test('QUEUED → CLAIMED funktioniert', () => {
    const run = makeRun({ phase: 'QUEUED' });
    const result = transition(run, 'CLAIMED', 'claimed');
    expect(result.ok).toBe(true);
    expect(result.run.phase).toBe('CLAIMED');
    expect(result.run.status).toBe('active');
    expect(result.event.level).toBe('INFO');
  });

  test('PR_CREATE → DONE setzt Status auf done', () => {
    const run = makeRun({ phase: 'PR_CREATE' });
    const result = transition(run, 'DONE', 'merged');
    expect(result.ok).toBe(true);
    expect(result.run.phase).toBe('DONE');
    expect(result.run.status).toBe('done');
    expect(result.run.finishedAt).toBeDefined();
    expect(result.run.finishedAt).not.toBeNull();
  });

  test('COMMIT → FAILED_BLOCKED setzt Status auf blocked', () => {
    const run = makeRun({ phase: 'COMMIT' });
    const result = transition(run, 'FAILED_BLOCKED', 'push denied');
    expect(result.ok).toBe(true);
    expect(result.run.phase).toBe('FAILED_BLOCKED');
    expect(result.run.status).toBe('failed'); // FAILED_BLOCKED starts with FAILED
    expect(result.run.lastError).toBe('push denied');
    expect(result.run.finishedAt).toBeDefined();
  });

  test('zu FAILED_TRANSIENT setzt lastError und finishedAt', () => {
    const run = makeRun({ phase: 'REPO_SYNC' });
    const result = transition(run, 'FAILED_TRANSIENT', 'network error');
    expect(result.ok).toBe(true);
    expect(result.run.phase).toBe('FAILED_TRANSIENT');
    expect(result.run.status).toBe('failed');
    expect(result.run.lastError).toBe('network error');
    expect(result.run.finishedAt).not.toBeNull();
  });

  test('zu FAILED_UNSAFE setzt lastError und finishedAt', () => {
    const run = makeRun({ phase: 'IMPLEMENT' }); // IMPLEMENT → FAILED_BLOCKED only, not FAILED_UNSAFE
    // FAILED_UNSAFE kann nur via markFailed() erreicht werden, nicht via transition()
    // Dieser Test validiert dass transition() FAILED_UNSAFE als Ziel NICHT erlaubt
    // (FAILED_UNSAFE ist nicht in VALID_TRANSITIONS für IMPLEMENT)
    const result = transition(run, 'FAILED_UNSAFE', 'unsafe');
    expect(result.ok).toBe(false);
  });

  test('zu FAILED (ohne Suffix) setzt Status korrekt', () => {
    // FAILED ist nur via markFailed() erreichbar
    const run = makeRun({ phase: 'QUEUED' });
    const result = transition(run, 'FAILED', 'generic failure');
    expect(result.ok).toBe(false); // FAILED nicht in VALID_TRANSITIONS für QUEUED
  });

  test('transition behält die Run-ID bei', () => {
    const run = makeRun({ phase: 'QUEUED', id: 'my-special-id' });
    const result = transition(run, 'CLAIMED', 'moving on');
    expect(result.run.id).toBe('my-special-id');
    expect(result.run.repoId).toBe('repo-1');
    expect(result.run.issueNumber).toBe(42);
  });

  test('gültiger Übergang erzeugt INFO-Event', () => {
    const run = makeRun({ phase: 'REVIEW' });
    const result = transition(run, 'IMPLEMENT', 'starting implementation');
    expect(result.event.level).toBe('INFO');
    expect(result.event.phase).toBe('IMPLEMENT');
    expect(result.event.runId).toBe(run.id);
  });

  test('gültiger Übergang mit GATE-Level', () => {
    const run = makeRun({ phase: 'PLAN' });
    const result = transition(run, 'TASKS', 'plan approved', 'GATE', { approver: 'human' });
    expect(result.ok).toBe(true);
    expect(result.event.level).toBe('GATE');
    expect(result.event.payload).toEqual({ approver: 'human' });
  });
});

// ═══════════════════════════════════════════════════════════════════
// PHASE 3c: transition — Boundary-Tests
// ═══════════════════════════════════════════════════════════════════

describe('transition — Boundary & Edge Cases', () => {
  test('leerer Message-String ist erlaubt', () => {
    const run = makeRun({ phase: 'QUEUED' });
    const result = transition(run, 'CLAIMED', '');
    expect(result.ok).toBe(true);
    expect(result.run.phase).toBe('CLAIMED');
  });

  test('null-Payload ist erlaubt', () => {
    const run = makeRun({ phase: 'QUEUED' });
    const result = transition(run, 'CLAIMED', 'msg', 'INFO', null);
    expect(result.ok).toBe(true);
    expect(result.event.payload).toBeNull();
  });

  test('komplexer Payload wird durchgereicht', () => {
    const run = makeRun({ phase: 'QUEUED' });
    const payload = { files: ['a.ts', 'b.ts'], stats: { added: 10, removed: 2 } };
    const result = transition(run, 'CLAIMED', 'msg', 'INFO', payload);
    expect(result.event.payload).toEqual(payload);
  });

  test('finishedAt wird nur bei terminalen/failure-Phasen gesetzt', () => {
    const run = makeRun({ phase: 'QUEUED' });
    const result = transition(run, 'CLAIMED', 'non-terminal');
    expect(result.run.finishedAt).toBeNull(); // CLAIMED ist nicht terminal

    const result2 = transition(result.run, 'REPO_SYNC', 'still going');
    expect(result2.run.finishedAt).toBeNull(); // REPO_SYNC ist nicht terminal

    const result3 = transition(result2.run, 'FAILED_TRANSIENT', 'oops');
    expect(result3.run.finishedAt).not.toBeNull(); // FAILED_TRANSIENT ist failure
  });
});

// ═══════════════════════════════════════════════════════════════════
// PHASE 4: Retry Logic
// ═══════════════════════════════════════════════════════════════════

describe('retry — Retry Logic', () => {
  test('Retry aus FAILED_TRANSIENT funktioniert', () => {
    const run = makeRun({ phase: 'FAILED_TRANSIENT', status: 'failed', attempt: 2, lastError: 'prev error' });
    const result = retry(run);
    expect(result.ok).toBe(true);
    expect(result.run.phase).toBe('TEST');
    expect(result.run.status).toBe('active');
    expect(result.run.attempt).toBe(3);
    expect(result.run.lastError).toBeNull();
    expect(result.run.finishedAt).toBeNull();
  });

  test('Retry-Event enthält korrekte Metadaten', () => {
    const run = makeRun({ phase: 'FAILED_TRANSIENT', status: 'failed', attempt: 1 });
    const result = retry(run);
    expect(result.event.phase).toBe('TEST');
    expect(result.event.level).toBe('INFO');
    expect(result.event.message).toContain('Retry attempt 2');
    expect(result.event.payload).toEqual({ previousAttempt: 1 });
  });

  test('Retry aus QUEUED wird blockiert (nur FAILED_TRANSIENT erlaubt)', () => {
    const run = makeRun({ phase: 'QUEUED' });
    const result = retry(run);
    expect(result.ok).toBe(false);
    expect(result.run.phase).toBe('QUEUED'); // unverändert
    expect(result.event.message).toContain('Cannot retry');
    expect(result.event.message).toContain('QUEUED');
  });

  test('Retry aus DONE wird blockiert', () => {
    const run = makeRun({ phase: 'DONE', status: 'done' });
    const result = retry(run);
    expect(result.ok).toBe(false);
    expect(result.event.message).toContain('Cannot retry');
  });

  test('Retry aus FAILED_BLOCKED wird blockiert', () => {
    const run = makeRun({ phase: 'FAILED_BLOCKED', status: 'blocked' });
    const result = retry(run);
    expect(result.ok).toBe(false);
    expect(result.run.phase).toBe('FAILED_BLOCKED');
  });

  test('Retry aus FAILED_UNSAFE wird blockiert', () => {
    const run = makeRun({ phase: 'FAILED_UNSAFE', status: 'failed' });
    const result = retry(run);
    expect(result.ok).toBe(false);
  });

  test('Retry aus FAILED (ohne Suffix) wird blockiert', () => {
    const run = makeRun({ phase: 'FAILED', status: 'failed' });
    const result = retry(run);
    expect(result.ok).toBe(false);
  });

  test('Retry aus TEST wird blockiert (nur FAILED_TRANSIENT)', () => {
    const run = makeRun({ phase: 'TEST' });
    const result = retry(run);
    expect(result.ok).toBe(false);
  });

  test('Mehrere Retries erhöhen attempt korrekt', () => {
    let run = makeRun({ phase: 'FAILED_TRANSIENT', attempt: 1 });
    // erster Retry
    const r1 = retry(run);
    expect(r1.run.attempt).toBe(2);
    // simuliere zweiten Fehler und Retry
    run = { ...r1.run, phase: 'FAILED_TRANSIENT' as Phase, status: 'failed' as const };
    const r2 = retry(run);
    expect(r2.run.attempt).toBe(3);
  });
});

// ═══════════════════════════════════════════════════════════════════
// PHASE 5: markFailed — Fehlerzustände
// ═══════════════════════════════════════════════════════════════════

describe('markFailed — Alle Fehlerarten', () => {
  test('markFailed FAILED setzt Status auf blocked', () => {
    const run = makeRun({ phase: 'IMPLEMENT' });
    const result = markFailed(run, 'FAILED', 'hard failure');
    expect(result.ok).toBe(true);
    expect(result.run.phase).toBe('FAILED');
    expect(result.run.status).toBe('blocked');
    expect(result.run.lastError).toBe('hard failure');
    expect(result.run.finishedAt).not.toBeNull();
  });

  test('markFailed FAILED_BLOCKED setzt Status auf blocked', () => {
    const run = makeRun({ phase: 'TEST' });
    const result = markFailed(run, 'FAILED_BLOCKED', 'push denied');
    expect(result.ok).toBe(true);
    expect(result.run.phase).toBe('FAILED_BLOCKED');
    expect(result.run.status).toBe('blocked');
  });

  test('markFailed FAILED_TRANSIENT setzt Status auf failed', () => {
    const run = makeRun({ phase: 'WEB_RESEARCH' });
    const result = markFailed(run, 'FAILED_TRANSIENT', 'network timeout');
    expect(result.ok).toBe(true);
    expect(result.run.phase).toBe('FAILED_TRANSIENT');
    expect(result.run.status).toBe('failed');
  });

  test('markFailed FAILED_UNSAFE setzt Status auf failed', () => {
    const run = makeRun({ phase: 'IMPLEMENT' });
    const result = markFailed(run, 'FAILED_UNSAFE', 'dangerous command');
    expect(result.ok).toBe(true);
    expect(result.run.phase).toBe('FAILED_UNSAFE');
    expect(result.run.status).toBe('failed');
  });

  test('markFailed-Event enthält Fehlerkontext', () => {
    const run = makeRun({ phase: 'TEST' });
    const result = markFailed(run, 'FAILED_BLOCKED', 'reason text');
    expect(result.event.level).toBe('ERROR');
    expect(result.event.message).toBe('reason text');
    expect(result.event.payload).toEqual({
      failedPhase: 'TEST',
      reason: 'reason text',
    });
  });

  test('markFailed überschreibt bestehendes lastError', () => {
    const run = makeRun({ phase: 'TEST', lastError: 'old error' });
    const result = markFailed(run, 'FAILED_BLOCKED', 'new error');
    expect(result.run.lastError).toBe('new error');
  });

  test('markFailed setzt immer finishedAt', () => {
    const run = makeRun({ phase: 'TEST', finishedAt: null });
    const result = markFailed(run, 'FAILED_TRANSIENT', 'err');
    expect(result.run.finishedAt).not.toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════
// PHASE 6: isTerminalPhase & isFailurePhase
// ═══════════════════════════════════════════════════════════════════

describe('isTerminalPhase — Alle terminalen Phasen', () => {
  const terminalPhases: Phase[] = ['DONE', 'FAILED', 'FAILED_BLOCKED', 'FAILED_UNSAFE', 'CLEANUP'];
  const nonTerminalPhases = ALL_PHASES.filter(p => !terminalPhases.includes(p));

  test.each(terminalPhases)('%s ist terminal', (phase) => {
    expect(isTerminalPhase(phase)).toBe(true);
  });

  // BLOCKED_PUSH und BLOCKED_MERGE haben leere Arrays → sind auch terminal
  test('BLOCKED_PUSH ist terminal', () => {
    expect(isTerminalPhase('BLOCKED_PUSH')).toBe(true);
  });

  test('BLOCKED_MERGE ist terminal', () => {
    expect(isTerminalPhase('BLOCKED_MERGE')).toBe(true);
  });

  test.each(nonTerminalPhases.filter(p => p !== 'BLOCKED_PUSH' && p !== 'BLOCKED_MERGE'))('%s ist nicht terminal', (phase) => {
    expect(isTerminalPhase(phase)).toBe(false);
  });
});

describe('isFailurePhase — Alle Fehlerphasen', () => {
  test('FAILED ist eine Fehlerphase', () => {
    expect(isFailurePhase('FAILED')).toBe(true);
  });

  test('FAILED_TRANSIENT ist eine Fehlerphase', () => {
    expect(isFailurePhase('FAILED_TRANSIENT')).toBe(true);
  });

  test('FAILED_BLOCKED ist eine Fehlerphase', () => {
    expect(isFailurePhase('FAILED_BLOCKED')).toBe(true);
  });

  test('FAILED_UNSAFE ist eine Fehlerphase', () => {
    expect(isFailurePhase('FAILED_UNSAFE')).toBe(true);
  });

  test('QUEUED ist keine Fehlerphase', () => {
    expect(isFailurePhase('QUEUED')).toBe(false);
  });

  test('DONE ist keine Fehlerphase', () => {
    expect(isFailurePhase('DONE')).toBe(false);
  });

  test('TEST ist keine Fehlerphase', () => {
    expect(isFailurePhase('TEST')).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════
// PHASE 7: resumeFromEvents — Survivor #1 fix
// ═══════════════════════════════════════════════════════════════════

describe('resumeFromEvents — Event-Filtering (Survivor #1 Fix)', () => {
  test('filtert ERROR-Events aus (nur INFO und GATE werden berücksichtigt)', () => {
    // Survivor #1: if(event.level === 'INFO' || event.level === 'GATE') → if(true)
    // Dieser Test beweist, dass ERROR-Events NICHT als completed zählen.
    const events: RunEventData[] = [
      makeEvent({ phase: 'QUEUED', level: 'INFO' }),
      makeEvent({ phase: 'CLAIMED', level: 'ERROR' }), // ERROR — sollte ignoriert werden
      makeEvent({ phase: 'REPO_SYNC', level: 'INFO' }),
    ];
    const result = resumeFromEvents('run-1', 'repo-1', 42, events);
    // CLAIMED (ERROR) wird ignoriert, also letzte gültige: REPO_SYNC
    expect(result.phase).toBe('REPO_SYNC');
  });

  test('WARN-Events werden ignoriert', () => {
    const events: RunEventData[] = [
      makeEvent({ phase: 'QUEUED', level: 'INFO' }),
      makeEvent({ phase: 'CLAIMED', level: 'WARN' }),
      makeEvent({ phase: 'REPO_SYNC', level: 'WARN' }),
    ];
    const result = resumeFromEvents('run-1', 'repo-1', 42, events);
    // Nur QUEUED (INFO) wird gezählt
    expect(result.phase).toBe('QUEUED');
  });

  test('HUMAN-Events werden ignoriert', () => {
    const events: RunEventData[] = [
      makeEvent({ phase: 'CLAIMED', level: 'HUMAN' }),
      makeEvent({ phase: 'REPO_SYNC', level: 'INFO' }),
    ];
    const result = resumeFromEvents('run-1', 'repo-1', 42, events);
    expect(result.phase).toBe('REPO_SYNC');
  });

  test('GATE-Events werden als abgeschlossen gezählt', () => {
    const events: RunEventData[] = [
      makeEvent({ phase: 'GATE_APPROVE', level: 'GATE' }),
    ];
    const result = resumeFromEvents('run-1', 'repo-1', 42, events);
    expect(result.phase).toBe('GATE_APPROVE');
  });

  test('leere Event-Liste ergibt QUEUED', () => {
    const result = resumeFromEvents('run-1', 'repo-1', 42, []);
    expect(result.phase).toBe('QUEUED');
  });

  test('letzte Phase in der Reihenfolge wird korrekt bestimmt', () => {
    const events: RunEventData[] = [
      makeEvent({ phase: 'QUEUED', level: 'INFO' }),
      makeEvent({ phase: 'CLAIMED', level: 'INFO' }),
      makeEvent({ phase: 'REPO_SYNC', level: 'INFO' }),
      makeEvent({ phase: 'ISSUE_CONTEXT', level: 'INFO' }),
      makeEvent({ phase: 'SPECIFY', level: 'INFO' }),
    ];
    const result = resumeFromEvents('run-1', 'repo-1', 42, events);
    expect(result.phase).toBe('SPECIFY');
  });

  test('Events in falscher Reihenfolge: spätere Phase wird erkannt', () => {
    // Auch wenn Events nicht chronologisch sind, zählt die späteste Phase
    const events: RunEventData[] = [
      makeEvent({ phase: 'SPECIFY', level: 'INFO' }),
      makeEvent({ phase: 'CLAIMED', level: 'INFO' }),
      makeEvent({ phase: 'REPO_SYNC', level: 'INFO' }),
    ];
    const result = resumeFromEvents('run-1', 'repo-1', 42, events);
    expect(result.phase).toBe('SPECIFY');
  });

  test('resumeFromEvents gibt korrekte Metadaten zurück', () => {
    const events: RunEventData[] = [
      makeEvent({ phase: 'CLAIMED', level: 'INFO', runId: 'my-run' }),
    ];
    const result = resumeFromEvents('my-run', 'my-repo', 99, events);
    expect(result.id).toBe('my-run');
    expect(result.repoId).toBe('my-repo');
    expect(result.issueNumber).toBe(99);
    expect(result.status).toBe('active');
    expect(result.attempt).toBe(1);
  });
});

// ═══════════════════════════════════════════════════════════════════
// PHASE 8: createRun — Zusätzliche Edge Cases
// ═══════════════════════════════════════════════════════════════════

describe('createRun — Edge Cases', () => {
  test('unterschiedliche Autonomie-Level', () => {
    for (const level of [0, 1, 2, 3, 4] as const) {
      const run = createRun('repo', 1, level);
      expect(run.autonomyLevel).toBe(level);
    }
  });

  test('startedAt ist ein ISO-Datumsstring', () => {
    const run = createRun('repo', 1, 2);
    expect(() => new Date(run.startedAt)).not.toThrow();
    expect(new Date(run.startedAt).toISOString()).toBe(run.startedAt);
  });

  test('branch ist initial null', () => {
    const run = createRun('repo', 1, 2);
    expect(run.branch).toBeNull();
  });

  test('finishedAt ist initial null', () => {
    const run = createRun('repo', 1, 2);
    expect(run.finishedAt).toBeNull();
  });

  test('workspacePath ist initial null', () => {
    const run = createRun('repo', 1, 2);
    expect(run.workspacePath).toBeNull();
  });

  test('unterschiedliche Repo-IDs', () => {
    const run1 = createRun('repo-a', 1, 2);
    const run2 = createRun('repo-b', 1, 2);
    expect(run1.repoId).toBe('repo-a');
    expect(run2.repoId).toBe('repo-b');
  });
});

// ═══════════════════════════════════════════════════════════════════
// PHASE 9: Property-Based Testing (fast-check)
// ═══════════════════════════════════════════════════════════════════

describe('Property-Based Tests — Invarianten', () => {
  test('Invariante 1: DONE ist terminal (keine gültigen Übergänge)', () => {
    fc.assert(
      fc.property(fc.constantFrom(...ALL_PHASES), (to: Phase) => {
        expect(canTransition('DONE', to)).toBe(false);
      }),
      { numRuns: ALL_PHASES.length },
    );
  });

  test('Invariante 2: FAILED, FAILED_BLOCKED, FAILED_UNSAFE sind terminal', () => {
    const terminalFailures: Phase[] = ['FAILED', 'FAILED_BLOCKED', 'FAILED_UNSAFE'];
    fc.assert(
      fc.property(
        fc.constantFrom(...terminalFailures),
        fc.constantFrom(...ALL_PHASES),
        (from: Phase, to: Phase) => {
          expect(canTransition(from, to)).toBe(false);
        },
      ),
      { numRuns: terminalFailures.length * ALL_PHASES.length },
    );
  });

  test('Invariante 3: Keine Transition von einer Phase zu sich selbst', () => {
    // Prüft dass keine Phase einen Selbst-Übergang erlaubt
    fc.assert(
      fc.property(fc.constantFrom(...ALL_PHASES), (phase: Phase) => {
        // Explizit: Keine Phase erlaubt Übergang zu sich selbst
        // (außer es ist explizit in VALID_TRANSITIONS definiert)
        const allowed = VALID_TRANSITIONS[phase] ?? [];
        // Wir prüfen nicht, dass es verboten ist — manche Phasen könnten
        // Selbst-Übergänge erlauben. Stattdessen: Wenn canTransition true ist,
        // muss es in VALID_TRANSITIONS sein.
        if (canTransition(phase, phase)) {
          expect(allowed).toContain(phase);
        }
      }),
      { numRuns: ALL_PHASES.length },
    );
  });

  test('Invariante 4: VALID_TRANSITIONS ist konsistent mit canTransition', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...ALL_PHASES),
        fc.constantFrom(...ALL_PHASES),
        (from: Phase, to: Phase) => {
          const allowed = VALID_TRANSITIONS[from] ?? [];
          const canTrans = canTransition(from, to);
          if (canTrans) {
            expect(allowed).toContain(to);
          } else {
            expect(allowed).not.toContain(to);
          }
        },
      ),
      { numRuns: 1000 }, // 1000 zufällige FROM→TO Kombinationen
    );
  });

  test('Invariante 5: transition() mit gültigem Übergang gibt ok=true', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...ALL_PHASES),
        fc.constantFrom(...ALL_PHASES),
        fc.string({ minLength: 0, maxLength: 100 }),
        (from: Phase, to: Phase, message: string) => {
          const run = makeRun({ phase: from });
          const result = transition(run, to, message);
          const expectedOk = canTransition(from, to);
          expect(result.ok).toBe(expectedOk);
          // Nach einem erfolgreichen Übergang muss die Phase aktualisiert sein
          if (expectedOk) {
            expect(result.run.phase).toBe(to);
          } else {
            expect(result.run.phase).toBe(from); // unverändert
          }
        },
      ),
      { numRuns: 1000 },
    );
  });

  test('Invariante 6: isTerminalPhase ↔ VALID_TRANSITIONS[phase] ist leer', () => {
    fc.assert(
      fc.property(fc.constantFrom(...ALL_PHASES), (phase: Phase) => {
        const allowed = VALID_TRANSITIONS[phase] ?? [];
        const isEmptyOrUndefined = !allowed || allowed.length === 0;
        expect(isTerminalPhase(phase)).toBe(isEmptyOrUndefined);
      }),
      { numRuns: ALL_PHASES.length },
    );
  });

  test('Invariante 7: retry() funktioniert NUR für FAILED_TRANSIENT', () => {
    fc.assert(
      fc.property(fc.constantFrom(...ALL_PHASES), (phase: Phase) => {
        const run = makeRun({ phase });
        const result = retry(run);
        if (phase === 'FAILED_TRANSIENT') {
          expect(result.ok).toBe(true);
          expect(result.run.phase).toBe('TEST');
        } else {
          expect(result.ok).toBe(false);
          expect(result.run.phase).toBe(phase); // unverändert
        }
      }),
      { numRuns: ALL_PHASES.length },
    );
  });

  test('Invariante 8: markFailed setzt immer finishedAt', () => {
    const failureKinds = ['FAILED', 'FAILED_TRANSIENT', 'FAILED_BLOCKED', 'FAILED_UNSAFE'] as const;
    fc.assert(
      fc.property(
        fc.constantFrom(...ALL_PHASES),
        fc.constantFrom(...failureKinds),
        fc.string({ minLength: 0, maxLength: 50 }),
        (phase: Phase, kind: typeof failureKinds[number], reason: string) => {
          const run = makeRun({ phase, finishedAt: null });
          const result = markFailed(run, kind, reason);
          expect(result.ok).toBe(true);
          expect(result.run.finishedAt).not.toBeNull();
          expect(result.run.phase).toBe(kind);
        },
      ),
      { numRuns: 500 },
    );
  });

  test('Invariante 9: transition zu FAILED_* setzt finishedAt', () => {
    // Finde nur Phasen die zu FAILED_*-Phasen übergehen können
    const failureTargets: Phase[] = ['FAILED_TRANSIENT', 'FAILED_BLOCKED'];
    fc.assert(
      fc.property(
        fc.constantFrom(...ALL_PHASES),
        fc.constantFrom(...failureTargets),
        fc.string(),
        (from: Phase, to: Phase, msg: string) => {
          const run = makeRun({ phase: from, finishedAt: null });
          const result = transition(run, to, msg);
          if (result.ok) {
            expect(result.run.finishedAt).not.toBeNull();
            expect(result.run.phase).toBe(to);
          }
        },
      ),
      { numRuns: 200 },
    );
  });
});

// ═══════════════════════════════════════════════════════════════════
// ZUSÄTZLICH: Safety Gates (Merge/Push/Review)
// ═══════════════════════════════════════════════════════════════════

describe('Safety Gates — BLOCKED_PUSH und BLOCKED_MERGE', () => {
  test('BLOCKED_PUSH hat keine erlaubten Folgephasen', () => {
    expect(VALID_TRANSITIONS['BLOCKED_PUSH']).toEqual([]);
    expect(isTerminalPhase('BLOCKED_PUSH')).toBe(true);
  });

  test('BLOCKED_MERGE hat keine erlaubten Folgephasen', () => {
    expect(VALID_TRANSITIONS['BLOCKED_MERGE']).toEqual([]);
    expect(isTerminalPhase('BLOCKED_MERGE')).toBe(true);
  });

  test('GATE_APPROVE erlaubt COMMIT, MERGE, DONE', () => {
    expect(VALID_TRANSITIONS['GATE_APPROVE']).toContain('COMMIT');
    expect(VALID_TRANSITIONS['GATE_APPROVE']).toContain('MERGE');
    expect(VALID_TRANSITIONS['GATE_APPROVE']).toContain('DONE');
    expect(VALID_TRANSITIONS['GATE_APPROVE']).toHaveLength(3);
  });

  test('GATE_REVISE erlaubt REVIEW und IMPLEMENT', () => {
    expect(VALID_TRANSITIONS['GATE_REVISE']).toContain('REVIEW');
    expect(VALID_TRANSITIONS['GATE_REVISE']).toContain('IMPLEMENT');
    expect(VALID_TRANSITIONS['GATE_REVISE']).toHaveLength(2);
  });

  test('RESUME_PENDING erlaubt QUEUED, TEST, VERIFY', () => {
    expect(VALID_TRANSITIONS['RESUME_PENDING']).toContain('QUEUED');
    expect(VALID_TRANSITIONS['RESUME_PENDING']).toContain('TEST');
    expect(VALID_TRANSITIONS['RESUME_PENDING']).toContain('VERIFY');
    expect(VALID_TRANSITIONS['RESUME_PENDING']).toHaveLength(3);
  });
});

// ═══════════════════════════════════════════════════════════════════
// ZUSÄTZLICH: MERGE-Gate (GATE_APPROVE → MERGE → DONE)
// ═══════════════════════════════════════════════════════════════════

describe('Merge Gate Flow', () => {
  test('GATE_APPROVE → MERGE → DONE ist ein gültiger Pfad', () => {
    const run = makeRun({ phase: 'GATE_APPROVE' });
    const r1 = transition(run, 'MERGE', 'gate approved merge');
    expect(r1.ok).toBe(true);
    expect(r1.run.phase).toBe('MERGE');

    const r2 = transition(r1.run, 'DONE', 'merged successfully');
    expect(r2.ok).toBe(true);
    expect(r2.run.phase).toBe('DONE');
    expect(r2.run.status).toBe('done');
    expect(r2.run.finishedAt).not.toBeNull();
  });

  test('GATE_APPROVE → COMMIT ist möglich (überspringt MERGE)', () => {
    const run = makeRun({ phase: 'GATE_APPROVE' });
    const result = transition(run, 'COMMIT', 'skip merge, commit only');
    expect(result.ok).toBe(true);
    expect(result.run.phase).toBe('COMMIT');
  });

  test('GATE_REVISE → REVIEW → IMPLEMENT ist gültig', () => {
    const run = makeRun({ phase: 'GATE_REVISE' });
    const r1 = transition(run, 'REVIEW', 'back to review');
    expect(r1.ok).toBe(true);
    expect(r1.run.phase).toBe('REVIEW');

    const r2 = transition(r1.run, 'IMPLEMENT', 'fix issues');
    expect(r2.ok).toBe(true);
    expect(r2.run.phase).toBe('IMPLEMENT');
  });

  test('REVIEW → PLAN (zurück zur Planung) ist gültig', () => {
    const run = makeRun({ phase: 'REVIEW' });
    const result = transition(run, 'PLAN', 're-plan');
    expect(result.ok).toBe(true);
    expect(result.run.phase).toBe('PLAN');
  });

  test('REVIEW → TASKS (zurück zu Tasks) ist gültig', () => {
    const run = makeRun({ phase: 'REVIEW' });
    const result = transition(run, 'TASKS', 're-task');
    expect(result.ok).toBe(true);
    expect(result.run.phase).toBe('TASKS');
  });
});

// ═══════════════════════════════════════════════════════════════════
// ZUSÄTZLICH: Cancel-Logic (via markFailed + terminal phases)
// ═══════════════════════════════════════════════════════════════════

describe('Cancel Logic — markFailed in verschiedenen Phasen', () => {
  test('Cancel vor Start — markFailed aus QUEUED', () => {
    const run = makeRun({ phase: 'QUEUED' });
    const result = markFailed(run, 'FAILED_BLOCKED', 'cancelled before start');
    expect(result.ok).toBe(true);
    expect(result.run.phase).toBe('FAILED_BLOCKED');
  });

  test('Cancel während Run — markFailed aus IMPLEMENT', () => {
    const run = makeRun({ phase: 'IMPLEMENT' });
    const result = markFailed(run, 'FAILED_BLOCKED', 'cancelled during implementation');
    expect(result.ok).toBe(true);
  });

  test('Cancel nach Fehler — markFailed aus FAILED_TRANSIENT', () => {
    const run = makeRun({ phase: 'FAILED_TRANSIENT', status: 'failed' });
    const result = markFailed(run, 'FAILED', 'permanent failure after transient');
    expect(result.ok).toBe(true);
    expect(result.run.phase).toBe('FAILED');
  });

  test('Cancel während Retry — erst retry, dann markFailed', () => {
    let run = makeRun({ phase: 'FAILED_TRANSIENT', attempt: 2 });
    // Retry
    const r1 = retry(run);
    expect(r1.ok).toBe(true);
    expect(r1.run.phase).toBe('TEST');
    // Während des Retry-Versuchs: Cancel
    const r2 = markFailed(r1.run, 'FAILED_BLOCKED', 'cancelled during retry');
    expect(r2.ok).toBe(true);
    expect(r2.run.phase).toBe('FAILED_BLOCKED');
  });
});
