// Positron — Utility-Funktionen
import crypto from 'node:crypto';
/** Standard-Regeln für Secret-Redaction */
export const DEFAULT_REDACTION_RULES = [
    { name: 'github-token', pattern: /ghp_[a-zA-Z0-9]{36}/g, replacement: 'ghp_***REDACTED***' },
    { name: 'github-token-v2', pattern: /github_pat_[a-zA-Z0-9_]{82}/g, replacement: 'github_pat_***REDACTED***' },
    { name: 'openai-key', pattern: /sk-[a-zA-Z0-9]{48,}/g, replacement: 'sk-***REDACTED***' },
    { name: 'anthropic-key', pattern: /anthropic_[a-zA-Z0-9]{40,}/g, replacement: 'anthropic_***REDACTED***' },
    { name: 'gemini-key', pattern: /AIza[a-zA-Z0-9_-]{35}/g, replacement: 'AIza***REDACTED***' },
];
/**
 * Ersetzt Secrets in einem String durch maskierte Versionen.
 * Verwendet Standard-Regeln oder benutzerdefinierte Regeln.
 */
export function redactSecrets(input, rules) {
    const activeRules = rules ?? DEFAULT_REDACTION_RULES;
    let result = input;
    for (const rule of activeRules) {
        result = result.replace(rule.pattern, rule.replacement);
    }
    return result;
}
/**
 * Maskiert einen unbekannten Wert für Logging.
 * Gibt einen String zurück, der sicher geloggt werden kann.
 */
export function redactValue(input) {
    if (input === null || input === undefined)
        return String(input);
    if (typeof input === 'string')
        return redactSecrets(input);
    if (typeof input === 'number' || typeof input === 'boolean')
        return String(input);
    try {
        return redactSecrets(JSON.stringify(input));
    }
    catch {
        return '[Unserializable]';
    }
}
/**
 * Generiert eine eindeutige Run-ID.
 * @param generateId Optionale ID-Generator-Funktion (default: crypto.randomUUID)
 */
export function createRunId(generateId) {
    return (generateId ?? crypto.randomUUID)();
}
/**
 * Erzeugt einen Branch-Namen im Positron-Format.
 * positron/issue-<number>-<slug>
 */
export function generateBranchName(issueNumber, title) {
    const slug = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 50);
    return `positron/issue-${issueNumber}-${slug}`;
}
/**
 * Formatiert Millisekunden als menschenlesbare Dauer.
 * 3661000 → "1h 1m 1s"
 */
export function formatDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    const parts = [];
    if (hours > 0)
        parts.push(`${hours}h`);
    if (minutes > 0)
        parts.push(`${minutes}m`);
    parts.push(`${secs}s`);
    return parts.join(' ');
}
/**
 * Kürzt einen String auf maximale Länge.
 */
export function truncate(s, max) {
    if (s.length <= max)
        return s;
    return s.slice(0, max - 3) + '...';
}
/**
 * Wartet für eine bestimmte Anzahl von Millisekunden.
 */
export async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
//# sourceMappingURL=utils.js.map