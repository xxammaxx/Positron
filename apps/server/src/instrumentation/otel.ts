/**
 * OpenTelemetry — Optional Distributed Tracing
 * Layer 6b — Runtime Verification (Issue #171)
 *
 * Gracefully disabled when OTEL_EXPORTER_OTLP_ENDPOINT is not set.
 * When enabled, provides run lifecycle spans with run.id and run.phase attributes.
 *
 * OpenTelemetry is fully OSS. No vendor lock-in.
 * Export: OTLP (gRPC or HTTP) to any compatible backend (Jaeger, Zipkin, Grafana Tempo).
 */

import type { RunContext } from "./run-context.js";
import { safeRunContext } from "./run-context.js";

let otelInitialized = false;
let otelTracer: { startSpan: (name: string) => unknown; endSpan: (span: unknown) => void } | null = null;

/**
 * Initialize OpenTelemetry if OTEL_EXPORTER_OTLP_ENDPOINT is configured.
 * Must be called once at server startup, BEFORE any Express middleware.
 * Returns true if OTEL was initialized.
 */
export async function initOtel(): Promise<boolean> {
	const endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
	if (!endpoint) {
		console.log("[OTEL] OTEL_EXPORTER_OTLP_ENDPOINT not set — tracing disabled");
		return false;
	}

	try {
		// Dynamic import: @opentelemetry/* packages are optional
		const { NodeSDK } = await import("@opentelemetry/sdk-node");
		const { getNodeAutoInstrumentations } = await import(
			"@opentelemetry/auto-instrumentations-node"
		);
		const { OTLPTraceExporter } = await import(
			"@opentelemetry/exporter-trace-otlp-http"
		);

		const sdk = new NodeSDK({
			traceExporter: new OTLPTraceExporter({
				url: endpoint,
			}),
			instrumentations: [
				getNodeAutoInstrumentations({
					// Disable file system instrumentation (noisy in test mode)
					"@opentelemetry/instrumentation-fs": { enabled: false },
				}),
			],
			serviceName: "positron-server",
		});

		// Graceful shutdown
		process.on("SIGTERM", () => {
			sdk
				.shutdown()
				.catch(() => {})
				.finally(() => process.exit(0));
		});

		await sdk.start();
		console.log(`[OTEL] Initialized — endpoint=${endpoint}`);
		otelInitialized = true;

		// Create a lightweight tracer helper
		const { trace } = await import("@opentelemetry/api");
		const tracer = trace.getTracer("positron-server");

		otelTracer = {
			startSpan(name: string) {
				return tracer.startSpan(name);
			},
			endSpan(span: unknown) {
				if (span && typeof (span as { end: () => void }).end === "function") {
					(span as { end: () => void }).end();
				}
			},
		};

		return true;
	} catch (err) {
		console.warn(
			`[OTEL] Failed to initialize (packages not installed?): ${err instanceof Error ? err.message : String(err)}`,
		);
		return false;
	}
}

/**
 * Create a run lifecycle span.
 * Must call span.end() when the lifecycle phase completes.
 *
 * Usage:
 *   const span = startRunSpan("INGEST", context);
 *   try {
 *     // ... do work ...
 *   } finally {
 *     endRunSpan(span);
 *   }
 */
export function startRunSpan(
	phase: string,
	context?: RunContext,
): unknown | null {
	if (!otelInitialized || !otelTracer) return null;

	try {
		const span = otelTracer.startSpan(`run.phase.${phase.toLowerCase()}`) as {
			setAttribute: (k: string, v: string) => void;
			end: () => void;
		};

		span.setAttribute("run.phase", phase);

		if (context) {
			const safe = safeRunContext(context);
			for (const [key, value] of Object.entries(safe)) {
				span.setAttribute(key, value);
			}
		}

		return span;
	} catch {
		return null;
	}
}

/**
 * End a run lifecycle span (no-op if OTEL is disabled).
 */
export function endRunSpan(span: unknown | null): void {
	if (!span || !otelTracer) return;
	try {
		otelTracer.endSpan(span);
	} catch {
		// Graceful
	}
}

/**
 * Check if OpenTelemetry is currently active.
 */
export function isOtelActive(): boolean {
	return otelInitialized;
}
