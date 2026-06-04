/**
 * Run Context — shared context helpers for Sentry breadcrumbs and OTEL spans.
 * Layer 6 — Runtime Verification (Issue #171)
 *
 * Provides a per-request context object with run.id, run.phase, and adapter.mode.
 * All values are REDACTED — never logged with real secrets or tokens.
 *
 * This is a lightweight async-local store using Node.js AsyncLocalStorage.
 */

import { AsyncLocalStorage } from "node:async_hooks";

export interface RunContext {
	/** The GitHub issue-based run identifier (e.g., "#165-run-abc123") */
	runId?: string;
	/** Current pipeline phase (e.g., "INGEST", "ANALYZE", "DONE") */
	runPhase?: string;
	/** Active adapter mode: "fake" | "real" */
	adapterMode?: string;
}

const runContextStore = new AsyncLocalStorage<RunContext>();

/**
 * Run the given function within a run-context scope.
 * All nested calls within fn() will have access to the context.
 */
export function withRunContext<T>(
	context: RunContext,
	fn: () => T,
): T {
	return runContextStore.run(context, fn);
}

/**
 * Get the current run context (if any).
 * Returns undefined when called outside a run lifecycle.
 */
export function getRunContext(): RunContext | undefined {
	return runContextStore.getStore();
}

/**
 * Update specific fields in the current run context.
 * Preserves existing fields not specified.
 */
export function updateRunContext(update: Partial<RunContext>): void {
	const current = runContextStore.getStore();
	if (current) {
		Object.assign(current, update);
	}
}

/**
 * Create a safe (redacted) representation of run context for logging.
 * No secrets or tokens are included.
 */
export function safeRunContext(ctx?: RunContext): Record<string, string> {
	if (!ctx) return {};
	const result: Record<string, string> = {};
	if (ctx.runId) result["run.id"] = ctx.runId;
	if (ctx.runPhase) result["run.phase"] = ctx.runPhase;
	if (ctx.adapterMode) result["adapter.mode"] = ctx.adapterMode;
	return result;
}
