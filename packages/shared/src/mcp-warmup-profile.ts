// Positron — MCP Warm-up Contract, Capability Manifest, and Evidence Model (Issue #229 PR 4)
// ---------------------------------------------------------------------------
// This module defines the type system, required inventory, validation logic,
// readiness policy, and evidence redaction for MCP server warm-up.
// It is PURE TYPES, VALIDATION, and POLICY.
// No runtime execution, no MCP server starts, no OpenCode execution,
// no Spec Kit install, no tool execution.
//
// Hard Constraints:
//   - Required MCPs block real runs unless warm-up evidence is PASS
//   - Forbidden tool check failures block real runs
//   - Secrets/private paths block real runs
//   - Redaction is mandatory for all evidence
//   - No runtime in this module — only types, contracts, and pure functions
//   - Tool Gateway remains read-only — no execution endpoints

import { type ValidationResult, validationFail, validationPass } from './opencode-model-profile.js';

// ── Union Types ────────────────────────────────────────────────────────────

/**
 * MCP role classification — Hands/Eyes model.
 * - "hand": executes actions (writes code, runs commands, creates artifacts)
 * - "eye": observes and reports (reads files, takes screenshots, scans)
 * - "hand_and_eye": both executes and observes
 */
export type McpRole =
  | 'hand'
  | 'eye'
  | 'hand_and_eye';

/**
 * Whether an MCP server is required, optional, or disabled for Positron operation.
 */
export type McpRequiredness =
  | 'required'
  | 'optional'
  | 'disabled';

/**
 * MCP communication transport protocol.
 */
export type McpTransport =
  | 'stdio'
  | 'sse'
  | 'http'
  | 'websocket'
  | 'adapter'
  | 'unknown';

/**
 * Overall risk level for an MCP server.
 */
export type McpRiskLevel =
  | 'low'
  | 'medium'
  | 'high'
  | 'critical';

/**
 * Phases of the MCP warm-up protocol (in execution order).
 * Each phase may contain multiple steps — the warm-up result tracks phase-level status.
 */
export type McpWarmupPhase =
  | 'connect'
  | 'initialize'
  | 'list_tools'
  | 'capability_manifest'
  | 'allowlist_check'
  | 'read_smoke'
  | 'write_smoke_temp_workspace'
  | 'forbidden_tool_check'
  | 'redaction_check'
  | 'evidence_written';

/**
 * Status of an MCP warm-up (overall or per-phase).
 */
export type McpWarmupStatus =
  | 'unknown'
  | 'pending'
  | 'pass'
  | 'partial'
  | 'fail'
  | 'blocked';

/**
 * Permission level for an individual MCP tool.
 */
export type McpToolPermission =
  | 'allowed'
  | 'requires_human_approval'
  | 'forbidden';

/**
 * Capability kind for an MCP tool — describes what class of operations the tool can perform.
 */
export type McpCapabilityKind =
  | 'read'
  | 'write'
  | 'destructive'
  | 'network'
  | 'browser'
  | 'git'
  | 'github'
  | 'shell'
  | 'provider'
  | 'storage'
  | 'security'
  | 'testing'
  | 'oversight'
  | 'blueprint';

// ── Constant Arrays ────────────────────────────────────────────────────────

/** All valid MCP roles */
export const ALL_MCP_ROLES: readonly McpRole[] = [
  'hand',
  'eye',
  'hand_and_eye',
] as const;

/** All valid MCP requiredness levels */
export const ALL_MCP_REQUIREDNESSES: readonly McpRequiredness[] = [
  'required',
  'optional',
  'disabled',
] as const;

/** All valid MCP transports */
export const ALL_MCP_TRANSPORTS: readonly McpTransport[] = [
  'stdio',
  'sse',
  'http',
  'websocket',
  'adapter',
  'unknown',
] as const;

/** All valid MCP risk levels */
export const ALL_MCP_RISK_LEVELS: readonly McpRiskLevel[] = [
  'low',
  'medium',
  'high',
  'critical',
] as const;

/** All valid MCP warm-up phases (in execution order) */
export const ALL_MCP_WARMUP_PHASES: readonly McpWarmupPhase[] = [
  'connect',
  'initialize',
  'list_tools',
  'capability_manifest',
  'allowlist_check',
  'read_smoke',
  'write_smoke_temp_workspace',
  'forbidden_tool_check',
  'redaction_check',
  'evidence_written',
] as const;

/** All valid MCP warm-up statuses */
export const ALL_MCP_WARMUP_STATUSES: readonly McpWarmupStatus[] = [
  'unknown',
  'pending',
  'pass',
  'partial',
  'fail',
  'blocked',
] as const;

/** All valid MCP tool permissions */
export const ALL_MCP_TOOL_PERMISSIONS: readonly McpToolPermission[] = [
  'allowed',
  'requires_human_approval',
  'forbidden',
] as const;

/** All valid MCP capability kinds */
export const ALL_MCP_CAPABILITY_KINDS: readonly McpCapabilityKind[] = [
  'read',
  'write',
  'destructive',
  'network',
  'browser',
  'git',
  'github',
  'shell',
  'provider',
  'storage',
  'security',
  'testing',
  'oversight',
  'blueprint',
] as const;

// ── Interface Types ────────────────────────────────────────────────────────

/**
 * A single tool capability declaration for an MCP server.
 *
 * SECURITY: This interface MUST NEVER contain handler functions,
 * API keys, tokens, or raw function source. It is pure metadata.
 */
export interface McpToolCapability {
  /** Tool name as exposed by the MCP server */
  toolName: string;
  /** Human-readable description of what the tool does */
  description: string;
  /** Whether this tool is a hand, eye, or both */
  handOrEye: McpRole;
  /** Risk level for this specific tool */
  riskLevel: McpRiskLevel;
  /** What classes of operations this tool can perform */
  capabilityKinds: McpCapabilityKind[];
  /** Permission level for this tool */
  permission: McpToolPermission;
  /** Whether the tool is allowed by default (before human review) */
  allowedByDefault: boolean;
  /** Whether the tool can be used in demo runs */
  allowedInDemo: boolean;
  /** Whether the tool can be used in real/production runs */
  allowedInReal: boolean;
  /** Whether this tool requires human approval before invocation */
  requiresApproval: boolean;
  /** Whether evidence from this tool must be redacted */
  redactionRequired: boolean;
  /** Whether evidence generation is required for this tool */
  evidenceRequired: boolean;
}

/**
 * A complete capability manifest for an MCP server.
 *
 * This is the canonical declaration of what an MCP server provides,
 * its risk profile, security constraints, and warm-up requirements.
 *
 * SECURITY: MUST NEVER contain API keys, tokens, handler functions,
 * or absolute private paths as allowed paths. No global paths.
 * `defaultEnabled` for risky servers MUST be false.
 * `requiresHumanApproval` for high/critical risk servers MUST be true.
 */
export interface McpCapabilityManifest {
  /** Unique server identifier (kebab-case ASCII) */
  serverId: string;
  /** Human-readable display name */
  displayName: string;
  /** Hands/eyes classification */
  role: McpRole;
  /** Whether this server is required for Positron operation */
  requiredness: McpRequiredness;
  /** Communication transport */
  transport: McpTransport;
  /** Who maintains/owns the server */
  owner: 'positron' | 'external' | 'unknown';
  /** Launch command (if applicable) — without secrets */
  command?: string;
  /** Launch arguments — without secrets */
  args?: string[];
  /** Policy for environment variables */
  envPolicy: 'none' | 'allowlisted' | 'blocked' | 'unknown';
  /** Whether the server requires authentication */
  authRequired: boolean;
  /** Allowed network domains (empty = no network) */
  allowedDomains: string[];
  /** Allowed filesystem paths (empty = no filesystem) */
  allowedPaths: string[];
  /** Forbidden filesystem paths */
  forbiddenPaths: string[];
  /** Declared tool capabilities */
  tools: McpToolCapability[];
  /** Whether the server is enabled by default */
  defaultEnabled: boolean;
  /** Whether the server requires human approval before any use */
  requiresHumanApproval: boolean;
  /** Maximum time per tool invocation in milliseconds */
  timeoutMs: number;
  /** Optional rate limit description */
  rateLimit?: string;
  /** Logging policy for this server */
  logging: 'none' | 'metadata_only' | 'redacted';
  /** Whether evidence from this server must be redacted */
  redaction: 'required' | 'not_required';
  /** Whether warm-up is required before this server can be used */
  warmupRequired: boolean;
  /** Whether evidence generation is required for this server */
  evidenceRequired: boolean;
}

