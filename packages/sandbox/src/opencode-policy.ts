// Positron — OpenCode Command Policy (Issue #16)

/**
 * Erlaubte OpenCode CLI-Kommandos.
 * Im safe-cli Modus sind nur run mit --command erlaubt.
 */
export const ALLOWED_OPENCODE_COMMANDS = new Set(['run']);

/**
 * Explizit blockierte OpenCode CLI-Kommandos.
 */
export const BLOCKED_OPENCODE_COMMANDS = new Set<string>(/* currently none */);

/**
 * Erlaubte Slash Commands für `opencode run --command <cmd>`.
 * Nur Spec Kit Commands sind im Scope von Issue #16.
 */
export const ALLOWED_SLASH_COMMANDS = new Set([
  'speckit.constitution',
  'speckit.specify',
  'speckit.clarify',
  'speckit.plan',
  'speckit.tasks',
  'speckit.analyze',
  'speckit.checklist',
]);

const SHELL_META_PATTERN = /[;|&`$#!<>~]/;

/**
 * Validiert ein OpenCode CLI-Kommando.
 *
 * Regeln:
 * - Nur `opencode` als Kommando
 * - Subkommando muss `run` sein
 * - --command muss ein allowed slash command sein
 * - Keine Shell-Metacharacter
 * - Kein --dangerously-skip-permissions (zu gefährlich)
 */
export function validateOpenCodeCommand(
  command: string,
  args: string[],
  cwd: string,
): void {
  if (command !== 'opencode') {
    throw new OpenCodeCommandPolicyError(
      `Only 'opencode' is allowed as OpenCode command, got: ${command}`,
    );
  }

  const sub = args[0];
  if (!sub) {
    throw new OpenCodeCommandPolicyError('OpenCode command requires a subcommand (e.g., run)');
  }

  if (!ALLOWED_OPENCODE_COMMANDS.has(sub)) {
    throw new OpenCodeCommandPolicyError(
      `OpenCode subcommand '${sub}' is not allowed. Only 'run' is supported.`,
    );
  }

  // Shell-Metacharacter check
  for (const arg of args) {
    if (SHELL_META_PATTERN.test(arg)) {
      throw new OpenCodeCommandPolicyError(
        `Shell metacharacter in OpenCode argument: ${arg}`,
      );
    }
  }

  // Block dangerous flags
  const blockedFlags = [
    '--dangerously-skip-permissions',
    '--dangerously-skip-permissions-bypass',
  ];
  for (const arg of args) {
    for (const flag of blockedFlags) {
      if (arg === flag || arg.startsWith(flag + '=')) {
        throw new OpenCodeCommandPolicyError(
          `Flag '${flag}' is blocked for security reasons`,
        );
      }
    }
  }

  // --command validation
  const cmdIdx = args.indexOf('--command');
  if (cmdIdx >= 0 && cmdIdx + 1 < args.length) {
    const slashCmd = args[cmdIdx + 1];
    if (!ALLOWED_SLASH_COMMANDS.has(slashCmd)) {
      throw new OpenCodeCommandPolicyError(
        `Slash command '${slashCmd}' is not allowed. Supported: ${[...ALLOWED_SLASH_COMMANDS].join(', ')}`,
      );
    }
  }
}

export class OpenCodeCommandPolicyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OpenCodeCommandPolicyError';
  }
}
