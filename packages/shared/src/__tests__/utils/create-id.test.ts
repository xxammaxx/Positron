import { describe, expect, test } from 'vitest';
import { createRunId } from '../../utils.js';

describe('createRunId', () => {
  test('erzeugt String', () => {
    const id = createRunId();
    expect(typeof id).toBe('string');
    expect(id.length).toBeGreaterThan(0);
  });

  test('UUID v4 Format', () => {
    expect(createRunId()).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });

  test('eindeutig (100x)', () => {
    const ids = new Set(Array.from({ length: 100 }, () => createRunId()));
    expect(ids.size).toBe(100);
  });
});
