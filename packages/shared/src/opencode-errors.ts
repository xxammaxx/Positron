// Positron — OpenCode Adapter Error Classes
// Typisierte Fehler für den OpenCode Real Adapter (Issue #16)

export class OpenCodeError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = 'OpenCodeError';
  }
}

/** OpenCode CLI ist nicht installiert */
export class OpenCodeNotInstalledError extends OpenCodeError {
  constructor(message = 'OpenCode CLI (opencode) is not installed or not in PATH') {
    super(message, 'OPENCODE_NOT_INSTALLED');
    this.name = 'OpenCodeNotInstalledError';
  }
}

/** OpenCode Kommando nicht in der Allowlist */
export class OpenCodeCommandNotAllowedError extends OpenCodeError {
  constructor(command: string) {
    super(`OpenCode command not allowed: ${command}`, 'OPENCODE_COMMAND_NOT_ALLOWED');
    this.name = 'OpenCodeCommandNotAllowedError';
  }
}

/** OpenCode Kommando fehlgeschlagen */
export class OpenCodeCommandFailedError extends OpenCodeError {
  constructor(command: string, exitCode: number | null, stderr?: string) {
    const snippet = stderr ? ` — ${stderr.slice(0, 200)}` : '';
    super(
      `OpenCode command '${command}' failed with exit code ${exitCode ?? 'null'}${snippet}`,
      'OPENCODE_COMMAND_FAILED',
    );
    this.name = 'OpenCodeCommandFailedError';
  }
}

/** Workspace nicht gültig */
export class OpenCodeWorkspaceInvalidError extends OpenCodeError {
  constructor(path: string, reason?: string) {
    super(
      `Invalid workspace path for OpenCode: ${path}${reason ? ` — ${reason}` : ''}`,
      'OPENCODE_WORKSPACE_INVALID',
    );
    this.name = 'OpenCodeWorkspaceInvalidError';
  }
}

/** Timeout */
export class OpenCodeTimeoutError extends OpenCodeError {
  constructor(command: string, timeoutMs: number) {
    super(`OpenCode command '${command}' timed out after ${timeoutMs}ms`, 'OPENCODE_TIMEOUT');
    this.name = 'OpenCodeTimeoutError';
  }
}

/** Nicht unterstützter Slash Command */
export class OpenCodeUnsupportedCommandError extends OpenCodeError {
  constructor(command: string) {
    super(`Unsupported OpenCode slash command: ${command}`, 'OPENCODE_UNSUPPORTED');
    this.name = 'OpenCodeUnsupportedCommandError';
  }
}
