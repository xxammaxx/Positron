// Positron — Infrastructure State Upsert Tests (Shared Package)
// PR 15: Tests for upsert payload validation, redaction, and safety rules
// ---------------------------------------------------------------------------
// Tests cover:
// - Valid Provider Detection upsert
// - Secret detection and rejection
// - Private path redaction enforcement
// - Model Profile upsert with unknown-provider-blocked
// - Model Profile with API key rejection
// - Spec Kit Sync with non-github source rejection
// - Spec Kit Sync unpinned source treatment
// - MCP Evidence real transport rejection
// - MCP Evidence without redaction rejection
// - Blocked/disabled upsert handling
// ---------------------------------------------------------------------------

import { describe, it, expect, beforeEach } from 'vitest';
import {
	createInMemoryInfrastructureStateStores,
	type InfrastructureStateStores,
} from '../infrastructure-state-store.js';
import {
	validateProviderDetectionUpsert,
	validateModelProfileUpsert,
	validateSpecKitSyncUpsert,
	validateMcpWarmupEvidenceUpsert,
	validateInfrastructureStateUpsert,
	executeSafeUpsert,
	containsSecrets,
	scanObjectForSecrets,
	isPrivatePath,
	redactPrivatePath,
	createUpsertEvidenceEvent,
	getInfrastructureStateStatus,
	type UpsertProviderDetectionRequest,
	type UpsertModelProfileRequest,
	type UpsertSpecKitSyncRequest,
	type UpsertMcpWarmupEvidenceRequest,
} from '../infrastructure-state-upsert.js';

// ═══════════════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════════════

function makeValidProviderDetection(): UpsertProviderDetectionRequest {
	return {
		evidence: {
			evidenceId: `test-pd-${Date.now()}`,
			detectionStatus: 'version_checked',
			installStatus: 'not_requested',
			runtimeStatus: 'model_profile_required',
			version: '1.17.7',
			helpAvailable: true,
			redactionApplied: true,
			secretsDetected: false,
			privatePathsDetected: false,
			blockedReasons: [],
			createdAt: new Date().toISOString(),
		},
	};
}

function makeValidModelProfile(): UpsertModelProfileRequest {
	return {
		profile: {
			profileId: `test-model-${Date.now()}`,
			displayName: 'Test Model',
			providerId: 'ollama',
			modelId: 'test-model:latest',
			opencodeModelRef: 'ollama/test-model:latest',
			costClass: 'free_local',
			executionClass: 'local',
			baseURL: 'http://localhost:11434/v1',
			requiresApiKey: false,
			apiKeyStoragePolicy: 'not_required',
			allowedForDemo: true,
			allowedForRealRuns: false,
			capabilities: ['chat_only'],
			requiresWarmup: true,
			warmupStatus: 'unknown',
			warmupLevel: 0,
			maxRiskLevel: 'low',
			notes: ['Test profile'],
		},
	};
}

function makeValidSpecKitSync(): UpsertSpecKitSyncRequest {
	return {
		profile: {
			profileId: `test-speckit-${Date.now()}`,
			opencodeBinaryPath: '$HOME/.positron/tools/bin/opencode',
			opencodeVersion: '1.17.7',
			opencodeConfigPath: '$HOME/.positron/config/opencode.json',
			opencodeModelProfileId: 'unknown-provider-blocked',
			opencodeModelRef: 'unknown/blocked',
			specKitBinaryPath: '$HOME/.positron/tools/bin/specify',
			specKitVersion: 'v0.10.4.dev0',
			specKitInstallSource: 'github/spec-kit',
			specKitInstallRef: 'v0.10.4.dev0',
			specKitMode: 'adapter_bridge',
			mcpWarmupStatus: 'unknown',
			modelWarmupStatus: 'unknown',
			specKitSyncStatus: 'partial',
			providerProfileReadiness: 'not_ready',
			readyForDemoRuns: false,
			readyForRealRuns: false,
			reSyncReasons: [],
		},
	};
}

