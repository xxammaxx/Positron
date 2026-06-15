// Positron — Blueprint Launcher Tests
// PR 9: Blueprint Launcher Foundation + Validation
// Covers: parser, validation, extraction, run-plan, human question, redaction.

import { describe, test, expect, beforeEach } from 'vitest';
import {
	parseBlueprintMarkdown,
	validateBlueprint,
	extractPreferredModelRef,
	extractCostPreference,
	extractSpecKitMode,
	extractRequiredMcpServers,
	extractHumanApprovalRequired,
	createBlueprintRunPlan,
	createBlueprintStartApprovalQuestion,
	createBlueprintGateCheck,
	redactBlueprintForEvidence,
	redactBlueprintValidationForEvidence,
	redactBlueprintRunPlanForEvidence,
	generateVerificationContractDraft,
	generateContextManifestDraft,
	generateRedTestsDraft,
	isBlueprintSectionKind,
	isBlueprintValidationStatus,
	isBlueprintSecuritySeverity,
	isBlueprintGateStatus,
	isBlueprintCostPreference,
	isBlueprintRunPlanStatus,
	isParsedBlueprint,
	isBlueprintValidationResult,
	isBlueprintRunPlan,
	_resetBlueprintWarningCounter,
	type ParsedBlueprint,
	type BlueprintValidationResult,
	type BlueprintRunPlan,
	type BlueprintGateCheckResult,
} from '../blueprint-launcher.js';

function makeBlueprint(markdown: string, filename?: string): ParsedBlueprint {
	return parseBlueprintMarkdown({
		markdown,
		filename,
		createdAt: new Date().toISOString(),
	});
}

function makeValidation(blueprint: ParsedBlueprint): BlueprintValidationResult {
	return validateBlueprint(blueprint);
}

// ═════════════════════════════════════════════════════════════════════════
// Type Guards
// ═════════════════════════════════════════════════════════════════════════

describe('Type Guards', () => {
	test('isBlueprintSectionKind returns true for valid kinds', () => {
		expect(isBlueprintSectionKind('project_goal')).toBe(true);
		expect(isBlueprintSectionKind('hard_constraints')).toBe(true);
		expect(isBlueprintSectionKind('unknown')).toBe(true);
	});

	test('isBlueprintSectionKind returns false for invalid kinds', () => {
		expect(isBlueprintSectionKind('execute')).toBe(false);
		expect(isBlueprintSectionKind('')).toBe(false);
		expect(isBlueprintSectionKind(null)).toBe(false);
		expect(isBlueprintSectionKind(undefined)).toBe(false);
	});

	test('isBlueprintValidationStatus returns true for valid statuses', () => {
		expect(isBlueprintValidationStatus('pass')).toBe(true);
		expect(isBlueprintValidationStatus('partial')).toBe(true);
		expect(isBlueprintValidationStatus('fail')).toBe(true);
		expect(isBlueprintValidationStatus('blocked')).toBe(true);
	});

	test('isBlueprintValidationStatus returns false for invalid', () => {
		expect(isBlueprintValidationStatus('executing')).toBe(false);
		expect(isBlueprintValidationStatus('')).toBe(false);
	});

	test('isBlueprintCostPreference returns true for valid preferences', () => {
		expect(isBlueprintCostPreference('free_first')).toBe(true);
		expect(isBlueprintCostPreference('local_first')).toBe(true);
		expect(isBlueprintCostPreference('best_quality')).toBe(true);
		expect(isBlueprintCostPreference('ask_human')).toBe(true);
		expect(isBlueprintCostPreference('unknown')).toBe(true);
	});

	test('isBlueprintRunPlanStatus returns true for valid statuses', () => {
		expect(isBlueprintRunPlanStatus('draft')).toBe(true);
		expect(isBlueprintRunPlanStatus('waiting_for_human')).toBe(true);
		expect(isBlueprintRunPlanStatus('blocked')).toBe(true);
		expect(isBlueprintRunPlanStatus('ready_for_gate_check')).toBe(true);
	});

	test('isBlueprintRunPlanStatus returns false for invalid', () => {
		expect(isBlueprintRunPlanStatus('executing')).toBe(false);
		expect(isBlueprintRunPlanStatus('')).toBe(false);
	});

	test('isParsedBlueprint returns true for valid blueprint', () => {
		const bp = makeBlueprint('# Project Goal\nTest goal');
		expect(isParsedBlueprint(bp)).toBe(true);
	});

	test('isParsedBlueprint returns false for invalid', () => {
		expect(isParsedBlueprint(null)).toBe(false);
		expect(isParsedBlueprint({})).toBe(false);
		expect(isParsedBlueprint('string')).toBe(false);
	});

	test('isBlueprintValidationResult returns true for valid result', () => {
		const bp = makeBlueprint('# Project Goal\nTest');
		const v = validateBlueprint(bp);
		expect(isBlueprintValidationResult(v)).toBe(true);
	});

	test('isBlueprintValidationResult returns false for invalid', () => {
		expect(isBlueprintValidationResult(null)).toBe(false);
		expect(isBlueprintValidationResult({ status: 'pass' })).toBe(false);
	});

	test('isBlueprintRunPlan returns true for valid run plan', () => {
		const bp = makeBlueprint('# Project Goal\nTest\n# Hard Constraints\nNo secrets\n# Source of Truth\nGitHub\n# Human Approval\nRequired\n# Verification Contract\nTests\n# Evidence Requirements\nRequired\n# Expected Result Format\nJSON\n# Software Capability Delta\nNone');
		const v = validateBlueprint(bp);
		const rp = createBlueprintRunPlan({
			blueprint: bp,
			validation: v,
			createdAt: new Date().toISOString(),
		});
		expect(isBlueprintRunPlan(rp)).toBe(true);
	});

	test('isBlueprintRunPlan returns false for invalid', () => {
		expect(isBlueprintRunPlan(null)).toBe(false);
		expect(isBlueprintRunPlan({ runPlanId: 'x' })).toBe(false);
	});
});

