// Positron — Infrastructure Gate State Tests
// PR 11: Bind Blueprint Handoff to actual Provider/MCP/SpecKit/ToolGateway states
// ---------------------------------------------------------------------------
// Tests for infra gate types, individual evaluators, aggregator,
// evidence mapping, and type guards.
// All evaluators are pure functions — no runtime execution.
// ---------------------------------------------------------------------------

import { describe, it, expect } from 'vitest';

import {
	evaluateProviderDetectionGate,
	evaluateModelProfileGate,
	evaluateModelWarmupGate,
	evaluateSpecKitSyncGate,
	evaluateMcpWarmupGate,
	evaluateToolGatewayGate,
	evaluateHumanApprovalGate,
	evaluateSecurityGate,
	evaluateInfrastructureGates,
	buildInfrastructureGateEvidence,
	isInfrastructureGateKind,
	isInfrastructureGateStatus,
	type InfrastructureGateSummary,
	type InfrastructureGateEvaluationInput,
} from '../infrastructure-gates.js';

import type { OpenCodeProviderDetectionEvidence } from '../opencode-provider-detection.js';
import type { OpenCodeModelProfile } from '../opencode-model-profile.js';
import type { PositronProviderProfile } from '../speckit-sync-profile.js';
import type { McpCapabilityManifest, McpWarmupEvidence } from '../mcp-warmup-profile.js';
import type { ApprovalGate } from '../approval-gates.js';

// ─── Helpers ────────────────────────────────────────────────────────────────

const CHECKED_AT = '2026-06-16T10:00:00Z';

function makeProviderEvidence(
	overrides: Partial<OpenCodeProviderDetectionEvidence> = {},
): OpenCodeProviderDetectionEvidence {
	return {
		evidenceId: `ev-${Math.random().toString(36).slice(2, 8)}`,
		detectionStatus: 'not_found',
		installStatus: 'not_requested',
		runtimeStatus: 'detect_only',
		helpAvailable: false,
		redactionApplied: false,
		secretsDetected: false,
		privatePathsDetected: false,
		blockedReasons: [],
		createdAt: CHECKED_AT,
		...overrides,
	};
}

function makeModelProfile(
	overrides: Partial<OpenCodeModelProfile> = {},
): OpenCodeModelProfile {
	return {
		profileId: 'free-local-ollama',
		displayName: 'Ollama (Local)',
		providerId: 'ollama',
		modelId: 'gemma3:12b',
		opencodeModelRef: 'ollama/gemma3:12b',
		costClass: 'free_local',
		executionClass: 'local',
		requiresApiKey: false,
		apiKeyStoragePolicy: 'not_required',
		allowedForDemo: true,
		allowedForRealRuns: true,
		capabilities: ['code_generation', 'tool_calling', 'file_editing'],
		requiresWarmup: true,
		warmupStatus: 'pass',
		warmupLevel: 4,
		maxRiskLevel: 'low',
		notes: [],
		...overrides,
	};
}

function makeProviderProfile(
	overrides: Partial<PositronProviderProfile> = {},
): PositronProviderProfile {
	return {
		profileId: 'free-local-ollama',
		opencodeBinaryPath: '/usr/local/bin/opencode',
		opencodeVersion: 'v1.0.0',
		opencodeConfigPath: '/home/user/.config/opencode',
		opencodeModelProfileId: 'free-local-ollama',
		opencodeModelRef: 'ollama/gemma3:12b',
		specKitBinaryPath: '/usr/local/bin/speckit',
		specKitVersion: 'v1.0.0',
		specKitInstallSource: 'github/spec-kit',
		specKitInstallRef: 'main',
		specKitMode: 'adapter_bridge',
		mcpWarmupStatus: 'pass',
		modelWarmupStatus: 'pass',
		specKitSyncStatus: 'synced',
		providerProfileReadiness: 'ready_for_real',
		readyForDemoRuns: true,
		readyForRealRuns: true,
		reSyncReasons: [],
		...overrides,
	};
}

function makeMcpManifest(
	serverId: string,
	requiredness: 'required' | 'optional' = 'required',
): McpCapabilityManifest {
	return {
		serverId,
		displayName: serverId,
		role: 'hand',
		requiredness,
		transport: 'stdio',
		owner: 'positron',
		envPolicy: 'none',
		authRequired: false,
		allowedDomains: [],
		allowedPaths: [],
		forbiddenPaths: [],
		tools: [],
		defaultEnabled: false,
		requiresHumanApproval: false,
		timeoutMs: 30000,
		logging: 'metadata_only',
		redaction: 'required',
		warmupRequired: true,
		evidenceRequired: true,
	};
}

