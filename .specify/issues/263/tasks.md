# Tasks: Issue #263 — DeterministicFixtureAgent + OpenCodeDryRunAgent

**Issue:** #263  
**Date:** 2026-06-20  
**Phase:** 4 — Tasks Only (no implementation, no code, no stash apply)  
**SpecKit CLI:** `specify tasks` command not available — tasks created manually per project convention  
**Spec:** `.specify/issues/263/spec.md` (439 lines, 4 user stories, 10 FRs, 8 SRs, 9 RTs)  
**Plan:** `.specify/issues/263/plan.md` (391 lines, 7 ADRs, 5 implementation phases)

---

## Context

- **Feature:** DeterministicFixtureAgent + OpenCodeDryRunAgent for safe, reproducible OpenCode adapter testing
- **Source of Truth:** GitHub Issue #263 — no work from memory
- **Stash Policy:** `stash@{0}` is HIGH RISK read-only evidence — NEVER apply, pop, drop, or extract
- **No Remote CI:** GitHub CI is advisory-only; all gates are local
- **Implementation Gate:** No source code before this tasks.md exists and is reviewed
- **Branch:** `main` (`1737924`) — new feature branch will be `positron/issue-263-deterministic-dry-run`
- **Scope Guard:** No `agent-types.ts`, no `AgentDeclaration`, no `AgentCapabilityRegistry`, no `docs/status/` auto-generation

---

## Task Summary

| Phase | Tasks | Description | Parallel |
|-------|-------|-------------|----------|
| 0 | T-001 – T-003 | Safety Preconditions | — |
| 1 | T-010 – T-012 | Shared Type Foundation (ExecutionMode) | — |
| 2 | T-020 – T-028 | Red Tests (must fail before implementation) | Partially [P] |
| 3 | T-030 – T-034 | DeterministicFixtureAgent Implementation | [P] with Phase 4 |
| 4 | T-040 – T-046 | OpenCodeDryRunAgent Implementation | [P] with Phase 3 |
| 5 | T-050 – T-052 | Adapter Exports | — |
| 6 | T-060 – T-064 | Integration & Local Gates | — |
| 7 | T-070 – T-073 | Evidence & Documentation | Partially [P] |
| 8 | T-080 – T-083 | Review & Handoff | — |

**Total:** 39 tasks across 9 phases

---

## Phase 0 — Safety Preconditions

### T-001 — Verify Working Tree Clean and Single Workspace
**Priority:** P0 | **Estimated effort:** 5 min | **Depends on:** —  
**Scope:** Read-only verification — no file changes.  
**Acceptance:**
- `git status --short` shows only untracked `.specify/issues/263/` (or nothing)
- `Get-ChildItem "C:\" -Directory -Filter "Positron*"` returns exactly `C:\Positron`
- `git worktree list` shows only `C:\Positron`
- Block if dirty working tree or sibling folders exist

### T-002 — Confirm stash@{0} Read-Only, Never Apply/Pop/Drop
**Priority:** P0 | **Estimated effort:** 5 min | **Depends on:** —  
**Scope:** Policy enforcement — no stash actions.  
**Acceptance:**
- `git stash list` shows `stash@{0}` intact with original message
- No `git stash apply`, `git stash pop`, `git stash drop` executed
- No files from `stash@{0}` extracted or referenced in implementation
- Stash content used only as aspirational guidance in spec (already done)

### T-003 — Confirm No `agent-types.ts`, No `AgentDeclaration`/`AgentCapabilityRegistry`
**Priority:** P0 | **Estimated effort:** 5 min | **Depends on:** —  
**Scope:** Scope boundary enforcement.  
**Acceptance:**
- `packages/shared/src/agent-types.ts` does not exist and will not be created
- No import of `AgentDeclaration`, `CodingAgentAdapter`, or `AgentCapabilityRegistry` from stash
- OQ6 deferral honored: these are entirely out of scope
- Plan ADR-B constraint enforced: `ExecutionMode` goes into `opencode-types.ts` only

---

## Phase 1 — Shared Type Foundation

### T-010 — Add `ExecutionMode` Type to `opencode-types.ts`
**Priority:** P0 | **Estimated effort:** 10 min | **Depends on:** Phase 0  
**Scope:** Modify `packages/shared/src/opencode-types.ts` — 1 type alias addition.  
**Acceptance:**
- `export type ExecutionMode = 'fixture' | 'dry-run' | 'real';` added after `OpenCodePhase` definition
- Placed logically near `OpenCodePhase` (both describe execution context)
- JSDoc comment documents each mode: fixture=deterministic test, dry-run=safe simulation, real=genuine execution
- No other types or interfaces modified

### T-011 — Add `executionMode?` Optional Field to `OpenCodeCommandResult`
**Priority:** P0 | **Estimated effort:** 5 min | **Depends on:** T-010  
**Scope:** Modify `packages/shared/src/opencode-types.ts` — 1 field addition.  
**Acceptance:**
- `executionMode?: ExecutionMode` added to `OpenCodeCommandResult` interface
- Field is optional (`?`) — backward compatible with all existing consumers
- JSDoc: `/** How changes were produced. Undefined = legacy adapter without mode awareness. */`
- `npm run typecheck` passes (no existing code references the new field — no breakage)

