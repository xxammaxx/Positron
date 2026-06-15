// Positron — Stop/Ask Protocol Policy
//
// First runtime safety layer (Priority 1 from Agentic Safety Roadmap).
// Evaluates actions and returns structured safety decisions.
//
// Source of Truth: docs/security/stop-ask-protocol.md
// Verification Contract: docs/testing/verification-contract-stop-ask.md

/** Decision outcomes from the Stop/Ask protocol */
export type StopAskDecision =
	| 'ALLOW'
	| 'DENY'
	| 'ASK_HUMAN'
	| 'REQUIRE_DRY_RUN'
	| 'REQUIRE_BACKUP'
	| 'REQUIRE_REVIEW';

/** Risk level classification */
export type StopAskRiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

/** Action category from the protocol */
export type StopAskActionCategory = 'A' | 'B' | 'C';

/** Repository risk context */
export type RepoRisk = 'TEST' | 'LOW' | 'PRODUCTION' | 'CRITICAL';

/** Request to evaluate an action against the Stop/Ask protocol */
export interface StopAskRequest {
	/** Human-readable description of the action */
	action: string;
	/** What is affected (file, database, branch, etc.) */
	target?: string;
	/** Exact command string if applicable */
	command?: string;
	/** Whether the action is destructive (data loss, irreversible) */
	destructive?: boolean;
	/** Whether the action involves secret/credential access */
	touchesSecrets?: boolean;
	/** Whether the action mutates an external API */
	externalMutation?: boolean;
	/** Whether the action operates outside the workspace root */
	outsideWorkspace?: boolean;
	/** Repository risk context */
	repoRisk?: RepoRisk;
}

/** Structured result from the Stop/Ask evaluation */
export interface StopAskResult {
	/** The safety decision */
	decision: StopAskDecision;
	/** Risk level of the action */
	risk: StopAskRiskLevel;
	/** Human-readable reason for the decision */
	reason: string;
	/** Protocol category (A/B/C) */
	category: StopAskActionCategory;
	/** Evidence required before the action can proceed */
	requiredEvidence: string[];
	/** Whether human approval is required (regardless of decision) */
	humanApprovalRequired: boolean;
}

// ─── Category A Patterns (Always Stop — Default DENY) ───────────────────────

/** Actions that always require human approval */
const CATEGORY_A_PATTERNS: Array<{
	pattern: RegExp;
	risk: StopAskRiskLevel;
	reason: string;
	decision: StopAskDecision;
	requiredEvidence: string[];
}> = [
	{
		pattern: /\brm\s+-rf\b/i,
		risk: 'CRITICAL',
		reason: 'Recursive delete (rm -rf) can cause irreversible data loss',
		decision: 'DENY',
		requiredEvidence: ['Backup verification', 'Rollback plan', 'Human approval'],
	},
	{
		pattern: /\bgit\s+push\s+.*(--force\b(?!-with-lease)|(?<![a-z])-f\b)/i,
		risk: 'CRITICAL',
		reason: 'Force push rewrites remote history and can destroy branches',
		decision: 'DENY',
		requiredEvidence: ['Branch backup', 'Force push justification', 'Human approval'],
	},
	{
		pattern: /\bpush\b.*\b(main|master)\b/i,
		risk: 'CRITICAL',
		reason: 'Direct push to protected branch (main/master) is blocked',
		decision: 'DENY',
		requiredEvidence: ['PR review approval', 'CI pass evidence', 'Human approval'],
	},
	{
		pattern: /\bDROP\s+(TABLE|DATABASE)\b/i,
		risk: 'CRITICAL',
		reason: 'DROP TABLE/DATABASE causes irreversible data loss',
		decision: 'DENY',
		requiredEvidence: ['Database backup', 'Rollback script', 'Human approval'],
	},
	{
		pattern: /\bTRUNCATE\b/i,
		risk: 'CRITICAL',
		reason: 'TRUNCATE removes all data irreversibly',
		decision: 'DENY',
		requiredEvidence: ['Database backup', 'Rollback script', 'Human approval'],
	},
	{
		pattern: /\bdatabase\s+migration\b.*\bdrop\s+col/i,
		risk: 'CRITICAL',
		reason: 'Database migration that drops columns causes irreversible data loss',
		decision: 'DENY',
		requiredEvidence: ['Database backup', 'Rollback script', 'Human approval'],
	},
	{
		pattern: /\bDELETE\s+FROM\b(?!.*\bWHERE\b)/i,
		risk: 'CRITICAL',
		reason: 'DELETE FROM without WHERE clause removes all rows',
		decision: 'DENY',
		requiredEvidence: ['Database backup', 'WHERE clause confirmation', 'Human approval'],
	},
	{
		pattern: /\bdelete\s+(remote\s+)?branch\b/i,
		risk: 'HIGH',
		reason: 'Remote branch deletion disrupts collaboration',
		decision: 'DENY',
		requiredEvidence: ['Branch backup', 'Team confirmation', 'Human approval'],
	},
	{
		pattern: /\bproduction\s+api\s+mutation\b/i,
		risk: 'CRITICAL',
		reason: 'Production API mutation has external impact',
		decision: 'DENY',
		requiredEvidence: ['Staging verification', 'Rollback plan', 'Human approval'],
	},
	{
		pattern: /\bexternal\s+deployment\b/i,
		risk: 'CRITICAL',
		reason: 'External deployment is an uncontrolled release',
		decision: 'DENY',
		requiredEvidence: ['Deployment plan', 'Rollback procedure', 'Human approval'],
	},
	{
		pattern: /\b(secret|credential)\s+access\b/i,
		risk: 'CRITICAL',
		reason: 'Secret/credential access exposes sensitive data',
		decision: 'DENY',
		requiredEvidence: ['Access justification', 'Least-privilege check', 'Human approval'],
	},
	{
		pattern: /\bglobal\s+AGENTS\.md\s+modification\b/i,
		risk: 'HIGH',
		reason: 'Global AGENTS.md modification bypasses safety policies',
		decision: 'DENY',
		requiredEvidence: ['Change diff review', 'Safety impact assessment', 'Human approval'],
	},
	{
		pattern: /\bglobal\s+MCP\s+config\s+modification\b/i,
		risk: 'HIGH',
		reason: 'Global MCP config modification bypasses tool policies',
		decision: 'DENY',
		requiredEvidence: ['Config diff review', 'Capability manifest update', 'Human approval'],
	},
	{
		pattern: /\bgit\s+merge\b.*\b(main|master)\b/i,
		risk: 'HIGH',
		reason: 'Merge to protected branch requires review and CI pass',
		decision: 'DENY',
		requiredEvidence: ['PR approval', 'CI pass', 'Conflict resolution', 'Human approval'],
	},
];

