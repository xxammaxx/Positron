// Positron — GitHub Fehlerklassen

export class GitHubError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'GitHubError';
	}
}

export class GitHubAuthError extends GitHubError {
	constructor() {
		super('GitHub authentication failed. Check your GITHUB_TOKEN.');
		this.name = 'GitHubAuthError';
	}
}

export class GitHubPermissionError extends GitHubError {
	constructor() {
		super('GitHub permission denied. Check your token scopes.');
		this.name = 'GitHubPermissionError';
	}
}

export class GitHubNotFoundError extends GitHubError {
	constructor() {
		super('GitHub resource not found.');
		this.name = 'GitHubNotFoundError';
	}
}

export class GitHubIssuesDisabledError extends GitHubError {
	constructor() {
		super('GitHub Issues are disabled for this repository.');
		this.name = 'GitHubIssuesDisabledError';
	}
}

export class GitHubValidationError extends GitHubError {
	constructor(message: string) {
		super(`GitHub validation error: ${message}`);
		this.name = 'GitHubValidationError';
	}
}

export class GitHubRateLimitError extends GitHubError {
	public readonly retryAfter: number;
	public readonly limit: number;
	public readonly remaining: number;
	public readonly reset: number;

	constructor(retryAfter: number, limit: number, remaining: number, reset: number) {
		super(
			`GitHub rate limit exceeded. Retry after ${retryAfter}s. Limit: ${limit}, Remaining: ${remaining}`,
		);
		this.name = 'GitHubRateLimitError';
		this.retryAfter = retryAfter;
		this.limit = limit;
		this.remaining = remaining;
		this.reset = reset;
	}
}

export class GitHubSecondaryRateLimitError extends GitHubError {
	public readonly retryAfter: number;

	constructor(retryAfter: number) {
		super(`GitHub secondary rate limit hit. Retry after ${retryAfter}s.`);
		this.name = 'GitHubSecondaryRateLimitError';
		this.retryAfter = retryAfter;
	}
}

export class GitHubNetworkError extends GitHubError {
	constructor(message: string) {
		super(`GitHub network error: ${message}`);
		this.name = 'GitHubNetworkError';
	}
}

export class GitHubUnknownError extends GitHubError {
	public readonly status: number;

	constructor(status: number, message: string) {
		super(`GitHub unknown error (${status}): ${message}`);
		this.name = 'GitHubUnknownError';
		this.status = status;
	}
}
