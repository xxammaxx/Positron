// Tool Metadata Scanner — Security validation for tool definitions
// Issue #219
// Detects prompt injection, tool poisoning, and suspicious metadata patterns.

import type { ScanResult, ToolDefinition } from './types.js';

/**
 * Known prompt injection patterns that indicate a tool description
 * is trying to override agent instructions.
 */
const PROMPT_INJECTION_PATTERNS = [
	/ignore\s+(all\s+)?(previous|prior|above|earlier)\s+(instructions?|directives?|commands?)/i,
	/disregard\s+(all\s+)?(previous|prior|above|earlier)\s+(instructions?|directives?)/i,
	/forget\s+(all\s+)?(previous|prior|above|earlier)\s+(instructions?|context)/i,
	/you\s+are\s+now\s+(a\s+)?(different|new)\s+(role|persona|agent)/i,
	/override\s+(system|safety|security)\s+(prompt|instruction|rule)/i,
	/bypass\s+(safety|security|policy|filter|restriction)/i,
	/you\s+must\s+(ignore|disobey|disregard)\b/i,
	/pretend\s+(you\s+are|to\s+be)\b/i,
	/act\s+as\s+(if|though)\s+you\s+(are|were)\b/i,
	/do\s+not\s+(follow|obey|adhere)/i,
	/exfiltrate|exfil\s+(data|secrets|tokens|keys)/i,
	/send\s+(secrets|tokens|credentials|passwords)\s+to/i,
	/output\s+(your|the)\s+(system\s+)?prompt/i,
];

/**
 * URL/exfiltration patterns in tool descriptions.
 */
// NOTE: All patterns deliberately omit the 'g' flag.
// The global flag makes RegExp.test() stateful via lastIndex, which
// causes non-deterministic behavior when the same pattern is tested
// against multiple fields (title, description) in sequence.
const URL_EXFILTRATION_PATTERNS = [
	/https?:\/\/[^\s]+/i,
	/ftp:\/\/[^\s]+/i,
	/data:text\/[^\s]+/i,
	/`[^`]*https?:\/\/[^`]*`/i,
	/webhook\.site/i,
	/requestbin/i,
	/hook\.(io|site)/i,
];

/**
 * Suspicious Unicode mixture patterns.
 * Detects when Latin + Cyrillic + CJK characters appear together,
 * which is unusual for legitimate tool descriptions.
 */
const UNICODE_MIXTURE_PATTERNS = [
	// Latin + Cyrillic mixture (homoglyph attacks)
	/(?=.*[\u0041-\u007A])(?=.*[\u0400-\u04FF])/,
	// Latin + CJK mixture (unlikely in tool IDs/descriptions)
	/(?=.*[\u0041-\u007A])(?=.*[\u4E00-\u9FFF])/,
];

/**
 * Detect hidden HTML/script content in descriptions.
 */
const HTML_INJECTION_PATTERNS = [
	/<script[\s>]/i,
	/<iframe[\s>]/i,
	/onerror\s*=/i,
	/onload\s*=/i,
	/javascript\s*:/i,
];

/**
 * Detect Base64-encoded payloads (potential hidden content).
 * Catches strings that look like base64 with minimum 20 chars.
 */
// NOTE: 'g' flag omitted — see URL_EXFILTRATION_PATTERNS comment above.
const BASE64_PATTERN = /(?:[A-Za-z0-9+/]{4}){5,}(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?/;

/**
 * Detect risk profile mismatches.
 * Tool claiming to be "safe" or "read-only" but having destructive risk level.
 */
function detectRiskMismatch(definition: ToolDefinition): string[] {
	const reasons: string[] = [];
	const desc = definition.description.toLowerCase();

	const safePhrases = [
		'safe',
		'harmless',
		'read-only',
		'no side effects',
		'no modifications',
		'does not modify',
		'does not write',
		'cannot write',
		'never writes',
		'purely informational',
	];

	for (const phrase of safePhrases) {
		if (desc.includes(phrase)) {
			if (definition.riskLevel === 'write' || definition.riskLevel === 'destructive') {
				reasons.push(
					`Risk mismatch: description claims "${phrase}" but risk level is "${definition.riskLevel}"`,
				);
				break;
			}
		}
	}

	return reasons;
}

/**
 * Scan a tool definition for security risks.
 * Returns a ScanResult indicating whether the tool should be blocked.
 */
export function scanToolDefinition(definition: ToolDefinition): ScanResult {
	const warnings: string[] = [];
	const reasons: string[] = [];
	let blocked = false;

	// 1. Check name field for injection
	const fieldsToScan = [
		{ name: 'title', value: definition.title },
		{ name: 'description', value: definition.description },
	];

	for (const field of fieldsToScan) {
		const value = field.value || '';

		// 1a. Prompt injection patterns
		for (const pattern of PROMPT_INJECTION_PATTERNS) {
			if (pattern.test(value)) {
				blocked = true;
				reasons.push(
					`Prompt injection detected in ${field.name}: matched pattern "${pattern.source}"`,
				);
			}
		}

		// 1b. HTML/script injection
		for (const pattern of HTML_INJECTION_PATTERNS) {
			if (pattern.test(value)) {
				blocked = true;
				reasons.push(
					`HTML/script injection detected in ${field.name}: matched pattern "${pattern.source}"`,
				);
			}
		}

		// 1c. URL exfiltration
		for (const pattern of URL_EXFILTRATION_PATTERNS) {
			if (pattern.test(value)) {
				warnings.push(`URL detected in ${field.name}: "${value.match(pattern)?.[0]}"`);
				// URLs alone are warnings, not blocks (legitimate docs may have URLs)
			}
		}

		// 1d. Unicode mixture
		for (const pattern of UNICODE_MIXTURE_PATTERNS) {
			if (pattern.test(value)) {
				blocked = true;
				reasons.push(`Suspicious Unicode mixture detected in ${field.name}`);
			}
		}

		// 1e. Base64 payloads
		const base64Matches = value.match(BASE64_PATTERN);
		if (base64Matches && base64Matches.length > 0) {
			// Check if base64 strings are suspiciously long (potential hidden payload)
			const longPayloads = base64Matches.filter((m) => m.length > 40);
			if (longPayloads.length > 0) {
				warnings.push(
					`Long Base64-encoded content detected in ${field.name} (${longPayloads.length} segments)`,
				);
			}
		}
	}

	// 2. Risk profile mismatch
	const mismatchReasons = detectRiskMismatch(definition);
	if (mismatchReasons.length > 0) {
		warnings.push(...mismatchReasons);
		// Risk mismatches are warnings, not blocks — operator should review
	}

	// 3. Validate that riskLevel and approvalMode are consistent
	if (
		(definition.riskLevel === 'write' || definition.riskLevel === 'destructive') &&
		definition.approvalMode === 'none'
	) {
		warnings.push(
			`Tool "${definition.id}" has risk level "${definition.riskLevel}" but approval mode "none" — consider requiring approval`,
		);
	}

	// 4. Recommend requiresAuditLog for write/destructive tools
	if (
		(definition.riskLevel === 'write' || definition.riskLevel === 'destructive') &&
		definition.requiresAuditLog !== true
	) {
		warnings.push(
			`Tool "${definition.id}" has risk level "${definition.riskLevel}" but does not require audit logging — consider setting requiresAuditLog: true`,
		);
	}

	return {
		passed: !blocked,
		warnings,
		blocked,
		reasons,
	};
}
