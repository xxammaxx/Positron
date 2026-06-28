# Implementation Plan: DeterministicFixtureAgent + OpenCodeDryRunAgent

**Issue:** #263  
**Date:** 2026-06-20  
**Phase:** 3 — Plan Only (no implementation, no tasks, no stash apply)  
**Estimated Complexity:** Medium (2 new source files, 2 test files, 1 shared type extension)

---

## Architecture Decision Records

### ADR-A: File Structure — Standalone Flat Files

**Decision:** Two new standalone files at `packages/opencode-adapter/src/`, following the existing flat structure (`fake-adapter.ts`, `real-adapter.ts`).

```
packages/opencode-adapter/src/
  ├── index.ts                              (MODIFIED — add new exports)
  ├── fake-adapter.ts                       (existing, unchanged)
  ├── real-adapter.ts                       (existing, unchanged)
  ├── deterministic-fixture-agent.ts        (NEW)
  ├── dry-run-agent.ts                      (NEW)
  └── __tests__/
      ├── deterministic-fixture-agent.test.ts  (NEW)
      └── dry-run-agent.test.ts               (NEW)
```

**Rationale:** OQ7 resolved — standalone files match existing convention. No subdirectory (`agents/`, `modes/`) introduced. If the package grows beyond 5-6 implementation files, a subdirectory refactor can be a follow-up issue.

**Affected files:** 2 new source, 2 new test, 1 modified (`index.ts`).

---

### ADR-B: Minimal Shared Type — ExecutionMode in `opencode-types.ts`

**Decision:** Add `ExecutionMode` type + `executionMode` field to `OpenCodeCommandResult` directly in `packages/shared/src/opencode-types.ts`. No new `agent-types.ts`.

```typescript
// Additions to packages/shared/src/opencode-types.ts:

/** Execution mode distinguishing how changes were produced. */
export type ExecutionMode = 'fixture' | 'dry-run' | 'real';

// In OpenCodeCommandResult interface, add:
/** How changes were produced. Undefined = legacy adapter without mode awareness. */
executionMode?: ExecutionMode;
```

**Rationale:** OQ2 resolved — `opencode-types.ts` (96 lines) is already the canonical home for OpenCode types. `ExecutionMode` is directly related to execution, not a separate agent capability domain. Adding one type + one optional field is minimal. The existing `export * from './opencode-types.js'` in `shared/src/index.ts` auto-exports the new type.

**NOT created:** `packages/shared/src/agent-types.ts` — the 431-line stash file with `AgentDeclaration`, `CodingAgentAdapter`, `AgentCapabilityRegistry` is entirely deferred (OQ6).

**Affected files:** 1 modified (`opencode-types.ts`).

---

### ADR-C: Operation Tiering — Three Tiers

**Decision:** Three-tier classification for dry-run operations (OQ3):

| Tier | Category | Examples | Dry-Run Behavior |
|------|----------|----------|-----------------|
| **Simulated** | Read-only, side-effect-free | `git status`, `git log`, `gh issue view`, file reads, npm test equivalent | Recorded as "would be performed." No side effects. |
| **Blocked** | Writes, destructive mods | file writes (outside temp paths), `git add/commit/push`, `gh pr create`, `git merge`, `git branch -d`, `git worktree add`, `npm install`, force-push | Recorded as blocked with reason. Refused even in dry-run. |
| **Reported** | Pure informational | listing, querying, audit-only operations | Recorded as planned; neither simulated nor blocked. |

File reads are **simulated** (not blocked) — they are side-effect-free. File writes outside controlled `.positron/test-artifacts/` paths are **blocked** (SR1). All GitHub write operations are **blocked** (SR3).

**Implementation:** The `DryRunAgentOutput` contains three separate arrays: `simulatedActions: string[]`, `blockedActions: { operation: string; reason: string }[]`, `reportedActions: string[]`.

**Affected files:** `dry-run-agent.ts` (decision logic).

---

### ADR-D: EvidenceReport Schema

**Decision:** Minimal structured evidence schema (OQ4):

```typescript
interface EvidenceReport {
  runId: string;
  executionMode: ExecutionMode;
  timestamp: string;           // ISO 8601, UTC-normalized or with explicit offset
  source: string;              // e.g., 'DeterministicFixtureAgent', 'OpenCodeDryRunAgent'
  durationMs: number;
  status: 'success' | 'partial' | 'blocked' | 'failed';
  simulatedActions: string[];
  blockedActions: { operation: string; reason: string }[];
  reportedActions: string[];
  warnings: string[];          // e.g., "POSITRON_MERGE_KILL_SWITCH active"
  changedFiles: string[];      // Absolute paths; empty in pure dry-run
  summary: string;             // Human-readable
}
```