// ── Warm-up Result & Evidence Model ────────────────────────────────────────

/**
 * Result of a single warm-up phase for an MCP server.
 */
export interface McpWarmupPhaseResult {
  /** The warm-up phase this result applies to */
  phase: McpWarmupPhase;
  /** Status for this phase */
  status: McpWarmupStatus;
  /** Human-readable message about the phase result */
  message: string;
  /** Optional reference to stored evidence */
  evidenceRef?: string;
  /** If blocked, the reason */
  blockedReason?: string;
}

/**
 * Check result for a single forbidden tool during warm-up.
 */
export interface McpForbiddenToolCheck {
  /** Name of the tool being checked */
  toolName: string;
  /** Expected state (what the manifest says should happen) */
  expected: 'absent' | 'forbidden' | 'requires_human_approval';
  /** Actual state (what warm-up observed) */
  actual: 'absent' | 'allowed' | 'forbidden' | 'requires_human_approval';
  /** Whether this check passed */
  status: 'pass' | 'fail';
}

/**
 * Complete warm-up evidence for a single MCP server.
 *
 * SECURITY: This type may contain tool names and phase metadata
 * but MUST be redacted before sharing externally. Use
 * `redactMcpWarmupEvidenceForEvidence()` to produce a safe version.
 */
export interface McpWarmupEvidence {
  /** Unique evidence identifier */
  evidenceId: string;
  /** Server this evidence applies to */
  serverId: string;
  /** Overall warm-up status */
  status: McpWarmupStatus;
  /** ISO8601 timestamp when warm-up started */
  startedAt: string;
  /** ISO8601 timestamp when warm-up completed */
  completedAt?: string;
  /** Per-phase results */
  phases: McpWarmupPhaseResult[];
  /** Tools discovered during warm-up */
  listedTools: string[];
  /** Forbidden tool check results */
  forbiddenToolChecks: McpForbiddenToolCheck[];
  /** Whether redaction was applied to this evidence */
  redactionApplied: boolean;
  /** Whether secrets were detected during warm-up */
  secretsDetected: boolean;
  /** Whether private paths were detected during warm-up */
  privatePathsDetected: boolean;
  /** Whether real runs are allowed based on this evidence */
  realRunAllowed: boolean;
  /** Reasons why this server is blocked (if applicable) */
  blockedReasons: string[];
}

/**
 * Redacted version of MCP warm-up evidence for external sharing.
 * Excludes raw tool names (counts only), private paths, secrets.
 */
export interface RedactedMcpWarmupEvidence {
  /** Unique evidence identifier */
  evidenceId: string;
  /** Server this evidence applies to */
  serverId: string;
  /** Overall warm-up status */
  status: McpWarmupStatus;
  /** Per-phase results (messages are preserved, paths redacted) */
  phases: McpWarmupPhaseResult[];
  /** Count of tools discovered (raw names excluded) */
  listedToolsCount: number;
  /** Forbidden tool check results (tool names preserved — they are declarative) */
  forbiddenToolChecks: McpForbiddenToolCheck[];
  /** Whether redaction was applied */
  redactionApplied: boolean;
  /** Whether secrets were detected */
  secretsDetected: boolean;
  /** Whether private paths were detected */
  privatePathsDetected: boolean;
  /** Whether real runs are allowed */
  realRunAllowed: boolean;
  /** Blocked reasons (redacted — no paths/secrets) */
  blockedReasons: string[];
}

/**
 * Summary of warm-up status across multiple MCP servers.
 */
export interface McpWarmupSummary {
  /** Number of required MCP servers */
  totalRequired: number;
  /** Number of optional MCP servers */
  totalOptional: number;
  /** Servers with warm-up status "pass" */
  pass: number;
  /** Servers with warm-up status "partial" */
  partial: number;
  /** Servers with warm-up status "fail" */
  fail: number;
  /** Servers with warm-up status "blocked" */
  blocked: number;
  /** Servers with warm-up status "unknown" or "pending" */
  unknown: number;
  /** Whether all required MCP servers are ready */
  requiredReady: boolean;
  /** Whether real runs are allowed based on warm-up evidence */
  realRunAllowed: boolean;
  /** Reasons why real runs are blocked */
  blockedReasons: string[];
}

// ── Required MCP Server Inventory ──────────────────────────────────────────

/**
 * Required MCP server manifests for Positron operation.
 *
 * These 12 servers represent the minimum set of MCP capabilities
 * needed for safe, evidence-gated operation. Each server is typed
 * with its role, risk profile, tool capabilities, and security constraints.
 *
 * SECURITY: No API keys, no handler functions, no absolute private paths.
 * Destructive capabilities are gated behind human approval.
 * `defaultEnabled` is false for all risky servers.
 */
