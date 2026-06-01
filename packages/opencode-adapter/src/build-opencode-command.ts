// Positron — OpenCode Command and Prompt Builders
// Pure functions for CLI argument and prompt construction.
// Level A Safety Module — must maintain 100% coverage.
// No unsupported flags: --issue, --mode, --unsafe must never appear.

import type { OpenCodeRunInput } from '@positron/shared';

/**
 * Builds arguments for `opencode run` command.
 * Safety: must NOT use --issue, --mode, --unsafe or other unsupported flags.
 */
export function buildOpenCodeRunCommand(commandName: string, phaseName: string, contextMsg: string): string[] {
  return [
    'run',
    '--command', commandName,
    '--format', 'json',
    contextMsg,
  ];
}

/**
 * Builds the context message string for OpenCode.
 * Includes issue context safely — no secrets in output.
 */
export function buildOpenCodeContextMessage(phaseName: string, input: OpenCodeRunInput): string {
  const safeTitle = input.issueTitle?.slice(0, 500) ?? '';
  const safeBody = input.issueBody?.slice(0, 2000) ?? '';
  const issueRef = input.issueNumber ? `#${input.issueNumber}` : '?';

  if (safeBody) {
    return `${phaseName}\n\nIssue ${issueRef}: ${safeTitle}\n\n${safeBody}`;
  }
  return `${phaseName}\n\nIssue ${issueRef}: ${safeTitle}`;
}

/**
 * Builds arguments for `opencode --version` (health check).
 */
export function buildOpenCodeVersionCommand(): string[] {
  return ['--version'];
}

/**
 * Classifies an OpenCode CLI result.
 * Safety: maps exit codes and errors safely.
 */
export interface OpenCodeResult {
  exitCode: number | null;
  stdout: string;
  stderr: string;
  durationMs: number;
}

export interface ClassifiedResult {
  status: 'success' | 'failed' | 'blocked';
  summary: string;
  hasJsonError: boolean;
  errorMessage?: string;
}

export function classifyOpenCodeResult(
  result: OpenCodeResult,
  commandName: string,
  phaseName: string,
): ClassifiedResult {
  // Check for JSON error lines in stdout
  let hasJsonError = false;
  let errorMessage: string | undefined;
  try {
    for (const line of result.stdout.split('\n')) {
      const parsed = JSON.parse(line);
      if (parsed.type === 'error' && parsed.error?.data?.message) {
        hasJsonError = true;
        errorMessage = parsed.error.data.message;
        break;
      }
    }
  } catch { /* ignore parse errors */ }

  if (result.exitCode === null) {
    return {
      status: 'failed',
      summary: `Command "${commandName}" phase "${phaseName}" failed: command not executed`,
      hasJsonError: false,
    };
  }

  const isSuccess = result.exitCode === 0 && !hasJsonError;

  return {
    status: isSuccess ? 'success' : 'failed',
    summary: isSuccess
      ? `Command "${commandName}" phase "${phaseName}" completed`
      : `Command "${commandName}" phase "${phaseName}" failed: ${errorMessage ?? result.stderr.slice(0, 200)}`,
    hasJsonError,
    errorMessage,
  };
}