function makeMcpEvidence(
	serverId: string,
	status: 'pass' | 'partial' | 'fail' | 'blocked' = 'pass',
): McpWarmupEvidence {
	return {
		evidenceId: `mcp-ev-${serverId}-${Math.random().toString(36).slice(2, 6)}`,
		serverId,
		status,
		startedAt: CHECKED_AT,
		completedAt: CHECKED_AT,
		phases: [],
		listedTools: [],
		forbiddenToolChecks: [],
		redactionApplied: status === 'pass',
		secretsDetected: false,
		privatePathsDetected: false,
		realRunAllowed: status === 'pass',
		blockedReasons: status === 'pass' ? [] : [`${serverId} warm-up ${status}`],
	};
}

function makeApprovalGate(
	overrides: Partial<ApprovalGate> = {},
): ApprovalGate {
	return {
		gateId: `gate-${Math.random().toString(36).slice(2, 8)}`,
		kind: 'blueprint_start',
		status: 'pending',
		riskLevel: 'medium',
		requiredDecision: 'ALLOW',
		decisionEffect: 'stores_approval_only',
		createdAt: CHECKED_AT,
		blockedReasons: [],
		...overrides,
	};
}

// ═══════════════════════════════════════════════════════════════════════════
// Type Guards
// ═══════════════════════════════════════════════════════════════════════════

describe('Type Guards', () => {
	describe('isInfrastructureGateKind', () => {
		it('returns true for valid kinds', () => {
			expect(isInfrastructureGateKind('provider_detection')).toBe(true);
			expect(isInfrastructureGateKind('model_profile')).toBe(true);
			expect(isInfrastructureGateKind('model_warmup')).toBe(true);
			expect(isInfrastructureGateKind('speckit_sync')).toBe(true);
			expect(isInfrastructureGateKind('mcp_warmup')).toBe(true);
			expect(isInfrastructureGateKind('tool_gateway')).toBe(true);
			expect(isInfrastructureGateKind('human_approval')).toBe(true);
			expect(isInfrastructureGateKind('security')).toBe(true);
		});

		it('returns false for invalid kinds', () => {
			expect(isInfrastructureGateKind('invalid')).toBe(false);
			expect(isInfrastructureGateKind('')).toBe(false);
			expect(isInfrastructureGateKind(null)).toBe(false);
			expect(isInfrastructureGateKind(undefined)).toBe(false);
			expect(isInfrastructureGateKind(42)).toBe(false);
		});
	});

	describe('isInfrastructureGateStatus', () => {
		it('returns true for valid statuses', () => {
			expect(isInfrastructureGateStatus('pass')).toBe(true);
			expect(isInfrastructureGateStatus('partial')).toBe(true);
			expect(isInfrastructureGateStatus('fail')).toBe(true);
			expect(isInfrastructureGateStatus('blocked')).toBe(true);
			expect(isInfrastructureGateStatus('not_checked')).toBe(true);
			expect(isInfrastructureGateStatus('missing')).toBe(true);
		});

		it('returns false for invalid statuses', () => {
			expect(isInfrastructureGateStatus('unknown')).toBe(false);
			expect(isInfrastructureGateStatus('pending')).toBe(false);
			expect(isInfrastructureGateStatus('')).toBe(false);
			expect(isInfrastructureGateStatus(null)).toBe(false);
		});
	});
});

// ═══════════════════════════════════════════════════════════════════════════
// Provider Detection Gate
// ═══════════════════════════════════════════════════════════════════════════