function makeValidMcpWarmup(): UpsertMcpWarmupEvidenceRequest {
	return {
		evidence: {
			evidenceId: `test-mcp-${Date.now()}`,
			serverId: 'github-mcp',
			status: 'unknown',
			startedAt: new Date().toISOString(),
			phases: [
				{
					phase: 'connect',
					status: 'unknown',
					message: 'Dry-run: no real connection',
				},
				{
					phase: 'redaction_check',
					status: 'pass',
					message: 'Redaction applied',
				},
			],
			listedTools: [],
			forbiddenToolChecks: [],
			redactionApplied: true,
			secretsDetected: false,
			privatePathsDetected: false,
			realRunAllowed: false,
			blockedReasons: ['Dry-run only'],
		},
	};
}

// ═══════════════════════════════════════════════════════════════════════════
// Secret Detection Tests
// ═══════════════════════════════════════════════════════════════════════════

describe('Secret Detection', () => {
	it('detects GitHub PAT', () => {
		expect(containsSecrets('ghp_abcdefghijklmnopqrstuvwxyz1234567890AB')).toBe(true);
	});

	it('detects OpenAI-style key', () => {
		expect(containsSecrets('sk-abcdefghijklmnopqrstuvwxyz1234567890ABCD')).toBe(true);
	});

	it('detects Bearer token', () => {
		expect(containsSecrets('Authorization: Bearer abcdef1234567890abcdef1234567890')).toBe(true);
	});

	it('does not flag normal strings', () => {
		expect(containsSecrets('hello world')).toBe(false);
		expect(containsSecrets('/opt/positron/tools/bin/opencode')).toBe(false);
		expect(containsSecrets('v1.17.7')).toBe(false);
	});

	it('scans nested objects for secrets', () => {
		const obj = {
			evidence: {
				apiKey: 'sk-abcdefghijklmnopqrstuvwxyz1234567890ABCD',
				normal: 'hello',
			},
		};
		const found = scanObjectForSecrets(obj);
		expect(found.length).toBeGreaterThan(0);
		expect(found[0]).toContain('apiKey');
	});

	it('scans array for secrets', () => {
		const obj = {
			items: ['normal', 'ghp_abcdefghijklmnopqrstuvwxyz1234567890AB'],
		};
		const found = scanObjectForSecrets(obj);
		expect(found.length).toBeGreaterThan(0);
	});

	it('returns empty for secret-free objects', () => {
		const obj = { name: 'test', version: '1.0.0', enabled: true };
		expect(scanObjectForSecrets(obj)).toEqual([]);
	});
});

// ═══════════════════════════════════════════════════════════════════════════
// Private Path Detection Tests
// ═══════════════════════════════════════════════════════════════════════════

describe('Private Path Detection', () => {
	it('detects /root/ paths as private', () => {
		expect(isPrivatePath('/root/.opencode/bin/opencode')).toBe(true);
	});

	it('detects /home/ paths as private', () => {
		expect(isPrivatePath('/home/user/project')).toBe(true);
	});

	it('detects Windows user paths as private', () => {
		expect(isPrivatePath('C:\\Users\\user\\project')).toBe(true);
	});

	it('does not flag system paths', () => {
		expect(isPrivatePath('/opt/positron/tools/bin/opencode')).toBe(false);
		expect(isPrivatePath('/usr/local/bin')).toBe(false);
	});

	it('redacts /root/ to $HOME/', () => {
		expect(redactPrivatePath('/root/.opencode/bin/opencode')).toBe('$HOME/.opencode/bin/opencode');
	});

	it('redacts /home/user/ to $HOME/', () => {
		expect(redactPrivatePath('/home/testuser/project/config')).toBe('$HOME/project/config');
	});

	it('leaves system paths unchanged', () => {
		expect(redactPrivatePath('/opt/positron/tools/bin/opencode')).toBe('/opt/positron/tools/bin/opencode');
	});
});

