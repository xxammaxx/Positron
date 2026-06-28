# Specification: DeterministicFixtureAgent + OpenCodeDryRunAgent

**Issue:** #263  
**Status:** Draft (Specify Phase)  
**Date:** 2026-06-20  
**Author:** Issue Orchestrator (human-approved prompt)  
**Phase:** 1 — Specify Only (no implementation, no plan, no tasks)

---

## 1. Purpose

Positron needs a deterministic, side-effect-free way to exercise OpenCode adapter flows for dogfood, prompt, adapter, and pipeline tests without invoking real LLMs, writing files, pushing branches, or creating pull requests.

This replaces the high-risk intent from `stash@{0}` with a formal SpecKit specification. The stash contained export references to non-existent modules and stale documentation claims. This spec defines the WHAT and WHY without committing to the stale implementation.

## 2. Non-Goals

- ❌ Apply `stash@{0}` or extract files from it
- ❌ Recover stale `docs/status/*` claims without validation
- ❌ Create real GitHub PRs from dry-run execution
- ❌ Perform real filesystem writes during dry-run (except explicit test fixture output in controlled temp/sandbox paths)
- ❌ Invoke real LLMs
- ❌ Change GitHub Actions or remote CI
- ❌ Solve existing Biome lint, E2E tracing, or mutation failures
- ❌ Change `.opencode/config.json`
- ❌ Implement code during this specify phase
- ❌ Write to packages/, docs/status/, or any source directory

## 3. Background

### 3.1 stash@{0} Risk Assessment (Read-Only Evidence)

The stash `stash@{0}` contains references to planned agent modules but is HIGH RISK:

| Stash File | Status | Risk |
|------------|--------|------|
| `packages/shared/src/agent-types.ts` | NEW (431 lines) | Does not exist on `main` — contains `AgentDeclaration`, `CodingAgentAdapter`, `AgentCapabilityRegistry`, `ExecutionMode` type |
| `packages/opencode-adapter/src/index.ts` | MODIFIED (+4) | Exports `DeterministicFixtureAgent` and `OpenCodeDryRunAgent` from files that do NOT exist |
| `packages/opencode-adapter/src/real-adapter.ts` | MODIFIED (+2) | Re-exports `DeterministicFixtureAgent` from non-existent file |
| `docs/status/current-capabilities.md` | MODIFIED (+7) | Claims 42 tests PASS for modules that don't exist — STALE |
| `docs/status/known-limitations.md` | MODIFIED (+2) | Minor date/scope update |

**Critical finding:** `deterministic-fixture-agent.ts` and `dry-run-agent.ts` do NOT exist in the stash at all. The stash only adds export statements pointing at these missing modules. Direct stash application would break TypeScript compilation and module resolution.

**Verdict:** Stash must remain untouched. Use its content only as aspirational guidance for this specification.

### 3.2 Existing Relevant Code

The following already exist on `main` and are integration points:

| Module | File | Purpose |
|--------|------|---------|
| `@positron/shared` | `opencode-types.ts` | `OpenCodePhase`, `OpenCodeRunInput`, `OpenCodeAdapter` interface |
| `@positron/opencode-adapter` | `fake-adapter.ts` | `FakeOpenCodeAdapter` — configurable test double |
| `@positron/opencode-adapter` | `real-adapter.ts` | `RealOpenCodeAdapter` — real OpenCode CLI execution |
| `@positron/sandbox` | `dogfood-fixture.ts` | `applyDogfoodFixtureChange()` — sandbox-level fixture, uses `POSITRON_ENABLE_DOGFOOD_FIXTURE_CHANGE` |
| `@positron/shared` | `interfaces.ts` | SpecKit/OpenCode adapter interfaces |

### 3.3 Gap Analysis

| Capability | Exists on main? | Gap |
|------------|----------------|-----|
| Deterministic fixture agent for OpenCode adapter | No | `FakeOpenCodeAdapter` is configurable but not fixture-driven |
| Dry-run agent with safety gates | No | `RealOpenCodeAdapter` has no dry-run mode — always executes real commands |
| `ExecutionMode` type (`fixture` / `dry-run` / `real`) | No | Not defined anywhere |
| Shared agent capability types (`AgentDeclaration`, `CodingAgentAdapter`) | No | Stash has a draft, but it's coupled with missing modules |
| Structured evidence for simulated runs | Partial | `FakeOpenCodeAdapter` returns results but without `executionMode` tagging |
| Docs evidence for fixture/dry-run capabilities | No | `docs/status/` current-capabilities and known-limitations don't reference this feature |

