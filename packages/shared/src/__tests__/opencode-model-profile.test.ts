// Positron — OpenCode Model Profile: Comprehensive Tests (Issue #229 PR 2)
// Covers: type guards, default profiles, validation, warm-up policy,
// baseURL safety, API key safety, redaction.

import { describe, expect, test } from "vitest";
import {
  // Types
  type ModelCostClass,
  type ModelExecutionClass,
  type ModelAgentCapability,
  type ModelWarmupLevel,
  type ModelWarmupStatus,
  type ApiKeyStoragePolicy,
  type ModelRiskLevel,
  type OpenCodeModelProfile,
  type ValidationResult,

  // Constants
  ALL_MODEL_COST_CLASSES,
  ALL_MODEL_EXECUTION_CLASSES,
  ALL_MODEL_AGENT_CAPABILITIES,
  ALL_MODEL_WARMUP_STATUSES,
  ALL_API_KEY_STORAGE_POLICIES,
  ALL_MODEL_RISK_LEVELS,

  // Default profiles
  DEFAULT_MODEL_PROFILES,
  PROFILE_FREE_LOCAL_LMSTUDIO,
  PROFILE_FREE_LOCAL_OLLAMA,
  PROFILE_FREE_LOCAL_VLLM,
  PROFILE_FREE_REMOTE_OPENROUTER,
  PROFILE_PAID_PROVIDER_CUSTOM,
  PROFILE_UNKNOWN_PROVIDER_BLOCKED,

  // Type guards
  isModelCostClass,
  isModelExecutionClass,
  isModelAgentCapability,
  isModelWarmupStatus,
  isApiKeyStoragePolicy,
  isModelRiskLevel,
  isOpenCodeModelProfile,

  // Validation
  validateOpenCodeModelProfile,
  isBaseUrlAllowedForProfile,
  validationPass,
  validationFail,

  // Capability helpers
  isChatOnlyModel,
  hasToolCalling,
  hasCodeGeneration,
  requiresModelWarmup,

  // Policy functions
  canUseModelForPlanning,
  canUseModelForToolAssistedAnalysis,
  canUseModelForDemoCoding,
  canUseModelForRealRun,

  // Redaction
  redactModelProfileForEvidence,
  type RedactedOpenCodeModelProfile,
} from "../opencode-model-profile.js";

// ── Helpers ────────────────────────────────────────────────────────────────

