import { describe, expect, test } from 'vitest';
import { RequestError } from '@octokit/request-error';
import { mapRequestError } from '../real-adapter.js';
import {
  GitHubAuthError, GitHubPermissionError, GitHubNotFoundError,
  GitHubIssuesDisabledError, GitHubValidationError,
  GitHubRateLimitError, GitHubSecondaryRateLimitError,
} from '../errors.js';

function makeErr(status: number, message: string, headers: Record<string, string> = {}) {
  return new RequestError(message, status, {
    request: { method: 'GET', url: 'https://api.github.com/test', headers: {} },
    response: { status, headers, data: {}, url: 'https://api.github.com/test' },
  });
}

describe('mapRequestError', () => {
  test('401 → GitHubAuthError', () => {
    const err = mapRequestError(makeErr(401, 'Bad credentials'));
    expect(err).toBeInstanceOf(GitHubAuthError);
  });

  test('403 ohne Rate-Limit → GitHubPermissionError', () => {
    const err = mapRequestError(makeErr(403, 'Forbidden'));
    expect(err).toBeInstanceOf(GitHubPermissionError);
  });

  test('403 mit x-ratelimit-remaining: 0 → GitHubRateLimitError', () => {
    const err = mapRequestError(makeErr(403, 'rate limit', {
      'x-ratelimit-remaining': '0',
      'x-ratelimit-limit': '5000',
      'x-ratelimit-reset': '1700000000',
      'retry-after': '120',
    }));
    expect(err).toBeInstanceOf(GitHubRateLimitError);
    expect((err as GitHubRateLimitError).remaining).toBe(0);
    expect((err as GitHubRateLimitError).limit).toBe(5000);
  });

  test('403 mit retry-after + secondary → GitHubSecondaryRateLimitError', () => {
    const err = mapRequestError(makeErr(403, 'You have triggered a secondary rate limit', {
      'retry-after': '60',
    }));
    expect(err).toBeInstanceOf(GitHubSecondaryRateLimitError);
    expect((err as GitHubSecondaryRateLimitError).retryAfter).toBe(60);
  });

  test('404 → GitHubNotFoundError', () => {
    expect(mapRequestError(makeErr(404, 'Not Found'))).toBeInstanceOf(GitHubNotFoundError);
  });

  test('410 → GitHubIssuesDisabledError', () => {
    expect(mapRequestError(makeErr(410, 'Gone'))).toBeInstanceOf(GitHubIssuesDisabledError);
  });

  test('422 → GitHubValidationError', () => {
    expect(mapRequestError(makeErr(422, 'Validation failed'))).toBeInstanceOf(GitHubValidationError);
  });

  test('Fehlermeldungen sind redacted (keine Secrets)', () => {
    const err = mapRequestError(makeErr(422, 'Failed with ghp_test1234567890abcdefghijklmnop'));
    expect(err.message).not.toContain('ghp_test');
    expect(err.message).toContain('[REDACTED_GITHUB_TOKEN]');
  });
});
