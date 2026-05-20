import { describe, expect, test } from 'vitest';
import { GITHUB_ADAPTER_VERSION } from '../index.js';

describe('@positron/github-adapter', () => {
  test('imports from @positron/shared', () => {
    expect(GITHUB_ADAPTER_VERSION).toBe('0.1.0');
  });
});
