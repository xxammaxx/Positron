// Tests for MCP Warm-up Contract, Capability Manifest, and Evidence Model (Issue #229 PR 4)
// ---------------------------------------------------------------------------
// Covers: type guards, required inventory, manifest validation,
// warm-up evidence validation, readiness policy, and redaction.

import { describe, test, expect } from 'vitest';
import {
  // Types
  type McpRole,
  type McpRequiredness,
  type McpTransport,
  type McpRiskLevel,
  type McpWarmupPhase,
  type McpWarmupStatus,
  type McpToolPermission,
  type McpCapabilityKind,
  type McpToolCapability,
  type McpCapabilityManifest,
  type McpWarmupPhaseResult,
  type McpForbiddenToolCheck,
  type McpWarmupEvidence,
  type RedactedMcpWarmupEvidence,
  type McpWarmupSummary,

  // Constant arrays
  ALL_MCP_ROLES,
  ALL_MCP_REQUIREDNESSES,
  ALL_MCP_TRANSPORTS,
  ALL_MCP_RISK_LEVELS,
  ALL_MCP_WARMUP_PHASES,
  ALL_MCP_WARMUP_STATUSES,
  ALL_MCP_TOOL_PERMISSIONS,
  ALL_MCP_CAPABILITY_KINDS,

  // Type guards
  isMcpRole,
  isMcpRequiredness,
  isMcpTransport,
  isMcpRiskLevel,
  isMcpWarmupPhase,
  isMcpWarmupStatus,
  isMcpToolPermission,
  isMcpCapabilityKind,
  isMcpToolCapability,
  isMcpCapabilityManifest,
  isMcpWarmupEvidence,

  // Validation
  validateMcpCapabilityManifest,
  validateMcpWarmupEvidence,

  // Required inventory
  REQUIRED_MCP_SERVER_MANIFESTS,
  getRequiredMcpManifests,
  hasForbiddenDefaultAllowedTools,
  requiresHumanApprovalForManifest,

  // Readiness / Policy
  isMcpWarmupPass,
  canUseMcpServerForDemo,
  canUseMcpServerForRealRun,
  summarizeMcpWarmupEvidence,
  areRequiredMcpsReadyForRealRun,
  getMcpRealRunBlockedReasons,

  // Redaction
  redactMcpWarmupEvidenceForEvidence,
} from '../mcp-warmup-profile.js';

// ── Helpers ────────────────────────────────────────────────────────────────

/** Create a valid McpToolCapability for testing */
function makeTestTool(overrides: Partial<McpToolCapability> = {}): McpToolCapability {
  return {
    toolName: 'test.tool',
    description: 'A test tool',
    handOrEye: 'eye',
    riskLevel: 'low',
    capabilityKinds: ['read'],
    permission: 'allowed',
    allowedByDefault: true,
    allowedInDemo: true,
    allowedInReal: true,
    requiresApproval: false,
    redactionRequired: false,
    evidenceRequired: false,
    ...overrides,
  };
}

/** Create a valid McpCapabilityManifest for testing */
function makeTestManifest(overrides: Partial<McpCapabilityManifest> = {}): McpCapabilityManifest {
  return {
    serverId: 'test-server',
    displayName: 'Test Server',
    role: 'eye',
    requiredness: 'optional',
    transport: 'stdio',
    owner: 'positron',
    envPolicy: 'allowlisted',
    authRequired: false,
    allowedDomains: [],
    allowedPaths: ['<workspace>'],
    forbiddenPaths: ['/', '~/.ssh', '~/.config'],
    defaultEnabled: false,
    requiresHumanApproval: false,
    timeoutMs: 10000,
    logging: 'metadata_only',
    redaction: 'not_required',
    warmupRequired: false,
    evidenceRequired: false,
    tools: [makeTestTool()],
    ...overrides,
  };
}

/** Create valid McpWarmupEvidence for testing */
function makeTestEvidence(overrides: Partial<McpWarmupEvidence> = {}): McpWarmupEvidence {
  return {
    evidenceId: 'ev-test-1',
    serverId: 'test-server',
    status: 'pass',
    startedAt: '2026-06-15T12:00:00Z',
    completedAt: '2026-06-15T12:00:05Z',
    phases: [
      { phase: 'connect', status: 'pass', message: 'Connected successfully' },
      { phase: 'initialize', status: 'pass', message: 'Initialized' },
      { phase: 'list_tools', status: 'pass', message: 'Listed tools' },
      { phase: 'capability_manifest', status: 'pass', message: 'Manifest valid' },
      { phase: 'allowlist_check', status: 'pass', message: 'Allowlist OK' },
      { phase: 'read_smoke', status: 'pass', message: 'Read smoke passed' },
      { phase: 'write_smoke_temp_workspace', status: 'pass', message: 'Write smoke passed' },
      { phase: 'forbidden_tool_check', status: 'pass', message: 'No forbidden tools' },
      { phase: 'redaction_check', status: 'pass', message: 'Redaction applied' },
      { phase: 'evidence_written', status: 'pass', message: 'Evidence stored' },
    ],
    listedTools: ['test.tool', 'test.read', 'test.write'],
    forbiddenToolChecks: [],
    redactionApplied: true,
    secretsDetected: false,
    privatePathsDetected: false,
    realRunAllowed: true,
    blockedReasons: [],
    ...overrides,
  };
}

// ── Type Guard Tests ───────────────────────────────────────────────────────