### T-012 — Verify Typecheck and Contract Tests After Type Addition
**Priority:** P0 | **Estimated effort:** 10 min | **Depends on:** T-011  
**Scope:** Verification only — no further code changes.  
**Acceptance:**
- `npm run typecheck` — PASS
- `npx vitest run packages/shared/src/__tests__/prompt-standard.contract.test.ts` — PASS (green, unchanged)
- `npx vitest run packages/shared/src/__tests__/utils.contract.test.ts` — PASS (green, unchanged)
- `npx vitest run packages/shared/src/__tests__/secret-manager.contract.test.ts` — PASS (green, unchanged)
- `ExecutionMode` auto-exported via existing `export * from './opencode-types.js'` in `shared/src/index.ts`

---

## Phase 2 — Red Tests (Must Fail Before Implementation)

### T-020 [P] — Create `deterministic-fixture-agent.test.ts` Skeleton
**Priority:** P0 | **Estimated effort:** 15 min | **Depends on:** Phase 1  
**Scope:** Create `packages/opencode-adapter/src/__tests__/deterministic-fixture-agent.test.ts` — test file only.  
**Acceptance:**
- File exists with vitest imports
- Import from `'../deterministic-fixture-agent.js'` → this import will FAIL (module not found) — confirming RT1/RT2
- Placeholder test structure defined: describe() blocks for "deterministic output", "evidence generation", "error handling"
- Fixture data defined inline as test constants (per OQ1)

### T-021 [P] — Create `dry-run-agent.test.ts` Skeleton
**Priority:** P0 | **Estimated effort:** 15 min | **Depends on:** Phase 1  
**Scope:** Create `packages/opencode-adapter/src/__tests__/dry-run-agent.test.ts` — test file only.  
**Acceptance:**
- File exists with vitest imports
- Import from `'../dry-run-agent.js'` → this import will FAIL (module not found) — confirming RT1/RT2
- Placeholder test structure defined: describe() blocks for "operation blocking", "kill switch integration", "evidence generation"
- Mock `process.env` values for POSITRON_ENABLE_DRY_RUN, POSITRON_ENABLE_PUSH, POSITRON_MERGE_KILL_SWITCH

### T-022 — RT1/RT2: Verify Import Failures Before Modules Exist
**Priority:** P0 | **Estimated effort:** 10 min | **Depends on:** T-020, T-021  
**Scope:** Run test files to confirm they fail at import resolution.  
**Acceptance:**
- `npx vitest run packages/opencode-adapter/src/__tests__/deterministic-fixture-agent.test.ts` → FAIL (module resolution)
- `npx vitest run packages/opencode-adapter/src/__tests__/dry-run-agent.test.ts` → FAIL (module resolution)
- Failure is expected and documented — this is the TDD "red" phase
- No exports in `index.ts` reference these modules yet

### T-023 — RT3: Red Test — Dry-Run Blocks File Write Outside Temp Path
**Priority:** P0 | **Estimated effort:** 20 min | **Depends on:** T-021  
**Scope:** Add RT3 test case to `dry-run-agent.test.ts` — will run after module exists but before blocking logic complete.  
**Acceptance:**
- Test: create dry-run agent, attempt file write outside `.positron/test-artifacts/`
- Expected: operation classified as blocked with reason "File write outside controlled path"
- Expected: `blockedActions.length > 0`
- Expected: `evidence.status` is not 'success' for blocked writes
- Test written before implementation — will fail once module exists but blocking is incomplete

### T-024 — RT4/RT5/RT6: Red Tests — Dry-Run Blocks GitHub Write Operations
**Priority:** P0 | **Estimated effort:** 25 min | **Depends on:** T-021  
**Scope:** Add RT4-RT6 test cases to `dry-run-agent.test.ts`.  
**Acceptance:**
- **RT4:** Dry-run with GitHub push → `blockedActions` contains item with `reason` citing `POSITRON_ENABLE_PUSH`
- **RT5:** Dry-run with PR creation → `blockedActions` contains item with `reason` citing GitHub write block
- **RT6:** Dry-run with merge or branch delete → `blockedActions` contains item with `reason` citing `POSITRON_MERGE_KILL_SWITCH`
- All three tests: no actual `gh` or `git` push/PR/merge command executed

### T-025 — RT7: Red Test — Fixture Agent Deterministic Output
**Priority:** P0 | **Estimated effort:** 20 min | **Depends on:** T-020  
**Scope:** Add RT7 test case to `deterministic-fixture-agent.test.ts`.  
**Acceptance:**
- Test: run same fixture scenario twice with identical input
- Expected: both outputs are deeply equal (same EvidenceReport fields)
- Expected: no random values, no varying timestamps (timestamps either normalized or configurable)
- Test written before source — will fail until DeterministicFixtureAgent is implemented

