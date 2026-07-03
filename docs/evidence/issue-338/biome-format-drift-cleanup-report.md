# Issue #338 - Repo-wide Biome Format Drift Cleanup Report

## Reality Refresh
- Branch: `chore/issue-338-biome-format-drift`
- Base commit: `20409c45aa755e6c1153632477100e33f20d1dbb`
- Node: `v22.22.0`
- npm: `10.9.4`
- Biome command: `npx biome format .`

## Problem Reproduced

| Command | Exit | Finding |
|---|---:|---|
| `npx biome format .` | 1 | 55 files needed formatting before the cleanup pass. |
| `npm run lint` | 1 | Existing Biome lint backlog remains unrelated to this formatting cleanup. |
| `npx biome check .` | 1 | Formatting issues were gone after the cleanup, but pre-existing lint and organizeImports diagnostics remain. |

## Formatting Applied

- Command: `npx biome format . --write`
- Result: 55 files fixed
- Generated test artifacts from the E2E run were removed from the working tree and were not committed.
- Changed files:
  - `apps/server/src/__tests__/gate-approve-handler.test.ts`
  - `apps/server/src/gate-approve-handler.ts`
  - `apps/server/src/index.ts`
  - `apps/worker/src/index.ts`
  - `apps/worker/src/pipeline-runner.ts`
  - `docs/evidence/issue-215/summary.json`
  - `docs/evidence/issue-244/phase-2-summary.json`
  - `docs/evidence/issue-244/summary.json`
  - `docs/evidence/issue-245/phase-2-summary.json`
  - `docs/evidence/issue-245/summary.json`
  - `docs/evidence/issue-246/phase-2-summary.json`
  - `docs/evidence/issue-246/summary.json`
  - `docs/evidence/issue-305/phase-2-summary.json`
  - `docs/evidence/issue-305/summary.json`
  - `docs/evidence/issue-306/phase-2-summary.json`
  - `docs/evidence/issue-306/summary.json`
  - `docs/evidence/issue-307/phase-2-summary.json`
  - `docs/evidence/issue-307/summary.json`
  - `docs/evidence/issue-308/phase-2-summary.json`
  - `docs/evidence/issue-308/phase-2b-summary.json`
  - `docs/evidence/issue-308/phase-b-summary.json`
  - `docs/evidence/issue-308/phase-b2-summary.json`
  - `docs/evidence/issue-308/phase-c-summary.json`
  - `docs/evidence/issue-308/phase-c2-summary.json`
  - `docs/evidence/issue-308/phase-c2a-summary.json`
  - `docs/evidence/issue-308/phase-c2b-summary.json`
  - `docs/evidence/issue-308/phase-c3-summary.json`
  - `docs/evidence/issue-308/phase-c3b-summary.json`
  - `docs/evidence/issue-308/phase-d-readiness-after-322-summary.json`
  - `docs/evidence/issue-322/phase-2-summary.json`
  - `docs/evidence/issue-322/summary.json`
  - `docs/evidence/machine-migration/phase-2-summary.json`
  - `docs/evidence/machine-migration/source-handoff-summary.json`
  - `docs/evidence/machine-migration/target-summary.json`
  - `docs/evidence/portfolio-gap-discovery/phase-2-summary.json`
  - `docs/evidence/portfolio-gap-discovery/summary.json`
  - `docs/evidence/post-268/issue-297-phase-2-summary.json`
  - `docs/evidence/post-268/issue-297-summary.json`
  - `docs/evidence/post-268/issue-299-phase-2-summary.json`
  - `docs/evidence/post-268/issue-299-summary.json`
  - `docs/evidence/post-299/e2e-tracing-flake-summary.json`
  - `packages/run-state/src/__tests__/gate-assembly.test.ts`
  - `packages/run-state/src/__tests__/gate-enforcement.test.ts`
  - `packages/run-state/src/gate-evaluator.ts`
  - `packages/sandbox/src/__tests__/gate-approve.test.ts`
  - `packages/sandbox/src/fake-adapter.ts`
  - `packages/sandbox/src/real-adapter.ts`
  - `packages/shared/src/__tests__/evidence-portfolio.test.ts`
  - `packages/shared/src/evidence-portfolio/markdown-utils.ts`
  - `packages/shared/src/evidence-portfolio/portfolio-updater.ts`
  - `packages/shared/src/evidence-portfolio/types.ts`
  - `packages/tool-gateway/src/__tests__/audit-sink.test.ts`
  - `packages/tool-gateway/src/__tests__/red/audit-enforcement.test.ts`
  - `packages/tool-gateway/src/audit-sink.ts`
  - `packages/tool-gateway/src/gateway.ts`

## Diff Safety

BIOME_DIFF_STATUS: MECHANICAL_FORMAT_ONLY

- No behavior changes were introduced.
- No dependency, workflow, or package manifest files were modified.
- No binary assets were committed.
- The transient E2E screenshots and release-report artifacts were removed before finishing.

## Gates

| Gate | Command | Exit | Result | Notes |
|---|---|---:|---|---|
| Whitespace | `git diff --check` | 0 | PASS | No whitespace issues after the format pass. |
| Biome format | `npx biome format .` | 0 | PASS | Recheck found no remaining formatting fixes. |
| Biome check | `npx biome check .` | 1 | FAIL | Known lint backlog remains; formatting issues are gone. |
| Build | `npm run build` | 0 | PASS | TypeScript build completed cleanly. |
| Typecheck | `npm run typecheck` | 0 | PASS | Dry build reported all projects buildable. |
| Root tests | `npm test` | 0 | PASS | `8` app/web test files, `196` tests. |
| E2E | `npm run test:e2e` | 0 | PASS | `26/26` Playwright tests passed. |
| Lint | `npm run lint` | 1 | FAIL | Existing Biome lint backlog remains in the repository. |

## Boundaries

- Mechanical formatting only.
- No behavior changes.
- No dependency upgrades.
- No workflow changes.
- No Real Mode.
- No Phase-D probe.
- Issue #308 remains open.
- Issue #338 remains open pending owner merge/closure.

