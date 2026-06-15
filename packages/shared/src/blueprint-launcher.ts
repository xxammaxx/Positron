// Positron — Blueprint Launcher Foundation + Validation
// PR 9: Blueprint Launcher Foundation
// ---------------------------------------------------------------------------
// This module defines blueprint types, Markdown parser, validation rules,
// security warnings, extraction helpers, run-plan drafts, human question
// mapping, and evidence redaction.
//
// SECURITY: This module is PURE TYPES, VALIDATION, and POLICY.
// Blueprint start-run is NOT tool execution. It creates a run plan,
// validates gates, and requests human approval only.
// No OpenCode, MCP, Spec Kit, or tool execution occurs.
// No install, no download, no curl pipe-bash.
// Secrets and private paths are NEVER in evidence output.
// ---------------------------------------------------------------------------

import {
	type HumanDecision,
	type HumanQuestion,
	type HumanQuestionRequester,
	type HumanQuestionType,
	type HumanRiskLevel,
	createHumanQuestionId,
	isHumanDecision,
} from './human-oversight.js';

// ─── Blueprint Section Kinds ────────────────────────────────────────────────

export type BlueprintSectionKind =
	| 'project_goal'
	| 'architecture_principles'
	| 'hard_constraints'
	| 'cold_context'
	| 'warm_context'
	| 'hot_context'
	| 'source_of_truth'
	| 'do_not_load'
	| 'do_not_touch'
	| 'mcp_requirements'
	| 'opencode_provider_rules'
	| 'preferred_model_profile'
	| 'cost_preference'
	| 'spec_kit_mode'
	| 'human_approval_rules'
	| 'stop_ask_protocol'
	| 'verification_contract'
	| 'red_tests'
	| 'ci_security_gates'
	| 'evidence_requirements'
	| 'reviewer_agent_requirements'
	| 'sandbox_requirements'
	| 'expected_result_format'
	| 'software_capability_delta'
	| 'unknown';

export const ALL_BLUEPRINT_SECTION_KINDS: readonly BlueprintSectionKind[] = [
	'project_goal',
	'architecture_principles',
	'hard_constraints',
	'cold_context',
	'warm_context',
	'hot_context',
	'source_of_truth',
	'do_not_load',
	'do_not_touch',
	'mcp_requirements',
	'opencode_provider_rules',
	'preferred_model_profile',
	'cost_preference',
	'spec_kit_mode',
	'human_approval_rules',
	'stop_ask_protocol',
	'verification_contract',
	'red_tests',
	'ci_security_gates',
	'evidence_requirements',
	'reviewer_agent_requirements',
	'sandbox_requirements',
	'expected_result_format',
	'software_capability_delta',
	'unknown',
];

// ─── Blueprint Validation Status ────────────────────────────────────────────

export type BlueprintValidationStatus = 'pass' | 'partial' | 'fail' | 'blocked';

export const ALL_BLUEPRINT_VALIDATION_STATUSES: readonly BlueprintValidationStatus[] = [
	'pass',
	'partial',
	'fail',
	'blocked',
];

// ─── Blueprint Security Severity ────────────────────────────────────────────

export type BlueprintSecuritySeverity = 'info' | 'warning' | 'high' | 'critical';

export const ALL_BLUEPRINT_SECURITY_SEVERITIES: readonly BlueprintSecuritySeverity[] = [
	'info',
	'warning',
	'high',
	'critical',
];

// ─── Blueprint Gate Status ──────────────────────────────────────────────────

export type BlueprintGateStatus =
	| 'not_checked'
	| 'pass'
	| 'partial'
	| 'fail'
	| 'blocked';

export const ALL_BLUEPRINT_GATE_STATUSES: readonly BlueprintGateStatus[] = [
	'not_checked',
	'pass',
	'partial',
	'fail',
	'blocked',
];

// ─── Blueprint Cost Preference ──────────────────────────────────────────────

export type BlueprintCostPreference =
	| 'free_first'
	| 'local_first'
	| 'best_quality'
	| 'ask_human'
	| 'unknown';

export const ALL_BLUEPRINT_COST_PREFERENCES: readonly BlueprintCostPreference[] = [
	'free_first',
	'local_first',
	'best_quality',
	'ask_human',
	'unknown',
];

// ─── Blueprint Run-Plan Status ──────────────────────────────────────────────

export type BlueprintRunPlanStatus =
	| 'draft'
	| 'waiting_for_human'
	| 'blocked'
	| 'ready_for_gate_check';

export const ALL_BLUEPRINT_RUN_PLAN_STATUSES: readonly BlueprintRunPlanStatus[] = [
	'draft',
	'waiting_for_human',
	'blocked',
	'ready_for_gate_check',
];

// ─── Parsed Blueprint Types ─────────────────────────────────────────────────

export interface ParsedBlueprintSection {
	kind: BlueprintSectionKind;
	title: string;
	content: string;
	lineStart: number;
	lineEnd: number;
}

export interface ParsedBlueprint {
	blueprintId: string;
	filename?: string;
	title?: string;
	rawMarkdownHash: string;
	sections: ParsedBlueprintSection[];
	createdAt: string;
}

// ─── Blueprint Security Warning ─────────────────────────────────────────────

export interface BlueprintSecurityWarning {
	id: string;
	severity: BlueprintSecuritySeverity;
	message: string;
	sectionKind?: BlueprintSectionKind;
	line?: number;
	blocked: boolean;
}

// ─── Blueprint Validation Result ────────────────────────────────────────────

export interface BlueprintValidationResult {
	status: BlueprintValidationStatus;
	blueprintId: string;
	warnings: BlueprintSecurityWarning[];
	missingRequiredSections: BlueprintSectionKind[];
	extractedPreferredModelRef?: string;
	extractedCostPreference?: BlueprintCostPreference;
	extractedSpecKitMode?: string;
	extractedRequiredMcpServers: string[];
	requiresHumanApproval: boolean;
	blockedReasons: string[];
}

// ─── Blueprint Run-Plan ─────────────────────────────────────────────────────