// ═════════════════════════════════════════════════════════════════════════
// Phase 4 — Markdown Parser
// ═════════════════════════════════════════════════════════════════════════

describe('parseBlueprintMarkdown', () => {
	test('parses valid markdown with headings', () => {
		const md = `# Project Goal
The goal is to build a tool.

## Hard Constraints
- No secrets
- No auto-merge

## Expected Result Format
JSON output`;

		const bp = makeBlueprint(md);
		expect(bp.blueprintId).toBeTruthy();
		expect(bp.title).toBe('Project Goal');
		expect(bp.sections.length).toBeGreaterThanOrEqual(2);
		expect(bp.sections.some((s) => s.kind === 'project_goal')).toBe(true);
		expect(bp.sections.some((s) => s.kind === 'hard_constraints')).toBe(true);
	});

	test('maps German headings', () => {
		const md = `# Projektziel
Das Ziel ist ein Tool.

## Harte Einschränkungen
- Keine Secrets

## Erwartetes Ergebnisformat
JSON`;

		const bp = makeBlueprint(md);
		expect(bp.sections.some((s) => s.kind === 'project_goal')).toBe(true);
		expect(bp.sections.some((s) => s.kind === 'hard_constraints')).toBe(true);
		expect(bp.sections.some((s) => s.kind === 'expected_result_format')).toBe(true);
	});

	test('unknown headings become unknown', () => {
		const md = `# Some Random Heading
Stuff here.`;

		const bp = makeBlueprint(md);
		expect(bp.sections[0]?.kind).toBe('unknown');
	});

	test('hash is stable for same input', () => {
		const md = 'Test content';
		const bp1 = makeBlueprint(md);
		const bp2 = makeBlueprint(md);
		expect(bp1.rawMarkdownHash).toBe(bp2.rawMarkdownHash);
	});

	test('hash differs for different input', () => {
		const bp1 = makeBlueprint('Content A');
		const bp2 = makeBlueprint('Content B');
		expect(bp1.rawMarkdownHash).not.toBe(bp2.rawMarkdownHash);
	});

	test('returns correct line numbers for sections', () => {
		const md = `# Project Goal
Line 2 content
Line 3 content

## Hard Constraints
Line 6 content`;

		const bp = makeBlueprint(md);
		const goalSection = bp.sections.find((s) => s.kind === 'project_goal');
		expect(goalSection).toBeDefined();
		expect(goalSection!.content).toContain('Line 2 content');
	});

	test('handles empty markdown', () => {
		const bp = makeBlueprint('');
		expect(bp.sections).toHaveLength(0);
		expect(bp.title).toBeUndefined();
	});

	test('handles markdown with only whitespace', () => {
		const bp = makeBlueprint('   \n\n  ');
		expect(bp.sections).toHaveLength(0);
	});

	test('includes filename when provided', () => {
		const bp = makeBlueprint('# Test', 'my-blueprint.md');
		expect(bp.filename).toBe('my-blueprint.md');
	});
});