describe('evaluateProviderDetectionGate', () => {
	it('missing providerDetection returns missing', () => {
		const result = evaluateProviderDetectionGate({
			providerDetection: undefined,
			checkedAt: CHECKED_AT,
		});
		expect(result.kind).toBe('provider_detection');
		expect(result.status).toBe('missing');
		expect(result.source).toBe('missing');
		expect(result.blockedReasons.length).toBeGreaterThan(0);
	});

	it('not_found detection returns blocked', () => {
		const result = evaluateProviderDetectionGate({
			providerDetection: makeProviderEvidence({ detectionStatus: 'not_found' }),
			checkedAt: CHECKED_AT,
		});
		expect(result.status).toBe('blocked');
	});

	it('unknown detection returns blocked', () => {
		const result = evaluateProviderDetectionGate({
			providerDetection: makeProviderEvidence({ detectionStatus: 'unknown' }),
			checkedAt: CHECKED_AT,
		});
		expect(result.status).toBe('blocked');
	});

	it('blocked detection returns blocked', () => {
		const result = evaluateProviderDetectionGate({
			providerDetection: makeProviderEvidence({
				detectionStatus: 'blocked',
				blockedReasons: ['Policy violation'],
			}),
			checkedAt: CHECKED_AT,
		});
		expect(result.status).toBe('blocked');
		expect(result.message).toContain('Policy violation');
	});

	it('error detection returns blocked', () => {
		const result = evaluateProviderDetectionGate({
			providerDetection: makeProviderEvidence({ detectionStatus: 'error' }),
			checkedAt: CHECKED_AT,
		});
		expect(result.status).toBe('blocked');
	});

	it('found (not verified) returns partial', () => {
		const result = evaluateProviderDetectionGate({
			providerDetection: makeProviderEvidence({ detectionStatus: 'found' }),
			checkedAt: CHECKED_AT,
		});
		expect(result.status).toBe('partial');
		expect(result.message).toContain('not yet version-checked');
	});

	it('version_checked returns pass', () => {
		const result = evaluateProviderDetectionGate({
			providerDetection: makeProviderEvidence({
				detectionStatus: 'version_checked',
				version: 'v1.2.3',
			}),
			checkedAt: CHECKED_AT,
		});
		expect(result.status).toBe('pass');
		expect(result.message).toContain('v1.2.3');
	});

	it('help_checked returns pass', () => {
		const result = evaluateProviderDetectionGate({
			providerDetection: makeProviderEvidence({ detectionStatus: 'help_checked' }),
			checkedAt: CHECKED_AT,
		});
		expect(result.status).toBe('pass');
	});

	it('source is evidence when provider detection present', () => {
		const result = evaluateProviderDetectionGate({
			providerDetection: makeProviderEvidence({ detectionStatus: 'version_checked' }),
			checkedAt: CHECKED_AT,
		});
		expect(result.source).toBe('evidence');
	});

	it('evidenceRefs includes detection evidence ID', () => {
		const result = evaluateProviderDetectionGate({
			providerDetection: makeProviderEvidence({ detectionStatus: 'version_checked' }),
			checkedAt: CHECKED_AT,
		});
		expect(result.evidenceRefs.length).toBeGreaterThan(0);
	});
});

// ═══════════════════════════════════════════════════════════════════════════
// Model Profile Gate
// ═══════════════════════════════════════════════════════════════════════════

describe('evaluateModelProfileGate', () => {
	it('missing modelProfile returns missing', () => {
		const result = evaluateModelProfileGate({
			modelProfile: undefined,
			checkedAt: CHECKED_AT,
		});
		expect(result.status).toBe('missing');
		expect(result.source).toBe('missing');
	});

	it('blocked warmup model returns blocked', () => {
		const result = evaluateModelProfileGate({
			modelProfile: makeModelProfile({ warmupStatus: 'blocked' }),
			checkedAt: CHECKED_AT,
		});
		expect(result.status).toBe('blocked');
	});

	it('chat-only model returns partial', () => {
		const result = evaluateModelProfileGate({
			modelProfile: makeModelProfile({ capabilities: ['chat_only'], warmupLevel: 0 }),
			checkedAt: CHECKED_AT,
		});
		expect(result.status).toBe('partial');
		expect(result.message).toContain('chat-only');
	});

	it('valid active model returns pass', () => {
		const result = evaluateModelProfileGate({
			modelProfile: makeModelProfile({ warmupLevel: 4, warmupStatus: 'pass', allowedForRealRuns: true }),
			checkedAt: CHECKED_AT,
		});
		expect(result.status).toBe('pass');
	});

	it('model with low warmup level and not allowed for demo returns blocked', () => {
		const result = evaluateModelProfileGate({
			modelProfile: makeModelProfile({ warmupLevel: 0, allowedForDemo: false }),
			checkedAt: CHECKED_AT,
		});
		expect(result.status).toBe('blocked');
	});

	it('model with warmup fail returns blocked', () => {
		const result = evaluateModelProfileGate({
			modelProfile: makeModelProfile({ warmupStatus: 'fail' }),
			checkedAt: CHECKED_AT,
		});
		expect(result.status).toBe('blocked');
	});
});

