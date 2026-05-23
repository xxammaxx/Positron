// Positron — Spec Kit Adapter Error Classes
// Typisierte Fehler für den Spec Kit Real Adapter (Issue #15)

/** Basis-Fehler für Spec Kit Adapter */
export class SpecKitError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = 'SpecKitError';
  }
}

/** Spec Kit CLI ist nicht installiert oder nicht auffindbar */
export class SpecKitNotInstalledError extends SpecKitError {
  constructor(message = 'Spec Kit CLI (specify) is not installed or not in PATH') {
    super(message, 'SPECKIT_NOT_INSTALLED');
    this.name = 'SpecKitNotInstalledError';
  }
}

/** Spec Kit Kommando ist nicht in der Allowlist */
export class SpecKitCommandNotAllowedError extends SpecKitError {
  constructor(command: string) {
    super(`Spec Kit command not allowed: ${command}`, 'SPECKIT_COMMAND_NOT_ALLOWED');
    this.name = 'SpecKitCommandNotAllowedError';
  }
}

/** Spec Kit Kommando ist fehlgeschlagen (exit code != 0) */
export class SpecKitCommandFailedError extends SpecKitError {
  constructor(
    command: string,
    exitCode: number | null,
    stderr?: string,
  ) {
    const stderrSnippet = stderr ? ` — ${stderr.slice(0, 200)}` : '';
    super(
      `Spec Kit command '${command}' failed with exit code ${exitCode ?? 'null'}${stderrSnippet}`,
      'SPECKIT_COMMAND_FAILED',
    );
    this.name = 'SpecKitCommandFailedError';
  }
}

/** Workspace-Pfad ist nicht gültig für Spec Kit */
export class SpecKitWorkspaceInvalidError extends SpecKitError {
  constructor(workspacePath: string, reason?: string) {
    super(
      `Invalid workspace path for Spec Kit: ${workspacePath}${reason ? ` — ${reason}` : ''}`,
      'SPECKIT_WORKSPACE_INVALID',
    );
    this.name = 'SpecKitWorkspaceInvalidError';
  }
}

/** Erwartetes Spec Kit Artefakt wurde nicht gefunden */
export class SpecKitArtifactNotFoundError extends SpecKitError {
  constructor(artifactPath: string) {
    super(`Spec Kit artifact not found: ${artifactPath}`, 'SPECKIT_ARTIFACT_NOT_FOUND');
    this.name = 'SpecKitArtifactNotFoundError';
  }
}

/** Zeitüberschreitung bei Spec Kit Kommando */
export class SpecKitTimeoutError extends SpecKitError {
  constructor(command: string, timeoutMs: number) {
    super(`Spec Kit command '${command}' timed out after ${timeoutMs}ms`, 'SPECKIT_TIMEOUT');
    this.name = 'SpecKitTimeoutError';
  }
}

/** Nicht unterstütztes Spec Kit Kommando (z.B. Agent Slash Command) */
export class SpecKitUnsupportedCommandError extends SpecKitError {
  constructor(command: string, reason?: string) {
    super(
      `Spec Kit command not supported: ${command}${reason ? ` — ${reason}` : ''}`,
      'SPECKIT_UNSUPPORTED',
    );
    this.name = 'SpecKitUnsupportedCommandError';
  }
}
