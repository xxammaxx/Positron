/** Regel für Secret-Redaction */
export interface RedactionRule {
    name: string;
    pattern: RegExp;
    replacement: string;
}
/** Typ für ID-Generator-Funktionen */
export type IdGenerator = () => string;
/** Standard-Regeln für Secret-Redaction */
export declare const DEFAULT_REDACTION_RULES: readonly RedactionRule[];
/**
 * Ersetzt Secrets in einem String durch maskierte Versionen.
 * Verwendet Standard-Regeln oder benutzerdefinierte Regeln.
 */
export declare function redactSecrets(input: string, rules?: readonly RedactionRule[]): string;
/**
 * Maskiert einen unbekannten Wert für Logging.
 * Gibt einen String zurück, der sicher geloggt werden kann.
 */
export declare function redactValue(input: unknown): string;
/**
 * Generiert eine eindeutige Run-ID.
 * @param generateId Optionale ID-Generator-Funktion (default: crypto.randomUUID)
 */
export declare function createRunId(generateId?: IdGenerator): string;
/**
 * Erzeugt einen Branch-Namen im Positron-Format.
 * positron/issue-<number>-<slug>
 */
export declare function generateBranchName(issueNumber: number, title: string): string;
/**
 * Formatiert Millisekunden als menschenlesbare Dauer.
 * 3661000 → "1h 1m 1s"
 */
export declare function formatDuration(ms: number): string;
/**
 * Kürzt einen String auf maximale Länge.
 */
export declare function truncate(s: string, max: number): string;
/**
 * Wartet für eine bestimmte Anzahl von Millisekunden.
 */
export declare function sleep(ms: number): Promise<void>;
//# sourceMappingURL=utils.d.ts.map