// ═════════════════════════════════════════════════════════════════════════
// Phase 5 — Validation + Security Checks
// ═════════════════════════════════════════════════════════════════════════

describe('validateBlueprint', () => {
	beforeEach(() => {
		_resetBlueprintWarningCounter();
	});

	// ── Secret Detection ───────────────────────────────────────────────

	test('blocks ghp_ token', () => {
		const md = '# Project Goal\nGITHUB_TOKEN=ghp_abcdefghijklmnopqrstuvwxyz1234567890AB';
		const v = makeValidation(makeBlueprint(md));
		expect(v.status).toBe('fail');
		expect(v.blockedReasons.some((r) => r.includes('ghp_'))).toBe(true);
	});

	test('blocks github_pat_ token', () => {
		const md = '# Project Goal\nGITHUB_TOKEN=github_pat_abcdefghijklmnopqrstuvwxyz1234567890AB';
		const v = makeValidation(makeBlueprint(md));
		expect(v.status).toBe('fail');
		expect(v.blockedReasons.some((r) => r.includes('github_pat_'))).toBe(true);
	});

	test('blocks sk- API key', () => {
		const md = '# Project Goal\nOPENAI_KEY=sk-abcdefghijklmnopqrstuvwxyz1234567890';
		const v = makeValidation(makeBlueprint(md));
		expect(v.status).toBe('fail');
		expect(v.blockedReasons.some((r) => r.includes('sk-'))).toBe(true);
	});

	test('blocks AIza API key', () => {
		const md = '# Project Goal\nGOOGLE_KEY=AIzaabcdefghijklmnopqrstuvwxyz1234567890';
		const v = makeValidation(makeBlueprint(md));
		expect(v.status).toBe('fail');
		expect(v.blockedReasons.some((r) => r.includes('AIza'))).toBe(true);
	});

	test('blocks anthropic_ key', () => {
		const md = '# Project Goal\nANTHROPIC_KEY=anthropic_abcdefghijklmnopqrstuvwxyz';
		const v = makeValidation(makeBlueprint(md));
		expect(v.status).toBe('fail');
	});

	test('blocks Bearer token', () => {
		const md = '# Project Goal\nAuthorization: Bearer abcdefghijklmnopqrstuvwxyz1234567890ABCDEFGH';
		const v = makeValidation(makeBlueprint(md));
		expect(v.status).toBe('fail');
	});

	test('blocks private key material', () => {
		const md = '# Project Goal\n-----BEGIN PRIVATE KEY-----\nMIIEpQIBAAKCAQEA...\n-----END PRIVATE KEY-----';
		const v = makeValidation(makeBlueprint(md));
		expect(v.status).toBe('fail');
	});

	// ── Dangerous Operations ───────────────────────────────────────────

	test('blocks auto-merge request', () => {
		const md = '# Project Goal\nauto_merge: true';
		const v = makeValidation(makeBlueprint(md));
		expect(v.status).toBe('fail');
		expect(v.blockedReasons.some((r) => r.toLowerCase().includes('auto-merge'))).toBe(true);
	});

	test('blocks auto_merge: yes', () => {
		const md = '# Project Goal\nauto_merge: yes';
		const v = makeValidation(makeBlueprint(md));
		expect(v.status).toBe('fail');
	});

	test('blocks unrestricted MCP', () => {
		const md = '# Project Goal\nWe need unrestricted_mcp access';
		const v = makeValidation(makeBlueprint(md));
		expect(v.status).toBe('fail');
		expect(v.blockedReasons.some((r) => r.includes('Unrestricted MCP'))).toBe(true);
	});

	test('blocks unrestricted filesystem', () => {
		const md = '# Project Goal\nunrestricted filesystem access needed';
		const v = makeValidation(makeBlueprint(md));
		expect(v.status).toBe('fail');
		expect(v.blockedReasons.some((r) => r.includes('filesystem'))).toBe(true);
	});

	test('blocks unrestricted shell', () => {
		const md = '# Project Goal\nunrestricted shell access';
		const v = makeValidation(makeBlueprint(md));
		expect(v.status).toBe('fail');
		expect(v.blockedReasons.some((r) => r.includes('shell'))).toBe(true);
	});

	test('blocks sudo', () => {
		const md = '# Project Goal\nNeed sudo for installation';
		const v = makeValidation(makeBlueprint(md));
		expect(v.status).toBe('fail');
		expect(v.blockedReasons.some((r) => r.includes('sudo'))).toBe(true);
	});

	test('blocks rm -rf', () => {
		const md = '# Project Goal\nClean up with rm -rf /tmp/build';
		const v = makeValidation(makeBlueprint(md));
		expect(v.status).toBe('fail');
	});

	test('blocks force push', () => {
		const md = '# Project Goal\nforce_push enabled';
		const v = makeValidation(makeBlueprint(md));
		expect(v.status).toBe('fail');
		expect(v.blockedReasons.some((r) => r.includes('Force push'))).toBe(true);
	});

	test('blocks disable safety gates', () => {
		const md = '# Project Goal\ndisable_safety_gates: true';
		const v = makeValidation(makeBlueprint(md));
		expect(v.status).toBe('fail');
	});

	test('blocks bypass human approval', () => {
		const md = '# Project Goal\nbypass_human_approval: true';
		const v = makeValidation(makeBlueprint(md));
		expect(v.status).toBe('fail');
		expect(v.blockedReasons.some((r) => r.includes('Bypass human'))).toBe(true);
	});

	test('blocks global AGENTS.md import', () => {
		const md = '# Project Goal\nimport global AGENTS.md config';
		const v = makeValidation(makeBlueprint(md));
		expect(v.status).toBe('fail');
	});

	test('blocks global OpenCode config import', () => {
		const md = '# Project Goal\nimport global OpenCode config';
		const v = makeValidation(makeBlueprint(md));
		expect(v.status).toBe('fail');
	});

	test('blocks global MCP config import', () => {
		const md = '# Project Goal\nimport global MCP config';
		const v = makeValidation(makeBlueprint(md));
		expect(v.status).toBe('fail');
	});

	test('blocks database drop', () => {
		const md = '# Project Goal\nDROP TABLE users';
		const v = makeValidation(makeBlueprint(md));
		expect(v.status).toBe('fail');
	});

	// ── Required Sections ──────────────────────────────────────────────

	test('missing required sections yields partial', () => {
		const md = '# Project Goal\nJust a goal, nothing else.';
		const v = makeValidation(makeBlueprint(md));
		expect(v.status).toBe('partial');
		expect(v.missingRequiredSections.length).toBeGreaterThan(0);
	});

	test('clean blueprint passes', () => {
		const md = `# Project Goal
Test goal

# Hard Constraints
No secrets, no auto-merge

# Source of Truth
GitHub Issues

# Human Approval
Required

# Verification Contract
Tests must pass

# Evidence Requirements
Log all decisions

# Expected Result Format
JSON output

# Software Capability Delta
Now blueprints can be validated`;

		const v = makeValidation(makeBlueprint(md));
		expect(v.status).toBe('pass');
		expect(v.blockedReasons).toHaveLength(0);
	});

	test('missing human approval section triggers warning but not failure', () => {
		// A blueprint can be partial if human_approval_rules is missing
		const md = `# Project Goal
Goal

# Hard Constraints
Constraints

# Source of Truth
GitHub

# Verification Contract
Contract

# Evidence Requirements
Evidence

# Expected Result Format
Format

# Software Capability Delta
Delta`;

		const v = makeValidation(makeBlueprint(md));
		// Partial because human_approval_rules is required for PASS
		expect(v.status).toBe('partial');
		expect(v.missingRequiredSections).toContain('human_approval_rules');
	});

	// ── Warning Patterns ───────────────────────────────────────────────

	test('warns on best_quality without budget hint', () => {
		const md = `# Project Goal
Test

# Cost Preference
best quality

# Hard Constraints
No secrets

# Source of Truth
GitHub

# Human Approval
Required

# Verification Contract
Tests

# Evidence Requirements
Required

# Expected Result Format
JSON

# Software Capability Delta
None`;

		const v = makeValidation(makeBlueprint(md));
		// Should pass since all required sections are there
		expect(v.status).toBe('pass');
		// But should have a warning about best_quality without budget
		expect(v.warnings.some((w) => w.message.includes('best_quality'))).toBe(true);
	});

	// ── Human Approval Detection ───────────────────────────────────────

	test('requires human approval by default when section missing', () => {
		const bp = makeBlueprint('# Project Goal\nTest');
		expect(extractHumanApprovalRequired(bp)).toBe(true);
	});

	test('detects human approval none', () => {
		const md = '# Human Approval\nhuman_approval: none';
		const bp = makeBlueprint(md);
		expect(extractHumanApprovalRequired(bp)).toBe(false);
	});

	test('detects no human approval', () => {
		const md = '# Human Approval\nno human approval needed';
		const bp = makeBlueprint(md);
		expect(extractHumanApprovalRequired(bp)).toBe(false);
	});

	test('detects human approval required', () => {
		const md = '# Human Approval\nhuman_approval: required';
		const bp = makeBlueprint(md);
		expect(extractHumanApprovalRequired(bp)).toBe(true);
	});
});

