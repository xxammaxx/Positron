import { describe, expect, test } from 'vitest';
import { getLabelsForPhase, LABEL_LIFECYCLE } from '../label-lifecycle.js';

describe('LABEL_LIFECYCLE', () => {
  test('CLAIMED setzt running, entfernt ready/done/blocked/failed', () => {
    const l = LABEL_LIFECYCLE['CLAIMED'];
    expect(l.add).toContain('positron:running');
    expect(l.remove).toContain('positron:ready');
    expect(l.remove).toContain('positron:done');
    expect(l.remove).toContain('positron:blocked');
    expect(l.remove).toContain('positron:failed');
  });

  test('REPO_SYNC setzt repo-sync, entfernt testing/done/failed', () => {
    const l = LABEL_LIFECYCLE['REPO_SYNC'];
    expect(l.add).toContain('positron:repo-sync');
    expect(l.remove).toContain('positron:testing');
    expect(l.remove).toContain('positron:done');
    expect(l.remove).toContain('positron:failed');
  });

  test('TEST setzt testing, entfernt repo-sync/failed', () => {
    const l = LABEL_LIFECYCLE['TEST'];
    expect(l.add).toContain('positron:testing');
    expect(l.remove).toContain('positron:repo-sync');
    expect(l.remove).toContain('positron:failed');
  });

  test('BLOCKED setzt blocked, entfernt running/repo-sync/research/testing/done/failed', () => {
    const l = LABEL_LIFECYCLE['BLOCKED'];
    expect(l.add).toContain('positron:blocked');
    expect(l.remove).toContain('positron:running');
    expect(l.remove).toContain('positron:repo-sync');
    expect(l.remove).toContain('positron:research');
    expect(l.remove).toContain('positron:testing');
    expect(l.remove).toContain('positron:done');
    expect(l.remove).toContain('positron:failed');
  });

  test('FAILED_TRANSIENT setzt failed, entfernt running/repo-sync/research/testing/done/blocked', () => {
    const l = LABEL_LIFECYCLE['FAILED_TRANSIENT'];
    expect(l.add).toContain('positron:failed');
    expect(l.remove).toContain('positron:running');
    expect(l.remove).toContain('positron:repo-sync');
    expect(l.remove).toContain('positron:research');
    expect(l.remove).toContain('positron:testing');
    expect(l.remove).toContain('positron:done');
    expect(l.remove).toContain('positron:blocked');
  });

  test('FAILED_UNSAFE setzt failed, entfernt running/repo-sync/research/testing/done/blocked', () => {
    const l = LABEL_LIFECYCLE['FAILED_UNSAFE'];
    expect(l.add).toContain('positron:failed');
    expect(l.remove).toContain('positron:running');
    expect(l.remove).toContain('positron:repo-sync');
    expect(l.remove).toContain('positron:research');
    expect(l.remove).toContain('positron:testing');
    expect(l.remove).toContain('positron:done');
    expect(l.remove).toContain('positron:blocked');
  });

  test('FAILED_BLOCKED setzt blocked, entfernt running/repo-sync/research/testing/done/failed', () => {
    const l = LABEL_LIFECYCLE['FAILED_BLOCKED'];
    expect(l.add).toContain('positron:blocked');
    expect(l.remove).toContain('positron:running');
    expect(l.remove).toContain('positron:repo-sync');
    expect(l.remove).toContain('positron:research');
    expect(l.remove).toContain('positron:testing');
    expect(l.remove).toContain('positron:done');
    expect(l.remove).toContain('positron:failed');
  });

  test('DONE setzt done, entfernt running/repo-sync/research/testing/blocked/failed', () => {
    const l = LABEL_LIFECYCLE['DONE'];
    expect(l.add).toContain('positron:done');
    expect(l.remove).toContain('positron:running');
    expect(l.remove).toContain('positron:repo-sync');
    expect(l.remove).toContain('positron:research');
    expect(l.remove).toContain('positron:testing');
    expect(l.remove).toContain('positron:blocked');
    expect(l.remove).toContain('positron:failed');
  });
});

describe('getLabelsForPhase', () => {
  test('BLOCKED report → BLOCKED lifecycle (positron:blocked label)', () => {
    const l = getLabelsForPhase('TEST', 'BLOCKED');
    expect(l.add).toContain('positron:blocked');
  });

  test('FAIL report → FAILED_TRANSIENT lifecycle (positron:failed label)', () => {
    const l = getLabelsForPhase('TEST', 'FAIL');
    expect(l.add).toContain('positron:failed');
  });

  test('PASS report → DONE lifecycle (positron:done label)', () => {
    const l = getLabelsForPhase('TEST', 'PASS');
    expect(l.add).toContain('positron:done');
  });

  test('FAILED_TRANSIENT phase → positron:failed label', () => {
    const l = getLabelsForPhase('FAILED_TRANSIENT');
    expect(l.add).toContain('positron:failed');
  });

  test('FAILED_UNSAFE phase → positron:failed label', () => {
    const l = getLabelsForPhase('FAILED_UNSAFE');
    expect(l.add).toContain('positron:failed');
  });

  test('FAILED_BLOCKED phase → positron:blocked label', () => {
    const l = getLabelsForPhase('FAILED_BLOCKED');
    expect(l.add).toContain('positron:blocked');
  });

  test('REPO_SYNC phase → positron:repo-sync label', () => {
    const l = getLabelsForPhase('REPO_SYNC');
    expect(l.add).toContain('positron:repo-sync');
  });
});
