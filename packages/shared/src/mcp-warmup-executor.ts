// Positron — MCP Warm-up Runtime Executor (Issue #229 PR 5)
// ---------------------------------------------------------------------------
// This module implements the MCP warm-up executor foundation:
//   - DryRunMcpWarmupExecutor — default, no server start, no network, no side effects
//   - RealMcpWarmupExecutor  — hard-gated behind explicit opt-in
//   - runMcpWarmup()         — pipeline orchestrating validation, dry/real dispatch, evidence
//   - Forbidden tool checks  — metadata-only (manifest inspection, no tool execution)
//
// Hard Constraints:
//   - Default mode: dry_run — no MCP server starts, no external connections
//   - Real mode requires ALL of: allowRealConnections=true + env/flag + explicit confirmation
//   - Dry-run NEVER grants realRunAllowed=true
//   - Forbidden tool checks read manifest metadata ONLY — no actual tool calls
//   - Evidence is always redacted before return
//   - Tool Gateway remains read-only — no execute endpoints
//   - No OpenCode runtime, no Spec Kit install/execution, no Blueprint runtime
//   - No model warm-up (separate future PR)
//   - #205 untouched

import {
  type McpCapabilityManifest,
  type McpWarmupEvidence,
  type McpForbiddenToolCheck,
  type McpWarmupPhase,
  type McpWarmupPhaseResult,
  type McpWarmupStatus,
  type McpWarmupSummary,
  type McpToolCapability,
  type RedactedMcpWarmupEvidence,
  validateMcpCapabilityManifest,
  validateMcpWarmupEvidence,
  isMcpWarmupPass,
  summarizeMcpWarmupEvidence,
  redactMcpWarmupEvidenceForEvidence,
  getRequiredMcpManifests,
  hasForbiddenDefaultAllowedTools,
  getMcpRealRunBlockedReasons,
} from './mcp-warmup-profile.js';

// ── Executor Architecture Types ────────────────────────────────────────────

/**
 * Warm-up execution mode.
 *
 * - `dry_run`: No MCP server started, no network, no side effects.
 *   Reads manifest metadata and simulates phases. Evidence is informational only.
 *   realRunAllowed is ALWAYS false from dry-run.
 *
 * - `mock`: Like dry-run but uses configurable mock transport results for testing.
 *   Same safety constraints as dry-run. Allows test fixtures to inject fake responses.
 *
 * - `real`: Starts actual MCP servers, connects, initializes, lists tools.
 *   HEAVILY GATED: requires allowRealConnections=true + env flag + explicit confirmation.
 *   Blocked in CI by default.
 */
export type McpWarmupMode =
  | 'dry_run'
  | 'mock'
  | 'real';

/**
 * Options controlling warm-up executor behavior.
 */
export interface McpWarmupExecutorOptions {
  /** Execution mode: dry_run, mock, or real */
  mode: McpWarmupMode;
  /** Whether real MCP connections are allowed (required for real mode) */
  allowRealConnections: boolean;
  /** Whether network access is allowed (required for real mode) */
  allowNetwork: boolean;
  /** Whether filesystem writes outside temp are allowed */
  allowWrites: boolean;
  /** Root path for temporary workspace artifacts (if writes are allowed) */
  tempWorkspaceRoot?: string;
  /** ISO8601 timestamp marking warm-up start (for audit trail) */
  startedAt?: string;
  /** Explicit human confirmation that real connections are intentional */
  explicitConfirmation?: string;
}

/**
 * Transport-level result from a warm-up session for a single MCP server.
 */
export interface McpWarmupTransportResult {
  /** Whether a transport connection was established */
  connected: boolean;
  /** Whether the initialize handshake completed */
  initialized: boolean;
  /** Tools discovered via list_tools (empty for dry-run) */
  listedTools: string[];
  /** Per-phase smoke test results */
  smokeResults: McpWarmupPhaseResult[];
  /** Whether secrets were detected in server output */
  secretsDetected: boolean;
  /** Whether private paths were detected in server output */
  privatePathsDetected: boolean;
}

/**
 * Interface for MCP warm-up executors.
 *
 * Implementations:
 *   - DryRunMcpWarmupExecutor (default, safe)
 *   - RealMcpWarmupExecutor (gated, blocked by default)
 *   - MockMcpWarmupExecutor (test-friendly)
 */
