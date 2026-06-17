// Positron — Zentrale Typdefinitionen

/** Phasen der Positron-Run-State-Machine (kanonische 28 Werte) */
export type Phase =
  | 'QUEUED'
  | 'CLAIMED'
  | 'REPO_SYNC'
  | 'ISSUE_CONTEXT'
  | 'WEB_RESEARCH'
  | 'SPECIFY'
  | 'CLARIFY_OPTIONAL'
  | 'PLAN'
  | 'TASKS'
  | 'ANALYZE'
  | 'REVIEW'
  | 'IMPLEMENT'
  | 'TEST'
  | 'VERIFY'
  | 'COMMIT'
  | 'PR_CREATE'
  | 'MERGE'
  | 'DONE'
  | 'FAILED'
  | 'FAILED_TRANSIENT'
  | 'FAILED_BLOCKED'
  | 'FAILED_UNSAFE'
  | 'BLOCKED_PUSH'
  | 'BLOCKED_MERGE'
  | 'GATE_APPROVE'
  | 'GATE_REVISE'
  | 'RESUME_PENDING'
  | 'CLEANUP';

/** Terminale Phasen (keine weiteren Übergänge) */
export type TerminalPhase = 'DONE' | 'FAILED' | 'FAILED_BLOCKED' | 'FAILED_UNSAFE' | 'CLEANUP';

/** Fehlerphasen */
export type FailurePhase = 'FAILED_TRANSIENT' | 'FAILED_BLOCKED' | 'FAILED_UNSAFE' | 'FAILED';

/** Status eines Runs (5 Werte — kompatibel mit shared) */
export type RunStatus = 'active' | 'blocked' | 'done' | 'failed' | 'cancelled';

/** Autonomie-Level (0 = Observer, 4 = CI Auto-PR) */
export type AutonomyLevel = 0 | 1 | 2 | 3 | 4;

/** Ereignis-Schwere im Run-Log */
export type EventLevel = 'INFO' | 'WARN' | 'ERROR' | 'GATE' | 'HUMAN';

/** Vordefinierte Positron-Label-Namen */
export type PositronLabel =
  | 'positron:ready'
  | 'positron:running'
  | 'positron:research'
  | 'positron:repo-sync'
  | 'positron:planning'
  | 'positron:implementing'
  | 'positron:testing'
  | 'positron:blocked'
  | 'positron:failed'
  | 'positron:pr-created'
  | 'positron:merged'
  | 'positron:done';

/** Alle Phasen als konstantes Array */
export const ALL_PHASES: readonly Phase[] = [
  'QUEUED',
  'CLAIMED',
  'REPO_SYNC',
  'ISSUE_CONTEXT',
  'WEB_RESEARCH',
  'SPECIFY',
  'CLARIFY_OPTIONAL',
  'PLAN',
  'TASKS',
  'ANALYZE',
  'REVIEW',
  'IMPLEMENT',
  'TEST',
  'VERIFY',
  'COMMIT',
  'PR_CREATE',
  'MERGE',
  'DONE',
  'FAILED',
  'FAILED_TRANSIENT',
  'FAILED_BLOCKED',
  'FAILED_UNSAFE',
  'BLOCKED_PUSH',
  'BLOCKED_MERGE',
  'GATE_APPROVE',
  'GATE_REVISE',
  'RESUME_PENDING',
  'CLEANUP',
] as const;

/** Prüft ob ein String eine gültige Phase ist */
export function isValidPhase(value: string): value is Phase {
  return (ALL_PHASES as readonly string[]).includes(value);
}

/** Prüft ob eine Phase terminal ist */
export function isTerminalPhase(phase: Phase): phase is TerminalPhase {
  return phase === 'DONE' || phase === 'FAILED' || phase === 'FAILED_BLOCKED' || phase === 'FAILED_UNSAFE' || phase === 'CLEANUP';
}

/** Prüft ob eine Phase ein Fehlerzustand ist */
export function isFailurePhase(phase: Phase): phase is FailurePhase {
  return phase === 'FAILED_TRANSIENT' || phase === 'FAILED_BLOCKED' || phase === 'FAILED_UNSAFE' || phase === 'FAILED';
}

/**
 * Runtime-Validator: Wandelt String in Phase um.
 * Wirft Fehler bei ungültigen Werten — verhindert stille `as Phase`-Casts.
 * Verwenden bei DB-Reads, API-Responses und User-Input.
 */
export function parsePhase(value: string): Phase {
  if (isValidPhase(value)) return value;
  throw new Error(`Invalid phase: "${value}". Must be one of: ${ALL_PHASES.join(', ')}`);
}

/** Runtime-Validator für RunStatus */
const ALL_RUN_STATUSES: readonly string[] = ['active', 'blocked', 'done', 'failed', 'cancelled'];
export function parseRunStatus(value: string): RunStatus {
  if ((ALL_RUN_STATUSES as readonly string[]).includes(value)) return value as RunStatus;
  throw new Error(`Invalid run status: "${value}". Must be one of: ${ALL_RUN_STATUSES.join(', ')}`);
}