## 4. User Stories

### US1 — Deterministic Fixture Execution (P0)

**As a:** Positron maintainer  
**I want to:** run deterministic fixture-based agent tests  
**So that:** adapter and pipeline behavior is reproducible across repeated local runs without network/LLM dependency

**Acceptance Criteria:**
- Given the same fixture input, the agent produces the same structured result
- The result includes evidence explaining what was simulated
- The agent does not call external LLMs or network services
- Non-deterministic values (timestamps, random IDs) are either avoided or explicitly normalized
- Fixture inputs are clearly separated from fixture logic (data-driven)

### US2 — Safe OpenCode Dry Run (P0)

**As a:** Positron maintainer  
**I want to:** dry-run OpenCode adapter flows  
**So that:** I can validate planned actions without modifying files, pushing branches, creating PRs, or invoking real OpenCode side effects

**Acceptance Criteria:**
- Dry-run mode reports intended actions without executing them
- Write, push, merge, PR create, branch delete, force-push operations are default-deny
- Any attempted forbidden action is recorded as a blocked operation with reason
- The dry-run result is machine-readable (structured JSON) and human-readable (summary)
- No real file, GitHub, or OpenCode side effects occur
- Dry-run works without OpenCode CLI installed

### US3 — Capability/Type Foundation (P1)

**As a:** developer  
**I want to:** have shared agent capability declarations  
**So that:** future agent adapters can be typed consistently without breaking current APIs

**Acceptance Criteria:**
- New shared types, if needed, integrate with existing `packages/shared/src/opencode-types.ts` and its exports
- No export points reference non-existent files
- TypeScript compilation (`tsc -b`) passes locally
- `npm run typecheck` passes
- No broad API rewrite occurs without explicit plan approval
- The `ExecutionMode` type (`'fixture' | 'dry-run' | 'real'`) is defined and usable

### US4 — Evidence-Backed Status Documentation (P2)

**As a:** maintainer  
**I want to:** have status/capability documentation generated from actual evidence  
**So that:** docs do not claim tests or capabilities that do not exist

**Acceptance Criteria:**
- No status doc may claim test counts without local test evidence
- Any new capability doc links to or summarizes evidence from actual runs
- Stale `docs/status/*` content from `stash@{0}` is not copied blindly
- Documentation generation is separated from capability implementation

## 5. Functional Requirements

| ID | Requirement |
|----|-------------|
| FR1 | The system MUST define deterministic fixture execution behavior for OpenCode adapter flows |
| FR2 | The system MUST define dry-run behavior that reports intended actions without side effects |
| FR3 | The system MUST block or simulate write/push/merge/PR-create/branch-delete operations during dry-run |
| FR4 | The system MUST produce structured evidence for both fixture and dry-run runs, tagged with `executionMode` |
| FR5 | The system MUST fail safely (graceful error) if a requested capability is unsupported |
| FR6 | The system MUST avoid exports to non-existent modules |
| FR7 | The system MUST preserve local-only verification as the primary gate |
| FR8 | The system MUST keep `stash@{0}` untouched until feature implementation succeeds or is explicitly abandoned |
| FR9 | The `ExecutionMode` type MUST distinguish `fixture`, `dry-run`, and `real` execution |
| FR10 | Fixture agent MUST use data-driven fixture inputs (no embedded test data in agent logic) |

## 6. Safety Requirements

| ID | Requirement |
|----|-------------|
| SR1 | Dry-run MUST be side-effect-free by default — no file writes outside controlled temp/sandbox paths |
| SR2 | Write operations outside dry-run MUST require explicit Human Approval |
| SR3 | Push, merge, PR creation, branch deletion, worktree creation, and force-push MUST be prohibited in dry-run |
| SR4 | Secrets and `.env` contents MUST never be logged or included in evidence output |
| SR5 | Evidence output MUST not contain private tokens, local secrets, or hidden credentials |
| SR6 | Remote CI is advisory-only and MUST NOT be triggered as a required gate |
| SR7 | Dry-run logs MUST clearly distinguish "simulated success" from "blocked operation" |
| SR8 | The `POSITRON_ENABLE_DOGFOOD_FIXTURE_CHANGE` env var pattern (existing in sandbox) should be considered for consistency |