### T-026 — RT8: Red Test — Evidence Output Includes `executionMode`
**Priority:** P0 | **Estimated effort:** 20 min | **Depends on:** T-020, T-021  
**Scope:** Add RT8 test cases to both test files.  
**Acceptance:**
- Fixture test: EvidenceReport has `executionMode: 'fixture'`
- Dry-run test: EvidenceReport has `executionMode: 'dry-run'`
- If `executionMode` is missing → test fails (schema validation)
- Evidence report must be valid against EvidenceReport interface shape

### T-027 — RT9: Red Test — No Status Doc Claims Without Evidence
**Priority:** P1 | **Estimated effort:** 10 min | **Depends on:** Phase 0  
**Scope:** Manual check — verify `docs/status/*` does not claim fixture/dry-run test counts.  
**Acceptance:**
- No `docs/status/current-capabilities.md` or `docs/status/known-limitations.md` claims test counts for modules that don't exist
- If any `docs/status/*` is generated, it must reference actual `.positron/evidence/*.json` evidence
- This is a manual gate (OQ5: manual docs only)

### T-028 — Phase 2 Verification: Red Tests Fail as Expected
**Priority:** P0 | **Estimated effort:** 10 min | **Depends on:** T-022, T-023, T-024, T-025, T-026, T-027  
**Scope:** Confirmation gate before implementation.  
**Acceptance:**
- All red tests written
- Import-based tests (RT1/RT2) fail at module resolution
- Logic-based tests (RT3-RT8) are written and will execute once modules exist
- RT9 manual check passes
- Phase 2 is the "RED" gate — blocking implementation until confirmed

---

## Phase 3 — DeterministicFixtureAgent Implementation

### T-030 [P] — Implement `deterministic-fixture-agent.ts`
**Priority:** P0 | **Estimated effort:** 45 min | **Depends on:** T-028 (Red phase confirmed)  
**Scope:** Create `packages/opencode-adapter/src/deterministic-fixture-agent.ts`.  
**Acceptance:**
- Class `DeterministicFixtureAgent` exported
- Constructor accepts `FixtureAgentConfig`:
  - `fixtures: Map<string, Fixture>` — scenario name → fixture data
  - `evidenceDir?: string` — defaults to `.positron/evidence/`
- `Fixture` interface:
  - `scenario: string` — human-readable scenario identifier
  - `phases: Array<{ phase: OpenCodePhase; result: OpenCodeCommandResult }>` — ordered phase results
- Method `execute(scenario: string, input: OpenCodeRunInput): Promise<EvidenceReport>`
- Lookup fixture by scenario — fails with clear error if not found
- All imports come from `@positron/shared` — no new dependencies
- No external LLM, network, or OpenCode CLI calls
- EvidenceReport written to `.positron/evidence/<runId>.json`
- TypeScript compiles cleanly

### T-031 — Ensure Deterministic Output (Same Input → Same Output)
**Priority:** P0 | **Estimated effort:** 15 min | **Depends on:** T-030  
**Scope:** Determinism enforcement in fixture agent logic.  
**Acceptance:**
- Same scenario name + same input object → identical EvidenceReport (deep equality)
- No `Date.now()`, `Math.random()`, `crypto.randomUUID()`, or process-specific values in output
- Timestamps: use `new Date().toISOString()` but allow configurable override for test determinism
- Evidence file content is deterministic (excluding system-generated file timestamps)
- RT7 test passes (from red → green)

### T-032 — Ensure No External LLM/Network Calls
**Priority:** P0 | **Estimated effort:** 10 min | **Depends on:** T-030  
**Scope:** Isolation verification.  
**Acceptance:**
- No `fetch()`, `http.request()`, or network imports in fixture agent
- No OpenCode CLI spawn/exec
- No LLM API calls or SDK imports
- Agent operates entirely on in-memory fixture data
- If network monitoring is available, confirm zero outbound connections during test

### T-033 — Implement Inline Fixture Data for Tests
**Priority:** P0 | **Estimated effort:** 20 min | **Depends on:** T-030  
**Scope:** Fixture data for test scenarios — exported constants in test or fixture module.  
**Acceptance:**
- Fixture data defined as exported constants (inline, per OQ1)
- At minimum: "happy path" fixture, "empty phases" fixture, "missing scenario" fixture
- Fixture data is clearly separated from agent logic (data-driven, FR10)
- Each fixture scenario maps to a realistic OpenCode adapter flow
- Fixture phases use valid `OpenCodePhase` values and realistic `OpenCodeCommandResult` shapes

### T-034 — Run Fixture Agent Tests: Red → Green
**Priority:** P0 | **Estimated effort:** 10 min | **Depends on:** T-030, T-031, T-032, T-033  
**Scope:** Test execution gate.  
**Acceptance:**
- `npx vitest run packages/opencode-adapter/src/__tests__/deterministic-fixture-agent.test.ts` → PASS (green)
- RT7 (deterministic output) — PASS
- RT8 (evidence includes executionMode='fixture') — PASS
- All fixture-specific test assertions green
- No import failures (module now exists)

---

## Phase 4 — OpenCodeDryRunAgent Implementation

