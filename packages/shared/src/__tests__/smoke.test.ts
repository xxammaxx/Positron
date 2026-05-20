import { describe, expect, test } from 'vitest';
import { POSITRON_VERSION } from '../index.js';

describe('@positron/shared', () => {
  test('exports POSITRON_VERSION', () => {
    expect(POSITRON_VERSION).toBe('0.1.0');
  });
});