/** Create a minimal valid profile for testing */
function makeProfile(overrides: Partial<OpenCodeModelProfile> = {}): OpenCodeModelProfile {
  return {
    profileId: "test-profile",
    displayName: "Test Profile",
    providerId: "test-provider",
    modelId: "test-model",
    opencodeModelRef: "test-provider/test-model",
    costClass: "free_local",
    executionClass: "local",
    requiresApiKey: false,
    apiKeyStoragePolicy: "not_required",
    allowedForDemo: true,
    allowedForRealRuns: true,
    capabilities: ["chat_only"],
    requiresWarmup: true,
    warmupStatus: "pass",
    warmupLevel: 4,
    maxRiskLevel: "low",
    notes: [],
    ...overrides,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANT ARRAYS
// ═══════════════════════════════════════════════════════════════════════════

describe("ALL_MODEL_COST_CLASSES", () => {
  test("contains exactly 4 values", () => {
    expect(ALL_MODEL_COST_CLASSES).toHaveLength(4);
  });

  test("contains all expected values", () => {
    expect(ALL_MODEL_COST_CLASSES).toContain("free_local");
    expect(ALL_MODEL_COST_CLASSES).toContain("free_remote");
    expect(ALL_MODEL_COST_CLASSES).toContain("paid");
    expect(ALL_MODEL_COST_CLASSES).toContain("unknown");
  });

  test("has no duplicates", () => {
    const unique = new Set(ALL_MODEL_COST_CLASSES);
    expect(unique.size).toBe(ALL_MODEL_COST_CLASSES.length);
  });
});

describe("ALL_MODEL_EXECUTION_CLASSES", () => {
  test("contains exactly 4 values", () => {
    expect(ALL_MODEL_EXECUTION_CLASSES).toHaveLength(4);
  });

  test("contains all expected values", () => {
    expect(ALL_MODEL_EXECUTION_CLASSES).toContain("local");
    expect(ALL_MODEL_EXECUTION_CLASSES).toContain("remote");
    expect(ALL_MODEL_EXECUTION_CLASSES).toContain("hybrid");
    expect(ALL_MODEL_EXECUTION_CLASSES).toContain("unknown");
  });
});

describe("ALL_MODEL_AGENT_CAPABILITIES", () => {
  test("contains exactly 9 values", () => {
    expect(ALL_MODEL_AGENT_CAPABILITIES).toHaveLength(9);
  });

  test("contains all expected values", () => {
    expect(ALL_MODEL_AGENT_CAPABILITIES).toContain("chat_only");
    expect(ALL_MODEL_AGENT_CAPABILITIES).toContain("code_generation");
    expect(ALL_MODEL_AGENT_CAPABILITIES).toContain("tool_calling");
    expect(ALL_MODEL_AGENT_CAPABILITIES).toContain("file_editing");
    expect(ALL_MODEL_AGENT_CAPABILITIES).toContain("test_fixing");
    expect(ALL_MODEL_AGENT_CAPABILITIES).toContain("long_context");
    expect(ALL_MODEL_AGENT_CAPABILITIES).toContain("reasoning");
    expect(ALL_MODEL_AGENT_CAPABILITIES).toContain("vision");
    expect(ALL_MODEL_AGENT_CAPABILITIES).toContain("unknown");
  });
});

describe("ALL_MODEL_WARMUP_STATUSES", () => {
  test("contains exactly 5 values", () => {
    expect(ALL_MODEL_WARMUP_STATUSES).toHaveLength(5);
  });

  test("contains all expected values", () => {
    expect(ALL_MODEL_WARMUP_STATUSES).toContain("unknown");
    expect(ALL_MODEL_WARMUP_STATUSES).toContain("pass");
    expect(ALL_MODEL_WARMUP_STATUSES).toContain("partial");
    expect(ALL_MODEL_WARMUP_STATUSES).toContain("fail");
    expect(ALL_MODEL_WARMUP_STATUSES).toContain("blocked");
  });
});

describe("ALL_API_KEY_STORAGE_POLICIES", () => {
  test("contains exactly 4 values", () => {
    expect(ALL_API_KEY_STORAGE_POLICIES).toHaveLength(4);
  });

  test("contains all expected values", () => {
    expect(ALL_API_KEY_STORAGE_POLICIES).toContain("opencode_auth");
    expect(ALL_API_KEY_STORAGE_POLICIES).toContain("env_reference");
    expect(ALL_API_KEY_STORAGE_POLICIES).toContain("not_required");
    expect(ALL_API_KEY_STORAGE_POLICIES).toContain("blocked");
  });
});

describe("ALL_MODEL_RISK_LEVELS", () => {
  test("contains exactly 3 values", () => {
    expect(ALL_MODEL_RISK_LEVELS).toHaveLength(3);
  });

  test("contains all expected values", () => {
    expect(ALL_MODEL_RISK_LEVELS).toContain("low");
    expect(ALL_MODEL_RISK_LEVELS).toContain("medium");
    expect(ALL_MODEL_RISK_LEVELS).toContain("high");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// TYPE GUARDS
// ═══════════════════════════════════════════════════════════════════════════

describe("isModelCostClass", () => {
  test("returns true for all valid cost classes", () => {
    for (const cc of ALL_MODEL_COST_CLASSES) {
      expect(isModelCostClass(cc)).toBe(true);
    }
  });

  test("returns false for invalid cost class", () => {
    expect(isModelCostClass("invalid")).toBe(false);
  });

  test("returns false for non-string", () => {
    expect(isModelCostClass(42)).toBe(false);
    expect(isModelCostClass(null)).toBe(false);
    expect(isModelCostClass(undefined)).toBe(false);
  });

  test("returns false for empty string", () => {
    expect(isModelCostClass("")).toBe(false);
  });
});

describe("isModelExecutionClass", () => {
  test("returns true for all valid execution classes", () => {
    for (const ec of ALL_MODEL_EXECUTION_CLASSES) {
      expect(isModelExecutionClass(ec)).toBe(true);
    }
  });

  test("returns false for invalid execution class", () => {
    expect(isModelExecutionClass("containerized")).toBe(false);
  });

  test("returns false for non-string", () => {
    expect(isModelExecutionClass(42)).toBe(false);
    expect(isModelExecutionClass(null)).toBe(false);
  });
});

describe("isModelAgentCapability", () => {
  test("returns true for all valid capabilities", () => {
    for (const cap of ALL_MODEL_AGENT_CAPABILITIES) {
      expect(isModelAgentCapability(cap)).toBe(true);
    }
  });

  test("returns false for invalid capability", () => {
    expect(isModelAgentCapability("flight")).toBe(false);
  });

  test("returns false for non-string", () => {
    expect(isModelAgentCapability(42)).toBe(false);
    expect(isModelAgentCapability(null)).toBe(false);
  });
});

describe("isModelWarmupStatus", () => {
  test("returns true for all valid warmup statuses", () => {
    for (const ws of ALL_MODEL_WARMUP_STATUSES) {
      expect(isModelWarmupStatus(ws)).toBe(true);
    }
  });

  test("returns false for invalid warmup status", () => {
    expect(isModelWarmupStatus("in_progress")).toBe(false);
  });

  test("returns false for non-string", () => {
    expect(isModelWarmupStatus(42)).toBe(false);
    expect(isModelWarmupStatus(null)).toBe(false);
  });
});

describe("isApiKeyStoragePolicy", () => {
  test("returns true for all valid policies", () => {
    for (const policy of ALL_API_KEY_STORAGE_POLICIES) {
      expect(isApiKeyStoragePolicy(policy)).toBe(true);
    }
  });

  test("returns false for invalid policy", () => {
    expect(isApiKeyStoragePolicy("plaintext_file")).toBe(false);
  });

  test("returns false for non-string", () => {
    expect(isApiKeyStoragePolicy(42)).toBe(false);
    expect(isApiKeyStoragePolicy(null)).toBe(false);
  });
});

describe("isModelRiskLevel", () => {
  test("returns true for all valid risk levels", () => {
    for (const rl of ALL_MODEL_RISK_LEVELS) {
      expect(isModelRiskLevel(rl)).toBe(true);
    }
  });

  test("returns false for invalid risk level", () => {
    expect(isModelRiskLevel("critical")).toBe(false);
  });

  test("returns false for non-string", () => {
    expect(isModelRiskLevel(42)).toBe(false);
    expect(isModelRiskLevel(null)).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// DEFAULT PROFILES
// ═══════════════════════════════════════════════════════════════════════════

describe("DEFAULT_MODEL_PROFILES", () => {
  test("contains exactly 6 profiles", () => {
    expect(DEFAULT_MODEL_PROFILES).toHaveLength(6);
  });

  test("all profile IDs are unique", () => {
    const ids = DEFAULT_MODEL_PROFILES.map((p) => p.profileId);
    const unique = new Set(ids);
    expect(unique.size).toBe(DEFAULT_MODEL_PROFILES.length);
  });

  test("all profiles pass isOpenCodeModelProfile", () => {
    for (const profile of DEFAULT_MODEL_PROFILES) {
      expect(isOpenCodeModelProfile(profile)).toBe(true);
    }
  });

  test("all profiles pass validateOpenCodeModelProfile", () => {
    for (const profile of DEFAULT_MODEL_PROFILES) {
      const result = validateOpenCodeModelProfile(profile);
      expect(result.valid).toBe(true);
    }
  });

  test("each profile has a valid opencodeModelRef", () => {
    const validRefs = [
      "lmstudio/placeholder",
      "ollama/placeholder",
      "vllm/placeholder",
      "openrouter/placeholder",
      "custom/placeholder",
      "unknown/blocked",
    ];
    for (const profile of DEFAULT_MODEL_PROFILES) {
      expect(validRefs).toContain(profile.opencodeModelRef);
    }
  });
});

describe("PROFILE_FREE_LOCAL_LMSTUDIO", () => {
  test("is free local", () => {
    expect(PROFILE_FREE_LOCAL_LMSTUDIO.costClass).toBe("free_local");
    expect(PROFILE_FREE_LOCAL_LMSTUDIO.executionClass).toBe("local");
  });

  test("does not require API key", () => {
    expect(PROFILE_FREE_LOCAL_LMSTUDIO.requiresApiKey).toBe(false);
    expect(PROFILE_FREE_LOCAL_LMSTUDIO.apiKeyStoragePolicy).toBe("not_required");
  });

  test("has localhost base URL", () => {
    expect(PROFILE_FREE_LOCAL_LMSTUDIO.baseURL).toBe("http://localhost:1234/v1");
  });

  test("allowed for demo but not real runs", () => {
    expect(PROFILE_FREE_LOCAL_LMSTUDIO.allowedForDemo).toBe(true);
    expect(PROFILE_FREE_LOCAL_LMSTUDIO.allowedForRealRuns).toBe(false);
  });

  test("starts at warmup level 0", () => {
    expect(PROFILE_FREE_LOCAL_LMSTUDIO.warmupLevel).toBe(0);
    expect(PROFILE_FREE_LOCAL_LMSTUDIO.warmupStatus).toBe("unknown");
  });
});

describe("PROFILE_FREE_LOCAL_OLLAMA", () => {
  test("is free local", () => {
    expect(PROFILE_FREE_LOCAL_OLLAMA.costClass).toBe("free_local");
    expect(PROFILE_FREE_LOCAL_OLLAMA.executionClass).toBe("local");
  });

  test("does not require API key", () => {
    expect(PROFILE_FREE_LOCAL_OLLAMA.requiresApiKey).toBe(false);
    expect(PROFILE_FREE_LOCAL_OLLAMA.apiKeyStoragePolicy).toBe("not_required");
  });

  test("has localhost base URL on port 11434", () => {
    expect(PROFILE_FREE_LOCAL_OLLAMA.baseURL).toBe("http://localhost:11434/v1");
  });

  test("allowed for demo but not real runs", () => {
    expect(PROFILE_FREE_LOCAL_OLLAMA.allowedForDemo).toBe(true);
    expect(PROFILE_FREE_LOCAL_OLLAMA.allowedForRealRuns).toBe(false);
  });
});

describe("PROFILE_FREE_LOCAL_VLLM", () => {
  test("is free local", () => {
    expect(PROFILE_FREE_LOCAL_VLLM.costClass).toBe("free_local");
    expect(PROFILE_FREE_LOCAL_VLLM.executionClass).toBe("local");
  });

  test("has localhost base URL on port 8000", () => {
    expect(PROFILE_FREE_LOCAL_VLLM.baseURL).toBe("http://localhost:8000/v1");
  });
});

describe("PROFILE_FREE_REMOTE_OPENROUTER", () => {
  test("is free remote", () => {
    expect(PROFILE_FREE_REMOTE_OPENROUTER.costClass).toBe("free_remote");
    expect(PROFILE_FREE_REMOTE_OPENROUTER.executionClass).toBe("remote");
  });

  test("requires API key via opencode_auth", () => {
    expect(PROFILE_FREE_REMOTE_OPENROUTER.requiresApiKey).toBe(true);
    expect(PROFILE_FREE_REMOTE_OPENROUTER.apiKeyStoragePolicy).toBe("opencode_auth");
  });

  test("has no baseURL (configured at runtime)", () => {
    expect(PROFILE_FREE_REMOTE_OPENROUTER.baseURL).toBeUndefined();
  });

  test("allowed for demo but not real runs", () => {
    expect(PROFILE_FREE_REMOTE_OPENROUTER.allowedForDemo).toBe(true);
    expect(PROFILE_FREE_REMOTE_OPENROUTER.allowedForRealRuns).toBe(false);
  });

  test("starts at warmup level 0", () => {
    expect(PROFILE_FREE_REMOTE_OPENROUTER.warmupLevel).toBe(0);
  });
});

describe("PROFILE_PAID_PROVIDER_CUSTOM", () => {
  test("is paid", () => {
    expect(PROFILE_PAID_PROVIDER_CUSTOM.costClass).toBe("paid");
  });

  test("requires API key", () => {
    expect(PROFILE_PAID_PROVIDER_CUSTOM.requiresApiKey).toBe(true);
  });

  test("NOT allowed for demo or real until configured", () => {
    expect(PROFILE_PAID_PROVIDER_CUSTOM.allowedForDemo).toBe(false);
    expect(PROFILE_PAID_PROVIDER_CUSTOM.allowedForRealRuns).toBe(false);
  });

  test("starts at warmup level 0", () => {
    expect(PROFILE_PAID_PROVIDER_CUSTOM.warmupLevel).toBe(0);
  });
});

describe("PROFILE_UNKNOWN_PROVIDER_BLOCKED", () => {
  test("is unknown cost/execution class", () => {
    expect(PROFILE_UNKNOWN_PROVIDER_BLOCKED.costClass).toBe("unknown");
    expect(PROFILE_UNKNOWN_PROVIDER_BLOCKED.executionClass).toBe("unknown");
  });

  test("has blocked API key storage policy", () => {
    expect(PROFILE_UNKNOWN_PROVIDER_BLOCKED.apiKeyStoragePolicy).toBe("blocked");
  });

  test("NOT allowed for demo or real runs", () => {
    expect(PROFILE_UNKNOWN_PROVIDER_BLOCKED.allowedForDemo).toBe(false);
    expect(PROFILE_UNKNOWN_PROVIDER_BLOCKED.allowedForRealRuns).toBe(false);
  });

  test("has blocked warmup status", () => {
    expect(PROFILE_UNKNOWN_PROVIDER_BLOCKED.warmupStatus).toBe("blocked");
  });

  test("has unknown capabilities only", () => {
    expect(PROFILE_UNKNOWN_PROVIDER_BLOCKED.capabilities).toEqual(["unknown"]);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// isOpenCodeModelProfile (type guard)
// ═══════════════════════════════════════════════════════════════════════════

describe("isOpenCodeModelProfile", () => {
  test("accepts a valid profile", () => {
    expect(isOpenCodeModelProfile(makeProfile())).toBe(true);
  });

  test("rejects null", () => {
    expect(isOpenCodeModelProfile(null)).toBe(false);
  });

  test("rejects undefined", () => {
    expect(isOpenCodeModelProfile(undefined)).toBe(false);
  });

  test("rejects non-object", () => {
    expect(isOpenCodeModelProfile("string")).toBe(false);
    expect(isOpenCodeModelProfile(42)).toBe(false);
  });

  test("rejects profile missing profileId", () => {
    const p = makeProfile();
    delete (p as unknown as Record<string, unknown>).profileId;
    expect(isOpenCodeModelProfile(p)).toBe(false);
  });

  test("rejects profile missing displayName", () => {
    const p = makeProfile();
    delete (p as unknown as Record<string, unknown>).displayName;
    expect(isOpenCodeModelProfile(p)).toBe(false);
  });

  test("rejects profile missing modelId", () => {
    const p = makeProfile();
    delete (p as unknown as Record<string, unknown>).modelId;
    expect(isOpenCodeModelProfile(p)).toBe(false);
  });

  test("rejects profile with invalid costClass", () => {
    expect(isOpenCodeModelProfile(makeProfile({ costClass: "premium" as ModelCostClass }))).toBe(false);
  });

  test("rejects profile with invalid warmupLevel", () => {
    expect(isOpenCodeModelProfile(makeProfile({ warmupLevel: 5 as ModelWarmupLevel }))).toBe(false);
  });

  test("rejects profile with non-boolean requiresApiKey", () => {
    const p = makeProfile();
    (p as unknown as Record<string, unknown>).requiresApiKey = "yes";
    expect(isOpenCodeModelProfile(p)).toBe(false);
  });

  test("rejects profile with apiKey field present (security)", () => {
    const p = { ...makeProfile(), apiKey: "sk-secret-key" };
    expect(isOpenCodeModelProfile(p)).toBe(false);
  });

  test("rejects profile with invalid capabilities array element", () => {
    expect(isOpenCodeModelProfile(makeProfile({
      capabilities: ["chat_only", "flight" as ModelAgentCapability],
    }))).toBe(false);
  });

  test("rejects profile with non-array capabilities", () => {
    const p = makeProfile();
    (p as unknown as Record<string, unknown>).capabilities = "not-an-array";
    expect(isOpenCodeModelProfile(p)).toBe(false);
  });

  test("rejects profile with non-array notes", () => {
    const p = makeProfile();
    (p as unknown as Record<string, unknown>).notes = "not-an-array";
    expect(isOpenCodeModelProfile(p)).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// validateOpenCodeModelProfile
// ═══════════════════════════════════════════════════════════════════════════

describe("validateOpenCodeModelProfile", () => {
  test("valid profile passes", () => {
    const result = validateOpenCodeModelProfile(makeProfile());
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  test("missing profileId fails", () => {
    const p = makeProfile();
    delete (p as unknown as Record<string, unknown>).profileId;
    const result = validateOpenCodeModelProfile(p);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("profileId"))).toBe(true);
  });

  test("missing displayName fails", () => {
    const p = makeProfile();
    delete (p as unknown as Record<string, unknown>).displayName;
    const result = validateOpenCodeModelProfile(p);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("displayName"))).toBe(true);
  });

  test("missing modelId fails", () => {
    const p = makeProfile();
    delete (p as unknown as Record<string, unknown>).modelId;
    const result = validateOpenCodeModelProfile(p);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("modelId"))).toBe(true);
  });

  test("invalid opencodeModelRef fails", () => {
    const result = validateOpenCodeModelProfile(
      makeProfile({ opencodeModelRef: "not-a-valid-ref" }),
    );
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("opencodeModelRef"))).toBe(true);
  });

  test("valid provider/model format opencodeModelRef passes", () => {
    const result = validateOpenCodeModelProfile(
      makeProfile({ opencodeModelRef: "ollama/gemma3:12b" }),
    );
    expect(result.valid).toBe(true);
  });

  test("valid placeholder opencodeModelRef passes", () => {
    const result = validateOpenCodeModelProfile(
      makeProfile({ opencodeModelRef: "ollama/placeholder" }),
    );
    expect(result.valid).toBe(true);
  });

  test("non-object fails", () => {
    const result = validateOpenCodeModelProfile("not-an-object");
    expect(result.valid).toBe(false);
  });

  test("null fails", () => {
    const result = validateOpenCodeModelProfile(null);
    expect(result.valid).toBe(false);
  });

  test("apiKey field present is rejected", () => {
    const p = { ...makeProfile(), apiKey: "sk-secret" };
    const result = validateOpenCodeModelProfile(p);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("apiKey"))).toBe(true);
    expect(result.errors.some((e) => e.includes("SECURITY"))).toBe(true);
  });

  test("requiresApiKey true with not_required policy fails", () => {
    const result = validateOpenCodeModelProfile(
      makeProfile({
        requiresApiKey: true,
        apiKeyStoragePolicy: "not_required",
      }),
    );
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("requiresApiKey"))).toBe(true);
  });

  test("requiresApiKey true with blocked policy fails", () => {
    const result = validateOpenCodeModelProfile(
      makeProfile({
        requiresApiKey: true,
        apiKeyStoragePolicy: "blocked",
      }),
    );
    expect(result.valid).toBe(false);
  });

  test("blocked policy with allowedForDemo fails", () => {
    const result = validateOpenCodeModelProfile(
      makeProfile({
        apiKeyStoragePolicy: "blocked",
        allowedForDemo: true,
      }),
    );
    expect(result.valid).toBe(false);
  });

  test("invalid warmupLevel fails", () => {
    const result = validateOpenCodeModelProfile(
      makeProfile({ warmupLevel: -1 as ModelWarmupLevel }),
    );
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("warmupLevel"))).toBe(true);
  });

  test("invalid capability in array fails", () => {
    const result = validateOpenCodeModelProfile(
      makeProfile({ capabilities: ["chat_only", "flying" as ModelAgentCapability] }),
    );
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("capability at index 1"))).toBe(true);
  });

  test("multiple errors are all collected", () => {
    const p = makeProfile();
    delete (p as unknown as Record<string, unknown>).profileId;
    (p as unknown as Record<string, unknown>).costClass = "invalid";
    const result = validateOpenCodeModelProfile(p);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(2);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// isBaseUrlAllowedForProfile
// ═══════════════════════════════════════════════════════════════════════════

describe("isBaseUrlAllowedForProfile", () => {
  const localProfile = makeProfile({ executionClass: "local", profileId: "test-local" });
  const remoteProfile = makeProfile({ executionClass: "remote", profileId: "test-remote" });

  test("null/undefined baseURL passes (no URL set)", () => {
    expect(isBaseUrlAllowedForProfile(localProfile, null).valid).toBe(true);
    expect(isBaseUrlAllowedForProfile(localProfile, undefined).valid).toBe(true);
    expect(isBaseUrlAllowedForProfile(localProfile, "").valid).toBe(true);
  });

  test("localhost baseURL passes for local profile", () => {
    expect(isBaseUrlAllowedForProfile(localProfile, "http://localhost:1234/v1").valid).toBe(true);
  });

  test("127.0.0.1 baseURL passes for local profile", () => {
    expect(isBaseUrlAllowedForProfile(localProfile, "http://127.0.0.1:8080").valid).toBe(true);
  });

  test("::1 baseURL passes for local profile", () => {
    expect(isBaseUrlAllowedForProfile(localProfile, "http://[::1]:8080").valid).toBe(true);
  });

  test("non-localhost baseURL fails for local profile", () => {
    const result = isBaseUrlAllowedForProfile(localProfile, "http://192.168.1.100:1234");
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("localhost") || e.includes("loopback"))).toBe(true);
  });

  test("remote baseURL passes for remote profile", () => {
    expect(isBaseUrlAllowedForProfile(remoteProfile, "https://api.openrouter.ai/v1").valid).toBe(true);
  });

  test("invalid URL fails", () => {
    const result = isBaseUrlAllowedForProfile(localProfile, "not-a-valid-url");
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("valid URL"))).toBe(true);
  });

  test("URL with embedded user:pass fails", () => {
    const result = isBaseUrlAllowedForProfile(remoteProfile, "http://user:password@api.example.com");
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("credentials") || e.includes("secret"))).toBe(true);
  });

  test("URL with query token fails", () => {
    const result = isBaseUrlAllowedForProfile(remoteProfile, "https://api.example.com?token=abc123");
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("secret") || e.includes("token"))).toBe(true);
  });

  test("URL with api_key query param fails", () => {
    const result = isBaseUrlAllowedForProfile(remoteProfile, "https://api.example.com?api_key=sk-secret");
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("secret") || e.includes("token"))).toBe(true);
  });

  test("URL with password query param fails", () => {
    const result = isBaseUrlAllowedForProfile(remoteProfile, "https://api.example.com?password=admin123");
    expect(result.valid).toBe(false);
  });

  test("clean remote URL passes", () => {
    expect(isBaseUrlAllowedForProfile(remoteProfile, "https://api.mistral.ai/v1").valid).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// CAPABILITY HELPERS
// ═══════════════════════════════════════════════════════════════════════════

describe("isChatOnlyModel", () => {
  test("chat_only with single capability returns true", () => {
    expect(isChatOnlyModel(makeProfile({ capabilities: ["chat_only"] }))).toBe(true);
  });

  test("empty capabilities returns true", () => {
    expect(isChatOnlyModel(makeProfile({ capabilities: [] }))).toBe(true);
  });

  test("chat_only with additional capabilities returns false", () => {
    expect(
      isChatOnlyModel(makeProfile({ capabilities: ["chat_only", "code_generation"] })),
    ).toBe(false);
  });

  test("code_generation only returns false", () => {
    expect(isChatOnlyModel(makeProfile({ capabilities: ["code_generation"] }))).toBe(false);
  });
});

describe("hasToolCalling", () => {
  test("returns true when tool_calling is present", () => {
    expect(hasToolCalling(makeProfile({ capabilities: ["tool_calling"] }))).toBe(true);
  });

  test("returns false when tool_calling is absent", () => {
    expect(hasToolCalling(makeProfile({ capabilities: ["chat_only"] }))).toBe(false);
  });
});

describe("hasCodeGeneration", () => {
  test("returns true when code_generation is present", () => {
    expect(hasCodeGeneration(makeProfile({ capabilities: ["code_generation"] }))).toBe(true);
  });

  test("returns false when code_generation is absent", () => {
    expect(hasCodeGeneration(makeProfile({ capabilities: ["chat_only"] }))).toBe(false);
  });
});

describe("requiresModelWarmup", () => {
  test("returns true when requiresWarmup is true and level < 4", () => {
    expect(requiresModelWarmup(makeProfile({ requiresWarmup: true, warmupLevel: 0 }))).toBe(true);
    expect(requiresModelWarmup(makeProfile({ requiresWarmup: true, warmupLevel: 3 }))).toBe(true);
  });

  test("returns false when warmupLevel is 4 (even if requiresWarmup is true)", () => {
    expect(requiresModelWarmup(makeProfile({ requiresWarmup: true, warmupLevel: 4 }))).toBe(false);
  });

  test("returns false when requiresWarmup is false", () => {
    expect(requiresModelWarmup(makeProfile({ requiresWarmup: false, warmupLevel: 0 }))).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// WARM-UP LEVEL POLICY
// ═══════════════════════════════════════════════════════════════════════════

describe("canUseModelForPlanning", () => {
  test("level 0 cannot plan", () => {
    expect(canUseModelForPlanning(makeProfile({ warmupLevel: 0 }))).toBe(false);
  });

  test("level 1 can plan", () => {
    expect(canUseModelForPlanning(makeProfile({ warmupLevel: 1 }))).toBe(true);
  });

  test("level 2 can plan", () => {
    expect(canUseModelForPlanning(makeProfile({ warmupLevel: 2 }))).toBe(true);
  });

  test("blocked status cannot plan even at high level", () => {
    expect(canUseModelForPlanning(makeProfile({ warmupLevel: 4, warmupStatus: "blocked" }))).toBe(false);
  });

  test("fail status cannot plan", () => {
    expect(canUseModelForPlanning(makeProfile({ warmupLevel: 4, warmupStatus: "fail" }))).toBe(false);
  });

  test("unknown status with level 1 can plan", () => {
    expect(canUseModelForPlanning(makeProfile({ warmupLevel: 1, warmupStatus: "unknown" }))).toBe(true);
  });
});

describe("canUseModelForToolAssistedAnalysis", () => {
  test("level 0 cannot do tool-assisted analysis", () => {
    const p = makeProfile({ warmupLevel: 0, capabilities: ["tool_calling"] });
    expect(canUseModelForToolAssistedAnalysis(p)).toBe(false);
  });

  test("level 1 cannot do tool-assisted analysis (needs level 2)", () => {
    const p = makeProfile({ warmupLevel: 1, capabilities: ["tool_calling"] });
    expect(canUseModelForToolAssistedAnalysis(p)).toBe(false);
  });

  test("level 2 with tool_calling can do tool-assisted analysis", () => {
    const p = makeProfile({ warmupLevel: 2, capabilities: ["tool_calling"] });
    expect(canUseModelForToolAssistedAnalysis(p)).toBe(true);
  });

  test("level 4 without tool_calling cannot do tool-assisted analysis", () => {
    const p = makeProfile({ warmupLevel: 4, capabilities: ["chat_only"] });
    expect(canUseModelForToolAssistedAnalysis(p)).toBe(false);
  });
});

describe("canUseModelForDemoCoding", () => {
  test("level 0 cannot demo code", () => {
    const p = makeProfile({ warmupLevel: 0, capabilities: ["code_generation"] });
    expect(canUseModelForDemoCoding(p)).toBe(false);
  });

  test("level 2 cannot demo code", () => {
    const p = makeProfile({ warmupLevel: 2, capabilities: ["code_generation"] });
    expect(canUseModelForDemoCoding(p)).toBe(false);
  });

  test("level 3 with code_generation can demo code", () => {
    const p = makeProfile({ warmupLevel: 3, capabilities: ["code_generation"] });
    expect(canUseModelForDemoCoding(p)).toBe(true);
  });

  test("level 4 can demo code", () => {
    const p = makeProfile({ warmupLevel: 4, capabilities: ["code_generation"] });
    expect(canUseModelForDemoCoding(p)).toBe(true);
  });

  test("chat-only model cannot demo code even at level 4", () => {
    const p = makeProfile({ warmupLevel: 4, capabilities: ["chat_only"] });
    expect(canUseModelForDemoCoding(p)).toBe(false);
  });

  test("blocked model cannot demo code", () => {
    const p = makeProfile({ warmupLevel: 4, capabilities: ["code_generation"], warmupStatus: "blocked" });
    expect(canUseModelForDemoCoding(p)).toBe(false);
  });

  test("not allowedForDemo prevents demo coding", () => {
    const p = makeProfile({ warmupLevel: 4, capabilities: ["code_generation"], allowedForDemo: false });
    expect(canUseModelForDemoCoding(p)).toBe(false);
  });
});

describe("canUseModelForRealRun", () => {
  test("level 0 cannot real run", () => {
    expect(canUseModelForRealRun(makeProfile({ warmupLevel: 0 }), true)).toBe(false);
  });

  test("level 3 cannot real run", () => {
    expect(canUseModelForRealRun(makeProfile({ warmupLevel: 3 }), true)).toBe(false);
  });

  test("level 4 without human approval cannot real run", () => {
    expect(canUseModelForRealRun(makeProfile({ warmupLevel: 4 }), false)).toBe(false);
  });

  test("level 4 with human approval can real run", () => {
    const p = makeProfile({
      warmupLevel: 4,
      warmupStatus: "pass",
      allowedForRealRuns: true,
      capabilities: ["code_generation"],
    });
    expect(canUseModelForRealRun(p, true)).toBe(true);
  });

  test("chat-only cannot real run even at level 4 with approval", () => {
    const p = makeProfile({
      warmupLevel: 4,
      warmupStatus: "pass",
      allowedForRealRuns: true,
      capabilities: ["chat_only"],
    });
    expect(canUseModelForRealRun(p, true)).toBe(false);
  });

  test("blocked profile cannot real run", () => {
    expect(canUseModelForRealRun(
      makeProfile({ warmupLevel: 4, warmupStatus: "blocked", allowedForRealRuns: true }),
      true,
    )).toBe(false);
  });

  test("fail warmup status cannot real run", () => {
    expect(canUseModelForRealRun(
      makeProfile({ warmupLevel: 4, warmupStatus: "fail", allowedForRealRuns: true }),
      true,
    )).toBe(false);
  });

  test("partial warmup status cannot real run (must be pass)", () => {
    expect(canUseModelForRealRun(
      makeProfile({ warmupLevel: 4, warmupStatus: "partial", allowedForRealRuns: true }),
      true,
    )).toBe(false);
  });

  test("unknown cost class cannot real run", () => {
    const p = makeProfile({
      warmupLevel: 4,
      warmupStatus: "pass",
      allowedForRealRuns: true,
      costClass: "unknown",
    });
    expect(canUseModelForRealRun(p, true)).toBe(false);
  });

  test("unknown execution class cannot real run", () => {
    const p = makeProfile({
      warmupLevel: 4,
      warmupStatus: "pass",
      allowedForRealRuns: true,
      executionClass: "unknown",
    });
    expect(canUseModelForRealRun(p, true)).toBe(false);
  });

  test("blocked API key storage policy cannot real run", () => {
    const p = makeProfile({
      warmupLevel: 4,
      warmupStatus: "pass",
      allowedForRealRuns: true,
      apiKeyStoragePolicy: "blocked",
    });
    expect(canUseModelForRealRun(p, true)).toBe(false);
  });

  test("not allowedForRealRuns prevents real run", () => {
    const p = makeProfile({
      warmupLevel: 4,
      warmupStatus: "pass",
      allowedForRealRuns: false,
      capabilities: ["code_generation"],
    });
    expect(canUseModelForRealRun(p, true)).toBe(false);
  });

  test("unknown provider blocked cannot real run", () => {
    expect(canUseModelForRealRun(PROFILE_UNKNOWN_PROVIDER_BLOCKED, true)).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// REDACTION
// ═══════════════════════════════════════════════════════════════════════════

describe("redactModelProfileForEvidence", () => {
  test("redacted profile preserves all structural fields", () => {
    const profile = makeProfile();
    const redacted = redactModelProfileForEvidence(profile);
    expect(redacted.profileId).toBe(profile.profileId);
    expect(redacted.displayName).toBe(profile.displayName);
    expect(redacted.providerId).toBe(profile.providerId);
    expect(redacted.opencodeModelRef).toBe(profile.opencodeModelRef);
    expect(redacted.costClass).toBe(profile.costClass);
    expect(redacted.warmupLevel).toBe(profile.warmupLevel);
    expect(redacted.capabilities).toEqual(profile.capabilities);
  });

  test("redacted profile does NOT contain raw apiKey field", () => {
    // (There is never an apiKey field on OpenCodeModelProfile, but verify
    // that the redacted type and function enforce this contract)
    const profile = makeProfile();
    const redacted = redactModelProfileForEvidence(profile);
    expect('apiKey' in redacted).toBe(false);
  });

  test("localhost baseURL is preserved in redaction", () => {
    const profile = makeProfile({ baseURL: "http://localhost:1234/v1" });
    const redacted = redactModelProfileForEvidence(profile);
    expect(redacted.baseURL).toBe("http://localhost:1234/v1");
  });

  test("127.0.0.1 baseURL is preserved in redaction", () => {
    const profile = makeProfile({ baseURL: "http://127.0.0.1:8080" });
    const redacted = redactModelProfileForEvidence(profile);
    expect(redacted.baseURL).toBe("http://127.0.0.1:8080");
  });

  test("remote baseURL is redacted to scheme+hostname only", () => {
    const profile = makeProfile({ baseURL: "https://api.openrouter.ai/v1/chat/completions" });
    const redacted = redactModelProfileForEvidence(profile);
    expect(redacted.baseURL).toBe("https://api.openrouter.ai");
  });

  test("remote baseURL with port is redacted to scheme+hostname", () => {
    const profile = makeProfile({ baseURL: "https://api.example.com:8443/v1" });
    const redacted = redactModelProfileForEvidence(profile);
    expect(redacted.baseURL).toBe("https://api.example.com");
  });

  test("profile without baseURL redacts to null", () => {
    const profile = makeProfile();
    delete profile.baseURL;
    const redacted = redactModelProfileForEvidence(profile);
    expect(redacted.baseURL).toBeNull();
  });

  test("redacted profile type matches RedactedOpenCodeModelProfile", () => {
    const profile = makeProfile({ baseURL: "http://localhost:1234" });
    const redacted: RedactedOpenCodeModelProfile = redactModelProfileForEvidence(profile);
    // Type-level check — if this compiles, the return type is correct
    expect(redacted.profileId).toBeDefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// INTEGRATION: Default profile policy gates
// ═══════════════════════════════════════════════════════════════════════════

describe("Default profiles — policy integration", () => {
  test("free local profiles cannot real run (level 0, no approval)", () => {
    for (const profile of [PROFILE_FREE_LOCAL_LMSTUDIO, PROFILE_FREE_LOCAL_OLLAMA, PROFILE_FREE_LOCAL_VLLM]) {
      expect(canUseModelForRealRun(profile, true)).toBe(false);
    }
  });

  test("free remote OpenRouter cannot real run (level 0)", () => {
    expect(canUseModelForRealRun(PROFILE_FREE_REMOTE_OPENROUTER, true)).toBe(false);
  });

  test("paid custom cannot real run without configuration (level 0, not allowed)", () => {
    expect(canUseModelForRealRun(PROFILE_PAID_PROVIDER_CUSTOM, true)).toBe(false);
  });

  test("unknown blocked cannot real run", () => {
    expect(canUseModelForRealRun(PROFILE_UNKNOWN_PROVIDER_BLOCKED, true)).toBe(false);
  });

  test("free local profiles cannot plan at level 0", () => {
    for (const profile of [PROFILE_FREE_LOCAL_LMSTUDIO, PROFILE_FREE_LOCAL_OLLAMA, PROFILE_FREE_LOCAL_VLLM]) {
      expect(canUseModelForPlanning(profile)).toBe(false);
    }
  });

  test("free local profiles cannot demo code at level 0", () => {
    for (const profile of [PROFILE_FREE_LOCAL_LMSTUDIO, PROFILE_FREE_LOCAL_OLLAMA, PROFILE_FREE_LOCAL_VLLM]) {
      expect(canUseModelForDemoCoding(profile)).toBe(false);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// validationPass / validationFail helpers
// ═══════════════════════════════════════════════════════════════════════════

describe("validationPass / validationFail", () => {
  test("validationPass returns valid=true with empty errors", () => {
    const result = validationPass();
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  test("validationFail returns valid=false with provided errors", () => {
    const result = validationFail(["error 1", "error 2"]);
    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(["error 1", "error 2"]);
  });

  test("validationFail with empty errors is still invalid", () => {
    const result = validationFail([]);
    expect(result.valid).toBe(false);
    expect(result.errors).toEqual([]);
  });
});
