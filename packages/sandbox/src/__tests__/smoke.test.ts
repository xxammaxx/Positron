import { describe, expect, test } from 'vitest';
import { SANDBOX_VERSION } from '../index.js';

describe('@positron/sandbox', () => {
  test('imports from @positron/shared', () => {
    expect(SANDBOX_VERSION).toBe('0.1.0');
  });
});
