import { describe, expect, test } from 'vitest';
import { RUN_STATE_VERSION } from '../index.js';

describe('@positron/run-state', () => {
  test('imports from @positron/shared', () => {
    expect(RUN_STATE_VERSION).toBe('0.1.0');
  });
});
