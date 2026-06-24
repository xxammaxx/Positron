# Issue #279 Phase 1F — Human Approval Pack Generator

## Kurzfazit

Implement a Human Approval Pack Generator that translates Evidence Gate Reports into simple GREEN/YELLOW/RED owner decision packages.

## Problem

Positron can collect GitHub context, classify it, validate decision manifests, produce Evidence Gate Reports and include local gates. The user still needs a simple owner-facing decision layer that groups technical rows into understandable approval packages.

## Goals

- Generate owner decision packages from EvidenceGateReport.
- Group rows by GREEN/YELLOW/RED/TOOL_GAP/DEFER.
- Keep GREEN_SAFE separate from actually applyable actions.
- Only mark a package applyable when every row is GREEN_SAFE + APPLY_GREEN_SAFE and local required gates pass.
- Convert YELLOW_REVIEW into explicit review packages.
- Convert RED_HOLD into hold packages.
- Convert TOOL_GAP/UNKNOWN/STALE/NEEDS_VALIDATION into validation-needed packages.
- Convert DEFER_TO_279 into architecture-deferred packages.
- Produce simple approval phrases.
- Support JSON output.
- Integrate with run-evidence-gate CLI via --approval-pack.
- Never execute actions.
- Never mutate GitHub.

## Non-Goals

- No GitHub mutations.
- No PR merge/close.
- No issue close/comment.
- No workflow run/rerun.
- No automatic apply.
- No auto-fix.
- No PR #218 action.
- No Issue #229 closure.
- No Issue #279 closure.

## Package Types

- GREEN_SAFE_PACKAGE
- YELLOW_REVIEW_PACKAGE
- RED_HOLD_PACKAGE
- TOOL_GAP_PACKAGE
- DEFER_TO_279_PACKAGE
- MIXED_RISK_PACKAGE

## Acceptance Criteria

- ApprovalPackage type exists.
- ApprovalPackReport type exists.
- GREEN_SAFE + DO_NOT_APPLY is not applyable.
- GREEN_SAFE + APPLY_GREEN_SAFE can be applyable only if local required gates pass.
- YELLOW_REVIEW rows become YELLOW_REVIEW_PACKAGE.
- RED_HOLD rows become RED_HOLD_PACKAGE.
- TOOL_GAP/UNKNOWN rows become TOOL_GAP_PACKAGE.
- DEFER_TO_279 rows become DEFER_TO_279_PACKAGE.
- Local required gate failure blocks GREEN apply packages.
- Approval phrases are deterministic.
- Output is stable JSON.
- CLI supports --approval-pack.
- CLI dry-run can produce approval pack.
- No actions are executed.

## API Design

```ts
export type ApprovalPackageType =
  | "GREEN_SAFE_PACKAGE"
  | "YELLOW_REVIEW_PACKAGE"
  | "RED_HOLD_PACKAGE"
  | "TOOL_GAP_PACKAGE"
  | "DEFER_TO_279_PACKAGE"
  | "MIXED_RISK_PACKAGE";

export type ApprovalPackageStatus =
  | "READY_FOR_APPROVAL"
  | "REVIEW_REQUIRED"
  | "HOLD"
  | "DEFER"
  | "BLOCKED";

export interface ApprovalPackage {
  id: string;
  type: ApprovalPackageType;
  status: ApprovalPackageStatus;
  title: string;
  summary: string;
  rowIds: string[];
  riskClasses: string[];
  recommendations: string[];
  applyable: boolean;
  approvalPhrase: string | null;
  blockerReasons: string[];
  warnings: string[];
}

export interface ApprovalPackReport {
  status: "PASS" | "WARN" | "FAIL";
  totalPackages: number;
  applyablePackages: number;
  reviewPackages: number;
  holdPackages: number;
  deferredPackages: number;
  packages: ApprovalPackage[];
}

export function createHumanApprovalPackReport(
  evidenceGateReport: EvidenceGateReport
): ApprovalPackReport;
```

## Safety Rules

- No action execution.
- No GitHub mutations.
- Pure functions in shared module.
- CLI extension only — no new dependencies.
- Output only to controlled/gitignored paths.
