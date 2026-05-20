// Positron — GitHub Adapter: Fehlerklassen

export class GitHubError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly isRateLimit: boolean = false,
    public readonly isSecondaryRateLimit: boolean = false,
  ) {
    super(message);
    this.name = 'GitHubError';
  }
}

export class GitHubAuthError extends GitHubError {
  constructor() { super('GitHub authentication failed', 401); this.name = 'GitHubAuthError'; }
}

export class GitHubPermissionError extends GitHubError {
  constructor() { super('GitHub permission denied', 403); this.name = 'GitHubPermissionError'; }
}

export class GitHubNotFoundError extends GitHubError {
  constructor() { super('GitHub resource not found', 404); this.name = 'GitHubNotFoundError'; }
}

export class GitHubIssuesDisabledError extends GitHubError {
  constructor() { super('GitHub issues are disabled for this repository', 410); this.name = 'GitHubIssuesDisabledError'; }
}

export class GitHubValidationError extends GitHubError {
  constructor(message: string) { super(message, 422); this.name = 'GitHubValidationError'; }
}

export class GitHubRateLimitError extends GitHubError {
  constructor(
    public readonly retryAfter: number,
    public readonly limit: number,
    public readonly remaining: number,
    public readonly reset: number,
  ) {
    super(`GitHub rate limit exceeded (reset at ${new Date(reset * 1000).toISOString()})`, 403, true);
    this.name = 'GitHubRateLimitError';
  }
}

export class GitHubSecondaryRateLimitError extends GitHubError {
  constructor(public readonly retryAfter: number) {
    super(`GitHub secondary rate limit (retry after ${retryAfter}s)`, 403, false, true);
    this.name = 'GitHubSecondaryRateLimitError';
  }
}

export class GitHubNetworkError extends GitHubError {
  constructor(cause: string) { super(`GitHub network error: ${cause}`, 0); this.name = 'GitHubNetworkError'; }
}

export class GitHubUnknownError extends GitHubError {
  constructor(status: number, message: string) { super(`GitHub error ${status}: ${message}`, status); this.name = 'GitHubUnknownError'; }
}