export interface BlueprintRunPlan {
	runPlanId: string;
	blueprintId: string;
	status: BlueprintRunPlanStatus;
	issueNumber?: number;
	preferredModelRef?: string;
	costPreference: BlueprintCostPreference;
	specKitMode?: string;
	requiredMcpServers: string[];
	verificationContractDraft: string;
	contextManifestDraft: string;
	redTestsDraft: string[];
	requiredGates: string[];
	humanQuestionId?: string;
	approvalGateId?: string;
	createdAt: string;
	blockedReasons: string[];
}

// ─── Blueprint Gate Check Result ────────────────────────────────────────────

export interface BlueprintGateCheckResult {
	blueprintId: string;
	runPlanId?: string;
	blueprintValidation: BlueprintGateStatus;
	providerProfile: BlueprintGateStatus;
	modelWarmup: BlueprintGateStatus;
	specKitSync: BlueprintGateStatus;
	mcpWarmup: BlueprintGateStatus;
	humanApproval: BlueprintGateStatus;
	toolGateway: BlueprintGateStatus;
	overall: BlueprintGateStatus;
	blockedReasons: string[];
}

// ─── Redacted Blueprint Types ───────────────────────────────────────────────

export interface RedactedBlueprint {
	blueprintId: string;
	filename?: string;
	title?: string;
	rawMarkdownHash: string;
	sectionKinds: BlueprintSectionKind[];
	createdAt: string;
}

export interface RedactedBlueprintValidationResult {
	status: BlueprintValidationStatus;
	blueprintId: string;
	warningCount: number;
	criticalCount: number;
	highCount: number;
	missingRequiredSections: BlueprintSectionKind[];
	blockedReasons: string[];
}

export interface RedactedBlueprintRunPlan {
	runPlanId: string;
	blueprintId: string;
	status: BlueprintRunPlanStatus;
	blockedReasons: string[];
}

// ─── Required Sections for PASS ─────────────────────────────────────────────

export const REQUIRED_BLUEPRINT_SECTIONS: readonly BlueprintSectionKind[] = [
	'project_goal',
	'hard_constraints',
	'source_of_truth',
	'human_approval_rules',
	'verification_contract',
	'evidence_requirements',
	'expected_result_format',
	'software_capability_delta',
];

// ─── Forbidden Patterns (block content) ─────────────────────────────────────

interface ForbiddenPattern {
	pattern: RegExp;
	message: string;
	severity: BlueprintSecuritySeverity;
}

const FORBIDDEN_PATTERNS: ForbiddenPattern[] = [
	// Secrets
	{
		pattern: /ghp_[a-zA-Z0-9]{20,}/,
		message: 'GitHub personal access token (ghp_) detected in blueprint',
		severity: 'critical',
	},
	{
		pattern: /github_pat_[a-zA-Z0-9_]{20,}/,
		message: 'GitHub fine-grained token (github_pat_) detected in blueprint',
		severity: 'critical',
	},
	{
		pattern: /sk-[a-zA-Z0-9]{20,}/,
		message: 'API key matching sk- pattern detected in blueprint',
		severity: 'critical',
	},
	{
		pattern: /AIza[0-9A-Za-z\-_]{20}/,
		message: 'Google API key (AIza) detected in blueprint',
		severity: 'critical',
	},
	{
		pattern: /anthropic_[a-zA-Z0-9\-]{10,}/,
		message: 'Anthropic API key detected in blueprint',
		severity: 'critical',
	},
	{
		pattern: /sk-ant-[a-zA-Z0-9\-]{20,}/,
		message: 'Anthropic extended API key detected in blueprint',
		severity: 'critical',
	},
	{
		pattern: /Bearer [a-zA-Z0-9\-._~+/]+=*/,
		message: 'Bearer token detected in blueprint',
		severity: 'critical',
	},
	{
		pattern: /-----BEGIN\s.*PRIVATE\sKEY-----/,
		message: 'Private key material detected in blueprint',
		severity: 'critical',
	},
	// Dangerous operations
	{
		pattern: /auto[_-]?merge\s*:\s*(true|yes|1)/i,
		message: 'Auto-merge requested in blueprint — blocked',
		severity: 'critical',
	},
	{
		pattern: /push\s+without\s+human\s+approval/i,
		message: 'Push without human approval detected in blueprint',
		severity: 'critical',
	},
	{
		pattern: /merge\s+without\s+human\s+approval/i,
		message: 'Merge without human approval detected in blueprint',
		severity: 'critical',
	},
	{
		pattern: /unrestricted[_\s]*mcp/i,
		message: 'Unrestricted MCP access requested in blueprint — blocked',
		severity: 'critical',
	},
	{
		pattern: /unrestricted[_\s]*filesystem/i,
		message: 'Unrestricted filesystem access requested in blueprint — blocked',
		severity: 'critical',
	},
	{
		pattern: /unrestricted[_\s]*shell/i,
		message: 'Unrestricted shell access requested in blueprint — blocked',
		severity: 'critical',
	},
	{
		pattern: /\bsudo\b/i,
		message: 'sudo requirement detected in blueprint — blocked',
		severity: 'critical',
	},
	{
		pattern: /rm\s+-rf/i,
		message: 'Dangerous rm -rf command pattern detected in blueprint — blocked',
		severity: 'critical',
	},
	{
		pattern: /(?:drop|truncate)\s+(?:table|database)/i,
		message: 'Database drop/truncate operation detected in blueprint — blocked',
		severity: 'critical',
	},
	{
		pattern: /force[_\s]*push/i,
		message: 'Force push requested in blueprint — blocked',
		severity: 'critical',
	},
	{
		pattern: /disable[_\s]*safety[_\s]*gates/i,
		message: 'Disable safety gates requested in blueprint — blocked',
		severity: 'critical',
	},
	{
		pattern: /bypass[_\s]*human[_\s]*approval/i,
		message: 'Bypass human approval requested in blueprint — blocked',
		severity: 'critical',
	},
	// Global config import blocking
	{
		pattern: /import.*global.*AGENTS\.md/i,
		message: 'Global AGENTS.md import requested in blueprint — blocked',
		severity: 'critical',
	},
	{
		pattern: /import.*global.*[Oo]pen[Cc]ode.*config/i,
		message: 'Global OpenCode config import requested in blueprint — blocked',
		severity: 'critical',
	},
	{
		pattern: /import.*global.*MCP.*config/i,
		message: 'Global MCP config import requested in blueprint — blocked',
		severity: 'critical',
	},
];

