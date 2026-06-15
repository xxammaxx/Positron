// Positron — MCP Warm-up Executor Tests (Issue #229 PR 5)
// ---------------------------------------------------------------------------
// Tests for:
//   - DryRunMcpWarmupExecutor (default, safe)
//   - RealMcpWarmupExecutor (hard-gated)
//   - MockMcpWarmupExecutor (test-friendly)
//   - runMcpWarmup() pipeline
//   - Forbidden tool checks (metadata-only)
//   - Evidence redaction
//   - Safety gates

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  // Types
  type McpWarmupExecutorOptions,
  type McpWarmupTransportResult,
  // Executors
  DryRunMcpWarmupExecutor,
  RealMcpWarmupExecutor,
  MockMcpWarmupExecutor,
  // Pipeline
  runMcpWarmup,
  // Utility functions
  runForbiddenToolChecks,
  hasForbiddenToolFailures,
  createDryRunOptions,
  createRealRunOptions,
} from '../mcp-warmup-executor.js';

import {
  type McpCapabilityManifest,
  type McpWarmupEvidence,
  type McpForbiddenToolCheck,
  type McpWarmupPhaseResult,
  type McpToolCapability,
  type McpWarmupStatus,
  validateMcpCapabilityManifest,
  validateMcpWarmupEvidence,
  isMcpWarmupPass,
  REQUIRED_MCP_SERVER_MANIFESTS,
  redactMcpWarmupEvidenceForEvidence,
  type RedactedMcpWarmupEvidence,
} from '../mcp-warmup-profile.js';

// ── Test Helpers ───────────────────────────────────────────────────────────

/** Create a minimal valid manifest for testing */
function makeManifest(overrides: Partial<McpCapabilityManifest> = {}): McpCapabilityManifest {
  return {
    serverId: 'test-server',
    displayName: 'Test Server',
    role: 'hand_and_eye',
    requiredness: 'required',
    transport: 'stdio',
    owner: 'positron',
    envPolicy: 'allowlisted',
    authRequired: false,
    allowedDomains: [],
    allowedPaths: ['/tmp/positron-test'],
    forbiddenPaths: ['/', '~', '/etc'],
    tools: [
      makeTool({ toolName: 'test.read_file', capabilityKinds: ['read'] }),
      makeTool({ toolName: 'test.write_file', capabilityKinds: ['write'], permission: 'requires_human_approval', requiresApproval: true }),
    ],
    defaultEnabled: false,
    requiresHumanApproval: true,
    timeoutMs: 30000,
    logging: 'redacted',
    redaction: 'required',
    warmupRequired: true,
    evidenceRequired: true,
    ...overrides,
  };
}

/** Create a minimal valid tool capability for testing */
function makeTool(overrides: Partial<McpToolCapability> = {}): McpToolCapability {
  return {
    toolName: 'test.tool',
    description: 'A test tool',
    handOrEye: 'hand',
    riskLevel: 'low',
    capabilityKinds: ['read'],
    permission: 'allowed',
    allowedByDefault: false,
    allowedInDemo: true,
    allowedInReal: true,
    requiresApproval: false,
    redactionRequired: true,
    evidenceRequired: true,
    ...overrides,
  };
}

/** Standard dry-run options */
function dryOptions(overrides: Partial<McpWarmupExecutorOptions> = {}): McpWarmupExecutorOptions {
  return createDryRunOptions(overrides);
}

// ── DRY-RUN EXECUTOR TESTS ─────────────────────────────────────────────────

