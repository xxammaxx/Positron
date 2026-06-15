// Positron — OpenCode Model Profile Types, Defaults, and Validation (Issue #229 PR 2)
// ---------------------------------------------------------------------------
// This module defines the type system, registry, and validation logic for
// OpenCode model profiles. It is PURE TYPE DEFINITIONS AND VALIDATION.
// No runtime execution, no OpenCode binary calls, no MCP server starts,
// no Spec Kit sync, no API keys stored in profiles.
//
// Hard Constraints:
//   - Free models cannot real-run without warm-up level 4 + Human Approval
//   - Chat-only models cannot run coding tasks
//   - API keys are never stored in profiles
//   - Unsafe baseURLs fail validation
//   - Unknown/blocked profiles cannot run

// ── Union Types ────────────────────────────────────────────────────────────

/** Cost classification for a model profile */
export type ModelCostClass =
  | 'free_local'
  | 'free_remote'
  | 'paid'
  | 'unknown';

/** Execution environment classification */
export type ModelExecutionClass =
  | 'local'
  | 'remote'
  | 'hybrid'
  | 'unknown';

/** Agent capability flags for a model */
export type ModelAgentCapability =
  | 'chat_only'
  | 'code_generation'
  | 'tool_calling'
  | 'file_editing'
  | 'test_fixing'
  | 'long_context'
  | 'reasoning'
  | 'vision'
  | 'unknown';

/** Warm-up level (0 = visible only, 4 = production-ready with human approval) */
export type ModelWarmupLevel = 0 | 1 | 2 | 3 | 4;

/** Warm-up status for model profiles (distinct from MCP/tool WarmupStatus) */
export type ModelWarmupStatus =
  | 'unknown'
  | 'pass'
  | 'partial'
  | 'fail'
  | 'blocked';

/** How API keys are stored and managed */
export type ApiKeyStoragePolicy =
  | 'opencode_auth'
  | 'env_reference'
  | 'not_required'
  | 'blocked';

/** Risk classification for a model profile */
export type ModelRiskLevel =
  | 'low'
  | 'medium'
  | 'high';

// ── Constant Arrays ────────────────────────────────────────────────────────

/** All valid model cost classes */
export const ALL_MODEL_COST_CLASSES: readonly ModelCostClass[] = [
  'free_local',
  'free_remote',
  'paid',
  'unknown',
] as const;

/** All valid model execution classes */
export const ALL_MODEL_EXECUTION_CLASSES: readonly ModelExecutionClass[] = [
  'local',
  'remote',
  'hybrid',
  'unknown',
] as const;

/** All valid model agent capabilities */
export const ALL_MODEL_AGENT_CAPABILITIES: readonly ModelAgentCapability[] = [
  'chat_only',
  'code_generation',
  'tool_calling',
  'file_editing',
  'test_fixing',
  'long_context',
  'reasoning',
  'vision',
  'unknown',
] as const;

/** All valid model warm-up statuses */
export const ALL_MODEL_WARMUP_STATUSES: readonly ModelWarmupStatus[] = [
  'unknown',
  'pass',
  'partial',
  'fail',
  'blocked',
] as const;

/** All valid API key storage policies */
export const ALL_API_KEY_STORAGE_POLICIES: readonly ApiKeyStoragePolicy[] = [
  'opencode_auth',
  'env_reference',
  'not_required',
  'blocked',
] as const;

/** All valid model risk levels */
export const ALL_MODEL_RISK_LEVELS: readonly ModelRiskLevel[] = [
  'low',
  'medium',
  'high',
] as const;

// ── Validation Result ──────────────────────────────────────────────────────

/** Structured validation result for profile validation */
export interface ValidationResult {
  /** Whether validation passed */
  valid: boolean;
  /** List of human-readable error messages (empty if valid) */
  errors: string[];
}

/** Create a passing validation result */
export function validationPass(): ValidationResult {
  return { valid: true, errors: [] };
}