// ═══════════════════════════════════════════════════════════════════════════
// Model Warm-up Gate
// ═══════════════════════════════════════════════════════════════════════════

describe('evaluateModelWarmupGate', () => {
	it('missing modelProfile returns missing', () => {
		const result = evaluateModelWarmupGate({
			modelProfile: undefined,
			checkedAt: CHECKED_AT,
		});
		expect(result.status).toBe('missing');
	});

	it('warmup level 0 returns not_checked', () => {
		const result = evaluateModelWarmupGate({
			modelProfile: makeModelProfile({ warmupLevel: 0 }),
			checkedAt: CHECKED_AT,
		});
		expect(result.status).toBe('not_checked');
		expect(result.message).toContain('level is 0');
	});

	it('warmup level 1 returns not_checked', () => {
		const result = evaluateModelWarmupGate({
			modelProfile: makeModelProfile({ warmupLevel: 1 }),
			checkedAt: CHECKED_AT,
		});
		expect(result.status).toBe('not_checked');
	});

	it('warmup level 2 returns not_checked', () => {
		const result = evaluateModelWarmupGate({
			modelProfile: makeModelProfile({ warmupLevel: 2 }),
			checkedAt: CHECKED_AT,
		});
		expect(result.status).toBe('not_checked');
	});

	it('warmup level 3 returns partial (demo only)', () => {
		const result = evaluateModelWarmupGate({
			modelProfile: makeModelProfile({ warmupLevel: 3 }),
			checkedAt: CHECKED_AT,
		});
		expect(result.status).toBe('partial');
	});

	it('warmup level 4 + pass returns pass', () => {
		const result = evaluateModelWarmupGate({
			modelProfile: makeModelProfile({ warmupLevel: 4, warmupStatus: 'pass' }),
			checkedAt: CHECKED_AT,
		});
		expect(result.status).toBe('pass');
	});

	it('warmup level 4 + fail returns blocked', () => {
		const result = evaluateModelWarmupGate({
			modelProfile: makeModelProfile({ warmupLevel: 4, warmupStatus: 'fail' }),
			checkedAt: CHECKED_AT,
		});
		expect(result.status).toBe('blocked');
	});

	it('warmup level 4 + blocked returns blocked', () => {
		const result = evaluateModelWarmupGate({
			modelProfile: makeModelProfile({ warmupLevel: 4, warmupStatus: 'blocked' }),
			checkedAt: CHECKED_AT,
		});
		expect(result.status).toBe('blocked');
	});
});

// ═══════════════════════════════════════════════════════════════════════════
// Spec Kit Sync Gate
// ═══════════════════════════════════════════════════════════════════════════

describe('evaluateSpecKitSyncGate', () => {
	it('missing providerProfile returns missing', () => {
		const result = evaluateSpecKitSyncGate({
			providerProfile: undefined,
			checkedAt: CHECKED_AT,
		});
		expect(result.status).toBe('missing');
	});

	it('synced with no reSyncReasons returns pass', () => {
		const result = evaluateSpecKitSyncGate({
			providerProfile: makeProviderProfile({
				specKitSyncStatus: 'synced',
				reSyncReasons: [],
			}),
			checkedAt: CHECKED_AT,
		});
		expect(result.status).toBe('pass');
	});

	it('needs_resync returns blocked', () => {
		const result = evaluateSpecKitSyncGate({
			providerProfile: makeProviderProfile({
				specKitSyncStatus: 'needs_resync',
				reSyncReasons: ['model_profile_changed'],
			}),
			checkedAt: CHECKED_AT,
		});
		expect(result.status).toBe('blocked');
		expect(result.blockedReasons).toContain('model_profile_changed');
	});

	it('fail returns blocked', () => {
		const result = evaluateSpecKitSyncGate({
			providerProfile: makeProviderProfile({ specKitSyncStatus: 'fail' }),
			checkedAt: CHECKED_AT,
		});
		expect(result.status).toBe('blocked');
	});

	it('blocked returns blocked', () => {
		const result = evaluateSpecKitSyncGate({
			providerProfile: makeProviderProfile({ specKitSyncStatus: 'blocked' }),
			checkedAt: CHECKED_AT,
		});
		expect(result.status).toBe('blocked');
	});

	it('partial returns partial', () => {
		const result = evaluateSpecKitSyncGate({
			providerProfile: makeProviderProfile({ specKitSyncStatus: 'partial' }),
			checkedAt: CHECKED_AT,
		});
		expect(result.status).toBe('partial');
	});

	it('unknown returns not_checked', () => {
		const result = evaluateSpecKitSyncGate({
			providerProfile: makeProviderProfile({ specKitSyncStatus: 'unknown' }),
			checkedAt: CHECKED_AT,
		});
		expect(result.status).toBe('not_checked');
	});

	it('source is store when providerProfile present', () => {
		const result = evaluateSpecKitSyncGate({
			providerProfile: makeProviderProfile(),
			checkedAt: CHECKED_AT,
		});
		expect(result.source).toBe('store');
	});
});

