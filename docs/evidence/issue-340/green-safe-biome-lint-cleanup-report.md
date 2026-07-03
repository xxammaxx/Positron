# Issue #340 - GREEN_SAFE Biome Lint Mechanical Cleanup Report

## Scope

GREEN_SAFE mechanical cleanup only.

This run kept only `organizeImports` changes in a small benchmark-rudolph
subset. No Yellow/Red lint categories were intentionally fixed.

## Before

| Command | Exit | Result |
|---|---:|---|
| `npx biome check .` | 1 | 283 errors / 764 warnings printed |
| `npx biome check . --reporter=json` | 1 | 305 errors / 1260 warnings / 65 skipped fixes |
| `npm run lint` | 1 | 218 errors / 764 warnings |

## Changes

| File | Change Type | Risk |
|---|---|---|
| `packages/benchmark-rudolph/src/__tests__/beacon-domain.test.ts` | `organizeImports` only | low |
| `packages/benchmark-rudolph/src/__tests__/beacon-fixtures.test.ts` | `organizeImports` only | low |
| `packages/benchmark-rudolph/src/__tests__/benchmark-runner.test.ts` | `organizeImports` only | low |
| `packages/benchmark-rudolph/src/__tests__/traceability.test.ts` | `organizeImports` only | low |
| `packages/benchmark-rudolph/src/beacon-fixtures.ts` | `organizeImports` only | low |
| `packages/benchmark-rudolph/src/benchmark-runner.ts` | `organizeImports` only | low |

## Explicitly Not Touched

- `noDangerouslySetInnerHtml` / `ArtifactPanel`
- Real Mode
- Gate evaluators
- Workspace cleanup
- Audit paths
- Push/Merge behavior
- Auth/Secrets/Env
- Provider/MCP write paths
- Yellow/Red lint findings
- Dependencies
- Workflows
- Issue closure
- Merge

## Restored From Raw Biome Write

Biome's import-sort-only write initially fixed 65 files. The following groups
were restored because they were outside the approved GREEN_SAFE review surface:

- Server gate/index paths.
- Worker gate/workspace/runtime paths.
- `packages/run-state/**`.
- `packages/sandbox/**`.
- GitHub context/snapshot paths.
- Audit/evidence gate paths.
- Approval and safe-apply paths.
- Secret/redaction evidence-contract paths.
- Controlled-real-probe paths.

## After

| Command | Exit | Result |
|---|---:|---|
| `npx biome check .` | 1 | 250 errors / 764 warnings printed; expected red |
| `npx biome check . --reporter=json` | 1 | 272 errors / 1260 warnings / 30 skipped fixes; expected red |
| `npm run lint` | 1 | 218 errors / 764 warnings; expected red and unchanged because lint does not include import sorting |

`npx biome check .` remains red. This run does not claim the full Issue #340
backlog is solved.

## Gates

| Gate | Exit | Result |
|---|---:|---|
| `git diff --check` | 0 | PASS |
| `npm run build` | 0 | PASS |
| `npm run typecheck` | 0 | PASS |
| `npm test` | 0 | PASS |
| `npm run test:e2e` | 0 | PASS, 26 passed |
| `npx biome check .` | 1 | Expected red but reduced |
| `npm run lint` | 1 | Expected red and unchanged |

E2E emitted local Redis connection warnings for `127.0.0.1:6379`, but the
suite completed successfully with exit 0.

## Diff Safety

GREEN_SAFE_DIFF_STATUS: `MECHANICAL_GREEN_SAFE_ONLY`

| Audit | Result |
|---|---|
| Sensitive path/name grep | no matches |
| Secret/dangerous-string grep | no matches |
| Behavior change review | no behavior changes found |
| Changed file count | 6 tracked source files |
| Diff size | 22 insertions / 22 deletions |

## Acceptance Criteria Mapping

| Acceptance Criterion | Status | Evidence |
|---|---|---|
| `npx biome check .` reproduced locally | met | before exit 1, 283 errors / 764 warnings |
| Failure categories documented | met | Issue comments and this report classify GREEN_SAFE vs excluded Yellow/Red |
| GREEN_SAFE separated from YELLOW_REVIEW | met | only `organizeImports` kept; excluded groups restored |
| Dedicated PR created with clear scope | pending | to be created after commit/push |
| Build, typecheck, tests and E2E run locally | met | all blocking gates exit 0 |
| Remaining non-fixable warnings documented | met | Biome/lint remain expected red |
| No unrelated behavior changes | met | import-order-only diff |

## Tooling Notes

- GitHub connector issue-comment write failed with `403 Resource not accessible
  by integration`; authenticated `gh` CLI was used for required issue evidence.
- One local diagnostic read typo attempted a non-existent `/tmp` path and failed
  with file-not-found. It made no repository changes.
- E2E generated `docs/release/ui-workflow-proof-report.md` timestamp drift and
  `docs/release/ui-workflow-proof/`; both were cleaned from the review diff.

## Boundaries

- No behavior changes.
- No Real Mode.
- No Phase-D probe.
- No merge.
- No issue closure.
- No push to `main`.
- Issue #308 remains open.
- Issue #340 remains open pending broader cleanup.