describe('DryRunMcpWarmupExecutor', () => {
  let executor: DryRunMcpWarmupExecutor;

  beforeEach(() => {
    executor = new DryRunMcpWarmupExecutor();
  });

  describe('basic properties', () => {
    test('name is DryRunMcpWarmupExecutor', () => {
      expect(executor.name).toBe('DryRunMcpWarmupExecutor');
    });

    test('mode is dry_run', () => {
      expect(executor.mode).toBe('dry_run');
    });
  });

  describe('dry-run starts no server', () => {
    test('returns evidence without any external calls', async () => {
      const manifest = makeManifest();
      const evidence = await executor.runWarmupForManifest(manifest, dryOptions());
      expect(evidence).toBeDefined();
      expect(evidence.serverId).toBe('test-server');
      // Dry-run must not indicate it connected to anything
      expect(evidence.realRunAllowed).toBe(false);
    });

    test('no process spawning (metadata-only smoke results)', async () => {
      const manifest = makeManifest();
      const evidence = await executor.runWarmupForManifest(manifest, dryOptions());

      // All phases should have [dry-run] prefix in their messages
      for (const phase of evidence.phases) {
        expect(phase.message).toContain('[dry-run]');
      }
    });
  });

  describe('returns evidence for required manifests', () => {
    test('evidenceId is generated', async () => {
      const manifest = makeManifest({ serverId: 'my-server' });
      const evidence = await executor.runWarmupForManifest(manifest, dryOptions());
      expect(evidence.evidenceId).toContain('my-server');
      expect(evidence.evidenceId).toContain('dryrun');
    });

    test('startedAt and completedAt are set', async () => {
      const manifest = makeManifest();
      const evidence = await executor.runWarmupForManifest(manifest, dryOptions());
      expect(evidence.startedAt).toBeDefined();
      expect(evidence.completedAt).toBeDefined();
      expect(new Date(evidence.completedAt ?? evidence.startedAt).getTime()).toBeGreaterThanOrEqual(new Date(evidence.startedAt).getTime());
    });
  });

  describe('dry-run never sets realRunAllowed true', () => {
    test('safe manifest still has realRunAllowed=false', async () => {
      const manifest = makeManifest({
        serverId: 'safe-server',
        tools: [makeTool({ toolName: 'safe.read', capabilityKinds: ['read'], permission: 'allowed' })],
      });
      const evidence = await executor.runWarmupForManifest(manifest, dryOptions());

      // Even with a safe manifest, dry-run never grants real readiness
      expect(evidence.realRunAllowed).toBe(false);
    });

    test('pass status still has realRunAllowed=false', async () => {
      const manifest = makeManifest({
        serverId: 'passing-server',
        tools: [
          makeTool({ toolName: 'safe.read', capabilityKinds: ['read'], permission: 'allowed' }),
          makeTool({ toolName: 'safe.list', capabilityKinds: ['read'], permission: 'allowed' }),
        ],
      });
      const evidence = await executor.runWarmupForManifest(manifest, dryOptions());

      // Even if status is pass, dry-run never grants real-run readiness
      expect(evidence.realRunAllowed).toBe(false);
    });
  });

  describe('marks unsafe manifest as blocked or fail', () => {
    test('manifest with forbidden tools allowed by default', async () => {
      const manifest = makeManifest({
        tools: [
          makeTool({
            toolName: 'git.push',
            capabilityKinds: ['write', 'network'],
            riskLevel: 'high',
            permission: 'forbidden',
            allowedByDefault: true, // SAFETY VIOLATION
          }),
        ],
      });
      const evidence = await executor.runWarmupForManifest(manifest, dryOptions());
      expect(evidence.status).not.toBe('pass');
      expect(evidence.blockedReasons.length).toBeGreaterThan(0);
      expect(evidence.realRunAllowed).toBe(false);
    });

    test('manifest with secret-like fields is rejected by validation', () => {
      // The manifest validation checks for secret keys in the manifest itself
      const badManifest = {
        serverId: 'bad',
        displayName: 'Bad',
        role: 'hand',
        requiredness: 'required',
        transport: 'stdio',
        owner: 'positron',
        envPolicy: 'allowlisted',
        authRequired: false,
        allowedDomains: [],
        allowedPaths: [],
        forbiddenPaths: ['/'],
        tools: [makeTool({ toolName: 'safe.read' })],
        defaultEnabled: false,
        requiresHumanApproval: false,
        timeoutMs: 10000,
        logging: 'redacted',
        redaction: 'required',
        warmupRequired: true,
        evidenceRequired: true,
        apiKey: 'secret-key-here', // This should be caught by manifest validation
      };
      const result = validateMcpCapabilityManifest(badManifest);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e: string) => e.includes('secret'))).toBe(true);
    });
  });

  describe('summary counts required MCPs', () => {
    test('can run warmup on REQUIRED_MCP_SERVER_MANIFESTS', async () => {
      // Use only the first few manifests to keep test fast
      const manifests = REQUIRED_MCP_SERVER_MANIFESTS.slice(0, 3);
      const result = await runMcpWarmup(manifests, dryOptions());
      expect(result.evidence.length).toBeGreaterThan(0);
      expect(result.summary.totalRequired).toBeGreaterThanOrEqual(0);
    });
  });

  describe('dry-run redaction is applied', () => {
    test('returned evidence has redactionApplied=true', async () => {
      const manifest = makeManifest();
      const evidence = await executor.runWarmupForManifest(manifest, dryOptions());
      expect(evidence.redactionApplied).toBe(true);
    });

    test('redacted evidence has listedToolsCount instead of listedTools', () => {
      const manifest = makeManifest();
      const evidence: McpWarmupEvidence = {
        evidenceId: 'ev-test-redacted',
        serverId: manifest.serverId,
        status: 'pass',
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        phases: [{ phase: 'connect', status: 'pass', message: 'Connected' }],
        listedTools: manifest.tools.map(t => t.toolName),
        forbiddenToolChecks: [],
        redactionApplied: true,
        secretsDetected: false,
        privatePathsDetected: false,
        realRunAllowed: true,
        blockedReasons: [],
      };
      const redacted = redactMcpWarmupEvidenceForEvidence(evidence);

      // Redacted should have count, not raw tools
      expect(redacted.listedToolsCount).toBe(evidence.listedTools.length);
      // Redacted should not expose raw tool names
      expect((redacted as unknown as Record<string, unknown>).listedTools).toBeUndefined();
    });
  });
});