export const REQUIRED_MCP_SERVER_MANIFESTS: McpCapabilityManifest[] = [
  // 1. OpenCode Provider
  {
    serverId: 'opencode-provider',
    displayName: 'OpenCode Provider MCP',
    role: 'hand',
    requiredness: 'required',
    transport: 'adapter',
    owner: 'positron',
    envPolicy: 'allowlisted',
    authRequired: false,
    allowedDomains: [],
    allowedPaths: [],
    forbiddenPaths: ['~/.config', '~/.ssh', '/etc'],
    defaultEnabled: false,
    requiresHumanApproval: true,
    timeoutMs: 120000,
    logging: 'redacted',
    redaction: 'required',
    warmupRequired: true,
    evidenceRequired: true,
    tools: [
      {
        toolName: 'opencode.slash_command',
        description: 'Execute a slash command via OpenCode',
        handOrEye: 'hand',
        riskLevel: 'high',
        capabilityKinds: ['provider', 'shell', 'write'],
        permission: 'requires_human_approval',
        allowedByDefault: false,
        allowedInDemo: false,
        allowedInReal: true,
        requiresApproval: true,
        redactionRequired: true,
        evidenceRequired: true,
      },
      {
        toolName: 'opencode.implement',
        description: 'Run implementation phase via OpenCode',
        handOrEye: 'hand',
        riskLevel: 'high',
        capabilityKinds: ['provider', 'write', 'git', 'shell'],
        permission: 'requires_human_approval',
        allowedByDefault: false,
        allowedInDemo: false,
        allowedInReal: true,
        requiresApproval: true,
        redactionRequired: true,
        evidenceRequired: true,
      },
      {
        toolName: 'opencode.health_check',
        description: 'Check OpenCode installation health',
        handOrEye: 'eye',
        riskLevel: 'low',
        capabilityKinds: ['read', 'provider'],
        permission: 'allowed',
        allowedByDefault: true,
        allowedInDemo: true,
        allowedInReal: true,
        requiresApproval: false,
        redactionRequired: false,
        evidenceRequired: true,
      },
    ],
  },

  // 2. Filesystem Workspace
  {
    serverId: 'filesystem-workspace',
    displayName: 'Filesystem Workspace MCP',
    role: 'hand_and_eye',
    requiredness: 'required',
    transport: 'stdio',
    owner: 'positron',
    envPolicy: 'allowlisted',
    authRequired: false,
    allowedDomains: [],
    allowedPaths: ['<workspace>'],
    forbiddenPaths: ['.env', '~/.ssh', '~/.config', '/', '/etc', '/home', '/Users'],
    defaultEnabled: false,
    requiresHumanApproval: true,
    timeoutMs: 30000,
    logging: 'redacted',
    redaction: 'required',
    warmupRequired: true,
    evidenceRequired: true,
    tools: [
      {
        toolName: 'filesystem.read_file',
        description: 'Read a file within the workspace',
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
      },
      {
        toolName: 'filesystem.write_file',
        description: 'Write to a file within the workspace',
        handOrEye: 'hand',
        riskLevel: 'medium',
        capabilityKinds: ['write'],
        permission: 'requires_human_approval',
        allowedByDefault: false,
        allowedInDemo: true,
        allowedInReal: true,
        requiresApproval: true,
        redactionRequired: false,
        evidenceRequired: true,
      },
      {
        toolName: 'filesystem.list_directory',
        description: 'List files in a directory within the workspace',
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
      },
      {
        toolName: 'filesystem.delete_file',
        description: 'Delete a file within the workspace',
        handOrEye: 'hand',
        riskLevel: 'high',
        capabilityKinds: ['write', 'destructive'],
        permission: 'requires_human_approval',
        allowedByDefault: false,
        allowedInDemo: false,
        allowedInReal: true,
        requiresApproval: true,
        redactionRequired: false,
        evidenceRequired: true,
      },
    ],
  },

  // 3. Git Workspace
  {
    serverId: 'git-workspace',
    displayName: 'Git Workspace MCP',
    role: 'hand_and_eye',
    requiredness: 'required',
    transport: 'stdio',
    owner: 'positron',
    envPolicy: 'allowlisted',
    authRequired: false,
    allowedDomains: [],
    allowedPaths: ['<workspace>'],
    forbiddenPaths: ['~/.ssh', '~/.gitconfig', '/'],
    defaultEnabled: false,
    requiresHumanApproval: true,
    timeoutMs: 60000,
    logging: 'redacted',
    redaction: 'required',
    warmupRequired: true,
    evidenceRequired: true,
    tools: [
      {
        toolName: 'git.status',
        description: 'Show working tree status',
        handOrEye: 'eye',
        riskLevel: 'low',
        capabilityKinds: ['read', 'git'],
        permission: 'allowed',
        allowedByDefault: true,
        allowedInDemo: true,
        allowedInReal: true,
        requiresApproval: false,
        redactionRequired: false,
        evidenceRequired: false,
      },
      {
        toolName: 'git.diff',
        description: 'Show changes in working tree',
        handOrEye: 'eye',
        riskLevel: 'low',
        capabilityKinds: ['read', 'git'],
        permission: 'allowed',
        allowedByDefault: true,
        allowedInDemo: true,
        allowedInReal: true,
        requiresApproval: false,
        redactionRequired: false,
        evidenceRequired: false,
      },
      {
        toolName: 'git.commit',
        description: 'Create a commit (gated by commit policy)',
        handOrEye: 'hand',
        riskLevel: 'medium',
        capabilityKinds: ['write', 'git'],
        permission: 'requires_human_approval',
        allowedByDefault: false,
        allowedInDemo: false,
        allowedInReal: true,
        requiresApproval: true,
        redactionRequired: false,
        evidenceRequired: true,
      },
      {
        toolName: 'git.push',
        description: 'Push to remote (forbidden by default)',
        handOrEye: 'hand',
        riskLevel: 'critical',
        capabilityKinds: ['write', 'git', 'network'],
        permission: 'forbidden',
        allowedByDefault: false,
        allowedInDemo: false,
        allowedInReal: false,
        requiresApproval: true,
        redactionRequired: false,
        evidenceRequired: true,
      },
      {
        toolName: 'git.branch',
        description: 'Create or switch branches',
        handOrEye: 'hand',
        riskLevel: 'medium',
        capabilityKinds: ['write', 'git'],
        permission: 'allowed',
        allowedByDefault: true,
        allowedInDemo: true,
        allowedInReal: true,
        requiresApproval: false,
        redactionRequired: false,
        evidenceRequired: false,
      },
    ],
  },

  // 4. GitHub Source of Truth
  {
    serverId: 'github-source-of-truth',
    displayName: 'GitHub Source of Truth MCP',
    role: 'hand_and_eye',
    requiredness: 'required',
    transport: 'http',
    owner: 'positron',
    envPolicy: 'allowlisted',
    authRequired: true,
    allowedDomains: ['api.github.com'],
    allowedPaths: [],
    forbiddenPaths: [],
    defaultEnabled: false,
    requiresHumanApproval: true,
    timeoutMs: 30000,
    logging: 'redacted',
    redaction: 'required',
    warmupRequired: true,
    evidenceRequired: true,
    tools: [
      {
        toolName: 'github.read_issue',
        description: 'Read a GitHub issue',
        handOrEye: 'eye',
        riskLevel: 'low',
        capabilityKinds: ['read', 'github'],
        permission: 'allowed',
        allowedByDefault: true,
        allowedInDemo: true,
        allowedInReal: true,
        requiresApproval: false,
        redactionRequired: false,
        evidenceRequired: false,
      },
      {
        toolName: 'github.read_pr',
        description: 'Read a GitHub pull request',
        handOrEye: 'eye',
        riskLevel: 'low',
        capabilityKinds: ['read', 'github'],
        permission: 'allowed',
        allowedByDefault: true,
        allowedInDemo: true,
        allowedInReal: true,
        requiresApproval: false,
        redactionRequired: false,
        evidenceRequired: false,
      },
      {
        toolName: 'github.write_comment',
        description: 'Post a comment on an issue or PR (gated)',
        handOrEye: 'hand',
        riskLevel: 'medium',
        capabilityKinds: ['write', 'github'],
        permission: 'requires_human_approval',
        allowedByDefault: false,
        allowedInDemo: false,
        allowedInReal: true,
        requiresApproval: true,
        redactionRequired: false,
        evidenceRequired: true,
      },
      {
        toolName: 'github.merge',
        description: 'Merge a pull request (forbidden by default)',
        handOrEye: 'hand',
        riskLevel: 'critical',
        capabilityKinds: ['write', 'github', 'destructive'],
        permission: 'forbidden',
        allowedByDefault: false,
        allowedInDemo: false,
        allowedInReal: false,
        requiresApproval: true,
        redactionRequired: false,
        evidenceRequired: true,
      },
      {
        toolName: 'github.create_pr',
        description: 'Create a pull request',
        handOrEye: 'hand',
        riskLevel: 'medium',
        capabilityKinds: ['write', 'github'],
        permission: 'requires_human_approval',
        allowedByDefault: false,
        allowedInDemo: false,
        allowedInReal: true,
        requiresApproval: true,
        redactionRequired: false,
        evidenceRequired: true,
      },
    ],
  },

  // 5. Browser DevTools Evidence
  {
    serverId: 'browser-devtools-evidence',
    displayName: 'Browser DevTools Evidence MCP',
    role: 'eye',
    requiredness: 'required',
    transport: 'stdio',
    owner: 'positron',
    envPolicy: 'allowlisted',
    authRequired: false,
    allowedDomains: ['localhost', '127.0.0.1'],
    allowedPaths: [],
    forbiddenPaths: ['~/.config', '~/.ssh', '/etc'],
    defaultEnabled: false,
    requiresHumanApproval: true,
    timeoutMs: 60000,
    logging: 'redacted',
    redaction: 'required',
    warmupRequired: true,
    evidenceRequired: true,
    tools: [
      {
        toolName: 'browser.navigate',
        description: 'Navigate to a local URL for evidence capture',
        handOrEye: 'eye',
        riskLevel: 'medium',
        capabilityKinds: ['read', 'browser', 'network'],
        permission: 'allowed',
        allowedByDefault: true,
        allowedInDemo: true,
        allowedInReal: true,
        requiresApproval: false,
        redactionRequired: true,
        evidenceRequired: true,
      },
      {
        toolName: 'browser.screenshot',
        description: 'Take a screenshot for evidence',
        handOrEye: 'eye',
        riskLevel: 'low',
        capabilityKinds: ['read', 'browser'],
        permission: 'allowed',
        allowedByDefault: true,
        allowedInDemo: true,
        allowedInReal: true,
        requiresApproval: false,
        redactionRequired: true,
        evidenceRequired: true,
      },
      {
        toolName: 'browser.fill_form',
        description: 'Fill a form field (no real logins)',
        handOrEye: 'hand',
        riskLevel: 'high',
        capabilityKinds: ['write', 'browser'],
        permission: 'requires_human_approval',
        allowedByDefault: false,
        allowedInDemo: false,
        allowedInReal: true,
        requiresApproval: true,
        redactionRequired: true,
        evidenceRequired: true,
      },
    ],
  },

  // 6. Shell Sandbox
  {
    serverId: 'shell-sandbox',
    displayName: 'Shell Sandbox MCP',
    role: 'hand',
    requiredness: 'required',
    transport: 'stdio',
    owner: 'positron',
    envPolicy: 'allowlisted',
    authRequired: false,
    allowedDomains: [],
    allowedPaths: ['<workspace>'],
    forbiddenPaths: ['/', '/etc', '/home', '/Users', '~', '.env'],
    defaultEnabled: false,
    requiresHumanApproval: true,
    timeoutMs: 30000,
    logging: 'redacted',
    redaction: 'required',
    warmupRequired: true,
    evidenceRequired: true,
    tools: [
      {
        toolName: 'shell.exec',
        description: 'Execute an allowlisted shell command',
        handOrEye: 'hand',
        riskLevel: 'high',
        capabilityKinds: ['shell', 'write'],
        permission: 'requires_human_approval',
        allowedByDefault: false,
        allowedInDemo: true,
        allowedInReal: true,
        requiresApproval: true,
        redactionRequired: true,
        evidenceRequired: true,
      },
      {
        toolName: 'shell.test',
        description: 'Run a test command',
        handOrEye: 'hand',
        riskLevel: 'medium',
        capabilityKinds: ['shell', 'testing'],
        permission: 'allowed',
        allowedByDefault: true,
        allowedInDemo: true,
        allowedInReal: true,
        requiresApproval: false,
        redactionRequired: false,
        evidenceRequired: true,
      },
      {
        toolName: 'shell.build',
        description: 'Run a build command',
        handOrEye: 'hand',
        riskLevel: 'medium',
        capabilityKinds: ['shell', 'write'],
        permission: 'allowed',
        allowedByDefault: true,
        allowedInDemo: true,
        allowedInReal: true,
        requiresApproval: false,
        redactionRequired: false,
        evidenceRequired: true,
      },
    ],
  },

  // 7. SpecKit Adapter
  {
    serverId: 'speckit-adapter',
    displayName: 'SpecKit Adapter MCP',
    role: 'hand',
    requiredness: 'required',
    transport: 'adapter',
    owner: 'positron',
    envPolicy: 'allowlisted',
    authRequired: false,
    allowedDomains: [],
    allowedPaths: ['<workspace>'],
    forbiddenPaths: ['~/.config', '/etc'],
    defaultEnabled: false,
    requiresHumanApproval: true,
    timeoutMs: 120000,
    logging: 'redacted',
    redaction: 'required',
    warmupRequired: true,
    evidenceRequired: true,
    tools: [
      {
        toolName: 'speckit.specify',
        description: 'Generate a specification document',
        handOrEye: 'hand',
        riskLevel: 'medium',
        capabilityKinds: ['write', 'shell'],
        permission: 'allowed',
        allowedByDefault: true,
        allowedInDemo: true,
        allowedInReal: true,
        requiresApproval: false,
        redactionRequired: false,
        evidenceRequired: true,
      },
      {
        toolName: 'speckit.plan',
        description: 'Generate an implementation plan',
        handOrEye: 'hand',
        riskLevel: 'medium',
        capabilityKinds: ['write', 'shell'],
        permission: 'allowed',
        allowedByDefault: true,
        allowedInDemo: true,
        allowedInReal: true,
        requiresApproval: false,
        redactionRequired: false,
        evidenceRequired: true,
      },
      {
        toolName: 'speckit.tasks',
        description: 'Generate task breakdown',
        handOrEye: 'hand',
        riskLevel: 'medium',
        capabilityKinds: ['write', 'shell'],
        permission: 'allowed',
        allowedByDefault: true,
        allowedInDemo: true,
        allowedInReal: true,
        requiresApproval: false,
        redactionRequired: false,
        evidenceRequired: true,
      },
      {
        toolName: 'speckit.implement',
        description: 'Run implementation phase via Spec Kit',
        handOrEye: 'hand',
        riskLevel: 'high',
        capabilityKinds: ['write', 'shell', 'git', 'provider'],
        permission: 'requires_human_approval',
        allowedByDefault: false,
        allowedInDemo: false,
        allowedInReal: true,
        requiresApproval: true,
        redactionRequired: true,
        evidenceRequired: true,
      },
    ],
  },

  // 8. SQLite Run-State
  {
    serverId: 'sqlite-run-state',
    displayName: 'SQLite Run-State MCP',
    role: 'hand_and_eye',
    requiredness: 'required',
    transport: 'adapter',
    owner: 'positron',
    envPolicy: 'allowlisted',
    authRequired: false,
    allowedDomains: [],
    allowedPaths: ['<workspace>'],
    forbiddenPaths: ['/etc', '/tmp', '~'],
    defaultEnabled: false,
    requiresHumanApproval: false,
    timeoutMs: 10000,
    logging: 'metadata_only',
    redaction: 'required',
    warmupRequired: true,
    evidenceRequired: true,
    tools: [
      {
        toolName: 'sqlite.query',
        description: 'Execute a read query against the run-state database',
        handOrEye: 'eye',
        riskLevel: 'low',
        capabilityKinds: ['read', 'storage'],
        permission: 'allowed',
        allowedByDefault: true,
        allowedInDemo: true,
        allowedInReal: true,
        requiresApproval: false,
        redactionRequired: true,
        evidenceRequired: true,
      },
      {
        toolName: 'sqlite.insert',
        description: 'Insert a row into the run-state database',
        handOrEye: 'hand',
        riskLevel: 'medium',
        capabilityKinds: ['write', 'storage'],
        permission: 'allowed',
        allowedByDefault: true,
        allowedInDemo: true,
        allowedInReal: true,
        requiresApproval: false,
        redactionRequired: true,
        evidenceRequired: true,
      },
      {
        toolName: 'sqlite.migrate',
        description: 'Run a database migration',
        handOrEye: 'hand',
        riskLevel: 'high',
        capabilityKinds: ['write', 'storage', 'destructive'],
        permission: 'requires_human_approval',
        allowedByDefault: false,
        allowedInDemo: false,
        allowedInReal: true,
        requiresApproval: true,
        redactionRequired: false,
        evidenceRequired: true,
      },
    ],
  },

  // 9. Secret Scanner
  {
    serverId: 'secret-scanner',
    displayName: 'Secret Scanner MCP',
    role: 'eye',
    requiredness: 'required',
    transport: 'stdio',
    owner: 'positron',
    envPolicy: 'allowlisted',
    authRequired: false,
    allowedDomains: [],
    allowedPaths: ['<workspace>'],
    forbiddenPaths: ['~/.ssh', '~/.config', '/etc'],
    defaultEnabled: false,
    requiresHumanApproval: false,
    timeoutMs: 30000,
    logging: 'redacted',
    redaction: 'required',
    warmupRequired: true,
    evidenceRequired: true,
    tools: [
      {
        toolName: 'secret.scan_file',
        description: 'Scan a file for secrets',
        handOrEye: 'eye',
        riskLevel: 'low',
        capabilityKinds: ['read', 'security'],
        permission: 'allowed',
        allowedByDefault: true,
        allowedInDemo: true,
        allowedInReal: true,
        requiresApproval: false,
        redactionRequired: true,
        evidenceRequired: true,
      },
      {
        toolName: 'secret.scan_diff',
        description: 'Scan a git diff for secrets',
        handOrEye: 'eye',
        riskLevel: 'low',
        capabilityKinds: ['read', 'security', 'git'],
        permission: 'allowed',
        allowedByDefault: true,
        allowedInDemo: true,
        allowedInReal: true,
        requiresApproval: false,
        redactionRequired: true,
        evidenceRequired: true,
      },
    ],
  },

  // 10. Test Reporter
  {
    serverId: 'test-reporter',
    displayName: 'Test Reporter MCP',
    role: 'eye',
    requiredness: 'required',
    transport: 'stdio',
    owner: 'positron',
    envPolicy: 'allowlisted',
    authRequired: false,
    allowedDomains: [],
    allowedPaths: ['<workspace>'],
    forbiddenPaths: ['~/.config', '/etc'],
    defaultEnabled: false,
    requiresHumanApproval: false,
    timeoutMs: 30000,
    logging: 'metadata_only',
    redaction: 'not_required',
    warmupRequired: true,
    evidenceRequired: true,
    tools: [
      {
        toolName: 'test.report_results',
        description: 'Report aggregated test results',
        handOrEye: 'eye',
        riskLevel: 'low',
        capabilityKinds: ['read', 'testing'],
        permission: 'allowed',
        allowedByDefault: true,
        allowedInDemo: true,
        allowedInReal: true,
        requiresApproval: false,
        redactionRequired: false,
        evidenceRequired: true,
      },
      {
        toolName: 'test.get_coverage',
        description: 'Report test coverage metrics',
        handOrEye: 'eye',
        riskLevel: 'low',
        capabilityKinds: ['read', 'testing'],
        permission: 'allowed',
        allowedByDefault: true,
        allowedInDemo: true,
        allowedInReal: true,
        requiresApproval: false,
        redactionRequired: false,
        evidenceRequired: true,
      },
    ],
  },

  // 11. Operator Oversight
  {
    serverId: 'operator-oversight',
    displayName: 'Operator Oversight MCP',
    role: 'eye',
    requiredness: 'required',
    transport: 'http',
    owner: 'positron',
    envPolicy: 'allowlisted',
    authRequired: false,
    allowedDomains: [],
    allowedPaths: [],
    forbiddenPaths: [],
    defaultEnabled: false,
    requiresHumanApproval: true,
    timeoutMs: 30000,
    logging: 'redacted',
    redaction: 'required',
    warmupRequired: true,
    evidenceRequired: true,
    tools: [
      {
        toolName: 'oversight.get_questions',
        description: 'List pending oversight questions',
        handOrEye: 'eye',
        riskLevel: 'low',
        capabilityKinds: ['read', 'oversight'],
        permission: 'allowed',
        allowedByDefault: true,
        allowedInDemo: true,
        allowedInReal: true,
        requiresApproval: false,
        redactionRequired: false,
        evidenceRequired: false,
      },
      {
        toolName: 'oversight.get_attention',
        description: 'Get attention queue summary',
        handOrEye: 'eye',
        riskLevel: 'low',
        capabilityKinds: ['read', 'oversight'],
        permission: 'allowed',
        allowedByDefault: true,
        allowedInDemo: true,
        allowedInReal: true,
        requiresApproval: false,
        redactionRequired: false,
        evidenceRequired: false,
      },
      {
        toolName: 'oversight.answer_question',
        description: 'Submit an answer to an oversight question',
        handOrEye: 'hand',
        riskLevel: 'high',
        capabilityKinds: ['write', 'oversight'],
        permission: 'requires_human_approval',
        allowedByDefault: false,
        allowedInDemo: false,
        allowedInReal: true,
        requiresApproval: true,
        redactionRequired: true,
        evidenceRequired: true,
      },
    ],
  },

  // 12. Blueprint Launcher
  {
    serverId: 'blueprint-launcher',
    displayName: 'Blueprint Launcher MCP',
    role: 'hand_and_eye',
    requiredness: 'required',
    transport: 'http',
    owner: 'positron',
    envPolicy: 'allowlisted',
    authRequired: false,
    allowedDomains: [],
    allowedPaths: ['<workspace>'],
    forbiddenPaths: ['~/.config', '/etc'],
    defaultEnabled: false,
    requiresHumanApproval: true,
    timeoutMs: 60000,
    logging: 'redacted',
    redaction: 'required',
    warmupRequired: true,
    evidenceRequired: true,
    tools: [
      {
        toolName: 'blueprint.parse',
        description: 'Parse and validate a blueprint file',
        handOrEye: 'eye',
        riskLevel: 'low',
        capabilityKinds: ['read', 'blueprint'],
        permission: 'allowed',
        allowedByDefault: true,
        allowedInDemo: true,
        allowedInReal: true,
        requiresApproval: false,
        redactionRequired: false,
        evidenceRequired: true,
      },
      {
        toolName: 'blueprint.validate',
        description: 'Validate a blueprint for security issues',
        handOrEye: 'eye',
        riskLevel: 'medium',
        capabilityKinds: ['read', 'blueprint', 'security'],
        permission: 'allowed',
        allowedByDefault: true,
        allowedInDemo: true,
        allowedInReal: true,
        requiresApproval: false,
        redactionRequired: false,
        evidenceRequired: true,
      },
      {
        toolName: 'blueprint.create_run_plan',
        description: 'Create a run plan from a blueprint (no execution)',
        handOrEye: 'hand',
        riskLevel: 'high',
        capabilityKinds: ['write', 'blueprint'],
        permission: 'requires_human_approval',
        allowedByDefault: false,
        allowedInDemo: false,
        allowedInReal: true,
        requiresApproval: true,
        redactionRequired: false,
        evidenceRequired: true,
      },
      {
        toolName: 'blueprint.start_run',
        description: 'Gate-check + create oversight question (NOT tool execution)',
        handOrEye: 'hand',
        riskLevel: 'high',
        capabilityKinds: ['write', 'blueprint', 'oversight'],
        permission: 'requires_human_approval',
        allowedByDefault: false,
        allowedInDemo: false,
        allowedInReal: true,
        requiresApproval: true,
        redactionRequired: false,
        evidenceRequired: true,
      },
    ],
  },
];