// ─── Category B Patterns (Stop Unless Evidence) ─────────────────────────────

const CATEGORY_B_PATTERNS: Array<{
	pattern: RegExp;
	risk: StopAskRiskLevel;
	reason: string;
	decision: StopAskDecision;
	requiredEvidence: string[];
}> = [
	{
		pattern: /\bnpm\s+install\b/i,
		risk: 'MEDIUM',
		reason: 'New dependency installation requires audit',
		decision: 'REQUIRE_REVIEW',
		requiredEvidence: ['Dependency audit', 'License check', 'Bundle size impact'],
	},
	{
		pattern: /\bmajor\s+(version\s+)?upgrade\b/i,
		risk: 'HIGH',
		reason: 'Major version upgrade may contain breaking changes',
		decision: 'ASK_HUMAN',
		requiredEvidence: ['Breaking change analysis', 'Migration plan', 'Changelog review'],
	},
	{
		pattern: /\bmerge\b(?!.*\b(main|master)\b)/i,
		risk: 'MEDIUM',
		reason: 'Feature branch merge requires evidence',
		decision: 'REQUIRE_REVIEW',
		requiredEvidence: ['Test results', 'Conflict resolution plan'],
	},
	{
		pattern: /\bdatabase\s+schema\s+change\b/i,
		risk: 'HIGH',
		reason: 'Database schema change requires migration validation',
		decision: 'REQUIRE_DRY_RUN',
		requiredEvidence: ['Migration script', 'Rollback script', 'Dry-run result'],
	},
	{
		pattern: /\bdatabase\s+migration\b/i,
		risk: 'HIGH',
		reason: 'Database migration requires rollback testing',
		decision: 'REQUIRE_DRY_RUN',
		requiredEvidence: ['Migration script', 'Rollback script', 'Dry-run result'],
	},
	{
		pattern: /\bexternal\s+api\s+call\b/i,
		risk: 'MEDIUM',
		reason: 'External API call requires domain allowlist check',
		decision: 'ASK_HUMAN',
		requiredEvidence: ['Domain allowlist check', 'Rate limit estimation'],
	},
	{
		pattern: /\bconfig\b.*\bmodification\b/i,
		risk: 'MEDIUM',
		reason: 'Configuration modification requires review',
		decision: 'REQUIRE_REVIEW',
		requiredEvidence: ['Diff preview', 'Rollback plan'],
	},
	{
		pattern: /\bwrite\b.*\boutside\b.*\bworkspace\b/i,
		risk: 'HIGH',
		reason: 'Filesystem write outside workspace requires validation',
		decision: 'ASK_HUMAN',
		requiredEvidence: ['Path validation', 'Purpose justification'],
	},
];

// ─── Destructive Action Keywords ─────────────────────────────────────────────

/** Keywords that indicate a destructive action */
const DESTRUCTIVE_KEYWORDS = [
	'delete',
	'remove',
	'drop',
	'truncate',
	'purge',
	'destroy',
	'wipe',
	'erase',
	'rm ',
	'rmdir',
	'unlink',
	'clean',
	'reset --hard',
	'checkout -- .',
];