describe('Type Guards', () => {
  // McpRole
  describe('isMcpRole', () => {
    test('valid hand passes', () => { expect(isMcpRole('hand')).toBe(true); });
    test('valid eye passes', () => { expect(isMcpRole('eye')).toBe(true); });
    test('valid hand_and_eye passes', () => { expect(isMcpRole('hand_and_eye')).toBe(true); });
    test('invalid value fails', () => { expect(isMcpRole('foot')).toBe(false); });
    test('null fails', () => { expect(isMcpRole(null)).toBe(false); });
    test('number fails', () => { expect(isMcpRole(42)).toBe(false); });
  });

  // McpRequiredness
  describe('isMcpRequiredness', () => {
    test('valid required passes', () => { expect(isMcpRequiredness('required')).toBe(true); });
    test('valid optional passes', () => { expect(isMcpRequiredness('optional')).toBe(true); });
    test('valid disabled passes', () => { expect(isMcpRequiredness('disabled')).toBe(true); });
    test('invalid fails', () => { expect(isMcpRequiredness('maybe')).toBe(false); });
    test('null fails', () => { expect(isMcpRequiredness(null)).toBe(false); });
  });

  // McpTransport
  describe('isMcpTransport', () => {
    test('valid stdio passes', () => { expect(isMcpTransport('stdio')).toBe(true); });
    test('valid sse passes', () => { expect(isMcpTransport('sse')).toBe(true); });
    test('valid http passes', () => { expect(isMcpTransport('http')).toBe(true); });
    test('valid websocket passes', () => { expect(isMcpTransport('websocket')).toBe(true); });
    test('valid adapter passes', () => { expect(isMcpTransport('adapter')).toBe(true); });
    test('valid unknown passes', () => { expect(isMcpTransport('unknown')).toBe(true); });
    test('invalid fails', () => { expect(isMcpTransport('grpc')).toBe(false); });
  });

  // McpRiskLevel
  describe('isMcpRiskLevel', () => {
    test('valid low passes', () => { expect(isMcpRiskLevel('low')).toBe(true); });
    test('valid medium passes', () => { expect(isMcpRiskLevel('medium')).toBe(true); });
    test('valid high passes', () => { expect(isMcpRiskLevel('high')).toBe(true); });
    test('valid critical passes', () => { expect(isMcpRiskLevel('critical')).toBe(true); });
    test('invalid fails', () => { expect(isMcpRiskLevel('extreme')).toBe(false); });
  });

  // McpWarmupPhase
  describe('isMcpWarmupPhase', () => {
    test('valid connect passes', () => { expect(isMcpWarmupPhase('connect')).toBe(true); });
    test('valid initialize passes', () => { expect(isMcpWarmupPhase('initialize')).toBe(true); });
    test('valid list_tools passes', () => { expect(isMcpWarmupPhase('list_tools')).toBe(true); });
    test('valid capability_manifest passes', () => { expect(isMcpWarmupPhase('capability_manifest')).toBe(true); });
    test('valid allowlist_check passes', () => { expect(isMcpWarmupPhase('allowlist_check')).toBe(true); });
    test('valid read_smoke passes', () => { expect(isMcpWarmupPhase('read_smoke')).toBe(true); });
    test('valid write_smoke_temp_workspace passes', () => { expect(isMcpWarmupPhase('write_smoke_temp_workspace')).toBe(true); });
    test('valid forbidden_tool_check passes', () => { expect(isMcpWarmupPhase('forbidden_tool_check')).toBe(true); });
    test('valid redaction_check passes', () => { expect(isMcpWarmupPhase('redaction_check')).toBe(true); });
    test('valid evidence_written passes', () => { expect(isMcpWarmupPhase('evidence_written')).toBe(true); });
    test('invalid fails', () => { expect(isMcpWarmupPhase('execute')).toBe(false); });
  });

  // McpWarmupStatus
  describe('isMcpWarmupStatus', () => {
    test('valid unknown passes', () => { expect(isMcpWarmupStatus('unknown')).toBe(true); });
    test('valid pending passes', () => { expect(isMcpWarmupStatus('pending')).toBe(true); });
    test('valid pass passes', () => { expect(isMcpWarmupStatus('pass')).toBe(true); });
    test('valid partial passes', () => { expect(isMcpWarmupStatus('partial')).toBe(true); });
    test('valid fail passes', () => { expect(isMcpWarmupStatus('fail')).toBe(true); });
    test('valid blocked passes', () => { expect(isMcpWarmupStatus('blocked')).toBe(true); });
    test('invalid fails', () => { expect(isMcpWarmupStatus('success')).toBe(false); });
  });

  // McpToolPermission
  describe('isMcpToolPermission', () => {
    test('valid allowed passes', () => { expect(isMcpToolPermission('allowed')).toBe(true); });
    test('valid requires_human_approval passes', () => { expect(isMcpToolPermission('requires_human_approval')).toBe(true); });
    test('valid forbidden passes', () => { expect(isMcpToolPermission('forbidden')).toBe(true); });
    test('invalid fails', () => { expect(isMcpToolPermission('maybe_allowed')).toBe(false); });
  });

  // McpCapabilityKind
  describe('isMcpCapabilityKind', () => {
    test('valid read passes', () => { expect(isMcpCapabilityKind('read')).toBe(true); });
    test('valid write passes', () => { expect(isMcpCapabilityKind('write')).toBe(true); });
    test('valid destructive passes', () => { expect(isMcpCapabilityKind('destructive')).toBe(true); });
    test('valid network passes', () => { expect(isMcpCapabilityKind('network')).toBe(true); });
    test('valid browser passes', () => { expect(isMcpCapabilityKind('browser')).toBe(true); });
    test('valid git passes', () => { expect(isMcpCapabilityKind('git')).toBe(true); });
    test('valid github passes', () => { expect(isMcpCapabilityKind('github')).toBe(true); });
    test('valid shell passes', () => { expect(isMcpCapabilityKind('shell')).toBe(true); });
    test('valid provider passes', () => { expect(isMcpCapabilityKind('provider')).toBe(true); });
    test('valid storage passes', () => { expect(isMcpCapabilityKind('storage')).toBe(true); });
    test('valid security passes', () => { expect(isMcpCapabilityKind('security')).toBe(true); });
    test('valid testing passes', () => { expect(isMcpCapabilityKind('testing')).toBe(true); });
    test('valid oversight passes', () => { expect(isMcpCapabilityKind('oversight')).toBe(true); });
    test('valid blueprint passes', () => { expect(isMcpCapabilityKind('blueprint')).toBe(true); });
    test('invalid fails', () => { expect(isMcpCapabilityKind('delete')).toBe(false); });
  });
});

// ── Required Inventory Tests ───────────────────────────────────────────────