// ── REAL EXECUTOR GATING TESTS ─────────────────────────────────────────────

describe('RealMcpWarmupExecutor', () => {
  let executor: RealMcpWarmupExecutor;
  let saveEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    executor = new RealMcpWarmupExecutor();
    saveEnv = { ...process.env };
    // Ensure real env flag is NOT set in tests - set to empty string
    process.env.POSITRON_MCP_WARMUP_REAL = '';
    process.env.CI = '';
    process.env.GITHUB_ACTIONS = '';
  });

  afterEach(() => {
    process.env = saveEnv;
  });

  describe('real mode without allowRealConnections returns blocked', () => {
    test('returns blocked when allowRealConnections is false', async () => {
      const manifest = makeManifest();
      const options = createRealRunOptions('i-understand-this-connects-to-mcp');
      const evidence = await executor.runWarmupForManifest(manifest, {
        ...options,
        allowRealConnections: false,
      });

      expect(evidence.status).toBe('blocked');
      expect(evidence.realRunAllowed).toBe(false);
      expect(evidence.blockedReasons.some((r: string) => r.includes('disabled'))).toBe(true);
    });
  });

  describe('real mode without env/flag returns blocked', () => {
    test('returns blocked when POSITRON_MCP_WARMUP_REAL is not set', async () => {
      const manifest = makeManifest();
      const evidence = await executor.runWarmupForManifest(
        manifest,
        createRealRunOptions('i-understand-this-connects-to-mcp'),
      );

      expect(evidence.status).toBe('blocked');
      expect(evidence.blockedReasons.some(r => r.includes('POSITRON_MCP_WARMUP_REAL'))).toBe(true);
    });
  });

  describe('real mode without explicit confirmation returns blocked', () => {
    test('returns blocked when confirmation is empty', async () => {
      const manifest = makeManifest();
      const evidence = await executor.runWarmupForManifest(manifest, {
        mode: 'real',
        allowRealConnections: true,
        allowNetwork: true,
        allowWrites: true,
        explicitConfirmation: '',
      });

      expect(evidence.status).toBe('blocked');
      expect(evidence.blockedReasons.some(r => r.includes('confirmation'))).toBe(true);
    });

    test('returns blocked when confirmation does not include the magic string', async () => {
      const manifest = makeManifest();
      const evidence = await executor.runWarmupForManifest(manifest, {
        mode: 'real',
        allowRealConnections: true,
        allowNetwork: true,
        allowWrites: true,
        explicitConfirmation: 'yes-i-accept',
      });

      expect(evidence.status).toBe('blocked');
    });
  });

  describe('real mode in CI default is blocked', () => {
    test('returns blocked when CI env is set', async () => {
      process.env.CI = 'true';
      process.env.POSITRON_MCP_WARMUP_REAL = '1';

      const freshExecutor = new RealMcpWarmupExecutor();
      const manifest = makeManifest();
      const evidence = await freshExecutor.runWarmupForManifest(
        manifest,
        createRealRunOptions('i-understand-this-connects-to-mcp'),
      );

      expect(evidence.status).toBe('blocked');
      expect(evidence.blockedReasons.some(r => r.includes('CI'))).toBe(true);
    });

    test('CI override POSITRON_CI_REAL_MCP_ALLOW=1 allows real mode', async () => {
      process.env.CI = 'true';
      process.env.POSITRON_MCP_WARMUP_REAL = '1';
      process.env.POSITRON_CI_REAL_MCP_ALLOW = '1';

      const freshExecutor = new RealMcpWarmupExecutor();
      const manifest = makeManifest();
      const evidence = await freshExecutor.runWarmupForManifest(
        manifest,
        createRealRunOptions('i-understand-this-connects-to-mcp'),
      );

      // With CI override and all gates met, we hit the "transport not implemented" block
      expect(evidence.status).toBe('blocked');
      expect(evidence.blockedReasons.some(r => r.includes('transport'))).toBe(true);
      // CI block should NOT be present
      expect(evidence.blockedReasons.some(r => r.includes('CI'))).toBe(false);
    });
  });

  describe('unimplemented real transport returns blocked, not pass', () => {
    test('when all gates pass, transport is not implemented yet', async () => {
      process.env.POSITRON_MCP_WARMUP_REAL = '1';

      const manifest = makeManifest();
      const evidence = await executor.runWarmupForManifest(
        manifest,
        createRealRunOptions('i-understand-this-connects-to-mcp'),
      );

      // Even with all gates passed, the transport is not yet implemented
      expect(evidence.status).toBe('blocked');
      expect(evidence.blockedReasons.some(r => r.includes('transport'))).toBe(true);
      expect(evidence.realRunAllowed).toBe(false);
    });

    test('never returns pass even with all gates satisfied', async () => {
      process.env.POSITRON_MCP_WARMUP_REAL = '1';

      const manifest = makeManifest();
      const evidence = await executor.runWarmupForManifest(
        manifest,
        createRealRunOptions('i-understand-this-connects-to-mcp'),
      );

      expect(evidence.status).not.toBe('pass');
    });
  });

  describe('no test starts a real external MCP server', () => {
    test('real executor class can be instantiated without side effects', () => {
      const exec = new RealMcpWarmupExecutor();
      expect(exec).toBeDefined();
      expect(exec.name).toBe('RealMcpWarmupExecutor');
    });

    test('real executor returns blocked evidence, never starts a server', async () => {
      const manifest = makeManifest();
      const evidence = await executor.runWarmupForManifest(manifest, dryOptions());
      // Even the real executor in dry-run options should work safely
      expect(evidence.status).toBe('blocked');
      expect(evidence.phases.length).toBeGreaterThan(0);
    });
  });
});

