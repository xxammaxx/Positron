import { describe, expect, test } from 'vitest';
import { commentMarker } from '../comments.js';

describe('comments', () => {
  test('commentMarker erzeugt korrektes Format', () => {
    const marker = commentMarker('research', 4);
    expect(marker).toBe('<!-- positron:research:issue-4 -->');
  });

  test('commentMarker mit Implementierungs-Phase', () => {
    const marker = commentMarker('implementing', 12);
    expect(marker).toBe('<!-- positron:implementing:issue-12 -->');
  });
});