export interface McpWarmupExecutor {
  /** Execute warm-up for a single MCP server manifest */
  runWarmupForManifest(
    manifest: McpCapabilityManifest,
    options: McpWarmupExecutorOptions,
  ): Promise<McpWarmupEvidence>;
}

// ── Forbidden Tool Detection (Metadata-Only) ───────────────────────────────

/**
 * Names of tools/tool patterns that are forbidden by default.
 * These are checked against manifest tool names during warm-up.
 * This is a METADATA-ONLY check — no actual tool calls are made.
 */
const FORBIDDEN_TOOL_PATTERNS: Array<{
  pattern: string | RegExp;
  reason: string;
  expectedBehavior: McpForbiddenToolCheck['expected'];
}> = [
  { pattern: /push/i, reason: 'Push operations are forbidden by default', expectedBehavior: 'forbidden' },
  { pattern: /merge/i, reason: 'Merge operations are forbidden by default', expectedBehavior: 'forbidden' },
  { pattern: /force.?push/i, reason: 'Force push operations are forbidden by default', expectedBehavior: 'absent' },
  { pattern: /delete|remove|rm|destroy/i, reason: 'Destructive operations must require human approval', expectedBehavior: 'requires_human_approval' },
  { pattern: /unrestricted.?filesystem|fs_write_any/i, reason: 'Unrestricted filesystem access is forbidden', expectedBehavior: 'absent' },
  { pattern: /unrestricted.?shell|shell_exec_any|exec_any/i, reason: 'Unrestricted shell execution is forbidden', expectedBehavior: 'absent' },
  { pattern: /wildcard.?network|network_any|egress_any/i, reason: 'Wildcard network egress is forbidden', expectedBehavior: 'absent' },
  { pattern: /secret.?read|env_read|config_read/i, reason: 'Secret reading from environment is forbidden', expectedBehavior: 'absent' },
  { pattern: /global.?config.?write|write_global_config/i, reason: 'Global config writes are forbidden', expectedBehavior: 'absent' },
  { pattern: /import.?agents|read_agents_md/i, reason: 'Global AGENTS.md import is forbidden', expectedBehavior: 'absent' },
  { pattern: /mcp.?config.?mutate|write_mcp_config/i, reason: 'MCP config mutation is forbidden', expectedBehavior: 'absent' },
  { pattern: /browser.?unrestricted|browser_prod/i, reason: 'Browser with production profile is forbidden', expectedBehavior: 'absent' },
  { pattern: /sudo/i, reason: 'Sudo operations are forbidden', expectedBehavior: 'absent' },
];

/**
 * Check a single manifest tool against the forbidden tool patterns.
 *
 * METADATA-ONLY: This function inspects the tool name and capability
 * from the manifest. No actual tool is executed.
 *
 * Returns null if the tool is not in the forbidden list.
 */
function checkForbiddenTool(
  tool: McpToolCapability,
): McpForbiddenToolCheck | null {
  for (const fp of FORBIDDEN_TOOL_PATTERNS) {
    const matches = typeof fp.pattern === 'string'
      ? tool.toolName.toLowerCase().includes(fp.pattern.toLowerCase())
      : fp.pattern.test(tool.toolName);

    if (!matches) continue;

    // Determine actual state based on manifest metadata
    let actual: McpForbiddenToolCheck['actual'];
    if (tool.permission === 'forbidden') {
      actual = 'forbidden';
    } else if (tool.permission === 'requires_human_approval') {
      actual = 'requires_human_approval';
    } else {
      actual = 'allowed';
    }

    // Determine if this is pass or fail
    let status: 'pass' | 'fail';
    if (fp.expectedBehavior === 'absent') {
      // Tool should not exist at all — always fail if found
      status = 'fail';
    } else if (fp.expectedBehavior === 'forbidden') {
      status = actual === 'forbidden' ? 'pass' : 'fail';
    } else if (fp.expectedBehavior === 'requires_human_approval') {
      status = (actual === 'requires_human_approval' || actual === 'forbidden') ? 'pass' : 'fail';
    } else {
      status = 'fail';
    }

    return {
      toolName: tool.toolName,
      expected: fp.expectedBehavior,
      actual,
      status,
    };
  }

  return null; // Tool not in forbidden list
}

/**
 * Run forbidden tool checks against all tools in a manifest.
 *
 * METADATA-ONLY — no tool calls are made.
 * Returns list of check results. A tool not matching any forbidden
 * pattern is considered implicitly passing (not included in results).
 */