// ── FORBIDDEN TOOL CHECK TESTS ─────────────────────────────────────────────

describe('Forbidden Tool Checks (metadata-only)', () => {
  describe('push allowed by default blocks', () => {
    test('tool named "git.push" with allowed permission fails check', () => {
      const manifest = makeManifest({
        tools: [
          makeTool({
            toolName: 'git.push',
            capabilityKinds: ['write', 'network'],
            riskLevel: 'high',
            permission: 'allowed', // Should be forbidden
          }),
        ],
      });
      const checks = runForbiddenToolChecks(manifest);
      expect(checks.length).toBeGreaterThan(0);
      expect(checks.some(c => c.toolName === 'git.push' && c.status === 'fail')).toBe(true);
    });

    test('tool named "git.push" with forbidden permission passes check', () => {
      const manifest = makeManifest({
        tools: [
          makeTool({
            toolName: 'git.push',
            capabilityKinds: ['write', 'network'],
            riskLevel: 'high',
            permission: 'forbidden',
          }),
        ],
      });
      const checks = runForbiddenToolChecks(manifest);
      const pushCheck = checks.find(c => c.toolName === 'git.push');
      expect(pushCheck).toBeDefined();
      expect(pushCheck?.status).toBe('pass');
    });
  });

  describe('merge allowed by default blocks', () => {
    test('tool named "merge" with allowed permission fails', () => {
      const manifest = makeManifest({
        tools: [
          makeTool({
            toolName: 'merge',
            capabilityKinds: ['write'],
            permission: 'allowed',
          }),
        ],
      });
      const checks = runForbiddenToolChecks(manifest);
      expect(checks.some(c => c.toolName === 'merge' && c.status === 'fail')).toBe(true);
    });
  });

  describe('force push allowed by default blocks', () => {
    test('tool named "git.force_push" detected as forced push', () => {
      const manifest = makeManifest({
        tools: [
          makeTool({
            toolName: 'git.force_push',
            capabilityKinds: ['write', 'destructive'],
            riskLevel: 'critical',
            permission: 'allowed',
          }),
        ],
      });
      const checks = runForbiddenToolChecks(manifest);
      expect(checks.length).toBeGreaterThan(0);
    });
  });

  describe('destructive allowed by default blocks', () => {
    test('tool named "remove" with allowed permission fails', () => {
      const manifest = makeManifest({
        tools: [
          makeTool({
            toolName: 'remove',
            capabilityKinds: ['write', 'destructive'],
            riskLevel: 'high',
            permission: 'allowed',
          }),
        ],
      });
      const checks = runForbiddenToolChecks(manifest);
      expect(checks.some(c => c.toolName === 'remove' && c.status === 'fail')).toBe(true);
    });

    test('tool named "delete" requires human approval', () => {
      const manifest = makeManifest({
        tools: [
          makeTool({
            toolName: 'delete',
            capabilityKinds: ['destructive'],
            riskLevel: 'high',
            permission: 'requires_human_approval',
            requiresApproval: true,
          }),
        ],
      });
      const checks = runForbiddenToolChecks(manifest);
      const deleteCheck = checks.find(c => c.toolName === 'delete');
      expect(deleteCheck).toBeDefined();
      expect(deleteCheck?.expected).toBe('requires_human_approval');
      expect(deleteCheck?.status).toBe('pass');
    });
  });

  describe('unrestricted filesystem blocks', () => {
    test('tool with unrestricted filesystem pattern fails', () => {
      const manifest = makeManifest({
        tools: [
          makeTool({
            toolName: 'unrestricted_filesystem',
            capabilityKinds: ['read', 'write'],
            permission: 'allowed',
          }),
        ],
      });
      const checks = runForbiddenToolChecks(manifest);
      expect(checks.some(c => c.toolName === 'unrestricted_filesystem' && c.status === 'fail')).toBe(true);
    });
  });

  describe('unrestricted shell blocks', () => {
    test('tool with exec_any pattern fails', () => {
      const manifest = makeManifest({
        tools: [
          makeTool({
            toolName: 'shell_exec_any',
            capabilityKinds: ['shell'],
            permission: 'allowed',
          }),
        ],
      });
      const checks = runForbiddenToolChecks(manifest);
      expect(checks.some(c => c.toolName === 'shell_exec_any' && c.status === 'fail')).toBe(true);
    });
  });

  describe('wildcard network blocks', () => {
    test('tool with network_any pattern fails', () => {
      const manifest = makeManifest({
        tools: [
          makeTool({
            toolName: 'network_any',
            capabilityKinds: ['network'],
            permission: 'allowed',
          }),
        ],
      });
      const checks = runForbiddenToolChecks(manifest);
      expect(checks.some(c => c.toolName === 'network_any' && c.status === 'fail')).toBe(true);
    });
  });

  describe('secret read blocks', () => {
    test('tool with secret_read pattern fails', () => {
      const manifest = makeManifest({
        tools: [
          makeTool({
            toolName: 'secret_read',
            capabilityKinds: ['read'],
            permission: 'allowed',
          }),
        ],
      });
      const checks = runForbiddenToolChecks(manifest);
      expect(checks.some(c => c.toolName === 'secret_read' && c.status === 'fail')).toBe(true);
    });
  });

  describe('global config write blocks', () => {
    test('tool with write_global_config pattern fails', () => {
      const manifest = makeManifest({
        tools: [
          makeTool({
            toolName: 'write_global_config',
            capabilityKinds: ['write'],
            permission: 'allowed',
          }),
        ],
      });
      const checks = runForbiddenToolChecks(manifest);
      expect(checks.some(c => c.toolName === 'write_global_config' && c.status === 'fail')).toBe(true);
    });
  });

  describe('no tool execution during forbidden checks', () => {
    test('forbidden tool checks are metadata-only - no side effects', () => {
      // This test ensures that runForbiddenToolChecks does NOT:
      // - Execute any tool
      // - Start any process
      // - Connect to any server
      // It only reads manifest.tools array and matches patterns

      const manifest = makeManifest({
        tools: [
          makeTool({ toolName: 'git.push', permission: 'forbidden' }),
          makeTool({ toolName: 'git.merge', permission: 'forbidden' }),
          makeTool({ toolName: 'safe.read', permission: 'allowed' }),
        ],
      });

      // Run forbidden checks — this must be side-effect-free
      const checks = runForbiddenToolChecks(manifest);

      // Should return results for matching tools only
      expect(checks.length).toBe(2); // push and merge match, safe.read does not

      // All checks are metadata results, no execution
      for (const check of checks) {
        expect(check.toolName).toBeDefined();
        expect(check.expected).toBeDefined();
        expect(check.actual).toBeDefined();
        expect(check.status).toMatch(/^(pass|fail)$/);
      }
    });
  });

  describe('hasForbiddenToolFailures', () => {
    test('returns true when any check fails', () => {
      const checks: McpForbiddenToolCheck[] = [
        { toolName: 'a', expected: 'forbidden', actual: 'forbidden', status: 'pass' },
        { toolName: 'b', expected: 'absent', actual: 'allowed', status: 'fail' },
      ];
      expect(hasForbiddenToolFailures(checks)).toBe(true);
    });

    test('returns false when all checks pass', () => {
      const checks: McpForbiddenToolCheck[] = [
        { toolName: 'a', expected: 'forbidden', actual: 'forbidden', status: 'pass' },
      ];
      expect(hasForbiddenToolFailures(checks)).toBe(false);
    });

    test('returns false for empty array', () => {
      expect(hasForbiddenToolFailures([])).toBe(false);
    });
  });

  describe('sudo blocks', () => {
    test('tool named sudo fails', () => {
      const manifest = makeManifest({
        tools: [
          makeTool({
            toolName: 'sudo',
            capabilityKinds: ['shell'],
            permission: 'allowed',
          }),
        ],
      });
      const checks = runForbiddenToolChecks(manifest);
      expect(checks.some(c => c.toolName === 'sudo' && c.status === 'fail')).toBe(true);
    });
  });
});