## 7. Data Types (Key Additions)

### 7.1 ExecutionMode

```typescript
/**
 * Execution mode distinguishing how changes were produced.
 * - 'fixture': deterministic test agent, no external LLM
 * - 'dry-run': real adapter invoked but all writes/pushes/merges blocked
 * - 'real': genuine agent execution with real effects
 */
export type ExecutionMode = 'fixture' | 'dry-run' | 'real';
```

This type MAY be added to `packages/shared/src/opencode-types.ts` (alongside existing `OpenCodePhase`, `OpenCodeRunInput`, `OpenCodeAdapter`) OR in a new `agent-types.ts` file — this decision is deferred to the Plan phase.

### 7.2 FixtureAgentInput / FixtureAgentOutput

Exact shapes are deferred to Plan phase. Key constraints:
- Input includes fixture scenario ID, workspace path, issue context
- Output includes `executionMode: 'fixture'`, status, evidence paths, duration
- Must be serializable (JSON-compatible)

### 7.3 DryRunAgentInput / DryRunAgentOutput

Exact shapes are deferred to Plan phase. Key constraints:
- Input includes intended action, workspace path, issue context
- Output includes `executionMode: 'dry-run'`, blocked operations list, simulated result
- Must include a safety report: which operations were blocked and why

### 7.4 AgentDeclaration (Deferred)

The `AgentDeclaration` interface from `stash@{0}` is a large, comprehensive contract. Including it or a simplified version is deferred to the Plan phase. The minimum needed for US3 is `ExecutionMode` — the full `AgentDeclaration`/`AgentCapabilityRegistry` may be separate work.

## 8. Edge Cases

- **Missing fixture file:** Agent returns clear error, does not fall back to network/LLM
- **Empty fixture:** Agent returns empty/skipped result, not a crash
- **Dry-run with OpenCode not installed:** Agent must work without OpenCode CLI (simulate CLI calls)
- **Dry-run attempts forbidden operation:** Blocked with reason, logged, continues with remaining operations
- **Concurrent dry-run instances:** Each isolated; no shared state corruption
- **Fixtures with timestamps:** Normalized or replaced with deterministic placeholders
- **Large fixture inputs:** Must not cause memory issues (streaming or chunking)
- **Dry-run with real tokens in env:** Tokens must not be used or logged
- **Fixture agent receives real input:** Must still operate in fixture mode (no accidental real execution)

## 9. Verification Contract

### 9.1 Mandatory Local Gates (Existing)

These must remain green throughout implementation:

```powershell
npx vitest run packages/shared/src/__tests__/prompt-standard.contract.test.ts
npm run typecheck
git diff --check
```

### 9.2 Targeted Tests (Post-Implementation)

```powershell
# New tests for opencode-adapter (fixture + dry-run)
npx vitest run packages/opencode-adapter/src/__tests__/
```

### 9.3 Red Tests (Must Fail Before Implementation)

| # | Red Test | Expected Failure |
|---|----------|-----------------|
| RT1 | Export references `deterministic-fixture-agent.ts` (before it exists) | Module resolution error |
| RT2 | Export references `dry-run-agent.ts` (before it exists) | Module resolution error |
| RT3 | Dry-run attempts real file write outside temp path | Blocked operation |
| RT4 | Dry-run attempts real GitHub push | Blocked operation |
| RT5 | Dry-run attempts real PR creation | Blocked operation |
| RT6 | Dry-run attempts merge or branch deletion | Blocked operation |
| RT7 | Fixture agent returns non-deterministic output for same input | Test assertion failure |
| RT8 | Evidence output is missing `executionMode` field | Schema validation failure |
| RT9 | Status doc claims test count without evidence | Doc audit failure |

### 9.4 Contract Tests (Green Must Stay Green)