Evidence files written to: `.positron/evidence/<runId>.json`.

**Location:** `EvidenceReport` type defined in `dry-run-agent.ts` (local to the package — not shared since no other package consumes it yet). If needed cross-package later, moved to shared types in a follow-up.

**Safety:** `blockedActions[].reason` MUST NOT contain tokens, env var values, or credentials (SR4, SR5). Secrets must never appear in evidence output.

**Affected files:** `dry-run-agent.ts` (type definition + implementation), `deterministic-fixture-agent.ts` (produces EvidenceReport with executionMode='fixture').

---

### ADR-E: Kill Switch Integration

**Decision:** Dry-run agent acknowledges, respects, and never bypasses kill switches (OQ8):

1. **Check `POSITRON_MERGE_KILL_SWITCH`** — if active (not 'false'), merge/branch-delete operations classify as **blocked** with reason citing the kill switch.
2. **Check `POSITRON_ENABLE_PUSH`** — if not 'true', push operations classify as **blocked** with reason.
3. **Add `POSITRON_ENABLE_DRY_RUN`** — new env var following the `POSITRON_ENABLE_*` pattern. Default `'true'` in `NODE_ENV=test`, `'false'` otherwise. Dry-run agent constructor checks this gate.
4. **Warnings in evidence** — kill switch status reported in `EvidenceReport.warnings[]`.

**Implementation pattern:** follows existing `dogfood-fixture.ts`:
```typescript
if (process.env['POSITRON_ENABLE_DRY_RUN'] !== 'true') {
  throw new Error('Dry-run agent disabled: POSITRON_ENABLE_DRY_RUN not set to "true"');
}
```

**Affected files:** `dry-run-agent.ts` (constructor gate + operation classification).

---

### ADR-F: Tests-First — Red Tests Before Implementation

**Decision:** All 9 red tests from the spec (RT1-RT9, §9.3) are defined before implementation begins:

| # | Red Test | Expected Failure Mode |
|---|----------|----------------------|
| RT1 | `import { DeterministicFixtureAgent } from '..'` before file exists | Module resolution error |
| RT2 | `import { OpenCodeDryRunAgent } from '..'` before file exists | Module resolution error |
| RT3 | Dry-run with file write outside temp path → blocked operation | Assertion: `blockedActions.length > 0` |
| RT4 | Dry-run with GitHub push → blocked operation | Assertion: blocked with reason |
| RT5 | Dry-run with PR creation → blocked operation | Assertion: blocked with reason |
| RT6 | Dry-run with merge or branch delete → blocked operation | Assertion: blocked with reason |
| RT7 | Fixture agent returns non-deterministic output for same input | Test assertion failure |
| RT8 | Evidence output missing `executionMode` field | Schema validation failure |
| RT9 | Status doc claims test count without evidence | Doc audit failure (manual check) |

**Timing:** Tests are written in the test files BEFORE the source modules exist. RT1 and RT2 will fail on import (module not found). RT3-RT8 are written as vitest tests that will fail once the module exists but before the blocking logic is complete. This confirms the "red → green → refactor" cycle.

**Affected files:** `deterministic-fixture-agent.test.ts`, `dry-run-agent.test.ts` (both NEW).

---

### ADR-G: Documentation — Manual Only

**Decision:** No auto-generated `docs/status/*` from evidence (OQ5). Documentation is a separate human concern, potentially a follow-up issue. No `docs/status/` files modified in this plan.

**Evidence artifacts** (`.positron/evidence/<runId>.json`) exist as verifiable records that human-written docs can reference. US4 (P2 priority) is intentionally deferred.

**Affected files:** None in `docs/`.

---

## Implementation Phases

### Phase 1: Shared Type Foundation

**Goal:** Add `ExecutionMode` type + `executionMode` field to `OpenCodeCommandResult`.

**Steps:**
1. Add `export type ExecutionMode = 'fixture' | 'dry-run' | 'real';` to `packages/shared/src/opencode-types.ts` (after `OpenCodePhase` definition, before `OpenCodeCommandStatus`).
2. Add `executionMode?: ExecutionMode` field to `OpenCodeCommandResult` interface.
3. Verify: `npm run typecheck` passes — existing code uses no new field, so no breakage.
4. Verify: `npx vitest run packages/shared/src/__tests__/prompt-standard.contract.test.ts` — green.

**Files:** 1 modified (`opencode-types.ts`)  
**Risk:** Very Low (additive, optional field, no existing consumer)

---

### Phase 2: Red Tests (Failure Expected)

**Goal:** Write test files that fail before implementation — confirming the TDD red phase.

**Steps:**
1. Create `packages/opencode-adapter/src/__tests__/deterministic-fixture-agent.test.ts`:
   - Import from `'../deterministic-fixture-agent.js'` → will fail (module not found) — RT1, RT2
   - Test: "same input produces same output" — RT7
   - Test: "evidence output includes executionMode='fixture'" — RT8
