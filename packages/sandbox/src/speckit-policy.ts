// Positron — SpecKit Policy

/** Erlaubte SpecKit-Kommandos */
export const ALLOWED_SPECKIT_COMMANDS = [
  'specify version',
  'specify --version',
  'specify init',
  'specify check',
] as const;

/** Blockierte SpecKit-Kommandos */
export const BLOCKED_SPECKIT_COMMANDS = [
  'specify --force',
  'specify --dangerous',
] as const;

/**
 * Prüft ob ein SpecKit-Kommando erlaubt ist.
 */
export function isAllowedSpecKitCommand(command: string): boolean {
  return ALLOWED_SPECKIT_COMMANDS.some(allowed => command.includes(allowed));
}

/**
 * Prüft ob ein SpecKit-Kommando blockiert ist.
 */
export function isBlockedSpecKitCommand(command: string): boolean {
  return BLOCKED_SPECKIT_COMMANDS.some(blocked => command.includes(blocked));
}

/**
 * Validiert ein SpecKit-Kommando.
 * Wirft Error wenn das Kommando blockiert oder nicht erlaubt ist.
 */
export function validateSpecKitCommand(command: string): void {
  const mode = process.env['POSITRON_SPECKIT_MODE'] ?? 'fake';

  if (mode === 'fake') {
    throw new SpecKitCommandPolicyError(
      'SpecKit is in fake mode — no real commands allowed. ' +
      'Set POSITRON_SPECKIT_MODE=real to enable real SpecKit execution.',
    );
  }

  if (isBlockedSpecKitCommand(command)) {
    throw new SpecKitCommandPolicyError(`SpecKit command "${command}" is blocked by policy`);
  }

  if (!isAllowedSpecKitCommand(command)) {
    throw new SpecKitCommandPolicyError(`SpecKit command "${command}" is not in the allowed list`);
  }
}

/**
 * Fehler für SpecKit-Policy-Verstöße.
 */
export class SpecKitCommandPolicyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SpecKitCommandPolicyError';
  }
}