// ═══════════════════════════════════════════════════════════════════════════
// MCP Warm-up Gate
// ═══════════════════════════════════════════════════════════════════════════

describe('evaluateMcpWarmupGate', () => {
	it('missing evidence returns missing', () => {
		const result = evaluateMcpWarmupGate({
			manifests: undefined,
			evidence: undefined,
			checkedAt: CHECKED_AT,
		});
		expect(result.status).toBe('missing');
	});

	it('empty manifests returns missing', () => {
		const result = evaluateMcpWarmupGate({
			manifests: [],
			evidence: [],
			checkedAt: CHECKED_AT,
		});
		expect(result.status).toBe('missing');
	});

	it('no required manifests returns missing', () => {
		const result = evaluateMcpWarmupGate({
			manifests: [makeMcpManifest('optional-server', 'optional')],
			evidence: [makeMcpEvidence('optional-server')],
			checkedAt: CHECKED_AT,
		});
		expect(result.status).toBe('missing');
	});

	it('required MCP missing evidence returns missing', () => {
		const result = evaluateMcpWarmupGate({
			manifests: [makeMcpManifest('required-server', 'required')],
			evidence: [],
			checkedAt: CHECKED_AT,
		});
		expect(result.status).toBe('missing');
	});

	it('required MCP fail returns blocked', () => {
		const result = evaluateMcpWarmupGate({
			manifests: [makeMcpManifest('fail-server', 'required')],
			evidence: [makeMcpEvidence('fail-server', 'fail')],
			checkedAt: CHECKED_AT,
		});
		expect(result.status).toBe('blocked');
	});

	it('required MCP blocked returns blocked', () => {
		const result = evaluateMcpWarmupGate({
			manifests: [makeMcpManifest('blocked-server', 'required')],
			evidence: [makeMcpEvidence('blocked-server', 'blocked')],
			checkedAt: CHECKED_AT,
		});
		expect(result.status).toBe('blocked');
	});

	it('all required MCP pass returns pass', () => {
		const result = evaluateMcpWarmupGate({
			manifests: [makeMcpManifest('pass-server-1', 'required'), makeMcpManifest('pass-server-2', 'required')],
			evidence: [makeMcpEvidence('pass-server-1', 'pass'), makeMcpEvidence('pass-server-2', 'pass')],
			checkedAt: CHECKED_AT,
		});
		expect(result.status).toBe('pass');
	});

	it('optional MCP fail does not block required', () => {
		const result = evaluateMcpWarmupGate({
			manifests: [
				makeMcpManifest('required-server', 'required'),
				makeMcpManifest('optional-server', 'optional'),
			],
			evidence: [
				makeMcpEvidence('required-server', 'pass'),
				makeMcpEvidence('optional-server', 'fail'),
			],
			checkedAt: CHECKED_AT,
		});
		expect(result.status).toBe('pass');
		expect(result.blockedReasons.some(r => r.includes('Warnings'))).toBe(true);
	});
});

// ═══════════════════════════════════════════════════════════════════════════
// Tool Gateway Gate
// ═══════════════════════════════════════════════════════════════════════════