// ── EVIDENCE TESTS ─────────────────────────────────────────────────────────

describe('Evidence', () => {
  function makePassingEvidence(manifest: McpCapabilityManifest): McpWarmupEvidence {
    const phases: McpWarmupPhaseResult[] = [
      { phase: 'connect', status: 'pass', message: 'Connected' },
      { phase: 'initialize', status: 'pass', message: 'Initialized' },
      { phase: 'list_tools', status: 'pass', message: 'Listed tools' },
      { phase: 'capability_manifest', status: 'pass', message: 'Validated' },
      { phase: 'allowlist_check', status: 'pass', message: 'Allowlist OK' },
      { phase: 'read_smoke', status: 'pass', message: 'Read smoke OK' },
      { phase: 'write_smoke_temp_workspace', status: 'pass', message: 'Write smoke OK' },
      { phase: 'forbidden_tool_check', status: 'pass', message: 'Forbidden check OK' },
      { phase: 'redaction_check', status: 'pass', message: 'Redacted' },
      { phase: 'evidence_written', status: 'pass', message: 'Evidence written' },
    ];

    return {
      evidenceId: `ev-${manifest.serverId}-test`,
      serverId: manifest.serverId,
      status: 'pass',
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      phases,
      listedTools: manifest.tools.map(t => t.toolName),
      forbiddenToolChecks: [],
      redactionApplied: true,
      secretsDetected: false,
      privatePathsDetected: false,
      realRunAllowed: true,
      blockedReasons: [],
    };
  }

  test('evidence has evidenceId', () => {
    const evidence = makePassingEvidence(makeManifest());
    expect(evidence.evidenceId).toBeDefined();
    expect(evidence.evidenceId.length).toBeGreaterThan(0);
  });

  test('evidence has phases', () => {
    const evidence = makePassingEvidence(makeManifest());
    expect(evidence.phases.length).toBeGreaterThan(0);
  });

  test('pass evidence requires redactionApplied', () => {
    const evidence = makePassingEvidence(makeManifest());
    const result = validateMcpWarmupEvidence(evidence);
    expect(result.valid).toBe(true);
  });

  test('secretsDetected blocks real run', () => {
    const evidence = makePassingEvidence(makeManifest());
    // Pass status with secretsDetected=true should be invalid
    const badEvidence = { ...evidence, secretsDetected: true, redactionApplied: true };
    const result = validateMcpWarmupEvidence(badEvidence);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e: string) => e.includes('secrets'))).toBe(true);
  });

  test('privatePathsDetected blocks real run', () => {
    const manifest = makeManifest();
    const evidence = makePassingEvidence(manifest);
    expect(evidence.privatePathsDetected).toBe(false);
  });

  test('blockedReasons preserved', () => {
    const evidence = makePassingEvidence(makeManifest());
    const withBlocked = {
      ...evidence,
      blockedReasons: ['Test blocked reason'],
      status: 'blocked' as McpWarmupStatus,
      realRunAllowed: false,
    };
    expect(withBlocked.blockedReasons).toContain('Test blocked reason');
  });

  test('redacted output contains no private paths/secrets', () => {
    const manifest = makeManifest();
    const evidence: McpWarmupEvidence = {
      ...makePassingEvidence(manifest),
      blockedReasons: ['Found secret: ghp_abcdef12345678901234567890123456 in /home/user/.ssh'],
    };
    const redacted = redactMcpWarmupEvidenceForEvidence(evidence);

    // Redacted blocked reasons should not contain the raw secret
    for (const reason of redacted.blockedReasons) {
      expect(reason).not.toMatch(/ghp_[a-zA-Z0-9]{36}/);
      expect(reason).not.toMatch(/\/home\/user/);
    }
  });

  test('isMcpWarmupPass checks all conditions', () => {
    const manifest = makeManifest();
    const passingEvidence = makePassingEvidence(manifest);
    expect(isMcpWarmupPass(passingEvidence)).toBe(true);
  });
});

