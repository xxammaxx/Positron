import { describe, expect, test } from 'vitest';
import { OPENCODE_ADAPTER_VERSION } from '../index.js';

describe('@positron/opencode-adapter', () => {
  test('imports from @positron/shared', () => {
    expect(OPENCODE_ADAPTER_VERSION).toBe('0.1.0');
  });
});