/** Deutsche Label für jede Phase (Issue #24) */
export const PHASE_LABELS: Record<Phase, string> = {
  QUEUED: 'Warteschlange',
  CLAIMED: 'Übernommen',
  REPO_SYNC: 'Repository-Sync',
  ISSUE_CONTEXT: 'Issue-Kontext',
  WEB_RESEARCH: 'Web-Recherche',
  SPECIFY: 'Anforderungsanalyse',
  CLARIFY_OPTIONAL: 'Klarstellung',
  PLAN: 'Planung',
  TASKS: 'Aufgaben',
  ANALYZE: 'Analyse',
  REVIEW: 'Code-Review',
  IMPLEMENT: 'Implementierung',
  TEST: 'Tests',
  VERIFY: 'Verifikation',
  COMMIT: 'Committen',
  PR_CREATE: 'Pull Request',
  MERGE: 'Zusammenführen',
  DONE: 'Abgeschlossen',
  FAILED: 'Fehlgeschlagen',
  FAILED_TRANSIENT: 'Fehler (wiederholbar)',
  FAILED_BLOCKED: 'Fehler (blockiert)',
  FAILED_UNSAFE: 'Fehler (unsicher)',
  BLOCKED_PUSH: 'Push blockiert',
  BLOCKED_MERGE: 'Merge blockiert',
  GATE_APPROVE: 'Genehmigung erforderlich',
  GATE_REVISE: 'Überarbeitung erforderlich',
  RESUME_PENDING: 'Wiederaufnahme ausstehend',
  CLEANUP: 'Bereinigung',
};

// ── Tool Gateway Metadata Extension (Issue #229) ────────────────────────
// Read-only metadata types for MCP, provider, model, and Spec Kit planning.
// No handler references, no secrets, no runtime execution functions.

/** Classification category for tools registered in the Tool Gateway */
export type ToolCategory =
  | 'provider'
  | 'filesystem'
  | 'git'
  | 'github'
  | 'browser'
  | 'shell'
  | 'spec'
  | 'storage'
  | 'security'
  | 'testing'
  | 'oversight'
  | 'blueprint'
  | 'unknown';

/** All valid tool categories as a const array for runtime validation */
export const ALL_TOOL_CATEGORIES: readonly ToolCategory[] = [
  'provider',
  'filesystem',
  'git',
  'github',
  'browser',
  'shell',
  'spec',
  'storage',
  'security',
  'testing',
  'oversight',
  'blueprint',
  'unknown',
] as const;

/** Warm-up status for MCP servers and model profiles */
export type WarmupStatus =
  | 'not_required'
  | 'unknown'
  | 'pending'
  | 'pass'
  | 'partial'
  | 'fail'
  | 'blocked';

/** Provider installation/configuration status */
export type ProviderStatus =
  | 'not_provider'
  | 'missing'
  | 'installed'
  | 'configured'
  | 'warmup_required'
  | 'ready_for_demo'
  | 'ready_for_real'
  | 'blocked';

/** MCP server status summary for the Tool Gateway status response */
export interface McpServerStatus {
  name: string;
  category: ToolCategory;
  required: boolean;
  warmupStatus: WarmupStatus;
  toolsCount: number;
  connected: boolean;
  lastWarmupAt: string | null;
}

/** Provider status summary for the Tool Gateway status response */
export interface ProviderGatewayStatus {
  opencodeInstalled: boolean;
  opencodeVersion: string | null;
  activeModelProfileId: string | null;
  activeModelRef: string | null;
  modelWarmupStatus: WarmupStatus;
  specKitSynced: boolean;
  readyForRealRuns: boolean;
}

/** Safe JSON.parse — gibt null statt Fehler bei ungültigem JSON */
export function safeJsonParse(s: string | null): Record<string, unknown> | null {
  if (!s) return null;
  try { return JSON.parse(s) as Record<string, unknown>; } catch { return null; }
}

// ── Phase 2 (#243): Tool Permission Matrix ──

/** Aggregated permission view for a single tool (UI/API display). */
export interface ToolPermissionEntry {
  /** Tool ID (e.g. "repo.read_file") */
  toolId: string;
  /** Tool display title */
  title: string;
  /** Risk classification: read | write | network | secret_sensitive | destructive */
  riskLevel: string;
  /** Whether human approval is required before execution */
  requiresApproval: boolean;
  /** Approval mode: none | ask | human_required */
  approvalMode: string;
  /** Minimum autonomy level (0-4) required */
  minAutonomyLevel: number;
  /** Pipeline phases where this tool is permitted */
  allowedPhases: string[];
  /** Source MCP server or adapter (e.g. "opencode", "github-mcp") */
  sourceAdapter: string | null;
  /** Whether this tool handles secrets */
  secretSensitive: boolean;
  /** Whether an immutable audit log entry is required */
  requiresAuditLog: boolean;
  /** Whether an evidence artifact is produced */
  producesEvidence: boolean;
  /** Whether egress/network access is permitted */
  networkAllowed: boolean;
  /** Allowed hostnames (empty = no network) */
  allowedHosts: string[];
}

