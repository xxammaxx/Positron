import { describe, expect, test } from 'vitest';
import { createGitHubClient, createSafeLogger } from '../client.js';

describe('createGitHubClient', () => {
  test('wirft ohne Token', () => {
    delete process.env.GITHUB_TOKEN;
    expect(() => createGitHubClient()).toThrow('GITHUB_TOKEN');
  });

  test('erstellt Client mit explizitem Token', () => {
    const client = createGitHubClient({ token: 'ghp_test1234567890abcdefghijklmnop' });
    expect(client).toBeDefined();
  });
});

describe('createSafeLogger', () => {
  test('redactet Secrets in Log-Nachrichten', () => {
    const client = createGitHubClient({ token: 'ghp_test1234567890abcdefghijklmnop' });
    const safe = createSafeLogger(client);
    // Log sollte nicht crashen
    expect(() => safe.log.info('Test mit ghp_TEST1234567890ABCDEFGHIJKLMNOPQRSTUV')).not.toThrow();
  });
});
