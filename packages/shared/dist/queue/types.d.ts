/**
 * Queue-Typen für Positron Run Queue (BullMQ-basiert).
 *
 * Trennt API (Producer) von Worker (Consumer):
 * - POST /api/runs → Queue.add('pipeline', { runId, ... })
 * - Worker → Queue.process('pipeline', executePipeline)
 */
/** Job-Daten, die in die Queue gelegt werden. */
export interface PipelineJobData {
    /** ID des Runs (aus createRun / DB). */
    runId: string;
    /** Repository-ID (owner/name). */
    repoId: string;
    /** Issue-Nummer. */
    issueNumber: number;
    /** Autonomie-Level (0 = safe, 2 = full). */
    autonomyLevel: number;
}
/** Ergebnis, das der Worker nach Pipeline-Ausführung zurückgibt. */
export interface PipelineJobResult {
    /** finaler Run-Status. */
    status: string;
    /** finaler Run-Phase. */
    phase: string;
    /** Letzter Fehler (falls vorhanden). */
    lastError: string | null;
}
/** Queue Name */
export declare const PIPELINE_QUEUE = "positron-pipeline";
/**
 * Redis-Verbindungs-URL.
 * Default: localhost:6379, konfigurierbar via POSITRON_REDIS_URL.
 */
export declare function resolveRedisUrl(): string;
//# sourceMappingURL=types.d.ts.map