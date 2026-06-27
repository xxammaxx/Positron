# Phase 1 — Follow-up Issue Prioritization (Post-268)

## Timestamp
2026-06-27T08:26:00+02:00

## Prioritization Criteria

1. **Fastest safe fix** — time to GREEN CI
2. **Highest CI utility** — impact on CI success rate
3. **Highest risk** — what breaks worst if unfixed
4. **Best testability** — easiest to verify locally

## Priority Rankings

### #1 — Biome JSON Format (#298)

| Criterion | Score | Rationale |
|-----------|-------|-----------|
| Fastest fix | ★★★★★ | Single `npx biome format --write` command |
| CI utility | ★★★★☆ | Clears `build-and-test` job → unblocks lint+typecheck+unit tests downstream |
| Risk | ★☆☆☆☆ | GREEN_SAFE — cosmetic only, no functional impact |
| Testability | ★★★★★ | `npx biome format docs/` exit 0 is trivially verifiable |

**Recommended first.** Fastest path to GREEN on `build-and-test`. Uniquely safe because it changes only whitespace. Unblocks the entire `build-and-test` pipeline (build → typecheck → unit tests are skipped when format fails).

### #2 — E2E Flake (#297)

| Criterion | Score | Rationale |
|-----------|-------|-----------|
| Fastest fix | ★★☆☆☆ | May need Playwright trace analysis, multiple retries to confirm fix |
| CI utility | ★★★☆☆ | 25/26 pass already — fixes last 1 test |
| Risk | ★★☆☆☆ | YELLOW_VALIDATE — test only, but flake affects CI confidence |
| Testability | ★★★☆☆ | Needs 10× repeat-each to confirm stability |

**Recommended second.** Medium complexity — needs Playwright trace analysis. The CI benefit is moderate (only 1 test), but flaky tests erode CI trust over time.

### #3 — Windows Module Resolution (#299)

| Criterion | Score | Rationale |
|-----------|-------|-----------|
| Fastest fix | ★☆☆☆☆ | Two distinct errors, cross-platform debugging, may need build system changes |
| CI utility | ★★★★☆ | Unblocks entire Windows CI job (currently red) |
| Risk | ★★★☆☆ | YELLOW_VALIDATE — module resolution can have cascading effects |
| Testability | ★☆☆☆☆ | Hard to test locally on Linux/Mac; needs Windows runner or CI |

**Recommended last.** Highest complexity — two distinct error types, cross-platform environment needed for reproduction, potential build/config changes. Highest CI utility but hardest to verify locally.

## Standard Prioritization
```
1. Biome JSON Format (#298) — GREEN_SAFE, fastest fix, unblocks build-and-test
2. E2E Flake (#297) — YELLOW_VALIDATE, moderate complexity, test reliability
3. Windows Module Resolution (#299) — YELLOW_VALIDATE, highest complexity, hard to test locally
```

## Classification
```
NEXT_RECOMMENDED_FIX: BIOME_JSON
```

Evidence supports the default ordering. No data suggests reordering.