- `packages/shared/src/__tests__/prompt-standard.contract.test.ts` — PASS
- `packages/shared/src/__tests__/utils.contract.test.ts` — PASS
- `packages/shared/src/__tests__/secret-manager.contract.test.ts` — PASS

## 10. No Feature Flag Required

Unlike previous features that introduced new infrastructure (tool gateway, MCP), this feature adds adapter types and test infrastructure. No runtime feature flag is needed. However:

- The `ExecutionMode` field on results defaults to `undefined` for backward compatibility (legacy adapters without mode awareness)
- Dry-run agent is opt-in by construction (you must explicitly use it instead of `RealOpenCodeAdapter`)
- Existing `POSITRON_ENABLE_DOGFOOD_FIXTURE_CHANGE` for sandbox-level fixtures remains unchanged

## 11. Out of Scope

- Applying `stash@{0}` or `stash@{1}`
- Implementing source code during this specify phase
- Updating `docs/status/current-capabilities.md` or `docs/status/known-limitations.md`
- Fixing Biome lint warnings (314 format, 901 lint)
- Fixing Playwright E2E tracing issues
- Fixing mutation/Stryker package resolution
- GitHub Actions changes
- OpenCode global configuration changes
- Creating the full `AgentDeclaration` / `AgentCapabilityRegistry` system (may be separate feature)
- Recovering `stash@{1}` content beyond what was merged in PR #262

## 12. Open Questions (Needs Clarification)

These questions MUST be resolved during the Clarify phase before Plan can proceed:

| # | Question | Impact |
|---|----------|--------|
| OQ1 | Should deterministic fixture outputs be stored as static `.json` files inline, inline test fixtures, or generated in temp directories? | Affects test architecture and CI |
| OQ2 | Should shared agent types (`ExecutionMode`, etc.) extend existing `opencode-types.ts` or live in a new `agent-types.ts`? | Affects module structure and imports |
| OQ3 | Which dry-run operations should be represented as "blocked" vs "simulated"? (e.g., file read in dry-run — simulate or block?) | Affects safety model granularity |
| OQ4 | What is the minimum evidence schema needed for UI/dashboard integration? | Affects API contract |
| OQ5 | Should `docs/status/` be regenerated from evidence or kept manual for now? | Affects documentation workflow |
| OQ6 | Should the `AgentDeclaration` interface from `stash@{0}` be adopted, simplified, or deferred entirely? | Affects scope of US3 |
| OQ7 | Is `deterministic-fixture-agent.ts` a standalone file or should it be organized under a subdirectory (e.g., `agents/`)? | Affects file structure |
| OQ8 | How should the dry-run agent interact with the existing `POSITRON_MERGE_KILL_SWITCH` / `POSITRON_ENABLE_PUSH` kill switches? | Affects safety gate consistency |

## 13. Stash Handling Protocol

```
stash@{0} — ERHALTEN. HIGH RISK.
  - NICHT anwenden (apply)
  - NICHT poppen (pop)
  - NICHT droppen (drop)
  - NICHT extrahieren (extract files)
  - Nur read-only als Hintergrund-Evidence für diese Spec
  - Wird gelöscht/verworfen erst nach erfolgreichem Feature-PR ODER explizitem Human-Entscheid

stash@{1} — ERHALTEN.
  - Teilweise via PR #262 recovered
  - Unberührt lassen
```

## 14. Clarifications

### OQ1 — Should deterministic fixture outputs be stored as static `.json` files inline, inline test fixtures, or generated in temp directories?

**Decision:** Use **inline test fixture data** (exported constants/objects in `*.fixture.ts` modules or directly in test files) for all simple scenarios. Use **temp directories** (under `.positron/test-artifacts/` or OS temp) for scenarios that require file-output verification.

**Rationale:** Inline fixtures keep tests self-contained, avoid stale reference files, and are easily reviewable in PRs. Static `.json` files can accumulate outdated data. Temp directories provide isolation for file-output scenarios without cluttering the workspace and can be cleaned up via test teardown. This aligns with the existing `dogfood-fixture.ts` pattern which creates files only when explicitly enabled by an env guard.

