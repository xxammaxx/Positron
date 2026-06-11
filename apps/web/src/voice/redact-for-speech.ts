// Redaction Pipeline — entfernt Secrets, Tokens, PII vor Sprachausgabe.
// Keine Daten verlassen den Browser. Alle Ersetzungen sind lossy und irreversibel.

const MAX_SPEECH_LENGTH = 200;

// Reihenfolge wichtig: spezifische Patterns zuerst (überschreiben generische)
const REDACTION_RULES: Array<{
	pattern: RegExp;
	replacement: string | ((substring: string, ...args: string[]) => string);
}> = [
	// === Specific Token Patterns (must run before generic key=value rules) ===

	// GitHub Personal Access Token (ghp_*, github_pat_*)
	{ pattern: /ghp_[a-zA-Z0-9]{32,}/g, replacement: '[TOKEN]' },
	{ pattern: /github_pat_[a-zA-Z0-9_]{30,}/g, replacement: '[TOKEN]' },

	// OpenAI / Anthropic / Generic API Keys (sk-*, ant-*, key-*)
	{ pattern: /\b(sk-[a-zA-Z0-9]{20,})\b/g, replacement: '[API_KEY]' },
	{ pattern: /\b(ant-[a-zA-Z0-9]{20,})\b/g, replacement: '[API_KEY]' },

	// AWS Access Keys (AKIA*, ASIA*)
	{ pattern: /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/g, replacement: '[TOKEN]' },

	// Slack Tokens (xoxb-*, xoxp-*, xoxa-*)
	{ pattern: /\bxox[abposr]-[a-zA-Z0-9-]{20,}\b/g, replacement: '[TOKEN]' },

	// npm Tokens (npm_*)
	{ pattern: /\bnpm_[a-zA-Z0-9]{36,}\b/g, replacement: '[TOKEN]' },

	// JWT Tokens (eyJ... Struktur)
	{
		pattern: /\beyJ[a-zA-Z0-9_-]{20,}\.[a-zA-Z0-9_-]{20,}\.[a-zA-Z0-9_-]{20,}\b/g,
		replacement: '[TOKEN]',
	},

	// Bearer Tokens (Authorization headers)
	{ pattern: /\b[Bb]earer\s+[a-zA-Z0-9._\-+/=]{20,}/g, replacement: 'Bearer [TOKEN]' },

	// PEM Certificate/Key Blocks
	{
		pattern: /-----BEGIN [A-Z ]+-----[a-zA-Z0-9+/=\n\r]+-----END [A-Z ]+-----/g,
		replacement: '[CERTIFICATE]',
	},

	// Generic service tokens with recognizable prefixes
	{
		pattern: /\b(?:s3cr3t|secret|token|auth|credential)[_-]?[a-zA-Z0-9]{16,}\b/gi,
		replacement: '[SECRET]',
	},

	// .env / Umgebungsvariablen mit sensitiven Werten
	{
		pattern: /[A-Z_]{3,30}=(?:ghp_|sk-|eyJ|AKIA|ASIA|xox|npm_|SG\.)[a-zA-Z0-9_-]{10,}/g,
		replacement: '[TOKEN]',
	},

	// === Path-Based Patterns ===

	// Private SSH/PGP Keys und Pfade
	{ pattern: /\/home\/[a-zA-Z0-9_-]+\/\.ssh\/[a-zA-Z0-9_./-]+/g, replacement: '[PATH]' },
	{ pattern: /\/Users\/[a-zA-Z0-9_-]+\/\.ssh\/[a-zA-Z0-9_./-]+/g, replacement: '[PATH]' },
	{ pattern: /\/root\/\.ssh\/[a-zA-Z0-9_./-]+/g, replacement: '[PATH]' },
	{
		pattern: /\/etc\/[a-zA-Z0-9_./-]*(?:shadow|passwd|ssl|certs)[a-zA-Z0-9_./-]*/g,
		replacement: '[PATH]',
	},

	// Private Dateipfade (configs, keys, tokens)
	{
		pattern:
			/(?:~|\/home\/\w+|\/Users\/\w+)\/\.(?:config|ssh|gnupg|aws|azure|docker|kube)[a-zA-Z0-9_./-]*/g,
		replacement: '[PATH]',
	},

	// === Content-Based Patterns (generic, must run AFTER specific patterns) ===

	// E-Mail-Adressen
	{ pattern: /\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/g, replacement: '[EMAIL]' },

	// Passwörter und Secrets in Key-Value-Paaren
	{
		pattern:
			/\b(?:password|passwd|secret|token|key|api[_-]?key)\s*[:=]\s*['"]?([^\s'"]{4,})['"]?/gi,
		replacement: (_: string, secret: string) => {
			// Prüfe, ob der gefundene Wert bereits durch eine vorherige Regel ersetzt wurde
			if (/\[(?:TOKEN|API_KEY|SECRET|EMAIL|PATH|CERTIFICATE)\]/.test(secret)) return _;
			return _.replace(secret, '[SECRET]');
		},
	},

	// Docker/Container Credentials (auth tokens, registry passwords)
	{
		pattern: /\b(?:docker|registry)[-_]?(?:password|token)\s*[:=]\s*\S+/gi,
		replacement: '[SECRET]',
	},

	// Base64-encoded Secrets (lange Base64-Strings)
	{ pattern: /\b[A-Za-z0-9+/]{40,}={0,2}\b/g, replacement: '[SECRET]' },
];

/**
 * Redact sensitive content from text before speech output.
 * Returns cleaned text safe for TTS.
 */
export function redactForSpeech(text: string): string {
	let result = text;
	for (const rule of REDACTION_RULES) {
		result = result.replace(rule.pattern, rule.replacement as string);
	}
	return result;
}

/**
 * Truncate text to maxLen characters, appending "…" if truncated.
 * Default maxLen = 200.
 */
export function truncateForSpeech(text: string, maxLen = MAX_SPEECH_LENGTH): string {
	if (text.length <= maxLen) return text;
	return `${text.slice(0, maxLen - 1)}…`;
}

/**
 * Full pipeline: redact + truncate.
 */
export function cleanForSpeech(text: string, maxLen?: number): string {
	return truncateForSpeech(redactForSpeech(text), maxLen);
}