// ─── Warning Patterns (warn, don't block) ───────────────────────────────────

interface WarningPattern {
	pattern: RegExp;
	message: string;
	severity: BlueprintSecuritySeverity;
}

const WARNING_PATTERNS: WarningPattern[] = [
	{
		pattern: /cost[_\s]*preference[\s\S]*?best[_\s]*quality/i,
		message: 'costPreference "best_quality" detected without budget hint — consider adding budget constraints',
		severity: 'warning',
	},
	{
		pattern: /spec[_\s]*kit[_\s]*mode[\s\S]*?opencode_slash_commands/i,
		message: 'specKitMode "opencode_slash_commands" specified — requires proof of slash command availability',
		severity: 'warning',
	},
];

// ─── Heading Mappings: English and German ───────────────────────────────────

const HEADING_MAP: Record<string, BlueprintSectionKind> = {
	// English headings
	'project goal': 'project_goal',
	'architecture principles': 'architecture_principles',
	'hard constraints': 'hard_constraints',
	'cold context': 'cold_context',
	'warm context': 'warm_context',
	'hot context': 'hot_context',
	'source of truth': 'source_of_truth',
	'do not load': 'do_not_load',
	'do not touch': 'do_not_touch',
	'mcp requirements': 'mcp_requirements',
	'opencode provider rules': 'opencode_provider_rules',
	'preferred model profile': 'preferred_model_profile',
	'cost preference': 'cost_preference',
	'spec kit mode': 'spec_kit_mode',
	'human approval': 'human_approval_rules',
	'human approval rules': 'human_approval_rules',
	'stop/ask': 'stop_ask_protocol',
	'stop-ask': 'stop_ask_protocol',
	'stop ask': 'stop_ask_protocol',
	'stop ask protocol': 'stop_ask_protocol',
	'verification contract': 'verification_contract',
	'red tests': 'red_tests',
	'ci/security gates': 'ci_security_gates',
	'ci security gates': 'ci_security_gates',
	'evidence': 'evidence_requirements',
	'evidence requirements': 'evidence_requirements',
	'reviewer-agent': 'reviewer_agent_requirements',
	'sandbox': 'sandbox_requirements',
	'sandbox requirements': 'sandbox_requirements',
	'expected result format': 'expected_result_format',
	'what can the software do now': 'software_capability_delta',
	'software capability delta': 'software_capability_delta',

	// German headings
	'projektziel': 'project_goal',
	'architekturprinzipien': 'architecture_principles',
	'harte einschränkungen': 'hard_constraints',
	'kalter kontext': 'cold_context',
	'warmer kontext': 'warm_context',
	'heißer kontext': 'hot_context',
	'heisser kontext': 'hot_context',
	'wahrheitsquelle': 'source_of_truth',
	'nicht laden': 'do_not_load',
	'nicht anfassen': 'do_not_touch',
	'mcp anforderungen': 'mcp_requirements',
	'opencode provider regeln': 'opencode_provider_rules',
	'bevorzugtes modellprofil': 'preferred_model_profile',
	'kostenpräferenz': 'cost_preference',
	'kostenpraeferenz': 'cost_preference',
	'spec kit modus': 'spec_kit_mode',
	'menschliche genehmigung': 'human_approval_rules',
	'stop/fragen': 'stop_ask_protocol',
	'verifikationsvertrag': 'verification_contract',
	'rote tests': 'red_tests',
	'ci/sicherheitsgates': 'ci_security_gates',
	'beweise': 'evidence_requirements',
	'beweisanforderungen': 'evidence_requirements',
	'erwartetes ergebnisformat': 'expected_result_format',
	'was kann die software jetzt': 'software_capability_delta',
	'software-fähigkeitsdelta': 'software_capability_delta',
};

// ─── Default Allowed Filenames ──────────────────────────────────────────────

export const ALLOWED_BLUEPRINT_FILENAMES: readonly string[] = [
	'positron-blueprint.md',
	'project-blueprint.md',
	'operator-blueprint.md',
	'blueprint.md',
];

// ─── Helpers ────────────────────────────────────────────────────────────────

let _warningCounter = 0;

function makeWarningId(): string {
	_warningCounter += 1;
	return `bp-warn-${_warningCounter}-${Date.now()}`;
}

