import { describe, expect, test } from 'vitest';
import { SPECKIT_ADAPTER_VERSION } from '../index.js';

describe('@positron/speckit-adapter', () => {
  test('imports from @positron/shared', () => {
    expect(SPECKIT_ADAPTER_VERSION).toBe('0.1.0');
  });
});
