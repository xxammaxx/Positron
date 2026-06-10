// Positron — SpecKit Fehlerklassen

export class SpecKitError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'SpecKitError';
	}
}

export class SpecKitNotInstalledError extends SpecKitError {
	constructor() {
		super(
			'Spec Kit CLI is not installed. Run `npm install -g @github/spec-kit` or follow instructions at https://github.com/github/spec-kit',
		);
		this.name = 'SpecKitNotInstalledError';
	}
}

export class SpecKitCommandNotAllowedError extends SpecKitError {
	constructor(command: string) {
		super(`Spec Kit command "${command}" is not allowed in the current mode`);
		this.name = 'SpecKitCommandNotAllowedError';
	}
}

export class SpecKitCommandFailedError extends SpecKitError {
	public readonly command: string;
	public readonly exitCode: number;
	public readonly stderr: string;

	constructor(command: string, exitCode: number, stderr: string) {
		super(
			`Spec Kit command "${command}" failed with exit code ${exitCode}: ${stderr.slice(0, 200)}`,
		);
		this.name = 'SpecKitCommandFailedError';
		this.command = command;
		this.exitCode = exitCode;
		this.stderr = stderr;
	}
}

export class SpecKitWorkspaceInvalidError extends SpecKitError {
	constructor(path: string) {
		super(`Spec Kit workspace path is invalid: "${path}"`);
		this.name = 'SpecKitWorkspaceInvalidError';
	}
}

export class SpecKitArtifactNotFoundError extends SpecKitError {
	constructor(kind: string, path: string) {
		super(`Spec Kit artifact "${kind}" not found at "${path}"`);
		this.name = 'SpecKitArtifactNotFoundError';
	}
}

export class SpecKitTimeoutError extends SpecKitError {
	constructor(command: string, timeoutMs: number) {
		super(`Spec Kit command "${command}" timed out after ${timeoutMs}ms`);
		this.name = 'SpecKitTimeoutError';
	}
}

export class SpecKitUnsupportedCommandError extends SpecKitError {
	constructor(command: string) {
		super(`Spec Kit command "${command}" is not supported by this adapter`);
		this.name = 'SpecKitUnsupportedCommandError';
	}
}