2. Create `packages/opencode-adapter/src/__tests__/dry-run-agent.test.ts`:
   - Import from `'../dry-run-agent.js'` → will fail (module not found) — RT1, RT2
   - Test: "blocks file write outside temp path" — RT3
   - Test: "blocks GitHub push" — RT4
   - Test: "blocks PR creation" — RT5
   - Test: "blocks merge or branch deletion" — RT6
   - Test: "generates EvidenceReport on run" — RT8
3. Run tests: expect import failures.

**Files:** 2 new test files  
**Risk:** Low (test-only)  
**Expected result:** All 2 test suites fail at import resolution.

---

### Phase 3: DeterministicFixtureAgent Implementation

**Goal:** Implement `DeterministicFixtureAgent` making red tests green.

**Steps:**
1. Create `packages/opencode-adapter/src/deterministic-fixture-agent.ts`:
   - Class `DeterministicFixtureAgent`
   - Constructor accepts `FixtureAgentConfig`:
     ```typescript
     interface FixtureAgentConfig {
       fixtures: Map<string, Fixture>;           // fixture scenario → data
       evidenceDir?: string;                     // default: '.positron/evidence/'
     }
     interface Fixture {
       scenario: string;
       phases: Array<{
         phase: OpenCodePhase;
         result: OpenCodeCommandResult;
       }>;
     }
     ```
   - Method `execute(scenario: string, input: OpenCodeRunInput): Promise<EvidenceReport>`
     - Lookup fixture by scenario → use its data
     - Build `EvidenceReport` with `executionMode: 'fixture'`
     - Map fixture phases to `simulatedActions`
     - Write evidence to `.positron/evidence/<runId>.json`
     - Return report
   - Deterministic: same scenario + same input → same `EvidenceReport` fields (no random values)
   - Timestamps: use `new Date().toISOString()` normalized or configurable (for test determinism)
   - Error handling: missing fixture → `status: 'failed'` with clear error message

2. Update `packages/opencode-adapter/src/index.ts`:
   - Add `export { DeterministicFixtureAgent } from './deterministic-fixture-agent.js';`
   - Add `export type { FixtureAgentConfig } from './deterministic-fixture-agent.js';`

3. Run tests: `npx vitest run packages/opencode-adapter/src/__tests__/deterministic-fixture-agent.test.ts` → green.

**Files:** 1 new source, 1 modified (`index.ts`), 1 test (already created)  
**Risk:** Low (isolated, no external dependencies, no network)

---

### Phase 4: OpenCodeDryRunAgent Implementation

**Goal:** Implement `OpenCodeDryRunAgent` with safety gates.

**Steps:**
1. Create `packages/opencode-adapter/src/dry-run-agent.ts`:
   - Class `OpenCodeDryRunAgent`
   - Constructor checks `POSITRON_ENABLE_DRY_RUN` env var (throw if not 'true').
   - Constructor accepts `DryRunAgentConfig`:
     ```typescript
     interface DryRunAgentConfig {
       evidenceDir?: string;            // default: '.positron/evidence/'
       blockedOperations?: string[];    // additional user-blocked operations
     }
     ```
   - Method `analyzeActions(plannedActions: ActionPlan[], input: OpenCodeRunInput): Promise<EvidenceReport>`:
     - Classify each action as simulated, blocked, or reported
     - Check kill switches for push/merge operations
     - Build `EvidenceReport`
     - Write evidence to `.positron/evidence/<runId>.json`
     - Return report
   - Method `runSlashCommand(command: string, input: OpenCodeRunInput): Promise<EvidenceReport>`:
     - Reports intended command execution
     - Classifies all underlying actions
     - Never executes the actual command
   - Operation classifier logic:
     ```typescript
     function classifyOperation(op: string): 'simulated' | 'blocked' | 'reported' {
       // Blocked: file writes (outside temp), git push/commit, gh pr, merge, branch -d, worktree add, npm install/publish, force-push
       // Simulated: file reads, git status/log/diff, gh issue view, npm test, typecheck
       // Reported: everything else
     }
     ```
   - Kill switch integration:
     ```typescript
     function checkKillSwitch(op: string): string | null {
       if (['push', 'force-push'].includes(op) && process.env['POSITRON_ENABLE_PUSH'] !== 'true')
         return 'POSITRON_ENABLE_PUSH is not set to "true"';
       if (['merge', 'branch-delete'].includes(op) && process.env['POSITRON_MERGE_KILL_SWITCH'] !== 'false')
         return 'POSITRON_MERGE_KILL_SWITCH is active — operation blocked';
       return null; // not blocked by kill switch
     }
     ```
   - Evidence output: `EvidenceReport` with `executionMode: 'dry-run'`.

