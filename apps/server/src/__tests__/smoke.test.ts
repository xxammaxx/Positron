import { describe, expect, test } from 'vitest';
import { SERVER_VERSION } from '../index.js';

describe('server', () => {
  test('imports from @positron/shared', () => {
    expect(SERVER_VERSION).toBe('0.1.0');
  });
});
