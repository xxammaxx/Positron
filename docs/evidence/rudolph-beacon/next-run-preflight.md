# Pre-Flight Scan — Rudolph Beacon Anschlusslauf

**Generated:** 2026-06-24T17:00:00Z

## Planned Changes

### New Files (GREEN_SAFE)

| File | Purpose | Risk |
|------|---------|------|
| `packages/benchmark-rudolph/src/__tests__/evidence-schema-validation.test.ts` | Schema validation tests for run-summary JSON | GREEN_SAFE — additive test, no behavior change |
| `packages/benchmark-rudolph/src/__tests__/red-negative-tests.test.ts` | 8 new red/negative tests | GREEN_SAFE — additive test, no behavior change |
| `docs/benchmark/rudolph-beacon/REAL_MODE_READINESS.md` | Real-mode preparation doc | GREEN_SAFE — documentation only |
| `docs/evidence/rudolph-beacon/decision-manifest.md` | Technical decision record | GREEN_SAFE — documentation only |
| `docs/evidence/rudolph-beacon/next-run-reality-refresh.md` | This run's reality refresh | GREEN_SAFE — documentation only |
| `docs/evidence/rudolph-beacon/next-run-preflight.md` | This file | GREEN_SAFE — documentation only |
| `docs/evidence/rudolph-beacon/next-run-gates.md` | Local gate results | GREEN_SAFE — documentation only |
| `docs/evidence/rudolph-beacon/next-run-summary.json` | Machine-readable run summary | GREEN_SAFE — evidence artifact |
| `docs/evidence/rudolph-beacon/next-run-report.md` | Human-readable run report | GREEN_SAFE — evidence artifact |
| `docs/evidence/rudolph-beacon/reviewer-report.md` | Updated reviewer report | GREEN_SAFE — evidence artifact |

### Modified Files (GREEN_SAFE with verification)

| File | Change | Risk |
|------|--------|------|
| `package.json` (root) | Add `test:benchmark:rudolph:coverage` script | GREEN_SAFE — additive, one line, builds pass |
| `docs/benchmark/rudolph-beacon/POSITRON_EVALUATION_CONTRACT.md` | Add hardened conclusion rules | GREEN_SAFE — documentation update |
| `docs/benchmark/rudolph-beacon/CAPABILITIES.md` | Add coverage + schema validation capabilities | GREEN_SAFE — evidence-based update |
| `docs/benchmark/rudolph-beacon/KNOWN_LIMITATIONS.md` | Update with current gaps | GREEN_SAFE — evidence-based update |
| `docs/evidence/rudolph-beacon/RUN_REPORT.md` | Add coverage metrics + schema validation | GREEN_SAFE — evidence-based update |

## Explicitly NOT Affected Files

| File | Reason |
|------|--------|
| `packages/shared/src/opencode-types.ts` | No modification needed |
| `packages/opencode-adapter/` | No agent modification — import as-is |
| `packages/run-state/` | Not related to benchmark |
| `packages/github-adapter/` | Not related to benchmark |
| `packages/sandbox/` | Not related to benchmark |
| `packages/speckit-adapter/` | Not related to benchmark |
| `packages/tool-gateway/` | Not related to benchmark |
| `apps/server/` | Not related to benchmark |
| `apps/web/` | Not related to benchmark |
| `.github/workflows/` | RED_HOLD — never modified |
| PR #218 | RED_HOLD — never touched |
| Old PR chain #230–#242 | RED_HOLD — never revived |
| `.env` | Not read or modified |

## Risk Classification Summary

### GREEN_SAFE (11 items)
- All new test files
- All new documentation
- `package.json` script addition
- Evidence artifact creation
- Documentation updates (CAPABILITIES, KNOWN_LIMITATIONS, RUN_REPORT, POSITRON_EVALUATION_CONTRACT)

### YELLOW_REVIEW (2 items)
- `package.json` script addition (minimal, but modifies root config) — pre-verified via build
- `POSITRON_EVALUATION_CONTRACT.md` update (adds rules that Positron may use) — evidence-only update

### RED_HOLD (0 items)
- No remote actions planned
- No push, merge, PR creation
- No CI triggers

### UNKNOWN / TOOL_GAP (1 item)
- Coverage metric accuracy: depends on vitest v8 provider's behavior with ESM/NodeNext

## Planned Local Gates

```powershell
git diff --check           # Verify no whitespace issues
npm run build              # Full project build with new files
npm run typecheck          # Full type check
npm run test:benchmark:rudolph          # Existing 91 tests + new tests
npm run test:benchmark:rudolph:coverage # New coverage measurement
```

## Rollback Strategy

All changes are additive. Rollback:
1. Remove new test files from `packages/benchmark-rudolph/src/__tests__/`
2. Remove the `test:benchmark:rudolph:coverage` script from root `package.json`
3. Remove new docs from `docs/evidence/rudolph-beacon/`
4. Revert documentation updates via git checkout

No destructive operations planned.

## KI Decision Authority

The KI is authorized to make all GREEN_SAFE decisions above because:
- High confidence (backed by existing 91/91 tests)
- No secrets involved
- No remote costs or GitHub write actions
- No security boundaries changed
- No CI/workflow modifications
- Low regression risk (additive changes only)
- Locally verifiable

The KI will NOT make decisions on:
- Real execution mode (requires human approval)
- Any push/merge/PR action (RED_HOLD)
- Any agent behavior modification (YELLOW_REVIEW)
