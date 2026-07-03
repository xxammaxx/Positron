// Positron — Decision Manifest Validator: Red Tests (QA-030)
// Covers: parseDecisionManifestCsv(), validateDecisionManifest(), getApplyableGreenSafeActions()

import { describe, expect, test } from 'vitest';
import {
	type DecisionManifestRow,
	getApplyableGreenSafeActions,
	parseDecisionManifestCsv,
	validateDecisionManifest,
} from '../decision-manifest.js';

// ---------------------------------------------------------------------------
// CSV fixture helpers
// ---------------------------------------------------------------------------
const VALID_HEADER =
	'action_id,risk_class,confidence,action_type,target_issue,target_title,proposed_title,proposed_body_or_comment,labels_to_add,labels_to_remove,duplicate_of,close_reason,reopen_reason,code_evidence,test_evidence,pr_evidence,doc_evidence,agent_recommendation,plain_language_reason,owner_decision';

function row(id: string, risk: string, rec: string): string {
	return `${id},${risk},0.9,NO_ACTION,100,"Test",,,,,,,,,,,,${rec},"Reason",PENDING`;
}

function csv(...lines: string[]): string {
	return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Test Suite: 19 tests covering all acceptance criteria
// ---------------------------------------------------------------------------

// 1. rejects empty manifest
describe('parseDecisionManifestCsv', () => {
	test('rejects empty manifest', () => {
		expect(() => parseDecisionManifestCsv('')).toThrow('empty');
	});

	test('rejects whitespace-only manifest', () => {
		expect(() => parseDecisionManifestCsv('   \n\n')).toThrow('empty');
	});

	// 2. rejects missing required columns
	test('rejects missing required columns', () => {
		const badCsv = 'action_id,risk_class\nACT-001,GREEN_SAFE';
		expect(() => parseDecisionManifestCsv(badCsv)).toThrow('missing required column');
	});

	test('rejects header without agent_recommendation', () => {
		const badCsv = 'action_id,risk_class,owner_decision\nACT-001,GREEN_SAFE,PENDING';
		expect(() => parseDecisionManifestCsv(badCsv)).toThrow('missing required column');
	});

	// 3. rejects unknown risk_class
	test('rejects unknown risk_class', () => {
		const badCsv = csv(VALID_HEADER, row('ACT-001', 'BLUE_SAFE', 'DO_NOT_APPLY'));
		expect(() => parseDecisionManifestCsv(badCsv)).toThrow(/unknown risk_class/i);
	});

	// 4. rejects unknown agent_recommendation
	test('rejects unknown agent_recommendation', () => {
		const badCsv = csv(VALID_HEADER, row('ACT-001', 'GREEN_SAFE', 'AUTO_MERGE'));
		expect(() => parseDecisionManifestCsv(badCsv)).toThrow(/unknown agent_recommendation/i);
	});

	// Parses valid manifest with multiple rows
	test('parses valid manifest with known risk and recommendation', () => {
		const goodCsv = csv(
			VALID_HEADER,
			row('ACT-001', 'GREEN_SAFE', 'DO_NOT_APPLY'),
			row('ACT-002', 'YELLOW_REVIEW', 'DO_NOT_APPLY'),
			row('ACT-003', 'RED_HOLD', 'DO_NOT_APPLY'),
		);
		const rows = parseDecisionManifestCsv(goodCsv);
		expect(rows).toHaveLength(3);
		const first = rows[0]!;
		expect(first.action_id).toBe('ACT-001');
		expect(first.risk_class).toBe('GREEN_SAFE');
		expect(first.agent_recommendation).toBe('DO_NOT_APPLY');
	});
});

// 5-9 & 11-12: validation and applyable logic
describe('validateDecisionManifest', () => {
	// 5. GREEN_SAFE + DO_NOT_APPLY is not applyable
	test('GREEN_SAFE + DO_NOT_APPLY is not applyable', () => {
		const rows = parseDecisionManifestCsv(
			csv(VALID_HEADER, row('ACT-001', 'GREEN_SAFE', 'DO_NOT_APPLY')),
		);
		const result = validateDecisionManifest(rows);
		expect(result.applyableActions).toHaveLength(0);
	});

	// 6. GREEN_SAFE + APPLY_GREEN_SAFE is applyable
	test('GREEN_SAFE + APPLY_GREEN_SAFE is applyable', () => {
		const rows = parseDecisionManifestCsv(
			csv(VALID_HEADER, row('ACT-001', 'GREEN_SAFE', 'APPLY_GREEN_SAFE')),
		);
		const result = validateDecisionManifest(rows);
		expect(result.applyableActions).toHaveLength(1);
		expect(result.applyableActions[0]!.action_id).toBe('ACT-001');
	});

	// 7. YELLOW_REVIEW is not applyable (even with APPLY_GREEN_SAFE)
	test('YELLOW_REVIEW is not applyable', () => {
		const rows = parseDecisionManifestCsv(
			csv(VALID_HEADER, row('ACT-001', 'YELLOW_REVIEW', 'APPLY_GREEN_SAFE')),
		);
		const result = validateDecisionManifest(rows);
		expect(result.applyableActions).toHaveLength(0);
	});

	// 8. RED_HOLD is not applyable
	test('RED_HOLD is not applyable', () => {
		const rows = parseDecisionManifestCsv(
			csv(VALID_HEADER, row('ACT-001', 'RED_HOLD', 'APPLY_GREEN_SAFE')),
		);
		const result = validateDecisionManifest(rows);
		expect(result.applyableActions).toHaveLength(0);
	});

	// 9. UNKNOWN and TOOL_GAP are not applyable
	test('UNKNOWN is not applyable', () => {
		const rows = parseDecisionManifestCsv(
			csv(VALID_HEADER, row('ACT-001', 'UNKNOWN', 'APPLY_GREEN_SAFE')),
		);
		const result = validateDecisionManifest(rows);
		expect(result.applyableActions).toHaveLength(0);
	});

	test('TOOL_GAP is not applyable', () => {
		const rows = parseDecisionManifestCsv(
			csv(VALID_HEADER, row('ACT-001', 'TOOL_GAP', 'APPLY_GREEN_SAFE')),
		);
		const result = validateDecisionManifest(rows);
		expect(result.applyableActions).toHaveLength(0);
	});

	test('DEFER_TO_279 is not applyable', () => {
		const rows = parseDecisionManifestCsv(
			csv(VALID_HEADER, row('ACT-001', 'DEFER_TO_279', 'APPLY_GREEN_SAFE')),
		);
		const result = validateDecisionManifest(rows);
		expect(result.applyableActions).toHaveLength(0);
	});

	// 10. Current cleanup scenario: 5 GREEN_SAFE, all DO_NOT_APPLY => 0 applyable
	test('current cleanup scenario: 5 GREEN_SAFE all DO_NOT_APPLY => 0 applyable', () => {
		const rows = parseDecisionManifestCsv(
			csv(
				VALID_HEADER,
				row('ACT-001', 'GREEN_SAFE', 'DO_NOT_APPLY'),
				row('ACT-002', 'GREEN_SAFE', 'DO_NOT_APPLY'),
				row('ACT-003', 'GREEN_SAFE', 'DO_NOT_APPLY'),
				row('ACT-004', 'GREEN_SAFE', 'DO_NOT_APPLY'),
				row('ACT-005', 'GREEN_SAFE', 'DO_NOT_APPLY'),
				row('ACT-006', 'YELLOW_REVIEW', 'DO_NOT_APPLY'),
				row('ACT-007', 'RED_HOLD', 'DO_NOT_APPLY'),
			),
		);
		const result = validateDecisionManifest(rows);
		expect(result.counts.GREEN_SAFE).toBe(5);
		expect(result.applyableActions).toHaveLength(0);
		expect(result.valid).toBe(true);
	});

	// 11. counts by risk class are correct
	test('counts by risk class are correct', () => {
		const rows = parseDecisionManifestCsv(
			csv(
				VALID_HEADER,
				row('ACT-001', 'GREEN_SAFE', 'DO_NOT_APPLY'),
				row('ACT-002', 'GREEN_SAFE', 'APPLY_GREEN_SAFE'),
				row('ACT-003', 'YELLOW_REVIEW', 'REVIEW_REQUIRED'),
				row('ACT-004', 'YELLOW_REVIEW', 'DO_NOT_APPLY'),
				row('ACT-005', 'RED_HOLD', 'HOLD'),
				row('ACT-006', 'UNKNOWN', 'DEFER'),
				row('ACT-007', 'TOOL_GAP', 'DEFER'),
				row('ACT-008', 'DEFER_TO_279', 'DEFER'),
			),
		);
		const result = validateDecisionManifest(rows);
		expect(result.counts.GREEN_SAFE).toBe(2);
		expect(result.counts.YELLOW_REVIEW).toBe(2);
		expect(result.counts.RED_HOLD).toBe(1);
		expect(result.counts.UNKNOWN).toBe(1);
		expect(result.counts.TOOL_GAP).toBe(1);
		expect(result.counts.DEFER_TO_279).toBe(1);
		expect(result.applyableActions).toHaveLength(1); // only ACT-002
		expect(result.total).toBe(8);
	});

	// 12. validation result contains errors/warnings/counts/applyableActions
	test('validation result structure is complete', () => {
		const rows = parseDecisionManifestCsv(
			csv(VALID_HEADER, row('ACT-001', 'GREEN_SAFE', 'DO_NOT_APPLY')),
		);
		const result = validateDecisionManifest(rows);
		expect(result).toHaveProperty('valid');
		expect(result).toHaveProperty('errors');
		expect(result).toHaveProperty('warnings');
		expect(result).toHaveProperty('counts');
		expect(result).toHaveProperty('applyableActions');
		expect(result).toHaveProperty('total');
		expect(Array.isArray(result.errors)).toBe(true);
		expect(Array.isArray(result.warnings)).toBe(true);
		expect(Array.isArray(result.applyableActions)).toBe(true);
	});
});

// 10b. also test getApplyableGreenSafeActions helper
describe('getApplyableGreenSafeActions', () => {
	test('returns empty when all DO_NOT_APPLY', () => {
		const rows: DecisionManifestRow[] = [
			{ action_id: 'ACT-001', risk_class: 'GREEN_SAFE', agent_recommendation: 'DO_NOT_APPLY' },
			{ action_id: 'ACT-002', risk_class: 'GREEN_SAFE', agent_recommendation: 'DO_NOT_APPLY' },
		];
		expect(getApplyableGreenSafeActions(rows)).toHaveLength(0);
	});

	test('returns only GREEN_SAFE + APPLY_GREEN_SAFE', () => {
		const rows: DecisionManifestRow[] = [
			{ action_id: 'ACT-001', risk_class: 'GREEN_SAFE', agent_recommendation: 'APPLY_GREEN_SAFE' },
			{
				action_id: 'ACT-002',
				risk_class: 'YELLOW_REVIEW',
				agent_recommendation: 'APPLY_GREEN_SAFE',
			},
			{ action_id: 'ACT-003', risk_class: 'GREEN_SAFE', agent_recommendation: 'DO_NOT_APPLY' },
		];
		const applyable = getApplyableGreenSafeActions(rows);
		expect(applyable).toHaveLength(1);
		expect(applyable[0]!.action_id).toBe('ACT-001');
	});
});
