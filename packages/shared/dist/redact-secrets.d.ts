/**
 * Maskiert Secrets in einem String.
 * Ersetzt gefundene Secret-Werte durch `***`.
 */
export declare function redactString(value: string): string;
/**
 * Durchsucht einen beliebigen Wert rekursiv nach Secrets und maskiert sie.
 * - Strings: via redactString
 * - Objekte: rekursiv für alle Werte
 * - Arrays: rekursiv für alle Elemente
 * - Primitive: unverändert
 */
export declare function redactSecrets<T>(value: T): T;
//# sourceMappingURL=redact-secrets.d.ts.map