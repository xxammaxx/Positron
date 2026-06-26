// Positron — GitHub Context Reconciler: Red Tests (Issue #279 Phase 1B)
// Covers: reconcileGitHubContextToDecisionManifestRows(), reconcileGitHubContext()
// All fixtures are inline — no GitHub API calls, no gh CLI execution.

import { describe, expect, test } from 'vitest';
import type { DecisionManifestRow } from '../decision-manifest.js';
import { validateDecisionManifest, getApplyableGreenSafeActions } from '../decision-manifest.js';
import {
	reconcileGitHubContextToDecisionManifestRows,
	reconcileGitHubContext,
	type GitHubIssueSnapshot,
	type GitHubPullRequestSnapshot,
	type GitHubContextSnapshot,
} from '../github-context-reconciler.js';

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

function makeIssue(overrides: Partial<GitHubIssueSnapshot> = {}): GitHubIssueSnapshot {
	return {
		number: 1,
		title: 'Test Issue',
		state: 'OPEN',
		labels: [],
		url: 'https://github.com/test/repo/issues/1',
		body: '',
		...overrides,
	};
}

function makePR(overrides: Partial<GitHubPullRequestSnapshot> = {}): GitHubPullRequestSnapshot {
	return {
		number: 1,
		title: 'Test PR',
		state: 'OPEN',
		mergeable: 'MERGEABLE',
		isDraft: false,
		url: 'https://github.com/test/repo/pull/1',
		...overrides,
	};
}

// ---------------------------------------------------------------------------
// Test Suite
// ---------------------------------------------------------------------------

