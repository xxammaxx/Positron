// Positron — CT-120 Safe Infrastructure State Fixture
// PR 15: Safe test fixture for CT-120 (positron-dev Debian 12 Proxmox container)
// ---------------------------------------------------------------------------
// This fixture contains ONLY safe, redacted, evidence-based data for populating
// infrastructure state stores. Based on verified PR14 data.
//
// SECURITY:
// - NO secrets, tokens, API keys, or passwords
// - Private paths are redacted (normalized to $HOME/...)
// - Model is unknown-provider-blocked (no real model configured)
// - Spec Kit source is github/spec-kit but not pinned (partial/synced_with_warning)
// - MCP warm-up is dry-run only — no real transport evidence
// - All evidence has redactionApplied=true
// - NO fake PASS values
// ---------------------------------------------------------------------------

import type {
	OpenCodeProviderDetectionEvidence,
	OpenCodeModelProfile,
	PositronProviderProfile,
	McpWarmupEvidence,
} from '@positron/shared';

// ═══════════════════════════════════════════════════════════════════════════
// Provider Detection — CT 120
// ═══════════════════════════════════════════════════════════════════════════

/**
 * CT-120 Provider Detection Evidence (redacted, safe).
 *
 * Based on PR14 verified data:
 * - OpenCode version: 1.17.7
 * - Actual path: /root/.opencode/bin/opencode → redacted to $HOME/.opencode/bin/opencode
 * - Expected path: /opt/positron/tools/bin/opencode
 * - pathMismatch: true
 * - Only --version/--help checked
 */
export const CT120_PROVIDER_DETECTION_EVIDENCE: OpenCodeProviderDetectionEvidence = {
	evidenceId: 'ct120-provider-detection-v1',
	detectionStatus: 'version_checked',
	installStatus: 'not_requested',
	runtimeStatus: 'model_profile_required',
	// detectedPath is ABSENT — the path was private and has been redacted.
	// Validation rule: when redactionApplied=true, detectedPath must be absent.
	// The path mismatch is documented in blockedReasons using $HOME placeholder.
	version: '1.17.7',
	helpAvailable: true,
	redactionApplied: true,
	secretsDetected: false,
	privatePathsDetected: true, // path was private but has been redacted
	blockedReasons: [
		'OpenCode binary path mismatch: actual=$HOME/.opencode/bin/opencode vs expected=/opt/positron/tools/bin/opencode',
		'No active model profile configured',
	],
	createdAt: new Date().toISOString(),
};

// ═══════════════════════════════════════════════════════════════════════════
// Model Profile — CT 120 (unknown-provider-blocked)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * CT-120 Model Profile: unknown-provider-blocked.
 *
 * No real model is configured on CT 120. This sentinel profile
 * ensures gates correctly report MODEL_PROFILE: blocked.
 */
export const CT120_MODEL_PROFILE: OpenCodeModelProfile = {
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
	notes: [
		'Sentinel profile for CT 120 — no real model configured',
		'Always blocked from all runs',
		'Must be explicitly configured to be usable',
	],
};

// ═══════════════════════════════════════════════════════════════════════════
// Spec Kit Sync — CT 120 (partial/synced_with_warning)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * CT-120 Spec Kit Sync Profile (partial, not real-run-ready).
 *
 * Based on PR14 verified data:
 * - uv: v0.11.21
 * - specify-cli: v0.10.4.dev0
 * - Source: github/spec-kit
 * - Mode: adapter_bridge (in Positron context)
 * - Ref not pinned → partial / synced_with_warning
 * - NOT real-run-ready
 */
export const CT120_SPEC_KIT_SYNC_PROFILE: PositronProviderProfile = {
	profileId: 'ct120-speckit-sync-v1',
	opencodeBinaryPath: '$HOME/.opencode/bin/opencode', // redacted
	opencodeVersion: '1.17.7',
	opencodeConfigPath: '$HOME/.positron/config/opencode.json', // redacted
	opencodeModelProfileId: 'unknown-provider-blocked',
	opencodeModelRef: 'unknown/blocked',
	specKitBinaryPath: '$HOME/.positron/tools/bin/specify', // redacted
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
	reSyncReasons: ['speckit_install_ref_changed'],
};

// ═══════════════════════════════════════════════════════════════════════════
// MCP Warm-up Evidence — CT 120 (dry-run only, no real transport)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * CT-120 MCP Warm-up Evidence: dry-run/mock-only.
 *
 * No real MCP servers have been started. This evidence reflects
 * the safe default state: all MCP servers are not yet checked.
 * Evidence is redacted and contains no real transport results.
 */
export const CT120_MCP_WARMUP_EVIDENCE: McpWarmupEvidence[] = [
	{
		evidenceId: 'ct120-mcp-dryrun-github-v1',
		serverId: 'github-mcp',
		status: 'unknown',
		startedAt: new Date().toISOString(),
		phases: [
			{
				phase: 'connect',
				status: 'unknown',
				message: 'Dry-run: no real MCP connection attempted',
			},
			{
				phase: 'initialize',
				status: 'unknown',
				message: 'Dry-run: no real initialization',
			},
			{
				phase: 'forbidden_tool_check',
				status: 'unknown',
				message: 'Dry-run: forbidden tools not checked',
			},
			{
				phase: 'redaction_check',
				status: 'pass',
				message: 'Redaction applied to all evidence fields',
			},
		],
		listedTools: [],
		forbiddenToolChecks: [],
		redactionApplied: true,
		secretsDetected: false,
		privatePathsDetected: false,
		realRunAllowed: false,
		blockedReasons: [
			'MCP warm-up not yet executed (dry-run only)',
			'No real MCP transport established',
		],
	},
];

// ═══════════════════════════════════════════════════════════════════════════
// Upsert Request Objects
// ═══════════════════════════════════════════════════════════════════════════

/** Provider Detection upsert payload for CT 120 */
export const CT120_UPSERT_PROVIDER_DETECTION = {
	evidence: CT120_PROVIDER_DETECTION_EVIDENCE,
};

/** Model Profile upsert payload for CT 120 */
export const CT120_UPSERT_MODEL_PROFILE = {
	profile: CT120_MODEL_PROFILE,
};

/** Spec Kit Sync upsert payload for CT 120 */
export const CT120_UPSERT_SPEC_KIT_SYNC = {
	profile: CT120_SPEC_KIT_SYNC_PROFILE,
};

/** MCP Warm-up Evidence upsert payload for CT 120 (first record) */
export const CT120_UPSERT_MCP_WARMUP_EVIDENCE = {
	evidence: CT120_MCP_WARMUP_EVIDENCE[0],
};