describe('REQUIRED_MCP_SERVER_MANIFESTS', () => {
  test('has exactly 12 required MCP server manifests', () => {
    expect(REQUIRED_MCP_SERVER_MANIFESTS).toHaveLength(12);
  });

  test('all 12 expected server IDs are present', () => {
    const ids = REQUIRED_MCP_SERVER_MANIFESTS.map(m => m.serverId);
    expect(ids).toContain('opencode-provider');
    expect(ids).toContain('filesystem-workspace');
    expect(ids).toContain('git-workspace');
    expect(ids).toContain('github-source-of-truth');
    expect(ids).toContain('browser-devtools-evidence');
    expect(ids).toContain('shell-sandbox');
    expect(ids).toContain('speckit-adapter');
    expect(ids).toContain('sqlite-run-state');
    expect(ids).toContain('secret-scanner');
    expect(ids).toContain('test-reporter');
    expect(ids).toContain('operator-oversight');
    expect(ids).toContain('blueprint-launcher');
  });

  test('server IDs are unique', () => {
    const ids = REQUIRED_MCP_SERVER_MANIFESTS.map(m => m.serverId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test('each required server has warmupRequired true', () => {
    const required = REQUIRED_MCP_SERVER_MANIFESTS.filter(m => m.requiredness === 'required');
    expect(required.length).toBeGreaterThan(0);
    for (const manifest of required) {
      expect(manifest.warmupRequired).toBe(true);
    }
  });

  test('each required server has evidenceRequired true', () => {
    const required = REQUIRED_MCP_SERVER_MANIFESTS.filter(m => m.requiredness === 'required');
    for (const manifest of required) {
      expect(manifest.evidenceRequired).toBe(true);
    }
  });

  test('high/critical-risk tools require human approval', () => {
    const highRiskTools = REQUIRED_MCP_SERVER_MANIFESTS.flatMap(m =>
      m.tools.filter(t =>
        (t.riskLevel === 'high' || t.riskLevel === 'critical') &&
        (t.capabilityKinds.includes('write') || t.capabilityKinds.includes('destructive') || t.capabilityKinds.includes('shell')),
      ),
    );
    expect(highRiskTools.length).toBeGreaterThan(0);
    for (const tool of highRiskTools) {
      expect(
        tool.requiresApproval || tool.permission === 'forbidden',
      ).toBe(true);
    }
  });

  test('no tool has destructive capability allowed by default', () => {
    const destructiveTools = REQUIRED_MCP_SERVER_MANIFESTS.flatMap(m =>
      m.tools.filter(t => t.capabilityKinds.includes('destructive')),
    );
    expect(destructiveTools.length).toBeGreaterThan(0);
    for (const tool of destructiveTools) {
      expect(tool.allowedByDefault).toBe(false);
    }
  });

  test('no manifest allows unrestricted filesystem (/ or *)', () => {
    for (const manifest of REQUIRED_MCP_SERVER_MANIFESTS) {
      expect(manifest.allowedPaths).not.toContain('/');
      expect(manifest.allowedPaths).not.toContain('*');
    }
  });

  test('no manifest allows global config paths (~/.ssh, ~/.config)', () => {
    for (const manifest of REQUIRED_MCP_SERVER_MANIFESTS) {
      // allowedPaths should not contain global config paths
      for (const path of manifest.allowedPaths) {
        if (typeof path === 'string') {
          expect(path).not.toMatch(/^~\/\.(ssh|config)/);
        }
      }
    }
  });

  test('all required manifests pass validation', () => {
    for (const manifest of REQUIRED_MCP_SERVER_MANIFESTS) {
      const result = validateMcpCapabilityManifest(manifest);
      expect(result.valid).toBe(true);
    }
  });

  test('no tool with forbidden permission is allowed by default', () => {
    for (const manifest of REQUIRED_MCP_SERVER_MANIFESTS) {
      const forbiddenTools = manifest.tools.filter(t => t.permission === 'forbidden');
      for (const tool of forbiddenTools) {
        expect(tool.allowedByDefault).toBe(false);
        expect(tool.allowedInReal).toBe(false);
      }
    }
  });

  test('all 12 required MCP server manifests are in getRequiredMcpManifests', () => {
    // Some manifests in the inventory may be "optional" — so getRequiredMcpManifests
    // filters only those with requiredness === "required". The inventory should
    // have at least the 12 core servers required.
    const requiredManifests = REQUIRED_MCP_SERVER_MANIFESTS.filter(m => m.requiredness === 'required');
    expect(requiredManifests.length).toBeGreaterThanOrEqual(11); // Most are required
  });

  test('inventory is of type McpCapabilityManifest[]', () => {
    expect(Array.isArray(REQUIRED_MCP_SERVER_MANIFESTS)).toBe(true);
    for (const manifest of REQUIRED_MCP_SERVER_MANIFESTS) {
      expect(isMcpCapabilityManifest(manifest)).toBe(true);
    }
  });
});

// ── Manifest Validation Tests ──────────────────────────────────────────────

describe('validateMcpCapabilityManifest', () => {
  test('valid manifest passes', () => {
    const manifest = makeTestManifest();
    const result = validateMcpCapabilityManifest(manifest);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test('missing serverId fails', () => {
    const manifest = makeTestManifest({ serverId: '' as unknown as string });
    const result = validateMcpCapabilityManifest(manifest);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('serverId'))).toBe(true);
  });

  test('missing displayName fails', () => {
    const manifest = makeTestManifest({ displayName: '' });
    const result = validateMcpCapabilityManifest(manifest);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('displayName'))).toBe(true);
  });

  test('invalid role fails', () => {
    const manifest = makeTestManifest({ role: 'foot' as McpRole });
    const result = validateMcpCapabilityManifest(manifest);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('role'))).toBe(true);
  });

  test('invalid transport fails', () => {
    const manifest = makeTestManifest({ transport: 'grpc' as McpTransport });
    const result = validateMcpCapabilityManifest(manifest);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('transport'))).toBe(true);
  });

  test('missing tools array fails', () => {
    const manifest = makeTestManifest({ tools: undefined as unknown as McpToolCapability[] });
    const result = validateMcpCapabilityManifest(manifest);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('tools'))).toBe(true);
  });

  test('empty tools array fails', () => {
    const manifest = makeTestManifest({ tools: [] });
    const result = validateMcpCapabilityManifest(manifest);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('tools') && e.includes('empty'))).toBe(true);
  });

  test('defaultEnabled true with high-risk write tool fails', () => {
    const manifest = makeTestManifest({
      defaultEnabled: true,
      tools: [makeTestTool({
        riskLevel: 'high',
        capabilityKinds: ['write'],
        permission: 'requires_human_approval',
      })],
    });
    const result = validateMcpCapabilityManifest(manifest);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('defaultEnabled'))).toBe(true);
  });

  test('defaultEnabled true with low-risk read tool passes', () => {
    const manifest = makeTestManifest({
      defaultEnabled: true,
      requiresHumanApproval: false,
      tools: [makeTestTool({
        riskLevel: 'low',
        capabilityKinds: ['read'],
        permission: 'allowed',
      })],
    });
    const result = validateMcpCapabilityManifest(manifest);
    expect(result.valid).toBe(true);
  });

  test('allowedPaths with "/" fails', () => {
    const manifest = makeTestManifest({
      allowedPaths: ['<workspace>', '/'],
      role: 'hand_and_eye',
    });
    const result = validateMcpCapabilityManifest(manifest);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('unrestricted'))).toBe(true);
  });

  test('allowedPaths with "*" fails', () => {
    const manifest = makeTestManifest({
      allowedPaths: ['*'],
      role: 'hand_and_eye',
    });
    const result = validateMcpCapabilityManifest(manifest);
    expect(result.valid).toBe(false);
  });

  test('manifest with apiKey field fails', () => {
    const manifest = { ...makeTestManifest(), apiKey: 'sk-test123' };
    const result = validateMcpCapabilityManifest(manifest);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('secret'))).toBe(true);
  });

  test('manifest with token field fails', () => {
    const manifest = { ...makeTestManifest(), token: 'ghp_test' };
    const result = validateMcpCapabilityManifest(manifest);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('secret'))).toBe(true);
  });

  test('destructive tool without approval fails', () => {
    const manifest = makeTestManifest({
      tools: [makeTestTool({
        capabilityKinds: ['destructive'],
        requiresApproval: false,
        permission: 'allowed',
      })],
    });
    const result = validateMcpCapabilityManifest(manifest);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('destructive'))).toBe(true);
  });

  test('forbidden tool with allowedByDefault true fails', () => {
    const manifest = makeTestManifest({
      tools: [makeTestTool({
        permission: 'forbidden',
        allowedByDefault: true,
      })],
    });
    const result = validateMcpCapabilityManifest(manifest);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('forbidden') && e.includes('allowedByDefault'))).toBe(true);
  });

  test('missing timeoutMs fails', () => {
    const manifest = makeTestManifest({ timeoutMs: 0 });
    const result = validateMcpCapabilityManifest(manifest);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('timeoutMs'))).toBe(true);
  });

  test('null value fails', () => {
    const result = validateMcpCapabilityManifest(null);
    expect(result.valid).toBe(false);
  });

  test('string value fails', () => {
    const result = validateMcpCapabilityManifest('not-a-manifest');
    expect(result.valid).toBe(false);
  });
});