**Spec Impact:** FR10 ("Fixture agent MUST use data-driven fixture inputs") is clarified: "data-driven" means fixture data is separate from agent logic, but may be inline (exported constants) or in dedicated fixture modules — not necessarily external `.json` files. US1 acceptance criteria about deterministic results are unaffected.

### OQ2 — Should shared agent types (`ExecutionMode`, etc.) extend existing `opencode-types.ts` or live in a new `agent-types.ts`?

**Decision:** Place the **minimal `ExecutionMode` type directly in `opencode-types.ts`** (alongside existing `OpenCodePhase`, `OpenCodeRunInput`, `OpenCodeAdapter`). Add an optional `executionMode?: ExecutionMode` field to `OpenCodeCommandResult`. Do NOT create a new `agent-types.ts` in this feature. Defer `AgentDeclaration` / `AgentCapabilityRegistry` to a separate issue.

**Rationale:** `opencode-types.ts` is small (96 lines) and is already the canonical home for OpenCode-related types. The `ExecutionMode` type is directly related to OpenCode execution, making it a natural fit. Creating a new file for one small type adds unnecessary module indirection. The large `agent-types.ts` from `stash@{0}` (431+ lines, 25+ capability IDs, multi-adapter registry) introduces coupling that is out of scope for this feature — adopting it would create "dead code" with no implementations. The stash's additions to `CodingAgentResult` (`changedFiles`, `secretScanSummary`) are also deferred — they require types (`CodingAgentResult`) that don't exist on `main`.

**Spec Impact:** US3 simplified to: define `ExecutionMode` type + add `executionMode` field to `OpenCodeCommandResult`. Section 7.1 decision resolved. The shared `index.ts` needs a new re-export line (`export * from './opencode-types.js'` already exists, so `ExecutionMode` is auto-exported). Section 7.4 (`AgentDeclaration` Deferred) is affirmed.

### OQ3 — Which dry-run operations should be represented as "blocked" vs "simulated"? (e.g., file read in dry-run — simulate or block?)

**Decision:** Three-tier classification:

| Category | Examples | Dry-Run Behavior |
|----------|----------|-----------------|
| **Simulated** | file reads, `git status`, `git log`, `gh issue view`, `npm test --dry-run` equivalent, typecheck queries | Recorded as planned but not executed. The result indicates "would be performed." |
| **Blocked** | file writes (outside temp paths), `git add/commit/push`, `gh pr create`, `git merge`, `git branch -d`, `git worktree add`, `npm install`, `npm publish` | Recorded as blocked with reason. The operation is refused even in dry-run. |
| **Reported** | pure informational queries (listing, querying, audit-only operations) | Recorded as planned; neither simulated nor blocked. |

File reads are **simulated** (not blocked) because they are side-effect-free and their results don't affect the safety model. File writes outside controlled paths are **blocked** because they violate SR1 ("side-effect-free by default"). All GitHub write operations are **blocked** because they violate SR3.

**Rationale:** Read-only safety is the bright line distinction. The existing `OpenCodeCommandStatus` already includes `'blocked'` and `'skipped'` — these can be used for the dry-run result status. SR7 ("Dry-run logs MUST clearly distinguish 'simulated success' from 'blocked operation'") is implemented by this classification.

**Spec Impact:** US2 acceptance criteria refined: "reports intended actions" now means the three-tier classification. SR3 operationalized. The `DryRunAgentOutput` (section 7.3) must include separate lists for `simulatedActions`, `blockedActions` (with reasons), and `reportedActions`.

### OQ4 — What is the minimum evidence schema needed for UI/dashboard integration?

**Decision:** Minimum machine-readable evidence schema:

```typescript
interface EvidenceReport {
  /** Unique run identifier (from OpenCodeRunInput.runId) */
  runId: string;
  /** Execution mode: 'fixture', 'dry-run', or 'real' */
  executionMode: ExecutionMode;
  /** ISO 8601 timestamp, normalized to UTC or explicit offset */
  timestamp: string;
  /** Agent identifier (e.g., 'DeterministicFixtureAgent', 'OpenCodeDryRunAgent') */
  source: string;
  /** Total execution duration in milliseconds */
  durationMs: number;
  /** Overall status */
  status: 'success' | 'partial' | 'blocked' | 'failed';
  /** Operations that would be performed but were simulated */
  simulatedActions: string[];
  /** Operations that would be performed but were blocked with reasons */
  blockedActions: { operation: string; reason: string }[];
  /** Informational operations recorded but not executed */
  reportedActions: string[];
  /** Non-blocking warnings (e.g., "kill switch active, push would be blocked") */
  warnings: string[];
  /** Absolute paths of files that were changed (empty in pure dry-run; may contain temp fixture outputs) */
  changedFiles: string[];
  /** Human-readable summary */
  summary: string;
}
```

