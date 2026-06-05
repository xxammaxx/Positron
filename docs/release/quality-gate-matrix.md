# Quality Gate Matrix — Positron Release Gates

## Blocking Gates (must PASS for merge)

| Gate | Layer | Check | Current | Notes |
|------|-------|-------|---------|-------|
| Build (TypeScript) | L3 | `npm run build` | ✅ PASS | `tsc -b` all packages |
| Typecheck | L3 | `npm run typecheck` | ✅ PASS | No TS errors |
| Unit Tests | L3 | `npm test` | ✅ PASS | 690 tests |
| Contract Tests | L3 | `npm run test:contracts` | ✅ PASS | 140 tests |
| Format (Biome) | L2 | `npx biome format .` | ⚠️ 314 diffs | Accepted risk |
| Lint (Biome) | L2 | `npx biome lint .` | ⚠️ 901 diagnostics | Accepted risk |
| Safety Coverage | L3 | `npm run coverage:safety` | ✅ 100% | Hard gate |
| Secret Scan | Cross | grep patterns | ✅ PASS | No secrets |

## Non-Blocking Gates (observation only)

| Gate | Layer | Score | Status |
|------|-------|-------|--------|
| Mutation Safety | L3 | 88.32% | Non-blocking |
| Mutation Fast | L3 | 85.25% | Non-blocking |
| Playwright E2E | L4 | 25/25 | Non-blocking |
| Semgrep | L2 | — | Non-blocking |
| CodeQL | L2 | — | Non-blocking |

## Deferred Gates

| Gate | Layer | Reason |
|------|-------|--------|
| SonarQube | L2c | Requires maintained instance |
| Runtime Observability | L6 | Requires cloud token |
| AI UI Review | L5 | Requires LLM provider |

## Accepted Risks

| Risk | Detail | Mitigation |
|------|--------|-----------|
| Biome format diffs | 314 files not formatted | `npm run format` in planned task |
| Biome lint diagnostics | 901 warnings | Gradual cleanup |
| E2E non-blocking | JSX build issue in web | Tracked, not safety-critical |
| Level-B coverage <100% | Runtime modules | Documented, no gate |
| No cloud observability | Sentry/OTEL deferred | Console logging sufficient |

## Promotion Criteria

| Gate | Current | Next State | Condition |
|------|---------|-----------|-----------|
| Mutation Safety | Non-blocking | Blocking | QA-009: 3 stable CI runs + approval |
| E2E Playwright | Non-blocking | Blocking | 5 green main runs |
| SonarQube | Deferred | Non-blocking | Maintained instance + token |
| Runtime | Deferred | Non-blocking | Opt-in Sentry/OTEL setup |

Date: 2026-06-05 | Updated: continuously via CI observation