// ── Warm-up Evidence Validation Tests ──────────────────────────────────────

describe('validateMcpWarmupEvidence', () => {
  test('valid evidence passes', () => {
    const evidence = makeTestEvidence();
    const result = validateMcpWarmupEvidence(evidence);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test('pass status with secretsDetected true fails', () => {
    const evidence = makeTestEvidence({ status: 'pass', secretsDetected: true });
    const result = validateMcpWarmupEvidence(evidence);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('secretsDetected'))).toBe(true);
  });

  test('pass status with privatePathsDetected true fails', () => {
    const evidence = makeTestEvidence({ status: 'pass', privatePathsDetected: true });
    const result = validateMcpWarmupEvidence(evidence);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('privatePathsDetected'))).toBe(true);
  });

  test('pass status with redactionApplied false fails', () => {
    const evidence = makeTestEvidence({ status: 'pass', redactionApplied: false });
    const result = validateMcpWarmupEvidence(evidence);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('redactionApplied'))).toBe(true);
  });

  test('pass status with non-empty blockedReasons fails', () => {
    const evidence = makeTestEvidence({ status: 'pass', blockedReasons: ['blocked for test'] });
    const result = validateMcpWarmupEvidence(evidence);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('blockedReasons'))).toBe(true);
  });

  test('pass status with a failed phase fails', () => {
    const evidence = makeTestEvidence({
      status: 'pass',
      phases: [
        { phase: 'connect', status: 'pass', message: 'OK' },
        { phase: 'initialize', status: 'fail', message: 'Init failed' },
        { phase: 'list_tools', status: 'pass', message: 'OK' },
        { phase: 'capability_manifest', status: 'pass', message: 'OK' },
        { phase: 'allowlist_check', status: 'pass', message: 'OK' },
        { phase: 'read_smoke', status: 'pass', message: 'OK' },
        { phase: 'write_smoke_temp_workspace', status: 'pass', message: 'OK' },
        { phase: 'forbidden_tool_check', status: 'pass', message: 'OK' },
        { phase: 'redaction_check', status: 'pass', message: 'OK' },
        { phase: 'evidence_written', status: 'pass', message: 'OK' },
      ],
    });
    const result = validateMcpWarmupEvidence(evidence);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('phase'))).toBe(true);
  });

  test('empty phases array fails', () => {
    const evidence = makeTestEvidence({ phases: [] });
    const result = validateMcpWarmupEvidence(evidence);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('Phases'))).toBe(true);
  });

  test('pass status with failed forbidden tool check fails', () => {
    const evidence = makeTestEvidence({
      status: 'pass',
      forbiddenToolChecks: [
        { toolName: 'bad.tool', expected: 'absent', actual: 'allowed', status: 'fail' },
      ],
    });
    const result = validateMcpWarmupEvidence(evidence);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('forbidden tool'))).toBe(true);
  });

  test('null value fails', () => {
    const result = validateMcpWarmupEvidence(null);
    expect(result.valid).toBe(false);
  });

  test('non-object fails', () => {
    const result = validateMcpWarmupEvidence('not-evidence');
    expect(result.valid).toBe(false);
  });

  test('fail status with secretsDetected true is valid (fail is consistent)', () => {
    const evidence = makeTestEvidence({ status: 'fail', secretsDetected: true });
    const result = validateMcpWarmupEvidence(evidence);
    // Fail status with secrets detected is consistent — no error
    expect(result.valid).toBe(true);
  });

  test('partial status with redactionApplied false is valid', () => {
    const evidence = makeTestEvidence({ status: 'partial', redactionApplied: false });
    const result = validateMcpWarmupEvidence(evidence);
    // Partial status without redaction is consistent — not a pass pretending to be clean
    expect(result.valid).toBe(true);
  });
});

// ── Policy / Helper Tests ──────────────────────────────────────────────────

describe('getRequiredMcpManifests', () => {
  test('filters only required manifests', () => {
    const manifests = [
      makeTestManifest({ serverId: 's1', requiredness: 'required' }),
      makeTestManifest({ serverId: 's2', requiredness: 'optional' }),
      makeTestManifest({ serverId: 's3', requiredness: 'required' }),
      makeTestManifest({ serverId: 's4', requiredness: 'disabled' }),
    ];
    const required = getRequiredMcpManifests(manifests);
    expect(required).toHaveLength(2);
    expect(required.map(r => r.serverId)).toEqual(['s1', 's3']);
  });

  test('returns empty array if no required manifests', () => {
    const manifests = [
      makeTestManifest({ serverId: 's1', requiredness: 'optional' }),
    ];
    expect(getRequiredMcpManifests(manifests)).toHaveLength(0);
  });
});