### T-040 [P] — Implement `dry-run-agent.ts`
**Priority:** P0 | **Estimated effort:** 60 min | **Depends on:** T-028 (Red phase confirmed)  
**Scope:** Create `packages/opencode-adapter/src/dry-run-agent.ts`.  
**Acceptance:**
- Class `OpenCodeDryRunAgent` exported
- Constructor checks `POSITRON_ENABLE_DRY_RUN` env var:
  - If `NODE_ENV === 'test'`: default to `'true'` if unset
  - If not test and not `'true'`: throw Error with message "Dry-run agent disabled: POSITRON_ENABLE_DRY_RUN not set to 'true'"
- Constructor accepts `DryRunAgentConfig`:
  - `evidenceDir?: string` — defaults to `.positron/evidence/`
  - `blockedOperations?: string[]` — additional user-blocked operations
- Method `analyzeActions(plannedActions: ActionPlan[], input: OpenCodeRunInput): Promise<EvidenceReport>`
- Method `runSlashCommand(command: string, input: OpenCodeRunInput): Promise<EvidenceReport>`
- All imports from `@positron/shared` — no new dependencies
- No real OpenCode CLI, LLM, or network calls (SR1, FR2)
- EvidenceReport written to `.positron/evidence/<runId>.json`
- TypeScript compiles cleanly

### T-041 — Implement Three-Tier Operation Classification
**Priority:** P0 | **Estimated effort:** 25 min | **Depends on:** T-040  
**Scope:** `classifyOperation()` function per ADR-C.  
**Acceptance:**
- Three-tier classification: Simulated, Blocked, Reported
- **Simulated:** file reads, `git status`, `git log`, `git diff`, `gh issue view`, `npm test` equivalent, typecheck queries
- **Blocked:** file writes (outside temp paths), `git add/commit/push`, `gh pr create`, `git merge`, `git branch -d`, `git worktree add`, `npm install`, `npm publish`, force-push
- **Reported:** pure informational operations not fitting simulated/blocked
- Classification function is pure (no side effects, no I/O)
- RT3 (blocked file write) — operation correctly classified

### T-042 — Implement Kill Switch Integration
**Priority:** P0 | **Estimated effort:** 20 min | **Depends on:** T-040  
**Scope:** `checkKillSwitch()` function per ADR-E.  
**Acceptance:**
- **POSITRON_MERGE_KILL_SWITCH:** If active (not `'false'`), merge and branch-delete operations classified as Blocked
- **POSITRON_ENABLE_PUSH:** If not `'true'`, push operations classified as Blocked
- **POSITRON_ENABLE_DOGFOOD_FIXTURE_CHANGE:** acknowledged but not modified (sandbox concern)
- Kill switch status reported in `EvidenceReport.warnings[]`
- Blocked reasons cite specific kill switch name
- Never bypass kill switches — even in dry-run, must report "would be blocked" not "would succeed"
- RT4/RT5/RT6 tests: kill switch reasons correctly cited

### T-043 — Implement Blocked Operation Evidence
**Priority:** P0 | **Estimated effort:** 15 min | **Depends on:** T-041, T-042  
**Scope:** EvidenceReport generation for blocked operations.  
**Acceptance:**
- Every blocked operation appears in `EvidenceReport.blockedActions[]` with:
  - `operation: string` — normalized operation name
  - `reason: string` — why blocked (classification or kill switch)
- Blocked reasons NEVER contain env var values, tokens, or credentials (SR4, SR5)
- `EvidenceReport.status` set to `'blocked'` if any operation blocked, `'success'` if all simulated/reported
- `blockedActions` is never empty when operations are blocked — evidence must be honest

### T-044 — Implement `ActionPlan` and `EvidenceReport` Types
**Priority:** P0 | **Estimated effort:** 15 min | **Depends on:** T-040  
**Scope:** Type definitions local to `dry-run-agent.ts` (per ADR-D).  
**Acceptance:**
- `EvidenceReport` interface defined per ADR-D schema:
  - `runId: string`, `executionMode: ExecutionMode`, `timestamp: string` (ISO 8601)
  - `source: string`, `durationMs: number`
  - `status: 'success' | 'partial' | 'blocked' | 'failed'`
  - `simulatedActions: string[]`, `blockedActions: { operation: string; reason: string }[]`
  - `reportedActions: string[]`, `warnings: string[]`
  - `changedFiles: string[]`, `summary: string`
- `ActionPlan` interface defined for planned actions:
  - `phase?: OpenCodePhase`, `operation: string`, `target?: string`, `args?: Record<string, unknown>`
- Types are local to the package; cross-package extraction deferred to follow-up

### T-045 — Implement Simulated Action Handling
**Priority:** P0 | **Estimated effort:** 20 min | **Depends on:** T-041  
**Scope:** Handling simulated (read-only, side-effect-free) operations.  
**Acceptance:**
- Simulated operations recorded in `EvidenceReport.simulatedActions[]`
- No file I/O, git commands, or CLI calls executed for simulated operations
- Read-only operations (git status, git log) produce plausible but NOT real output
- Result indicates "would be performed" — not "was performed"
- No `.positron/test-artifacts/` writes for simulated-only runs (only for explicit fixture output)

