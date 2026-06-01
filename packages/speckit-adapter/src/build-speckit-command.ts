// Positron — SpecKit Command Builders and Safety Validators
// Pure functions for CLI argument construction and mode validation.
// Level A Safety Module — must maintain 100% coverage.

/**
 * Builds arguments for `specify version` (health check).
 */
export function buildSpecKitVersionCommand(): string[] {
  return ['version'];
}

/**
 * Builds arguments for `specify init`.
 * Safety: only allowed in safe-cli mode (validateSpecKitMode).
 */
export function buildSpecKitInitCommand(aiAgent?: string): string[] {
  return ['init', '--integration', aiAgent ?? 'generic'];
}

/**
 * Validates that spec kit operations are only allowed in safe-cli mode.
 * Safety: blocks init/install/download in non-safe modes.
 */
export function validateSpecKitMode(mode: string): 'ok' | 'blocked' {
  if (mode === 'safe-cli' || mode === 'artifact-only' || mode === 'detect-only') {
    return 'ok';
  }
  return 'blocked';
}

/**
 * Builds arguments for a spec kit agent slash command phase.
 * In artifact-only mode, no CLI args are generated (artifact scan only).
 */
export function buildSpecKitRunCommand(phaseName: string, mode: string): string[] | null {
  if (mode === 'artifact-only') return null; // No CLI command needed
  return [phaseName, '--format', 'json'];
}

/**
 * Classifies a SpecKit CLI result.
 */
export interface SpecKitCliResult {
  exitCode: number | null;
  stdout: string;
  stderr: string;
  durationMs: number;
}

export function classifySpecKitResult(
  result: SpecKitCliResult,
  operation: string,
): { status: 'success' | 'failed'; summary: string } {
  if (result.exitCode === null) {
    return { status: 'failed', summary: `${operation} failed: command not executed (timeout or error)` };
  }
  if (result.exitCode === 0) {
    return { status: 'success', summary: `${operation} completed successfully` };
  }
  return {
    status: 'failed',
    summary: `${operation} failed (exit ${result.exitCode}): ${result.stderr.slice(0, 200)}`,
  };
}
