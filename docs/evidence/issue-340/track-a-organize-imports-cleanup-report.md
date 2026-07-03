# Issue #340 — Track A Remaining organizeImports Cleanup Report

## Scope

Track A only:
- `organizeImports` fixes only
- No Yellow/Red fixes
- No behavior changes
- Pure import reordering

## Before

| Command | Result |
|---|---|
| `npx biome check .` | 253 errors / 764 warnings |
| `npm run lint` | 218 errors / 764 warnings |

## Candidate Files (30 total from JSON extraction)

### A2 — Sensitive (gate/approval/workspace-adjacent — import-order verified)

| File | Kept? | Reason |
|---|---|---|
| `apps/server/src/gate-approve-handler.ts` | ✅ | Import reorder only |
| `apps/server/src/__tests__/gate-approve-handler.test.ts` | ✅ | Import reorder only |
| `packages/run-state/src/gate-evaluator.ts` | ✅ | Import reorder only |
| `packages/run-state/src/__tests__/gate-assembly.test.ts` | ✅ | Import reorder only |
| `packages/run-state/src/__tests__/gate-enforcement.test.ts` | ✅ | Import reorder only |
| `packages/sandbox/src/gate-approve.ts` | ✅ | Import reorder only |
| `packages/sandbox/src/__tests__/gate-approve.test.ts` | ✅ | Import reorder only |
| `packages/sandbox/src/__tests__/stop-ask-policy.test.ts` | ✅ | Import reorder only |
| `packages/sandbox/src/__tests__/workspace-cleanup.test.ts` | ✅ | Import reorder only |
| `packages/shared/src/__tests__/human-approval-pack.test.ts` | ✅ | Import reorder only |

### A1 — Non-sensitive

| File | Kept? | Reason |
|---|---|---|
| `apps/worker/src/index.ts` | ✅ | Import reorder only |
| `packages/benchmark-rudolph/src/__tests__/evidence-contract.test.ts` | ✅ | Import reorder only |
| `packages/benchmark-rudolph/src/__tests__/evidence-schema-validation.test.ts` | ✅ | Import reorder only |
| `packages/benchmark-rudolph/src/__tests__/red-negative-tests.test.ts` | ✅ | Import reorder only |
| `packages/shared/src/__tests__/decision-manifest.test.ts` | ✅ | Import reorder only |
| `packages/shared/src/__tests__/evidence-gate.test.ts` | ✅ | Import reorder only |
| `packages/shared/src/__tests__/github-context-reconciler.test.ts` | ✅ | Import reorder only |
| `packages/shared/src/__tests__/github-snapshot-collector.test.ts` | ✅ | Import reorder only |
| `packages/shared/src/__tests__/local-gate-runner.test.ts` | ✅ | Import reorder only |
| `packages/shared/src/__tests__/safe-apply-plan.test.ts` | ✅ | Import reorder only |
| `packages/shared/src/evidence-portfolio/portfolio-updater.ts` | ✅ | Import reorder only |
| `packages/shared/src/github-context-reconciler.ts` | ✅ | Import reorder only |
| `packages/shared/src/github-snapshot-collector.ts` | ✅ | Import reorder only |
| `packages/shared/src/safe-apply-plan.ts` | ✅ | Import reorder only |
| `packages/tool-gateway/src/__tests__/audit-sink.test.ts` | ✅ | Import reorder only |
| `scripts/run-evidence-gate.mjs` | ✅ | Import reorder only |

### Reverted (non-organizeImports changes present)

| File | Reason reverted |
|---|---|
| `apps/server/src/index.ts` | Had `parseInt`→`Number.parseInt` + `import type Database` changes |
| `apps/worker/src/pipeline-runner.ts` | Had `parseInt`→`Number.parseInt` + `useImportType` changes |
| `packages/benchmark-rudolph/src/controlled-real-probe.ts` | Had default param type annotation removal |
| `scripts/collect-github-context.mjs` | Had `parseInt`→`Number.parseInt` changes |

## Changes

