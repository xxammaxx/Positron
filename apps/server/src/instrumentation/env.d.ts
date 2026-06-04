/**
 * Ambient Module Declarations — Optional Runtime Packages
 *
 * The instrumentation modules (sentry.ts, otel.ts) use dynamic
 * `await import()` for graceful degradation when optional monitoring
 * packages are not installed. TypeScript's `moduleResolution: "NodeNext"`
 * still resolves module specifiers at compile time, so we provide
 * ambient declarations to satisfy the type checker without requiring
 * the actual packages in node_modules.
 *
 * Pattern: Graceful Skip
 * - If the package is installed: import succeeds, monitoring is activated
 * - If not installed: import throws, caught by try/catch, monitoring is disabled
 *
 * @see ADR-001: Artifact-first loosely-coupled CI architecture
 * @see Issue #171: Sentry + OpenTelemetry runtime verification
 */

declare module '@sentry/node';
declare module '@opentelemetry/sdk-node';
declare module '@opentelemetry/auto-instrumentations-node';
declare module '@opentelemetry/exporter-trace-otlp-http';
declare module '@opentelemetry/api';