### T-046 — Run Dry-Run Agent Tests: Red → Green
**Priority:** P0 | **Estimated effort:** 10 min | **Depends on:** T-040, T-041, T-042, T-043, T-044, T-045  
**Scope:** Test execution gate.  
**Acceptance:**
- `npx vitest run packages/opencode-adapter/src/__tests__/dry-run-agent.test.ts` → PASS (green)
- RT3 (blocked file write) — PASS
- RT4 (blocked push) — PASS
- RT5 (blocked PR create) — PASS
- RT6 (blocked merge/branch-delete) — PASS
- RT8 (evidence includes executionMode='dry-run') — PASS
- All dry-run-specific test assertions green
- No import failures (module now exists)

---

## Phase 5 — Adapter Exports

### T-050 — Add Exports to `packages/opencode-adapter/src/index.ts`
**Priority:** P0 | **Estimated effort:** 5 min | **Depends on:** T-034, T-046 (both agents implemented and tested)  
**Scope:** Modify `index.ts` — 4 export lines added.  
**Acceptance:**
- `export { DeterministicFixtureAgent } from './deterministic-fixture-agent.js';`
- `export type { FixtureAgentConfig } from './deterministic-fixture-agent.js';`
- `export { OpenCodeDryRunAgent } from './dry-run-agent.js';`
- `export type { DryRunAgentConfig } from './dry-run-agent.js';`
- No exports reference non-existent modules (FR6)
- No exports from `agent-types.ts` — that file does not exist

### T-051 — Verify No Broken Export Paths
**Priority:** P0 | **Estimated effort:** 5 min | **Depends on:** T-050  
**Scope:** Module resolution verification.  
**Acceptance:**
- `npm run typecheck` — PASS (no broken imports)
- Manual check: `import { DeterministicFixtureAgent, OpenCodeDryRunAgent } from '@positron/opencode-adapter'` resolves
- No import from `deterministic-fixture-agent.ts` or `dry-run-agent.ts` directly references files that don't exist
- Real adapter (`real-adapter.ts`) is NOT modified (per plan — both agents are standalone, not integrated into real adapter)

### T-052 — Verify Real Adapter Unchanged
**Priority:** P0 | **Estimated effort:** 5 min | **Depends on:** T-050  
**Scope:** Confirmation that `real-adapter.ts` is untouched.  
**Acceptance:**
- `git diff packages/opencode-adapter/src/real-adapter.ts` — empty (no changes)
- `git diff packages/opencode-adapter/src/fake-adapter.ts` — empty (no changes)
- Real adapter has no dependency on fixture or dry-run agents
- Unlike `stash@{0}` which modified real-adapter with broken re-exports

---

## Phase 6 — Integration & Local Gates

### T-060 — Run `npm run typecheck` — All Packages
**Priority:** P0 | **Estimated effort:** 10 min | **Depends on:** T-050  
**Scope:** Full project typecheck.  
**Acceptance:**
- `npm run typecheck` exits 0 — no TypeScript errors in any package
- New files (`deterministic-fixture-agent.ts`, `dry-run-agent.ts`) typecheck cleanly
- Modified files (`opencode-types.ts`, `index.ts`) typecheck cleanly
- No implicit `any`, no missing exports, no broken import paths

### T-061 — Run Contract Tests (Green Must Stay Green)
**Priority:** P0 | **Estimated effort:** 10 min | **Depends on:** T-050  
**Scope:** Existing contract test suite — must remain green.  
**Acceptance:**
- `npx vitest run packages/shared/src/__tests__/prompt-standard.contract.test.ts` — PASS
- `npx vitest run packages/shared/src/__tests__/utils.contract.test.ts` — PASS
- `npx vitest run packages/shared/src/__tests__/secret-manager.contract.test.ts` — PASS
- No regression — implementation is additive only

### T-062 — Run All OpenCode Adapter Tests
**Priority:** P0 | **Estimated effort:** 10 min | **Depends on:** T-034, T-046  
**Scope:** Full adapter test suite.  
**Acceptance:**
- `npx vitest run packages/opencode-adapter/src/__tests__/` — ALL PASS
- `fake-adapter.test.ts` — PASS (unchanged, no regression)
- `real-adapter.test.ts` — PASS (unchanged, no regression)
- `deterministic-fixture-agent.test.ts` — PASS (new, green)
- `dry-run-agent.test.ts` — PASS (new, green)
- At least 4 test suites, all green

### T-063 — Run `git diff --check` — Whitespace Integrity
**Priority:** P0 | **Estimated effort:** 5 min | **Depends on:** All implementation tasks  
**Scope:** Git whitespace check.  
**Acceptance:**
- `git diff --check` — no output (no whitespace errors)
- No trailing whitespace, no conflict markers, no mixed indentation