// ═════════════════════════════════════════════════════════════════════════
// Phase 6 — Extraction Helpers
// ═════════════════════════════════════════════════════════════════════════

describe('Extraction Helpers', () => {
	test('extracts preferred model ref', () => {
		const md = '# Preferred Model Profile\nmodel: ollama/qwen2.5';
		const bp = makeBlueprint(md);
		expect(extractPreferredModelRef(bp)).toBe('ollama/qwen2.5');
	});

	test('extracts preferred model with notation variations', () => {
		const md = '# Preferred Model Profile\nModell: claude-sonnet';
		const bp = makeBlueprint(md);
		expect(extractPreferredModelRef(bp)).toBe('claude-sonnet');
	});

	test('returns undefined without preferred model section', () => {
		const bp = makeBlueprint('# Project Goal\nTest');
		expect(extractPreferredModelRef(bp)).toBeUndefined();
	});

	test('extracts cost preference free_first', () => {
		const md = '# Cost Preference\nfree-first';
		const bp = makeBlueprint(md);
		expect(extractCostPreference(bp)).toBe('free_first');
	});

	test('extracts cost preference local_first', () => {
		const md = '# Cost Preference\nlocal-first';
		const bp = makeBlueprint(md);
		expect(extractCostPreference(bp)).toBe('local_first');
	});

	test('extracts cost preference best_quality', () => {
		const md = '# Cost Preference\nbest quality';
		const bp = makeBlueprint(md);
		expect(extractCostPreference(bp)).toBe('best_quality');
	});

	test('extracts cost preference ask_human', () => {
		const md = '# Cost Preference\nask human';
		const bp = makeBlueprint(md);
		expect(extractCostPreference(bp)).toBe('ask_human');
	});

	test('cost preference defaults to unknown', () => {
		const bp = makeBlueprint('# Project Goal\nTest');
		expect(extractCostPreference(bp)).toBe('unknown');
	});

	test('extracts Spec Kit adapter_bridge mode', () => {
		const md = '# Spec Kit Mode\nadapter_bridge';
		const bp = makeBlueprint(md);
		expect(extractSpecKitMode(bp)).toBe('adapter_bridge');
	});

	test('extracts Spec Kit opencode_slash_commands mode', () => {
		const md = '# Spec Kit Mode\nopencode_slash_commands';
		const bp = makeBlueprint(md);
		expect(extractSpecKitMode(bp)).toBe('opencode_slash_commands');
	});

	test('extracts Spec Kit standalone_cli mode', () => {
		const md = '# Spec Kit Mode\nstandalone_cli';
		const bp = makeBlueprint(md);
		expect(extractSpecKitMode(bp)).toBe('standalone_cli');
	});

	test('extracts required MCP servers from list', () => {
		const md = '# MCP Requirements\n- github\n- filesystem\n- playwright';
		const bp = makeBlueprint(md);
		const servers = extractRequiredMcpServers(bp);
		expect(servers).toContain('github');
		expect(servers).toContain('filesystem');
		expect(servers).toContain('playwright');
	});

	test('extracts empty MCP list when no section', () => {
		const bp = makeBlueprint('# Project Goal\nTest');
		expect(extractRequiredMcpServers(bp)).toHaveLength(0);
	});

	test('normalizes MCP server names to lowercase', () => {
		const md = '# MCP Requirements\n- GitHub\n- FileSystem\n- Playwright';
		const bp = makeBlueprint(md);
		const servers = extractRequiredMcpServers(bp);
		expect(servers).toContain('github');
		expect(servers).toContain('filesystem');
		expect(servers).toContain('playwright');
	});
});