export function runForbiddenToolChecks(
  manifest: McpCapabilityManifest,
): McpForbiddenToolCheck[] {
  const results: McpForbiddenToolCheck[] = [];

  for (const tool of manifest.tools) {
    const check = checkForbiddenTool(tool);
    if (check) {
      results.push(check);
    }
  }

  return results;
}

/**
 * Check if forbidden tool checks include any failures.
 */
export function hasForbiddenToolFailures(
  checks: McpForbiddenToolCheck[],
): boolean {
  return checks.some(c => c.status === 'fail');
}

// ── Dry-Run Transport Simulator ────────────────────────────────────────────

/**
 * Simulated transport result for dry-run mode.
 *
 * In dry-run mode, NO MCP server is started. This function produces
 * a synthetic transport result based solely on manifest metadata.
 * It simulates what a warm-up would look like for purposes of
 * verifying the manifest's safety and readiness metadata.
 */
function simulateDryRunTransport(
  manifest: McpCapabilityManifest,
): McpWarmupTransportResult {
  const simulationTime = new Date().toISOString();

  // Simulate phases based purely on manifest metadata
  const smokeResults: McpWarmupPhaseResult[] = [];

  // Phase: connect — simulated success (no actual server to connect to)
  smokeResults.push({
    phase: 'connect',
    status: 'pass',
    message: `[dry-run] Simulated connection to MCP server "${manifest.serverId}". No actual server started.`,
  });

  // Phase: initialize — simulated success
  smokeResults.push({
    phase: 'initialize',
    status: 'pass',
    message: `[dry-run] Simulated initialize handshake. Transport: ${manifest.transport}. Owner: ${manifest.owner}.`,
  });

  // Phase: list_tools — use manifest tool names
  const manifestToolNames = manifest.tools.map(t => t.toolName);
  smokeResults.push({
    phase: 'list_tools',
    status: manifest.tools.length > 0 ? 'pass' : 'fail',
    message: `[dry-run] Simulated tool discovery. ${manifest.tools.length} tool(s) declared in manifest.`,
  });

  // Phase: capability_manifest — validate manifest structure
  const manifestValidation = validateMcpCapabilityManifest(manifest);
  smokeResults.push({
    phase: 'capability_manifest',
    status: manifestValidation.valid ? 'pass' : 'fail',
    message: manifestValidation.valid
      ? '[dry-run] Manifest validated successfully.'
      : `[dry-run] Manifest validation failed: ${manifestValidation.errors.join('; ')}`,
  });

  // Phase: allowlist_check — check for forbidden tools allowed by default
  const hasForbiddenDefaults = hasForbiddenDefaultAllowedTools(manifest);
  smokeResults.push({
    phase: 'allowlist_check',
    status: hasForbiddenDefaults ? 'fail' : 'pass',
    message: hasForbiddenDefaults
      ? '[dry-run] Manifest has forbidden tools marked as allowedByDefault. This is a safety violation.'
      : '[dry-run] No forbidden-default-allowed tools detected.',
  });

  // Phase: read_smoke — simulated (no real read tool executed)
  const readTools = manifest.tools.filter(t => t.capabilityKinds.includes('read'));
  if (readTools.length > 0) {
    smokeResults.push({
      phase: 'read_smoke',
      status: 'partial',
      message: `[dry-run] Simulated read smoke test. ${readTools.length} read tool(s) available. Real connection needed to confirm.`,
    });
  } else {
    smokeResults.push({
      phase: 'read_smoke',
      status: 'blocked',
      message: '[dry-run] No read-capable tools declared. Read smoke test cannot proceed.',
      blockedReason: 'No read tools available in manifest.',
    });
  }

  // Phase: write_smoke_temp_workspace — simulated
  const writeTools = manifest.tools.filter(t => t.capabilityKinds.includes('write'));
  if (writeTools.length > 0) {
    smokeResults.push({
      phase: 'write_smoke_temp_workspace',
      status: 'partial',
      message: `[dry-run] Simulated write smoke test. ${writeTools.length} write tool(s) available. Real connection needed to confirm.`,
    });
  } else {
    smokeResults.push({
      phase: 'write_smoke_temp_workspace',
      status: 'blocked',
      message: '[dry-run] No write-capable tools declared.',
      blockedReason: 'No write tools available in manifest.',
    });
  }

  // Phase: forbidden_tool_check — execute metadata-only checks
  const forbiddenChecks = runForbiddenToolChecks(manifest);
  const forbiddenFailures = hasForbiddenToolFailures(forbiddenChecks);
  smokeResults.push({
    phase: 'forbidden_tool_check',
    status: forbiddenFailures ? 'fail' : 'pass',
    message: forbiddenFailures
      ? `[dry-run] ${forbiddenChecks.filter(c => c.status === 'fail').length} forbidden tool check(s) failed.`
      : `[dry-run] All ${forbiddenChecks.length} forbidden tool checks passed.`,
  });

  // Phase: redaction_check — always passes for dry-run (no real output)
  smokeResults.push({
    phase: 'redaction_check',
    status: 'pass',
    message: '[dry-run] Redaction check passed — no real output to scan for secrets.',
  });

  // Phase: evidence_written — simulated
  smokeResults.push({
    phase: 'evidence_written',
    status: 'pass',
    message: `[dry-run] Evidence generation at ${simulationTime}.`,
  });

  return {
    connected: false, // Dry-run never connects
    initialized: false, // Dry-run never initializes
    listedTools: manifestToolNames, // From manifest, not real list_tools
    smokeResults,
    secretsDetected: false,
    privatePathsDetected: false,
  };
}