### T-064 — Manual Verification: No Exports to Non-Existent Modules
**Priority:** P0 | **Estimated effort:** 10 min | **Depends on:** T-050  
**Scope:** Manual code review — FR6 compliance.  
**Acceptance:**
- Every `export { ... } from '...'` in `index.ts` points to an existing `.ts` file
- Every import in source files resolves to an existing module
- No "barrel export" to non-existent modules
- Unlike `stash@{0}` which exported from missing `deterministic-fixture-agent.ts` and `dry-run-agent.ts`

---

## Phase 7 — Evidence & Documentation

### T-070 [P] — Evidence Handoff for Implementation Run
**Priority:** P1 | **Estimated effort:** 15 min | **Depends on:** Phase 6  
**Scope:** Create evidence summary from actual test run.  
**Acceptance:**
- Collect actual test output from Phase 6 (T-062) — all test names and pass/fail status
- Collect typecheck output (T-060)
- Create handoff note summarizing what was built and verified
- Evidence references actual `.positron/evidence/*.json` files if generated during tests
- No stale claims — only what was actually tested and passed

### T-071 [P] — Document Known Limitations from Actual Tests
**Priority:** P1 | **Estimated effort:** 15 min | **Depends on:** Phase 6  
**Scope:** Limitations documentation from actual implementation.  
**Acceptance:**
- Document: dry-run does NOT execute real OpenCode CLI (SR1 — by design)
- Document: fixture agent only covers scenarios with pre-defined fixture data (FR10)
- Document: `AgentDeclaration` / `AgentCapabilityRegistry` not implemented (OQ6 — deferred)
- Document: `docs/status/` not auto-generated (OQ5 — manual only)
- Document: EvidenceReport types are local to opencode-adapter (not cross-package yet)
- No claim of capabilities not verified by tests

### T-072 [P] — Update Living Software / Evidence Portfolio
**Priority:** P2 | **Estimated effort:** 20 min | **Depends on:** T-070, T-071  
**Scope:** Update project evidence portfolio IF applicable pattern exists.  
**Acceptance:**
- Check if `.opencode/evidence-portfolio.json` or equivalent exists
- If yes: add entry for DeterministicFixtureAgent + OpenCodeDryRunAgent with:
  - Capability: deterministic fixture execution, safe dry-run simulation
  - Evidence: test file paths, test counts, evidence JSON paths
  - Limitations: documented in T-071
- If no portfolio exists: skip, document that it doesn't exist
- No `docs/status/current-capabilities.md` auto-generation (OQ5)

### T-073 [P] — Update Mermaid Architecture Map
**Priority:** P2 | **Estimated effort:** 15 min | **Depends on:** Phase 6  
**Scope:** Architecture diagram update only if structure changed.  
**Acceptance:**
- Check if a Mermaid architecture diagram exists for the project
- If yes: add nodes for `DeterministicFixtureAgent` and `OpenCodeDryRunAgent` in opencode-adapter package
- Show dependency edges: both agents depend on `@positron/shared`; neither depends on each other
- If no architecture map exists: skip, document that it doesn't exist
- Only update IF architecture/data/evidence flow changed

---

## Phase 8 — Review & Handoff

### T-080 — Review: Validate No Stash Code Blindly Applied
**Priority:** P0 | **Estimated effort:** 15 min | **Depends on:** Phase 6  
**Scope:** Review gate — delegate to `review-agent`.  
**Acceptance:**
- `review-agent` validates:
  - No file content matches `stash@{0}` line-for-line
  - Implementation is original, not copied from stash
  - No `agent-types.ts` created
  - No `AgentDeclaration`, `CodingAgentAdapter`, `AgentCapabilityRegistry` imported
  - `index.ts` exports are to existing files only (not stash pattern)
- Stash content used ONLY as aspirational guidance in spec (already captured in Phase 1-3)

### T-081 — Review: Validate Dry-Run Side-Effect-Free
**Priority:** P0 | **Estimated effort:** 15 min | **Depends on:** Phase 6  
**Scope:** Review gate — delegate to `review-agent`.  
**Acceptance:**
- `review-agent` validates:
  - Dry-run agent never calls real CLI commands (spawn/exec)
  - Dry-run agent never writes files outside `.positron/evidence/` and `.positron/test-artifacts/`
  - Dry-run agent never makes network calls
  - All blocked operations are truly blocked (no bypass paths)
  - Kill switches are respected (never bypassed)
  - `POSITRON_ENABLE_DRY_RUN` env var checked in constructor

### T-082 — Human Approval Gate
**Priority:** P0 | **Estimated effort:** — (human task) | **Depends on:** T-080, T-081  
**Scope:** Mandatory human gate — no automated bypass.  
**Acceptance:**
- Human reviewer explicitly approves implementation
- Approval required BEFORE any of: commit, push, PR creation, merge
- Approval scope: code review passed, tests green, safety verified, no stash applied
- Approval text must include: `APPROVE COMMIT ISSUE 263 IMPLEMENTATION`
- Separate approvals needed for push and PR (different risk levels)

