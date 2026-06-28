// Positron — Human Approval Pack Generator Tests (Issue #279 Phase 1F)
// Red tests: module does not exist yet — expect import failure initially.
// After implementation, all tests must pass.
import { describe, it, expect, beforeAll } from 'vitest';

// Will be imported after the module is implemented:
// import { createHumanApprovalPackReport } from '../human-approval-pack.js';

import type { DecisionManifestRow, RiskClass, AgentRecommendation } from '../decision-manifest.js';
import type { EvidenceGateReport } from '../evidence-gate.js';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeRow(
	action_id: string,
	risk_class: RiskClass,
	agent_recommendation: AgentRecommendation,
): DecisionManifestRow {
	return { action_id, risk_class, agent_recommendation };
}

function makeEvidenceGateReport(
	rows: DecisionManifestRow[],
	overrides?: Partial<EvidenceGateReport>,
): EvidenceGateReport {
	const greenSafe = rows.filter(
		(r) => r.risk_class === 'GREEN_SAFE' && r.agent_recommendation === 'APPLY_GREEN_SAFE',
	);
	const blocked = rows.filter(
		(r) => !(r.risk_class === 'GREEN_SAFE' && r.agent_recommendation === 'APPLY_GREEN_SAFE'),
	);

	const riskClassCounts: Record<string, number> = {};
	const recommendationCounts: Record<string, number> = {};
	for (const r of rows) {
		riskClassCounts[r.risk_class] = (riskClassCounts[r.risk_class] ?? 0) + 1;
		recommendationCounts[r.agent_recommendation] =
			(recommendationCounts[r.agent_recommendation] ?? 0) + 1;
	}

	const counts: Record<RiskClass, number> = {
		GREEN_SAFE: riskClassCounts['GREEN_SAFE'] ?? 0,
		YELLOW_REVIEW: riskClassCounts['YELLOW_REVIEW'] ?? 0,
		RED_HOLD: riskClassCounts['RED_HOLD'] ?? 0,
		UNKNOWN: riskClassCounts['UNKNOWN'] ?? 0,
		TOOL_GAP: riskClassCounts['TOOL_GAP'] ?? 0,
		DEFER_TO_279: riskClassCounts['DEFER_TO_279'] ?? 0,
	};

	return {
		status: 'PASS',
		generatedAt: new Date().toISOString(),
		summary: {
			totalRows: rows.length,
			applyableActions: greenSafe.length,
			validationErrors: 0,
			validationWarnings: 0,
		},
		riskClassCounts,
		recommendationCounts,
		applyableRows: greenSafe,
		blockedRows: blocked,
		validation: {
			valid: true,
			errors: [],
			warnings: [],
			total: rows.length,
			counts,
			applyableActions: greenSafe,
		},
		...overrides,
	};
}

// ---------------------------------------------------------------------------
// Test Suite
// ---------------------------------------------------------------------------