// ── Type Guards ────────────────────────────────────────────────────────────

/** Type guard for McpRole */
export function isMcpRole(value: unknown): value is McpRole {
  return typeof value === 'string' && (ALL_MCP_ROLES as readonly string[]).includes(value);
}

/** Type guard for McpRequiredness */
export function isMcpRequiredness(value: unknown): value is McpRequiredness {
  return typeof value === 'string' && (ALL_MCP_REQUIREDNESSES as readonly string[]).includes(value);
}

/** Type guard for McpTransport */
export function isMcpTransport(value: unknown): value is McpTransport {
  return typeof value === 'string' && (ALL_MCP_TRANSPORTS as readonly string[]).includes(value);
}

/** Type guard for McpRiskLevel */
export function isMcpRiskLevel(value: unknown): value is McpRiskLevel {
  return typeof value === 'string' && (ALL_MCP_RISK_LEVELS as readonly string[]).includes(value);
}

/** Type guard for McpWarmupPhase */
export function isMcpWarmupPhase(value: unknown): value is McpWarmupPhase {
  return typeof value === 'string' && (ALL_MCP_WARMUP_PHASES as readonly string[]).includes(value);
}

/** Type guard for McpWarmupStatus */
export function isMcpWarmupStatus(value: unknown): value is McpWarmupStatus {
  return typeof value === 'string' && (ALL_MCP_WARMUP_STATUSES as readonly string[]).includes(value);
}

