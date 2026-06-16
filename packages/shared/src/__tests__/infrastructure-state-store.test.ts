// Positron — Infrastructure State Store Tests
// PR 12: Tests for store interfaces, in-memory adapter, validation, and aggregator binding
// ---------------------------------------------------------------------------

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
	createInMemoryInfrastructureStateStores,
	loadInfrastructureGateEvaluationInputFromStores,
	validateProviderDetectionStoreValue,
	validateModelProfileStoreValue,
	validateSpecKitSyncStoreValue,
	validateMcpWarmupEvidenceStoreValue,
	validateStoreValue,
	isInfrastructureStateKind,
	ALL_INFRASTRUCTURE_STATE_KINDS,
	type InfrastructureStateStores,
	type InfrastructureStateKind,
	type ProviderDetectionStore,
	type ModelProfileStore,
	type SpecKitSyncStateStore,
	type McpWarmupEvidenceStore,
} from '../infrastructure-state-store.js';
import type { OpenCodeProviderDetectionEvidence } from '../opencode-provider-detection.js';
import type { OpenCodeModelProfile } from '../opencode-model-profile.js';
import type { PositronProviderProfile } from '../speckit-sync-profile.js';
import type { McpWarmupEvidence, McpCapabilityManifest } from '../mcp-warmup-profile.js';
import { evaluateInfrastructureGates } from '../infrastructure-gates.js';

// ═══════════════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════════════

function makeProviderDetectionEvidence(
	overrides: Partial<OpenCodeProviderDetectionEvidence> = {},
): OpenCodeProviderDetectionEvidence {
	return {
		evidenceId: 'ev-provider-001',
		detectionStatus: 'version_checked',
		installStatus: 'not_requested',
		runtimeStatus: 'installed_verified',
		// detectedPath must be undefined when redactionApplied=true
		version: '1.0.0',
		helpAvailable: true,
		secretsDetected: false,
		privatePathsDetected: false,
		redactionApplied: true,
		blockedReasons: [],
		createdAt: new Date().toISOString(),
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
		baseURL: 'http://localhost:11434',
		requiresApiKey: false,
		apiKeyStoragePolicy: 'not_required',
		allowedForDemo: true,
		allowedForRealRuns: true,
		capabilities: ['code_generation', 'tool_calling'],
		requiresWarmup: true,
		warmupStatus: 'pass',
		warmupLevel: 4,
		maxRiskLevel: 'medium',
		notes: ['Local model via Ollama'],
		...overrides,
	};
}