describe('evaluateToolGatewayGate', () => {
	it('missing status returns missing', () => {
		const result = evaluateToolGatewayGate({
			toolGatewayStatus: undefined,
			checkedAt: CHECKED_AT,
		});
		expect(result.status).toBe('missing');
	});

	it('sealed gateway returns pass', () => {
		const result = evaluateToolGatewayGate({
			toolGatewayStatus: {
				gatewayEnabled: false,
				mcpExposeEnabled: false,
				registeredTools: 5,
				sealed: true,
				runtimeActive: false,
			},
			checkedAt: CHECKED_AT,
		});
		expect(result.status).toBe('pass');
	});

	it('not-sealed gateway returns partial', () => {
		const result = evaluateToolGatewayGate({
			toolGatewayStatus: {
				gatewayEnabled: false,
				mcpExposeEnabled: false,
				registeredTools: 5,
				sealed: false,
				runtimeActive: false,
			},
			checkedAt: CHECKED_AT,
		});
		expect(result.status).toBe('partial');
	});

	it('gateway disabled is noted in message', () => {
		const result = evaluateToolGatewayGate({
			toolGatewayStatus: {
				gatewayEnabled: false,
				mcpExposeEnabled: false,
				registeredTools: 0,
				sealed: true,
				runtimeActive: false,
			},
			checkedAt: CHECKED_AT,
		});
		expect(result.message).toContain('disabled');
	});
});

// ═══════════════════════════════════════════════════════════════════════════
// Human Approval Gate
// ═══════════════════════════════════════════════════════════════════════════

describe('evaluateHumanApprovalGate', () => {
	it('missing approval gates returns missing (default)', () => {
		const result = evaluateHumanApprovalGate({
			approvalGates: undefined,
			humanApprovedForRealRun: undefined,
			checkedAt: CHECKED_AT,
		});
		expect(result.status).toBe('missing');
	});

	it('explicit humanApprovedForRealRun=true returns pass (even without gates)', () => {
		const result = evaluateHumanApprovalGate({
			approvalGates: undefined,
			humanApprovedForRealRun: true,
			checkedAt: CHECKED_AT,
		});
		expect(result.status).toBe('pass');
	});

	it('pending approval returns not_checked', () => {
		const result = evaluateHumanApprovalGate({
			approvalGates: [makeApprovalGate({ status: 'pending' })],
			checkedAt: CHECKED_AT,
		});
		expect(result.status).toBe('not_checked');
	});

	it('denied approval returns blocked', () => {
		const result = evaluateHumanApprovalGate({
			approvalGates: [makeApprovalGate({ status: 'denied' })],
			checkedAt: CHECKED_AT,
		});
		expect(result.status).toBe('blocked');
	});

	it('blocked gate returns blocked', () => {
		const result = evaluateHumanApprovalGate({
			approvalGates: [makeApprovalGate({ status: 'blocked' })],
			checkedAt: CHECKED_AT,
		});
		expect(result.status).toBe('blocked');
	});

	it('approved returns pass', () => {
		const result = evaluateHumanApprovalGate({
			approvalGates: [makeApprovalGate({ status: 'approved' })],
			checkedAt: CHECKED_AT,
		});
		expect(result.status).toBe('pass');
	});

	it('humanApprovedForRealRun overrides pending but not denied', () => {
		const result = evaluateHumanApprovalGate({
			approvalGates: [makeApprovalGate({ status: 'pending' })],
			humanApprovedForRealRun: true,
			checkedAt: CHECKED_AT,
		});
		expect(result.status).toBe('pass');
	});
});

// ═══════════════════════════════════════════════════════════════════════════
// Security Gate
// ═══════════════════════════════════════════════════════════════════════════

describe('evaluateSecurityGate', () => {
	it('no warnings returns pass', () => {
		const result = evaluateSecurityGate({
			securityWarnings: [],
			checkedAt: CHECKED_AT,
		});
		expect(result.status).toBe('pass');
	});

	it('undefined warnings returns pass', () => {
		const result = evaluateSecurityGate({
			securityWarnings: undefined,
			checkedAt: CHECKED_AT,
		});
		expect(result.status).toBe('pass');
	});

	it('blocking warning returns blocked', () => {
		const result = evaluateSecurityGate({
			securityWarnings: [{ severity: 'critical', blocked: true, message: 'Secrets detected' }],
			checkedAt: CHECKED_AT,
		});
		expect(result.status).toBe('blocked');
	});

	it('critical (not explicitly blocked) returns blocked', () => {
		const result = evaluateSecurityGate({
			securityWarnings: [{ severity: 'critical', blocked: false, message: 'Critical vuln' }],
			checkedAt: CHECKED_AT,
		});
		expect(result.status).toBe('blocked');
	});

	it('high severity returns partial', () => {
		const result = evaluateSecurityGate({
			securityWarnings: [{ severity: 'high', blocked: false, message: 'High severity' }],
			checkedAt: CHECKED_AT,
		});
		expect(result.status).toBe('partial');
	});

	it('info/warning returns pass', () => {
		const result = evaluateSecurityGate({
			securityWarnings: [
				{ severity: 'info', blocked: false, message: 'Info msg' },
				{ severity: 'warning', blocked: false, message: 'Warning msg' },
			],
			checkedAt: CHECKED_AT,
		});
		expect(result.status).toBe('pass');
	});
});