/** Type guard for McpToolPermission */
export function isMcpToolPermission(value: unknown): value is McpToolPermission {
  return typeof value === 'string' && (ALL_MCP_TOOL_PERMISSIONS as readonly string[]).includes(value);
}

/** Type guard for McpCapabilityKind */
export function isMcpCapabilityKind(value: unknown): value is McpCapabilityKind {
  return typeof value === 'string' && (ALL_MCP_CAPABILITY_KINDS as readonly string[]).includes(value);
}

// ── Manifest & Tool Capability Validation ──────────────────────────────────

/**
 * Validate a McpToolCapability object.
 * Checks required fields, valid enums, and security constraints.
 */
export function isMcpToolCapability(value: unknown): value is McpToolCapability {
  if (typeof value !== 'object' || value === null) return false;
  const t = value as Record<string, unknown>;

  if (typeof t.toolName !== 'string' || t.toolName.length === 0) return false;
  if (typeof t.description !== 'string') return false;
  if (!isMcpRole(t.handOrEye)) return false;
  if (!isMcpRiskLevel(t.riskLevel)) return false;
  if (!Array.isArray(t.capabilityKinds) || !t.capabilityKinds.every(isMcpCapabilityKind)) return false;
  if (!isMcpToolPermission(t.permission)) return false;
  if (typeof t.allowedByDefault !== 'boolean') return false;
  if (typeof t.allowedInDemo !== 'boolean') return false;
  if (typeof t.allowedInReal !== 'boolean') return false;
  if (typeof t.requiresApproval !== 'boolean') return false;
  if (typeof t.redactionRequired !== 'boolean') return false;
  if (typeof t.evidenceRequired !== 'boolean') return false;

  return true;
}