// ─── Evaluation Logic ────────────────────────────────────────────────────────

/**
 * Classifies an action into Category A, B, or C and returns the safety decision.
 *
 * Category A: Always Stop — actions that must never proceed without explicit human approval.
 * Category B: Stop Unless Evidence — actions that may proceed with sufficient evidence.
 * Category C: Allowed with Audit — low-risk actions permitted with logging.
 */
export function evaluateStopAsk(request: StopAskRequest): StopAskResult {
	const action = request.action || '';
	const normalized = action.trim().toLowerCase();

	// ── Check Category A first (highest priority) ──────────────────────────
	for (const entry of CATEGORY_A_PATTERNS) {
		if (entry.pattern.test(request.action)) {
			return {
				decision: entry.decision,
				risk: entry.risk,
				reason: entry.reason,
				category: 'A',
				requiredEvidence: [...entry.requiredEvidence],
				humanApprovalRequired: true,
			};
		}
	}

	// ── Explicit flags that elevate to Category A ──────────────────────────
	if (request.touchesSecrets) {
		return {
			decision: 'DENY',
			risk: 'CRITICAL',
			reason: 'Secret/credential access exposes sensitive data',
			category: 'A',
			requiredEvidence: ['Access justification', 'Least-privilege check', 'Human approval'],
			humanApprovalRequired: true,
		};
	}

	if (request.outsideWorkspace) {
		return {
			decision: 'DENY',
			risk: 'HIGH',
			reason: 'Action outside workspace root is blocked by policy',
			category: 'A',
			requiredEvidence: ['Path validation', 'Purpose justification', 'Human approval'],
			humanApprovalRequired: true,
		};
	}

	if (request.externalMutation) {
		return {
			decision: 'ASK_HUMAN',
			risk: 'HIGH',
			reason: 'External API mutation requires human approval',
			category: 'A',
			requiredEvidence: ['Staging verification', 'Rollback plan', 'Human approval'],
			humanApprovalRequired: true,
		};
	}

	// ── Unknown destructive action → not automatically allowed ─────────────
	if (request.destructive) {
		return {
			decision: 'ASK_HUMAN',
			risk: 'HIGH',
			reason: 'Unclassified destructive action requires human review',
			category: 'A',
			requiredEvidence: ['Action description', 'Impact assessment', 'Human approval'],
			humanApprovalRequired: true,
		};
	}

	// Check for destructive keywords in the action string
	for (const keyword of DESTRUCTIVE_KEYWORDS) {
		if (normalized.includes(keyword.toLowerCase())) {
			return {
				decision: 'ASK_HUMAN',
				risk: 'HIGH',
				reason: `Action contains destructive keyword "${keyword}" — requires human review`,
				category: 'A',
				requiredEvidence: ['Action description', 'Impact assessment', 'Human approval'],
				humanApprovalRequired: true,
			};
		}
	}

	// ── Check Category B patterns ──────────────────────────────────────────
	for (const entry of CATEGORY_B_PATTERNS) {
		if (entry.pattern.test(request.action)) {
			return {
				decision: entry.decision,
				risk: entry.risk,
				reason: entry.reason,
				category: 'B',
				requiredEvidence: [...entry.requiredEvidence],
				humanApprovalRequired:
					entry.decision === 'ASK_HUMAN' || entry.decision === 'REQUIRE_REVIEW',
			};
		}
	}

	// ── Check Category B flags ─────────────────────────────────────────────
	// Production repo actions require evidence even if not explicitly matched
	if (request.repoRisk === 'PRODUCTION' || request.repoRisk === 'CRITICAL') {
		return {
			decision: 'REQUIRE_REVIEW',
			risk: 'HIGH',
			reason: `${request.repoRisk} repository actions require review`,
			category: 'B',
			requiredEvidence: ['Test results', 'Review approval'],
			humanApprovalRequired: true,
		};
	}

	// ── Default: Category C — Allowed with Audit ───────────────────────────
	return {
		decision: 'ALLOW',
		risk: 'LOW',
		reason: 'Low-risk action — allowed with audit logging',
		category: 'C',
		requiredEvidence: ['Audit log entry'],
		humanApprovalRequired: false,
	};
}

/**
 * Returns all defined decision outcomes for validation/testing.
 */
export function getAllDecisionOutcomes(): StopAskDecision[] {
	return ['ALLOW', 'DENY', 'ASK_HUMAN', 'REQUIRE_DRY_RUN', 'REQUIRE_BACKUP', 'REQUIRE_REVIEW'];
}

/**
 * Returns whether a decision requires human approval.
 */
export function requiresHumanApproval(decision: StopAskDecision): boolean {
	return decision !== 'ALLOW';
}