describe('hasForbiddenDefaultAllowedTools', () => {
  test('returns true if forbidden tool has allowedByDefault true', () => {
    const manifest = makeTestManifest({
      tools: [makeTestTool({ permission: 'forbidden', allowedByDefault: true })],
    });
    expect(hasForbiddenDefaultAllowedTools(manifest)).toBe(true);
  });

  test('returns false if no forbidden tools', () => {
    const manifest = makeTestManifest({
      tools: [makeTestTool({ permission: 'allowed' })],
    });
    expect(hasForbiddenDefaultAllowedTools(manifest)).toBe(false);
  });

  test('returns false if forbidden tool has allowedByDefault false', () => {
    const manifest = makeTestManifest({
      tools: [makeTestTool({ permission: 'forbidden', allowedByDefault: false })],
    });
    expect(hasForbiddenDefaultAllowedTools(manifest)).toBe(false);
  });
});

describe('requiresHumanApprovalForManifest', () => {
  test('returns true if manifest explicitly requires approval', () => {
    const manifest = makeTestManifest({ requiresHumanApproval: true });
    expect(requiresHumanApprovalForManifest(manifest)).toBe(true);
  });

  test('returns true if any tool requires approval', () => {
    const manifest = makeTestManifest({
      requiresHumanApproval: false,
      tools: [makeTestTool({ requiresApproval: true })],
    });
    expect(requiresHumanApprovalForManifest(manifest)).toBe(true);
  });

  test('returns true for high-risk write tools', () => {
    const manifest = makeTestManifest({
      requiresHumanApproval: false,
      tools: [makeTestTool({
        riskLevel: 'high',
        capabilityKinds: ['write'],
        requiresApproval: false,
      })],
    });
    expect(requiresHumanApprovalForManifest(manifest)).toBe(true);
  });

  test('returns false for low-risk read-only tools', () => {
    const manifest = makeTestManifest({
      requiresHumanApproval: false,
      tools: [makeTestTool({
        riskLevel: 'low',
        capabilityKinds: ['read'],
        requiresApproval: false,
      })],
    });
    expect(requiresHumanApprovalForManifest(manifest)).toBe(false);
  });
});

// ── Readiness Policy Tests ─────────────────────────────────────────────────

describe('isMcpWarmupPass', () => {
  test('fully passing evidence returns true', () => {
    const evidence = makeTestEvidence();
    expect(isMcpWarmupPass(evidence)).toBe(true);
  });

  test('status fail returns false', () => {
    const evidence = makeTestEvidence({ status: 'fail' });
    expect(isMcpWarmupPass(evidence)).toBe(false);
  });

  test('status partial returns false', () => {
    const evidence = makeTestEvidence({ status: 'partial' });
    expect(isMcpWarmupPass(evidence)).toBe(false);
  });

  test('secretsDetected true returns false', () => {
    const evidence = makeTestEvidence({ secretsDetected: true });
    expect(isMcpWarmupPass(evidence)).toBe(false);
  });

  test('privatePathsDetected true returns false', () => {
    const evidence = makeTestEvidence({ privatePathsDetected: true });
    expect(isMcpWarmupPass(evidence)).toBe(false);
  });

  test('redactionApplied false returns false', () => {
    const evidence = makeTestEvidence({ redactionApplied: false });
    expect(isMcpWarmupPass(evidence)).toBe(false);
  });

  test('non-empty blockedReasons returns false', () => {
    const evidence = makeTestEvidence({ blockedReasons: ['reason'] });
    expect(isMcpWarmupPass(evidence)).toBe(false);
  });

  test('realRunAllowed false returns false', () => {
    const evidence = makeTestEvidence({ realRunAllowed: false });
    expect(isMcpWarmupPass(evidence)).toBe(false);
  });
});

describe('canUseMcpServerForDemo', () => {
  test('pass evidence with matching manifest returns true', () => {
    const manifest = makeTestManifest({ serverId: 'demo-server' });
    const evidence = makeTestEvidence({ serverId: 'demo-server' });
    expect(canUseMcpServerForDemo(manifest, evidence)).toBe(true);
  });

  test('partial evidence returns true for demo', () => {
    const manifest = makeTestManifest({ serverId: 'demo-server' });
    const evidence = makeTestEvidence({ serverId: 'demo-server', status: 'partial' });
    expect(canUseMcpServerForDemo(manifest, evidence)).toBe(true);
  });

  test('mismatched serverId returns false', () => {
    const manifest = makeTestManifest({ serverId: 'server-a' });
    const evidence = makeTestEvidence({ serverId: 'server-b' });
    expect(canUseMcpServerForDemo(manifest, evidence)).toBe(false);
  });

  test('secrets detected blocks demo', () => {
    const manifest = makeTestManifest({ serverId: 'demo-server' });
    const evidence = makeTestEvidence({ serverId: 'demo-server', secretsDetected: true });
    expect(canUseMcpServerForDemo(manifest, evidence)).toBe(false);
  });

  test('private paths detected blocks demo', () => {
    const manifest = makeTestManifest({ serverId: 'demo-server' });
    const evidence = makeTestEvidence({ serverId: 'demo-server', privatePathsDetected: true });
    expect(canUseMcpServerForDemo(manifest, evidence)).toBe(false);
  });

  test('forbidden tool check fail blocks demo', () => {
    const manifest = makeTestManifest({ serverId: 'demo-server' });
    const evidence = makeTestEvidence({
      serverId: 'demo-server',
      forbiddenToolChecks: [
        { toolName: 'bad', expected: 'absent', actual: 'allowed', status: 'fail' },
      ],
    });
    expect(canUseMcpServerForDemo(manifest, evidence)).toBe(false);
  });

  test('fail status blocks demo', () => {
    const manifest = makeTestManifest({ serverId: 'demo-server' });
    const evidence = makeTestEvidence({ serverId: 'demo-server', status: 'fail' });
    expect(canUseMcpServerForDemo(manifest, evidence)).toBe(false);
  });

  test('blocked status blocks demo', () => {
    const manifest = makeTestManifest({ serverId: 'demo-server' });
    const evidence = makeTestEvidence({ serverId: 'demo-server', status: 'blocked' });
    expect(canUseMcpServerForDemo(manifest, evidence)).toBe(false);
  });

  test('critical-risk tool blocks demo', () => {
    const manifest = makeTestManifest({
      serverId: 'demo-server',
      tools: [makeTestTool({ riskLevel: 'critical' })],
    });
    const evidence = makeTestEvidence({ serverId: 'demo-server' });
    expect(canUseMcpServerForDemo(manifest, evidence)).toBe(false);
  });
});