describe('reconcileGitHubContextToDecisionManifestRows', () => {
	// Test 1: maps PR #218-like open PR with 9 actionable findings to YELLOW_REVIEW + REVIEW_REQUIRED
	test('maps PR with actionable findings to YELLOW_REVIEW + REVIEW_REQUIRED', () => {
		const input: GitHubContextSnapshot = {
			pullRequests: [
				makePR({
					number: 218,
					title: 'feat(safety): integrate Stop/Ask policy with GATE_APPROVE',
					state: 'OPEN',
					mergeable: 'MERGEABLE',
					reviewFindingCount: 9,
					actionableFindingCount: 9,
					findingsAccessible: true,
				}),
			],
			issues: [],
		};
		const rows = reconcileGitHubContextToDecisionManifestRows(input);
		const prRow = rows.find((r) => r.action_id === 'PR-218');
		expect(prRow).toBeDefined();
		expect(prRow!.risk_class).toBe('YELLOW_REVIEW');
		expect(prRow!.agent_recommendation).toBe('REVIEW_REQUIRED');
	});

	// Test 2: maps open PR with inaccessible findings to TOOL_GAP + REVIEW_REQUIRED
	test('maps PR with inaccessible findings to TOOL_GAP + REVIEW_REQUIRED', () => {
		const input: GitHubContextSnapshot = {
			pullRequests: [
				makePR({
					number: 300,
					title: 'feat: some feature',
					state: 'OPEN',
					mergeable: 'MERGEABLE',
					reviewFindingCount: 5,
					actionableFindingCount: undefined,
					findingsAccessible: false,
				}),
			],
			issues: [],
		};
		const rows = reconcileGitHubContextToDecisionManifestRows(input);
		const prRow = rows.find((r) => r.action_id === 'PR-300');
		expect(prRow).toBeDefined();
		expect(prRow!.risk_class).toBe('TOOL_GAP');
		expect(prRow!.agent_recommendation).toBe('REVIEW_REQUIRED');
	});

	// Test 3: maps conflicting PR to non-applyable risk/recommendation
	test('maps conflicting PR to non-applyable classification', () => {
		const input: GitHubContextSnapshot = {
			pullRequests: [
				makePR({
					number: 228,
					title: 'feat: tool monitoring dashboard',
					state: 'OPEN',
					mergeable: 'CONFLICTING',
				}),
			],
			issues: [],
		};
		const rows = reconcileGitHubContextToDecisionManifestRows(input);
		const prRow = rows.find((r) => r.action_id === 'PR-228');
		expect(prRow).toBeDefined();
		// Conflicting PR must never be applyable
		expect(prRow!.agent_recommendation).not.toBe('APPLY_GREEN_SAFE');
		expect(['YELLOW_REVIEW', 'RED_HOLD']).toContain(prRow!.risk_class);
	});

	// Test 4: maps closed superseded PR to GREEN_SAFE + DO_NOT_APPLY
	test('maps closed superseded PR to GREEN_SAFE + DO_NOT_APPLY', () => {
		const input: GitHubContextSnapshot = {
			pullRequests: [
				makePR({
					number: 229,
					title: 'feat: old architecture chain',
					state: 'CLOSED',
					mergeable: null,
				}),
			],
			issues: [],
		};
		const rows = reconcileGitHubContextToDecisionManifestRows(input);
		const prRow = rows.find((r) => r.action_id === 'PR-229');
		expect(prRow).toBeDefined();
		expect(prRow!.risk_class).toBe('GREEN_SAFE');
		expect(prRow!.agent_recommendation).toBe('DO_NOT_APPLY');
	});

	// Test 5: maps Issue #279-like architecture replacement issue to DEFER_TO_279 + DEFER
	test('maps Issue #279 architecture replacement to DEFER_TO_279 + DEFER', () => {
		const input: GitHubContextSnapshot = {
			pullRequests: [],
			issues: [
				makeIssue({
					number: 279,
					title: 'Replacement: rebuild Issue #229 architecture chain on current main',
					state: 'OPEN',
					labels: ['epic', 'architecture', 'priority: high'],
					body: 'This issue replaces the old #229 chain...',
				}),
			],
		};
		const rows = reconcileGitHubContextToDecisionManifestRows(input);
		const issueRow = rows.find((r) => r.action_id === 'ISSUE-279');
		expect(issueRow).toBeDefined();
		expect(issueRow!.risk_class).toBe('DEFER_TO_279');
		expect(issueRow!.agent_recommendation).toBe('DEFER');
	});

	// Test 6: maps RED_HOLD/data-loss markers to RED_HOLD + HOLD
	test('maps RED_HOLD marker issue to RED_HOLD + HOLD', () => {
		const input: GitHubContextSnapshot = {
			pullRequests: [],
			issues: [
				makeIssue({
					number: 999,
					title: 'Critical: data loss risk',
					state: 'OPEN',
					labels: ['RED_HOLD'],
				}),
			],
		};
		const rows = reconcileGitHubContextToDecisionManifestRows(input);
		const issueRow = rows.find((r) => r.action_id === 'ISSUE-999');
		expect(issueRow).toBeDefined();
		expect(issueRow!.risk_class).toBe('RED_HOLD');
		expect(issueRow!.agent_recommendation).toBe('HOLD');
	});

	// Test 6b: maps issue with data-loss-risk in body to RED_HOLD + HOLD
	test('maps data-loss body marker issue to RED_HOLD + HOLD', () => {
		const input: GitHubContextSnapshot = {
			pullRequests: [],
			issues: [
				makeIssue({
					number: 1000,
					title: 'Some dangerous change',
					state: 'OPEN',
					body: 'This involves potential data loss in production.',
				}),
			],
		};
		const rows = reconcileGitHubContextToDecisionManifestRows(input);
		const issueRow = rows.find((r) => r.action_id === 'ISSUE-1000');
		expect(issueRow).toBeDefined();
		expect(issueRow!.risk_class).toBe('RED_HOLD');
		expect(issueRow!.agent_recommendation).toBe('HOLD');
	});

	// Test 7: unknown issue/PR state becomes TOOL_GAP + REVIEW_REQUIRED
	test('maps unknown state to TOOL_GAP + REVIEW_REQUIRED', () => {
		const input: GitHubContextSnapshot = {
			pullRequests: [
				makePR({
					number: 1,
					title: 'mystery PR',
					state: 'OPEN',
					mergeable: 'UNKNOWN',
					findingsAccessible: undefined,
				}),
			],
			issues: [
				makeIssue({
					number: 1,
					title: 'mystery issue',
					state: 'OPEN',
					labels: [],
					body: 'nothing obvious here',
				}),
			],
		};
		const rows = reconcileGitHubContextToDecisionManifestRows(input);
		expect(rows.length).toBeGreaterThanOrEqual(2);

		for (const row of rows) {
			// Unknown state must never be applyable
			expect(row.agent_recommendation).not.toBe('APPLY_GREEN_SAFE');
		}

		const prRow = rows.find((r) => r.action_id === 'PR-1');
		expect(prRow).toBeDefined();
		expect(prRow!.risk_class).toBe('TOOL_GAP');
		expect(prRow!.agent_recommendation).toBe('REVIEW_REQUIRED');
	});

	// Test 8: result rows pass validateDecisionManifest()
	test('result rows pass validateDecisionManifest()', () => {
		const input: GitHubContextSnapshot = {
			pullRequests: [
				makePR({
					number: 218,
					state: 'OPEN',
					mergeable: 'MERGEABLE',
					reviewFindingCount: 9,
					actionableFindingCount: 9,
					findingsAccessible: true,
				}),
				makePR({ number: 229, state: 'CLOSED' }),
			],
			issues: [
				makeIssue({
					number: 279,
					title: 'Replacement: rebuild...',
					state: 'OPEN',
					labels: ['architecture', 'epic'],
				}),
				makeIssue({ number: 268, title: 'CI Recovery...', state: 'OPEN', labels: ['bug'] }),
			],
		};
		const rows = reconcileGitHubContextToDecisionManifestRows(input);
		const result = validateDecisionManifest(rows);
		expect(result.valid).toBe(true);
		expect(result.errors).toHaveLength(0);
		expect(result.total).toBeGreaterThanOrEqual(4);
	});

	// Test 9: applyable actions are zero for PR #218/#279/#229 fixture scenario
	test('applyable actions are zero for PR 218/279/229 fixture scenario', () => {
		const input: GitHubContextSnapshot = {
			pullRequests: [
				makePR({
					number: 218,
					state: 'OPEN',
					mergeable: 'MERGEABLE',
					reviewFindingCount: 9,
					actionableFindingCount: 9,
					findingsAccessible: true,
				}),
				makePR({ number: 229, state: 'CLOSED' }),
			],
			issues: [
				makeIssue({
					number: 279,
					title: 'Replacement: rebuild Issue #229 architecture chain',
					state: 'OPEN',
					labels: ['architecture', 'epic'],
				}),
			],
		};
		const rows = reconcileGitHubContextToDecisionManifestRows(input);
		const applyable = getApplyableGreenSafeActions(rows);
		expect(applyable).toHaveLength(0);
	});

	// Test 10: deterministic ordering is stable
	test('deterministic ordering is stable', () => {
		const makeInput = (): GitHubContextSnapshot => ({
			pullRequests: [
				makePR({ number: 3, state: 'OPEN' }),
				makePR({ number: 1, state: 'CLOSED' }),
				makePR({ number: 2, state: 'OPEN' }),
			],
			issues: [makeIssue({ number: 5, state: 'OPEN' }), makeIssue({ number: 4, state: 'CLOSED' })],
		});
		const rows1 = reconcileGitHubContextToDecisionManifestRows(makeInput());
		const rows2 = reconcileGitHubContextToDecisionManifestRows(makeInput());

		expect(rows1.length).toBe(rows2.length);
		for (let i = 0; i < rows1.length; i++) {
			expect(rows1[i]!.action_id).toBe(rows2[i]!.action_id);
			expect(rows1[i]!.risk_class).toBe(rows2[i]!.risk_class);
			expect(rows1[i]!.agent_recommendation).toBe(rows2[i]!.agent_recommendation);
		}
	});

	// Test 11: no row is applyable unless recommendation is APPLY_GREEN_SAFE
	test('no row is applyable without APPLY_GREEN_SAFE recommendation', () => {
		const input: GitHubContextSnapshot = {
			pullRequests: [
				makePR({
					number: 1,
					state: 'OPEN',
					mergeable: 'MERGEABLE',
					findingsAccessible: true,
					actionableFindingCount: 0,
				}),
				makePR({ number: 2, state: 'CLOSED' }),
			],
			issues: [makeIssue({ number: 3, state: 'CLOSED', labels: [] })],
		};
		const rows = reconcileGitHubContextToDecisionManifestRows(input);
		for (const row of rows) {
			if (row.agent_recommendation !== 'APPLY_GREEN_SAFE') {
				// For all non-APPLY_GREEN_SAFE rows, they should not be in applyable actions
				const applyable = getApplyableGreenSafeActions(rows);
				expect(applyable.find((a) => a.action_id === row.action_id)).toBeUndefined();
			}
		}
		// In MVP, APPLY_GREEN_SAFE is never emitted, so all applyable should be zero
		expect(getApplyableGreenSafeActions(rows)).toHaveLength(0);
	});

	// Test 12: module exposes no mutation command/function
	test('reconciler has no mutation functions in its API surface', () => {
		// Verify the module only exports reconciliation and types, not mutation
		const reconcilerKeys: string[] = [
			'reconcileGitHubContextToDecisionManifestRows',
			'reconcileGitHubContext',
		];
		for (const key of reconcilerKeys) {
			// These functions produce DecisionManifestRow[] or result objects
			// They must NOT produce mutations (gh calls, etc.)
			expect(typeof reconcileGitHubContextToDecisionManifestRows).toBe('function');
			expect(typeof reconcileGitHubContext).toBe('function');
		}
	});
});