Evidence files are written to: `.positron/evidence/<runId>.json`.

**Rationale:** Flat, machine-readable JSON with no nested opaque structures. Dashboard can consume this directly. `changedFiles` is included for forward compatibility (fixture mode may produce temp output files). No secrets — the `blockedActions[].reason` field MUST NOT contain tokens, env var values, or credentials (SR4, SR5). Timestamps are ISO 8601 for easy cross-platform parsing.

**Spec Impact:** US2 acceptance criteria ("structured JSON" evidence) now has a concrete shape. SR4/SR5 enforced by schema design. Section 7.3 (`DryRunAgentOutput`) refined to match this schema — the dry-run agent output IS the `EvidenceReport`.

### OQ5 — Should `docs/status/` be regenerated from evidence or kept manual for now?

**Decision:** **Keep manual for now.** Do NOT auto-generate `docs/status/*` from evidence in this feature. No `docs/status/current-capabilities.md` or `docs/status/known-limitations.md` updates from agent code. Documentation is a separate human concern, potentially a follow-up issue.

**Rationale:** Auto-generating status docs requires: (1) parsing evidence JSON, (2) aggregating test results, (3) formatting markdown, (4) avoiding stale claims. This is significant complexity that distracts from the core agent implementation. The stash's `docs/status/current-capabilities.md` claims "42 tests total PASS" for modules that don't exist — exactly the risk of auto-generated docs without verification. Evidence files (`.positron/evidence/*.json`) exist as verifiable artifacts; human-written docs can reference them. US4 (P2 priority) is intentionally deferred.

**Spec Impact:** US4 clarified: "Evidence-Backed Status Documentation" means docs should link to or reference evidence artifacts, but not be auto-generated. Section 3.3 (Gap Analysis) documentation stays manual. Section 11 (Out of Scope) includes explicit mention: "Updating `docs/status/*` from evidence (manual or automatic) is deferred."

### OQ6 — Should the `AgentDeclaration` interface from `stash@{0}` be adopted, simplified, or deferred entirely?

**Decision:** **Defer entirely.** The full `AgentDeclaration` / `AgentCapabilityRegistry` / `CodingAgentAdapter` system from `stash@{0}` is OUT OF SCOPE for this feature. Create a separate GitHub Issue if the capability registry is needed later. Do not adopt, simplify, or import any part of `stash@{0}`'s `agent-types.ts` into this feature's implementation.

The `stash@{0}` contains:
- `AgentCapability` union type (25+ capability IDs: `repo_read`, `code_write`, `mcp_tool_use`, etc.)
- `AgentDeclaration` interface (capabilities, safetyDeclaration, modelRequirements)
- `CodingAgentAdapter` interface (executePhase, healthCheck, getCapabilities)
- `AgentCapabilityRegistry` class (register, query, validate)
- Extension of `CodingAgentResult` with `executionMode`, `changedFiles`, `secretScanSummary`

**None of these are implemented or referenced on `main`.** The stash's `CodingAgentResult` type extension references a `CodingAgentResult` interface that doesn't exist on `main`. Adopting it creates a dependency hole.

**Rationale:** The stash content is aspirational architecture, not working code. Importing it would create:
1. Dead types with no implementations on `main`
2. Import chains to non-existent interfaces (`CodingAgentResult`)
3. A large, untested registry class that would need its own test suite
4. Scope creep into agent capability management (separate concern)

The minimal need is `ExecutionMode` — which can be added to `opencode-types.ts` with a one-line `export type ExecutionMode = 'fixture' | 'dry-run' | 'real'`.