function makeRunPlanId(): string {
	return `rp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function makeBlueprintId(prefix?: string): string {
	return `${prefix || 'bp'}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Simple non-cryptographic hash of a string for blueprint identity.
 */
function hashMarkdown(markdown: string): string {
	let hash = 0;
	for (let i = 0; i < markdown.length; i++) {
		const ch = markdown.charCodeAt(i);
		hash = ((hash << 5) - hash) + ch;
		hash |= 0;
	}
	return `md5-like-${Math.abs(hash).toString(16)}`;
}

// Reset counter for tests
export function _resetBlueprintWarningCounter(): void {
	_warningCounter = 0;
}

// ─── Type Guards ────────────────────────────────────────────────────────────

export function isBlueprintSectionKind(value: unknown): value is BlueprintSectionKind {
	return typeof value === 'string' && (ALL_BLUEPRINT_SECTION_KINDS as readonly string[]).includes(value);
}

export function isBlueprintValidationStatus(value: unknown): value is BlueprintValidationStatus {
	return typeof value === 'string' && (ALL_BLUEPRINT_VALIDATION_STATUSES as readonly string[]).includes(value);
}

export function isBlueprintSecuritySeverity(value: unknown): value is BlueprintSecuritySeverity {
	return typeof value === 'string' && (ALL_BLUEPRINT_SECURITY_SEVERITIES as readonly string[]).includes(value);
}

export function isBlueprintGateStatus(value: unknown): value is BlueprintGateStatus {
	return typeof value === 'string' && (ALL_BLUEPRINT_GATE_STATUSES as readonly string[]).includes(value);
}

export function isBlueprintCostPreference(value: unknown): value is BlueprintCostPreference {
	return typeof value === 'string' && (ALL_BLUEPRINT_COST_PREFERENCES as readonly string[]).includes(value);
}

export function isBlueprintRunPlanStatus(value: unknown): value is BlueprintRunPlanStatus {
	return typeof value === 'string' && (ALL_BLUEPRINT_RUN_PLAN_STATUSES as readonly string[]).includes(value);
}

/** Type guard: check if a value looks like a ParsedBlueprint */
export function isParsedBlueprint(value: unknown): value is ParsedBlueprint {
	if (!value || typeof value !== 'object') return false;
	const bp = value as Record<string, unknown>;
	if (typeof bp.blueprintId !== 'string') return false;
	if (typeof bp.rawMarkdownHash !== 'string') return false;
	if (!Array.isArray(bp.sections)) return false;
	if (typeof bp.createdAt !== 'string') return false;
	return true;
}

/** Type guard: check if a value looks like a BlueprintValidationResult */
export function isBlueprintValidationResult(value: unknown): value is BlueprintValidationResult {
	if (!value || typeof value !== 'object') return false;
	const r = value as Record<string, unknown>;
	if (!isBlueprintValidationStatus(r.status)) return false;
	if (typeof r.blueprintId !== 'string') return false;
	if (!Array.isArray(r.warnings)) return false;
	if (!Array.isArray(r.missingRequiredSections)) return false;
	if (!Array.isArray(r.extractedRequiredMcpServers)) return false;
	if (typeof r.requiresHumanApproval !== 'boolean') return false;
	if (!Array.isArray(r.blockedReasons)) return false;
	return true;
}

/** Type guard: check if a value looks like a BlueprintRunPlan */
export function isBlueprintRunPlan(value: unknown): value is BlueprintRunPlan {
	if (!value || typeof value !== 'object') return false;
	const rp = value as Record<string, unknown>;
	if (typeof rp.runPlanId !== 'string') return false;
	if (typeof rp.blueprintId !== 'string') return false;
	if (!isBlueprintRunPlanStatus(rp.status)) return false;
	if (!isBlueprintCostPreference(rp.costPreference)) return false;
	if (!Array.isArray(rp.requiredMcpServers)) return false;
	if (typeof rp.verificationContractDraft !== 'string') return false;
	if (typeof rp.contextManifestDraft !== 'string') return false;
	if (!Array.isArray(rp.redTestsDraft)) return false;
	if (!Array.isArray(rp.requiredGates)) return false;
	if (typeof rp.createdAt !== 'string') return false;
	if (!Array.isArray(rp.blockedReasons)) return false;
	return true;
}

// ═══════════════════════════════════════════════════════════════════════════
// Phase 4 — Markdown Parser
// ═══════════════════════════════════════════════════════════════════════════

export interface ParseBlueprintInput {
	markdown: string;
	filename?: string;
	createdAt: string;
}

/**
 * Parse a Markdown blueprint into structured sections.
 *
 * No execution. No link fetching. No file operations. No tool calls.
 * Only text parsing. Known headings mapped to BlueprintSectionKind.
 * Unknown headings become 'unknown'.
 */
export function parseBlueprintMarkdown(input: ParseBlueprintInput): ParsedBlueprint {
	const { markdown, filename, createdAt } = input;
	const lines = markdown.split('\n');
	const headingRegex = /^#{1,3}\s+(.+?)(?:\s*#+)?$/;
	const sections: ParsedBlueprintSection[] = [];

	let currentSection: {
		kind: BlueprintSectionKind;
		title: string;
		contentLines: string[];
		lineStart: number;
	} | null = null;

	let title: string | undefined;

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		if (line === undefined) continue;
		const match = line.match(headingRegex);

		if (match) {
			const headingText = match[1]?.trim() ?? '';
			if (!headingText) continue;

			// If we had a previous section, finalize it
			if (currentSection) {
				sections.push({
					kind: currentSection.kind,
					title: currentSection.title,
					content: currentSection.contentLines.join('\n').trim(),
					lineStart: currentSection.lineStart,
					lineEnd: i - 1,
				});
			}

			// Classify the heading
			const normalizedHeading = headingText
				.toLowerCase()
				.replace(/\s+/g, ' ')
				.trim();

			const kind = HEADING_MAP[normalizedHeading] ||
				HEADING_MAP[headingText.toLowerCase().trim()] ||
				'unknown';

			// First heading becomes the blueprint title
			if (!title && sections.length === 0) {
				title = headingText;
			}

			currentSection = {
				kind,
				title: headingText,
				contentLines: [],
				lineStart: i + 1, // content starts on next line
			};
		} else if (currentSection) {
			currentSection.contentLines.push(line);
		} else {
			// Content before any heading — store as implicit section if non-empty
			const trimmedLine = line.trim();
			if (trimmedLine && !title) {
				// First non-empty non-heading line — use as title
				title = trimmedLine;
			}
		}
	}

	// Finalize the last section
	if (currentSection) {
		sections.push({
			kind: currentSection.kind,
			title: currentSection.title,
			content: currentSection.contentLines.join('\n').trim(),
			lineStart: currentSection.lineStart,
			lineEnd: lines.length - 1,
		});
	}

	const rawHash = hashMarkdown(markdown);
	const blueprintId = makeBlueprintId(filename ? filename.replace(/[^a-zA-Z0-9]/g, '-') : undefined);

	return {
		blueprintId,
		filename,
		title,
		rawMarkdownHash: rawHash,
		sections,
		createdAt,
	};
}

// ═══════════════════════════════════════════════════════════════════════════
// Phase 5 — Validation + Security Checks
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Validate a parsed blueprint for security and completeness.
 *
 * - Blocks secrets, auto-merge, unrestricted MCP/filesystem/shell
 * - Blocks sudo, rm -rf, force push, safety gate disabling
 * - Blocks bypass human approval, global config imports
 * - Warns on missing optional sections, cost preferences without budget
 * - Enforces required sections for PASS
 */
