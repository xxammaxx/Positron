import { describe, it, expect, afterEach } from 'vitest';
import { PIPELINE_QUEUE, resolveRedisUrl } from '../queue/types.js';

describe('PIPELINE_QUEUE', () => {
  it('should be "positron-pipeline"', () => {
    expect(PIPELINE_QUEUE).toBe('positron-pipeline');
  });
});

describe('resolveRedisUrl', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    // Restore original env
    process.env = { ...originalEnv };
  });

  it('should return default URL when POSITRON_REDIS_URL is not set', () => {
    delete process.env.POSITRON_REDIS_URL;
    expect(resolveRedisUrl()).toBe('redis://localhost:6379');
  });

  it('should return custom URL when POSITRON_REDIS_URL is set', () => {
    process.env.POSITRON_REDIS_URL = 'redis://myredis:6380';
    expect(resolveRedisUrl()).toBe('redis://myredis:6380');
  });

  it('should handle Redis with password', () => {
    process.env.POSITRON_REDIS_URL = 'redis://:password@myredis:6379/0';
    expect(resolveRedisUrl()).toBe('redis://:password@myredis:6379/0');
  });

  it('should return empty string when env var is empty string (not nullish)', () => {
    process.env.POSITRON_REDIS_URL = '';
    // Empty string is not nullish — ?? does NOT fall through
    expect(resolveRedisUrl()).toBe('');
  });
});
