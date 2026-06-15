# OpenCode Model Profile Registry

**Issue:** #229
**Status:** Implemented (PR 2)
**Implementation:** `packages/shared/src/opencode-model-profile.ts`
**Tests:** `packages/shared/src/__tests__/opencode-model-profile.test.ts` (162 tests)

---

## Implementation Notes

PR 2 implements pure provider/model profile types and validation only:
- No runtime execution
- No OpenCode binary calls
- No MCP server starts
- No Spec Kit sync
- No API keys stored in profiles

The implementation includes:
- Type definitions: `ModelCostClass`, `ModelExecutionClass`, `ModelAgentCapability`, `ModelWarmupLevel`, `ModelWarmupStatus`, `ApiKeyStoragePolicy`, `ModelRiskLevel`, `OpenCodeModelProfile`, `RedactedOpenCodeModelProfile`, `ValidationResult`
- Constant arrays for all union types
- 6 default model profiles: LM Studio, Ollama, vLLM, OpenRouter, Custom, Blocked
- Type guard functions for all union types
- `validateOpenCodeModelProfile()` with full structural and security validation
- Warm-up level policy: `canUseModelForPlanning`, `canUseModelForToolAssistedAnalysis`, `canUseModelForDemoCoding`, `canUseModelForRealRun`
- BaseURL safety validation: localhost required for local profiles, no embedded credentials
- API key safety: no `apiKey` field in profiles, consistency checks
- Evidence redaction: `redactModelProfileForEvidence()`

## Purpose

Define the model profile system for OpenCode as Positron's coding-agent/LLM provider. Models are categorized by source, cost, and capabilities. Every model must pass warm-up tests before being approved for real runs.

---

## Profile Types

```typescript
type ModelProfileId =
  | "free-local-ollama"
  | "free-local-lmstudio"
  | "free-local-vllm"
  | "free-remote-openrouter"
  | "paid-provider-custom"
  | "unknown-provider-blocked";

interface ModelProfile {
  /** Unique profile ID */
  profileId: ModelProfileId;
  /** Human-readable name */
  displayName: string;
  /** Provider type */
  providerType: "local" | "remote";
  /** Cost model */
  costModel: "free" | "paid" | "credit_limited";
  /** API base URL (for remote) */
  baseUrl?: string;
  /** Must be localhost or allowlisted */
  baseUrlMustBeLocalhost: boolean;
  /** Model reference string (e.g., "ollama/gemma3:12b") */
  modelRef?: string;
  /** Whether tool-calling is supported */
  supportsToolCalling: boolean;
  /** Whether the model can only chat (no coding) */
  chatOnly: boolean;
  /** Current warm-up level (0-4) */
  warmupLevel: 0 | 1 | 2 | 3 | 4;
  /** Most recent warm-up timestamp */
  lastWarmupAt: string | null;
  /** Whether model is selectable in UI */
  visible: boolean;
  /** Whether model is currently active */
  active: boolean;
  /** Why model is blocked (if any) */
  blockedReason?: string;
}
```

---

## Default Profiles

### free-local-ollama
```typescript
{
  profileId: "free-local-ollama",
  displayName: "Ollama (Local)",
  providerType: "local",
  costModel: "free",
  baseUrlMustBeLocalhost: true,
  supportsToolCalling: true,
  chatOnly: false,
  warmupLevel: 0,
  visible: true,
  active: false
}
```

### free-local-lmstudio
```typescript
{
  profileId: "free-local-lmstudio",
  displayName: "LM Studio (Local)",
  providerType: "local",
  costModel: "free",
  baseUrlMustBeLocalhost: true,
  supportsToolCalling: true,
  chatOnly: false,
  warmupLevel: 0,
  visible: true,
  active: false
}
```

### free-local-vllm
```typescript
{
  profileId: "free-local-vllm",
  displayName: "vLLM (Local)",
  providerType: "local",
  costModel: "free",
  baseUrlMustBeLocalhost: true,
  supportsToolCalling: true,
  chatOnly: false,
  warmupLevel: 0,
  visible: true,
  active: false
}
```

### free-remote-openrouter
```typescript
{
  profileId: "free-remote-openrouter",
  displayName: "OpenRouter (Free Tier)",
  providerType: "remote",
  costModel: "credit_limited",
  baseUrlMustBeLocalhost: false,
  supportsToolCalling: true,
  chatOnly: false,
  warmupLevel: 0,
  visible: true,
  active: false
}
```