// ═════════════════════════════════════════════════════════════════════════
// Phase 7 — Run-Plan Draft
// ═════════════════════════════════════════════════════════════════════════

describe('createBlueprintRunPlan', () => {
	test('does not execute anything', () => {
		const bp = makeBlueprint('# Project Goal\nTest');
		const v = makeValidation(bp);
		const rp = createBlueprintRunPlan({
			blueprint: bp,
			validation: v,
			createdAt: new Date().toISOString(),
		});
		expect(rp.runPlanId).toBeTruthy();
		expect(rp.status).toBeDefined();
		// No execution fields
		expect(rp).not.toHaveProperty('executedAt');
		expect(rp).not.toHaveProperty('executionResult');
	});

	test('blocked blueprint creates blocked run plan', () => {
		const md = '# Project Goal\nGITHUB_TOKEN=ghp_abcdefghijklmnopqrstuvwxyz1234567890AB';
		const bp = makeBlueprint(md);
		const v = makeValidation(bp);
		const rp = createBlueprintRunPlan({
			blueprint: bp,
			validation: v,
			createdAt: new Date().toISOString(),
		});
		expect(rp.status).toBe('blocked');
		expect(rp.blockedReasons.length).toBeGreaterThan(0);
	});

	test('partial blueprint creates draft or waiting_for_human', () => {
		const bp = makeBlueprint('# Project Goal\nTest');
		const v = makeValidation(bp);
		const rp = createBlueprintRunPlan({
			blueprint: bp,
			validation: v,
			createdAt: new Date().toISOString(),
		});
		expect(['draft', 'waiting_for_human']).toContain(rp.status);
	});

	test('pass blueprint creates ready_for_gate_check or waiting_for_human', () => {
		const md = `# Project Goal\nGoal
# Hard Constraints\nConstraints
# Source of Truth\nGitHub
# Human Approval\nRequired
# Verification Contract\nContract
# Evidence Requirements\nEvidence
# Expected Result Format\nFormat
# Software Capability Delta\nDelta`;

		const bp = makeBlueprint(md);
		const v = makeValidation(bp);
		const rp = createBlueprintRunPlan({
			blueprint: bp,
			validation: v,
			createdAt: new Date().toISOString(),
		});
		expect(['ready_for_gate_check', 'waiting_for_human']).toContain(rp.status);
	});

	test('generates verification contract draft', () => {
		const md = `# Project Goal\nBuild tool
# Verification Contract\nTests must pass`;
		const bp = makeBlueprint(md);
		const draft = generateVerificationContractDraft(bp, makeValidation(bp));
		expect(draft).toContain('Build tool');
		expect(draft).toContain('Tests must pass');
	});

	test('generates context manifest draft', () => {
		const md = `# Cold Context\nContext info
# Hard Constraints\nConstraints`;
		const bp = makeBlueprint(md);
		const draft = generateContextManifestDraft(bp);
		expect(draft).toContain('Context info');
		expect(draft).toContain('Constraints');
	});

	test('generates red tests draft', () => {
		const md = '# Red Tests\n- Test 1\n- Test 2';
		const bp = makeBlueprint(md);
		const tests = generateRedTestsDraft(bp);
		expect(tests).toContain('- Test 1');
		expect(tests).toContain('- Test 2');
	});

	test('empty red tests without section', () => {
		const bp = makeBlueprint('# Project Goal\nTest');
		expect(generateRedTestsDraft(bp)).toHaveLength(0);
	});

	test('creates blueprint gate check with all not_checked', () => {
		const gc = createBlueprintGateCheck('bp-1', 'rp-1');
		expect(gc.overall).toBe('not_checked');
		expect(gc.blueprintValidation).toBe('not_checked');
		expect(gc.providerProfile).toBe('not_checked');
		expect(gc.modelWarmup).toBe('not_checked');
		expect(gc.specKitSync).toBe('not_checked');
		expect(gc.mcpWarmup).toBe('not_checked');
		expect(gc.humanApproval).toBe('not_checked');
		expect(gc.toolGateway).toBe('not_checked');
	});

	test('run plan includes required gates for model', () => {
		const md = `# Project Goal\nGoal
# Preferred Model Profile\nmodel: ollama/qwen2.5
# Hard Constraints\nConstraints
# Source of Truth\nGitHub
# Human Approval\nRequired
# Verification Contract\nContract
# Evidence Requirements\nEvidence
# Expected Result Format\nFormat
# Software Capability Delta\nDelta`;

		const bp = makeBlueprint(md);
		const v = makeValidation(bp);
		const rp = createBlueprintRunPlan({
			blueprint: bp,
			validation: v,
			createdAt: new Date().toISOString(),
		});
		expect(rp.requiredGates).toContain('model_real_run');
	});

	test('run plan includes required gates for MCP', () => {
		const md = `# Project Goal\nGoal
# MCP Requirements\n- github
# Hard Constraints\nConstraints
# Source of Truth\nGitHub
# Human Approval\nRequired
# Verification Contract\nContract
# Evidence Requirements\nEvidence
# Expected Result Format\nFormat
# Software Capability Delta\nDelta`;

		const bp = makeBlueprint(md);
		const v = makeValidation(bp);
		const rp = createBlueprintRunPlan({
			blueprint: bp,
			validation: v,
			createdAt: new Date().toISOString(),
		});
		expect(rp.requiredGates).toContain('mcp_real_warmup');
	});

	test('run plan always includes tool_gateway gate', () => {
		const bp = makeBlueprint('# Project Goal\nTest');
		const v = makeValidation(bp);
		const rp = createBlueprintRunPlan({
			blueprint: bp,
			validation: v,
			createdAt: new Date().toISOString(),
		});
		expect(rp.requiredGates).toContain('tool_gateway');
	});
});

