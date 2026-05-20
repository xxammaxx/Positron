import { describe, expect, test } from 'vitest';
import { getLabelsForPhase, LABEL_LIFECYCLE } from '../label-lifecycle.js';

describe('LABEL_LIFECYCLE', () => {
  test('CLAIMED setzt running, entfernt ready/done/blocked', () => {
    const l = LABEL_LIFECYCLE['CLAIMED'];
    expect(l.add).toContain('positron:running');
    expect(l.remove).toContain('positron:ready');
    expect(l.remove).toContain('positron:done');
  });

  test('BLOCKED setzt blocked, entfernt running/testing', () => {
    const l = LABEL_LIFECYCLE['BLOCKED'];
    expect(l.add).toContain('positron:blocked');
    expect(l.remove).toContain('positron:running');
    expect(l.remove).toContain('positron:testing');
  });

  test('FAILED setzt blocked (kein eigenes failed-Label)', () => {
    const l = LABEL_LIFECYCLE['FAILED'];
    expect(l.add).toContain('positron:blocked');
    expect(l.remove).toContain('positron:running');
    expect(l.remove).toContain('positron:testing');
  });

  test('DONE setzt done, entfernt running/testing/blocked', () => {
    const l = LABEL_LIFECYCLE['DONE'];
    expect(l.add).toContain('positron:done');
    expect(l.remove).toContain('positron:running');
    expect(l.remove).toContain('positron:blocked');
  });
});

describe('getLabelsForPhase', () => {
  test('BLOCKED report → blocked labels', () => {
    const l = getLabelsForPhase('TEST', 'BLOCKED');
    expect(l.add).toContain('positron:blocked');
  });

  test('FAIL report → blocked labels (kein failed-Label)', () => {
    const l = getLabelsForPhase('TEST', 'FAIL');
    expect(l.add).toContain('positron:blocked');
  });

  test('PASS report → done labels', () => {
    const l = getLabelsForPhase('TEST', 'PASS');
    expect(l.add).toContain('positron:done');
  });
});