### T-083 — Final Handoff: "Was kann die Software jetzt?"
**Priority:** P0 | **Estimated effort:** 15 min | **Depends on:** T-082  
**Scope:** Structured capability summary.  
**Acceptance:**
- Handoff answers:
  - **New capabilities:** DeterministicFixtureAgent provides reproducible adapter testing; OpenCodeDryRunAgent provides safe action analysis without side effects
  - **Removed blockers:** TDD infrastructure for new adapter types is in place; execution mode is typed
  - **Unchanged constraints:** No stash applied, `agent-types.ts` not created, `AgentDeclaration` deferred
  - **Remaining risks:** Listed from actual implementation experience
  - **Next step:** Human gate for commit/push/PR or next feature issue
- Handoff posted as GitHub comment on Issue #263

---

## Dependency Graph

```
Phase 0: Safety Preconditions
  T-001 ← T-002 ← T-003
       (all independent, sequential for safety)

Phase 1: Shared Type Foundation
  T-001-T-003 → T-010 → T-011 → T-012

Phase 2: Red Tests (depends on Phase 1 for ExecutionMode type)
  T-012 → T-020 [P]
  T-012 → T-021 [P]
  T-020 → T-022
  T-021 → T-022
  T-021 → T-023, T-024
  T-020 → T-025
  T-020, T-021 → T-026
  T-022-T-027 → T-028 (Red gate)

Phase 3: DeterministicFixtureAgent (depends on red gate)
  T-028 → T-030 [P] → T-031, T-032, T-033 → T-034

Phase 4: OpenCodeDryRunAgent (depends on red gate)
  T-028 → T-040 [P] → T-041, T-042, T-043, T-044, T-045 → T-046

Phase 5: Adapter Exports (depends on both agents)
  T-034, T-046 → T-050 → T-051, T-052

Phase 6: Integration & Gates (depends on all implementation)
  T-050 → T-060, T-061, T-062, T-064
  T-060-T-064 → T-063

Phase 7: Evidence & Documentation
  T-062 → T-070 [P], T-071 [P]
  T-070, T-071 → T-072 [P]
  T-062 → T-073 [P]

Phase 8: Review & Handoff
  Phase 6 → T-080, T-081 → T-082 → T-083
```

---

## Parallel Execution Opportunities

### [P] Markers — Tasks That Touch Different Files

| Tasks | Reason |
|-------|--------|
| T-020, T-021 | Different test files — no conflict |
| T-030, T-040 | Different source files — no conflict (index.ts updated later in T-050) |
| T-031, T-032, T-033 | Same file but different concerns — sequential recommended |
| T-041, T-042, T-043, T-044, T-045 | Same file — sequential recommended |
| T-070, T-071 | Different concerns — can be parallel |
| T-072, T-073 | Different artifact types — can be parallel |

### Phase-Level Parallelism

- **Phase 3 and Phase 4 can execute in parallel** — different source files, different test files
- **Phases 3+4 must both complete before Phase 5** — index.ts exports both
- **T-060, T-061, T-062, T-064 can run in parallel** — independent verification commands
- **Phase 7 tasks can run in parallel** — evidence collection, docs, architecture map are independent

---

## Safety & Security Checklist

| ID | Requirement | Verified By |
|----|-------------|-------------|
| SR1 | Dry-run side-effect-free by default | T-040, T-041, T-081 |
| SR2 | Writes outside dry-run require Human Approval | T-041, T-082 |
| SR3 | Push/merge/PR/branch-delete/worktree/force-push blocked | T-024, T-042, T-043 |
| SR4 | Secrets never logged or in evidence | T-043 (reason field constraint) |
| SR5 | Evidence output no private tokens | T-043, T-081 |
| SR6 | Remote CI advisory-only | All tasks — local gates only |
| SR7 | Clear "simulated" vs "blocked" distinction | T-041, T-043 |
| SR8 | Kill switch consistency (POSITRON_ENABLE_*) | T-042 |
| FR6 | No exports to non-existent modules | T-050, T-064 |
| FR8 | stash@{0} untouched | T-002, T-080 |

---

## Red Tests Traceability

| Red Test | Source | Task | Phase |
|----------|--------|------|-------|
| RT1 | Export → non-existent `deterministic-fixture-agent.ts` | T-020, T-022 | Phase 2 |
| RT2 | Export → non-existent `dry-run-agent.ts` | T-021, T-022 | Phase 2 |
| RT3 | Dry-run blocks file write outside temp path | T-023 | Phase 2 |
| RT4 | Dry-run blocks GitHub push | T-024 (RT4) | Phase 2 |
| RT5 | Dry-run blocks PR creation | T-024 (RT5) | Phase 2 |
| RT6 | Dry-run blocks merge/branch delete | T-024 (RT6) | Phase 2 |
| RT7 | Fixture agent non-deterministic output | T-025 | Phase 2 |
| RT8 | Evidence missing executionMode | T-026 | Phase 2 |
| RT9 | Status doc claims without evidence | T-027 | Phase 2 |

---

## User Story Coverage