// ═════════════════════════════════════════════════════════════════════════
// Phase 8 — Human Question Mapping
// ═════════════════════════════════════════════════════════════════════════

describe('createBlueprintStartApprovalQuestion', () => {
	test('creates question with correct type', () => {
		const bp = makeBlueprint('# Project Goal\nTest');
		const v = makeValidation(bp);
		const rp = createBlueprintRunPlan({
			blueprint: bp,
			validation: v,
			createdAt: new Date().toISOString(),
		});

		const q = createBlueprintStartApprovalQuestion({
			blueprint: bp,
			validation: v,
			runPlan: rp,
			createdAt: new Date().toISOString(),
		});

		expect(q.type).toBe('blueprint_start_approval');
		expect(q.status).toBe('open');
		expect(q.requestedBy).toBe('blueprint');
	});

	test('critical warnings default to DENY', () => {
		const md = '# Project Goal\nGITHUB_TOKEN=ghp_abcdefghijklmnopqrstuvwxyz1234567890AB';
		const bp = makeBlueprint(md);
		const v = makeValidation(bp);
		const rp = createBlueprintRunPlan({
			blueprint: bp,
			validation: v,
			createdAt: new Date().toISOString(),
		});

		const q = createBlueprintStartApprovalQuestion({
			blueprint: bp,
			validation: v,
			runPlan: rp,
			createdAt: new Date().toISOString(),
		});

		expect(q.riskLevel).toBe('critical');
		expect(q.defaultDecision).toBe('DENY');
		expect(q.allowedDecisions).toContain('DENY');
	});

	test('ALLOW does not imply execution — question text clarifies', () => {
		const bp = makeBlueprint('# Project Goal\nTest');
		const v = makeValidation(bp);
		const rp = createBlueprintRunPlan({
			blueprint: bp,
			validation: v,
			createdAt: new Date().toISOString(),
		});

		const q = createBlueprintStartApprovalQuestion({
			blueprint: bp,
			validation: v,
			runPlan: rp,
			createdAt: new Date().toISOString(),
		});

		expect(q.question).toContain('ALLOW enables gate check only');
		expect(q.question).toContain('NOT execution');
	});

	test('question does not contain raw secrets', () => {
		const md = '# Project Goal\nGITHUB_TOKEN=ghp_abcdefghijklmnopqrstuvwxyz1234567890AB';
		const bp = makeBlueprint(md);
		const v = makeValidation(bp);
		const rp = createBlueprintRunPlan({
			blueprint: bp,
			validation: v,
			createdAt: new Date().toISOString(),
		});

		const q = createBlueprintStartApprovalQuestion({
			blueprint: bp,
			validation: v,
			runPlan: rp,
			createdAt: new Date().toISOString(),
		});

		// Question text should NOT contain the raw token
		expect(q.question).not.toContain('ghp_abcdefghijklmnopqrstuvwxyz1234567890AB');
	});

	test('defaultDecision is never ALLOW', () => {
		const md = `# Project Goal\nGoal
# Hard Constraints\nConstraints
# Source of Truth\nGitHub
# Human Approval\nRequired
# Verification Contract\nContract
# Evidence Requirements\nEvidence
# Expected Result Format\nFormat
# Software Capability Delta\nDelta`;

		const bp = makeBlueprint(md);
		const v = makeValidation(bp);
		const rp = createBlueprintRunPlan({
			blueprint: bp,
			validation: v,
			createdAt: new Date().toISOString(),
		});

		const q = createBlueprintStartApprovalQuestion({
			blueprint: bp,
			validation: v,
			runPlan: rp,
			createdAt: new Date().toISOString(),
		});

		expect(q.defaultDecision).not.toBe('ALLOW');
	});

	test('high risk level with high severity warnings', () => {
		const md = `# Project Goal\nGoal
# Hard Constraints\nConstraints
# Source of Truth\nGitHub
# Verification Contract\nContract
# Evidence Requirements\nEvidence
# Expected Result Format\nFormat
# Software Capability Delta\nDelta`;

		// Missing human_approval_rules triggers a high severity warning
		const bp = makeBlueprint(md);
		const v = makeValidation(bp);
		const rp = createBlueprintRunPlan({
			blueprint: bp,
			validation: v,
			createdAt: new Date().toISOString(),
		});

		const q = createBlueprintStartApprovalQuestion({
			blueprint: bp,
			validation: v,
			runPlan: rp,
			createdAt: new Date().toISOString(),
		});

		expect(['high', 'medium']).toContain(q.riskLevel);
		expect(q.defaultDecision).not.toBe('ALLOW');
	});

	test('question includes blueprint metadata but no secrets', () => {
		const bp = makeBlueprint('# Project Goal\nTest goal\n# Hard Constraints\nConstraints');
		const v = makeValidation(bp);
		const rp = createBlueprintRunPlan({
			blueprint: bp,
			validation: v,
			createdAt: new Date().toISOString(),
		});

		const q = createBlueprintStartApprovalQuestion({
			blueprint: bp,
			validation: v,
			runPlan: rp,
			createdAt: new Date().toISOString(),
		});

		expect(q.question).toContain('Project Goal');
		expect(q.question).toContain(bp.blueprintId);
	});
});