/** Create a failing validation result with errors */
export function validationFail(errors: string[]): ValidationResult {
  return { valid: false, errors };
}

// ── OpenCode Model Profile Interface ───────────────────────────────────────

/**
 * An OpenCode model profile describes a specific model/provider combination
 * that Positron can use for coding-agent operations.
 *
 * SECURITY: This interface MUST NEVER contain an `apiKey` field.
 * API keys are managed externally via opencode_auth or env_reference.
 */
export interface OpenCodeModelProfile {
  /** Unique profile identifier (kebab-case) */
  profileId: string;
  /** Human-readable display name */
  displayName: string;
  /** Provider identifier (e.g., "ollama", "lmstudio", "openrouter") */
  providerId: string;
  /** Model identifier (e.g., "gemma3:12b", "qwen2.5:14b") */
  modelId: string;
  /**
   * OpenCode model reference string.
   * Format: "provider/model" (e.g., "ollama/gemma3:12b") or
   * a well-documented placeholder for unconfigured profiles.
   */
  opencodeModelRef: string;
  /** Cost classification */
  costClass: ModelCostClass;
  /** Execution environment */
  executionClass: ModelExecutionClass;
  /** API base URL (must be safe — no embedded secrets) */
  baseURL?: string;
  /** Whether an API key is required for this model */
  requiresApiKey: boolean;
  /** How the API key is stored (must match requiresApiKey) */
  apiKeyStoragePolicy: ApiKeyStoragePolicy;
  /** Whether this profile can be used for demo/testing */
  allowedForDemo: boolean;
  /** Whether this profile can be used for real/production runs */
  allowedForRealRuns: boolean;
  /** Agent capabilities this model supports */
  capabilities: ModelAgentCapability[];
  /** Whether warm-up is required before use */
  requiresWarmup: boolean;
  /** Current warm-up status */
  warmupStatus: ModelWarmupStatus;
  /** Current warm-up level (0-4) */
  warmupLevel: ModelWarmupLevel;
  /** Maximum acceptable risk level */
  maxRiskLevel: ModelRiskLevel;
  /** Human-readable notes about this profile */
  notes: string[];
}

/**
 * Redacted version of OpenCodeModelProfile for evidence/logging.
 * Sensitive fields are omitted or replaced with placeholder values.
 */
export interface RedactedOpenCodeModelProfile {
  profileId: string;
  displayName: string;
  providerId: string;
  modelId: string;
  opencodeModelRef: string;
  costClass: ModelCostClass;
  executionClass: ModelExecutionClass;
  /** baseURL is redacted for non-localhost URLs */
  baseURL: string | null;
  requiresApiKey: boolean;
  /** apiKeyStoragePolicy is included (no key value is ever stored) */
  apiKeyStoragePolicy: ApiKeyStoragePolicy;
  allowedForDemo: boolean;
  allowedForRealRuns: boolean;
  capabilities: ModelAgentCapability[];
  requiresWarmup: boolean;
  warmupStatus: ModelWarmupStatus;
  warmupLevel: ModelWarmupLevel;
  maxRiskLevel: ModelRiskLevel;
  notes: string[];
}

// ── Default Model Profiles ─────────────────────────────────────────────────

/**
 * Default model profiles registered in Positron.
 * These are static type-safe definitions — no runtime initialization needed.
 */

/** Free/local LM Studio profile */
export const PROFILE_FREE_LOCAL_LMSTUDIO: OpenCodeModelProfile = {
  profileId: 'free-local-lmstudio',
  displayName: 'LM Studio (Local)',
  providerId: 'lmstudio',
  modelId: '',
  opencodeModelRef: 'lmstudio/placeholder',
  costClass: 'free_local',
  executionClass: 'local',
  baseURL: 'http://localhost:1234/v1',
  requiresApiKey: false,
  apiKeyStoragePolicy: 'not_required',
  allowedForDemo: true,
  allowedForRealRuns: false,
  capabilities: ['chat_only'],
  requiresWarmup: true,
  warmupStatus: 'unknown',
  warmupLevel: 0,
  maxRiskLevel: 'low',
  notes: [
    'Free local model via LM Studio',
    'Default base URL: http://localhost:1234/v1',
    'Requires local LM Studio installation',
    'No API key required',
  ],
};

