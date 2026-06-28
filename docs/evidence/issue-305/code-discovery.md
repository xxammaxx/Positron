# Code Discovery — Issue #305

## Metadata
- **Timestamp:** 2026-06-27T13:05:00Z
- **Run ID:** issue-305-code-discovery-01
- **Executor:** issue-orchestrator (delegated to explore agent)

## 1. `runFullPipeline`

### Location
- **File:** `apps/server/src/index.ts`, line ~1525
- **Signature:**
```typescript
async function runFullPipeline(
    run: RunState,
    repository: RepositoryConfig,
    workspace: GitWorkspaceAdapter,
    speckit: SpecKitAdapter,
    opencode: OpenCodeAdapter,
    github: GitHubAdapter,
    syncService?: GitHubStatusSyncService,
    options?: { startFromPhase?: Phase },
): Promise<RunState>
```

### What it does
- Core orchestrator for the entire Positron pipeline
- Loops through phases via `executePhase()` (max 20 steps)
- Supports Resume-by-State and Fix-Loop retries
- **No evidence portfolio update step exists** after completion
- No post-run hook for documentation refresh

### Call sites
- `POST /api/repos/:repoId/issue-runs` (multiple inline fallback paths)
- `POST /api/blueprint/runs`
- `POST /api/demo-runs`
- `POST /api/demo/live-run`

## 2. Existing Evidence/Portfolio Update Code

| Search Term | Files Found | Match |
|-------------|-------------|-------|
| `LivingEvidencePortfolio` | 0 | Does NOT exist in codebase |
| `portfolio-update` | 0 | Does NOT exist |
| `evidence-portfolio` | 0 | Does NOT exist |
| `current-capabilities.md` reference | 1 | Only in `prompt-standard.contract.test.ts` (test verifying prompt mentions the file) |
| `known-limitations.md` reference | 1 | Only in `prompt-standard.contract.test.ts` |
| `evidence-index.md` reference | 0 | No code references |

**Gap: No automated portfolio update mechanism exists.**

## 3. Run Summary / Evidence Types

### `ExecutionMode` (canonical — `packages/shared/src/opencode-types.ts`)
```typescript
export type ExecutionMode = 'fixture' | 'dry-run' | 'real';
```

### `EvidenceReport` (`packages/opencode-adapter/src/deterministic-fixture-agent.ts`)
```typescript
export interface EvidenceReport {
    runId: string;
    executionMode: ExecutionMode;
    timestamp: string;
    source: string;
    durationMs: number;
    status: 'success' | 'partial' | 'blocked' | 'failed';
    simulatedActions: string[];
    blockedActions: { operation: string; reason: string }[];
    reportedActions: string[];
    warnings: string[];
    changedFiles: string[];
    summary: string;
}
```

### `CapabilityDelta` (`packages/benchmark-rudolph/src/evidence-contract.ts`)
```typescript
export interface CapabilityDelta {
    newCapabilities: string[];
    removedBlockers: string[];
    unchangedLimitations: string[];
    remainingRisks: string[];
    nextBestStep: string;
}
```

### `BenchmarkIssueResult` (includes `evidencePaths` — `packages/benchmark-rudolph/src/evidence-contract.ts`)
```typescript
export interface BenchmarkIssueResult {
    id: string;
    title: string;
    status: 'DONE' | 'PARTIAL' | 'BLOCKED' | 'UNKNOWN_EVIDENCE';
    evidencePaths: string[];      // <--- evidence paths per issue
    testNames: string[];
    changedFiles: string[];
    confidence: number;
}
```

### `RudolphBenchmarkRunSummary` (`packages/benchmark-rudolph/src/evidence-contract.ts`)
Full run summary with: runId, timestampUtc, executionMode, repo status, issues, commands, tests, safety, conclusion, capabilityDelta.

### `BenchmarkConclusion`
```typescript
export interface BenchmarkConclusion {
    status: 'GREEN' | 'YELLOW' | 'RED' | 'UNKNOWN';
    whatWorks: string[];
    whatDoesNotWork: string[];
    whatIsUnproven: string[];
    confidence: number;
}
```

### `EvidenceItem` (shared — `packages/shared/src/interfaces.ts`)
```typescript
export interface EvidenceItem {
    kind: string;
    status: 'pass' | 'fail' | 'blocked' | 'skipped' | 'partial';
    summary: string;
    artifactPath?: string;
    timestamp?: string;
}
```

## 4. Markdown Utilities

**No dedicated markdown utilities exist.** All markdown generation is ad-hoc string concatenation:
- `renderPRBody()` — `apps/server/src/index.ts` (lines 2056-2098)
- `generateBlueprintFromIssue()` — `apps/server/src/index.ts` (lines 2106-2149)
- `generateResearchDocument()` — `apps/server/src/index.ts` (lines 1938-2052)