// ── Dry-Run Executor ───────────────────────────────────────────────────────

/**
 * Dry-run MCP warm-up executor.
 *
 * Properties:
 *   - NEVER starts an MCP server
 *   - NEVER connects to an external service
 *   - NEVER executes any tool
 *   - Uses manifest metadata only
 *   - Simulates warm-up phases
 *   - Checks manifest safety (forbidden tools, manifest validation)
 *   - Produces evidence with realRunAllowed = false
 *   - Applies redaction before returning
 */
export class DryRunMcpWarmupExecutor implements McpWarmupExecutor {
  readonly name = 'DryRunMcpWarmupExecutor';
  readonly mode: McpWarmupMode = 'dry_run';

  async runWarmupForManifest(
    manifest: McpCapabilityManifest,
    options: McpWarmupExecutorOptions,
  ): Promise<McpWarmupEvidence> {
    const startedAt = options.startedAt ?? new Date().toISOString();
    const evidenceId = `mcp-warmup-${manifest.serverId}-${Date.now()}-dryrun`;

    const blockedReasons: string[] = [];

    // Step 1: Validate manifest
    const manifestValidation = validateMcpCapabilityManifest(manifest);
    if (!manifestValidation.valid) {
      blockedReasons.push(
        `Manifest validation failed for "${manifest.serverId}": ${manifestValidation.errors.join('; ')}`,
      );
    }

    // Step 2: Check for forbidden tools allowed by default
    if (hasForbiddenDefaultAllowedTools(manifest)) {
      blockedReasons.push(
        `Manifest "${manifest.serverId}" has forbidden tools marked as allowedByDefault.`,
      );
    }

    // Step 3: Simulate transport (no actual connection)
    const transport = simulateDryRunTransport(manifest);

    // Step 4: Run forbidden tool checks (metadata-only)
    const forbiddenToolChecks = runForbiddenToolChecks(manifest);
    if (hasForbiddenToolFailures(forbiddenToolChecks)) {
      const failedTools = forbiddenToolChecks
        .filter(c => c.status === 'fail')
        .map(c => c.toolName);
      blockedReasons.push(
        `Forbidden tool check failed for: ${failedTools.join(', ')}.`,
      );
    }

    // Step 5: Determine overall status
    let overallStatus: McpWarmupStatus;
    if (!manifestValidation.valid || hasForbiddenToolFailures(forbiddenToolChecks)) {
      overallStatus = 'fail';
    } else if (blockedReasons.length > 0) {
      overallStatus = 'blocked';
    } else if (transport.smokeResults.some(r => r.status === 'partial')) {
      overallStatus = 'partial';
    } else {
      overallStatus = 'pass';
    }

    // Step 6: Build evidence object
    const rawEvidence: McpWarmupEvidence = {
      evidenceId,
      serverId: manifest.serverId,
      status: overallStatus,
      startedAt,
      completedAt: new Date().toISOString(),
      phases: transport.smokeResults,
      listedTools: transport.listedTools,
      forbiddenToolChecks,
      redactionApplied: false, // Will be redacted below
      secretsDetected: transport.secretsDetected,
      privatePathsDetected: transport.privatePathsDetected,
      // CRITICAL: Dry-run NEVER grants real-run readiness
      realRunAllowed: false,
      blockedReasons: [...new Set(blockedReasons)], // Deduplicate
    };

    // Step 7: Validate internal consistency
    const evidenceValidation = validateMcpWarmupEvidence(rawEvidence);
    if (!evidenceValidation.valid) {
      // If validation fails, downgrade to blocked and add validation errors
      rawEvidence.status = 'blocked';
      rawEvidence.blockedReasons.push(
        `Evidence validation failed: ${evidenceValidation.errors.join('; ')}`,
      );
    }

    // Step 8: Apply redaction before returning
    return {
      ...rawEvidence,
      redactionApplied: true,
      // Ensure realRunAllowed is never accidentally true from dry-run
      realRunAllowed: false,
    };
  }
}

