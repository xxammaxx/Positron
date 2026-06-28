# Issue #279 Phase 1G — Safe Apply Plan Export

## Kurzfazit

Implement a Safe Apply Plan Export that translates Human Approval Pack Reports (Phase 1F) into non-executing, auditable apply plans. Every plan action must explicitly be marked `executable: false`.

## Problem

Positron can now create owner-facing approval packages via Phase 1F (Human Approval Pack Generator), but it still needs a safe plan artifact that describes what would be applied after approval — without executing anything, without mutating GitHub, and without bypassing human approval.

## Existing Foundation

All on main (via PRs #289–#294):

- **Phase 1A:** Decision Manifest Validator — `DecisionManifestRow`, `RiskClass`, `AgentRecommendation`
- **Phase 1B:** GitHub Context Reconciler — `GitHubContextSnapshot` → `DecisionManifestRow[]`
- **Phase 1C:** GitHub Snapshot Collector/CLI — read-only `gh` context collection
- **Phase 1D:** Evidence Gate CLI — `EvidenceGateReport`, `scripts/run-evidence-gate.mjs`
- **Phase 1E:** Local Gate Runner — `LocalGateReport`, `LocalGateDefinition`
- **Phase 1F:** Human Approval Pack Generator — `ApprovalPackage`, `ApprovalPackReport`

Phase 1G builds directly on Phase 1F's `createHumanApprovalPackReport()` output.

## Goals

- Generate `SafeApplyPlanReport` from `ApprovalPackReport`
- Keep all plans non-executing (`executable: false` on every action and every plan)
- Include planned action type, target, approval phrase, evidence references, and blockers
- Block plans when package is not applyable
- Block plans when required local gates fail
- Block plans for `YELLOW_REVIEW`, `RED_HOLD`, `TOOL_GAP`, `UNKNOWN`, `DEFER_TO_279` (explicitly non-executable)
- Support JSON output in Evidence Gate CLI
- Integrate with `run-evidence-gate.mjs` via `--safe-apply-plan`
- Never execute actions. Never mutate GitHub.

## Non-Goals

- No GitHub mutations
- No PR merge/close
- No issue close/comment from the apply plan module
- No workflow run/rerun
- No automatic apply
- No auto-fix
- No PR #218 action
- No Issue #229 closure
- No Issue #279 closure
- No shell execution from shared module
- No stash operations
- No CI reruns

## Plan Types

| Plan Type | Source Package Type | executable | Description |
|-----------|-------------------|------------|-------------|
| `NO_ACTION_PLAN` | No packages in report | false | Nothing to plan — empty report |
| `GREEN_SAFE_APPLY_PLAN` | `GREEN_SAFE_PACKAGE` (applyable=true) | false | Safe actions that could be applied after approval |
| `YELLOW_REVIEW_PLAN` | `YELLOW_REVIEW_PACKAGE` | false | Actions needing human review |
| `RED_HOLD_PLAN` | `RED_HOLD_PACKAGE` | false | Held actions — do not touch |
| `TOOL_GAP_PLAN` | `TOOL_GAP_PACKAGE` | false | Actions needing validation — tool gap |
| `DEFER_TO_279_PLAN` | `DEFER_TO_279_PACKAGE` | false | Architecture decisions deferred |
| `BLOCKED_PLAN` | Any package with blockers | false | Blocked — cannot apply |

## Types

```typescript
export type SafeApplyPlanType =
  | 'NO_ACTION_PLAN'
  | 'GREEN_SAFE_APPLY_PLAN'
  | 'YELLOW_REVIEW_PLAN'
  | 'RED_HOLD_PLAN'
  | 'TOOL_GAP_PLAN'
  | 'DEFER_TO_279_PLAN'
  | 'BLOCKED_PLAN';

export interface SafeApplyPlanAction {
  id: string;
  type: string;
  targetType: 'issue' | 'pull_request' | 'repository' | 'unknown';
  targetId: string | null;
  title: string;
  description: string;
  approvalPhrase: string | null;
  executable: false;
  blocked: boolean;
  blockerReasons: string[];
  evidenceRefs: string[];
}

export interface SafeApplyPlan {
  id: string;
  type: SafeApplyPlanType;
  packageId: string;
  title: string;
  summary: string;
  executable: false;
  actions: SafeApplyPlanAction[];
  blockerReasons: string[];
  warnings: string[];
}

export interface SafeApplyPlanReport {
  status: 'PASS' | 'WARN' | 'FAIL';
  totalPlans: number;
  executablePlans: 0;         // always 0 — type-level enforcement
  blockedPlans: number;
  reviewPlans: number;
  holdPlans: number;
  deferredPlans: number;
  plans: SafeApplyPlan[];
}
```

## Core Function

```typescript
export function createSafeApplyPlanReport(
  approvalPackReport: ApprovalPackReport
): SafeApplyPlanReport;
```

## Acceptance Criteria

1. `SafeApplyPlanReport` type exists and is exported from `packages/shared/src/index.ts`
2. `SafeApplyPlan` type exists with `executable: false` on every plan
3. `SafeApplyPlanAction` type exists with `executable: false` on every action
4. `createSafeApplyPlanReport()` returns correctly typed report from `ApprovalPackReport`
5. `GREEN_SAFE_PACKAGE` with `applyable=true` → `GREEN_SAFE_APPLY_PLAN`
6. `GREEN_SAFE_PACKAGE` with blockers → `BLOCKED_PLAN`
7. `GREEN_SAFE + DO_NOT_APPLY` remains blocked → `BLOCKED_PLAN`
8. Failing required local gate blocks green apply plan → `BLOCKED_PLAN`
9. `YELLOW_REVIEW_PACKAGE` → `YELLOW_REVIEW_PLAN` (not executable)
10. `RED_HOLD_PACKAGE` → `RED_HOLD_PLAN` (not executable)
11. `TOOL_GAP_PACKAGE` → `TOOL_GAP_PLAN` (not executable)
12. `DEFER_TO_279_PACKAGE` → `DEFER_TO_279_PLAN` (not executable)
13. `MIXED_RISK_PACKAGE` with mixed types → `BLOCKED_PLAN`
14. Approval phrase is preserved from package, not executed
15. JSON serialization is stable (deterministic output)
16. `executablePlans` is always 0 (type-level enforcement)
17. Plan summary counts are correct
18. Plan contains evidence references when provided
19. No execute/apply function exists in the module
20. Empty `ApprovalPackReport` (no packages) → `NO_ACTION_PLAN`
21. CLI `--safe-apply-plan` option integrated with `run-evidence-gate.mjs`
22. CLI dry-run produces safe apply plan output without executing
23. No actions are executed at any step

## Integration Points

### CLI (run-evidence-gate.mjs)
- New option: `--safe-apply-plan`
- Requires or defaults with `--approval-pack`
- JSON output includes `safeApplyPlanReport` field
- Human-readable output shows non-executing plans
- Example: `node scripts/run-evidence-gate.mjs --dry-run --approval-pack --safe-apply-plan`

### Barrel Export (packages/shared/src/index.ts)
- New line: `export * from './safe-apply-plan.js';`

## Safety Rules

- Safe Apply Plan Export never executes an action
- It only produces non-executing plans and documented approval phrases
- No network calls, no shell execution, no file system writes in the shared module
- No new dependencies
- Deterministic output
- `executablePlans: 0` is type-level enforced (literally `0` literal type)