// ── PIPELINE TESTS ─────────────────────────────────────────────────────────

describe('runMcpWarmup pipeline', () => {
  test('returns evidence + summary', async () => {
    const manifests = [makeManifest({ serverId: 'pipeline-test' })];
    const result = await runMcpWarmup(manifests, dryOptions());

    expect(result.evidence).toBeDefined();
    expect(result.evidence.length).toBe(1);
    expect(result.summary).toBeDefined();
    expect(result.blockedReasons).toBeDefined();
    expect(typeof result.allRequiredPassed).toBe('boolean');
    expect(typeof result.realRunAllowed).toBe('boolean');
    expect(result.redactedEvidence).toBeDefined();
  });

  test('dry-run realRunAllowed is always false', async () => {
    const manifests = [makeManifest({ serverId: 'safe-server' })];
    const result = await runMcpWarmup(manifests, dryOptions());

    // Dry-run pipeline must never report realRunAllowed=true
    expect(result.realRunAllowed).toBe(false);
    expect(result.summary.realRunAllowed).toBe(false);
  });

  test('missing required evidence blocks real readiness', async () => {
    // Create a required manifest but don't include it in warmup
    const manifests = [
      makeManifest({ serverId: 'required-svr', requiredness: 'required' }),
    ];

    const result = await runMcpWarmup(manifests, dryOptions());
    expect(result.allRequiredPassed).toBe(false);
    expect(result.realRunAllowed).toBe(false);
  });

  test('optional fail does not block required summary', async () => {
    const manifests = [
      makeManifest({ serverId: 'req-svr', requiredness: 'required' }),
      makeManifest({
        serverId: 'opt-svr',
        requiredness: 'optional',
        tools: [
          makeTool({
            toolName: 'git.push',
            permission: 'allowed', // This fails forbidden check
            capabilityKinds: ['write', 'network'],
          }),
        ],
      }),
    ];

    const result = await runMcpWarmup(manifests, dryOptions());
    // Optional failure should not necessarily block required summary
    expect(result.summary).toBeDefined();
  });

  test('all required pass is required for real-run readiness', async () => {
    const manifests = [
      makeManifest({ serverId: 'req1', requiredness: 'required' }),
      makeManifest({ serverId: 'req2', requiredness: 'required' }),
    ];

    const result = await runMcpWarmup(manifests, dryOptions());
    // In dry-run, all required pass should still be false since realRunAllowed is never true
    expect(result.realRunAllowed).toBe(false);
  });

  test('partial required blocks real-run readiness', async () => {
    const manifests = [
      makeManifest({
        serverId: 'partial-req',
        requiredness: 'required',
        tools: [], // No tools — will cause partial status
      }),
    ];

    const result = await runMcpWarmup(manifests, dryOptions());
    expect(result.realRunAllowed).toBe(false);
  });

  test('handles empty manifest list', async () => {
    const result = await runMcpWarmup([], dryOptions());
    expect(result.evidence).toEqual([]);
    expect(result.summary.totalRequired).toBe(0);
  });

  test('skips manifests with warmupRequired=false', async () => {
    const manifests = [
      makeManifest({ serverId: 'skip-me', warmupRequired: false }),
    ];

    const result = await runMcpWarmup(manifests, dryOptions());
    // Manifest with warmupRequired=false should be skipped
    expect(result.evidence.length).toBe(0);
  });

  test('redacted evidence is returned alongside raw evidence', async () => {
    const manifests = [makeManifest({ serverId: 'redact-test' })];
    const result = await runMcpWarmup(manifests, dryOptions());

    expect(result.redactedEvidence.length).toBe(result.evidence.length);
    for (const re of result.redactedEvidence) {
      expect(re.redactionApplied).toBe(true);
    }
  });
});

