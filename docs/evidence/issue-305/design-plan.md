# Design Plan — Issue #305

## Metadata
- **Timestamp:** 2026-06-27T13:15:00Z
- **Run ID:** issue-305-design-01
- **Executor:** issue-orchestrator

---

## 1. Module Location

### Decision
**`packages/shared/src/evidence-portfolio/`** (new directory)

### Rationale
- `packages/shared` already hosts all utility modules (evidence-gate, local-gate-runner, safe-apply-plan, etc.)
- No circular dependency risk — portfolio updater reads from file system, doesn't import from server
- Follows established pattern: `evidence-gate.ts`, `local-gate-runner.ts` are co-located in shared
- Tests align with `packages/shared/src/__tests__/` convention
- New subdirectory keeps the module self-contained and avoids cluttering shared root

### Module Structure
```
packages/shared/src/evidence-portfolio/
    index.ts              — Public API exports
    types.ts              — PortfolioUpdateInput, PortfolioUpdateResult, etc.
    portfolio-updater.ts   — Core update logic (plan + apply)
    markdown-utils.ts     — Low-level Markdown block detection/writing
    __tests__/
        portfolio-updater.test.ts      — Unit tests
        portfolio-updater.integration.test.ts — Fake-run integration test
```

---

## 2. Types (MVP)

### `PortfolioUpdateInput`
```typescript
export interface PortfolioUpdateInput {
  /** Unique run identifier (e.g., "issue-305-01") */
  runId: string;
  
  /** Overall run status — determines what gets updated */
  status: 'GREEN' | 'YELLOW' | 'RED' | 'UNKNOWN';
  
  /** Evidence artifact paths produced by the run */
  evidencePaths: string[];
  
  /** New capabilities discovered (optional) */
  capabilities?: string[];
  
  /** New limitations discovered (optional) */
  limitations?: string[];
  
  /** Issues completed in this run (optional) */
  completedIssues?: number[];
  
  /** Issues created in this run (optional) */
  createdIssues?: number[];
  
  /** Path to run summary JSON (optional, for richer extraction) */
  sourceSummaryPath?: string;
  
  /** When true, actually writes files. When false, dry-run only. */
  apply: boolean;
  
  /** Which portfolio files to update */
  targetFiles?: ('capabilities' | 'limitations' | 'evidence-index')[];
}
```

### `PortfolioUpdateResult`
```typescript
export interface PortfolioUpdateResult {
  /** Files that were modified */
  changedFiles: string[];
  
  /** Files that were skipped (no changes needed or unsafe) */
  skippedFiles: string[];
  
  /** Non-blocking warnings */
  warnings: string[];
  
  /** Blocking conflicts that prevented updates */
  conflicts: string[];
  
  /** Was the update applied? */
  applied: boolean;
  
  /** Per-file detail */
  fileDetails: Record<string, PortfolioFileDetail>;
}

export interface PortfolioFileDetail {
  file: string;
  updated: boolean;
  reason: string;
  addedCapabilities?: string[];
  addedLimitations?: string[];
  addedEvidencePaths?: string[];
  skippedDuplicates?: string[];
}
```

### `EvidencePortfolioConfig`
```typescript
export interface EvidencePortfolioConfig {
  /** Enable portfolio auto-update */
  enabled: boolean;
  
  /** Minimum run status to trigger update (default: GREEN) */
  minimumStatus: 'GREEN' | 'YELLOW' | 'RED' | 'UNKNOWN';
  
  /** Require minimum N evidence paths before allowing update */
  minEvidencePaths: number;
  
  /** Skip update if markers are missing (false = warning only) */
  requireMarkers: boolean;
}
```

---

## 3. Core Functions

### `planEvidencePortfolioUpdate(input: PortfolioUpdateInput): PortfolioPlan`
- Validates input (status, evidence paths, apply flag)
- Reads current portfolio files
- Detects marker blocks or legacy sections
- Computes what would change (new rows to insert)
- Returns a plan without writing

### `applyEvidencePortfolioUpdate(input: PortfolioUpdateInput): PortfolioUpdateResult`
- Calls `planEvidencePortfolioUpdate()`
- If `input.apply === true`: writes changes
- If `input.apply === false`: returns plan only (dry run)
- Enforces all safety rules

### `extractPortfolioUpdateFromRunSummary(summaryPath: string): Partial<PortfolioUpdateInput>`
- Reads a run summary JSON
- Extracts capabilities, limitations, evidence paths
- Returns partial input for upstream callers

---

## 4. Update Strategy

### Generated Block Approach

Each automatable section in portfolio files uses HTML comment markers:

```markdown
<!-- positron:auto-generated:start <section-name> -->
... generated content ...
<!-- positron:auto-generated:end <section-name> -->
```

### MVP Sections

| File | Section Name | Content |
|------|-------------|---------|
| `current-capabilities.md` | `backlog` | Active Backlog table rows |
| `current-capabilities.md` | `evidence-refs` | Evidence References table rows |
| `known-limitations.md` | `active-limitations` | Active Limitations table rows |
| `evidence-index.md` | `evidence-map-<runId>` | New evidence directory map section |
| `evidence-index.md` | `key-reports` | Key Run Reports table rows |

### Insertion Algorithm

