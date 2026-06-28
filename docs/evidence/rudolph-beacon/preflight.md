# Pre-Flight Scan — Rudolph Beacon Benchmark

## What Will Be Changed

### New Package: `packages/benchmark-rudolph/`
- `src/beacon-domain.ts` — ReindeerBeacon type, BeaconStatus logic
- `src/beacon-fixtures.ts` — Deterministic scan simulator
- `src/benchmark-runner.ts` — Integrates DeterministicFixtureAgent + OpenCodeDryRunAgent
- `src/evidence-contract.ts` — RudolphBenchmarkRunSummary schema
- `src/traceability.ts` — Traceability map builder
- `src/index.ts` — Package exports
- `src/__tests__/beacon-domain.test.ts` — 5+ Red Tests for domain
- `src/__tests__/benchmark-runner.test.ts` — 4+ Red Tests for runner
- `src/__tests__/evidence-contract.test.ts` — 3+ Red Tests for evidence
- `src/__tests__/traceability.test.ts` — 2+ Red Tests for traceability
- `package.json` — Package config (`@positron/benchmark-rudolph`)
- `tsconfig.json` — TypeScript config extending root

### Modified Files
- `C:\Positron\tsconfig.json` — Add reference to `./packages/benchmark-rudolph`
- `C:\Positron\package.json` — Add `test:benchmark:rudolph` script (optional)
- `C:\Positron\packages\shared\src\types.ts` — MAYBE extend with benchmark types if needed (minimal reuse)

### New Docs
- `docs/evidence/rudolph-beacon/reality-refresh.md` ✅ (done)
- `docs/evidence/rudolph-beacon/preflight.md` — This file
- `docs/evidence/rudolph-beacon/RUN_REPORT.md` — Final run report
- `docs/evidence/rudolph-beacon/run-summary.fixture.json` — Fixture evidence sample
- `docs/evidence/rudolph-beacon/run-summary.dry-run.json` — Dry-run evidence sample
- `docs/benchmark/rudolph-beacon/BENCHMARK_SPEC.md` — Benchmark specification
- `docs/benchmark/rudolph-beacon/POSITRON_EVALUATION_CONTRACT.md` — Evidence contract
- `docs/benchmark/rudolph-beacon/TRACEABILITY_CONTRACT.md` — Traceability contract
- `docs/benchmark/rudolph-beacon/CAPABILITIES.md` — Capability listing
- `docs/benchmark/rudolph-beacon/KNOWN_LIMITATIONS.md` — Limitation listing
- `docs/benchmark/rudolph-beacon/traceability-map.json` — Traceability data
- `docs/benchmark/rudolph-beacon/issues/BENCH-001.md` through `BENCH-005.md`
- `docs/benchmark/rudolph-beacon/architecture/rudolph-system-map.mmd`
- `docs/benchmark/rudolph-beacon/architecture/rudolph-evidence-flow.mmd`
- `docs/benchmark/rudolph-beacon/architecture/rudolph-feedback-flow.mmd`
- `docs/evidence/rudolph-beacon/reviewer-report.md`

## What Will NOT Be Touched

- ❌ `packages/shared/src/opencode-types.ts` — No modification (existing types are sufficient)
- ❌ `packages/opencode-adapter/src/deterministic-fixture-agent.ts` — No modification (import and use as-is)
- ❌ `packages/opencode-adapter/src/dry-run-agent.ts` — No modification (import and use as-is)
- ❌ `.github/workflows/` — No modification (GitHub Actions stays advisory-only)
- ❌ `apps/web/` — Not related to benchmark
- ❌ `apps/server/` — Not related to benchmark
- ❌ `packages/run-state/` — Not related to benchmark
- ❌ `packages/github-adapter/` — Not related to benchmark
- ❌ `packages/sandbox/` — Not related to benchmark
- ❌ `packages/speckit-adapter/` — Not related to benchmark
- ❌ `packages/tool-gateway/` — Not related to benchmark
- ❌ PR #218 — Not modified, not merged
- ❌ `.env` — Not read or modified
- ❌ Remote GitHub — No issue comments, no PRs, no CI triggers

## Risk Classification

### GREEN_SAFE
- Creating new files in `packages/benchmark-rudolph/`
- Creating new documentation in `docs/`
- Running `npm test` (local vitest)
- Running `npm run typecheck`
- Writing to `.positron/evidence/` (controlled path)

### YELLOW_REVIEW
- Modifying `C:\Positron\tsconfig.json` to add build reference — requires build verification
- Extending `C:\Positron\packages\shared\src\types.ts` — minimal addition only if needed; prefer standalone types in benchmark package
- Adding test script to root `package.json`

### RED_HOLD (blocked without approval)
- `git push` — BLOCKED
- `git merge` — BLOCKED
- `gh pr create` — BLOCKED
- GitHub Actions trigger — BLOCKED
- Merging PR #218 — BLOCKED
- Modifying existing agent code — NOT PLANNED (avoid scope creep)

### UNKNOWN / TOOL_GAP
- Whether `npm run build` will succeed with the new package (depends on TypeScript project references)
- Mermaid diagram validation — TOOL_GAP (no local validator)
- Whether existing coverage thresholds will be affected

## Commands to Run

```bash
npm run typecheck           # Verify TypeScript compilation
npm test                    # Run vitest (will pick up new package tests)
npm run build               # Verify tsc -b includes new package
npm run format:check        # Verify formatting
```

## Rollback Plan

If the benchmark package causes build issues:
1. Remove `./packages/benchmark-rudolph` reference from root `tsconfig.json`
2. Delete `packages/benchmark-rudolph/` directory
3. Restore any modified shared types

## Human Approval Required

None for implementation — all changes are local, read-only from GitHub, and within controlled paths. No push/merge/PR operations planned.

## Snapshot Recommendation

Not required — working tree is already clean. Changes are additive (new files only) except for root `tsconfig.json` which is a one-line addition.