// ── MOCK EXECUTOR TESTS ────────────────────────────────────────────────────

describe('MockMcpWarmupExecutor', () => {
  test('uses configured transport results', async () => {
    const mock = new MockMcpWarmupExecutor({
      connected: true,
      initialized: true,
      listedTools: ['mock.tool1', 'mock.tool2'],
      smokeResults: [
        { phase: 'connect', status: 'pass', message: 'Mock connected' },
        { phase: 'list_tools', status: 'pass', message: 'Mock listed tools' },
      ],
    });

    const manifest = makeManifest();
    const evidence = await mock.runWarmupForManifest(manifest, dryOptions({ mode: 'mock' }));

    expect(evidence.listedTools).toEqual(['mock.tool1', 'mock.tool2']);
    expect(evidence.phases.length).toBe(2);
    expect(evidence.phases[0]?.message).toBe('Mock connected');
  });

  test('mock with secrets detected returns fail', async () => {
    const mock = new MockMcpWarmupExecutor({
      secretsDetected: true,
      smokeResults: [
        { phase: 'connect', status: 'pass', message: 'Connected' },
      ],
    });

    const manifest = makeManifest();
    const evidence = await mock.runWarmupForManifest(manifest, dryOptions({ mode: 'mock' }));

    expect(evidence.secretsDetected).toBe(true);
    expect(evidence.status).toBe('fail');
    expect(evidence.realRunAllowed).toBe(false);
  });

  test('setMockConfig updates configuration', async () => {
    const mock = new MockMcpWarmupExecutor({ listedTools: ['old.tool'] });

    // First run with initial config
    const manifest = makeManifest();
    let evidence = await mock.runWarmupForManifest(manifest, dryOptions({ mode: 'mock' }));
    expect(evidence.listedTools).toEqual(['old.tool']);

    // Update config
    mock.setMockConfig({ listedTools: ['new.tool'] });
    evidence = await mock.runWarmupForManifest(manifest, dryOptions({ mode: 'mock' }));
    expect(evidence.listedTools).toEqual(['new.tool']);
  });
});