/** Free/local Ollama profile */
export const PROFILE_FREE_LOCAL_OLLAMA: OpenCodeModelProfile = {
  profileId: 'free-local-ollama',
  displayName: 'Ollama (Local)',
  providerId: 'ollama',
  modelId: '',
  opencodeModelRef: 'ollama/placeholder',
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
  notes: [
    'Free local model via Ollama',
    'Default base URL: http://localhost:11434/v1',
    'Requires local Ollama installation',
    'No API key required',
  ],
};

/** Free/local vLLM profile */
export const PROFILE_FREE_LOCAL_VLLM: OpenCodeModelProfile = {
  profileId: 'free-local-vllm',
  displayName: 'vLLM (Local)',
  providerId: 'vllm',
  modelId: '',
  opencodeModelRef: 'vllm/placeholder',
  costClass: 'free_local',
  executionClass: 'local',
  baseURL: 'http://localhost:8000/v1',
  requiresApiKey: false,
  apiKeyStoragePolicy: 'not_required',
  allowedForDemo: true,
  allowedForRealRuns: false,
  capabilities: ['chat_only'],
  requiresWarmup: true,
  warmupStatus: 'unknown',
  warmupLevel: 0,
  maxRiskLevel: 'low',
  notes: [
    'Free local model via vLLM',
    'Default base URL: http://localhost:8000/v1',
    'Requires local vLLM installation',
    'No API key required',
  ],
};

/** Free/remote OpenRouter profile */
export const PROFILE_FREE_REMOTE_OPENROUTER: OpenCodeModelProfile = {
  profileId: 'free-remote-openrouter',
  displayName: 'OpenRouter (Free Tier)',
  providerId: 'openrouter',
  modelId: '',
  opencodeModelRef: 'openrouter/placeholder',
  costClass: 'free_remote',
  executionClass: 'remote',
  // No default baseURL for remote — configured at runtime via opencode config
  requiresApiKey: true,
  apiKeyStoragePolicy: 'opencode_auth',
  allowedForDemo: true,
  allowedForRealRuns: false,
  capabilities: ['chat_only'],
  requiresWarmup: true,
  warmupStatus: 'unknown',
  warmupLevel: 0,
  maxRiskLevel: 'medium',
  notes: [
    'Free remote model via OpenRouter free tier',
    'Requires API key (stored via opencode_auth)',
    'Rate limited by OpenRouter',
    'Not suitable for production use',
  ],
};

/** Paid/custom provider profile */
export const PROFILE_PAID_PROVIDER_CUSTOM: OpenCodeModelProfile = {
  profileId: 'paid-provider-custom',
  displayName: 'Custom Provider (Paid)',
  providerId: 'custom',
  modelId: '',
  opencodeModelRef: 'custom/placeholder',
  costClass: 'paid',
  executionClass: 'remote',
  requiresApiKey: true,
  apiKeyStoragePolicy: 'opencode_auth',
  allowedForDemo: false,
  allowedForRealRuns: false,
  capabilities: ['chat_only'],
  requiresWarmup: true,
  warmupStatus: 'unknown',
  warmupLevel: 0,
  maxRiskLevel: 'high',
  notes: [
    'Paid custom provider profile',
    'Must be configured before use',
    'Requires warm-up level 4 + Human Approval for real runs',
    'API key managed via opencode_auth or env_reference',
  ],
};

/** Unknown/blocked provider profile */
export const PROFILE_UNKNOWN_PROVIDER_BLOCKED: OpenCodeModelProfile = {
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
    'Sentinel profile for unknown or unconfigured providers',
    'Always blocked from all runs',
    'Must be explicitly configured to be usable',
  ],
};