/**
 * Validate a McpCapabilityManifest object.
 * Checks required fields, security constraints, and consistency rules.
 */
export function validateMcpCapabilityManifest(value: unknown): ValidationResult {
  if (typeof value !== 'object' || value === null) {
    return validationFail(['Value is not an object']);
  }
  const m = value as Record<string, unknown>;
  const errors: string[] = [];

  // Required string fields
  if (typeof m.serverId !== 'string' || m.serverId.length === 0) {
    errors.push('Missing or empty serverId');
  }
  if (typeof m.displayName !== 'string' || m.displayName.length === 0) {
    errors.push('Missing or empty displayName');
  }

  // Enum fields
  if (!isMcpRole(m.role)) {
    errors.push(`Invalid role: "${String(m.role)}". Must be one of: ${ALL_MCP_ROLES.join(', ')}`);
  }
  if (!isMcpRequiredness(m.requiredness)) {
    errors.push(`Invalid requiredness: "${String(m.requiredness)}". Must be one of: ${ALL_MCP_REQUIREDNESSES.join(', ')}`);
  }
  if (!isMcpTransport(m.transport)) {
    errors.push(`Invalid transport: "${String(m.transport)}". Must be one of: ${ALL_MCP_TRANSPORTS.join(', ')}`);
  }

  // Owner validation
  if (m.owner !== 'positron' && m.owner !== 'external' && m.owner !== 'unknown') {
    errors.push(`Invalid owner: "${String(m.owner)}". Must be: positron, external, or unknown`);
  }

  // Env policy
  if (m.envPolicy !== 'none' && m.envPolicy !== 'allowlisted' && m.envPolicy !== 'blocked' && m.envPolicy !== 'unknown') {
    errors.push(`Invalid envPolicy: "${String(m.envPolicy)}"`);
  }

  // Arrays
  if (!Array.isArray(m.tools)) {
    errors.push('Missing or invalid tools array');
  } else {
    if (m.tools.length === 0) {
      errors.push('tools array must not be empty');
    }
    for (let i = 0; i < m.tools.length; i++) {
      if (!isMcpToolCapability(m.tools[i])) {
        errors.push(`Invalid tool at index ${i}`);
      }
    }
  }

  if (!Array.isArray(m.allowedDomains)) {
    errors.push('Missing or invalid allowedDomains array');
  }
  if (!Array.isArray(m.allowedPaths)) {
    errors.push('Missing or invalid allowedPaths array');
  }
  if (!Array.isArray(m.forbiddenPaths)) {
    errors.push('Missing or invalid forbiddenPaths array');
  }

  // Booleans
  if (typeof m.authRequired !== 'boolean') {
    errors.push('Missing or invalid authRequired (must be boolean)');
  }
  if (typeof m.defaultEnabled !== 'boolean') {
    errors.push('Missing or invalid defaultEnabled (must be boolean)');
  }
  if (typeof m.requiresHumanApproval !== 'boolean') {
    errors.push('Missing or invalid requiresHumanApproval (must be boolean)');
  }
  if (typeof m.warmupRequired !== 'boolean') {
    errors.push('Missing or invalid warmupRequired (must be boolean)');
  }
  if (typeof m.evidenceRequired !== 'boolean') {
    errors.push('Missing or invalid evidenceRequired (must be boolean)');
  }

  // Timeout
  if (typeof m.timeoutMs !== 'number' || m.timeoutMs <= 0) {
    errors.push('Missing or invalid timeoutMs (must be a positive number)');
  }

  // Logging
  if (m.logging !== 'none' && m.logging !== 'metadata_only' && m.logging !== 'redacted') {
    errors.push(`Invalid logging: "${String(m.logging)}". Must be: none, metadata_only, or redacted`);
  }

  // Redaction
  if (m.redaction !== 'required' && m.redaction !== 'not_required') {
    errors.push(`Invalid redaction: "${String(m.redaction)}". Must be: required or not_required`);
  }

  // Security constraints
  if (m.defaultEnabled === true) {
    // If defaultEnabled is true, check for risky tools
    if (Array.isArray(m.tools)) {
      const riskyTools = (m.tools as McpToolCapability[]).filter(
        t => (t.riskLevel === 'high' || t.riskLevel === 'critical') && t.capabilityKinds.includes('write'),
      );
      if (riskyTools.length > 0) {
        errors.push(
          `defaultEnabled is true but manifest contains ${riskyTools.length} high/critical-risk write tool(s). High-risk servers must not be enabled by default.`,
        );
      }
    }
  }

  // Forbidden path check: "/" must not be absent from forbiddenPaths
  if (Array.isArray(m.allowedPaths)) {
    const allowed = m.allowedPaths as string[];
    if (allowed.includes('/') || allowed.includes('*') || allowed.some((p: string) => p === '~' || p.startsWith('~/'))) {
      errors.push('allowedPaths contains unrestricted access (/, *, or ~). Unrestricted filesystem access is forbidden.');
    }
  }

  // Manifest must not contain secret-like fields
  const secretKeys = ['apiKey', 'token', 'secret', 'password', 'credential', 'key', 'auth'];
  const manifestKeys = Object.keys(m);
  for (const sk of secretKeys) {
    if (manifestKeys.includes(sk)) {
      errors.push(`Manifest contains forbidden secret field: "${sk}". Secrets must never be stored in capability manifests.`);
    }
  }

  // Tool-level checks
  if (Array.isArray(m.tools)) {
    const tools = m.tools as McpToolCapability[];
    for (const tool of tools) {
      // Destructive tools must require approval
      if (tool.capabilityKinds.includes('destructive') && !tool.requiresApproval) {
        errors.push(`Tool "${tool.toolName}" has destructive capability but does not require approval.`);
      }
      // Forbidden tools must not be allowed by default
      if (tool.permission === 'forbidden' && tool.allowedByDefault) {
        errors.push(`Tool "${tool.toolName}" is forbidden but marked allowedByDefault.`);
      }
      // High/critical risk tools must require approval
      if ((tool.riskLevel === 'high' || tool.riskLevel === 'critical') && tool.capabilityKinds.some(
        k => k === 'write' || k === 'destructive' || k === 'shell',
      ) && !tool.requiresApproval) {
        errors.push(`Tool "${tool.toolName}" is high/critical risk with write/shell/destructive capability but does not require approval.`);
      }
    }
  }

  if (errors.length > 0) {
    return validationFail(errors);
  }
  return validationPass();
}