2. Update `packages/opencode-adapter/src/index.ts`:
   - Add `export { OpenCodeDryRunAgent } from './dry-run-agent.js';`
   - Add `export type { DryRunAgentConfig } from './dry-run-agent.js';`

3. Run tests: `npx vitest run packages/opencode-adapter/src/__tests__/dry-run-agent.test.ts` → green.

**Files:** 1 new source, 1 modified (`index.ts`), 1 test (already created)  
**Risk:** Medium (safety logic, must correctly block dangerous operations)

---

### Phase 5: Integration Verification

**Goal:** Verify no regressions, all gates green.

**Steps:**
1. `npm run typecheck` — must pass (new files + modified shared type)
2. `npx vitest run packages/shared/src/__tests__/prompt-standard.contract.test.ts` — green (no change)
3. `npx vitest run packages/opencode-adapter/src/__tests__/` — all tests green (4 test suites)
4. `git diff --check` — clean (no whitespace issues)
5. Manual verification: no exports reference non-existent modules.

**Files:** None new  
**Risk:** Low (verification only)

---

## Dependency Graph

```
packages/opencode-adapter/src/deterministic-fixture-agent.ts
  ├── imports: @positron/shared (OpenCodeRunInput, OpenCodeCommandResult, ExecutionMode, OpenCodePhase)
  ├── no external LLM or network calls
  └── writes: .positron/evidence/<runId>.json (side effect, controlled)

packages/opencode-adapter/src/dry-run-agent.ts
  ├── imports: @positron/shared (OpenCodeRunInput, OpenCodeCommandResult, ExecutionMode, EvidenceReport)
  ├── reads: process.env (POSITRON_ENABLE_DRY_RUN, POSITRON_ENABLE_PUSH, POSITRON_MERGE_KILL_SWITCH)
  ├── no external LLM, network, or CLI calls
  └── writes: .positron/evidence/<runId>.json (side effect, controlled)

packages/shared/src/opencode-types.ts
  └── modified: add ExecutionMode type + executionMode field (backward compatible)
```

**No new package dependencies.** Both agents use existing `@positron/shared` types only.

## File Count Summary

| Category | New Files | Modified Files |
|----------|-----------|----------------|
| Shared types | 0 | 1 (`opencode-types.ts`) |
| OpenCode adapter source | 2 | 1 (`index.ts`) |
| OpenCode adapter tests | 2 | 0 |
| **Total** | **4** | **2** |

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Breaking existing adapter tests | Low | High | Additive only; new types, no existing API changes |
| Dry-run bypassing safety accidentally | Medium | High | Red tests (RT3-RT6) gate before implementation |
| Evidence file secret leakage | Low | Critical | Red test gate; no env var values in evidence |
| Type incompatibility with existing consumers | Low | Medium | Optional `executionMode?` field, backward compatible |
| Stash temptation (apply stash@{0}) | Medium | High | Strict policy: no stash apply; plan is explicit rejection of stash approach |
| Scope creep (AgentCapabilityRegistry) | Low | Medium | Explicitly deferred in plan and spec |

## What is NOT in This Plan

- ❌ No `packages/shared/src/agent-types.ts` creation (OQ6: deferred)
- ❌ No `AgentDeclaration`, `CodingAgentAdapter`, `AgentCapabilityRegistry` (OQ6: deferred)
- ❌ No stash@{0} apply, pop, drop, or file extraction (hard prohibition)
- ❌ No `docs/status/*` modifications (OQ5: manual only, deferred)
- ❌ No real OpenCode CLI execution (dry-run is simulation-only)
- ❌ No GitHub write operations (all blocked in dry-run)
- ❌ No new package creation (all in existing `packages/opencode-adapter`)
- ❌ No worktree or sibling folder creation
- ❌ No CI/CD changes

## Verification Contract (Same as Spec §9)

### Mandatory Local Gates
```powershell
npx vitest run packages/shared/src/__tests__/prompt-standard.contract.test.ts
npm run typecheck
git diff --check
```

### New Tests
```powershell
npx vitest run packages/opencode-adapter/src/__tests__/
```

### Red → Green Flow
1. Write red tests (Phase 2) → fail
2. Implement DeterministicFixtureAgent (Phase 3) → green
3. Implement OpenCodeDryRunAgent (Phase 4) → green
4. Integration verification (Phase 5) → all green

## Handoff to Tasks Phase

After this plan is approved, `/speckit.tasks` will break down the 5 phases into atomic, testable task items. Each task will be a GitHub Issue with:
- Clear acceptance criteria
- Dependency ordering (Phase 1 → 2 → 3/4 parallel → 5)
- Local verification gates
- No remote CI requirement