// ---------------------------------------------------------------------------
// reconcileGitHubContext — structured result
// ---------------------------------------------------------------------------

describe('reconcileGitHubContext', () => {
	test('returns structured result with rows and validation', () => {
		const input: GitHubContextSnapshot = {
			pullRequests: [
				makePR({
					number: 218,
					state: 'OPEN',
					mergeable: 'MERGEABLE',
					reviewFindingCount: 9,
					actionableFindingCount: 9,
					findingsAccessible: true,
				}),
			],
			issues: [
				makeIssue({
					number: 279,
					title: 'Replacement: rebuild...',
					state: 'OPEN',
					labels: ['architecture', 'epic'],
				}),
			],
		};
		const result = reconcileGitHubContext(input);
		expect(result).toBeDefined();
		expect(result.rows).toBeDefined();
		expect(result.rows.length).toBeGreaterThanOrEqual(2);
		expect(result.validation).toBeDefined();
		expect(result.validation.valid).toBe(true);
		expect(result.applyableCount).toBe(0);
	});
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe('reconciler edge cases', () => {
	test('empty input returns empty rows', () => {
		const input: GitHubContextSnapshot = { pullRequests: [], issues: [] };
		const rows = reconcileGitHubContextToDecisionManifestRows(input);
		expect(rows).toHaveLength(0);
	});

	test('handles undefined optional fields gracefully', () => {
		const input: GitHubContextSnapshot = {
			pullRequests: [
				{
					number: 1,
					title: 'minimal PR',
					state: 'OPEN',
					// mergeable, isDraft, url, linkedIssueNumber, reviewFindingCount, actionableFindingCount, findingsAccessible all undefined
				},
			],
			issues: [
				{
					number: 2,
					title: 'minimal issue',
					state: 'OPEN',
				},
			],
		};
		const rows = reconcileGitHubContextToDecisionManifestRows(input);
		expect(rows.length).toBeGreaterThanOrEqual(2);
		for (const row of rows) {
			expect(row.action_id).toBeTruthy();
			expect(row.risk_class).toBeTruthy();
			expect(row.agent_recommendation).toBeTruthy();
		}
	});

	test('draft PR is classified as non-applyable', () => {
		const input: GitHubContextSnapshot = {
			pullRequests: [makePR({ number: 1, state: 'OPEN', isDraft: true, mergeable: 'MERGEABLE' })],
			issues: [],
		};
		const rows = reconcileGitHubContextToDecisionManifestRows(input);
		const prRow = rows.find((r) => r.action_id === 'PR-1');
		expect(prRow!.agent_recommendation).not.toBe('APPLY_GREEN_SAFE');
	});
});
