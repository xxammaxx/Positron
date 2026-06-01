import { describe, it, expect } from 'vitest';
import { PHASE_LABELS, LABEL_LIFECYCLE, getLabelsForPhase } from '../label-lifecycle.js';
import { ALL_PHASES } from '@positron/shared';

describe('PHASE_LABELS', () => {
  it('should have entries for all 28 phases', () => {
    for (const phase of ALL_PHASES) {
      expect(PHASE_LABELS).toHaveProperty(phase);
    }
  });

  it('each label should have name, color, description', () => {
    for (const [, label] of Object.entries(PHASE_LABELS)) {
      expect(label.name).toBeTruthy();
      expect(label.color).toMatch(/^[0-9a-f]{6}$/);
      expect(label.description).toBeTruthy();
    }
  });
});

describe('LABEL_LIFECYCLE', () => {
  it('should have entries for all 28 phases', () => {
    expect(Object.keys(LABEL_LIFECYCLE)).toHaveLength(28);
    for (const phase of ALL_PHASES) {
      expect(LABEL_LIFECYCLE).toHaveProperty(phase);
    }
  });

  it('QUEUED should add positron:queued', () => {
    const queued = LABEL_LIFECYCLE.QUEUED!;
    expect(queued.add).toContain('positron:queued');
  });

  it('DONE should remove many operational labels', () => {
    const done = LABEL_LIFECYCLE.DONE!;
    expect(done.remove.length).toBeGreaterThan(5);
  });

  it('CLAIMED should remove positron:ready', () => {
    const claimed = LABEL_LIFECYCLE.CLAIMED!;
    expect(claimed.remove).toContain('positron:ready');
  });
});

describe('getLabelsForPhase', () => {
  it('should return labels for known phase', () => {
    const result = getLabelsForPhase('QUEUED');
    expect(result.add).toContain('positron:queued');
  });

  it('should return empty for unknown phase', () => {
    const result = getLabelsForPhase('UNKNOWN_PHASE');
    expect(result.add).toEqual([]);
    expect(result.remove).toEqual([]);
  });

  it('DONE should not add labels already removed', () => {
    const result = getLabelsForPhase('DONE');
    const conflict = result.add.filter(a => result.remove.includes(a));
    expect(conflict).toEqual([]);
  });
});