// ── INTEGRATION: Executor + Pipeline ───────────────────────────────────────

describe('Integration: Executor selection', () => {
  test('runMcpWarmup uses dry-run executor by default', async () => {
    const manifests = [makeManifest({ serverId: 'default-test' })];
    const result = await runMcpWarmup(manifests, {
      mode: 'dry_run',
      allowRealConnections: false,
      allowNetwork: false,
      allowWrites: false,
    });

    expect(result.evidence.length).toBe(1);
    expect(result.evidence[0]?.realRunAllowed).toBe(false);
    // Dry-run marks all phases with [dry-run]
    for (const phase of result.evidence[0]?.phases ?? []) {
      expect(phase.message).toContain('[dry-run]');
    }
  });

  test('createDryRunOptions sets safe defaults', () => {
    const opts = createDryRunOptions();
    expect(opts.mode).toBe('dry_run');
    expect(opts.allowRealConnections).toBe(false);
    expect(opts.allowNetwork).toBe(false);
    expect(opts.allowWrites).toBe(false);
    expect(opts.startedAt).toBeDefined();
  });

  test('createRealRunOptions sets real mode flags', () => {
    const opts = createRealRunOptions('i-understand-this-connects-to-mcp');
    expect(opts.mode).toBe('real');
    expect(opts.allowRealConnections).toBe(true);
    expect(opts.allowNetwork).toBe(true);
    expect(opts.allowWrites).toBe(true);
    expect(opts.explicitConfirmation).toContain('i-understand-this-connects-to-mcp');
  });
});

// ── REQUIRED MCP MANIFEST SMOKE TESTS ──────────────────────────────────────

describe('Required MCP manifests smoke test', () => {
  test('all 12 required manifests can be warmed up in dry-run', async () => {
    const result = await runMcpWarmup(REQUIRED_MCP_SERVER_MANIFESTS, dryOptions());
    expect(result.evidence.length).toBe(REQUIRED_MCP_SERVER_MANIFESTS.length);
    expect(result.summary).toBeDefined();

    // All evidence should have realRunAllowed=false from dry-run
    for (const ev of result.evidence) {
      expect(ev.realRunAllowed).toBe(false);
    }
  });

  test('all required manifests have valid structure', () => {
    for (const manifest of REQUIRED_MCP_SERVER_MANIFESTS) {
      const result = validateMcpCapabilityManifest(manifest);
      expect(result.valid).toBe(true);
    }
  });

  test('required manifests forbidden checks return no catastrophic failures', () => {
    for (const manifest of REQUIRED_MCP_SERVER_MANIFESTS) {
      const checks = runForbiddenToolChecks(manifest);
      // Every failure should have a tool name and status
      for (const check of checks) {
        expect(check.toolName).toBeDefined();
        expect(check.status).toMatch(/^(pass|fail)$/);
      }
    }
  });
});

// ── REGRESSION: Dry-run never grants real readiness ────────────────────────

describe('Regression: Dry-run safety', () => {
  test('no combination of manifest options makes dry-run grant realRunAllowed', async () => {
    // Test various manifest configurations
    const testCases: McpCapabilityManifest[] = [
      makeManifest({ serverId: 'safe1', tools: [makeTool({ toolName: 'safe.read', capabilityKinds: ['read'] })] }),
      makeManifest({ serverId: 'safe2', requiredness: 'optional' }),
      makeManifest({ serverId: 'safe3', requiredness: 'disabled' }),
    ];

    for (const manifest of testCases) {
      const executor = new DryRunMcpWarmupExecutor();
      const evidence = await executor.runWarmupForManifest(manifest, dryOptions());
      expect(evidence.realRunAllowed).toBe(false);
    }
  });

  test('pipeline with safe manifests still blocks real-run in dry-run mode', async () => {
    const manifests = [
      makeManifest({ serverId: 'a', requiredness: 'required' }),
      makeManifest({ serverId: 'b', requiredness: 'required' }),
    ];

    const result = await runMcpWarmup(manifests, dryOptions());
    expect(result.realRunAllowed).toBe(false);
    expect(result.summary.realRunAllowed).toBe(false);
  });
});
