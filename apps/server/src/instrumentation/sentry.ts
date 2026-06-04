/**
 * Sentry Error Tracking — Optional Runtime Error Monitoring
 * Layer 6a — Runtime Verification (Issue #171)
 *
 * Gracefully disabled when SENTRY_DSN is not set.
 * When enabled, adds run-context breadcrumbs to every error.
 *
 * Free tier: 5,000 errors/month (Sentry Developer)
 * No hardcoded DSN — env-only configuration.
 */

import type { RunContext } from "./run-context.js";
import { safeRunContext } from "./run-context.js";

let sentryInitialized = false;

/**
 * Initialize Sentry if SENTRY_DSN is configured.
 * Must be called once at server startup, BEFORE any Express middleware.
 * Returns true if Sentry was initialized.
 */
export async function initSentry(): Promise<boolean> {
	const dsn = process.env.SENTRY_DSN;
	if (!dsn) {
		console.log("[Sentry] SENTRY_DSN not set — error tracking disabled");
		return false;
	}

	try {
		// Dynamic import: @sentry/node is optional (not in package.json by default)
		const Sentry = await import("@sentry/node");

		Sentry.init({
			dsn,
			environment: process.env.NODE_ENV ?? "development",
			tracesSampleRate: parseFloat(
				process.env.SENTRY_TRACES_SAMPLE_RATE ?? "0.1",
			),
			// Do not capture request bodies (may contain tokens)
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			beforeSend(event: any) {
				// Redact any potential secrets from event data
				if (event.request?.data) {
					event.request.data = "[redacted]";
				}
				return event;
			},
		});

		console.log(
			`[Sentry] Initialized — environment=${process.env.NODE_ENV ?? "development"}`,
		);
		sentryInitialized = true;
		return true;
	} catch (err) {
		console.warn(
			`[Sentry] Failed to initialize (package not installed?): ${err instanceof Error ? err.message : String(err)}`,
		);
		return false;
	}
}

/**
 * Add a run-context breadcrumb for the current Sentry scope.
 * Safe to call even when Sentry is not initialized.
 */
export function addRunBreadcrumb(context: RunContext): void {
	if (!sentryInitialized) return;

	try {
		// Dynamic import is cached after first load
		import("@sentry/node").then((Sentry) => {
			const safe = safeRunContext(context);
			Sentry.addBreadcrumb({
				category: "positron.run",
				message: `Run phase: ${context.runPhase ?? "unknown"}`,
				data: safe,
				level: "info",
			});
		});
	} catch {
		// Graceful: Sentry unavailable
	}
}

/**
 * Capture an exception with run context.
 * Safe to call even when Sentry is not initialized.
 */
export function captureRunException(
	error: Error,
	context?: RunContext,
): void {
	if (!sentryInitialized) return;

	try {
		import("@sentry/node").then((Sentry) => {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			Sentry.withScope((scope: any) => {
				if (context) {
					const safe = safeRunContext(context);
					scope.setTags(safe);
				}
				Sentry.captureException(error);
			});
		});
	} catch {
		// Graceful: Sentry unavailable
	}
}

/**
 * Check if Sentry is currently active.
 */
export function isSentryActive(): boolean {
	return sentryInitialized;
}