// ═══════════════════════════════════════════════════════════════════════════
// Provider Detection Upsert Validation Tests
// ═══════════════════════════════════════════════════════════════════════════

describe('validateProviderDetectionUpsert', () => {
	it('accepts valid provider detection payload', () => {
		const result = validateProviderDetectionUpsert(makeValidProviderDetection());
		expect(result.valid).toBe(true);
	});

	it('rejects null payload', () => {
		const result = validateProviderDetectionUpsert(null);
		expect(result.valid).toBe(false);
		expect(result.blockedReasons.some(r => r.includes('non-null'))).toBe(true);
	});

	it('rejects missing evidence field', () => {
		const result = validateProviderDetectionUpsert({ other: 'data' });
		expect(result.valid).toBe(false);
		expect(result.blockedReasons.some(r => r.includes('evidence'))).toBe(true);
	});

	it('rejects evidence without redactionApplied', () => {
		const payload = makeValidProviderDetection();
		payload.evidence.redactionApplied = false;
		const result = validateProviderDetectionUpsert(payload);
		expect(result.valid).toBe(false);
		expect(result.blockedReasons.some(r => r.includes('redactionApplied'))).toBe(true);
	});

	it('rejects evidence with secrets', () => {
		const payload = makeValidProviderDetection();
		// Inject a secret — the opencode evidence validation rejects apiKey fields
		// (which is checked before our secret scanner runs)
		const tainted = {
			evidence: {
				...payload.evidence,
				apiKey: 'ghp_abcdefghijklmnopqrstuvwxyz1234567890AB',
			},
		};
		const result = validateProviderDetectionUpsert(tainted);
		expect(result.valid).toBe(false);
		// Either the opencode validation catches the apiKey field,
		// or our secret scanner catches it
		expect(result.blockedReasons.length).toBeGreaterThan(0);
	});

	it('rejects evidence with unredacted private path', () => {
		const payload = makeValidProviderDetection();
		// redactionApplied=false + private path → rejected
		payload.evidence.redactionApplied = false;
		payload.evidence.detectedPath = '/root/.opencode/bin/opencode';
		const result = validateProviderDetectionUpsert(payload);
		expect(result.valid).toBe(false);
		expect(result.blockedReasons.some(r =>
			r.includes('redactionApplied') || r.includes('Private filesystem path')
		)).toBe(true);
	});

	it('accepts evidence with redacted private path', () => {
		// Redacted evidence has no detectedPath (it was removed during redaction)
		// and privatePathsDetected=true to signal it was detected but removed
		const payload = makeValidProviderDetection();
		payload.evidence.privatePathsDetected = true;
		const result = validateProviderDetectionUpsert(payload);
		expect(result.valid).toBe(true);
	});
});

// ═══════════════════════════════════════════════════════════════════════════
// Model Profile Upsert Validation Tests
// ═══════════════════════════════════════════════════════════════════════════

describe('validateModelProfileUpsert', () => {
	it('accepts valid model profile', () => {
		const result = validateModelProfileUpsert(makeValidModelProfile());
		expect(result.valid).toBe(true);
	});

	it('accepts unknown-provider-blocked profile', () => {
		const payload = makeValidModelProfile();
		payload.profile = {
			profileId: 'unknown-provider-blocked',
			displayName: 'Unknown Provider (Blocked)',
			providerId: 'unknown',
			modelId: '',
			opencodeModelRef: 'unknown/blocked',
			costClass: 'unknown',
			executionClass: 'unknown',
			requiresApiKey: false,
			apiKeyStoragePolicy: 'blocked',
			allowedForDemo: false,
			allowedForRealRuns: false,
			capabilities: ['unknown'],
			requiresWarmup: false,
			warmupStatus: 'blocked',
			warmupLevel: 0,
			maxRiskLevel: 'high',
			notes: ['Blocked sentinel'],
		};
		const result = validateModelProfileUpsert(payload);
		expect(result.valid).toBe(true);
	});

	it('rejects profile with apiKey field', () => {
		const payload = {
			profile: {
				...makeValidModelProfile().profile,
				apiKey: 'sk-test123',
			},
		};
		const result = validateModelProfileUpsert(payload);
		expect(result.valid).toBe(false);
		expect(result.blockedReasons.some(r => r.includes('apiKey') || r.includes('SECURITY'))).toBe(true);
	});

	it('rejects profile with embedded secret in baseURL', () => {
		const payload = makeValidModelProfile();
		payload.profile.baseURL = 'http://user:token@evil.com/v1';
		const result = validateModelProfileUpsert(payload);
		// The validateOpenCodeModelProfile will catch this
		expect(result.valid).toBe(false);
	});

	it('rejects null payload', () => {
		const result = validateModelProfileUpsert(null);
		expect(result.valid).toBe(false);
	});

	it('rejects missing profile field', () => {
		const result = validateModelProfileUpsert({ other: 'data' });
		expect(result.valid).toBe(false);
	});
});