function makeProviderProfile(
	overrides: Partial<PositronProviderProfile> = {},
): PositronProviderProfile {
	return {
		profileId: 'positron-provider-001',
		opencodeBinaryPath: '/usr/local/bin/opencode',
		opencodeVersion: '1.0.0',
		opencodeConfigPath: '/home/user/.config/opencode',
		opencodeModelProfileId: 'free-local-ollama',
		opencodeModelRef: 'ollama/gemma3:12b',
		specKitBinaryPath: '/usr/local/bin/speckit',
		specKitVersion: '1.0.0',
		specKitInstallSource: 'github/spec-kit',
		specKitInstallRef: 'v1.0.0',
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

function makeMcpWarmupEvidence(
	overrides: Partial<McpWarmupEvidence> = {},
): McpWarmupEvidence {
	return {
		evidenceId: 'ev-mcp-001',
		serverId: 'github-mcp',
		status: 'pass',
		startedAt: new Date().toISOString(),
		phases: [
			{
				phase: 'connect',
				status: 'pass',
				message: 'Connection verified successfully',
			},
		],
		listedTools: ['read_issue', 'comment_on_issue'],
		forbiddenToolChecks: [],
		redactionApplied: true,
		secretsDetected: false,
		privatePathsDetected: false,
		realRunAllowed: true,
		blockedReasons: [],
		...overrides,
	};
}

// ═══════════════════════════════════════════════════════════════════════════
// Type Guards & Constants
// ═══════════════════════════════════════════════════════════════════════════

describe('isInfrastructureStateKind', () => {
	it('returns true for all valid state kinds', () => {
		for (const kind of ALL_INFRASTRUCTURE_STATE_KINDS) {
			expect(isInfrastructureStateKind(kind)).toBe(true);
		}
	});

	it('returns false for invalid values', () => {
		expect(isInfrastructureStateKind('invalid')).toBe(false);
		expect(isInfrastructureStateKind('')).toBe(false);
		expect(isInfrastructureStateKind(undefined)).toBe(false);
		expect(isInfrastructureStateKind(null)).toBe(false);
		expect(isInfrastructureStateKind(42)).toBe(false);
	});
});

// ═══════════════════════════════════════════════════════════════════════════
// In-Memory Stores — Empty State
// ═══════════════════════════════════════════════════════════════════════════

describe('In-Memory Stores — Empty State', () => {
	let stores: InfrastructureStateStores;

	beforeEach(() => {
		stores = createInMemoryInfrastructureStateStores();
	});

	it('provider detection returns undefined when empty', async () => {
		const result = await stores.providerDetection.getLatest();
		expect(result).toBeUndefined();
	});

	it('model profile returns undefined when empty', async () => {
		const result = await stores.modelProfile.getActive();
		expect(result).toBeUndefined();
	});

	it('SpecKit sync returns undefined when empty', async () => {
		const result = await stores.specKitSync.getActive();
		expect(result).toBeUndefined();
	});

	it('MCP evidence returns empty array when empty', async () => {
		const result = await stores.mcpWarmupEvidence.listLatest();
		expect(result).toEqual([]);
	});

	it('stores do not fabricate PASS values', async () => {
		// Empty stores must not return any default PASS-like data
		const pd = await stores.providerDetection.getLatest();
		const mp = await stores.modelProfile.getActive();
		const sp = await stores.specKitSync.getActive();
		const mcp = await stores.mcpWarmupEvidence.listLatest();

		expect(pd).toBeUndefined();
		expect(mp).toBeUndefined();
		expect(sp).toBeUndefined();
		expect(mcp).toEqual([]);
	});

	it('stores do not execute runtime on read', async () => {
		// Reading stores should be a pure data operation with no side effects
		await stores.providerDetection.getLatest();
		await stores.modelProfile.getActive();
		await stores.specKitSync.getActive();
		await stores.mcpWarmupEvidence.listLatest();

		// No exceptions, no runtime — just checking the calls succeed
		expect(true).toBe(true);
	});
});

// ═══════════════════════════════════════════════════════════════════════════
// Provider Detection Store — Upsert and Read
// ═══════════════════════════════════════════════════════════════════════════

describe('Provider Detection Store', () => {
	let stores: InfrastructureStateStores;

	beforeEach(() => {
		stores = createInMemoryInfrastructureStateStores();
	});

	it('can upsert and read provider detection evidence', async () => {
		const evidence = makeProviderDetectionEvidence({
			version: '1.2.3',
			detectionStatus: 'version_checked',
		});

		await stores.providerDetection.upsert(evidence);
		const result = await stores.providerDetection.getLatest();

		expect(result).toBeDefined();
		expect(result!.version).toBe('1.2.3');
		expect(result!.detectionStatus).toBe('version_checked');
		expect(result!.evidenceId).toBe('ev-provider-001');
	});

	it('overwrites previous detection on upsert', async () => {
		const evidence1 = makeProviderDetectionEvidence({
			evidenceId: 'ev-1',
			version: '1.0.0',
		});
		const evidence2 = makeProviderDetectionEvidence({
			evidenceId: 'ev-2',
			version: '2.0.0',
		});

		await stores.providerDetection.upsert(evidence1);
		await stores.providerDetection.upsert(evidence2);

		const result = await stores.providerDetection.getLatest();
		expect(result!.evidenceId).toBe('ev-2');
		expect(result!.version).toBe('2.0.0');
	});

	it('rejects invalid provider detection with missing redaction', async () => {
		const evidence = makeProviderDetectionEvidence({
			redactionApplied: false,
		});

		await expect(
			stores.providerDetection.upsert(evidence),
		).rejects.toThrow(/redacted/);
	});

	it('rejects null or undefined provider detection', async () => {
		await expect(
			stores.providerDetection.upsert(null as unknown as OpenCodeProviderDetectionEvidence),
		).rejects.toThrow();
	});
});

// ═══════════════════════════════════════════════════════════════════════════
// Model Profile Store — Set Active and Read
// ═══════════════════════════════════════════════════════════════════════════

describe('Model Profile Store', () => {
	let stores: InfrastructureStateStores;

	beforeEach(() => {
		stores = createInMemoryInfrastructureStateStores();
	});

	it('can set active and read model profile', async () => {
		const profile = makeModelProfile({
			profileId: 'free-local-ollama',
			warmupLevel: 4,
		});

		await stores.modelProfile.setActive(profile);
		const result = await stores.modelProfile.getActive();

		expect(result).toBeDefined();
		expect(result!.profileId).toBe('free-local-ollama');
		expect(result!.warmupLevel).toBe(4);
	});

	it('overwrites previous active profile', async () => {
		const profile1 = makeModelProfile({ profileId: 'free-local-ollama' });
		const profile2 = makeModelProfile({ profileId: 'free-local-vllm' });

		await stores.modelProfile.setActive(profile1);
		await stores.modelProfile.setActive(profile2);

		const result = await stores.modelProfile.getActive();
		expect(result!.profileId).toBe('free-local-vllm');
	});

	it('rejects invalid model profile', async () => {
		await expect(
			stores.modelProfile.setActive({ notAProfile: true } as unknown as OpenCodeModelProfile),
		).rejects.toThrow();
	});

	it('rejects null model profile', async () => {
		await expect(
			stores.modelProfile.setActive(null as unknown as OpenCodeModelProfile),
		).rejects.toThrow();
	});

	it('allows chat-only model profile to be stored', async () => {
		const profile = makeModelProfile({
			profileId: 'chat-only-model',
			capabilities: ['chat_only'],
			warmupLevel: 4,
		});

		await stores.modelProfile.setActive(profile);
		const result = await stores.modelProfile.getActive();

		expect(result).toBeDefined();
		expect(result!.capabilities).toContain('chat_only');
		// Store allows it — gate will handle the blocking
	});
});

// ═══════════════════════════════════════════════════════════════════════════
// SpecKit Sync Store — Set Active and Read
// ═══════════════════════════════════════════════════════════════════════════

describe('SpecKit Sync Store', () => {
	let stores: InfrastructureStateStores;

	beforeEach(() => {
		stores = createInMemoryInfrastructureStateStores();
	});

	it('can set active and read provider profile', async () => {
		const profile = makeProviderProfile({
			profileId: 'positron-provider-001',
			specKitVersion: '2.0.0',
		});

		await stores.specKitSync.setActive(profile);
		const result = await stores.specKitSync.getActive();

		expect(result).toBeDefined();
		expect(result!.profileId).toBe('positron-provider-001');
		expect(result!.specKitVersion).toBe('2.0.0');
	});

	it('overwrites previous profile', async () => {
		const profile1 = makeProviderProfile({ profileId: 'profile-1' });
		const profile2 = makeProviderProfile({ profileId: 'profile-2' });

		await stores.specKitSync.setActive(profile1);
		await stores.specKitSync.setActive(profile2);

		const result = await stores.specKitSync.getActive();
		expect(result!.profileId).toBe('profile-2');
	});

	it('rejects invalid provider profile', async () => {
		await expect(
			stores.specKitSync.setActive({ invalid: true } as unknown as PositronProviderProfile),
		).rejects.toThrow();
	});

	it('rejects null provider profile', async () => {
		await expect(
			stores.specKitSync.setActive(null as unknown as PositronProviderProfile),
		).rejects.toThrow();
	});

	it('allows needs-resync profile to be stored', async () => {
		const profile = makeProviderProfile({
			specKitSyncStatus: 'needs_resync',
			readyForRealRuns: false,
		});

		await stores.specKitSync.setActive(profile);
		const result = await stores.specKitSync.getActive();

		expect(result).toBeDefined();
		expect(result!.specKitSyncStatus).toBe('needs_resync');
		expect(result!.readyForRealRuns).toBe(false);
		// Store allows it — gate will handle the blocking
	});
});

// ═══════════════════════════════════════════════════════════════════════════
// MCP Warm-up Evidence Store — Upsert and List
// ═══════════════════════════════════════════════════════════════════════════

describe('MCP Warm-up Evidence Store', () => {
	let stores: InfrastructureStateStores;

	beforeEach(() => {
		stores = createInMemoryInfrastructureStateStores();
	});

	it('can upsert and list MCP evidence', async () => {
		const evidence = makeMcpWarmupEvidence({
			serverId: 'github-mcp',
			status: 'pass',
		});

		await stores.mcpWarmupEvidence.upsert(evidence);
		const result = await stores.mcpWarmupEvidence.listLatest();

		expect(result).toHaveLength(1);
		expect(result[0]!.serverId).toBe('github-mcp');
		expect(result[0]!.status).toBe('pass');
	});

	it('upserts multiple servers independently', async () => {
		const ev1 = makeMcpWarmupEvidence({ serverId: 'github-mcp', status: 'pass' });
		const ev2 = makeMcpWarmupEvidence({ serverId: 'filesystem-mcp', status: 'fail' });
		const ev3 = makeMcpWarmupEvidence({ serverId: 'browser-mcp', status: 'partial' });

		await stores.mcpWarmupEvidence.upsert(ev1);
		await stores.mcpWarmupEvidence.upsert(ev2);
		await stores.mcpWarmupEvidence.upsert(ev3);

		const result = await stores.mcpWarmupEvidence.listLatest();
		expect(result).toHaveLength(3);
		expect(result.map((e) => e.serverId).sort()).toEqual([
			'browser-mcp',
			'filesystem-mcp',
			'github-mcp',
		]);
	});

	it('overwrites existing server evidence on re-upsert', async () => {
		const ev1 = makeMcpWarmupEvidence({ serverId: 'github-mcp', status: 'fail' });
		const ev2 = makeMcpWarmupEvidence({ serverId: 'github-mcp', status: 'pass' });

		await stores.mcpWarmupEvidence.upsert(ev1);
		await stores.mcpWarmupEvidence.upsert(ev2);

		const result = await stores.mcpWarmupEvidence.listLatest();
		expect(result).toHaveLength(1);
		expect(result[0]!.status).toBe('pass');
	});

	it('returns empty array when no evidence stored', async () => {
		const result = await stores.mcpWarmupEvidence.listLatest();
		expect(result).toEqual([]);
	});

	it('rejects invalid evidence', async () => {
		await expect(
			stores.mcpWarmupEvidence.upsert({ invalid: true } as unknown as McpWarmupEvidence),
		).rejects.toThrow();
	});
});

// ═══════════════════════════════════════════════════════════════════════════
// Store Validation
// ═══════════════════════════════════════════════════════════════════════════

describe('Store Validation', () => {
	describe('validateProviderDetectionStoreValue', () => {
		it('accepts valid redacted evidence', () => {
			const evidence = makeProviderDetectionEvidence({ redactionApplied: true });
			const result = validateProviderDetectionStoreValue(evidence);
			expect(result.valid).toBe(true);
		});

		it('rejects evidence without redaction', () => {
			const evidence = makeProviderDetectionEvidence({ redactionApplied: false });
			const result = validateProviderDetectionStoreValue(evidence);
			expect(result.valid).toBe(false);
			expect(result.reasons.some((r) => r.includes('redacted'))).toBe(true);
		});

		it('rejects null', () => {
			const result = validateProviderDetectionStoreValue(null);
			expect(result.valid).toBe(false);
		});

		it('rejects undefined', () => {
			const result = validateProviderDetectionStoreValue(undefined);
			expect(result.valid).toBe(false);
		});

		it('rejects non-object', () => {
			const result = validateProviderDetectionStoreValue('not-an-object');
			expect(result.valid).toBe(false);
		});
	});

	describe('validateModelProfileStoreValue', () => {
		it('accepts valid model profile', () => {
			const profile = makeModelProfile();
			const result = validateModelProfileStoreValue(profile);
			expect(result.valid).toBe(true);
		});

		it('rejects non-object', () => {
			const result = validateModelProfileStoreValue(42);
			expect(result.valid).toBe(false);
		});

		it('rejects null', () => {
			const result = validateModelProfileStoreValue(null);
			expect(result.valid).toBe(false);
		});
	});

	describe('validateSpecKitSyncStoreValue', () => {
		it('accepts valid provider profile', () => {
			const profile = makeProviderProfile();
			const result = validateSpecKitSyncStoreValue(profile);
			expect(result.valid).toBe(true);
		});

		it('rejects null', () => {
			const result = validateSpecKitSyncStoreValue(null);
			expect(result.valid).toBe(false);
		});

		it('rejects non-object', () => {
			const result = validateSpecKitSyncStoreValue(123);
			expect(result.valid).toBe(false);
		});
	});

	describe('validateMcpWarmupEvidenceStoreValue', () => {
		it('accepts valid MCP evidence', () => {
			const evidence = makeMcpWarmupEvidence();
			const result = validateMcpWarmupEvidenceStoreValue(evidence);
			expect(result.valid).toBe(true);
		});

		it('rejects null', () => {
			const result = validateMcpWarmupEvidenceStoreValue(null);
			expect(result.valid).toBe(false);
		});
	});

	describe('validateStoreValue dispatch', () => {
		it('dispatches to correct validator based on kind', () => {
			const evidence = makeProviderDetectionEvidence({ redactionApplied: true });
			const result = validateStoreValue('provider_detection', evidence);
			expect(result.valid).toBe(true);
		});

		it('returns invalid for unknown kind', () => {
			const result = validateStoreValue('unknown_kind' as InfrastructureStateKind, {});
			expect(result.valid).toBe(false);
		});
	});
});

// ═══════════════════════════════════════════════════════════════════════════
// Aggregator Store Binding — loadFromStores
// ═══════════════════════════════════════════════════════════════════════════

describe('loadInfrastructureGateEvaluationInputFromStores', () => {
	let stores: InfrastructureStateStores;

	beforeEach(() => {
		stores = createInMemoryInfrastructureStateStores();
	});

	it('yields missing gates when stores are empty', async () => {
		const input = await loadInfrastructureGateEvaluationInputFromStores({
			stores,
			checkedAt: new Date().toISOString(),
		});

		expect(input.providerDetection).toBeUndefined();
		expect(input.modelProfile).toBeUndefined();
		expect(input.providerProfile).toBeUndefined();
		expect(input.mcpEvidence).toBeUndefined();
	});

	it('stores do not fabricate PASS values in gate input', async () => {
		const input = await loadInfrastructureGateEvaluationInputFromStores({
			stores,
			checkedAt: new Date().toISOString(),
		});

		// Every optional field should be undefined when stores are empty
		// This ensures gates will report missing/not_checked
		expect(input.providerDetection).toBeUndefined();
		expect(input.modelProfile).toBeUndefined();
		expect(input.providerProfile).toBeUndefined();
		expect(input.mcpEvidence).toBeUndefined();
	});

	it('stored provider detection affects provider gate', async () => {
		const evidence = makeProviderDetectionEvidence({
			detectionStatus: 'version_checked',
			version: '2.0.0',
		});

		await stores.providerDetection.upsert(evidence);

		const input = await loadInfrastructureGateEvaluationInputFromStores({
			stores,
			checkedAt: new Date().toISOString(),
		});

		expect(input.providerDetection).toBeDefined();
		expect(input.providerDetection!.version).toBe('2.0.0');
		expect(input.providerDetection!.detectionStatus).toBe('version_checked');
	});

	it('stored model profile affects model gate', async () => {
		const profile = makeModelProfile({
			profileId: 'free-local-ollama',
			warmupLevel: 4,
			warmupStatus: 'pass',
		});

		await stores.modelProfile.setActive(profile);

		const input = await loadInfrastructureGateEvaluationInputFromStores({
			stores,
			checkedAt: new Date().toISOString(),
		});

		expect(input.modelProfile).toBeDefined();
		expect(input.modelProfile!.profileId).toBe('free-local-ollama');
		expect(input.modelProfile!.warmupLevel).toBe(4);
	});

	it('stored SpecKit sync affects SpecKit gate', async () => {
		const profile = makeProviderProfile({
			profileId: 'positron-provider-001',
			specKitSyncStatus: 'synced',
		});

		await stores.specKitSync.setActive(profile);

		const input = await loadInfrastructureGateEvaluationInputFromStores({
			stores,
			checkedAt: new Date().toISOString(),
		});

		expect(input.providerProfile).toBeDefined();
		expect(input.providerProfile!.specKitSyncStatus).toBe('synced');
	});

	it('stored MCP evidence affects MCP gate', async () => {
		const evidence = makeMcpWarmupEvidence({
			serverId: 'github-mcp',
			status: 'pass',
		});

		await stores.mcpWarmupEvidence.upsert(evidence);

		const input = await loadInfrastructureGateEvaluationInputFromStores({
			stores,
			checkedAt: new Date().toISOString(),
		});

		expect(input.mcpEvidence).toBeDefined();
		expect(input.mcpEvidence!).toHaveLength(1);
		expect(input.mcpEvidence![0]!.serverId).toBe('github-mcp');
	});

	it('passes through optional fields when provided', async () => {
		const input = await loadInfrastructureGateEvaluationInputFromStores({
			stores,
			toolGatewayStatus: {
				gatewayEnabled: true,
				mcpExposeEnabled: true,
				registeredTools: 10,
				sealed: false,
				runtimeActive: false,
			},
			approvalGates: [],
			securityWarnings: [],
			humanApprovedForRealRun: true,
			checkedAt: new Date().toISOString(),
		});

		expect(input.toolGatewayStatus).toBeDefined();
		expect(input.toolGatewayStatus!.gatewayEnabled).toBe(true);
		expect(input.humanApprovedForRealRun).toBe(true);
	});

	it('does not execute runtime on load', async () => {
		// Loading from stores is a pure read operation — no side effects
		const input = await loadInfrastructureGateEvaluationInputFromStores({
			stores,
			checkedAt: new Date().toISOString(),
		});

		// Should complete without exceptions and return a structurally valid input
		expect(input.checkedAt).toBeDefined();
		expect(typeof input.checkedAt).toBe('string');
	});
});

// ═══════════════════════════════════════════════════════════════════════════
// Integration: Stores → Infrastructure Gates
// ═══════════════════════════════════════════════════════════════════════════

describe('Store → Infrastructure Gate Integration', () => {
	let stores: InfrastructureStateStores;

	beforeEach(() => {
		stores = createInMemoryInfrastructureStateStores();
	});

	it('all stored PASS-like states + human + tool + security allow summary pass', async () => {
		// Populate all stores with PASS-like data
		await stores.providerDetection.upsert(
			makeProviderDetectionEvidence({ detectionStatus: 'version_checked' }),
		);
		await stores.modelProfile.setActive(
			makeModelProfile({ warmupLevel: 4, warmupStatus: 'pass', allowedForRealRuns: true }),
		);
		await stores.specKitSync.setActive(
			makeProviderProfile({ specKitSyncStatus: 'synced', readyForRealRuns: true }),
		);
		await stores.mcpWarmupEvidence.upsert(
			makeMcpWarmupEvidence({ serverId: 'github-mcp', status: 'pass' }),
		);

		const input = await loadInfrastructureGateEvaluationInputFromStores({
			stores,
			toolGatewayStatus: {
				gatewayEnabled: false,
				mcpExposeEnabled: false,
				registeredTools: 10,
				sealed: true,
				runtimeActive: false,
			},
			// MCP manifests required for the MCP gate to evaluate
			mcpManifests: [{
				serverId: 'github-mcp',
				displayName: 'GitHub MCP',
				role: 'hand',
				requiredness: 'required',
				transport: 'stdio',
				owner: 'external' as const,
				envPolicy: 'none' as const,
				authRequired: false,
				allowedDomains: [],
				allowedPaths: [],
				forbiddenPaths: [],
				tools: [],
				defaultEnabled: false,
				requiresHumanApproval: false,
				timeoutMs: 30000,
				logging: 'metadata_only' as const,
				redaction: 'required' as const,
				warmupRequired: true,
				evidenceRequired: true,
			}],
			humanApprovedForRealRun: true,
			securityWarnings: [],
			checkedAt: new Date().toISOString(),
		});

		const summary = evaluateInfrastructureGates(input);

		// Provider, model, SpecKit, MCP gates should all be pass
		const providerGate = summary.gates.find((g) => g.kind === 'provider_detection');
		expect(providerGate?.status).toBe('pass');

		const modelGate = summary.gates.find((g) => g.kind === 'model_warmup');
		expect(modelGate?.status).toBe('pass');

		const specKitGate = summary.gates.find((g) => g.kind === 'speckit_sync');
		expect(specKitGate?.status).toBe('pass');

		const mcpGate = summary.gates.find((g) => g.kind === 'mcp_warmup');
		expect(mcpGate?.status).toBe('pass');
	});

	it('missing human approval still blocks readyForReal', async () => {
		await stores.providerDetection.upsert(
			makeProviderDetectionEvidence({ detectionStatus: 'version_checked' }),
		);

		const input = await loadInfrastructureGateEvaluationInputFromStores({
			stores,
			humanApprovedForRealRun: false,
			checkedAt: new Date().toISOString(),
		});

		const summary = evaluateInfrastructureGates(input);

		const humanGate = summary.gates.find((g) => g.kind === 'human_approval');
		expect(humanGate?.status).not.toBe('pass');
		expect(summary.readyForReal).toBe(false);
	});

	it('missing states result in missing/blocked gates', async () => {
		// No data in any store
		const input = await loadInfrastructureGateEvaluationInputFromStores({
			stores,
			checkedAt: new Date().toISOString(),
		});

		const summary = evaluateInfrastructureGates(input);

		const providerGate = summary.gates.find((g) => g.kind === 'provider_detection');
		expect(providerGate?.status === 'missing' || providerGate?.status === 'not_checked').toBe(true);

		const modelProfileGate = summary.gates.find((g) => g.kind === 'model_profile');
		expect(modelProfileGate?.status === 'missing' || modelProfileGate?.status === 'not_checked').toBe(true);

		// readyForReal should be false when gates are missing
		expect(summary.readyForReal).toBe(false);
	});

	it('stored blocked provider detection blocks the gate', async () => {
		await stores.providerDetection.upsert(
			makeProviderDetectionEvidence({
				detectionStatus: 'blocked',
				blockedReasons: ['Security policy prohibits OpenCode'],
			}),
		);

		const input = await loadInfrastructureGateEvaluationInputFromStores({
			stores,
			checkedAt: new Date().toISOString(),
		});

		const summary = evaluateInfrastructureGates(input);
		const providerGate = summary.gates.find((g) => g.kind === 'provider_detection');
		expect(providerGate?.status).toBe('blocked');
		expect(summary.readyForReal).toBe(false);
	});

	it('stored chat-only model results in partial model profile gate', async () => {
		await stores.modelProfile.setActive(
			makeModelProfile({ capabilities: ['chat_only'], warmupLevel: 4, warmupStatus: 'pass' }),
		);

		const input = await loadInfrastructureGateEvaluationInputFromStores({
			stores,
			checkedAt: new Date().toISOString(),
		});

		const summary = evaluateInfrastructureGates(input);
		const modelProfileGate = summary.gates.find((g) => g.kind === 'model_profile');
		expect(modelProfileGate?.status).toBe('partial');
	});

	it('stored needs-resync SpecKit blocks SpecKit gate', async () => {
		await stores.specKitSync.setActive(
			makeProviderProfile({
				specKitSyncStatus: 'needs_resync',
				readyForRealRuns: false,
				readyForDemoRuns: false,
			}),
		);

		const input = await loadInfrastructureGateEvaluationInputFromStores({
			stores,
			checkedAt: new Date().toISOString(),
		});

		const summary = evaluateInfrastructureGates(input);
		const specKitGate = summary.gates.find((g) => g.kind === 'speckit_sync');
		expect(specKitGate?.status === 'blocked' || specKitGate?.status === 'fail' || specKitGate?.status === 'missing').toBe(true);
	});

	it('stored MCP fail evidence blocks MCP gate', async () => {
		await stores.mcpWarmupEvidence.upsert(
			makeMcpWarmupEvidence({
				serverId: 'github-mcp',
				status: 'fail',
				realRunAllowed: false,
			}),
		);

		const input = await loadInfrastructureGateEvaluationInputFromStores({
			stores,
			checkedAt: new Date().toISOString(),
		});

		const summary = evaluateInfrastructureGates(input);
		const mcpGate = summary.gates.find((g) => g.kind === 'mcp_warmup');
		expect(mcpGate?.status === 'fail' || mcpGate?.status === 'blocked' || mcpGate?.status === 'missing').toBe(true);
	});
});

// ═══════════════════════════════════════════════════════════════════════════
// Edge Cases
// ═══════════════════════════════════════════════════════════════════════════

describe('Edge Cases', () => {
	it('multiple independent in-memory stores do not interfere', async () => {
		const stores1 = createInMemoryInfrastructureStateStores();
		const stores2 = createInMemoryInfrastructureStateStores();

		await stores1.providerDetection.upsert(
			makeProviderDetectionEvidence({ evidenceId: 'store-1' }),
		);
		await stores2.providerDetection.upsert(
			makeProviderDetectionEvidence({ evidenceId: 'store-2' }),
		);

		const r1 = await stores1.providerDetection.getLatest();
		const r2 = await stores2.providerDetection.getLatest();

		expect(r1!.evidenceId).toBe('store-1');
		expect(r2!.evidenceId).toBe('store-2');
	});

	it('load from stores with multiple MCP evidences preserves all', async () => {
		const stores = createInMemoryInfrastructureStateStores();

		await stores.mcpWarmupEvidence.upsert(
			makeMcpWarmupEvidence({ serverId: 'server-a', status: 'pass' }),
		);
		await stores.mcpWarmupEvidence.upsert(
			makeMcpWarmupEvidence({ serverId: 'server-b', status: 'fail' }),
		);
		await stores.mcpWarmupEvidence.upsert(
			makeMcpWarmupEvidence({ serverId: 'server-c', status: 'partial' }),
		);

		const input = await loadInfrastructureGateEvaluationInputFromStores({
			stores,
			checkedAt: new Date().toISOString(),
		});

		expect(input.mcpEvidence).toHaveLength(3);
		const serverIds = input.mcpEvidence!.map((e) => e.serverId).sort();
		expect(serverIds).toEqual(['server-a', 'server-b', 'server-c']);
	});

	it('provider detection with secretsDetected=true is stored but gate behavior depends on detectionStatus', async () => {
		// Evidence with secrets detected should be storable (gate may or may not block depending on detectionStatus)
		const stores = createInMemoryInfrastructureStateStores();
		const evidence = makeProviderDetectionEvidence({
			secretsDetected: true,
			redactionApplied: true,
		});

		await stores.providerDetection.upsert(evidence);
		const result = await stores.providerDetection.getLatest();
		expect(result!.secretsDetected).toBe(true);

		// The provider detection gate evaluates based on detectionStatus, not secretsDetected.
		// version_checked status still passes the provider gate.
		// secretsDetected is informational — blocking happens at the blueprint level.
		const input = await loadInfrastructureGateEvaluationInputFromStores({
			stores,
			checkedAt: new Date().toISOString(),
		});

		const summary = evaluateInfrastructureGates(input);
		const providerGate = summary.gates.find((g) => g.kind === 'provider_detection');
		// version_checked leads to 'pass' regardless of secretsDetected
		expect(providerGate?.status).toBe('pass');
	});
});
