import type { Phase, PositronLabel } from './types.js';
/** Alle vordefinierten Positron-Label */
export declare const POSITRON_LABELS: readonly PositronLabel[];
/** Prefix für alle Positron-Label */
export declare const POSITRON_LABEL_PREFIX: "positron:";
/** Maximale Anzahl von Fix-Loop-Versuchen */
export declare const MAX_FIX_LOOPS = 3;
/** Maximale Diff-Größe in Zeilen */
export declare const MAX_DIFF_SIZE = 400;
/** Standard-Polling-Intervall in ms */
export declare const POLLING_INTERVAL_MS = 60000;
/** Maximales Polling-Intervall in ms */
export declare const MAX_POLLING_INTERVAL_MS = 180000;
/** Timeout für CLI-Kommandos in ms */
export declare const CLI_TIMEOUT_MS = 120000;
/** Maximale Retry-Versuche für CLI-Kommandos */
export declare const CLI_MAX_RETRIES = 2;
/** Aktuelle Positron-Version */
export declare const POSITRON_VERSION = "0.1.0";
/** Prefix für Positron-Branches */
export declare const BRANCH_PREFIX: "positron/issue";
/** Maximale Länge des Branch-Slugs */
export declare const MAX_BRANCH_SLUG_LENGTH = 50;
/** Reihenfolge der Phasen (für Fortschrittsberechnung) */
export declare const PHASE_ORDER: readonly Phase[];
/** Terminale Phasen (abgeschlossen, keine weiteren Übergänge) */
export declare const TERMINAL_PHASES: readonly Phase[];
/** Blockierte/wartende Phasen */
export declare const BLOCKED_PHASES: readonly Phase[];
/** Autonomie-Level-Konstanten */
export declare const AUTONOMY_LEVELS: {
    readonly FULL: 0;
    readonly SEMI: 1;
    readonly MANUAL: 2;
};
//# sourceMappingURL=constants.d.ts.map