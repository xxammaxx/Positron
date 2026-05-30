/**
 * Queue-Typen für Positron Run Queue (BullMQ-basiert).
 *
 * Trennt API (Producer) von Worker (Consumer):
 * - POST /api/runs → Queue.add('pipeline', { runId, ... })
 * - Worker → Queue.process('pipeline', executePipeline)
 */
/** Queue Name */
export const PIPELINE_QUEUE = 'positron-pipeline';
/**
 * Redis-Verbindungs-URL.
 * Default: localhost:6379, konfigurierbar via POSITRON_REDIS_URL.
 */
export function resolveRedisUrl() {
    return process.env.POSITRON_REDIS_URL ?? 'redis://localhost:6379';
}
//# sourceMappingURL=types.js.map