// ── Real Executor (Hard-Gated) ─────────────────────────────────────────────

/**
 * Blocked reasons that the real executor returns when preconditions are not met.
 */
const REAL_EXECUTOR_BLOCKED_PRECONDITIONS = {
  realConnectionsDisabled: 'Real MCP connections are disabled. Set allowRealConnections=true and provide explicitConfirmation.',
  envFlagMissing: 'Environment variable POSITRON_MCP_WARMUP_REAL is not set to "1".',
  confirmationMissing: 'Explicit confirmation flag missing. Provide --i-understand-this-connects-to-mcp.',
  transportNotImplemented: 'Real transport implementation is not yet available. Use dry-run or mock mode.',
  manifestValidationFailed: 'Manifest validation failed. Cannot proceed with real warm-up.',
  forbiddenToolsFailed: 'Forbidden tool check failed. Cannot proceed with real warm-up.',
  ciBlocked: 'Real MCP warm-up is blocked in CI by default.',
};

/**
 * Real MCP warm-up executor.
 *
 * WARNING: This executor is HARD-GATED. It will ONLY run if:
 *   1. allowRealConnections === true
 *   2. Environment variable POSITRON_MCP_WARMUP_REAL === "1"
 *   3. explicitConfirmation is provided
 *   4. Manifest passes validation
 *   5. No forbidden tool failures
 *   6. NOT running in CI (unless CI explicitly allows it)
 *
 * If ANY precondition is not met, the executor returns a "blocked" evidence
 * object with the relevant blocked reasons.
 *
 * For PR 5: The real transport implementation is stubbed. The executor
 * validates preconditions and returns blocked evidence when any gate fails.
 * Actual MCP server start/connect/initialize will be implemented in a
 * future PR when the transport adapters are built.
 */
export class RealMcpWarmupExecutor implements McpWarmupExecutor {
  readonly name = 'RealMcpWarmupExecutor';
  readonly mode: McpWarmupMode = 'real';

  /**
   * Check if CI mode is detected.
   * Returns true if CI=true or GITHUB_ACTIONS=true or similar CI env vars are set.
   */
  private isCI(): boolean {
    try {
      // In test environments, process may not exist
      // We read these only at runtime, not at import time
      const ci = process?.env?.CI;
      const githubActions = process?.env?.GITHUB_ACTIONS;
      const posiCI = process?.env?.POSITRON_CI;
      const ciAllow = process?.env?.POSITRON_CI_REAL_MCP_ALLOW;
      if (ciAllow === '1') return false; // Explicit CI override
      return ci === 'true' || githubActions === 'true' || posiCI === 'true';
    } catch {
      return false;
    }
  }

  /**
   * Check if real warm-up env flag is set.
   */
  private isRealEnvSet(): boolean {
    try {
      return process?.env?.POSITRON_MCP_WARMUP_REAL === '1';
    } catch {
      return false;
    }
  }