/** All default model profiles as a const array */
export const DEFAULT_MODEL_PROFILES: readonly OpenCodeModelProfile[] = [
  PROFILE_FREE_LOCAL_LMSTUDIO,
  PROFILE_FREE_LOCAL_OLLAMA,
  PROFILE_FREE_LOCAL_VLLM,
  PROFILE_FREE_REMOTE_OPENROUTER,
  PROFILE_PAID_PROVIDER_CUSTOM,
  PROFILE_UNKNOWN_PROVIDER_BLOCKED,
] as const;

// ── Type Guard Functions ───────────────────────────────────────────────────

/** Type guard: check if value is a valid ModelCostClass */
export function isModelCostClass(value: unknown): value is ModelCostClass {
  return typeof value === 'string' && (ALL_MODEL_COST_CLASSES as readonly string[]).includes(value);
}

/** Type guard: check if value is a valid ModelExecutionClass */
export function isModelExecutionClass(value: unknown): value is ModelExecutionClass {
  return typeof value === 'string' && (ALL_MODEL_EXECUTION_CLASSES as readonly string[]).includes(value);
}

/** Type guard: check if value is a valid ModelAgentCapability */
export function isModelAgentCapability(value: unknown): value is ModelAgentCapability {
  return typeof value === 'string' && (ALL_MODEL_AGENT_CAPABILITIES as readonly string[]).includes(value);
}

/** Type guard: check if value is a valid ModelWarmupStatus */
export function isModelWarmupStatus(value: unknown): value is ModelWarmupStatus {
  return typeof value === 'string' && (ALL_MODEL_WARMUP_STATUSES as readonly string[]).includes(value);
}

/** Type guard: check if value is a valid ApiKeyStoragePolicy */
export function isApiKeyStoragePolicy(value: unknown): value is ApiKeyStoragePolicy {
  return typeof value === 'string' && (ALL_API_KEY_STORAGE_POLICIES as readonly string[]).includes(value);
}

/** Type guard: check if value is a valid ModelRiskLevel */
export function isModelRiskLevel(value: unknown): value is ModelRiskLevel {
  return typeof value === 'string' && (ALL_MODEL_RISK_LEVELS as readonly string[]).includes(value);
}

// ── Validation Functions ───────────────────────────────────────────────────

/** Pattern for detecting embedded credentials in URLs (user:pass@host) */
const EMBEDDED_CREDENTIALS_PATTERN = /\/\/[^:@/]+:[^@/]+@/;

/** Pattern for detecting query parameter tokens/secrets */
const QUERY_TOKEN_PATTERN = /[?&](token|secret|api_key|apikey|key|auth|password|passwd)=[^&]+/i;