| User Story | Description | Tasks |
|------------|-------------|-------|
| US1 (P0) | Deterministic Fixture Execution | T-030 – T-034 (Phase 3) |
| US2 (P0) | Safe OpenCode Dry Run | T-040 – T-046 (Phase 4) |
| US3 (P1) | Capability/Type Foundation | T-010 – T-012 (Phase 1) |
| US4 (P2) | Evidence-Backed Documentation | T-070 – T-073 (Phase 7) |

---

## Scope Boundaries (Hard Constraints)

### Within Scope
- `packages/shared/src/opencode-types.ts` — `ExecutionMode` type + `executionMode?` field
- `packages/opencode-adapter/src/deterministic-fixture-agent.ts` — new file
- `packages/opencode-adapter/src/dry-run-agent.ts` — new file
- `packages/opencode-adapter/src/index.ts` — new exports
- `packages/opencode-adapter/src/__tests__/deterministic-fixture-agent.test.ts` — new file
- `packages/opencode-adapter/src/__tests__/dry-run-agent.test.ts` — new file

### Out of Scope (Do Not Implement)
- ❌ `packages/shared/src/agent-types.ts` — NOT created
- ❌ `AgentDeclaration`, `CodingAgentAdapter`, `AgentCapabilityRegistry` — deferred (OQ6)
- ❌ `docs/status/current-capabilities.md` — not auto-generated (OQ5)
- ❌ `docs/status/known-limitations.md` — not auto-generated (OQ5)
- ❌ `packages/opencode-adapter/src/real-adapter.ts` — not modified
- ❌ `packages/opencode-adapter/src/fake-adapter.ts` — not modified
- ❌ Any file from `stash@{0}` — not applied, extracted, or referenced
- ❌ New packages or workspaces — implementation in existing packages only
- ❌ GitHub Actions / CI changes
- ❌ Biome lint fixes, E2E tracing, mutation resolution

---

## Stash Handling (Repeated for Emphasis)

```
stash@{0} — ERHALTEN. HIGH RISK. NIEMALS ANFASSEN.
  - apply: VERBOTEN
  - pop:   VERBOTEN
  - drop:  VERBOTEN
  - extract files: VERBOTEN
  - use as implementation template: VERBOTEN
  - use as aspirational guidance in spec: ERLAUBT (already done in Phase 1-3)

stash@{1} — ERHALTEN. UNBERÜHRT.
  - Partially recovered via PR #262
  - No further action in this feature
```

---

## Implementation Gates (Sequential Checkpoints)

| Gate | After Phase | Requirement | Block If Fail |
|------|------------|-------------|---------------|
| **Safety Gate** | Phase 0 | Clean tree, single workspace, no-agent-types rule | STOP |
| **Type Gate** | Phase 1 | `npm run typecheck` passes, contract tests green | STOP |
| **Red Gate** | Phase 2 | All red tests written, import-based tests fail | STOP (before implementation) |
| **Fixture Green Gate** | Phase 3 | Fixture agent tests ALL green | Continue to Phase 4 |
| **Dry-Run Green Gate** | Phase 4 | Dry-run agent tests ALL green | Continue to Phase 5 |
| **Export Gate** | Phase 5 | No broken export paths, real adapter unchanged | STOP |
| **Integration Gate** | Phase 6 | `npm run typecheck` + all tests + diff check | STOP |
| **Evidence Gate** | Phase 7 | Limitations documented, portfolio updated | Continue |
| **Review Gate** | Phase 8 | Review-agent: no stash applied, dry-run safe | STOP (before human approval) |
| **Human Gate** | Phase 8 | Human Approval for commit/push/PR/merge | STOP |

---

## Verification Contract (Same as Spec §9 and Plan §13)

### Mandatory Local Gates (Run After Every Phase)
```powershell
npx vitest run packages/shared/src/__tests__/prompt-standard.contract.test.ts
npm run typecheck
git diff --check
```

### Targeted Tests (Run After Phases 3-4)
```powershell
npx vitest run packages/opencode-adapter/src/__tests__/
```

### Red → Green Flow
1. Phase 1: Shared types → typecheck green
2. Phase 2: Write red tests → import failures confirmed
3. Phase 3: Implement DeterministicFixtureAgent → green
4. Phase 4: Implement OpenCodeDryRunAgent → green
5. Phase 5: Wire exports → no broken paths
6. Phase 6: Full integration → all gates green

---

## Notes

- **SpecKit CLI:** `specify tasks` command is not available in this environment (v0.8.5.dev0). Tasks were created manually following the project convention from Issue #219 and the Speckit workflow specification.
- **No Remote CI:** All verification gates are local. GitHub CI is advisory-only and must not be triggered as a required gate.
- **No Auto-Merge:** Merging requires explicit human approval after code review.
- **Sequential Approval Chain:** `APPROVE RUN SPECKIT TASKS` → (this run) → `APPROVE COMMIT` → `APPROVE PUSH` → `APPROVE CREATE PR` → `APPROVE MERGE`.
- **Task ID Convention:** `T-XXX` format following Issue #219 precedent. Tasks are numbered sequentially within phases: T-001–T-003 (Phase 0), T-010–T-012 (Phase 1), T-020–T-028 (Phase 2), etc.