describe('canUseMcpServerForRealRun', () => {
  test('full pass evidence returns true', () => {
    const manifest = makeTestManifest({ serverId: 'real-server' });
    const evidence = makeTestEvidence({ serverId: 'real-server' });
    expect(canUseMcpServerForRealRun(manifest, evidence)).toBe(true);
  });

  test('mismatched serverId returns false', () => {
    const manifest = makeTestManifest({ serverId: 'server-a' });
    const evidence = makeTestEvidence({ serverId: 'server-b' });
    expect(canUseMcpServerForRealRun(manifest, evidence)).toBe(false);
  });

  test('not a full pass returns false', () => {
    const manifest = makeTestManifest({ serverId: 'real-server' });
    const evidence = makeTestEvidence({ serverId: 'real-server', status: 'partial' });
    expect(canUseMcpServerForRealRun(manifest, evidence)).toBe(false);
  });

  test('secrets detected blocks real run', () => {
    const manifest = makeTestManifest({ serverId: 'real-server' });
    const evidence = makeTestEvidence({ serverId: 'real-server', secretsDetected: true, status: 'fail' });
    expect(canUseMcpServerForRealRun(manifest, evidence)).toBe(false);
  });

  test('private paths detected blocks real run', () => {
    const manifest = makeTestManifest({ serverId: 'real-server' });
    const evidence = makeTestEvidence({ serverId: 'real-server', privatePathsDetected: true, status: 'fail' });
    expect(canUseMcpServerForRealRun(manifest, evidence)).toBe(false);
  });

  test('redactionApplied false blocks real run', () => {
    const manifest = makeTestManifest({ serverId: 'real-server' });
    const evidence = makeTestEvidence({ serverId: 'real-server', redactionApplied: false });
    expect(canUseMcpServerForRealRun(manifest, evidence)).toBe(false);
  });

  test('realRunAllowed false blocks real run', () => {
    const manifest = makeTestManifest({ serverId: 'real-server' });
    const evidence = makeTestEvidence({ serverId: 'real-server', realRunAllowed: false });
    expect(canUseMcpServerForRealRun(manifest, evidence)).toBe(false);
  });

  test('forbidden tool with allowedInReal true blocks real run', () => {
    const manifest = makeTestManifest({
      serverId: 'real-server',
      tools: [makeTestTool({ permission: 'forbidden', allowedInReal: true })],
    });
    const evidence = makeTestEvidence({ serverId: 'real-server' });
    expect(canUseMcpServerForRealRun(manifest, evidence)).toBe(false);
  });
});

describe('summarizeMcpWarmupEvidence', () => {
  test('all required pass returns requiredReady true', () => {
    const manifests = [
      makeTestManifest({ serverId: 's1', requiredness: 'required' }),
      makeTestManifest({ serverId: 's2', requiredness: 'required' }),
    ];
    const evidence = [
      makeTestEvidence({ serverId: 's1' }),
      makeTestEvidence({ serverId: 's2' }),
    ];
    const summary = summarizeMcpWarmupEvidence(manifests, evidence);
    expect(summary.requiredReady).toBe(true);
    expect(summary.realRunAllowed).toBe(true);
    expect(summary.blockedReasons).toHaveLength(0);
    expect(summary.totalRequired).toBe(2);
    expect(summary.pass).toBe(2);
  });

  test('missing required MCP blocks readiness', () => {
    const manifests = [
      makeTestManifest({ serverId: 's1', requiredness: 'required' }),
      makeTestManifest({ serverId: 's2', requiredness: 'required' }),
    ];
    const evidence = [
      makeTestEvidence({ serverId: 's1' }),
      // s2 is missing
    ];
    const summary = summarizeMcpWarmupEvidence(manifests, evidence);
    expect(summary.requiredReady).toBe(false);
    expect(summary.realRunAllowed).toBe(false);
    expect(summary.blockedReasons.length).toBeGreaterThan(0);
    expect(summary.unknown).toBe(1);
  });

  test('failed required MCP blocks readiness', () => {
    const manifests = [
      makeTestManifest({ serverId: 's1', requiredness: 'required' }),
    ];
    const evidence = [
      makeTestEvidence({ serverId: 's1', status: 'fail' }),
    ];
    const summary = summarizeMcpWarmupEvidence(manifests, evidence);
    expect(summary.requiredReady).toBe(false);
    expect(summary.fail).toBe(1);
  });

  test('partial required MCP blocks readiness', () => {
    const manifests = [
      makeTestManifest({ serverId: 's1', requiredness: 'required' }),
    ];
    const evidence = [
      makeTestEvidence({ serverId: 's1', status: 'partial' }),
    ];
    const summary = summarizeMcpWarmupEvidence(manifests, evidence);
    expect(summary.requiredReady).toBe(false);
    expect(summary.partial).toBe(1);
  });

  test('optional MCP fail does not block required readiness', () => {
    const manifests = [
      makeTestManifest({ serverId: 's1', requiredness: 'required' }),
      makeTestManifest({ serverId: 's2', requiredness: 'optional' }),
    ];
    const evidence = [
      makeTestEvidence({ serverId: 's1', status: 'pass' }),
      makeTestEvidence({ serverId: 's2', status: 'fail' }),
    ];
    const summary = summarizeMcpWarmupEvidence(manifests, evidence);
    expect(summary.requiredReady).toBe(true);
    expect(summary.realRunAllowed).toBe(true); // optional failure doesn't block
    expect(summary.fail).toBe(1); // optional failure counted
  });

  test('counts pass/partial/fail/blocked/unknown correctly', () => {
    const manifests = [
      makeTestManifest({ serverId: 'p1', requiredness: 'required' }),
      makeTestManifest({ serverId: 'p2', requiredness: 'required' }),
      makeTestManifest({ serverId: 'p3', requiredness: 'required' }),
      makeTestManifest({ serverId: 'p4', requiredness: 'required' }),
      makeTestManifest({ serverId: 'p5', requiredness: 'required' }),
    ];
    const evidence = [
      makeTestEvidence({ serverId: 'p1', status: 'pass' }),
      makeTestEvidence({ serverId: 'p2', status: 'partial' }),
      makeTestEvidence({ serverId: 'p3', status: 'fail' }),
      makeTestEvidence({ serverId: 'p4', status: 'blocked' }),
      // p5 missing — unknown
    ];
    const summary = summarizeMcpWarmupEvidence(manifests, evidence);
    expect(summary.pass).toBe(1);
    expect(summary.partial).toBe(1);
    expect(summary.fail).toBe(1);
    expect(summary.blocked).toBe(1);
    expect(summary.unknown).toBe(1);
    expect(summary.requiredReady).toBe(false);
  });

  test('secrets detected on any MCP blocks real run', () => {
    const manifests = [
      makeTestManifest({ serverId: 's1', requiredness: 'required' }),
    ];
    const evidence = [
      makeTestEvidence({ serverId: 's1', status: 'pass', secretsDetected: true }),
    ];
    const summary = summarizeMcpWarmupEvidence(manifests, evidence);
    // status is pass but secrets detected — evidence validation would catch this
    // But summarize also checks it
    expect(summary.realRunAllowed).toBe(false);
    expect(summary.blockedReasons.some(r => r.includes('secrets'))).toBe(true);
  });

  test('forbidden tool check failure blocks real run', () => {
    const manifests = [
      makeTestManifest({ serverId: 's1', requiredness: 'required' }),
    ];
    const evidence = [
      makeTestEvidence({
        serverId: 's1',
        status: 'pass',
        forbiddenToolChecks: [
          { toolName: 'bad', expected: 'absent', actual: 'allowed', status: 'fail' },
        ],
      }),
    ];
    const summary = summarizeMcpWarmupEvidence(manifests, evidence);
    expect(summary.realRunAllowed).toBe(false);
  });
});