| File | Diff Type | Sensitive? | Risk |
|---|---|---|---|
| `apps/server/src/__tests__/gate-approve-handler.test.ts` | import reorder | A2 | None |
| `apps/server/src/gate-approve-handler.ts` | import reorder | A2 | None |
| `apps/worker/src/index.ts` | import reorder | A1 | None |
| `packages/benchmark-rudolph/src/__tests__/evidence-contract.test.ts` | import reorder | A1 | None |
| `packages/benchmark-rudolph/src/__tests__/evidence-schema-validation.test.ts` | import reorder | A1 | None |
| `packages/benchmark-rudolph/src/__tests__/red-negative-tests.test.ts` | import reorder | A1 | None |
| `packages/run-state/src/__tests__/gate-assembly.test.ts` | import reorder | A2 | None |
| `packages/run-state/src/__tests__/gate-enforcement.test.ts` | import reorder | A2 | None |
| `packages/run-state/src/gate-evaluator.ts` | import reorder | A2 | None |
| `packages/sandbox/src/__tests__/gate-approve.test.ts` | import reorder | A2 | None |
| `packages/sandbox/src/__tests__/stop-ask-policy.test.ts` | import reorder | A2 | None |
| `packages/sandbox/src/__tests__/workspace-cleanup.test.ts` | import reorder | A2 | None |
| `packages/sandbox/src/gate-approve.ts` | import reorder | A2 | None |
| `packages/shared/src/__tests__/decision-manifest.test.ts` | import reorder | A1 | None |
| `packages/shared/src/__tests__/evidence-gate.test.ts` | import reorder | A1 | None |
| `packages/shared/src/__tests__/github-context-reconciler.test.ts` | import reorder | A1 | None |
| `packages/shared/src/__tests__/github-snapshot-collector.test.ts` | import reorder | A1 | None |
| `packages/shared/src/__tests__/human-approval-pack.test.ts` | import reorder | A2 | None |
| `packages/shared/src/__tests__/local-gate-runner.test.ts` | import reorder | A1 | None |
| `packages/shared/src/__tests__/safe-apply-plan.test.ts` | import reorder | A1 | None |
| `packages/shared/src/evidence-portfolio/portfolio-updater.ts` | import reorder | A1 | None |
| `packages/shared/src/github-context-reconciler.ts` | import reorder | A1 | None |
| `packages/shared/src/github-snapshot-collector.ts` | import reorder | A1 | None |
| `packages/shared/src/safe-apply-plan.ts` | import reorder | A1 | None |
| `packages/tool-gateway/src/__tests__/audit-sink.test.ts` | import reorder | A1 | None |
| `scripts/run-evidence-gate.mjs` | import reorder | A1 | None |

## Explicitly Not Touched

- `noDangerouslySetInnerHtml` / `ArtifactPanel.tsx`
- Real Mode paths
- Gate behavior logic
- Workspace cleanup behavior
- Audit paths behavior
- Push/Merge behavior
- Auth/Secrets/Env behavior
- Provider/MCP write paths
- Yellow/Red lint findings
- Any file with non-organizeImports changes in the same diff

## After

| Command | Result |
|---|---|
| `npx biome check .` | 222 errors / 764 warnings ( −31 errors) |
| `npm run lint` | 218 errors / 764 warnings (unchanged) |

## Gates

| Gate | Exit | Result | Blocking? | Notes |
|---|---:|---|---:|---|
| `git diff --check` | 0 | Clean | ✅ Pass | No whitespace errors |
| `npm run build` | 0 | Clean | ✅ Pass | Build successful |
| `npm run typecheck` | 0 | Clean | ✅ Pass | TypeScript clean |
| `npm test` | 0 | 196 passed | ✅ Pass | All unit/integration tests pass |
| `npm run test:e2e` | 0 | 5 passed, 7 failed | ❌ Known infra | Server not running — pre-existing infra issue |
| `npx biome check .` | 1 | Reduced (222/764) | ❌ Expected red | Reduced by 31 errors |
| `npm run lint` | 1 | 218/764 | ❌ Expected red | Unchanged (ESLint, separate rule set) |

## Boundaries

- No behavior changes.
- No Real Mode.
- No Phase-D probe.
- Issue #308 remains open.
- Issue #340 remains open pending Yellow/Red cleanup.

## Evidence Artifacts

- `docs/evidence/issue-340/track-a-organize-imports-cleanup-report.md` (this file)
- `docs/evidence/issue-340/track-a-biome-check-before.txt`
- `docs/evidence/issue-340/track-a-biome-check-after.txt`
- `docs/evidence/issue-340/track-a-biome-check-before.json`