/** Check if a URL has a safe origin (localhost, loopback, or explicit allowlist) */
function hasSafeOrigin(urlString: string): boolean {
  try {
    const url = new URL(urlString);
    // Normalize hostname — some runtimes include brackets for IPv6 addresses
    const hostname = url.hostname.replace(/^\[|\]$/g, '');
    // Always allow localhost and loopback addresses
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

/** Check if a baseURL string contains embedded credentials or tokens */
function hasUrlSecrets(urlString: string): boolean {
  if (EMBEDDED_CREDENTIALS_PATTERN.test(urlString)) {
    return true;
  }
  if (QUERY_TOKEN_PATTERN.test(urlString)) {
    return true;
  }
  return false;
}

/**
 * Validate that a base URL is safe for the given profile.
 * Local profiles MUST use localhost/loopback URLs.
 * All profiles: no embedded credentials, no query tokens.
 */
export function isBaseUrlAllowedForProfile(
  profile: OpenCodeModelProfile,
  baseURL?: string | null,
): ValidationResult {
  const errors: string[] = [];

  // No baseURL is fine — not required to have one set
  if (!baseURL) {
    return validationPass();
  }

  // Reject bare strings (must be valid URLs)
  try {
    new URL(baseURL);
  } catch {
    errors.push(`Invalid baseURL: "${baseURL}" is not a valid URL`);
    return validationFail(errors);
  }

  // Reject URLs with embedded credentials
  if (hasUrlSecrets(baseURL)) {
    errors.push(`baseURL contains embedded credentials or secret tokens: "${baseURL}"`);
    return validationFail(errors);
  }

  // Local profiles MUST use localhost/loopback
  if (profile.executionClass === 'local') {
    if (!hasSafeOrigin(baseURL)) {
      errors.push(
        `Local profile "${profile.profileId}" must use localhost or loopback baseURL. ` +
        `Got: "${baseURL}"`,
      );
      return validationFail(errors);
    }
  }

  // Remote profiles: any valid URL without secrets is acceptable
  return validationPass();
}

/** Reference pattern for opencodeModelRef: "provider/model" or documented placeholder */
const MODEL_REF_PATTERN = /^[a-z][a-z0-9_-]*\/[a-zA-Z0-9_:.+-]+$/;

/** Check if a modelRef looks like a valid provider/model string */
function isValidModelRef(ref: string): boolean {
  // Allow documented placeholders
  if (ref === 'lmstudio/placeholder' || ref === 'ollama/placeholder' ||
      ref === 'vllm/placeholder' || ref === 'openrouter/placeholder' ||
      ref === 'custom/placeholder' || ref === 'unknown/blocked') {
    return true;
  }
  return MODEL_REF_PATTERN.test(ref);
}

/**
 * Type guard: check if a value looks like an OpenCodeModelProfile.
 * Performs structural validation of all required fields.
 */
export function isOpenCodeModelProfile(value: unknown): value is OpenCodeModelProfile {
  if (!value || typeof value !== 'object') return false;

  const p = value as Record<string, unknown>;

  // Required string fields
  if (typeof p.profileId !== 'string') return false;
  if (typeof p.displayName !== 'string') return false;
  if (typeof p.providerId !== 'string') return false;
  if (typeof p.modelId !== 'string') return false;
  if (typeof p.opencodeModelRef !== 'string') return false;

  // Required union type fields
  if (!isModelCostClass(p.costClass)) return false;
  if (!isModelExecutionClass(p.executionClass)) return false;

  // Required boolean fields
  if (typeof p.requiresApiKey !== 'boolean') return false;
  if (typeof p.allowedForDemo !== 'boolean') return false;
  if (typeof p.allowedForRealRuns !== 'boolean') return false;
  if (typeof p.requiresWarmup !== 'boolean') return false;

  // Union type with numeric literal (0-4)
  if (typeof p.warmupLevel !== 'number' || p.warmupLevel < 0 || p.warmupLevel > 4) return false;

  // Required union type fields
  if (!isApiKeyStoragePolicy(p.apiKeyStoragePolicy)) return false;
  if (!isModelWarmupStatus(p.warmupStatus)) return false;
  if (!isModelRiskLevel(p.maxRiskLevel)) return false;

  // Array fields
  if (!Array.isArray(p.capabilities)) return false;
  if (!Array.isArray(p.notes)) return false;

  // Check capabilities elements
  for (const cap of p.capabilities) {
    if (!isModelAgentCapability(cap)) return false;
  }

  // SECURITY: Reject any object that has an apiKey field
  if ('apiKey' in p) return false;

  return true;
}

/**
 * Full validation of an OpenCode model profile.
 * Checks type correctness, business rules, and security constraints.
 */
export function validateOpenCodeModelProfile(value: unknown): ValidationResult {
  const errors: string[] = [];

  if (!value || typeof value !== 'object') {
    return validationFail(['Value is not an object']);
  }

  const p = value as Record<string, unknown>;

  // ── Required string fields ──
  if (!p.profileId || typeof p.profileId !== 'string') {
    errors.push('Missing required field: profileId');
  }
  if (!p.displayName || typeof p.displayName !== 'string') {
    errors.push('Missing required field: displayName');
  }
  if (!p.providerId || typeof p.providerId !== 'string') {
    errors.push('Missing required field: providerId');
  }
  if (p.modelId === undefined || p.modelId === null || typeof p.modelId !== 'string') {
    errors.push('Missing required field: modelId (must be a string; empty string is valid for unconfigured profiles)');
  }
  if (!p.opencodeModelRef || typeof p.opencodeModelRef !== 'string') {
    errors.push('Missing required field: opencodeModelRef');
  } else if (!isValidModelRef(p.opencodeModelRef)) {
    errors.push(
      `Invalid opencodeModelRef: "${p.opencodeModelRef}". ` +
      `Must be "provider/model" format (e.g., "ollama/gemma3:12b") or a documented placeholder.`,
    );
  }

  // ── Required union type fields ──
  if (!isModelCostClass(p.costClass)) {
    errors.push(`Invalid costClass: "${String(p.costClass)}". Must be one of: ${ALL_MODEL_COST_CLASSES.join(', ')}`);
  }
  if (!isModelExecutionClass(p.executionClass)) {
    errors.push(`Invalid executionClass: "${String(p.executionClass)}". Must be one of: ${ALL_MODEL_EXECUTION_CLASSES.join(', ')}`);
  }
  if (!isApiKeyStoragePolicy(p.apiKeyStoragePolicy)) {
    errors.push(`Invalid apiKeyStoragePolicy: "${String(p.apiKeyStoragePolicy)}". Must be one of: ${ALL_API_KEY_STORAGE_POLICIES.join(', ')}`);
  }
  if (!isModelWarmupStatus(p.warmupStatus)) {
    errors.push(`Invalid warmupStatus: "${String(p.warmupStatus)}". Must be one of: ${ALL_MODEL_WARMUP_STATUSES.join(', ')}`);
  }
  if (!isModelRiskLevel(p.maxRiskLevel)) {
    errors.push(`Invalid maxRiskLevel: "${String(p.maxRiskLevel)}". Must be one of: ${ALL_MODEL_RISK_LEVELS.join(', ')}`);
  }

  // ── Required boolean fields ──
  if (typeof p.requiresApiKey !== 'boolean') {
    errors.push('Missing required field: requiresApiKey (must be boolean)');
  }
  if (typeof p.allowedForDemo !== 'boolean') {
    errors.push('Missing required field: allowedForDemo (must be boolean)');
  }
  if (typeof p.allowedForRealRuns !== 'boolean') {
    errors.push('Missing required field: allowedForRealRuns (must be boolean)');
  }
  if (typeof p.requiresWarmup !== 'boolean') {
    errors.push('Missing required field: requiresWarmup (must be boolean)');
  }

  // ── warmupLevel ──
  if (typeof p.warmupLevel !== 'number' || p.warmupLevel < 0 || p.warmupLevel > 4) {
    errors.push(
      `Invalid warmupLevel: "${String(p.warmupLevel)}". Must be an integer between 0 and 4.`,
    );
  }

  // ── capabilities array ──
  if (!Array.isArray(p.capabilities)) {
    errors.push('Missing required field: capabilities (must be an array)');
  } else {
    for (let i = 0; i < p.capabilities.length; i++) {
      if (!isModelAgentCapability(p.capabilities[i])) {
        errors.push(
          `Invalid capability at index ${i}: "${String(p.capabilities[i])}". ` +
          `Must be one of: ${ALL_MODEL_AGENT_CAPABILITIES.join(', ')}`,
        );
      }
    }
  }

  // ── notes array ──
  if (!Array.isArray(p.notes)) {
    errors.push('Missing required field: notes (must be an array)');
  }

  // ── SECURITY: No cleartext API key field ──
  if ('apiKey' in p) {
    errors.push('SECURITY: Profile contains forbidden field "apiKey". API keys must never be stored in profiles.');
  }

  // ── API Key consistency ──
  if (p.requiresApiKey === true && p.apiKeyStoragePolicy === 'not_required') {
    errors.push('Inconsistency: requiresApiKey is true but apiKeyStoragePolicy is "not_required"');
  }
  if (p.requiresApiKey === true && p.apiKeyStoragePolicy === 'blocked') {
    errors.push('Inconsistency: requiresApiKey is true but apiKeyStoragePolicy is "blocked"');
  }
  if (p.apiKeyStoragePolicy === 'blocked' && (p.allowedForDemo === true || p.allowedForRealRuns === true)) {
    errors.push('Inconsistency: apiKeyStoragePolicy is "blocked" but profile is allowed for demo or real runs');
  }

  // ── baseURL safety ──
  // NOTE: Constructs a minimal synthetic profile for baseURL validation.
  // Only executionClass and profileId are relevant to isBaseUrlAllowedForProfile.
  // If that function is extended, keep the fields below in sync.
  if (typeof p.baseURL === 'string' && p.baseURL.length > 0) {
    const profileForBaseUrlCheck: OpenCodeModelProfile = {
      profileId: typeof p.profileId === 'string' ? p.profileId : 'unknown',
      displayName: '',
      providerId: '',
      modelId: '',
      opencodeModelRef: '',
      costClass: (isModelCostClass(p.costClass) ? p.costClass : 'unknown') as ModelCostClass,
      executionClass: (isModelExecutionClass(p.executionClass) ? p.executionClass : 'unknown') as ModelExecutionClass,
      requiresApiKey: false,
      apiKeyStoragePolicy: 'not_required',
      allowedForDemo: false,
      allowedForRealRuns: false,
      capabilities: [],
      requiresWarmup: false,
      warmupStatus: 'unknown',
      warmupLevel: 0,
      maxRiskLevel: 'low',
      notes: [],
    };
    const baseUrlResult = isBaseUrlAllowedForProfile(profileForBaseUrlCheck, p.baseURL);
    if (!baseUrlResult.valid) {
      errors.push(...baseUrlResult.errors);
    }
  }

  if (errors.length > 0) {
    return validationFail(errors);
  }

  return validationPass();
}

// ── Model Capability Helpers ───────────────────────────────────────────────

/** Check if a profile is chat-only (cannot perform coding runs) */
export function isChatOnlyModel(profile: OpenCodeModelProfile): boolean {
  return (
    profile.capabilities.includes('chat_only') &&
    profile.capabilities.length === 1
  ) || profile.capabilities.length === 0;
}

/** Check if a profile has tool-calling capability */
export function hasToolCalling(profile: OpenCodeModelProfile): boolean {
  return profile.capabilities.includes('tool_calling');
}

/** Check if a profile has code generation capability */
export function hasCodeGeneration(profile: OpenCodeModelProfile): boolean {
  return profile.capabilities.includes('code_generation');
}

/** Check if a profile requires warm-up before use */
export function requiresModelWarmup(profile: OpenCodeModelProfile): boolean {
  return profile.requiresWarmup && profile.warmupLevel < 4;
}

// ── Warm-up Level Policy ───────────────────────────────────────────────────
//
// | Level | Meaning              | Permitted Use              |
// |------:|----------------------|----------------------------|
// |     0 | Provider sichtbar    | keine Agentennutzung       |
// |     1 | Structured Output    | Analyse/Planung            |
// |     2 | Tool Pattern         | Tool-gestützte Analyse     |
// |     3 | File/Patch Demo      | Demo-Coding-Runs           |
// |     4 | Mini Contract Pipeline| Real-Runs mit Human Approval|

/**
 * Check if a model profile can be used for planning/analysis.
 * Requires warm-up level >= 1.
 */
export function canUseModelForPlanning(profile: OpenCodeModelProfile): boolean {
  if (profile.warmupStatus === 'blocked') return false;
  if (profile.warmupStatus === 'fail') return false;
  return profile.warmupLevel >= 1;
}

/**
 * Check if a model profile can be used for tool-assisted analysis.
 * Requires warm-up level >= 2 AND tool_calling capability.
 */
export function canUseModelForToolAssistedAnalysis(profile: OpenCodeModelProfile): boolean {
  if (!canUseModelForPlanning(profile)) return false; // level >= 1 prerequisite
  if (!hasToolCalling(profile)) return false;
  return profile.warmupLevel >= 2;
}

/**
 * Check if a model profile can be used for demo coding runs.
 * Requires warm-up level >= 3, NOT chat-only.
 */
export function canUseModelForDemoCoding(profile: OpenCodeModelProfile): boolean {
  if (profile.warmupStatus === 'blocked') return false;
  if (profile.warmupStatus === 'fail') return false;
  if (isChatOnlyModel(profile)) return false;
  if (!profile.allowedForDemo) return false;
  return profile.warmupLevel >= 3;
}

/**
 * Check if a model profile can be used for real/production runs.
 * Requires:
 *   - warm-up level >= 4
 *   - NOT chat-only
 *   - Human Approval (external check — this function only validates profile readiness)
 *   - allowedForRealRuns must be true
 *
 * The `humanApproved` parameter is provided by the caller (oversight system).
 * This function does NOT make approval decisions — it only gates on profile state.
 */
export function canUseModelForRealRun(
  profile: OpenCodeModelProfile,
  humanApproved: boolean,
): boolean {
  // Hard blocks — no override possible
  if (profile.warmupStatus === 'blocked') return false;
  if (profile.warmupStatus === 'fail') return false;
  if (profile.apiKeyStoragePolicy === 'blocked') return false;
  if (profile.costClass === 'unknown') return false;
  if (profile.executionClass === 'unknown') return false;

  // Chat-only models can never run real coding tasks
  if (isChatOnlyModel(profile)) return false;

  // Must be explicitly allowed for real runs
  if (!profile.allowedForRealRuns) return false;

  // Must have warm-up level 4
  if (profile.warmupLevel < 4) return false;

  // Must have warm-up status pass
  if (profile.warmupStatus !== 'pass') return false;

  // Must have human approval (external gate)
  return humanApproved;
}

// ── Redaction ──────────────────────────────────────────────────────────────

/**
 * Create a redacted version of a model profile for evidence/logging.
 * Sensitive baseURLs are redacted. No API keys are ever present in profiles,
 * so no key redaction is needed at the profile level.
 */
export function redactModelProfileForEvidence(
  profile: OpenCodeModelProfile,
): RedactedOpenCodeModelProfile {
  let redactedBaseURL: string | null = null;

  if (profile.baseURL) {
    // Keep localhost URLs (they are safe)
    if (hasSafeOrigin(profile.baseURL)) {
      redactedBaseURL = profile.baseURL;
    } else {
      // Redact remote URLs (only show scheme + hostname, no path or query)
      try {
        const url = new URL(profile.baseURL);
        redactedBaseURL = `${url.protocol}//${url.hostname}`;
      } catch {
        redactedBaseURL = '[invalid-url]';
      }
    }
  }

  return {
    profileId: profile.profileId,
    displayName: profile.displayName,
    providerId: profile.providerId,
    modelId: profile.modelId,
    opencodeModelRef: profile.opencodeModelRef,
    costClass: profile.costClass,
    executionClass: profile.executionClass,
    baseURL: redactedBaseURL,
    requiresApiKey: profile.requiresApiKey,
    apiKeyStoragePolicy: profile.apiKeyStoragePolicy,
    allowedForDemo: profile.allowedForDemo,
    allowedForRealRuns: profile.allowedForRealRuns,
    capabilities: [...profile.capabilities],
    requiresWarmup: profile.requiresWarmup,
    warmupStatus: profile.warmupStatus,
    warmupLevel: profile.warmupLevel,
    maxRiskLevel: profile.maxRiskLevel,
    notes: [...profile.notes],
  };
}
