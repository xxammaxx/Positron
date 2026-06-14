// Positron — OpenCode Policy

/** Erlaubte OpenCode-Kommandos */
export const ALLOWED_OPENCODE_COMMANDS = [
	'opencode',
	'opencode run',
	'opencode --version',
	'opencode --help',
] as const;

/** Blockierte OpenCode-Kommandos */
export const BLOCKED_OPENCODE_COMMANDS = [
	'opencode --dangerous',
	'opencode --unsafe',
	'opencode --allow-all',
] as const;

/** Erlaubte Slash-Kommandos */
export const ALLOWED_SLASH_COMMANDS = [
	'speckit.specify',
	'speckit.plan',
	'speckit.tasks',
	'speckit.analyze',
	'speckit.constitution',
	'speckit.clarify',
] as const;

/**
 * Validiert ob ein OpenCode-Kommando ausgeführt werden darf.
 */
export function validateOpenCodeCommand(command: string): void {
	const mode = process.env.POSITRON_OPENCODE_MODE ?? 'fake';

	if (mode !== 'real') {
		throw new OpenCodeCommandPolicyError(
			'OpenCode is in fake mode — no real commands allowed. ' +
				'Set POSITRON_OPENCODE_MODE=real to enable real OpenCode execution.',
		);
	}

	for (const blocked of BLOCKED_OPENCODE_COMMANDS) {
		if (command.includes(blocked)) {
			throw new OpenCodeCommandPolicyError(`Command "${command}" is blocked by policy`);
		}
	}
}

/**
 * Fehler für OpenCode-Policy-Verstöße.
 */
export class OpenCodeCommandPolicyError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'OpenCodeCommandPolicyError';
	}
}
