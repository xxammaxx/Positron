import { describe, expect, test } from 'vitest';
import { createRunId } from '../../utils.js';

describe('createRunId', () => {
  test('erzeugt UUID v4 Format', () => {
    expect(createRunId()).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
  });

  test('eindeutig (100x)', () => {
    const ids = new Set(Array.from({ length: 100 }, () => createRunId()));
    expect(ids.size).toBe(100);
  });

  test('akzeptiert injizierbaren Generator', () => {
    let calls = 0;
    const custom: () => string = () => {
      calls++;
      return `run-${calls}`;
    };
    expect(createRunId(custom)).toBe('run-1');
    expect(createRunId(custom)).toBe('run-2');
  });
});