/**
 * Type guard for McpCapabilityManifest using validation.
 */
export function isMcpCapabilityManifest(value: unknown): value is McpCapabilityManifest {
  return validateMcpCapabilityManifest(value).valid;
}

// ── Warm-up Evidence Validation ────────────────────────────────────────────

/**
 * Type guard for McpWarmupPhaseResult.
 */
export function isMcpWarmupPhaseResult(value: unknown): value is McpWarmupPhaseResult {
  if (typeof value !== 'object' || value === null) return false;
  const r = value as Record<string, unknown>;
  if (!isMcpWarmupPhase(r.phase)) return false;
  if (!isMcpWarmupStatus(r.status)) return false;
  if (typeof r.message !== 'string') return false;
  return true;
}

/**
 * Type guard for McpForbiddenToolCheck.
 */
export function isMcpForbiddenToolCheck(value: unknown): value is McpForbiddenToolCheck {
  if (typeof value !== 'object' || value === null) return false;
  const c = value as Record<string, unknown>;
  if (typeof c.toolName !== 'string') return false;
  if (c.expected !== 'absent' && c.expected !== 'forbidden' && c.expected !== 'requires_human_approval') return false;
  if (c.actual !== 'absent' && c.actual !== 'allowed' && c.actual !== 'forbidden' && c.actual !== 'requires_human_approval') return false;
  if (c.status !== 'pass' && c.status !== 'fail') return false;
  return true;
}

/**
 * Type guard for McpWarmupEvidence.
 */
export function isMcpWarmupEvidence(value: unknown): value is McpWarmupEvidence {
  if (typeof value !== 'object' || value === null) return false;
  const e = value as Record<string, unknown>;

  if (typeof e.evidenceId !== 'string' || e.evidenceId.length === 0) return false;
  if (typeof e.serverId !== 'string' || e.serverId.length === 0) return false;
  if (!isMcpWarmupStatus(e.status)) return false;
  if (typeof e.startedAt !== 'string') return false;
  if (!Array.isArray(e.phases) || !e.phases.every(isMcpWarmupPhaseResult)) return false;
  if (!Array.isArray(e.listedTools) || !e.listedTools.every(t => typeof t === 'string')) return false;
  if (!Array.isArray(e.forbiddenToolChecks) || !e.forbiddenToolChecks.every(isMcpForbiddenToolCheck)) return false;
  if (typeof e.redactionApplied !== 'boolean') return false;
  if (typeof e.secretsDetected !== 'boolean') return false;
  if (typeof e.privatePathsDetected !== 'boolean') return false;
  if (typeof e.realRunAllowed !== 'boolean') return false;
  if (!Array.isArray(e.blockedReasons) || !e.blockedReasons.every(r => typeof r === 'string')) return false;

  return true;
}

/**
 * Validate McpWarmupEvidence for internal consistency.
 *
 * Checks:
 * - Status consistency (pass can't coexist with secrets/paths/redaction failures)
 * - Phase completeness
 * - Forbidden tool check consistency
 */
export function validateMcpWarmupEvidence(value: unknown): ValidationResult {
  if (typeof value !== 'object' || value === null) {
    return validationFail(['Value is not an object']);
  }
  if (!isMcpWarmupEvidence(value)) {
    return validationFail(['Value does not match McpWarmupEvidence structure']);
  }

  const e = value as McpWarmupEvidence;
  const errors: string[] = [];

  // Status consistency
  if (e.status === 'pass') {
    if (e.secretsDetected) {
      errors.push('Status is "pass" but secretsDetected is true. Secrets detection must block pass status.');
    }
    if (e.privatePathsDetected) {
      errors.push('Status is "pass" but privatePathsDetected is true. Private path detection must block pass status.');
    }
    if (!e.redactionApplied) {
      errors.push('Status is "pass" but redactionApplied is false. Redaction must be applied for pass status.');
    }
    if (e.blockedReasons.length > 0) {
      errors.push('Status is "pass" but blockedReasons is non-empty. Pass status must not have blocked reasons.');
    }

    // Check that no phase has failed
    const failedPhases = e.phases.filter(p => p.status === 'fail');
    if (failedPhases.length > 0) {
      errors.push(
        `Status is "pass" but ${failedPhases.length} phase(s) have status "fail": ${failedPhases.map(p => p.phase).join(', ')}`,
      );
    }
  }

  // Check that phases are not empty
  if (e.phases.length === 0) {
    errors.push('Phases array must not be empty.');
  }

  // Forbidden tool checks: if any fail, status should not be pass
  const failedForbidden = e.forbiddenToolChecks.filter(c => c.status === 'fail');
  if (failedForbidden.length > 0 && e.status === 'pass') {
    errors.push(
      `Status is "pass" but ${failedForbidden.length} forbidden tool check(s) failed: ${failedForbidden.map(c => c.toolName).join(', ')}`,
    );
  }

  if (errors.length > 0) {
    return validationFail(errors);
  }
  return validationPass();
}

// ── Required MCP Inventory Helpers ─────────────────────────────────────────

/**
 * Get only the required MCP manifests from a list of manifests.
 */
export function getRequiredMcpManifests(manifests: McpCapabilityManifest[]): McpCapabilityManifest[] {
  return manifests.filter(m => m.requiredness === 'required');
}

/**
 * Check if a manifest has any forbidden tools that are allowed by default.
 * This is a safety violation — forbidden tools must NEVER be allowed by default.
 */
export function hasForbiddenDefaultAllowedTools(manifest: McpCapabilityManifest): boolean {
  return manifest.tools.some(t => t.permission === 'forbidden' && t.allowedByDefault);
}

/**
 * Check if a manifest requires human approval before use.
 * High and critical-risk servers always require approval.
 */
export function requiresHumanApprovalForManifest(manifest: McpCapabilityManifest): boolean {
  if (manifest.requiresHumanApproval) return true;

  // Check if any tool requires approval
  if (manifest.tools.some(t => t.requiresApproval)) return true;

  // Check for high/critical risk tools with write/destructive capability
  const hasHighRiskWriteTools = manifest.tools.some(
    t => (t.riskLevel === 'high' || t.riskLevel === 'critical') &&
    t.capabilityKinds.some(k => k === 'write' || k === 'destructive' || k === 'shell'),
  );

  return hasHighRiskWriteTools;
}

// ── Warm-up Evidence Policy ────────────────────────────────────────────────

/**
 * Check if an MCP warm-up evidence is in a fully passing state.
 */
export function isMcpWarmupPass(evidence: McpWarmupEvidence): boolean {
  return evidence.status === 'pass'
    && !evidence.secretsDetected
    && !evidence.privatePathsDetected
    && evidence.redactionApplied
    && evidence.blockedReasons.length === 0
    && evidence.realRunAllowed;
}

/**
 * Check if an MCP server can be used for demo runs based on warm-up evidence.
 * Demo runs allow "partial" status but must not have secrets, private paths,
 * or forbidden tool check failures. Critical-risk servers cannot run in demo.
 */
export function canUseMcpServerForDemo(
  manifest: McpCapabilityManifest,
  evidence: McpWarmupEvidence,
): boolean {
  // Must have evidence
  if (evidence.serverId !== manifest.serverId) return false;

  // Secrets and private paths always block
  if (evidence.secretsDetected || evidence.privatePathsDetected) return false;

  // Forbidden tool check failures always block
  if (evidence.forbiddenToolChecks.some(c => c.status === 'fail')) return false;

  // Pass or partial status is OK for demo
  if (evidence.status !== 'pass' && evidence.status !== 'partial') return false;

  // Check if any tool has critical risk
  const hasCriticalTools = manifest.tools.some(t => t.riskLevel === 'critical');
  if (hasCriticalTools) return false;

  return true;
}