// ═══════════════════════════════════════════════════════════════════════════
// Spec Kit Sync Upsert Validation Tests
// ═══════════════════════════════════════════════════════════════════════════

describe('validateSpecKitSyncUpsert', () => {
	it('accepts valid SpecKit sync profile with github/spec-kit source', () => {
		const result = validateSpecKitSyncUpsert(makeValidSpecKitSync());
		expect(result.valid).toBe(true);
	});

	it('accepts partial/synced_with_warning profile (not real-run-ready)', () => {
		const payload = makeValidSpecKitSync();
		payload.profile.specKitSyncStatus = 'partial';
		payload.profile.readyForRealRuns = false;
		const result = validateSpecKitSyncUpsert(payload);
		expect(result.valid).toBe(true);
		// Validation only checks structure, not policy — gates handle readyForRealRuns
	});

	it('rejects null payload', () => {
		const result = validateSpecKitSyncUpsert(null);
		expect(result.valid).toBe(false);
	});

	it('rejects missing profile field', () => {
		const result = validateSpecKitSyncUpsert({ other: 'data' });
		expect(result.valid).toBe(false);
	});

	it('rejects profile with secrets', () => {
		const payload = {
			profile: {
				...makeValidSpecKitSync().profile,
				token: 'Bearer abcdef1234567890abcdef1234567890',
			},
		};
		const result = validateSpecKitSyncUpsert(payload);
		expect(result.valid).toBe(false);
	});

	it('rejects non-github/spec-kit source', () => {
		const payload = {
			profile: {
				...makeValidSpecKitSync().profile,
				specKitInstallSource: 'other/source' as unknown,
			},
		};
		const result = validateSpecKitSyncUpsert(payload);
		expect(result.valid).toBe(false);
		expect(result.blockedReasons.some(r => r.includes('github/spec-kit'))).toBe(true);
	});
});

// ═══════════════════════════════════════════════════════════════════════════
// MCP Warm-up Evidence Upsert Validation Tests
// ═══════════════════════════════════════════════════════════════════════════