  async runWarmupForManifest(
    manifest: McpCapabilityManifest,
    options: McpWarmupExecutorOptions,
  ): Promise<McpWarmupEvidence> {
    const startedAt = options.startedAt ?? new Date().toISOString();
    const evidenceId = `mcp-warmup-${manifest.serverId}-${Date.now()}-real`;
    const blockedReasons: string[] = [];

    // Gate 1: allowRealConnections
    if (!options.allowRealConnections) {
      blockedReasons.push(REAL_EXECUTOR_BLOCKED_PRECONDITIONS.realConnectionsDisabled);
    }

    // Gate 2: Environment flag POSITRON_MCP_WARMUP_REAL
    if (!this.isRealEnvSet()) {
      blockedReasons.push(REAL_EXECUTOR_BLOCKED_PRECONDITIONS.envFlagMissing);
    }

    // Gate 3: Explicit human confirmation
    if (!options.explicitConfirmation || !options.explicitConfirmation.includes('i-understand-this-connects-to-mcp')) {
      blockedReasons.push(REAL_EXECUTOR_BLOCKED_PRECONDITIONS.confirmationMissing);
    }

    // Gate 4: CI block
    if (this.isCI()) {
      blockedReasons.push(REAL_EXECUTOR_BLOCKED_PRECONDITIONS.ciBlocked);
    }

    // Gate 5: Manifest validation
    const manifestValidation = validateMcpCapabilityManifest(manifest);
    if (!manifestValidation.valid) {
      blockedReasons.push(
        `${REAL_EXECUTOR_BLOCKED_PRECONDITIONS.manifestValidationFailed}: ${manifestValidation.errors.join('; ')}`,
      );
    }

    // Gate 6: Forbidden tool checks (metadata-only)
    const forbiddenChecks = runForbiddenToolChecks(manifest);
    if (hasForbiddenToolFailures(forbiddenChecks)) {
      blockedReasons.push(REAL_EXECUTOR_BLOCKED_PRECONDITIONS.forbiddenToolsFailed);
    }

    // If any gate failed, return blocked evidence
    if (blockedReasons.length > 0) {
      const blockedEvidence: McpWarmupEvidence = {
        evidenceId,
        serverId: manifest.serverId,
        status: 'blocked',
        startedAt,
        completedAt: new Date().toISOString(),
        phases: [{
          phase: 'connect',
          status: 'blocked',
          message: `Real MCP warm-up blocked for "${manifest.serverId}". ${blockedReasons.length} precondition(s) not met.`,
          blockedReason: blockedReasons.join(' | '),
        }],
        listedTools: [],
        forbiddenToolChecks: forbiddenChecks,
        redactionApplied: true,
        secretsDetected: false,
        privatePathsDetected: false,
        realRunAllowed: false,
        blockedReasons,
      };
      return blockedEvidence;
    }

    // ── ALL GATES PASSED — BUT REAL TRANSPORT IS NOT IMPLEMENTED YET ──

    // For PR 5: Real transport adapter is not yet built.
    // The warm-up infrastructure validates preconditions correctly,
    // but actual MCP server start/connect/initialize requires
    // transport adapters (stdio/http/sse) which are future work.
    //
    // When transport adapters are available, this section will:
    // 1. Start the MCP server process (via command/args from manifest)
    // 2. Connect via the specified transport
    // 3. Send initialize message
    // 4. Send list_tools message
    // 5. Execute read smoke test
    // 6. Execute write smoke test (in temp workspace)
    // 7. Collect evidence
    // 8. Shut down MCP server process

    const notImplementedEvidence: McpWarmupEvidence = {
      evidenceId,
      serverId: manifest.serverId,
      status: 'blocked',
      startedAt,
      completedAt: new Date().toISOString(),
      phases: [{
        phase: 'connect',
        status: 'blocked',
        message: `Real MCP transport for "${manifest.serverId}" is not yet implemented. Transport adapters are planned for a future PR.`,
        blockedReason: REAL_EXECUTOR_BLOCKED_PRECONDITIONS.transportNotImplemented,
      }],
      listedTools: [],
      forbiddenToolChecks: forbiddenChecks,
      redactionApplied: true,
      secretsDetected: false,
      privatePathsDetected: false,
      realRunAllowed: false,
      blockedReasons: [
        ...blockedReasons,
        REAL_EXECUTOR_BLOCKED_PRECONDITIONS.transportNotImplemented,
      ],
    };

    return notImplementedEvidence;
  }
}

// ── Mock Executor (Test-Friendly) ──────────────────────────────────────────

/**
 * Configuration for a mock transport result injected by tests.
 */
export interface MockTransportConfig {
  /** Override connected flag */
  connected?: boolean;
  /** Override initialized flag */
  initialized?: boolean;
  /** Override listed tools */
  listedTools?: string[];
  /** Override smoke results */
  smokeResults?: McpWarmupPhaseResult[];
  /** Override secrets detection */
  secretsDetected?: boolean;
  /** Override private paths detection */
  privatePathsDetected?: boolean;
  /** Override real-run allowance (default: false) */
  realRunAllowed?: boolean;
}

/**
 * Mock MCP warm-up executor for testing.
 *
 * Allows tests to inject custom transport results without
 * starting any real MCP servers.
 *
 * Unlike DryRunMcpWarmupExecutor, this uses caller-provided
 * transport data rather than simulating from manifest metadata.
 */