/** Complete tool permission matrix for all registered tools. */
export interface ToolPermissionMatrix {
  /** Total number of registered tools */
  totalTools: number;
  /** Tools grouped by risk level */
  byRiskLevel: Record<string, number>;
  /** Tools grouped by source adapter */
  byAdapter: Record<string, number>;
  /** Tools requiring human approval */
  requiringApproval: number;
  /** Tools with default-deny network access */
  networkDenied: number;
  /** Individual tool permission entries */
  tools: ToolPermissionEntry[];
  /** Timestamp of matrix generation */
  generatedAt: string;
}

// ── Phase 3 (#243): Hook/Gate Layer Types ──

/** Predefined gate types for the Positron orchestration layer. */
export type GateType =
  | 'pre_run'        // Before any agent execution begins
  | 'pre_write'      // Before any file write operation
  | 'pre_push'       // Before git push
  | 'pre_pr'         // Before pull request creation
  | 'pre_merge'      // Before merge to main
  | 'evidence_required' // Evidence artifacts must exist
  | 'security'       // Security scan must pass
  | 'human_approval'; // Human operator must approve

/** Result of a single gate evaluation. */
export interface GateResult {
  /** Which gate was evaluated */
  gate: GateType;
  /** Whether the gate passed */
  passed: boolean;
  /** Whether a failure blocks progression */
  blocking: boolean;
  /** Human-readable reason */
  reason: string;
  /** Evidence references if applicable */
  evidence?: string[];
  /** Timestamp of gate evaluation */
  evaluatedAt: string;
}

/** Aggregate result of all gates for a pipeline phase. */
export interface GateLayerResult {
  /** Whether all blocking gates passed */
  allPassed: boolean;
  /** Individual gate results */
  gates: GateResult[];
  /** Number of blocking gates that failed */
  blockingFailures: number;
}

// ── Phase 4 (#243): Trace/Eval Flywheel Types ──

/** Classification of recurring errors for the trace/eval flywheel. */
export type ErrorClass =
  | 'type_error'       // TypeScript type mismatch
  | 'test_failure'     // Test assertion failure
  | 'build_error'      // Compilation failure
  | 'lint_violation'   // Linter/formatting issue
  | 'secret_leakage'   // Secret in output
  | 'scope_violation'  // Agent modified files outside scope
  | 'timeout'          // Execution timeout
  | 'network_error'    // External API/network failure
  | 'permission_denied' // Tool/command blocked by policy
  | 'unknown';         // Unclassified error

/** A single trace entry capturing an agent action. */
export interface AgentTraceEntry {
  /** Run identifier */
  runId: string;
  /** Pipeline phase during which this trace was captured */
  phase: string;
  /** The agent that performed the action */
  agentType: string;
  /** Action performed (e.g. "file_write", "test_run", "git_commit") */
  action: string;
  /** Whether the action succeeded */
  success: boolean;
  /** Error class if action failed */
  errorClass?: ErrorClass;
  /** Duration in milliseconds */
  durationMs: number;
  /** Evidence artifact paths */
  evidencePaths?: string[];
  /** Timestamp */
  timestamp: string;
}

/** Aggregated trace summary for a single run. */
export interface RunTrace {
  /** Unique run ID */
  runId: string;
  /** Total number of trace entries */
  totalActions: number;
  /** Number of successful actions */
  successfulActions: number;
  /** Number of failed actions */
  failedActions: number;
  /** Error classes observed with counts */
  errorClasses: Record<string, number>;
  /** Individual trace entries (most recent first) */
  entries: AgentTraceEntry[];
  /** Total run duration in milliseconds */
  totalDurationMs: number;
}

// ── Phase 5 (#243): Living Evidence Portfolio ──

/** Summary of current orchestrator capabilities for the dashboard. */
export interface LivingEvidencePortfolio {
  /** Current capabilities (what Positron can do) */
  capabilities: string[];
  /** Newly added agent capabilities */
  newCapabilities: string[];
  /** Known limitations */
  knownLimitations: string[];
  /** Latest evidence summary */
  latestEvidence: {
    /** Number of completed runs */
    completedRuns: number;
    /** Number of failed runs */
    failedRuns: number;
    /** Most recent test pass rate */
    testPassRate: number;
    /** Most recent evidence artifact count */
    artifactCount: number;
  };
  /** Open risks */
  openRisks: string[];
  /** Recommended next orchestrator steps */
  nextSteps: string[];
  /** Portfolio generation timestamp */
  generatedAt: string;
}