describe('validateMcpWarmupEvidenceUpsert', () => {
	it('accepts valid dry-run MCP evidence', () => {
		const result = validateMcpWarmupEvidenceUpsert(makeValidMcpWarmup());
		expect(result.valid).toBe(true);
	});

	it('rejects evidence without redactionApplied', () => {
		const payload = makeValidMcpWarmup();
		payload.evidence.redactionApplied = false;
		const result = validateMcpWarmupEvidenceUpsert(payload);
		expect(result.valid).toBe(false);
		expect(result.blockedReasons.some(r => r.includes('redactionApplied'))).toBe(true);
	});

	it('rejects evidence with connect phase passed (real transport)', () => {
		const payload = makeValidMcpWarmup();
		payload.evidence.phases = [
			{ phase: 'connect', status: 'pass', message: 'Connected to real MCP server' },
		];
		const result = validateMcpWarmupEvidenceUpsert(payload);
		expect(result.valid).toBe(false);
		expect(result.blockedReasons.some(r => r.includes('real transport'))).toBe(true);
	});

	it('rejects evidence with read_smoke passed (real tool execution)', () => {
		const payload = makeValidMcpWarmup();
		payload.evidence.phases = [
			{ phase: 'read_smoke', status: 'pass', message: 'Read test passed' },
		];
		const result = validateMcpWarmupEvidenceUpsert(payload);
		expect(result.valid).toBe(false);
		expect(result.blockedReasons.some(r => r.includes('real tool execution'))).toBe(true);
	});

	it('rejects evidence with secrets', () => {
		const payload = {
			evidence: {
				...makeValidMcpWarmup().evidence,
				// Use a secret that matches the detection pattern (32+ chars after sk-)
				apiKey: 'sk-abcdefghijklmnopqrstuvwxyz1234567890ABCD',
			},
		};
		const result = validateMcpWarmupEvidenceUpsert(payload);
		expect(result.valid).toBe(false);
		expect(result.blockedReasons.some(r => r.includes('Secrets detected') || r.includes('apiKey'))).toBe(true);
	});

	it('rejects null payload', () => {
		const result = validateMcpWarmupEvidenceUpsert(null);
		expect(result.valid).toBe(false);
	});
});

// ═══════════════════════════════════════════════════════════════════════════
// Dispatch Validation Tests
// ═══════════════════════════════════════════════════════════════════════════

describe('validateInfrastructureStateUpsert (dispatch)', () => {
	it('dispatches to provider_detection validation', () => {
		const result = validateInfrastructureStateUpsert('provider_detection', makeValidProviderDetection());
		expect(result.valid).toBe(true);
	});

	it('dispatches to model_profile validation', () => {
		const result = validateInfrastructureStateUpsert('model_profile', makeValidModelProfile());
		expect(result.valid).toBe(true);
	});

	it('dispatches to speckit_sync validation', () => {
		const result = validateInfrastructureStateUpsert('speckit_sync', makeValidSpecKitSync());
		expect(result.valid).toBe(true);
	});

	it('dispatches to mcp_warmup_evidence validation', () => {
		const result = validateInfrastructureStateUpsert('mcp_warmup_evidence', makeValidMcpWarmup());
		expect(result.valid).toBe(true);
	});

	it('rejects unknown kind', () => {
		const result = validateInfrastructureStateUpsert('unknown_kind' as never, {});
		expect(result.valid).toBe(false);
	});
});

// ═══════════════════════════════════════════════════════════════════════════
// Evidence Event Creation Tests
// ═══════════════════════════════════════════════════════════════════════════

describe('createUpsertEvidenceEvent', () => {
	it('creates evidence event for provider_detection', () => {
		const event = createUpsertEvidenceEvent('provider_detection', 'key1', 'ref1');
		expect(event.event).toBe('infrastructure-state-provider-detection-upserted');
		expect(event.kind).toBe('provider_detection');
		expect(event.recordKey).toBe('key1');
		expect(event.evidenceRef).toBe('ref1');
	});

	it('creates evidence event for model_profile', () => {
		const event = createUpsertEvidenceEvent('model_profile', 'key2');
		expect(event.event).toBe('infrastructure-state-model-profile-set-active');
		expect(event.recordKey).toBe('key2');
	});

	it('creates evidence event for mcp_warmup_evidence', () => {
		const event = createUpsertEvidenceEvent('mcp_warmup_evidence', 'key3');
		expect(event.event).toBe('infrastructure-state-mcp-warmup-evidence-upserted');
	});

	it('creates evidence event for speckit_sync', () => {
		const event = createUpsertEvidenceEvent('speckit_sync', 'key4', 'ref4');
		expect(event.event).toBe('infrastructure-state-speckit-sync-set-active');
		expect(event.kind).toBe('speckit_sync');
		expect(event.recordKey).toBe('key4');
		expect(event.evidenceRef).toBe('ref4');
	});
});