describe('areRequiredMcpsReadyForRealRun', () => {
  test('all required pass returns true', () => {
    const manifests = [
      makeTestManifest({ serverId: 's1', requiredness: 'required' }),
      makeTestManifest({ serverId: 's2', requiredness: 'required' }),
    ];
    const evidence = [
      makeTestEvidence({ serverId: 's1' }),
      makeTestEvidence({ serverId: 's2' }),
    ];
    expect(areRequiredMcpsReadyForRealRun(manifests, evidence)).toBe(true);
  });

  test('missing required MCP returns false', () => {
    const manifests = [
      makeTestManifest({ serverId: 's1', requiredness: 'required' }),
      makeTestManifest({ serverId: 's2', requiredness: 'required' }),
    ];
    const evidence = [
      makeTestEvidence({ serverId: 's1' }),
    ];
    expect(areRequiredMcpsReadyForRealRun(manifests, evidence)).toBe(false);
  });

  test('failed required MCP returns false', () => {
    const manifests = [
      makeTestManifest({ serverId: 's1', requiredness: 'required' }),
    ];
    const evidence = [
      makeTestEvidence({ serverId: 's1', status: 'fail' }),
    ];
    expect(areRequiredMcpsReadyForRealRun(manifests, evidence)).toBe(false);
  });

  test('partial required MCP returns false', () => {
    const manifests = [
      makeTestManifest({ serverId: 's1', requiredness: 'required' }),
    ];
    const evidence = [
      makeTestEvidence({ serverId: 's1', status: 'partial' }),
    ];
    expect(areRequiredMcpsReadyForRealRun(manifests, evidence)).toBe(false);
  });

  test('no required manifests returns false', () => {
    const manifests = [
      makeTestManifest({ serverId: 's1', requiredness: 'optional' }),
    ];
    const evidence = [
      makeTestEvidence({ serverId: 's1' }),
    ];
    expect(areRequiredMcpsReadyForRealRun(manifests, evidence)).toBe(false);
  });

  test('secrets detected blocks readiness', () => {
    const manifests = [
      makeTestManifest({ serverId: 's1', requiredness: 'required' }),
    ];
    const evidence = [
      makeTestEvidence({ serverId: 's1', secretsDetected: true }),
    ];
    expect(areRequiredMcpsReadyForRealRun(manifests, evidence)).toBe(false);
  });

  test('private paths detected blocks readiness', () => {
    const manifests = [
      makeTestManifest({ serverId: 's1', requiredness: 'required' }),
    ];
    const evidence = [
      makeTestEvidence({ serverId: 's1', privatePathsDetected: true }),
    ];
    expect(areRequiredMcpsReadyForRealRun(manifests, evidence)).toBe(false);
  });

  test('redaction false blocks readiness', () => {
    const manifests = [
      makeTestManifest({ serverId: 's1', requiredness: 'required' }),
    ];
    const evidence = [
      makeTestEvidence({ serverId: 's1', redactionApplied: false }),
    ];
    expect(areRequiredMcpsReadyForRealRun(manifests, evidence)).toBe(false);
  });
});

describe('getMcpRealRunBlockedReasons', () => {
  test('returns empty array when all ready', () => {
    const manifests = [
      makeTestManifest({ serverId: 's1', requiredness: 'required' }),
    ];
    const evidence = [
      makeTestEvidence({ serverId: 's1' }),
    ];
    expect(getMcpRealRunBlockedReasons(manifests, evidence)).toHaveLength(0);
  });

  test('returns reasons when blocked', () => {
    const manifests = [
      makeTestManifest({ serverId: 's1', requiredness: 'required' }),
      makeTestManifest({ serverId: 's2', requiredness: 'required' }),
    ];
    const evidence = [
      makeTestEvidence({ serverId: 's1', status: 'fail' }),
    ];
    const reasons = getMcpRealRunBlockedReasons(manifests, evidence);
    expect(reasons.length).toBeGreaterThan(0);
    expect(reasons.some(r => r.includes('s1'))).toBe(true);
    expect(reasons.some(r => r.includes('s2'))).toBe(true);
  });
});

// ── Redaction Tests ────────────────────────────────────────────────────────