1. **Find block:** Locate `<!-- positron:auto-generated:start X -->` and corresponding `end` marker
2. **Parse existing rows:** Extract table rows between markers
3. **Compute delta:** Compare new rows against existing rows
4. **Deduplicate:** Skip rows that already exist (by issue number, path, etc.)
5. **Append new rows:** Insert new rows before the end marker
6. **Preserve surrounding content:** Everything outside markers is immutable

### Append-Only Enforcement
- New rows are appended at the end of the block (before `end` marker)
- Existing rows are never removed or reordered
- The code never touches content outside marker blocks

---

## 5. Conflict Strategy

| Scenario | Action |
|----------|--------|
| Marker block missing | If `requireMarkers: true` → CONFLICT (skip file). If `false` → WARNING, skip file |
| Marker block malformed (start without end) | CONFLICT (skip file) |
| Content between markers not parseable | WARNING (skip file, preserve existing) |
| Duplicate entry detected | SKIP duplicate (log in `skippedDuplicates`) |
| File doesn't exist | CONFLICT (skip file) |
| Evidence paths empty but update requested | CONFLICT (skip, evidence-gating fails) |
| Status below minimum threshold | SKIP (log reason) |
| Write permission error | CONFLICT (skip file, propagate error) |

---

## 6. Evidence-Gating

### Rules
1. `input.evidencePaths.length >= config.minEvidencePaths` (default: 1)
2. `input.status` must be `>= config.minimumStatus` (default: GREEN)
3. GREEN → allow all updates
4. YELLOW → allow append but mark as `warnings`
5. RED / UNKNOWN → skip, no writes

### No Evidence → No Update
Without valid evidence paths, the updater returns `applied: false` with a `conflicts` entry. This prevents hallucinated capability claims.

---

## 7. Feature Flag

### Naming Convention
Follow existing pattern: environment variable checked inline.

```typescript
const PORTFOLIO_ENABLED = process.env.POSITRON_ENABLE_PORTFOLIO_AUTO_UPDATE === 'true';
```

### Integration Point (FUTURE — NOT in this MVP)
When `runFullPipeline` completes, if `POSITRON_ENABLE_PORTFOLIO_AUTO_UPDATE` is set:
1. Collect run summary / evidence paths
2. Call `extractPortfolioUpdateFromRunSummary()`
3. Call `applyEvidencePortfolioUpdate()`

This integration is **explicitly OUT OF SCOPE** for this MVP. The current scope is: build and test the core utility functions with fake/fixture data.

---

## 8. Test Strategy

### Unit Tests (8 tests minimum)

| # | Test | Verifies |
|---|------|----------|
| 1 | New capability is appended to capabilities.md | Append-only behavior |
| 2 | New limitation is appended to limitations.md | Append-only behavior |
| 3 | New evidence path is added to evidence-index.md | Evidence index update |
| 4 | Manual sections remain untouched | Manual section protection |
| 5 | Missing evidence paths block GREEN update | Evidence gating |
| 6 | Duplicate capability is not added twice | Deduplication |
| 7 | Missing markers produce warning not crash | Conflict handling |
| 8 | RED status prevents updates | Status gating |

### Integration Test (1 minimum)

| # | Test | Verifies |
|---|------|----------|
| 1 | Fake run summary → portfolio files updated | End-to-end fake pipeline |

### Test Data
- **Fixture files:** Temporary Markdown files with auto-generated markers in `os.tmpdir()`
- **Fake run summary:** Constructed `PortfolioUpdateInput` with known capabilities, limitations, evidence paths
- **No external tools, no real filesystem outside temp**

---

## 9. Non-Scope (Explicit Boundaries)

| Item | Status | Issue |
|------|--------|-------|
| Operator Dashboard UI | NOT in scope | #248 |
| Trace/Eval aggregation | NOT in scope | #247 |
| `runFullPipeline` integration | NOT in this MVP | Future |
| Real Mode execution | NOT in scope | — |
| Workflow changes (.github/) | NOT in scope | — |
| Manual CI trigger | NOT in scope | — |
| PR #218 modifications | NOT touched | — |
| PR Chain #230–#242 | NOT touched | — |
| CodeRabbit | Remains decommissioned | — |
| New npm dependencies | NONE needed | — |
| Database schema changes | NONE | — |

---

## 10. Security Model

1. **No network access** — pure file I/O within workspace
2. **No shell execution** — no `exec`, `spawn`, or bash calls
3. **No secret handling** — doesn't read `.env` or tokens
4. **Sandboxed writes** — only writes to files passed in `targetFiles` (relative paths within workspace)
5. **Path traversal protection** — all file paths validated to be within workspace root
6. **Dry-run by default** — `apply: false` is the safe default

---

## Classification

```
ISSUE_305_DESIGN_STATUS: GREEN_SAFE
```

### Justification
- New module in `packages/shared/src/evidence-portfolio/` — follows existing patterns
- No new dependencies
- No Real Mode code
- No UI code
- No `runFullPipeline` modifications (future integration only)
- Manual sections protected by marker blocks
- Evidence-gating is mandatory
- All operations are dry-run-safe with `apply: false` default
- Testable with temp file fixtures
- Scope clearly bounded to MVP

### Why GREEN_SAFE (not YELLOW_REVIEW)
- Read-only for manual content
- Append-only for automated content  
- Evidence-gated (no hallucinated updates)
- No external dependencies
- No destructive operations
- No pipeline integration changes
- Fully testable in isolation
- Follows established codebase patterns exactly