// ═══════════════════════════════════════════════════════════════════════════
// Safe Upsert Executor Tests
// ═══════════════════════════════════════════════════════════════════════════

describe('executeSafeUpsert', () => {
	let stores: InfrastructureStateStores;

	beforeEach(() => {
		stores = createInMemoryInfrastructureStateStores();
	});

	it('stores valid provider detection evidence', async () => {
		const result = await executeSafeUpsert({
			stores,
			kind: 'provider_detection',
			payload: makeValidProviderDetection() as unknown as Record<string, unknown>,
			upsertEnabled: true,
		});
		expect(result.status).toBe('stored');
		expect(result.redacted).toBe(true);
		expect(result.infrastructureGates).toBeDefined();
	});

	it('stores valid model profile', async () => {
		const result = await executeSafeUpsert({
			stores,
			kind: 'model_profile',
			payload: makeValidModelProfile() as unknown as Record<string, unknown>,
			upsertEnabled: true,
		});
		expect(result.status).toBe('stored');
	});

	it('stores valid SpecKit sync profile', async () => {
		const result = await executeSafeUpsert({
			stores,
			kind: 'speckit_sync',
			payload: makeValidSpecKitSync() as unknown as Record<string, unknown>,
			upsertEnabled: true,
		});
		expect(result.status).toBe('stored');
	});

	it('stores valid MCP warm-up evidence', async () => {
		const result = await executeSafeUpsert({
			stores,
			kind: 'mcp_warmup_evidence',
			payload: makeValidMcpWarmup() as unknown as Record<string, unknown>,
			upsertEnabled: true,
		});
		expect(result.status).toBe('stored');
	});

	it('rejects upsert when disabled', async () => {
		const result = await executeSafeUpsert({
			stores,
			kind: 'provider_detection',
			payload: makeValidProviderDetection() as unknown as Record<string, unknown>,
			upsertEnabled: false,
		});
		expect(result.status).toBe('blocked');
		expect(result.blockedReasons).toContain('infrastructure_state_upsert_disabled');
	});

	it('rejects invalid payload', async () => {
		const result = await executeSafeUpsert({
			stores,
			kind: 'provider_detection',
			payload: { invalid: true },
			upsertEnabled: true,
		});
		expect(result.status).toBe('rejected');
		expect(result.blockedReasons.length).toBeGreaterThan(0);
	});

	it('re-evaluates gates after upsert', async () => {
		const result = await executeSafeUpsert({
			stores,
			kind: 'provider_detection',
			payload: makeValidProviderDetection() as unknown as Record<string, unknown>,
			upsertEnabled: true,
		});
		expect(result.infrastructureGates).toBeDefined();
		expect(result.infrastructureGates?.gates.length).toBeGreaterThan(0);
	});
});

// ═══════════════════════════════════════════════════════════════════════════
// Status Read Tests
// ═══════════════════════════════════════════════════════════════════════════

describe('getInfrastructureStateStatus', () => {
	it('returns gate summary for empty stores', async () => {
		const stores = createInMemoryInfrastructureStateStores();
		const summary = await getInfrastructureStateStatus({ stores });
		expect(summary.overall).toBeDefined();
		expect(summary.gates.length).toBeGreaterThan(0);
		expect(summary.readyForReal).toBe(false);
	});

	it('reflects stored state in gate summary', async () => {
		const stores = createInMemoryInfrastructureStateStores();
		// Store a provider detection first
		await executeSafeUpsert({
			stores,
			kind: 'provider_detection',
			payload: makeValidProviderDetection() as unknown as Record<string, unknown>,
			upsertEnabled: true,
		});

		const summary = await getInfrastructureStateStatus({ stores });
		// Provider detection gate should NOT be missing anymore
		const pdGate = summary.gates.find(g => g.kind === 'provider_detection');
		expect(pdGate).toBeDefined();
		expect(pdGate?.status).not.toBe('missing');
	});
});