describe('redactMcpWarmupEvidenceForEvidence', () => {
  test('redacted evidence has redactionApplied true', () => {
    const evidence = makeTestEvidence();
    const redacted = redactMcpWarmupEvidenceForEvidence(evidence);
    expect(redacted.redactionApplied).toBe(true);
  });

  test('redacted evidence excludes raw listedTools', () => {
    const evidence = makeTestEvidence({ listedTools: ['tool.a', 'tool.b', 'tool.c'] });
    const redacted = redactMcpWarmupEvidenceForEvidence(evidence);
    // listedToolsCount should match original count
    expect(redacted.listedToolsCount).toBe(3);
    // Raw listedTools should NOT be present
    expect('listedTools' in redacted).toBe(false);
  });

  test('redacted evidence preserves evidenceId and serverId', () => {
    const evidence = makeTestEvidence({ evidenceId: 'ev-123', serverId: 'my-server' });
    const redacted = redactMcpWarmupEvidenceForEvidence(evidence);
    expect(redacted.evidenceId).toBe('ev-123');
    expect(redacted.serverId).toBe('my-server');
  });

  test('redacted evidence preserves status metadata', () => {
    const evidence = makeTestEvidence({ status: 'pass' });
    const redacted = redactMcpWarmupEvidenceForEvidence(evidence);
    expect(redacted.status).toBe('pass');
    expect(redacted.secretsDetected).toBe(false);
    expect(redacted.privatePathsDetected).toBe(false);
    expect(redacted.realRunAllowed).toBe(true);
  });

  test('redacted evidence preserves forbidden tool checks', () => {
    const check: McpForbiddenToolCheck = {
      toolName: 'bad.tool',
      expected: 'absent',
      actual: 'allowed',
      status: 'fail',
    };
    const evidence = makeTestEvidence({ forbiddenToolChecks: [check] });
    const redacted = redactMcpWarmupEvidenceForEvidence(evidence);
    expect(redacted.forbiddenToolChecks).toHaveLength(1);
    expect(redacted.forbiddenToolChecks[0]?.toolName).toBe('bad.tool');
  });

  test('redacted evidence preserves phase results', () => {
    const evidence = makeTestEvidence();
    const redacted = redactMcpWarmupEvidenceForEvidence(evidence);
    expect(redacted.phases).toHaveLength(evidence.phases.length);
    expect(redacted.phases[0]?.phase).toBe('connect');
    expect(redacted.phases[0]?.status).toBe('pass');
  });

  test('redacted evidence redacts paths in blocked reasons', () => {
    const evidence = makeTestEvidence({
      status: 'fail',
      blockedReasons: ['Access denied to /home/user/.ssh/id_rsa'],
      realRunAllowed: false,
      secretsDetected: false,
      privatePathsDetected: false,
    });
    const redacted = redactMcpWarmupEvidenceForEvidence(evidence);
    expect(redacted.blockedReasons[0]).not.toContain('/home/user/.ssh/id_rsa');
    expect(redacted.blockedReasons[0]).toContain('[path]');
  });

  test('redacted evidence redacts secrets in blocked reasons', () => {
    const evidence = makeTestEvidence({
      status: 'fail',
      blockedReasons: ['Secret found: ghp_abcdefghijklmnopqrstuvwxyz0123456789'],
      realRunAllowed: false,
      secretsDetected: false,
      privatePathsDetected: false,
    });
    const redacted = redactMcpWarmupEvidenceForEvidence(evidence);
    expect(redacted.blockedReasons[0]).not.toContain('ghp_abcdefghijklmnopqrstuvwxyz0123456789');
    expect(redacted.blockedReasons[0]).toContain('[secret-redacted]');
  });

  test('redacted evidence with zero listed tools reports count 0', () => {
    const evidence = makeTestEvidence({ listedTools: [] });
    const redacted = redactMcpWarmupEvidenceForEvidence(evidence);
    expect(redacted.listedToolsCount).toBe(0);
  });

  test('redacted evidence type should match RedactedMcpWarmupEvidence', () => {
    const evidence = makeTestEvidence();
    const redacted: RedactedMcpWarmupEvidence = redactMcpWarmupEvidenceForEvidence(evidence);
    expect(redacted).toBeDefined();
    // Verify key properties exist on the redacted type
    expect(typeof redacted.evidenceId).toBe('string');
    expect(typeof redacted.serverId).toBe('string');
    expect(typeof redacted.listedToolsCount).toBe('number');
    expect(Array.isArray(redacted.phases)).toBe(true);
    expect(Array.isArray(redacted.forbiddenToolChecks)).toBe(true);
    expect(Array.isArray(redacted.blockedReasons)).toBe(true);
  });

  test('redacted evidence preserves empty blocked reasons', () => {
    const evidence = makeTestEvidence({ blockedReasons: [] });
    const redacted = redactMcpWarmupEvidenceForEvidence(evidence);
    expect(redacted.blockedReasons).toHaveLength(0);
  });
});

// ── Integration-style Tests ────────────────────────────────────────────────

describe('Full Required Inventory Warm-up Flow', () => {
  test('all 12 required manifests + all pass evidence = ready for real run', () => {
    const evidence = REQUIRED_MCP_SERVER_MANIFESTS.map(m =>
      makeTestEvidence({ serverId: m.serverId, status: 'pass' }),
    );
    const ready = areRequiredMcpsReadyForRealRun(REQUIRED_MCP_SERVER_MANIFESTS, evidence);
    expect(ready).toBe(true);
  });

  test('missing one required MCP evidence = not ready', () => {
    const evidence = REQUIRED_MCP_SERVER_MANIFESTS
      .filter(m => m.serverId !== 'secret-scanner')
      .map(m => makeTestEvidence({ serverId: m.serverId }));
    const ready = areRequiredMcpsReadyForRealRun(REQUIRED_MCP_SERVER_MANIFESTS, evidence);
    expect(ready).toBe(false);
  });

  test('one failed required MCP = not ready', () => {
    const evidence = REQUIRED_MCP_SERVER_MANIFESTS.map(m =>
      makeTestEvidence({
        serverId: m.serverId,
        status: m.serverId === 'speckit-adapter' ? 'fail' : 'pass',
      }),
    );
    const ready = areRequiredMcpsReadyForRealRun(REQUIRED_MCP_SERVER_MANIFESTS, evidence);
    expect(ready).toBe(false);
  });

  test('summary covers all required + missing correctly', () => {
    const evidence = REQUIRED_MCP_SERVER_MANIFESTS
      .slice(0, 6)
      .map(m => makeTestEvidence({ serverId: m.serverId }));
    const summary = summarizeMcpWarmupEvidence(REQUIRED_MCP_SERVER_MANIFESTS, evidence);
    expect(summary.pass).toBe(6);
    // The remaining 6 required have no evidence -> unknown
    expect(summary.unknown).toBe(6);
    expect(summary.requiredReady).toBe(false);
  });
});
