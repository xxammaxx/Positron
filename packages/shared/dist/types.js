// Positron — Zentrale Typdefinitionen
/** Alle Phasen als konstantes Array */
export const ALL_PHASES = [
    'QUEUED',
    'CLAIMED',
    'REPO_SYNC',
    'ISSUE_CONTEXT',
    'WEB_RESEARCH',
    'SPECIFY',
    'CLARIFY_OPTIONAL',
    'PLAN',
    'TASKS',
    'ANALYZE',
    'REVIEW',
    'IMPLEMENT',
    'TEST',
    'VERIFY',
    'COMMIT',
    'PR_CREATE',
    'MERGE',
    'DONE',
    'FAILED',
    'FAILED_TRANSIENT',
    'FAILED_BLOCKED',
    'FAILED_UNSAFE',
    'BLOCKED_PUSH',
    'BLOCKED_MERGE',
    'GATE_APPROVE',
    'GATE_REVISE',
    'RESUME_PENDING',
    'CLEANUP',
];
/** Prüft ob ein String eine gültige Phase ist */
export function isValidPhase(value) {
    return ALL_PHASES.includes(value);
}
/** Prüft ob eine Phase terminal ist */
export function isTerminalPhase(phase) {
    return phase === 'DONE' || phase === 'FAILED' || phase === 'FAILED_BLOCKED' || phase === 'FAILED_UNSAFE' || phase === 'CLEANUP';
}
/** Prüft ob eine Phase ein Fehlerzustand ist */
export function isFailurePhase(phase) {
    return phase === 'FAILED_TRANSIENT' || phase === 'FAILED_BLOCKED' || phase === 'FAILED_UNSAFE' || phase === 'FAILED';
}
/**
 * Runtime-Validator: Wandelt String in Phase um.
 * Wirft Fehler bei ungültigen Werten — verhindert stille `as Phase`-Casts.
 * Verwenden bei DB-Reads, API-Responses und User-Input.
 */
export function parsePhase(value) {
    if (isValidPhase(value))
        return value;
    throw new Error(`Invalid phase: "${value}". Must be one of: ${ALL_PHASES.join(', ')}`);
}
/** Runtime-Validator für RunStatus */
const ALL_RUN_STATUSES = ['active', 'blocked', 'done', 'failed', 'cancelled'];
export function parseRunStatus(value) {
    if (ALL_RUN_STATUSES.includes(value))
        return value;
    throw new Error(`Invalid run status: "${value}". Must be one of: ${ALL_RUN_STATUSES.join(', ')}`);
}
/** Safe JSON.parse — gibt null statt Fehler bei ungültigem JSON */
export function safeJsonParse(s) {
    if (!s)
        return null;
    try {
        return JSON.parse(s);
    }
    catch {
        return null;
    }
}
//# sourceMappingURL=types.js.map