**Spec Impact:** US3 scope confirmed as minimal: `ExecutionMode` only. Section 7.4 decision affirmed. Section 11 (Out of Scope) includes explicit mention: "The full `AgentDeclaration` / `AgentCapabilityRegistry` system (may be separate feature)." No imports or references to stash `agent-types.ts` content in implementation.

### OQ7 — Is `deterministic-fixture-agent.ts` a standalone file or should it be organized under a subdirectory (e.g., `agents/`)?

**Decision:** **Standalone files** at the package root, following the existing convention:

```
packages/opencode-adapter/src/
  ├── index.ts                          (existing — add new exports)
  ├── fake-adapter.ts                   (existing)
  ├── real-adapter.ts                   (existing)
  ├── deterministic-fixture-agent.ts    (NEW — standalone)
  ├── dry-run-agent.ts                  (NEW — standalone)
  └── __tests__/
```

No subdirectory (`agents/`, `modes/`, etc.) in this feature.

**Rationale:** The existing adapter package uses a flat structure — `fake-adapter.ts` and `real-adapter.ts` are at the top level alongside `index.ts`. Introducing a subdirectory for two new files breaks the established pattern and creates import path inconsistency (`'./agents/deterministic-fixture-agent.js'` vs `'./fake-adapter.js'`). If the adapter package grows beyond 5-6 top-level implementation files, a subdirectory refactor can be considered in a follow-up issue. For now, consistency with existing code wins.

**Spec Impact:** File structure constraint clarified for Plan phase. Implementation is simpler (no directory creation). Tests remain in `__tests__/` following existing pattern (`fake-adapter.test.ts`, `real-adapter.test.ts`).

### OQ8 — How should the dry-run agent interact with the existing `POSITRON_MERGE_KILL_SWITCH` / `POSITRON_ENABLE_PUSH` kill switches?

**Decision:** The dry-run agent must:

1. **Acknowledge** kill switches in evidence output — include warnings in the `EvidenceReport.warnings[]` array when kill switches are active (e.g., `"POSITRON_MERGE_KILL_SWITCH is active — merge would be blocked"`, `"POSITRON_ENABLE_PUSH not set to 'true' — push would be blocked"`).

2. **Respect** kill switches during analysis — when a dry-run input includes a push/merge operation and the corresponding kill switch is active, classify the operation as **blocked** (not simulated), with the kill switch name cited in the `blockedActions[].reason`.

3. **Never bypass** kill switches — even though dry-run doesn't execute real operations, it must not report "would succeed" for operations that the safety infrastructure would block in real mode.

4. **Use a dedicated env var** following the existing pattern — add `POSITRON_ENABLE_DRY_RUN` (default `'true'` in `NODE_ENV=test`, default `'false'` otherwise) as an explicit opt-in gate for the dry-run agent, mirroring `POSITRON_ENABLE_DOGFOOD_FIXTURE_CHANGE` from `dogfood-fixture.ts`.

**Rationale:** Consistency with existing safety infrastructure is critical. The kill switches exist as hard safety gates. If dry-run reports "would succeed" for operations that would actually be blocked, it creates a false sense of safety and undermines trust in the dry-run mechanism. The dedicated `POSITRON_ENABLE_DRY_RUN` env var provides explicit opt-in while following the established pattern (`POSITRON_ENABLE_DOGFOOD_FIXTURE_CHANGE` requires `'true'`, `POSITRON_ENABLE_PUSH` requires `'true'`). Dry-run is opt-in by construction (you must use `OpenCodeDryRunAgent` explicitly), but an additional env guard prevents accidental activation.

**Spec Impact:** SR8 refined: the kill switch pattern is not just "considered" but actively enforced in dry-run analysis. US2 acceptance criteria updated: dry-run result must reflect active kill switches. New safety requirement: dry-run agent must check `POSITRON_MERGE_KILL_SWITCH` and `POSITRON_ENABLE_PUSH` before classifying operations.

## 15. Done When

- This spec exists at `.specify/issues/263/spec.md`
- Spec clearly documents the stash risk and blocks direct application
- Spec defines user stories, functional requirements, safety requirements, verification contract, red tests, and open questions
- Spec includes clarification decisions for all 8 open questions (OQ1-OQ8)
- No implementation code is changed
- No stash is applied, popped, dropped, or extracted
- Handoff asks for human approval before Plan phase
