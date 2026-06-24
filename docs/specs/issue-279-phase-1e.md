# Issue #279 Phase 1E — Local Gate Runner Integration

## Kurzfazit

Implement a local gate runner and integrate local build/test/typecheck results into the Evidence Gate Report.

## Problem

The Evidence Gate can produce an audit-ready decision report from GitHub context, but it does not yet include structured local gate results. Positron needs one report that combines GitHub decision safety with local build/test/typecheck evidence.

## Goals

- Define a local gate result schema.
- Execute only allowlisted local verification commands.
- Capture command, cwd, exit code, duration, stdout/stderr snippets.
- Classify local gates as PASS/WARN/FAIL/SKIPPED.
- Integrate local gate results into EvidenceGateReport.
- Extend Evidence Gate CLI with `--include-local-gates`.
- Add `--local-gates-dry-run` for safe simulation.
- Keep GitHub-CI advisory-only.
- Never run auto-fix commands.
- Never mutate files intentionally.
- Never run remote CI.

## Non-Goals

- No GitHub mutations.
- No PR merge/close.
- No issue close/comment.
- No workflow run/rerun.
- No automatic apply.
- No auto-fix.
- No `biome --write`.
- No `npm audit fix`.
- No `npm install`.
- No `npm update`.
- No PR #218 action.
- No Issue #229 closure.
- No Issue #279 closure.

## MVP Local Gates

Required gates:

- `git diff --check`
- `npm run build`
- `npm run typecheck`
- `npm test`
- `npm test --workspace apps/web`

Format gate:

- `npx biome format .`

Advisory gates:

- `npx biome check .`
- `npx biome lint .`

Remote-CI:

- GitHub Actions remains advisory-only via Issue #268.

## CLI

`node scripts/run-evidence-gate.mjs --dry-run --include-local-gates --local-gates-dry-run`

Optional:

`node scripts/run-evidence-gate.mjs --dry-run --include-local-gates --output .local-release/evidence-gate/report.json --format json`

## API Design

```ts
export type LocalGateKind = "required" | "format" | "advisory";
export type LocalGateStatus = "PASS" | "WARN" | "FAIL" | "SKIPPED";

export interface LocalGateDefinition {
  id: string;
  label: string;
  kind: LocalGateKind;
  command: string;
  args: string[];
  cwd?: string;
  timeoutMs?: number;
}

export interface LocalGateResult {
  id: string;
  label: string;
  kind: LocalGateKind;
  command: string;
  args: string[];
  status: LocalGateStatus;
  exitCode: number | null;
  durationMs: number;
  stdoutSnippet?: string;
  stderrSnippet?: string;
  error?: string;
}

export interface LocalGateReport {
  status: "PASS" | "WARN" | "FAIL";
  total: number;
  passed: number;
  warned: number;
  failed: number;
  skipped: number;
  results: LocalGateResult[];
}
```

EvidenceGateReport extended with optional `localGateReport?: LocalGateReport`.

## Acceptance Criteria

- LocalGateResult type exists.
- LocalGateReport type exists.
- Gate runner rejects non-allowlisted commands.
- Gate runner rejects commands containing `--write`, `fix`, `install`, `update`, `workflow run`, `run rerun`, `stash`.
- Gate runner captures exit code and duration.
- Gate runner truncates stdout/stderr snippets.
- EvidenceGateReport includes optional local gate report.
- EvidenceGateReport status reflects failing required gates.
- Advisory gate failures do not fail the full report.
- CLI supports `--include-local-gates`.
- CLI supports `--local-gates-dry-run`.
- Dry-run can simulate gates without executing expensive commands.
- Tests do not run real build/test/npm commands.
- Full local gates still pass outside unit tests.

## Safety Rules

- Default ist keine Ausführung im Shared-Modul.
- Tests nutzen fake runner.
- CLI darf echte Gate-Ausführung nur mit --include-local-gates und ohne --local-gates-dry-run auslösen.
- Keine Auto-Fix-Kommandos.
- Keine Remote-CI.
