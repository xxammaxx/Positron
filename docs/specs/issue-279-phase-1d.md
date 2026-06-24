# Issue #279 Phase 1D — Evidence Gate CLI

## Kurzfazit

Implement a local Evidence Gate CLI that combines the GitHub Snapshot Collector, GitHub Context Reconciler and Decision Manifest Validator into an audit-ready decision report.

## Problem

Positron can now collect GitHub snapshots, reconcile them into Decision Manifest rows, and validate those rows. It still needs one local evidence gate that produces a clear audit report for humans and agents.

## Goals

- Accept snapshot input from file or dry-run fixture.
- Optionally call the existing read-only snapshot collector.
- Run GitHub Context Reconciler.
- Run Decision Manifest Validator.
- Compute applyable actions.
- Produce a structured Evidence Gate Report.
- Print human-readable summary.
- Support JSON output.
- Support `--dry-run`.
- Default to zero applyable actions unless explicitly safe.
- Exit non-zero if validation errors exist.
- Never mutate GitHub.
- Never run remote CI.

## Non-Goals

- No GitHub mutations.
- No PR merge/close.
- No issue close/comment.
- No workflow run/rerun.
- No automatic apply.
- No PR #218 action.
- No Issue #229 closure.
- No Issue #279 closure.

## MVP CLI

`node scripts/run-evidence-gate.mjs --dry-run --repo xxammaxx/Positron`

Optional:

`node scripts/run-evidence-gate.mjs --snapshot <path>`
`node scripts/run-evidence-gate.mjs --output <path>`
`node scripts/run-evidence-gate.mjs --format json`

## Acceptance Criteria

- Dry-run works without network.
- Snapshot file input works.
- Output includes counts by risk class.
- Output includes recommendation counts.
- Output includes applyable actions count.
- Current repo-like fixture has 0 applyable actions.
- PR #218-like fixture remains YELLOW_REVIEW.
- TOOL_GAP is visible in report.
- RED_HOLD is visible in report.
- Validation errors produce non-zero exit.
- GitHub mutation commands are not present.
- Report can be written to gitignored `.local-release/evidence-gate/`.

## Evidence Gate Core API

```ts
export interface EvidenceGateReport {
  status: "PASS" | "WARN" | "FAIL";
  generatedAt?: string;
  summary: {
    totalRows: number;
    applyableActions: number;
    validationErrors: number;
    validationWarnings: number;
  };
  riskClassCounts: Record<string, number>;
  recommendationCounts: Record<string, number>;
  applyableRows: DecisionManifestRow[];
  blockedRows: DecisionManifestRow[];
  validation: DecisionManifestValidationResult;
}

export function createEvidenceGateReportFromRows(rows: DecisionManifestRow[]): EvidenceGateReport;

export function createEvidenceGateReportFromGitHubContext(snapshot: GitHubContextSnapshot): EvidenceGateReport;
```

## Safety Rules

- Evidence Gate darf keine Apply-Aktion ausführen.
- Es darf nur zählen, berichten und blockieren.
- Keine gh CLI-Ausführung im shared Modul.
- Keine fetch/network Calls.
- Keine GitHub mutations.
- Keine Dateisystem-Schreiboperationen (im shared Modul).
- Keine neuen Dependencies.
- Deterministic output.

## Exit Code Contract

```
0 = valid report generated, no validation errors
1 = validation errors or invalid input
2 = CLI usage error
3 = prohibited command/path/safety violation
```

## Local Gates

- npm run build
- npm run typecheck
- npm test
- npm test --workspace apps/web
- CLI dry-run test