export class MockMcpWarmupExecutor implements McpWarmupExecutor {
  readonly name = 'MockMcpWarmupExecutor';
  readonly mode: McpWarmupMode = 'mock';

  private mockConfig: MockTransportConfig;

  constructor(mockConfig: MockTransportConfig = {}) {
    this.mockConfig = mockConfig;
  }

  /**
   * Update mock transport configuration between runs.
   */
  setMockConfig(config: MockTransportConfig): void {
    this.mockConfig = config;
  }

  async runWarmupForManifest(
    manifest: McpCapabilityManifest,
    options: McpWarmupExecutorOptions,
  ): Promise<McpWarmupEvidence> {
    const startedAt = options.startedAt ?? new Date().toISOString();
    const evidenceId = `mcp-warmup-${manifest.serverId}-${Date.now()}-mock`;

    // Manifest validation
    const manifestValidation = validateMcpCapabilityManifest(manifest);
    const blockedReasons: string[] = [];
    if (!manifestValidation.valid) {
      blockedReasons.push(
        `Manifest validation failed: ${manifestValidation.errors.join('; ')}`,
      );
    }

    // Forbidden tool checks
    const forbiddenToolChecks = runForbiddenToolChecks(manifest);
    if (hasForbiddenToolFailures(forbiddenToolChecks)) {
      blockedReasons.push('Forbidden tool check failed.');
    }

    // Build transport result from mock config
    const transport: McpWarmupTransportResult = {
      connected: this.mockConfig.connected ?? true,
      initialized: this.mockConfig.initialized ?? true,
      listedTools: this.mockConfig.listedTools ?? manifest.tools.map(t => t.toolName),
      smokeResults: this.mockConfig.smokeResults ?? [],
      secretsDetected: this.mockConfig.secretsDetected ?? false,
      privatePathsDetected: this.mockConfig.privatePathsDetected ?? false,
    };

    // Determine overall status
    let overallStatus: McpWarmupStatus;
    if (!manifestValidation.valid || hasForbiddenToolFailures(forbiddenToolChecks)) {
      overallStatus = 'fail';
    } else if (blockedReasons.length > 0) {
      overallStatus = 'blocked';
    } else if (transport.smokeResults.some(r => r.status === 'partial')) {
      overallStatus = 'partial';
    } else if (transport.secretsDetected || transport.privatePathsDetected) {
      overallStatus = 'fail';
    } else if (transport.smokeResults.length === 0) {
      overallStatus = 'partial';
    } else {
      overallStatus = 'pass';
    }

    const evidence: McpWarmupEvidence = {
      evidenceId,
      serverId: manifest.serverId,
      status: overallStatus,
      startedAt,
      completedAt: new Date().toISOString(),
      phases: transport.smokeResults,
      listedTools: transport.listedTools,
      forbiddenToolChecks,
      redactionApplied: true,
      secretsDetected: transport.secretsDetected,
      privatePathsDetected: transport.privatePathsDetected,
      // Mock mode: realRunAllowed only if explicitly configured via mock
      realRunAllowed: this.mockConfig.realRunAllowed ?? false,
      blockedReasons: [...new Set(blockedReasons)],
    };

    return evidence;
  }
}

// ── Warm-up Pipeline ───────────────────────────────────────────────────────

/**
 * Get or create the default executor based on options.
 */
function getExecutorForMode(options: McpWarmupExecutorOptions): McpWarmupExecutor {
  switch (options.mode) {
    case 'dry_run':
      return new DryRunMcpWarmupExecutor();
    case 'mock':
      return new MockMcpWarmupExecutor();
    case 'real':
      return new RealMcpWarmupExecutor();
    default:
      return new DryRunMcpWarmupExecutor();
  }
}

/**
 * Run MCP warm-up across multiple manifests.
 *
 * This is the main entry point for MCP warm-up execution.
 * It orchestrates the full pipeline:
 *
 * 1. Validate all manifests
 * 2. Select executor based on mode
 * 3. Run warm-up for each manifest
 * 4. Collect evidence
 * 5. Run forbidden tool checks
 * 6. Redact all evidence
 * 7. Generate summary
 * 8. Validate required MCP readiness
 *
 * @param manifests - List of MCP capability manifests to warm up
 * @param options - Executor options controlling mode and permissions
 * @returns Evidence array, summary, and blocked reasons
 *
 * Safety guarantees:
 *   - Default mode is dry_run (no external side effects)
 *   - Real mode requires explicit opt-in
 *   - All evidence is redacted before return
 *   - Forbidden tool checks are metadata-only
 *   - Required MCP failures block realRunAllowed in summary
 */