export function validateBlueprint(blueprint: ParsedBlueprint): BlueprintValidationResult {
	const warnings: BlueprintSecurityWarning[] = [];
	const blockedReasons: string[] = [];
	const missingRequired: BlueprintSectionKind[] = [];

	let hasCritical = false;

	// Combine all section content for pattern scanning
	const fullText = blueprint.sections
		.map((s) => `${s.title}\n${s.content}`)
		.join('\n');

	// ── Check Forbidden Patterns ──────────────────────────────────────────
	for (const fp of FORBIDDEN_PATTERNS) {
		const match = fullText.match(fp.pattern);
		if (match) {
			let foundLine: number | undefined;
			// Find which line the match is on
			const textLines = fullText.split('\n');
			for (let j = 0; j < textLines.length; j++) {
				if (fp.pattern.test(textLines[j]!)) {
					foundLine = j + 1;
					break;
				}
			}

			warnings.push({
				id: makeWarningId(),
				severity: fp.severity,
				message: fp.message,
				line: foundLine,
				blocked: true,
			});
			blockedReasons.push(fp.message);

			if (fp.severity === 'critical') {
				hasCritical = true;
			}
		}
	}

	// ── Check Warning Patterns ────────────────────────────────────────────
	for (const wp of WARNING_PATTERNS) {
		if (wp.pattern.test(fullText)) {
			warnings.push({
				id: makeWarningId(),
				severity: wp.severity,
				message: wp.message,
				blocked: false,
			});
		}
	}

	// ── Check Required Sections ───────────────────────────────────────────
	const presentKinds = new Set(blueprint.sections.map((s) => s.kind));

	for (const required of REQUIRED_BLUEPRINT_SECTIONS) {
		if (!presentKinds.has(required)) {
			missingRequired.push(required);
		}
	}

	// ── Missing Human Approval Check ──────────────────────────────────────
	if (!presentKinds.has('human_approval_rules')) {
		warnings.push({
			id: makeWarningId(),
			severity: 'high',
			message: 'Missing human_approval_rules section — blueprint does not define approval policy',
			sectionKind: 'human_approval_rules',
			blocked: false,
		});
	}

	// ── Missing Stop/Ask Check ────────────────────────────────────────────
	if (!presentKinds.has('stop_ask_protocol')) {
		warnings.push({
			id: makeWarningId(),
			severity: 'warning',
			message: 'Missing stop_ask_protocol section — consider adding Stop/Ask rules',
			sectionKind: 'stop_ask_protocol',
			blocked: false,
		});
	}

	// ── Missing Evidence Check ────────────────────────────────────────────
	if (!presentKinds.has('evidence_requirements')) {
		warnings.push({
			id: makeWarningId(),
			severity: 'warning',
			message: 'Missing evidence_requirements section — evidence tracking not defined',
			sectionKind: 'evidence_requirements',
			blocked: false,
		});
	}

	// ── Missing Red Tests Check ───────────────────────────────────────────
	if (!presentKinds.has('red_tests')) {
		warnings.push({
			id: makeWarningId(),
			severity: 'warning',
			message: 'Missing red_tests section — consider adding red/green test definitions',
			sectionKind: 'red_tests',
			blocked: false,
		});
	}

	// ── Missing Verification Contract Check ───────────────────────────────
	if (!presentKinds.has('verification_contract')) {
		warnings.push({
			id: makeWarningId(),
			severity: 'warning',
			message: 'Missing verification_contract section — verification contract not defined',
			sectionKind: 'verification_contract',
			blocked: false,
		});
	}

	// ── Preferred Model without Warm-up Hint ──────────────────────────────
	if (presentKinds.has('preferred_model_profile') &&
		!presentKinds.has('opencode_provider_rules')) {
		warnings.push({
			id: makeWarningId(),
			severity: 'info',
			message: 'Preferred model profile specified without provider rules — warm-up gating may not be covered',
			sectionKind: 'preferred_model_profile',
			blocked: false,
		});
	}

	// ── Determine Status ──────────────────────────────────────────────────
	let status: BlueprintValidationStatus;

	if (hasCritical) {
		status = 'fail';
	} else if (missingRequired.length > 0) {
		status = 'partial';
	} else {
		status = 'pass';
	}

	// ── Extract Information ───────────────────────────────────────────────
	const extractedPreferredModelRef = extractPreferredModelRef(blueprint);
	const extractedCostPreference = extractCostPreference(blueprint);
	const extractedSpecKitMode = extractSpecKitMode(blueprint);
	const extractedRequiredMcpServers = extractRequiredMcpServers(blueprint);
	const requiresHumanApproval = extractHumanApprovalRequired(blueprint);

	// If blocked by critical issues, override status
	if (warnings.some((w) => w.blocked)) {
		// Keep status as 'fail' for critical, but also add blockedReasons
		if (!hasCritical) {
			status = 'blocked';
		}
	}

	return {
		status,
		blueprintId: blueprint.blueprintId,
		warnings,
		missingRequiredSections: missingRequired,
		extractedPreferredModelRef,
		extractedCostPreference,
		extractedSpecKitMode,
		extractedRequiredMcpServers,
		requiresHumanApproval,
		blockedReasons,
	};
}

// ═══════════════════════════════════════════════════════════════════════════
// Phase 6 — Extraction Helpers
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Extract preferred model reference from blueprint.
 * Model reference is a WISH only — does NOT grant any approval.
 */