### paid-provider-custom
```typescript
{
  profileId: "paid-provider-custom",
  displayName: "Custom Provider (Paid)",
  providerType: "remote",
  costModel: "paid",
  baseUrlMustBeLocalhost: false,
  supportsToolCalling: true,
  chatOnly: false,
  warmupLevel: 0,
  visible: true,
  active: false
}
```

### unknown-provider-blocked
```typescript
{
  profileId: "unknown-provider-blocked",
  displayName: "Unknown Provider (Blocked)",
  providerType: "remote",
  costModel: "free",
  baseUrlMustBeLocalhost: false,
  supportsToolCalling: false,
  chatOnly: true,
  warmupLevel: 0,
  visible: false,
  active: false,
  blockedReason: "Unknown provider. Must be explicitly configured."
}
```

---

## Warm-up Levels

| Level | Name | Permitted Use | Requirements |
|---|---|---|---|
| 0 | Unknown | Provider visible only | Default state |
| 1 | Analysis | Can read code, plan, research | Basic connectivity + read test passes |
| 2 | Tool-Assisted | Can use read-only tools | Level 1 + tool-calling smoke test passes |
| 3 | Demo | Can run demo coding tasks | Level 2 + write smoke test in temp workspace passes |
| 4 | Production | Can run real coding tasks with Human Approval | Level 3 + full pipeline smoke test + evidence |

---

## Warm-up Test Suites Per Level

### Level 0 → 1: Basic Connectivity
```
1. Connect to model endpoint
2. Send simple prompt ("Say hello in JSON: {greeting:...}")
3. Verify response is valid JSON
4. Measure latency (must be < 30s)
5. Verify model name matches expected
```

### Level 1 → 2: Tool-Calling Smoke
```
1. Send prompt requiring tool use ("Read file package.json and return the version")
2. Verify model calls a tool
3. Verify tool arguments are valid
4. Verify model processes tool output
5. Verify final response uses tool data
```

### Level 2 → 3: Write Smoke (Temp Workspace)
```
1. Create temp workspace directory
2. Send prompt: "Write a file hello.txt with content 'warmup-test'"
3. Verify file was created with correct content
4. Send prompt: "Read hello.txt and confirm content"
5. Clean up temp workspace
```

### Level 3 → 4: Full Pipeline Smoke
```
1. Create temp workspace with sample project
2. Run simplified Spec Kit pipeline
3. Verify artifacts generated (spec, plan, tasks)
4. Run simplified implement step
5. Verify code changes are valid
6. Run tests
7. Verify tests pass
8. Generate evidence
9. Clean up
```

---

## Chat-Only Model Detection

Models that cannot reliably use tools:

```
Test: Send prompt that explicitly requires tool calling
  "Use the read tool to open package.json and return its version field."
  
PASS: Model calls the tool and uses the response
FAIL: Model hallucinates a version or refuses to use tools
  
FAIL = chat-only → blocked from coding runs, max warmup level = 1
```

---

## Positron Provider Profile (Sync Object)

```typescript
interface PositronProviderProfile {
  profileId: string;
  /** OpenCode binary path */
  opencodeBinaryPath: string;
  /** OpenCode version */
  opencodeVersion: string;
  /** Path to Positron-managed OpenCode config */
  opencodeConfigPath: string;
  /** Active model profile ID */
  opencodeModelProfileId: string;
  /** Active model reference */
  opencodeModelRef: string;
  /** Spec Kit binary path */
  specKitBinaryPath: string;
  /** Spec Kit version */
  specKitVersion: string;
  /** Spec Kit source (ONLY github/spec-kit) */
  specKitInstallSource: "github/spec-kit";
  /** Spec Kit version ref (tag) */
  specKitInstallRef: string;
  /** Spec Kit integration mode */
  specKitMode: "standalone_cli" | "opencode_slash_commands" | "adapter_bridge";
  /** MCP warm-up status */
  mcpWarmupStatus: "pass" | "partial" | "fail" | "unknown";
  /** Model warm-up status */
  modelWarmupStatus: "pass" | "partial" | "fail" | "unknown";
  /** Ready for demo coding runs */
  readyForDemoRuns: boolean;
  /** Ready for production runs (requires Human Approval) */
  readyForRealRuns: boolean;
}
```

---

## Sync Rules

1. **OpenCode profile without Spec Kit** → blocks spec-driven runs
2. **Model switch** → invalidates warm-up, resets to level 0
3. **Spec Kit version change** → invalidates provider profile sync
4. **Blueprint desired model** → triggers sync check
5. **Positron shows sync status** → visible in UI
6. **Tool Gateway displays sync status** → read-only
