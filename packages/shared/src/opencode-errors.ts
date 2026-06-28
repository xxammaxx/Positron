// Positron — OpenCode Fehlerklassen

export class OpenCodeError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'OpenCodeError';
	}
}

export class OpenCodeNotInstalledError extends OpenCodeError {
	constructor() {
		super(
			'OpenCode CLI is not installed. See https://opencode.ai/docs/ for installation instructions',
		);
		this.name = 'OpenCodeNotInstalledError';
	}
}

export class OpenCodeCommandNotAllowedError extends OpenCodeError {
	constructor(command: string) {
		super(`OpenCode command "${command}" is not allowed in the current mode`);
		this.name = 'OpenCodeCommandNotAllowedError';
	}
}

export class OpenCodeCommandFailedError extends OpenCodeError {
	public readonly command: string;
	public readonly exitCode: number;
	public readonly stderr: string;

	constructor(command: string, exitCode: number, stderr: string) {
		super(
			`OpenCode command "${command}" failed with exit code ${exitCode}: ${stderr.slice(0, 200)}`,
		);
		this.name = 'OpenCodeCommandFailedError';
		this.command = command;
		this.exitCode = exitCode;
		this.stderr = stderr;
	}
}

export class OpenCodeWorkspaceInvalidError extends OpenCodeError {
	constructor(path: string) {
		super(`OpenCode workspace path is invalid: "${path}"`);
		this.name = 'OpenCodeWorkspaceInvalidError';
	}
}

export class OpenCodeTimeoutError extends OpenCodeError {
	constructor(command: string, timeoutMs: number) {
		super(`OpenCode command "${command}" timed out after ${timeoutMs}ms`);
		this.name = 'OpenCodeTimeoutError';
	}
}

export class OpenCodeUnsupportedCommandError extends OpenCodeError {
	constructor(command: string) {
		super(`OpenCode command "${command}" is not supported by this adapter`);
		this.name = 'OpenCodeUnsupportedCommandError';
	}
}