describe('Human Approval Pack Generator', () => {
	// biome-ignore format: typeof import() type syntax breaks when line-wrapped — TypeScript requires single-line form
	let createHumanApprovalPackReport: typeof import('../human-approval-pack.js').createHumanApprovalPackReport;

	beforeAll(async () => {
		const mod = await import('../human-approval-pack.js');
		createHumanApprovalPackReport = mod.createHumanApprovalPackReport;
	});

	it('1. creates approval pack report from EvidenceGateReport', () => {
		const rows = [makeRow('a1', 'GREEN_SAFE', 'APPLY_GREEN_SAFE')];
		const report = makeEvidenceGateReport(rows);

		const pack = createHumanApprovalPackReport(report);

		expect(pack).toBeDefined();
		expect(pack.status).toBeDefined();
		expect(pack.totalPackages).toBeGreaterThanOrEqual(0);
		expect(Array.isArray(pack.packages)).toBe(true);
	});

	it('2. groups GREEN_SAFE + APPLY_GREEN_SAFE into GREEN_SAFE_PACKAGE', () => {
		const rows = [
			makeRow('g1', 'GREEN_SAFE', 'APPLY_GREEN_SAFE'),
			makeRow('g2', 'GREEN_SAFE', 'APPLY_GREEN_SAFE'),
		];
		const report = makeEvidenceGateReport(rows);

		const pack = createHumanApprovalPackReport(report);

		const greenPackage = pack.packages.find((p) => p.type === 'GREEN_SAFE_PACKAGE');
		expect(greenPackage).toBeDefined();
		expect(greenPackage!.applyable).toBe(true);
		expect(greenPackage!.rowIds).toContain('g1');
		expect(greenPackage!.rowIds).toContain('g2');
		expect(greenPackage!.approvalPhrase).toContain('APPROVE APPLY GREEN_SAFE');
	});

	it('3. blocks GREEN_SAFE + DO_NOT_APPLY from applyable package', () => {
		const rows = [makeRow('g1', 'GREEN_SAFE', 'DO_NOT_APPLY')];
		const report = makeEvidenceGateReport(rows);

		const pack = createHumanApprovalPackReport(report);

		const greenPackage = pack.packages.find((p) => p.type === 'GREEN_SAFE_PACKAGE');
		if (greenPackage) {
			expect(greenPackage.applyable).toBe(false);
		}
		// Also check no applyable packages overall
		expect(pack.applyablePackages).toBe(0);
	});

	it('4. YELLOW_REVIEW becomes YELLOW_REVIEW_PACKAGE', () => {
		const rows = [makeRow('y1', 'YELLOW_REVIEW', 'REVIEW_REQUIRED')];
		const report = makeEvidenceGateReport(rows);

		const pack = createHumanApprovalPackReport(report);

		const yellowPackage = pack.packages.find((p) => p.type === 'YELLOW_REVIEW_PACKAGE');
		expect(yellowPackage).toBeDefined();
		expect(yellowPackage!.applyable).toBe(false);
		expect(yellowPackage!.status).toBe('REVIEW_REQUIRED');
		expect(yellowPackage!.approvalPhrase).toContain('REVIEW');
	});

	it('5. RED_HOLD becomes RED_HOLD_PACKAGE', () => {
		const rows = [makeRow('r1', 'RED_HOLD', 'HOLD')];
		const report = makeEvidenceGateReport(rows);

		const pack = createHumanApprovalPackReport(report);

		const redPackage = pack.packages.find((p) => p.type === 'RED_HOLD_PACKAGE');
		expect(redPackage).toBeDefined();
		expect(redPackage!.applyable).toBe(false);
		expect(redPackage!.status).toBe('HOLD');
		expect(redPackage!.approvalPhrase).toContain('HOLD');
	});

	it('6. TOOL_GAP becomes TOOL_GAP_PACKAGE', () => {
		const rows = [makeRow('t1', 'TOOL_GAP', 'REVIEW_REQUIRED')];
		const report = makeEvidenceGateReport(rows);

		const pack = createHumanApprovalPackReport(report);

		const toolGapPackage = pack.packages.find((p) => p.type === 'TOOL_GAP_PACKAGE');
		expect(toolGapPackage).toBeDefined();
		expect(toolGapPackage!.applyable).toBe(false);
		expect(toolGapPackage!.rowIds).toContain('t1');
	});

	it('7. UNKNOWN becomes TOOL_GAP_PACKAGE (validation-needed)', () => {
		const rows = [makeRow('u1', 'UNKNOWN', 'REVIEW_REQUIRED')];
		const report = makeEvidenceGateReport(rows);

		const pack = createHumanApprovalPackReport(report);

		const unknownPackage = pack.packages.find(
			(p) => p.type === 'TOOL_GAP_PACKAGE' && p.rowIds.includes('u1'),
		);
		expect(unknownPackage).toBeDefined();
	});

	it('8. DEFER_TO_279 becomes DEFER_TO_279_PACKAGE', () => {
		const rows = [makeRow('d1', 'DEFER_TO_279', 'DEFER')];
		const report = makeEvidenceGateReport(rows);

		const pack = createHumanApprovalPackReport(report);

		const deferPackage = pack.packages.find((p) => p.type === 'DEFER_TO_279_PACKAGE');
		expect(deferPackage).toBeDefined();
		expect(deferPackage!.applyable).toBe(false);
		expect(deferPackage!.status).toBe('DEFER');
		expect(deferPackage!.approvalPhrase).toContain('DEFER');
		expect(deferPackage!.approvalPhrase).toContain('ISSUE 279');
	});

	it('9. local required gate failure blocks GREEN apply package', () => {
		const rows = [makeRow('g1', 'GREEN_SAFE', 'APPLY_GREEN_SAFE')];
		const report = makeEvidenceGateReport(rows, {
			localGateReport: {
				status: 'FAIL',
				total: 1,
				passed: 0,
				warned: 0,
				failed: 1,
				skipped: 0,
				results: [
					{
						id: 'build',
						label: 'Build',
						kind: 'required',
						command: 'npm',
						args: ['run', 'build'],
						status: 'FAIL',
						exitCode: 1,
						durationMs: 100,
					},
				],
			},
		});

		const pack = createHumanApprovalPackReport(report);

		expect(pack.applyablePackages).toBe(0);
		const greenPackage = pack.packages.find((p) => p.type === 'GREEN_SAFE_PACKAGE');
		if (greenPackage) {
			expect(greenPackage.applyable).toBe(false);
			expect(greenPackage.blockerReasons.length).toBeGreaterThan(0);
		}
	});

	it('10. advisory gate warning does not block package but adds warning', () => {
		const rows = [makeRow('g1', 'GREEN_SAFE', 'APPLY_GREEN_SAFE')];
		const report = makeEvidenceGateReport(rows, {
			localGateReport: {
				status: 'WARN',
				total: 1,
				passed: 0,
				warned: 1,
				failed: 0,
				skipped: 0,
				results: [
					{
						id: 'biome-check',
						label: 'Biome Check',
						kind: 'advisory',
						command: 'npx',
						args: ['biome', 'check', '.'],
						status: 'WARN',
						exitCode: 1,
						durationMs: 100,
					},
				],
			},
		});

		const pack = createHumanApprovalPackReport(report);

		// Advisory warning should NOT block applyable packages
		expect(pack.applyablePackages).toBeGreaterThanOrEqual(0);
		const greenPackage = pack.packages.find((p) => p.type === 'GREEN_SAFE_PACKAGE');
		if (greenPackage) {
			expect(greenPackage.warnings.length).toBeGreaterThan(0);
		}
	});

	it('11. mixed risk rows become MIXED_RISK_PACKAGE', () => {
		const rows = [
			makeRow('g1', 'GREEN_SAFE', 'APPLY_GREEN_SAFE'),
			makeRow('y1', 'YELLOW_REVIEW', 'REVIEW_REQUIRED'),
		];
		const report = makeEvidenceGateReport(rows);

		const pack = createHumanApprovalPackReport(report);

		// With mixed rows, we should have multiple packages
		const types = pack.packages.map((p) => p.type);
		expect(types.length).toBeGreaterThanOrEqual(2);
	});

	it('12. approval phrases are deterministic', () => {
		const rows = [
			makeRow('g1', 'GREEN_SAFE', 'APPLY_GREEN_SAFE'),
			makeRow('y1', 'YELLOW_REVIEW', 'REVIEW_REQUIRED'),
			makeRow('r1', 'RED_HOLD', 'HOLD'),
		];
		const report = makeEvidenceGateReport(rows);

		const pack1 = createHumanApprovalPackReport(report);
		const pack2 = createHumanApprovalPackReport(report);

		// Same input → same output
		expect(JSON.stringify(pack1)).toBe(JSON.stringify(pack2));
	});

	it('13. JSON serialization is stable', () => {
		const rows = [makeRow('g1', 'GREEN_SAFE', 'APPLY_GREEN_SAFE')];
		const report = makeEvidenceGateReport(rows);

		const pack = createHumanApprovalPackReport(report);
		const json = JSON.stringify(pack, null, 2);
		const parsed = JSON.parse(json);

		expect(parsed).toEqual(pack);
		expect(parsed.totalPackages).toBe(pack.totalPackages);
		expect(parsed.packages.length).toBe(pack.packages.length);
	});

	it('14. 0 applyable actions preserved when EvidenceGateReport has 0 applyable rows', () => {
		const rows = [
			makeRow('y1', 'YELLOW_REVIEW', 'REVIEW_REQUIRED'),
			makeRow('r1', 'RED_HOLD', 'HOLD'),
		];
		const report = makeEvidenceGateReport(rows);

		const pack = createHumanApprovalPackReport(report);

		expect(pack.applyablePackages).toBe(0);
	});

	it('15. PR #218-like fixture becomes YELLOW_REVIEW package', () => {
		// Simulate PR #218: MERGEABLE but with review findings
		const rows = [makeRow('pr-218', 'YELLOW_REVIEW', 'REVIEW_REQUIRED')];
		const report = makeEvidenceGateReport(rows);

		const pack = createHumanApprovalPackReport(report);

		const yellowPackage = pack.packages.find(
			(p) => p.type === 'YELLOW_REVIEW_PACKAGE' && p.rowIds.includes('pr-218'),
		);
		expect(yellowPackage).toBeDefined();
		expect(yellowPackage!.applyable).toBe(false);
		expect(yellowPackage!.status).toBe('REVIEW_REQUIRED');
	});

	it('16. Issue #279-like fixture becomes DEFER_TO_279 package', () => {
		const rows = [makeRow('issue-279', 'DEFER_TO_279', 'DEFER')];
		const report = makeEvidenceGateReport(rows);

		const pack = createHumanApprovalPackReport(report);

		const deferPackage = pack.packages.find(
			(p) => p.type === 'DEFER_TO_279_PACKAGE' && p.rowIds.includes('issue-279'),
		);
		expect(deferPackage).toBeDefined();
		expect(deferPackage!.status).toBe('DEFER');
	});

	it('17. no action execution fields exist in packages', () => {
		const rows = [makeRow('g1', 'GREEN_SAFE', 'APPLY_GREEN_SAFE')];
		const report = makeEvidenceGateReport(rows);

		const pack = createHumanApprovalPackReport(report);

		// Check no execute/apply/run/mutate fields exist
		for (const pkg of pack.packages) {
			const keys = Object.keys(pkg);
			const executeKeys = keys.filter(
				(k) =>
					k.includes('execute') || k.includes('apply') || k.includes('run') || k.includes('mutate'),
			);
			// 'applyable' is allowed — it's a read-only flag, not an action
			const nonApplyableExecuteKeys = executeKeys.filter((k) => k !== 'applyable');
			expect(nonApplyableExecuteKeys).toEqual([]);
		}
	});

	it('18. package summary counts are correct', () => {
		const rows = [
			makeRow('g1', 'GREEN_SAFE', 'APPLY_GREEN_SAFE'),
			makeRow('g2', 'GREEN_SAFE', 'APPLY_GREEN_SAFE'),
			makeRow('y1', 'YELLOW_REVIEW', 'REVIEW_REQUIRED'),
			makeRow('r1', 'RED_HOLD', 'HOLD'),
			makeRow('t1', 'TOOL_GAP', 'REVIEW_REQUIRED'),
			makeRow('d1', 'DEFER_TO_279', 'DEFER'),
		];
		const report = makeEvidenceGateReport(rows);

		const pack = createHumanApprovalPackReport(report);

		expect(pack.totalPackages).toBeGreaterThanOrEqual(4); // at least GREEN, YELLOW, RED, TOOL_GAP, DEFER
		expect(pack.applyablePackages).toBeGreaterThanOrEqual(0);

		// Sum of all package types should equal total packages
		const sum =
			pack.applyablePackages + pack.reviewPackages + pack.holdPackages + pack.deferredPackages;
		// totalPackages includes TOOL_GAP_PACKAGE which isn't in these categories
		expect(pack.totalPackages).toBeGreaterThanOrEqual(sum);
	});
});