// ═══════════════════════════════════════════════════════════════════════════
// Aggregate Evaluator
// ═══════════════════════════════════════════════════════════════════════════

describe('evaluateInfrastructureGates', () => {
	function makeInput(overrides: Partial<InfrastructureGateEvaluationInput> = {}): InfrastructureGateEvaluationInput {
		return {
			checkedAt: CHECKED_AT,
			...overrides,
		};
	}

	it('returns all 8 gates', () => {
		const summary = evaluateInfrastructureGates(makeInput());
		expect(summary.gates).toHaveLength(8);
	});

	it('all gates missing → overall missing', () => {
		const summary = evaluateInfrastructureGates(makeInput());
		expect(summary.overall).toBe('missing');
	});

	it('readyForDemo false when no state', () => {
		const summary = evaluateInfrastructureGates(makeInput());
		expect(summary.readyForDemo).toBe(false);
	});

	it('readyForReal false when no state', () => {
		const summary = evaluateInfrastructureGates(makeInput());
		expect(summary.readyForReal).toBe(false);
	});

	it('readyForReal false without human approval', () => {
		const summary = evaluateInfrastructureGates(makeInput({
			providerDetection: makeProviderEvidence({ detectionStatus: 'version_checked', version: 'v1.0' }),
			modelProfile: makeModelProfile({ warmupLevel: 4, warmupStatus: 'pass' }),
			providerProfile: makeProviderProfile({ specKitSyncStatus: 'synced', reSyncReasons: [] }),
			mcpManifests: [makeMcpManifest('server-a', 'required')],
			mcpEvidence: [makeMcpEvidence('server-a', 'pass')],
			toolGatewayStatus: {
				gatewayEnabled: false,
				mcpExposeEnabled: false,
				registeredTools: 0,
				sealed: true,
				runtimeActive: false,
			},
			humanApprovedForRealRun: false,
		}));
		expect(summary.readyForReal).toBe(false);
	});

	it('overall blocked when any gate is blocked', () => {
		const summary = evaluateInfrastructureGates(makeInput({
			providerDetection: makeProviderEvidence({ detectionStatus: 'not_found' }),
		}));
		expect(summary.overall).toBe('blocked');
	});

	it('overall pass only when all required gates pass', () => {
		const summary = evaluateInfrastructureGates(makeInput({
			providerDetection: makeProviderEvidence({ detectionStatus: 'version_checked', version: 'v1.0' }),
			modelProfile: makeModelProfile({ warmupLevel: 4, warmupStatus: 'pass' }),
			providerProfile: makeProviderProfile({ specKitSyncStatus: 'synced', reSyncReasons: [] }),
			mcpManifests: [makeMcpManifest('server-a', 'required')],
			mcpEvidence: [makeMcpEvidence('server-a', 'pass')],
			toolGatewayStatus: {
				gatewayEnabled: false,
				mcpExposeEnabled: false,
				registeredTools: 0,
				sealed: true,
				runtimeActive: false,
			},
			approvalGates: [makeApprovalGate({ status: 'approved' })],
			humanApprovedForRealRun: true,
		}));
		expect(summary.overall).toBe('pass');
		expect(summary.readyForReal).toBe(true);
	});

	it('security gate blocks demo when security is blocked', () => {
		const summary = evaluateInfrastructureGates(makeInput({
			securityWarnings: [{ severity: 'critical', blocked: true, message: 'Blocked' }],
		}));
		expect(summary.readyForDemo).toBe(false);
	});

	it('provider detection blocked blocks demo', () => {
		const summary = evaluateInfrastructureGates(makeInput({
			providerDetection: makeProviderEvidence({ detectionStatus: 'blocked', blockedReasons: ['Blocked'] }),
		}));
		expect(summary.readyForDemo).toBe(false);
	});

	it('MCP warmup blocked blocks demo', () => {
		const summary = evaluateInfrastructureGates(makeInput({
			mcpManifests: [makeMcpManifest('server-a', 'required')],
			mcpEvidence: [makeMcpEvidence('server-a', 'fail')],
		}));
		expect(summary.readyForDemo).toBe(false);
	});

	it('blockedReasons aggregated across all gates', () => {
		const summary = evaluateInfrastructureGates(makeInput({
			providerDetection: makeProviderEvidence({ detectionStatus: 'not_found' }),
		}));
		expect(summary.blockedReasons.length).toBeGreaterThan(0);
	});
});

