// Positron — Konstanten
/** Alle vordefinierten Positron-Label */
export const POSITRON_LABELS = [
    'positron:ready',
    'positron:running',
    'positron:research',
    'positron:repo-sync',
    'positron:planning',
    'positron:implementing',
    'positron:testing',
    'positron:blocked',
    'positron:failed',
    'positron:pr-created',
    'positron:merged',
    'positron:done',
];
/** Prefix für alle Positron-Label */
export const POSITRON_LABEL_PREFIX = 'positron:';
/** Maximale Anzahl von Fix-Loop-Versuchen */
export const MAX_FIX_LOOPS = 3;
/** Maximale Diff-Größe in Zeilen */
export const MAX_DIFF_SIZE = 400;
/** Standard-Polling-Intervall in ms */
export const POLLING_INTERVAL_MS = 60_000;
/** Maximales Polling-Intervall in ms */
export const MAX_POLLING_INTERVAL_MS = 180_000;
/** Timeout für CLI-Kommandos in ms */
export const CLI_TIMEOUT_MS = 120_000;
/** Maximale Retry-Versuche für CLI-Kommandos */
export const CLI_MAX_RETRIES = 2;
/** Aktuelle Positron-Version */
export const POSITRON_VERSION = '0.1.0';
/** Prefix für Positron-Branches */
export const BRANCH_PREFIX = 'positron/issue';
/** Maximale Länge des Branch-Slugs */
export const MAX_BRANCH_SLUG_LENGTH = 50;
/** Reihenfolge der Phasen (für Fortschrittsberechnung) */
export const PHASE_ORDER = [
    'QUEUED', 'CLAIMED', 'REPO_SYNC', 'ISSUE_CONTEXT',
    'WEB_RESEARCH', 'SPECIFY', 'CLARIFY_OPTIONAL', 'PLAN', 'TASKS',
    'ANALYZE', 'REVIEW', 'IMPLEMENT', 'TEST', 'VERIFY',
    'COMMIT', 'PR_CREATE', 'MERGE', 'DONE',
    'FAILED', 'FAILED_TRANSIENT', 'FAILED_BLOCKED', 'FAILED_UNSAFE',
    'BLOCKED_PUSH', 'BLOCKED_MERGE',
    'GATE_APPROVE', 'GATE_REVISE', 'RESUME_PENDING',
    'CLEANUP',
];
/** Terminale Phasen (abgeschlossen, keine weiteren Übergänge) */
export const TERMINAL_PHASES = [
    'DONE', 'FAILED', 'FAILED_BLOCKED', 'FAILED_UNSAFE', 'CLEANUP',
];
/** Blockierte/wartende Phasen */
export const BLOCKED_PHASES = [
    'BLOCKED_PUSH', 'BLOCKED_MERGE', 'GATE_APPROVE',
    'GATE_REVISE', 'RESUME_PENDING',
];
/** Autonomie-Level-Konstanten */
export const AUTONOMY_LEVELS = {
    FULL: 0,
    SEMI: 1,
    MANUAL: 2,
};
// ── Tool Gateway Metadata Labels (Issue #229) ──────────────────────────
/** Display labels for tool categories */
export const TOOL_CATEGORY_LABELS = {
    provider: 'Provider',
    filesystem: 'Filesystem',
    git: 'Git',
    github: 'GitHub',
    browser: 'Browser',
    shell: 'Shell',
    spec: 'Spec Kit',
    storage: 'Storage',
    security: 'Security',
    testing: 'Testing',
    oversight: 'Oversight',
    blueprint: 'Blueprint',
    unknown: 'Unknown',
};
/** Display labels for warm-up status */
export const WARMUP_STATUS_LABELS = {
    not_required: 'Not Required',
    unknown: 'Unknown',
    pending: 'Pending',
    pass: 'Pass',
    partial: 'Partial',
    fail: 'Fail',
    blocked: 'Blocked',
};
/** Display labels for provider status */
export const PROVIDER_STATUS_LABELS = {
    not_provider: 'N/A',
    missing: 'Missing',
    installed: 'Installed',
    configured: 'Configured',
    warmup_required: 'Warm-up Required',
    ready_for_demo: 'Ready (Demo)',
    ready_for_real: 'Ready (Real)',
    blocked: 'Blocked',
};
//# sourceMappingURL=constants.js.map