import { describe, it, expect } from 'vitest';
import {
  GitHubError, GitHubAuthError, GitHubPermissionError, GitHubNotFoundError,
  GitHubIssuesDisabledError, GitHubValidationError, GitHubRateLimitError,
  GitHubSecondaryRateLimitError, GitHubNetworkError, GitHubUnknownError,
} from '../errors.js';

describe('GitHubError', () => {
  it('should be instance of Error', () => {
    expect(new GitHubError('test')).toBeInstanceOf(Error);
  });
  it('should have correct name', () => {
    expect(new GitHubError('test').name).toBe('GitHubError');
  });
});

describe('GitHubAuthError', () => {
  it('should extend GitHubError', () => {
    expect(new GitHubAuthError()).toBeInstanceOf(GitHubError);
  });
  it('should mention token', () => {
    expect(new GitHubAuthError().message).toContain('GITHUB_TOKEN');
  });
});

describe('GitHubPermissionError', () => {
  it('should extend GitHubError', () => {
    expect(new GitHubPermissionError()).toBeInstanceOf(GitHubError);
  });
  it('should mention scopes', () => {
    expect(new GitHubPermissionError().message).toContain('scopes');
  });
});

describe('GitHubNotFoundError', () => {
  it('should extend GitHubError', () => {
    expect(new GitHubNotFoundError()).toBeInstanceOf(GitHubError);
  });
});

describe('GitHubIssuesDisabledError', () => {
  it('should extend GitHubError', () => {
    expect(new GitHubIssuesDisabledError()).toBeInstanceOf(GitHubError);
  });
});

describe('GitHubValidationError', () => {
  it('should extend GitHubError', () => {
    expect(new GitHubValidationError('bad input')).toBeInstanceOf(GitHubError);
  });
  it('should include message', () => {
    expect(new GitHubValidationError('bad input').message).toContain('bad input');
  });
});

describe('GitHubRateLimitError', () => {
  it('should store rate limit fields', () => {
    const err = new GitHubRateLimitError(60, 5000, 0, 1717200000);
    expect(err.retryAfter).toBe(60);
    expect(err.limit).toBe(5000);
    expect(err.remaining).toBe(0);
    expect(err.reset).toBe(1717200000);
  });
  it('should include retry info in message', () => {
    const err = new GitHubRateLimitError(60, 5000, 0, 1717200000);
    expect(err.message).toContain('60s');
  });
});

describe('GitHubSecondaryRateLimitError', () => {
  it('should store retryAfter', () => {
    const err = new GitHubSecondaryRateLimitError(120);
    expect(err.retryAfter).toBe(120);
  });
});

describe('GitHubNetworkError', () => {
  it('should include message', () => {
    expect(new GitHubNetworkError('timeout').message).toContain('timeout');
  });
});

describe('GitHubUnknownError', () => {
  it('should store status code', () => {
    const err = new GitHubUnknownError(418, "I'm a teapot");
    expect(err.status).toBe(418);
    expect(err.message).toContain('418');
  });
});