// ═══════════════════════════════════════════════════════════════════════════
// Evidence Mapping
// ═══════════════════════════════════════════════════════════════════════════

describe('buildInfrastructureGateEvidence', () => {
	it('produces redacted evidence from summary', () => {
		const summary = evaluateInfrastructureGates({
			checkedAt: CHECKED_AT,
		});
		const evidence = buildInfrastructureGateEvidence(summary);
		expect(evidence.event).toBe('infrastructure-gates-missing');
		expect(evidence.overall).toBe('missing');
		expect(evidence.gateCount).toBe(8);
		expect(evidence.readyForDemo).toBe(false);
		expect(evidence.readyForReal).toBe(false);
	});

	it('blocked summary produces blocked event', () => {
		const summary: InfrastructureGateSummary = {
			overall: 'blocked',
			gates: [],
			readyForDemo: false,
			readyForReal: false,
			blockedReasons: ['Test reason'],
			checkedAt: CHECKED_AT,
		};
		const evidence = buildInfrastructureGateEvidence(summary);
		expect(evidence.event).toBe('infrastructure-gates-blocked');
	});

	it('pass summary produces ready-for-pipeline event', () => {
		const summary: InfrastructureGateSummary = {
			overall: 'pass',
			gates: [],
			readyForDemo: true,
			readyForReal: true,
			blockedReasons: [],
			checkedAt: CHECKED_AT,
		};
		const evidence = buildInfrastructureGateEvidence(summary);
		expect(evidence.event).toBe('infrastructure-gates-ready-for-pipeline');
	});

	it('redacts paths from blocked reasons', () => {
		const summary: InfrastructureGateSummary = {
			overall: 'blocked',
			gates: [],
			readyForDemo: false,
			readyForReal: false,
			blockedReasons: [
				'Found secret at C:\\Users\\test\\secret.txt',
				'Found secret at /home/test/secret.txt',
				'Normal reason without path',
			],
			checkedAt: CHECKED_AT,
		};
		const evidence = buildInfrastructureGateEvidence(summary);
		expect(evidence.blockedReasons.some(r => r.includes('[REDACTED_PATH]'))).toBe(true);
		expect(evidence.blockedReasons.some(r => r === 'Normal reason without path')).toBe(true);
	});

	it('counts are correct', () => {
		const summary: InfrastructureGateSummary = {
			overall: 'partial',
			gates: [
				{ kind: 'provider_detection', status: 'pass', message: '', source: 'evidence', evidenceRefs: [], blockedReasons: [], checkedAt: CHECKED_AT },
				{ kind: 'model_profile', status: 'blocked', message: '', source: 'missing', evidenceRefs: [], blockedReasons: [], checkedAt: CHECKED_AT },
				{ kind: 'model_warmup', status: 'missing', message: '', source: 'missing', evidenceRefs: [], blockedReasons: [], checkedAt: CHECKED_AT },
				{ kind: 'speckit_sync', status: 'not_checked', message: '', source: 'missing', evidenceRefs: [], blockedReasons: [], checkedAt: CHECKED_AT },
			],
			readyForDemo: false,
			readyForReal: false,
			blockedReasons: [],
			checkedAt: CHECKED_AT,
		};
		const evidence = buildInfrastructureGateEvidence(summary);
		expect(evidence.passCount).toBe(1);
		expect(evidence.blockCount).toBe(1);
		expect(evidence.missingCount).toBe(1);
		expect(evidence.notCheckedCount).toBe(1);
	});
});
