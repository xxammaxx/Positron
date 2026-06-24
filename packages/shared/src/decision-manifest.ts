// Positron — Decision Manifest Validator MVP
// Parses and validates decision manifest CSVs.
// Ensures agents do not execute risky GitHub actions when
// risk classes and agent recommendations prohibit it.

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Known risk classes for decision manifests. */
export type RiskClass =
	| 'GREEN_SAFE'
	| 'YELLOW_REVIEW'
	| 'RED_HOLD'
	| 'UNKNOWN'
	| 'TOOL_GAP'
	| 'DEFER_TO_279';

/** Known agent recommendations. */
export type AgentRecommendation =
	| 'APPLY_GREEN_SAFE'
	| 'DO_NOT_APPLY'
	| 'REVIEW_REQUIRED'
	| 'HOLD'
	| 'DEFER';

/** A single row from a parsed decision manifest. */
export interface DecisionManifestRow {
	action_id: string;
	risk_class: RiskClass;
	agent_recommendation: AgentRecommendation;
}

/** Result of validating a decision manifest. */
export interface DecisionManifestValidationResult {
	/** Whether the manifest is valid (no blocking errors). */
	valid: boolean;
	/** Blocking validation errors. */
	errors: string[];
	/** Non-blocking warnings. */
	warnings: string[];
	/** Total number of rows parsed. */
	total: number;
	/** Counts per risk class. */
	counts: Record<RiskClass, number>;
	/** Actions that are safe to apply (GREEN_SAFE + APPLY_GREEN_SAFE only). */
	applyableActions: DecisionManifestRow[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const KNOWN_RISK_CLASSES: ReadonlySet<string> = new Set([
	'GREEN_SAFE',
	'YELLOW_REVIEW',
	'RED_HOLD',
	'UNKNOWN',
	'TOOL_GAP',
	'DEFER_TO_279',
]);

const KNOWN_AGENT_RECOMMENDATIONS: ReadonlySet<string> = new Set([
	'APPLY_GREEN_SAFE',
	'DO_NOT_APPLY',
	'REVIEW_REQUIRED',
	'HOLD',
	'DEFER',
]);

/** Columns that MUST be present in any decision manifest CSV header. */
const REQUIRED_COLUMNS: ReadonlyArray<string> = [
	'action_id',
	'risk_class',
	'agent_recommendation',
];

/** Risk classes that can NEVER be applyable, regardless of recommendation. */
const NON_APPLYABLE_RISK_CLASSES: ReadonlySet<string> = new Set([
	'YELLOW_REVIEW',
	'RED_HOLD',
	'UNKNOWN',
	'TOOL_GAP',
	'DEFER_TO_279',
]);

/** Index keys for fast header lookup. */
const HEADER_ROW = 0;
const DATA_START = 1;

// ---------------------------------------------------------------------------
// CSV Parsing
// ---------------------------------------------------------------------------

/**
 * Simple CSV parser for decision manifests.
 * Supports quoted fields, commas within quotes, and trims whitespace.
 * Does NOT handle embedded newlines within fields.
 */
function parseCsvLine(line: string): string[] {
	const fields: string[] = [];
	let current = '';
	let inQuotes = false;

	for (let i = 0; i < line.length; i++) {
		const ch = line[i];
		if (inQuotes) {
			if (ch === '"' && i + 1 < line.length && line[i + 1] === '"') {
				current += '"';
				i++; // skip escaped quote
			} else if (ch === '"') {
				inQuotes = false;
			} else {
				current += ch;
			}
		} else {
			if (ch === '"') {
				inQuotes = true;
			} else if (ch === ',') {
				fields.push(current.trim());
				current = '';
			} else {
				current += ch;
			}
		}
	}
	fields.push(current.trim());
	return fields;
}

/**
 * Build a header-to-index map for fast column lookup.
 */
function buildHeaderIndex(header: string[]): Map<string, number> {
	const map = new Map<string, number>();
	for (let i = 0; i < header.length; i++) {
		map.set(header[i]!, i);
	}
	return map;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Returns true if the given row is applyable (GREEN_SAFE + APPLY_GREEN_SAFE).
 */
function isApplyableAction(row: DecisionManifestRow): boolean {
	return (
		row.risk_class === 'GREEN_SAFE' &&
		row.agent_recommendation === 'APPLY_GREEN_SAFE'
	);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Parse a decision manifest CSV string into an array of row objects.
 *
 * @param input - Raw CSV string with header row.
 * @returns Array of parsed and validated DecisionManifestRow objects.
 * @throws If the CSV is empty, missing required columns, or contains invalid values.
 */
export function parseDecisionManifestCsv(input: string): DecisionManifestRow[] {
	const trimmed = input.trim();
	if (trimmed.length === 0) {
		throw new SyntaxError('Decision manifest CSV is empty');
	}

	const rawLines = trimmed.split(/\r?\n/);
	if (rawLines.length < 2) {
		throw new SyntaxError(
			'Decision manifest CSV is empty (header only, no data rows)',
		);
	}

	const lines = rawLines.map((l) => l.trim()).filter((l) => l.length > 0);
	if (lines.length < 2) {
		throw new SyntaxError(
			'Decision manifest CSV is empty (no data rows after filtering)',
		);
	}

	const header = parseCsvLine(lines[HEADER_ROW]!);
	const headerIndex = buildHeaderIndex(header);

	// Validate required columns
	const missing: string[] = [];
	for (const col of REQUIRED_COLUMNS) {
		if (!headerIndex.has(col)) {
			missing.push(col);
		}
	}
	if (missing.length > 0) {
		throw new SyntaxError(
			`Decision manifest CSV is missing required column(s): ${missing.join(', ')}`,
		);
	}

	// Extract required column indices (guaranteed to exist after validation above)
	const actionIdIdx = headerIndex.get('action_id')!;
	const riskClassIdx = headerIndex.get('risk_class')!;
	const recIdx = headerIndex.get('agent_recommendation')!;

	const rows: DecisionManifestRow[] = [];

	for (let i = DATA_START; i < lines.length; i++) {
		const fields = parseCsvLine(lines[i]!);

		const maxIdx = Math.max(actionIdIdx, riskClassIdx, recIdx);
		if (fields.length <= maxIdx) {
			continue; // skip malformed lines silently
		}

		const riskClass = fields[riskClassIdx]!;
		const recommendation = fields[recIdx]!;
		const actionId = fields[actionIdIdx]!;

		// Validate risk class
		if (!KNOWN_RISK_CLASSES.has(riskClass)) {
			throw new SyntaxError(
				`Row ${i}: unknown risk_class "${riskClass}" for action "${actionId}"`,
			);
		}

		// Validate recommendation
		if (!KNOWN_AGENT_RECOMMENDATIONS.has(recommendation)) {
			throw new SyntaxError(
				`Row ${i}: unknown agent_recommendation "${recommendation}" for action "${actionId}"`,
			);
		}

		rows.push({
			action_id: actionId,
			risk_class: riskClass as RiskClass,
			agent_recommendation: recommendation as AgentRecommendation,
		});
	}

	return rows;
}

/**
 * Validate a parsed decision manifest and produce a structured validation result.
 *
 * @param rows - Parsed decision manifest rows.
 * @returns A validation result with errors, warnings, counts, and applyable actions.
 */
export function validateDecisionManifest(
	rows: DecisionManifestRow[],
): DecisionManifestValidationResult {
	const errors: string[] = [];
	const warnings: string[] = [];

	// Initialize counts for all known risk classes
	const counts: Record<RiskClass, number> = {
		GREEN_SAFE: 0,
		YELLOW_REVIEW: 0,
		RED_HOLD: 0,
		UNKNOWN: 0,
		TOOL_GAP: 0,
		DEFER_TO_279: 0,
	};

	// Count per risk class
	for (const row of rows) {
		counts[row.risk_class] = (counts[row.risk_class] ?? 0) + 1;
	}

	// Determine applyable actions: only GREEN_SAFE + APPLY_GREEN_SAFE
	const applyableActions = rows.filter(isApplyableAction);

	// Warnings for non-applyable risk classes that have APPLY_GREEN_SAFE
	for (const row of rows) {
		if (
			NON_APPLYABLE_RISK_CLASSES.has(row.risk_class) &&
			row.agent_recommendation === 'APPLY_GREEN_SAFE'
		) {
			warnings.push(
				`${row.action_id}: ${row.risk_class} is not applyable (recommendation APPLY_GREEN_SAFE is ignored for this risk class)`,
			);
		}
	}

	// Warning for GREEN_SAFE with DO_NOT_APPLY (common cleanup scenario)
	const greenDoNotApply = rows.filter(
		(row) =>
			row.risk_class === 'GREEN_SAFE' &&
			row.agent_recommendation === 'DO_NOT_APPLY',
	);
	if (greenDoNotApply.length > 0 && applyableActions.length === 0) {
		warnings.push(
			`${greenDoNotApply.length} GREEN_SAFE row(s) have DO_NOT_APPLY — 0 actions are applyable. Review if intentional.`,
		);
	}

	const valid = errors.length === 0;

	return {
		valid,
		errors,
		warnings,
		total: rows.length,
		counts,
		applyableActions,
	};
}

/**
 * Convenience function: extract only GREEN_SAFE + APPLY_GREEN_SAFE actions.
 *
 * @param rows - Parsed decision manifest rows.
 * @returns Array of applyable actions.
 */
export function getApplyableGreenSafeActions(
	rows: DecisionManifestRow[],
): DecisionManifestRow[] {
	return rows.filter(isApplyableAction);
}