/**
 * Check if an MCP server can be used for real/production runs.
 * Requires full pass status with all checks green.
 */
export function canUseMcpServerForRealRun(
  manifest: McpCapabilityManifest,
  evidence: McpWarmupEvidence,
): boolean {
  // Must have evidence matching the manifest
  if (evidence.serverId !== manifest.serverId) return false;

  // Full warm-up pass required
  if (!isMcpWarmupPass(evidence)) return false;

  // Evidence must explicitly allow real runs
  if (!evidence.realRunAllowed) return false;

  // Check that no tool has forbidden permission
  if (manifest.tools.some(t => t.permission === 'forbidden' && t.allowedInReal)) {
    return false;
  }

  return true;
}

/**
 * Summarize warm-up evidence across multiple MCP servers.
 */
export function summarizeMcpWarmupEvidence(
  manifests: McpCapabilityManifest[],
  evidence: McpWarmupEvidence[],
): McpWarmupSummary {
  const evidenceByServer = new Map(evidence.map(e => [e.serverId, e]));
  const requiredManifests = manifests.filter(m => m.requiredness === 'required');
  const optionalManifests = manifests.filter(m => m.requiredness === 'optional');

  const summary: McpWarmupSummary = {
    totalRequired: requiredManifests.length,
    totalOptional: optionalManifests.length,
    pass: 0,
    partial: 0,
    fail: 0,
    blocked: 0,
    unknown: 0,
    requiredReady: true,
    realRunAllowed: true,
    blockedReasons: [],
  };

  for (const manifest of manifests) {
    const ev = evidenceByServer.get(manifest.serverId);
    if (!ev) {
      summary.unknown++;
      if (manifest.requiredness === 'required') {
        summary.requiredReady = false;
        summary.realRunAllowed = false;
        summary.blockedReasons.push(`Required MCP "${manifest.serverId}" has no warm-up evidence.`);
      }
      continue;
    }

    switch (ev.status) {
      case 'pass':
        summary.pass++;
        break;
      case 'partial':
        summary.partial++;
        if (manifest.requiredness === 'required') {
          summary.requiredReady = false;
          summary.realRunAllowed = false;
          summary.blockedReasons.push(`Required MCP "${manifest.serverId}" warm-up status is "partial".`);
        }
        break;
      case 'fail':
        summary.fail++;
        if (manifest.requiredness === 'required') {
          summary.requiredReady = false;
          summary.realRunAllowed = false;
          summary.blockedReasons.push(`Required MCP "${manifest.serverId}" warm-up status is "fail".`);
        }
        break;
      case 'blocked':
        summary.blocked++;
        if (manifest.requiredness === 'required') {
          summary.requiredReady = false;
          summary.realRunAllowed = false;
          summary.blockedReasons.push(`Required MCP "${manifest.serverId}" warm-up status is "blocked".`);
        }
        break;
      default:
        summary.unknown++;
        if (manifest.requiredness === 'required') {
          summary.requiredReady = false;
          summary.realRunAllowed = false;
          summary.blockedReasons.push(`Required MCP "${manifest.serverId}" warm-up status is "${ev.status}".`);
        }
    }

    // Additional evidence-level checks for real runs
    if (ev.secretsDetected) {
      summary.realRunAllowed = false;
      summary.blockedReasons.push(`MCP "${manifest.serverId}" warm-up detected secrets.`);
    }
    if (ev.privatePathsDetected) {
      summary.realRunAllowed = false;
      summary.blockedReasons.push(`MCP "${manifest.serverId}" warm-up detected private paths.`);
    }
    if (!ev.redactionApplied) {
      summary.realRunAllowed = false;
      summary.blockedReasons.push(`MCP "${manifest.serverId}" warm-up evidence not redacted.`);
    }
    if (ev.forbiddenToolChecks.some(c => c.status === 'fail')) {
      summary.realRunAllowed = false;
      summary.blockedReasons.push(`MCP "${manifest.serverId}" has forbidden tool check failures.`);
    }
    if (!ev.realRunAllowed) {
      summary.realRunAllowed = false;
      summary.blockedReasons.push(`MCP "${manifest.serverId}" evidence explicitly blocks real runs.`);
    }
  }

  return summary;
}

/**
 * Check if all required MCP servers are ready for real runs.
 * Requires: all required manifests have PASS warm-up evidence,
 * no secrets, no private paths, redaction applied, no forbidden tool failures.
 */
export function areRequiredMcpsReadyForRealRun(
  manifests: McpCapabilityManifest[],
  evidence: McpWarmupEvidence[],
): boolean {
  const evidenceByServer = new Map(evidence.map(e => [e.serverId, e]));
  const requiredManifests = manifests.filter(m => m.requiredness === 'required');

  if (requiredManifests.length === 0) return false;

  for (const manifest of requiredManifests) {
    const ev = evidenceByServer.get(manifest.serverId);
    if (!ev) return false;
    if (!canUseMcpServerForRealRun(manifest, ev)) return false;
  }

  return true;
}

/**
 * Get all reasons why real runs are blocked based on MCP warm-up evidence.
 * Returns empty array if real runs are allowed.
 */
export function getMcpRealRunBlockedReasons(
  manifests: McpCapabilityManifest[],
  evidence: McpWarmupEvidence[],
): string[] {
  const summary = summarizeMcpWarmupEvidence(manifests, evidence);
  return summary.blockedReasons;
}

// ── Evidence Redaction ─────────────────────────────────────────────────────

/**
 * Redact MCP warm-up evidence for external sharing.
 *
 * Removes:
 * - Raw listed tools (count only)
 * - Private paths
 * - Secrets
 *
 * Preserves:
 * - Status metadata
 * - Phase results (messages are safe)
 * - Forbidden tool checks
 * - Blocked reasons (without paths/secrets)
 */
export function redactMcpWarmupEvidenceForEvidence(
  evidence: McpWarmupEvidence,
): RedactedMcpWarmupEvidence {
  // Redact blocked reasons to remove any path-like or secret-like content
  const redactedReasons = evidence.blockedReasons.map(reason => {
    // Remove common path patterns
    let redacted = reason
      .replace(/(?:\/[\w.-]+)+/g, '[path]')
      .replace(/~(\/[\w.-]+)?/g, '[home-path]')
      .replace(/[A-Za-z]:\\[\w.\\-]+/g, '[win-path]');
    // Remove common secret patterns
    redacted = redacted
      .replace(/ghp_[a-zA-Z0-9]{36}/g, '[secret-redacted]')
      .replace(/github_pat_[a-zA-Z0-9_]{22,}/g, '[secret-redacted]')
      .replace(/sk-[a-zA-Z0-9]{32,}/g, '[secret-redacted]')
      .replace(/AIza[a-zA-Z0-9_-]{35}/g, '[secret-redacted]')
      .replace(/anthropic_[a-zA-Z0-9_-]{20,}/g, '[secret-redacted]');
    return redacted;
  });

  return {
    evidenceId: evidence.evidenceId,
    serverId: evidence.serverId,
    status: evidence.status,
    phases: evidence.phases.map(p => ({ ...p })), // Shallow copy — messages are preserved
    listedToolsCount: evidence.listedTools.length,
    forbiddenToolChecks: evidence.forbiddenToolChecks.map(c => ({ ...c })),
    redactionApplied: true, // Always true after redaction
    secretsDetected: evidence.secretsDetected,
    privatePathsDetected: evidence.privatePathsDetected,
    realRunAllowed: evidence.realRunAllowed,
    blockedReasons: redactedReasons,
  };
}