// ═════════════════════════════════════════════════════════════════════════
// Phase 9 — Evidence Redaction
// ═════════════════════════════════════════════════════════════════════════

describe('Evidence Redaction', () => {
	test('redacted blueprint excludes raw markdown content', () => {
		const md = '# Project Goal\nSecret: ghp_abcdefghijklmnopqrstuvwxyz123456';
		const bp = makeBlueprint(md);
		const redacted = redactBlueprintForEvidence(bp);

		expect(redacted.blueprintId).toBe(bp.blueprintId);
		expect(redacted.sectionKinds).toContain('project_goal');
		// Should NOT have the raw content
		expect(redacted).not.toHaveProperty('sections');
		expect(redacted).not.toHaveProperty('rawMarkdown');
	});

	test('redacted validation excludes detailed warnings', () => {
		const md = '# Project Goal\nghp_abcdefghijklmnopqrstuvwxyz1234567890AB';
		const bp = makeBlueprint(md);
		const v = makeValidation(bp);
		const redacted = redactBlueprintValidationForEvidence(v);

		expect(redacted.status).toBe(v.status);
		expect(redacted.criticalCount).toBeGreaterThan(0);
		// Should have counts, not detailed warning objects
		expect(redacted).not.toHaveProperty('warnings');
	});

	test('redacted run plan excludes draft content', () => {
		const md = '# Project Goal\nTest';
		const bp = makeBlueprint(md);
		const v = makeValidation(bp);
		const rp = createBlueprintRunPlan({
			blueprint: bp,
			validation: v,
			createdAt: new Date().toISOString(),
		});
		const redacted = redactBlueprintRunPlanForEvidence(rp);

		expect(redacted.runPlanId).toBe(rp.runPlanId);
		expect(redacted.status).toBe(rp.status);
		// Should NOT contain verbose drafts
		expect(redacted).not.toHaveProperty('verificationContractDraft');
		expect(redacted).not.toHaveProperty('contextManifestDraft');
		expect(redacted).not.toHaveProperty('redTestsDraft');
	});

	test('redacted blocked reasons do not contain secrets', () => {
		const md = '# Project Goal\nGITHUB_TOKEN=ghp_abcdefghijklmnopqrstuvwxyz1234567890AB';
		const bp = makeBlueprint(md);
		const v = makeValidation(bp);
		const redacted = redactBlueprintValidationForEvidence(v);

		for (const reason of redacted.blockedReasons) {
			expect(reason).not.toContain('ghp_abcdefghijklmnopqrstuvwxyz1234567890AB');
		}
	});

	test('redaction preserves hash', () => {
		const md = '# Test';
		const bp = makeBlueprint(md);
		const redacted = redactBlueprintForEvidence(bp);
		expect(redacted.rawMarkdownHash).toBe(bp.rawMarkdownHash);
	});
});
