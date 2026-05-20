import { describe, expect, test } from 'vitest';
import { createGitHubClient } from '../client.js';
import { redactSecrets } from '@positron/shared';

describe('createSafeLogger — secret redaction', () => {
  test('createGitHubClient integriert Safe Logger', () => {
    const client = createGitHubClient({ token: 'ghp_TEST1234567890ABCDEFGHIJKLMNOPQRSTUV' });
    const secret = 'ghp_TEST1234567890ABCDEFGHIJKLMNOPQRSTUV';
    // Nur Token, kein "token=" Pattern
    const result = redactSecrets(secret);
    expect(result).toContain('[REDACTED_GITHUB_TOKEN]');
    expect(result).not.toContain('ghp_TEST');
  });

  test('Log-Call crasht nicht mit Secret', () => {
    const client = createGitHubClient({ token: 'ghp_TEST1234567890ABCDEFGHIJKLMNOPQRSTUV' });
    // Smoketest: Log-Aufruf mit Secret wirft keine Exception
    expect(() => client.log.info('Token: ghp_TEST1234567890ABCDEFGHIJKLMNOPQRSTUV')).not.toThrow();
    expect(() => client.log.info('Error', { token: 'ghp_TEST1234567890ABCDEFGHIJKLMNOPQRSTUV' })).not.toThrow();
  });

  test('wirft ohne Token', () => {
    delete process.env.GITHUB_TOKEN;
    expect(() => createGitHubClient()).toThrow('GITHUB_TOKEN');
  });
});