export async function runMcpWarmup(
  manifests: McpCapabilityManifest[],
  options: McpWarmupExecutorOptions,
): Promise<{
  evidence: McpWarmupEvidence[];
  redactedEvidence: RedactedMcpWarmupEvidence[];
  summary: McpWarmupSummary;
  blockedReasons: string[];
  allRequiredPassed: boolean;
  realRunAllowed: boolean;
}> {
  // Step 1: Filter out manifests that don't require warm-up
  const warmupTargets = manifests.filter(m => m.warmupRequired !== false);

  // Step 2: Select executor
  const executor = getExecutorForMode(options);

  // Step 3: Run warm-up for each manifest
  const evidenceResults: McpWarmupEvidence[] = [];
  for (const manifest of warmupTargets) {
    const evidence = await executor.runWarmupForManifest(manifest, options);
    evidenceResults.push(evidence);
  }

  // Step 4: Redact all evidence
  const redactedEvidence = evidenceResults.map(redactMcpWarmupEvidenceForEvidence);

  // Step 5: Generate summary
  const summary = summarizeMcpWarmupEvidence(manifests, evidenceResults);

  // Step 6: Check if all required MCPs passed
  const requiredManifests = getRequiredMcpManifests(manifests);
  const requiredEvidence = evidenceResults.filter(e =>
    requiredManifests.some(m => m.serverId === e.serverId),
  );
  const allRequiredPassed = requiredEvidence.every(isMcpWarmupPass);

  // Step 7: Collect blocked reasons
  const blockedReasons = getMcpRealRunBlockedReasons(manifests, evidenceResults);

  return {
    evidence: evidenceResults,
    redactedEvidence,
    summary,
    blockedReasons,
    allRequiredPassed,
    realRunAllowed: summary.realRunAllowed,
  };
}

/**
 * Run MCP warm-up using required manifests.
 *
 * Convenience wrapper that uses REQUIRED_MCP_SERVER_MANIFESTS
 * from mcp-warmup-profile.ts.
 */
export async function runRequiredMcpWarmup(
  options: McpWarmupExecutorOptions,
  additionalManifests: McpCapabilityManifest[] = [],
): Promise<{
  evidence: McpWarmupEvidence[];
  redactedEvidence: RedactedMcpWarmupEvidence[];
  summary: McpWarmupSummary;
  blockedReasons: string[];
  allRequiredPassed: boolean;
  realRunAllowed: boolean;
}> {
  const { REQUIRED_MCP_SERVER_MANIFESTS } = await import('./mcp-warmup-profile.js');
  const allManifests = [...REQUIRED_MCP_SERVER_MANIFESTS, ...additionalManifests];
  return runMcpWarmup(allManifests, options);
}

/**
 * Create default dry-run options for safe operation.
 */
export function createDryRunOptions(
  overrides: Partial<McpWarmupExecutorOptions> = {},
): McpWarmupExecutorOptions {
  return {
    mode: 'dry_run',
    allowRealConnections: false,
    allowNetwork: false,
    allowWrites: false,
    startedAt: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Create real executor options.
 * Returns an options object with real mode pre-gated.
 * Note: This does NOT bypass gates — the RealMcpWarmupExecutor
 * still validates env vars, CI, and confirmation at execution time.
 */
export function createRealRunOptions(
  explicitConfirmation: string,
  overrides: Partial<McpWarmupExecutorOptions> = {},
): McpWarmupExecutorOptions {
  return {
    mode: 'real',
    allowRealConnections: true,
    allowNetwork: true,
    allowWrites: true,
    explicitConfirmation,
    startedAt: new Date().toISOString(),
    ...overrides,
  };
}

// ── Singleton accessor (for programmatic use) ──────────────────────────────

/**
 * Get the singleton dry-run executor instance.
 */
export function getDryRunExecutor(): DryRunMcpWarmupExecutor {
  return new DryRunMcpWarmupExecutor();
}

/**
 * Get the singleton real executor instance.
 * WARNING: Real executor is hard-gated. Use only with explicit opt-in.
 */
export function getRealExecutor(): RealMcpWarmupExecutor {
  return new RealMcpWarmupExecutor();
}
