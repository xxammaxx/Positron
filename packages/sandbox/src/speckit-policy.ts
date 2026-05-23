// Positron — Spec Kit Command Policy
// Erweiterte CommandPolicy für Spec Kit CLI (Issue #15)

/**
 * Erlaubte Spec Kit CLI-Subkommandos.
 *
 * Nur read-only oder safe-init Kommandos sind erlaubt.
 * Keine Extensions, Presets, Downloads oder Agent-Slash-Commands.
 */
export const ALLOWED_SPECKIT_COMMANDS = new Set([
  'version',
  'check',
  'init',
]);

/**
 * Explizit blockierte Spec Kit CLI-Subkommandos.
 * Diese würden Installation, Downloads oder gefährliche Aktionen auslösen.
 */
export const BLOCKED_SPECKIT_COMMANDS = new Set([
  'extension',
  'preset',
  'integration',
  'workflow',
]);

/**
 * Shell-Metacharacter-Pattern zum Blocken gefährlicher Argumente.
 */
const SHELL_META_PATTERN = /[;|&`$#!<>~]/;

/**
 * Prüft ob ein Spec Kit Kommando in der Allowlist ist.
 */
export function isAllowedSpecKitCommand(subcommand: string): boolean {
  return ALLOWED_SPECKIT_COMMANDS.has(subcommand);
}

/**
 * Prüft ob ein Spec Kit Kommando explizit blockiert ist.
 */
export function isBlockedSpecKitCommand(subcommand: string): boolean {
  return BLOCKED_SPECKIT_COMMANDS.has(subcommand);
}

/**
 * Validiert ein Spec Kit CLI-Kommando (command + args).
 *
 * Regeln:
 * - Nur `specify` als Kommando
 * - Subkommando muss in ALLOWED_SPECKIT_COMMANDS sein
 * - Keine Shell-Metacharacter in args
 * - Keine Pfade außerhalb workspacePath
 * - Spezielle Init-Validierung
 *
 * @throws SpecKitCommandPolicyError bei Verletzung
 */
export function validateSpecKitCommand(
  command: string,
  args: string[],
  cwd: string,
): void {
  // 1. Nur 'specify' ist erlaubt
  if (command !== 'specify') {
    throw new SpecKitCommandPolicyError(
      `Only 'specify' is allowed as Spec Kit command, got: ${command}`,
    );
  }

  // 2. Subkommando erforderlich
  const sub = args[0];
  if (!sub) {
    throw new SpecKitCommandPolicyError('Spec Kit command requires a subcommand');
  }

  // 3. Subkommando muss erlaubt sein
  if (!isAllowedSpecKitCommand(sub)) {
    if (isBlockedSpecKitCommand(sub)) {
      throw new SpecKitCommandPolicyError(
        `Spec Kit command 'specify ${sub}' is blocked (extensions/presets/integrations/workflows not allowed)`,
      );
    }
    throw new SpecKitCommandPolicyError(
      `Unknown Spec Kit command: specify ${sub}. Note: /speckit.* commands are Agent Slash Commands, not CLI subcommands.`,
    );
  }

  // 4. Keine Shell-Metacharacter
  for (const arg of args) {
    if (SHELL_META_PATTERN.test(arg)) {
      throw new SpecKitCommandPolicyError(
        `Shell metacharacter in Spec Kit argument: ${arg}`,
      );
    }
  }

  // 5. Init-spezifische Validierung
  if (sub === 'init') {
    validateSpecKitInit(args, cwd);
  }
}

/**
 * Zusätzliche Validierung für `specify init`.
 *
 * Regeln:
 * - Kein --ai flag (deprecated, use --integration)
 * - Kein --ai-commands-dir (legacy)
 * - Kein --ai-skills (legacy)
 * - Kein --preset (keine externen Presets installieren)
 * - Kein --extension (keine Extensions installieren)
 * - Nur --integration opencode oder --integration generic erlaubt
 * - Zielverzeichnis muss innerhalb cwd liegen (kein path traversal)
 */
function validateSpecKitInit(args: string[], cwd: string): void {
  const blockedFlags = new Set([
    '--ai',
    '--ai-commands-dir',
    '--ai-skills',
    '--preset',
    '--extension',
  ]);

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    // Blockiere deprecated/gefährliche Flags
    for (const flag of blockedFlags) {
      if (arg === flag || arg.startsWith(flag + '=')) {
        throw new SpecKitCommandPolicyError(
          `Flag '${flag}' is not allowed for 'specify init' in Positron`,
        );
      }
    }

    // Validiere --integration
    if (arg === '--integration' || arg.startsWith('--integration=')) {
      let value: string;
      if (arg.startsWith('--integration=')) {
        value = arg.split('=')[1];
      } else {
        value = args[i + 1] ?? '';
      }
      if (!['opencode', 'generic'].includes(value)) {
        throw new SpecKitCommandPolicyError(
          `Integration '${value}' is not allowed. Only 'opencode' or 'generic' are supported.`,
        );
      }
    }

    // Blockiere Pfade außerhalb cwd
    if (arg.startsWith('/') || arg.includes('..')) {
      // Erster Non-Flag-Arg ist der Projektname — das ist in Ordnung
      // Aber absolute Pfade und .. sind nicht erlaubt
      if (arg.startsWith('/')) {
        throw new SpecKitCommandPolicyError(
          `Absolute path not allowed for 'specify init': ${arg}`,
        );
      }
      if (arg.includes('..')) {
        throw new SpecKitCommandPolicyError(
          `Path traversal not allowed for 'specify init': ${arg}`,
        );
      }
    }
  }
}

// Error class
export class SpecKitCommandPolicyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SpecKitCommandPolicyError';
  }
}
