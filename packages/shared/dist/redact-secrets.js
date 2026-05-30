// Positron — Secrets Redaction Utility (Issue #66)
// Durchsucht Strings/Objekte nach Secret-Patterns und maskiert sie.
// Wird in storeEvent und broadcastSSE verwendet, bevor Daten die Runtime verlassen.
// ---------------------------------------------------------------------------
// Common secret patterns — detection patterns für bekannte Secret-Formate
// ---------------------------------------------------------------------------
const SECRET_PATTERNS = [
    // GitHub tokens
    /\bghp_[a-zA-Z0-9]{36,}\b/g,
    /\bgho_[a-zA-Z0-9]{36,}\b/g,
    /\bghu_[a-zA-Z0-9]{36,}\b/g,
    /\bghs_[a-zA-Z0-9]{36,}\b/g,
    /\bghr_[a-zA-Z0-9]{36,}\b/g,
    /\bgithub_pat_[a-zA-Z0-9]{22,}\b/g,
    // OpenAI / API keys
    /\bsk-[a-zA-Z0-9]{20,}\b/g,
    /\bsk-[a-zA-Z0-9]{48,}\b/g,
    // Generic token patterns
    /\btoken[=:]["']?[a-zA-Z0-9_\-]{16,}/gi,
    /\bapi[_-]?key[=:]["']?[a-zA-Z0-9_\-]{16,}/gi,
    /\bsecret[=:]["']?[a-zA-Z0-9_\-]{16,}/gi,
    // AWS
    /\bAKIA[0-9A-Z]{16}\b/g,
    // Passwords in key=value
    /\bpassword[=:]["']?[^\s"']{6,}/gi,
    /\bpwd[=:]["']?[^\s"']{6,}/gi,
    // Connection strings (SQL, MongoDB, Redis)
    /(?:mysql|postgres|mongodb|redis|amqp):\/\/[^\s]+/gi,
    // JWT tokens
    /eyJ[a-zA-Z0-9_\-]{10,}\.[a-zA-Z0-9_\-]{10,}\.[a-zA-Z0-9_\-]{10,}/g,
    // npm token
    /\bnpm_[a-zA-Z0-9]{36,}\b/g,
    // SSH private key markers
    /-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/g,
];
// ---------------------------------------------------------------------------
// Redaction
// ---------------------------------------------------------------------------
/**
 * Maskiert Secrets in einem String.
 * Ersetzt gefundene Secret-Werte durch `***`.
 */
export function redactString(value) {
    let result = value;
    for (const pattern of SECRET_PATTERNS) {
        result = result.replace(pattern, (_match) => {
            // Erhalte teilweise den Prefix für Debug-Zwecke (max 8 chars)
            const prefix = _match.slice(0, 8);
            return `${prefix}***_REDACTED`;
        });
    }
    return result;
}
/**
 * Durchsucht einen beliebigen Wert rekursiv nach Secrets und maskiert sie.
 * - Strings: via redactString
 * - Objekte: rekursiv für alle Werte
 * - Arrays: rekursiv für alle Elemente
 * - Primitive: unverändert
 */
export function redactSecrets(value) {
    if (typeof value === 'string') {
        return redactString(value);
    }
    if (Array.isArray(value)) {
        return value.map(redactSecrets);
    }
    if (value !== null && typeof value === 'object') {
        const result = {};
        for (const [key, val] of Object.entries(value)) {
            // Keys, die selbst Secret-Namen enthalten, werden immer maskiert
            if (typeof val === 'string' && isSensitiveKey(key)) {
                result[key] = '***_REDACTED';
            }
            else {
                result[key] = redactSecrets(val);
            }
        }
        return result;
    }
    return value;
}
/**
 * Prüft ob ein Objekt-Key auf sensitive Daten hinweist.
 */
function isSensitiveKey(key) {
    const sensitiveKeys = [
        'token', 'secret', 'password', 'pwd', 'apikey', 'api_key',
        'authorization', 'auth', 'credentials', 'privatekey', 'private_key',
        'accesskey', 'access_key', 'secretkey', 'secret_key',
        'session', 'sessionid', 'session_id',
        'ssn', 'creditcard', 'credit_card',
    ];
    const lower = key.toLowerCase().replace(/[_-]/g, '');
    return sensitiveKeys.some(sk => lower.includes(sk));
}
//# sourceMappingURL=redact-secrets.js.map