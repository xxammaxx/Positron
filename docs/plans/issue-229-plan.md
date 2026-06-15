# /speckit.plan — Issue #229: Tool Gateway + MCP + OpenCode Provider + Free Models + Spec Kit Sync + Oversight UI + Blueprint Launcher

**Issue:** [#229](https://github.com/xxammaxx/Positron/issues/229)
**Created:** 2026-06-15
**Status:** Draft — Awaiting Human Approval
**PR #228 Dependency:** OPEN, MERGEABLE — plan based on `positron/issue-224-tool-monitoring-dashboard` branch

---

## Context

### What Exists (from PR #228)

| Capability | Status |
|---|---|
| `GET /api/tool-gateway/status` | ✅ Operating |
| `GET /api/tool-gateway/tools` | ✅ Operating |
| `ToolGatewayPanel.tsx` in Dashboard | ✅ Rendering |
| `packages/tool-gateway/src/types.ts` (ToolDefinition, GatewayConfig, etc.) | ✅ Defined |
| `packages/tool-gateway/src/registry.ts` (allowlist, sealing, freeze) | ✅ Operating |
| `packages/shared/src/opencode-types.ts` (OpenCodeHealth, OpenCodeAdapter, etc.) | ✅ Defined |
| `packages/shared/src/speckit-types.ts` (SpecKitHealth, SpecKitAdapter, etc.) | ✅ Defined |
| Gateway default DISABLED | ✅ Enforced |
| MCP exposure default DISABLED | ✅ Enforced |
| No tool execution from UI | ✅ Enforced |
| No POST execute endpoints | ✅ Enforced |
| No handler serialization | ✅ Enforced |

### What Exists (from Issue #229 Spec Phase)

| Document | Path |
|---|---|
| Architecture Scanner Report | `docs/release/architecture-scan-mcp-opencode-blueprint-tool-gateway.md` |
| Formal Specification (14 sections) | `docs/specs/tool-gateway-mcp-opencode-provider-free-models-speckit-sync-oversight-blueprint-scanner.md` |
| Verification Contract (88 test requirements) | `docs/testing/verification-contract-*.md` |
| Tool Gateway Integration Policy | `docs/architecture/tool-gateway-mcp-provider-integration.md` |
| OpenCode Model Profile Registry | `docs/architecture/opencode-model-profile-registry.md` |
| Required MCP Server Inventory (12 servers) | `docs/security/required-mcp-server-inventory.md` |
| MCP Capability Manifest Schema | `docs/security/mcp-capability-manifest-schema.md` |
| Stop/Ask Protocol Extended | `docs/security/stop-ask-protocol.md` |
| MCP Warm-up Verification Contract | `docs/testing/verification-contract-mcp-warmup.md` |

### What Must Be Preserved

- Tool Gateway monitoring-only default
- No duplicate architecture (reuse existing hooks)
- No execution from ToolGatewayPanel
- No POST execute endpoints
- No handler serialization
- No secrets in metadata, logs, evidence
- Issue #205 untouched
- Gateway default DISABLED
- MCP exposure default DISABLED

---

## Dependency Decision: PR #228

**Status:** PR #228 is OPEN and MERGEABLE.

**Decision:** This plan is written against the current branch `positron/issue-224-tool-monitoring-dashboard` which is the PR #228 branch. All implementation will start from this branch.

**Rationale:** The Tool Gateway baseline from #228 is the foundation. Working on the same branch avoids merge conflicts and ensures consistency. If PR #228 is merged before Issue #229 implementation begins, rebase onto updated `main`.

**Note on CI Status:** PR #228 status checks show some FAILURE states (build-and-test, mutation-fast, mutation-safety, e2e-playwright). These are pre-existing from #224 scope and must be resolved as part of PR #228 merge. They are not blockers for planning Issue #229, but must be addressed before any implementation PR from this branch.

---

## Implementation Phases

### Phase A — Tool Gateway Extension Foundation (Types + Metadata)

**Goal:** Extend existing Tool Gateway architecture with MCP/provider/model metadata fields. No new architecture — pure extension of existing hooks.

**What Changes:**
1. **`packages/tool-gateway/src/types.ts`** — add `category`, `isMcpServer`, `mcpServerName`, `warmupStatus` to `ToolDefinition`
2. **`apps/web/src/types.ts`** — extend `ToolGatewayStatus` with `mcpServers[]` and `providerStatus`; extend `ToolGatewayTool` with `mcpServerName`, `warmupStatus` (category already exists on the frontend type, line 140)
3. **`packages/shared/src/types.ts`** — add shared type category enums (`ToolCategory`, `WarmupStatus`, `MCPStatus`)
4. **`apps/server/src/index.ts`** — extend `GET /api/tool-gateway/status` response with `mcpServers` and `providerStatus` (read-only, computed from existing data, lines ~3900-3942)
5. **`apps/server/src/index.ts`** — extend `GET /api/tool-gateway/tools` response with `category`, `mcpServerName`, `warmupStatus` fields (lines ~3917-3942)
6. **`apps/web/src/api.ts`** — update `getToolGatewayStatus()` and `getToolGatewayTools()` response types
7. **`apps/web/src/components/dashboard/ToolGatewayPanel.tsx`** — add MCP status card, provider status card, category filters (NO execution buttons)
8. **Tests** — extend existing `ToolGatewayPanel.test.tsx` with MCP/provider rendering tests

**Must Reuse:**
- Existing `ToolDefinition` interface (extend, don't replace)
- Existing `ToolGatewayStatus` interface (extend, don't replace)
- Existing `GET /api/tool-gateway/status` route (add fields, don't create new route)
- Existing `GET /api/tool-gateway/tools` route (add fields, don't create new route)
- Existing `ToolGatewayPanel.tsx` (add cards, don't create new panel)

**Must NOT Touch:**
- `packages/tool-gateway/src/gateway.ts` (execution logic)
- `packages/tool-gateway/src/scanner.ts` (no changes needed)
- `apps/web/src/components/dashboard/DashboardPage.tsx` layout (panel already renders)
- Any POST route
- Any handler serialization logic

**Forbidden:**
- No POST execute endpoints
- No UI execution buttons
- No handler serialization
- Gateway default: stays DISABLED
- MCP exposure default: stays DISABLED

**Acceptance Criteria:**
- `GET /api/tool-gateway/status` returns `mcpServers` array (empty initially)
- `GET /api/tool-gateway/status` returns `providerStatus` with OpenCode fields
- `GET /api/tool-gateway/tools` returns tools with `category`, `mcpServerName`, `warmupStatus`
- `ToolGatewayPanel` renders MCP Status card
- `ToolGatewayPanel` renders Provider Status card
- No execute buttons anywhere in UI
- No new POST endpoints
- Secret scan passes
- Existing tests continue passing

---

### Phase B — Provider / Model Profile Foundation (Types + Validation)

**Goal:** Model OpenCode as Positron's coding-agent provider. Define model profiles for free/local and paid/remote models with warm-up level gating. No runtime execution — pure type/model definitions.

**What Changes:**
1. **`packages/shared/src/model-profile-types.ts`** (NEW) — `ModelProfileId`, `ModelProfile`, `WarmupLevel`, `PositronProviderProfile` types as defined in `docs/architecture/opencode-model-profile-registry.md`
2. **`packages/shared/src/provider-types.ts`** (NEW) — `ProviderType`, `OpenCodeProviderStatus`, `ProviderDetectionResult`, `ProviderInstallRequest` types
3. **`packages/shared/src/types.ts`** — re-export new types from model-profile-types and provider-types
4. **`packages/shared/src/opencode-types.ts`** — extend `OpenCodeHealth` with `installPath`, `configPath`; extend `OpenCodeRunInput` with `modelProfileId`, `modelRef`, `warmupStatus`
5. **`apps/server/src/index.ts`** — add `GET /api/providers/opencode/status` (read-only detection)
6. **`apps/web/src/types.ts`** — add `ModelProfile`, `ProviderStatus`, `OpenCodeProviderStatus` frontend types
7. **`apps/web/src/api.ts`** — add API methods for provider status
8. **Default model profiles** — hardcoded in shared constants (6 profiles: ollama, lmstudio, vllm, openrouter, custom, blocked)
9. **Validation logic** — `validateModelProfile()` function: chat-only detection blocker, warmup gate enforcement, baseURL localhost check, API key redaction
10. **Tests** — model profile validation tests, warmup level gate tests, API key leak tests

**Must Reuse:**
- Existing `OpenCodeAdapter` interface (extend with model/profile fields)
- Existing `OpenCodeHealth` type (extend with install/config paths)

**Must NOT Touch:**
- `packages/opencode-adapter/src/` (runtime behaviour — types only in this phase)
- No OpenCode binary execution
- No model runtime

**Forbidden:**
- API keys in any API response
- Chat-only models approved for coding runs
- Level 0-3 models approved for real runs without human approval
- Non-localhost baseURL for local providers

**Acceptance Criteria:**
- 6 model profiles exist (ollama, lmstudio, vllm, openrouter, custom, blocked)
- Chat-only models blocked from coding runs (validation returns BLOCKED)
- API key fields never in API responses (redacted/omitted)
- Non-localhost baseURL rejected for local providers
- Warm-up level 0-3 blocks real runs
- Warm-up level 4 allows real runs only with Human Approval
- `unknown-provider-blocked` is invisible and always blocked

---

### Phase C — Spec Kit Sync Foundation (Types + Re-Sync Rules)

**Goal:** Define the synchronization contract between OpenCode model profiles and Spec Kit configuration. Implement re-sync invalidation logic in type definitions and validation rules.

**What Changes:**
1. **`packages/shared/src/speckit-types.ts`** — extend `SpecKitHealth` with `installSource`, `installRef`; extend `SpecKitRunInput` with `providerProfileId`, `syncStatus`; add `SpecKitSyncStatus` type
2. **`packages/shared/src/sync-types.ts`** (NEW) — `ProviderProfileSyncStatus`, `ReSyncTrigger`, `SyncInvalidationReason` types
3. **`packages/shared/src/sync-validation.ts`** (NEW) — `checkReSyncNeeded()` function implementing the 10 re-sync triggers
4. **`apps/server/src/index.ts`** — add `GET /api/speckit/status` (read-only), `POST /api/speckit/sync-with-opencode-profile` (validates sync, does not execute)
5. **`apps/web/src/types.ts`** — add `SpecKitSyncStatus`, `ProviderProfileSync` frontend types
6. **Tests** — re-sync trigger tests (10 triggers), Spec Kit version requirement tests, source validation tests

**Re-Sync Triggers (10 defined):**
1. OpenCode binary path changed
2. OpenCode version changed
3. OpenCode config path changed
4. Model profile changed
5. Model warm-up result expired
6. Spec Kit version changed
7. Spec Kit install ref changed
8. Spec Kit mode changed
9. Blueprint preferred model changed
10. MCP warm-up status invalidated

**Must Reuse:**
- Existing `SpecKitAdapter` interface (extend with sync fields)
- Existing `SpecKitHealth` type (extend with source/ref)

**Must NOT Touch:**
- `packages/speckit-adapter/src/` (runtime behaviour — types only)
- No Spec Kit binary execution
- No Spec Kit install from non-github/spec-kit source

**Forbidden:**
- Spec Kit without version tag
- Spec Kit from non-github/spec-kit source
- Auto-sync without human approval for real runs
- Silent sync failure (must surface to Oversight UI)

**Acceptance Criteria:**
- `checkReSyncNeeded()` returns `{ needs_resync: true, reasons: [] }` when any trigger fires
- Model change invalidates sync status to `needs_resync`
- Spec Kit version change invalidates sync status
- OpenCode profile without Spec Kit blocks spec-driven runs
- Spec Kit without version tag rejected
- Non-github/spec-kit source rejected
- `adapter_bridge` mode is preferred and surfaced

---

### Phase D — MCP Warm-up Foundation (Contract + Evidence Model)

**Goal:** Define the warm-up protocol contract and evidence model for MCP server verification. Real runs MUST be blocked when warm-up is not PASS. No actual MCP server execution in this phase — only the contract and validation logic.

**What Changes:**
1. **`packages/shared/src/mcp-warmup-types.ts`** (NEW) — `McpWarmupPhase`, `McpWarmupStep`, `McpWarmupResult`, `McpWarmupSummary`, `McpWarmupStepResult` types
2. **`packages/shared/src/mcp-warmup-validator.ts`** (NEW) — `validateWarmupResult()` function: checks all 9 phases, enforces MUST vs SHOULD semantics, determines pass/partial/fail
3. **`packages/shared/src/mcp-capability-types.ts`** (NEW) — `McpCapabilityManifest` interface matching `docs/security/mcp-capability-manifest-schema.md`
4. **`packages/shared/src/types.ts`** — re-export warmup and capability types
5. **`apps/server/src/index.ts`** — extend `GET /api/tool-gateway/status` `mcpServers` with warmup status per server
6. **Tests** — warm-up phase validation tests, blocking rule tests, redaction tests

**Warm-up Phases (from spec and verification contract):**
1. Connectivity (initialize, verify identity)
2. Tool Discovery (list_tools, load manifest)
3. Allowlist Validation (forbidden capabilities check, egress check)
4. Read-Only Smoke Test
5. Write Smoke Test (temp workspace)
6. Forbidden Tool Check
7. Rate Limit Check
8. Evidence Generation (redacted)
9. Final Status (pass/partial/fail)

**Must Reuse:**
- Existing `POST /api/evidence` for warm-up evidence storage
- Existing Tool Gateway status endpoint for reporting

**Must NOT Touch:**
- `packages/tool-gateway/src/mcp-adapter.ts` (runtime — only types/contract in this phase)
- No actual MCP servers started
- No actual warm-up execution

**Forbidden:**
- Real runs when warm-up != pass
- Secrets in warm-up evidence
- Forbidden tools passing warm-up

**Acceptance Criteria:**
- `validateWarmupResult()` correctly classifies pass/partial/fail
- All MUST-fail steps cause overall fail
- All SHOULD-fail steps cause partial
- Warm-up failure blocks real runs (gate rule enforced)
- Required MCP list is validated (12 servers from inventory)
- Evidence requirements defined per MCP server
- Redaction check enforced on evidence output

---

### Phase E — Oversight UI / Human Question Queue (API + Types)

**Goal:** Define the human oversight question model, API endpoints, and UI component contracts. Enable runs to pause for human decisions (ALLOW/DENY/ASK_MORE/PAUSE_RUN/ABORT_RUN). Timeout NEVER results in ALLOW.

**What Changes:**
1. **`packages/shared/src/oversight-types.ts`** (NEW) — `OversightQuestion`, `OversightAnswer`, `QuestionState`, `OversightDecision`, `AttentionItem` types
2. **`apps/server/src/index.ts`** — add read-only oversight API endpoints:
   - `GET /api/oversight/questions` (list pending questions)
   - `GET /api/oversight/questions/:id` (get question detail)
   - `GET /api/oversight/attention` (get attention queue summary)
   - `GET /api/oversight/mcp-status` (aggregated MCP warm-up status)
   - `GET /api/oversight/provider-status` (aggregated provider status)
3. **`apps/server/src/index.ts`** — add write oversight API endpoints (gated):
   - `POST /api/oversight/questions/:id/answer` (submit decision: ALLOW / DENY / ASK_MORE / REQUIRE_REVIEW)
   - `POST /api/oversight/questions/:id/pause-run` (pause run)
   - `POST /api/oversight/questions/:id/abort-run` (abort run)
   Note: `DENY` is submitted via `/answer` with `decision: "DENY"` — no separate deny endpoint needed (avoids duplicate API surface)
4. **`apps/web/src/types.ts`** — add `OversightQuestion`, `OversightDecision` frontend types
5. **`apps/web/src/api.ts`** — add API methods for oversight endpoints
6. **UI component contracts** — define component interfaces (not implementation):
   - `HumanQuestionQueue` component contract
   - `ApprovalRequestCard` component contract
   - `McpStatusPanel` component contract
   - `ProviderStatusPanel` component contract
7. **Route planning** — define `/oversight` route in `App.tsx` (component placeholder only)
8. **Tests** — timeout behavior tests (NEVER ALLOW), answer storage tests, redaction in answers

**Must Reuse:**
- Existing SSE broadcaster for oversight event notifications
- Existing attention queue concept from Dashboard (extend with oversight questions)
- Existing Evidence system for answer storage

**Must NOT Touch:**
- DashboardPage layout (oversight is a separate page)
- Existing attention queue (extend, don't replace)

**Forbidden:**
- Timeout resulting in ALLOW
- Critical risk defaulting to anything but DENY or ASK_HUMAN
- OpenCode auto-approving risky actions
- Destructive actions without human approval
- Secrets in answer payloads

**Acceptance Criteria:**
- Question appears in queue when human input needed
- Question appears when MCP warm-up fails
- Question appears when model warm-up fails
- Question appears when Spec Kit sync fails
- ALLOW works for permitted actions
- DENY blocks permanently
- Timeout results in PAUSE_RUN (never ALLOW)
- Critical risk defaults to DENY/ASK_HUMAN
- Answer endpoint stores redacted answer
- `answerPayload` does not contain secrets
- `/oversight` route is accessible (placeholder OK)

---

### Phase F — Blueprint Launcher Foundation (Contract + Validation)

**Goal:** Define the blueprint file parsing, validation, and gate-check contract. Clarify that "blueprint start-run" is NOT tool execution — it creates a run plan, validates gates, and requests human approval. Actual provider execution happens separately through gated pipeline.

**What Changes:**
1. **`packages/shared/src/blueprint-types.ts`** (NEW) — `BlueprintFile`, `BlueprintValidationResult`, `BlueprintRunPlan`, `BlueprintGateStatus`, `BlueprintSection`, `VerificationContractDraft`, `ContextManifestDraft` types
2. **`packages/shared/src/blueprint-validator.ts`** (NEW) — `validateBlueprint()` pure function:
   - Parse Markdown sections
   - Detect forbidden content (secrets, auto-merge, unrestricted MCP, Human Approval bypass)
   - Extract allowed content (preferred model, MCP list, Spec Kit mode, cost preference)
   - Generate Verification Contract draft
   - Generate Context Manifest draft
3. **`apps/server/src/index.ts`** — add blueprint API endpoints:
   - `POST /api/blueprints/validate` (parse + validate, no execution)
   - `POST /api/blueprints/import` (store validated blueprint metadata — pure storage, no side effects, no execution)
   - `GET /api/blueprints/:id` (retrieve imported blueprint)
   - `POST /api/blueprints/:id/create-run-plan` (generate run plan, no execution)
   - `POST /api/blueprints/:id/start-run` (gate check + human approval request, no execution)
4. **`apps/web/src/types.ts`** — add blueprint frontend types
5. **`apps/web/src/api.ts`** — add blueprint API methods
6. **Route planning** — define `/blueprints` route in `App.tsx` (component placeholder only)
7. **Tests** — validation tests (secrets, auto-merge, unrestricted MCP), gate check tests

**Blueprint Semantics Clarification (Critical):**
```
Blueprint start-run != Tool execution
Blueprint start-run = Run Plan Creation + Gate Validation + Human Approval Request
Provider execution happens LATER through the gated Provider/MCP pipeline

Timeline:
  1. User imports blueprint file
  2. Positron validates blueprint (secrets, policies, gates)
  3. Positron creates Run Plan (what to execute, in what order)
  4. Positron checks all gates (MCP warm-up, model warm-up, Spec Kit sync, Human Approval)
  5. Positron creates Oversight Question: "Approve this run?"
  6. Human answers ALLOW
  7. Provider pipeline executes (NOT from the blueprint endpoint)
```

**Must Reuse:**
- Existing Evidence system for blueprint validation evidence
- Existing Stop/Ask protocol for blueprint-related stops

**Must NOT Touch:**
- Tool Gateway execute logic (separate pipeline)
- Dashboard BlueprintPanel (separate issue for integration)

**Forbidden:**
- Auto-start from blueprint without all gates green
- Blueprint with secrets passing validation
- Blueprint with auto-merge request passing validation
- Blueprint with unrestricted MCP request passing validation
- Blueprint without Human Approval policy silently accepted

**Acceptance Criteria:**
- Blueprint with secrets → validation FAIL
- Blueprint with auto-merge request → validation FAIL
- Blueprint with unrestricted MCP request → validation FAIL
- Blueprint without Human Approval policy → validation PARTIAL (warning)
- Blueprint generates Verification Contract draft
- Blueprint generates Context Manifest draft
- Blueprint extracts required MCP list
- Blueprint extracts preferred model profile
- `start-run` blocked when gates not all PASS
- `start-run` creates oversight question (not execution)

---

### Phase G — First Safe Implementation Slice

**Goal:** Implement the smallest, safest subset that validates the architecture without risking anything.

**Recommendation: PR 1 — Shared Types + Tool Gateway Metadata Extension + Tests**

**Scope:**
1. Extend `packages/tool-gateway/src/types.ts` with `category`, `mcpServerName`, `warmupStatus` fields on `ToolDefinition`
2. Add shared type enums in `packages/shared/src/types.ts` (`ToolCategory`, `WarmupStatus`)
3. Extend `apps/web/src/types.ts` with MCP/provider fields on `ToolGatewayStatus` and `ToolGatewayTool`
4. Extend `GET /api/tool-gateway/status` to include computed `mcpServers: []` (empty array, no real MCP data yet)
5. Extend `GET /api/tool-gateway/tools` to include `category`, `mcpServerName`, `warmupStatus` on existing tool definitions
6. Update `apps/web/src/api.ts` response types to match
7. Extend `ToolGatewayPanel.tsx` with MCP Status card and Provider Status card (read-only, no interactions)
8. Extend tests in `ToolGatewayPanel.test.tsx`

**Files Likely Affected (8-12 files):**
```
packages/tool-gateway/src/types.ts          — add fields to ToolDefinition
packages/shared/src/types.ts                — add category/warmup enums
packages/shared/src/constants.ts            — add category constants
apps/web/src/types.ts                       — extend ToolGatewayStatus, ToolGatewayTool
apps/web/src/api.ts                         — update return types
apps/server/src/index.ts                    — extend status/tools responses (lines ~3900-3950)
apps/web/src/components/dashboard/ToolGatewayPanel.tsx — add MCP/provider cards
apps/web/src/__tests__/ToolGatewayPanel.test.tsx — add card rendering tests
packages/tool-gateway/src/__tests__/types.test.ts — add type extension tests
apps/server/src/__tests__/integration.test.ts — add response shape assertions
```

**Forbidden Changes in This PR:**
- No new POST endpoints
- No execution buttons in UI
- No handler serialization
- No MCP server startup
- No OpenCode runtime
- No blueprint execution
- No real MCP data (only empty/computed placeholders)

**Acceptance Criteria:**
- TypeScript compilation passes for all packages
- `vitest run` passes in `packages/tool-gateway`
- `vitest run` passes in `packages/shared`
- `vitest run` passes in `apps/web`
- `vitest run` passes in `apps/server`
- Secret scan passes
- `GET /api/tool-gateway/status` response includes `mcpServers: []` and `providerStatus: { ... }`
- `GET /api/tool-gateway/tools` tools include `category`, `mcpServerName`, `warmupStatus` fields
- ToolGatewayPanel renders MCP Status card (shows "No MCP servers connected")
- ToolGatewayPanel renders Provider Status card (shows "OpenCode not installed")
- No execute buttons in rendered HTML
- No POST `/api/tool-gateway/execute` endpoint exists
- No regressions in existing tests

---

## Risk Resolutions

### 1. curl pipe-bash Trust Verification

**Risk:** OpenCode installation from `curl -fsSL https://opencode.ai/install | bash` is insecure without verification.

**Resolution Plan (implemented in Phase B or dedicated install PR):**

```typescript
// Safe install protocol — NOT "curl | bash" only
interface SafeInstallProtocol {
  // Step 1: Display command, do NOT execute
  displayCommand: string;
  
  // Step 2: Require human approval via Oversight UI
  requireApproval: true;
  
  // Step 3: Allowlisted download URL (exact match)
  allowedDownloadUrl: "https://opencode.ai/install";
  
  // Step 4: Use Positron-managed install directory
  installDir: "~/.positron/tools/bin";
  
  // Step 5: No sudo
  useSudo: false;
  
  // Step 6: Verify exit code
  verifyExitCode: true;
  
  // Step 7: Verify binary with --version
  verifyVersion: true;
  
  // Step 8: Optional checksum verification (if upstream provides)
  checksumUrl?: string;
  checksumAlgorithm?: "sha256" | "sha512";
  
  // Step 9: Fallback to manual instructions if automated install fails
  manualInstructions: string;
}
```

Trust verification gates:
- Download URL must match allowlist exactly
- Install directory must be within `~/.positron/`
- No sudo permitted
- Binary must respond to `--version` after install
- Optional: verify checksum/signature against signed release artifact
- If any gate fails: show error + manual install instructions

### 2. Spec Kit Re-Sync Triggers

**Risk:** Without explicit re-sync logic, an outdated Spec Kit profile could be used with a different model/config.

**Resolution Plan:**

The `checkReSyncNeeded()` function (Phase C) compares current profile hash against last known hash. Any change to these fields triggers `needs_resync`:

```typescript
function checkReSyncNeeded(
  current: PositronProviderProfile,
  lastSynced: PositronProviderProfile
): { needs_resync: boolean; reasons: string[] }
```

Invalidation cascade:
1. `opencodeBinaryPath` change → `needs_resync`
2. `opencodeVersion` change → `needs_resync`
3. `opencodeConfigPath` change → `needs_resync`
4. `opencodeModelProfileId` change → `needs_resync`
5. `modelWarmupStatus` expired → `needs_resync`
6. `specKitVersion` change → `needs_resync`
7. `specKitInstallRef` change → `needs_resync`
8. `specKitMode` change → `needs_resync`
9. Blueprint `preferredModelRef` change → `needs_resync`
10. Any `mcpWarmupStatus` change → `needs_resync`

When `needs_resync`:
- `readyForRealRuns` → `false`
- `readyForDemoRuns` → `false`
- Oversight question created
- Provider profile status updated in UI

### 3. Blueprint start-run Ambiguity

**Risk:** "Blueprint start-run" could be misinterpreted as tool execution.

**Resolution Plan:**

Clear semantic separation documented everywhere:

| Term | Meaning | NOT |
|---|---|---|
| `POST /api/blueprints/:id/create-run-plan` | Generate an execution plan (what to run, in what order, with what tools) | NOT execution |
| `POST /api/blueprints/:id/start-run` | Validate all gates, request human approval, transition run to WAITING_FOR_HUMAN | NOT tool execution |
| Provider pipeline | The actual tool execution through Tool Gateway gates | Only this is execution |

API naming reflects this:
- `create-run-plan` → planning
- `start-run` → gate check + approval request
- Execution happens via existing Tool Gateway pipeline (separate issue)

Documentation clarifications:
- API comments explicitly state "Creates run plan, does NOT execute"
- UI labels: "Create Run Plan" not "Execute"
- UI labels: "Request Approval" not "Start"
- Blueprint validation result includes: `executionReady: boolean` which is only true after all gates + human approval

---

## Overall Acceptance Criteria for All 7 Phases

- [ ] Tool Gateway extended with MCP/provider metadata (no duplicate arch)
- [ ] 6 model profiles defined (free-local × 3, free-remote, paid, blocked)
- [ ] Model warm-up levels 0-4 enforced
- [ ] 10 re-sync triggers defined and validated
- [ ] MCP warm-up 9-phase protocol typed and validated
- [ ] Oversight question model + API endpoints defined
- [ ] Blueprint validation + run plan creation (not execution)
- [ ] Timeout never ALLOW
- [ ] curl pipe-bash has trust verification plan
- [ ] Blueprint start-run semantics unambiguous
- [ ] First safe slice defined as types + metadata only
- [ ] No execution endpoints created
- [ ] No duplicate architecture created
- [ ] #205 untouched
- [ ] All tests passing
- [ ] Secret scan clean

---

## Non-Goals (Explicitly Out of Scope for Issue #229)

- Issue #205 implementation
- Live tool call tracking (separate issue)
- Automatic gateway enable
- Automatic MCP exposure
- Unrestricted MCP servers
- Paperclip, OpenClaw, researcher tools
- Production deployment
- OpenCode actual binary execution (types/contract only)
- Spec Kit actual binary execution (types/contract only)
- MCP server actual startup (warm-up contract only)
- Real model inference (types/validation only)

---

## Next Steps After Plan Approval

1. Human reviews and approves this plan
2. Human reviews and approves task decomposition (`docs/plans/issue-229-tasks.md`)
3. Execute `/speckit.implement PR 1 — Shared Types + Tool Gateway Metadata Extension + Tests`
4. Sequential implementation through all 7 phases
5. Each phase creates its own PR with gate checks

---

## Implementation Status (PR Chain)

| PR | Scope | Status | Branch |
|---|---|---|---|
| #228 | Tool Gateway Monitoring | OPEN, MERGEABLE | `positron/issue-224-tool-monitoring-dashboard` |
| #230 | PR 1 — Tool Gateway Metadata Extension | OPEN, MERGEABLE | `positron/issue-229-pr1-tool-gateway-metadata` |
| #231 | PR 2 — Provider/Model Profile Types | OPEN, MERGEABLE | `positron/issue-229-pr2-provider-model-profiles` |
| #232 | PR 3 — Spec Kit Sync Types | OPEN, MERGEABLE | `positron/issue-229-pr3-speckit-sync-types` |
| #233 | PR 4 — MCP Warm-up Contract | OPEN, MERGEABLE | `positron/issue-229-pr4-mcp-warmup-contract` |
| #234 | PR 5 — MCP Warm-up Runtime Foundation | OPEN, MERGEABLE | `positron/issue-229-pr5-mcp-warmup-runtime` |
| #235 | PR 6 — OpenCode Provider Detection | OPEN, MERGEABLE | `positron/issue-229-pr6-opencode-provider-detection` |
| #236 | PR 7 — Oversight Human Question Queue | OPEN, MERGEABLE | `positron/issue-229-pr7-oversight-human-queue` |
| PR 8 | Oversight Approval Wiring (Install + MCP Gates) | **IMPLEMENTED** | `positron/issue-229-pr8-oversight-approval-gates` |

### PR 8 Summary

PR 8 wires Oversight approvals into provider install requests and MCP warm-up gates.
Approvals store decisions only. Approvals do not execute installs, tools, OpenCode, MCP or Spec Kit.
Required MCP failures remain blocking regardless of human ALLOW decisions.