export function extractPreferredModelRef(blueprint: ParsedBlueprint): string | undefined {
	const section = blueprint.sections.find((s) => s.kind === 'preferred_model_profile');
	if (!section) return undefined;

	const content = section.content.toLowerCase();
	// Try to extract model references like "ollama/qwen2.5" or "model: claude"
	const modelMatch = content.match(/(?:model|modell)\s*(?::|is|=|->|–)\s*['"]?([a-zA-Z0-9\-_./]+?)['"]?(?:\s|$)/im);
	if (modelMatch) return modelMatch[1];

	const words = section.content.split(/[\s,]+/);
	for (const w of words) {
		if (w.includes('/') && w.length > 3 && !w.startsWith('http')) {
			return w;
		}
	}

	// Return first non-trivial word after common prefixes
	const lines = section.content.split('\n');
	for (const line of lines) {
		const trimmed = line.trim();
		if (trimmed && !trimmed.startsWith('#') && !trimmed.startsWith('-') && trimmed.length < 100) {
			return trimmed;
		}
	}

	return undefined;
}

/**
 * Extract cost preference from blueprint.
 * Normalizes:
 * - "free-first" → "free_first"
 * - "local-first" → "local_first"
 * - "best quality" → "best_quality"
 */
export function extractCostPreference(blueprint: ParsedBlueprint): BlueprintCostPreference {
	const section = blueprint.sections.find((s) => s.kind === 'cost_preference');
	if (!section) return 'unknown';

	const content = section.content.toLowerCase();

	if (/free[_\s-]*first/i.test(content)) return 'free_first';
	if (/local[_\s-]*first/i.test(content)) return 'local_first';
	if (/best[_\s]*quality/i.test(content)) return 'best_quality';
	if (/ask[_\s]*human/i.test(content)) return 'ask_human';

	// Check section content for free/local keywords
	if (content.includes('free')) return 'free_first';
	if (content.includes('local')) return 'local_first';

	return 'unknown';
}

/**
 * Extract Spec Kit mode from blueprint.
 * No runtime, no Spec Kit execution.
 */
export function extractSpecKitMode(blueprint: ParsedBlueprint): string | undefined {
	const section = blueprint.sections.find((s) => s.kind === 'spec_kit_mode');
	if (!section) return undefined;

	const content = section.content.toLowerCase();

	if (content.includes('adapter_bridge') || content.includes('adapter bridge')) return 'adapter_bridge';
	if (content.includes('opencode_slash_commands') || content.includes('slash commands')) return 'opencode_slash_commands';
	if (content.includes('standalone_cli') || content.includes('standalone cli')) return 'standalone_cli';

	// Return trimmed content if it's a single line
	const trimmed = section.content.trim();
	if (trimmed && !trimmed.includes('\n') && trimmed.length < 50) {
		return trimmed;
	}

	return undefined;
}

/**
 * Extract required MCP servers from blueprint.
 * Servers are extracted as raw names, normalized case-insensitively.
 * Known MCP inventory normalization can be added by callers.
 */
export function extractRequiredMcpServers(blueprint: ParsedBlueprint): string[] {
	const section = blueprint.sections.find((s) => s.kind === 'mcp_requirements');
	if (!section) return [];

	const servers: string[] = [];
	const lines = section.content.split('\n');

	for (const line of lines) {
		const trimmed = line.trim();
		// Match list items like "- github" or "* filesystem"
		const listMatch = trimmed.match(/^[-*]\s+(.+)$/);
		if (listMatch?.[1]) {
			const name = listMatch[1].trim().toLowerCase();
			if (name && name.length > 1) {
				servers.push(name);
			}
		}
	}

	// If no list items, try comma-separated values
	if (servers.length === 0) {
		const commaSplit = section.content.split(/[\s,]+/);
		for (const item of commaSplit) {
			const trimmed = item.trim().toLowerCase();
			if (trimmed && trimmed.length > 1) {
				servers.push(trimmed);
			}
		}
	}

	return [...new Set(servers)];
}

/**
 * Detect whether the blueprint requires human approval.
 * Always returns true if human_approval_rules section exists and doesn't
 * explicitly disable approval. By default, all blueprints require human approval.
 */
export function extractHumanApprovalRequired(blueprint: ParsedBlueprint): boolean {
	const section = blueprint.sections.find((s) => s.kind === 'human_approval_rules');
	if (!section) return true; // Missing section → approval required by default

	const content = section.content.toLowerCase();

	// Explicit disable check — these patterns indicate approval may not be required
	if (/human[_\s]*approval[_\s]*[:\s]*(?:none|no|disabled|false|off)/i.test(content.trim())) {
		return false;
	}

	if (/no[_\s]*human[_\s]*approval/i.test(content)) {
		return false;
	}

	if (/automatisch[_\s]*genehmigen/i.test(content)) {
		return false;
	}

	if (/keine[_\s]*menschliche[_\s]*genehmigung/i.test(content)) {
		return false;
	}

	return true;
}

// ═══════════════════════════════════════════════════════════════════════════
// Phase 7 — Run-Plan Draft
// ═══════════════════════════════════════════════════════════════════════════

export interface CreateRunPlanInput {
	blueprint: ParsedBlueprint;
	validation: BlueprintValidationResult;
	createdAt: string;
	issueNumber?: number;
}

/**
 * Create a blueprint run plan — draft only.
 *
 * - If validation blocked/fail → RunPlan status "blocked"
 * - If validation partial → RunPlan status "draft" or "waiting_for_human"
 * - If validation pass → RunPlan status "ready_for_gate_check"
 *
 * Does NOT execute anything. Does NOT start OpenCode, MCP, or Spec Kit.
 */
export function createBlueprintRunPlan(input: CreateRunPlanInput): BlueprintRunPlan {
	const { blueprint, validation, createdAt, issueNumber } = input;

	const runPlanId = makeRunPlanId();
	let status: BlueprintRunPlanStatus;
	const blockedReasons: string[] = [...validation.blockedReasons];

	if (validation.status === 'fail' || validation.status === 'blocked') {
		status = 'blocked';
	} else if (validation.status === 'partial') {
		if (validation.requiresHumanApproval) {
			status = 'waiting_for_human';
		} else {
			status = 'draft';
		}
	} else {
		// pass
		if (validation.requiresHumanApproval) {
			status = 'waiting_for_human';
		} else {
			status = 'ready_for_gate_check';
		}
	}

	// ── Generate Drafts ───────────────────────────────────────────────────
	const verificationContractDraft = generateVerificationContractDraft(blueprint, validation);
	const contextManifestDraft = generateContextManifestDraft(blueprint);
	const redTestsDraft = generateRedTestsDraft(blueprint);

	// ── Required Gates ────────────────────────────────────────────────────
	const requiredGates: string[] = [];

	if (validation.extractedPreferredModelRef) {
		requiredGates.push('model_real_run');
	}
	if (validation.extractedRequiredMcpServers.length > 0) {
		requiredGates.push('mcp_real_warmup');
	}
	if (validation.extractedSpecKitMode) {
		requiredGates.push('speckit_sync');
	}
	if (validation.requiresHumanApproval) {
		requiredGates.push('blueprint_start');
	}
	// tool_gateway is always required
	requiredGates.push('tool_gateway');

	return {
		runPlanId,
		blueprintId: blueprint.blueprintId,
		status,
		issueNumber,
		preferredModelRef: validation.extractedPreferredModelRef,
		costPreference: validation.extractedCostPreference || 'unknown',
		specKitMode: validation.extractedSpecKitMode,
		requiredMcpServers: validation.extractedRequiredMcpServers,
		verificationContractDraft,
		contextManifestDraft,
		redTestsDraft,
		requiredGates,
		createdAt,
		blockedReasons,
	};
}

/**
 * Generate a draft verification contract from blueprint sections.
 */
export function generateVerificationContractDraft(
	blueprint: ParsedBlueprint,
	_validation: BlueprintValidationResult,
): string {
	const contractSection = blueprint.sections.find((s) => s.kind === 'verification_contract');
	const goalSection = blueprint.sections.find((s) => s.kind === 'project_goal');
	const expectedResult = blueprint.sections.find((s) => s.kind === 'expected_result_format');

	const lines: string[] = [];
	lines.push('# Verification Contract Draft');
	lines.push('');
	lines.push(`Blueprint: ${blueprint.title || blueprint.blueprintId}`);
	lines.push(`Created: ${blueprint.createdAt}`);
	lines.push('');

	if (goalSection) {
		lines.push('## Project Goal');
		lines.push(goalSection.content);
		lines.push('');
	}

	if (contractSection) {
		lines.push('## Contract Terms');
		lines.push(contractSection.content);
		lines.push('');
	}

	if (expectedResult) {
		lines.push('## Expected Results');
		lines.push(expectedResult.content);
	}

	return lines.join('\n');
}

/**
 * Generate a draft context manifest from blueprint sections.
 */
export function generateContextManifestDraft(blueprint: ParsedBlueprint): string {
	const sections = blueprint.sections;
	const lines: string[] = [];
	lines.push('# Context Manifest Draft');
	lines.push('');
	lines.push(`Blueprint: ${blueprint.title || blueprint.blueprintId}`);
	lines.push('');

	const contextKinds: BlueprintSectionKind[] = [
		'cold_context',
		'warm_context',
		'hot_context',
		'hard_constraints',
		'architecture_principles',
		'source_of_truth',
	];

	for (const kind of contextKinds) {
		const section = sections.find((s) => s.kind === kind);
		if (section) {
			lines.push(`## ${section.title}`);
			lines.push(section.content);
			lines.push('');
		}
	}

	return lines.join('\n');
}

/**
 * Generate red tests draft from blueprint sections.
 */
export function generateRedTestsDraft(blueprint: ParsedBlueprint): string[] {
	const section = blueprint.sections.find((s) => s.kind === 'red_tests');
	if (!section) return [];

	return section.content
		.split('\n')
		.map((line) => line.trim())
		.filter((line) => line.length > 0 && !line.startsWith('#'));
}

/**
 * Create a blueprint gate check result.
 * All gates start as 'not_checked' — ready for external gating pipeline.
 */
export function createBlueprintGateCheck(
	blueprintId: string,
	runPlanId?: string,
): BlueprintGateCheckResult {
	return {
		blueprintId,
		runPlanId,
		blueprintValidation: 'not_checked',
		providerProfile: 'not_checked',
		modelWarmup: 'not_checked',
		specKitSync: 'not_checked',
		mcpWarmup: 'not_checked',
		humanApproval: 'not_checked',
		toolGateway: 'not_checked',
		overall: 'not_checked',
		blockedReasons: [],
	};
}

// ═══════════════════════════════════════════════════════════════════════════
// Phase 8 — Human Question Mapping
// ═══════════════════════════════════════════════════════════════════════════

export interface CreateBlueprintApprovalInput {
	blueprint: ParsedBlueprint;
	validation: BlueprintValidationResult;
	runPlan: BlueprintRunPlan;
	createdAt: string;
}

/**
 * Create a blueprint start approval question for the human oversight queue.
 *
 * - type: "blueprint_start_approval"
 * - riskLevel: based on validation outcome
 * - defaultDecision: NEVER ALLOW — DENY for critical, REQUIRE_REVIEW for others
 * - Question contains NO secrets, NO private paths, NO raw markdown with tokens
 */
export function createBlueprintStartApprovalQuestion(
	input: CreateBlueprintApprovalInput,
): HumanQuestion {
	const { blueprint, validation, runPlan, createdAt } = input;

	// ── Determine Risk Level ──────────────────────────────────────────────
	let riskLevel: HumanRiskLevel;

	const hasCriticalWarnings = validation.warnings.some(
		(w) => w.severity === 'critical' || w.blocked,
	);
	const hasHighWarnings = validation.warnings.some((w) => w.severity === 'high');

	if (hasCriticalWarnings) {
		riskLevel = 'critical';
	} else if (hasHighWarnings) {
		riskLevel = 'high';
	} else if (validation.status === 'partial') {
		riskLevel = 'medium';
	} else {
		riskLevel = 'low';
	}

	// ── Default Decision ──────────────────────────────────────────────────
	// Critical → DENY
	// High → DENY
	// Medium → REQUIRE_REVIEW
	// Low → REQUIRE_REVIEW
	// ALLOW is NEVER a default — always requires explicit human action
	let defaultDecision: HumanDecision;
	let allowedDecisions: HumanDecision[];

	if (riskLevel === 'critical') {
		defaultDecision = 'DENY';
		allowedDecisions = ['DENY', 'REQUIRE_REVIEW', 'ABORT_RUN'];
	} else if (riskLevel === 'high') {
		defaultDecision = 'DENY';
		allowedDecisions = ['DENY', 'REQUIRE_REVIEW', 'ASK_MORE', 'ABORT_RUN'];
	} else if (riskLevel === 'medium') {
		defaultDecision = 'REQUIRE_REVIEW';
		allowedDecisions = ['ALLOW', 'DENY', 'REQUIRE_REVIEW', 'ASK_MORE', 'PAUSE_RUN', 'ABORT_RUN'];
	} else {
		defaultDecision = 'REQUIRE_REVIEW';
		allowedDecisions = ['ALLOW', 'DENY', 'REQUIRE_REVIEW', 'ASK_MORE', 'PAUSE_RUN', 'ABORT_RUN'];
	}

	// ── Build Title and Question ──────────────────────────────────────────
	const title = `Blueprint Start Approval: ${blueprint.title || blueprint.filename || blueprint.blueprintId}`;

	let questionText = '';

	// Safe information: section kinds, counts, extracted data (no secrets)
	questionText += `Blueprint ID: ${blueprint.blueprintId}\n`;
	if (blueprint.title) questionText += `Title: ${blueprint.title}\n`;
	questionText += `Sections: ${blueprint.sections.length} (${blueprint.sections.map((s) => s.kind).join(', ')})\n`;
	questionText += `Validation Status: ${validation.status}\n`;
	questionText += `Warnings: ${validation.warnings.length}\n`;

	if (validation.extractedPreferredModelRef) {
		questionText += `Preferred Model: ${validation.extractedPreferredModelRef}\n`;
	}
	if (validation.extractedCostPreference) {
		questionText += `Cost Preference: ${validation.extractedCostPreference}\n`;
	}
	if (validation.extractedSpecKitMode) {
		questionText += `Spec Kit Mode: ${validation.extractedSpecKitMode}\n`;
	}
	if (validation.extractedRequiredMcpServers.length > 0) {
		questionText += `Required MCP Servers: ${validation.extractedRequiredMcpServers.join(', ')}\n`;
	}

	if (validation.blockedReasons.length > 0) {
		questionText += `\nBlocked Reasons:\n${validation.blockedReasons.map((r) => `- ${r}`).join('\n')}\n`;
	}

	questionText += `\nRun Plan Status: ${runPlan.status}\n`;
	questionText += `Run Plan Required Gates: ${runPlan.requiredGates.join(', ')}\n`;
	questionText += `\nApprove this blueprint to proceed to gate check.\n`;
	questionText += `Note: ALLOW enables gate check only — NOT execution.\n`;

	// ── Create HumanQuestion ──────────────────────────────────────────────
	const question: HumanQuestion = {
		id: createHumanQuestionId(),
		runId: runPlan.runPlanId,
		issueNumber: runPlan.issueNumber,
		type: 'blueprint_start_approval',
		status: 'open',
		title,
		question: questionText,
		riskLevel,
		requestedBy: 'blueprint',
		proposedAction: 'Create run plan and begin gate check for blueprint',
		evidenceRefs: [],
		allowedDecisions,
		defaultDecision,
		createdAt,
		blockedReasons: runPlan.blockedReasons,
	};

	return question;
}

// ═══════════════════════════════════════════════════════════════════════════
// Phase 9 — Evidence Redaction
// ═══════════════════════════════════════════════════════════════════════════

const SECRET_PATTERNS = [
	/ghp_[a-zA-Z0-9]{36}/g,
	/github_pat_[a-zA-Z0-9_]{36,}/g,
	/sk-[a-zA-Z0-9]{32,}/g,
	/AIza[0-9A-Za-z\-_]{35}/g,
	/anthropic_[a-zA-Z0-9\-]{20,}/g,
	/sk-ant-[a-zA-Z0-9\-]{32,}/g,
	/-----BEGIN\s.*PRIVATE\sKEY-----[\s\S]*?-----END\s.*PRIVATE\sKEY-----/g,
];

function redactSecretText(text: string): string {
	let result = text;
	for (const pattern of SECRET_PATTERNS) {
		result = result.replace(pattern, '***-REDACTED-***');
	}
	return result;
}

/**
 * Redact a parsed blueprint for evidence/logging.
 * Removes: raw markdown with secrets, private paths, tokens, env values.
 * Keeps: section titles, section kinds, hash, redacted warnings.
 */
export function redactBlueprintForEvidence(blueprint: ParsedBlueprint): RedactedBlueprint {
	return {
		blueprintId: blueprint.blueprintId,
		filename: blueprint.filename,
		title: blueprint.title,
		rawMarkdownHash: blueprint.rawMarkdownHash,
		sectionKinds: blueprint.sections.map((s) => s.kind),
		createdAt: blueprint.createdAt,
	};
}

/**
 * Redact blueprint validation result for evidence.
 * Keeps: status, blueprintId, counts, missing sections, blockedReasons (redacted).
 * Removes: detailed warnings with potential secrets, extracted values.
 */
export function redactBlueprintValidationForEvidence(
	validation: BlueprintValidationResult,
): RedactedBlueprintValidationResult {
	return {
		status: validation.status,
		blueprintId: validation.blueprintId,
		warningCount: validation.warnings.length,
		criticalCount: validation.warnings.filter((w) => w.severity === 'critical').length,
		highCount: validation.warnings.filter((w) => w.severity === 'high').length,
		missingRequiredSections: validation.missingRequiredSections,
		blockedReasons: validation.blockedReasons.map(redactSecretText),
	};
}

/**
 * Redact blueprint run plan for evidence.
 * Keeps: ids, status, blockedReasons (redacted).
 * Removes: draft content (may contain actionable info), extracted values.
 */
export function redactBlueprintRunPlanForEvidence(
	plan: BlueprintRunPlan,
): RedactedBlueprintRunPlan {
	return {
		runPlanId: plan.runPlanId,
		blueprintId: plan.blueprintId,
		status: plan.status,
		blockedReasons: plan.blockedReasons.map(redactSecretText),
	};
}