No template engines (Handlebars, EJS, etc.) used.

## 5. Safe Write Patterns

**No safe-write patterns exist.** All file writes use direct `fs.writeFileSync()`:
- `DeterministicFixtureAgent.writeEvidence()` — direct write
- No temp-file + atomic rename patterns
- No append-only operations
- SQLite (`better-sqlite3`) provides atomicity via WAL mode

## 6. Evidence Directory Conventions

Canonical evidence directory: `.positron/evidence/`
- Pattern: `.positron/evidence/<runId>.json`
- Referenced in opencode-adapter, benchmark-rudolph, dry-run-agent
- **No centralized constant** — each adapter defines its own default
- Dry-run clean paths include `.positron/evidence`

Documentation evidence: `docs/evidence/<namespace>/`
- 32 subdirectories under `docs/evidence/`

## 7. Test Framework

- **Framework:** Vitest
- **Config:** `vitest.config.ts` (root), `vitest.safety.config.ts` (safety)
- **Pattern:** `packages/*/src/__tests__/**/*.test.ts`
- **Shared tests location:** `packages/shared/src/__tests__/`
- **Test conventions:**
  - Unit: `*.test.ts`
  - Property: `*.property.test.ts`
  - Contract: `*.contract.test.ts`

Existing test files for shared: 14 test files covering utils, types, secrets, evidence-gate, local-gate-runner, etc.

## 8. Package Structure

### `packages/shared/src/`
```
index.ts                    — Central re-exports (19 modules)
types.ts                    — Core types (Phase, RunStatus, etc.)
interfaces.ts               — DB interfaces, EvidenceItem, GitHubStatusSync
constants.ts                — Constants (labels, phases, timeouts)
utils.ts                    — Utility functions
opencode-types.ts           — OpenCode types, ExecutionMode
evidence-gate.ts            — Evidence Gate CLI
local-gate-runner.ts        — Local Gate Runner
human-approval-pack.ts      — Human Approval Pack
safe-apply-plan.ts          — Safe Apply Plan
decision-manifest.ts        — Decision Manifest
github-context-reconciler.ts
github-snapshot-collector.ts
secret-manager.ts
```

## 9. Feature Flags

**No centralized feature flag system.** All toggles are ad-hoc `process.env` checks in `apps/server/src/index.ts`:
- `POSITRON_ENABLE_MERGE`, `POSITRON_MERGE_DRY_RUN`
- `POSITRON_ENABLE_PUSH`, `POSITRON_MERGE_KILL_SWITCH`
- `POSITRON_ENABLE_FIX_LOOP`
- `POSITRON_DISABLE_QUEUE`
- `POSITRON_GITHUB_MODE` (fake/real)

Tool Gateway has `GatewayConfig.enabled: boolean` pattern.

## 10. Run-State Package

`packages/run-state/src/` provides:
- State machine (`state-machine.ts`): `createRun()`, `transition()`, `canTransition()`, `markFailed()`, `retry()`, `resumeFromEvents()`
- `RunState` type with id, repoId, issueNumber, branch, phase, status, etc.
- SQLite database layer (`db/connection.ts`, `db/schema.ts`)
- **No pipeline orchestration** — that lives in `apps/server/src/index.ts`

## 11. Key Gaps Summary

| Capability | Status |
|-----------|--------|
| Portfolio auto-update code | **NONE** |
| Markdown parsing/updating utilities | **NONE** |
| Safe file write patterns | **NONE** |
| Append-only operations | **NONE** |
| Centralized feature flags | **NONE** |
| `LivingEvidencePortfolio` type | **NONE** |
| `RUN_REPORT` type | **NONE** |
| Post-run hook in pipeline | **NONE** |
| Template-based generation | **NONE** |
| CapabilityDelta (reusable) | EXISTS (benchmark-rudolph) |
| EvidenceReport (reusable) | EXISTS (opencode-adapter) |

## Classification

```
ISSUE_305_CODE_DISCOVERY_STATUS: COMPLETE
```

### Justification
- All 10 search categories covered
- Key types identified in shared, benchmark-rudolph, and opencode-adapter
- Confirmed: no existing portfolio update code, no markdown utilities, no safe-write patterns
- Best placement: `packages/shared/src/` for new utility module (follows existing patterns)
- Existing `CapabilityDelta` and `EvidenceReport` types provide good starting interfaces
- `runFullPipeline` in `apps/server/src/index.ts` is the eventual integration point (but NOT in this MVP)
