# Layer 7: Evidence Aggregation — Discovery & Schema

## Status: Discovery Complete — Implementation Deferred

Final 7-layer quality system documentation. No code changes.

---

## 1. Evidence Sources — Current Inventory

### Layer 1 — AI Code Review
| Source | Status | Location |
|--------|--------|----------|
| ~~CodeRabbit~~ | ~~Optional~~ (decommissioned Phase 17, 2026-06-26) | ~~`.coderabbit.yaml`~~ (removed) |
| PR Evidence Template | Manual | `.positron/` |

### Layer 2 — Static Analysis
| Source | Status | Location |
|--------|--------|----------|
| Semgrep | CI (non-blocking) | `.semgrep.yaml`, SARIF upload |
| CodeQL | CI | `.github/workflows/quality-gates.yml` |
| Biome Format | CI (blocking) | `npx biome format .` |
| Biome Lint | CI (blocking) | `npx biome lint .` |
| SonarQube | Discovery deferred | `docs/qa/layer-2c-sonarqube-discovery.md` |

### Layer 3 — Backend Verification
| Source | Status | Location |
|--------|--------|----------|
| Build (`tsc -b`) | CI (blocking) | `npm run build` |
| Typecheck | CI (blocking) | `npm run typecheck` |
| Unit Tests (690) | CI (blocking) | `npm test` |
| Contract Tests (140) | CI (blocking) | `vitest.contracts.config.ts` |
| Integration Tests | CI | `vitest` |
| Property Tests (37) | CI | `vitest` |
| Coverage: Global (35%) | Baseline gated | `vitest.config.ts` — 30/30/32/25 |
| Coverage: Safety (100%) | BLOCKING | `vitest.safety.config.ts` — 100/100/100/100 |
| Mutation: Fast | CI (non-blocking) | `stryker.fast.config.json` |
| Mutation: Safety (88.32%) | CI (non-blocking) | `stryker.safety.config.json` |

### Layer 4 — Browser Evidence
| Source | Status | Location |
|--------|--------|----------|
| Playwright E2E | CI (non-blocking) | `playwright.config.ts` |
| Screenshots | CI artifact | `test-results/screenshots/*.png` |
| Video (failure) | CI artifact | `test-results/*/video.webm` |
| Trace (failure) | CI artifact | `test-results/*/trace.zip` |
| Console/Network | CI artifact | `test-results/evidence/evidence-log.json` |
| Playwright HTML Report | CI artifact | `playwright-report/` |

### Layer 5 — AI UI Review
| Source | Status | Location |
|--------|--------|----------|
| AI UI Review | Discovery deferred | `docs/qa/layer-5-ai-ui-review.md` |

### Layer 6 — Runtime Observability
| Source | Status | Location |
|--------|--------|----------|
| Runtime Events | Discovery deferred | `docs/qa/layer-6-runtime-observability.md` |
| Sentry / OTEL | Discovery deferred | opt-in only |

### Layer 7 — Evidence Aggregation (this document)
| Source | Status | Location |
|--------|--------|----------|
| Evidence Schema | Discovery | `docs/qa/layer-7-evidence-aggregation.md` |
| Quality Gate Matrix | Discovery | `docs/release/quality-gate-matrix.md` |
| Evidence Collection Script | Future | `scripts/collect-evidence.mjs` |

### Cross-Cutting
| Source | Status | Location |
|--------|--------|----------|
| Secret Scan | Manual / CI safety | grep-based |
| GitHub PR Checks | GitHub | Required checks on main |
| QA-008.1 Stability | Observation | `docs/release/mutation-ci-stability-observation.md` |
| Release Gate Review | Manual | Issue comments |

---

## 2. Artifact Policy

### Commit-Safe (can be committed to repo)

| Artifact | Format | Location |
|----------|--------|----------|
| Coverage summary | Markdown / JSON | `coverage/coverage-summary.json` |
| Safety coverage status | Text | stdout from `coverage:safety` |
| Mutation score | Markdown | `docs/release/mutation-testing-baseline.md` |
| Gate status matrix | Markdown | `docs/release/quality-gate-matrix.md` |
| Policy documents | Markdown | `docs/qa/*.md`, `docs/release/*.md` |
| Stryker JSON reports | JSON | `reports/mutation/safety-baseline/report.json` |
| Evidence log summaries | JSON | `test-results/evidence/evidence-log.json` (redacted) |

### CI-Only (never committed)

| Artifact | Reason |
|----------|--------|
| `trace.zip` | Binary, large (>5MB), contains full browser replay |
| `video.webm` | Binary, large (>2MB), contains screen recording |
| Screenshots | Binary, may contain runtime secrets/URLs |
| Playwright HTML report | Generated artifact, links to local files |
| SARIF reports | Generated, upload to GitHub Code Scanning |

### Forbidden (must never be committed)

| Artifact | Reason |
|----------|--------|
| `.env` / `.env.local` | Contains secrets |
| `*.key`, `*.pem` | Private keys |
| `.positron/evidence/` | Runtime evidence with paths |
| `.specify/cache/` | Build cache |
| Private file paths | `/home/user/.ssh/...`, `/etc/shadow` |
| Logs with secrets | Unredacted console/network output |

---

## 3. Quality Gate Matrix

### Release-Blocking Gates

| Gate | Layer | Check | Status |
|------|-------|-------|--------|
| Build | L3 | `npm run build` | ✅ PASS |
| TypeScript | L3 | `npm run typecheck` | ✅ PASS |
| Unit Tests | L3 | `npm test` (690) | ✅ PASS |
| Format (Biome) | L2 | `npx biome format .` | ⚠️ 314 diffs |
| Lint (Biome) | L2 | `npx biome lint .` | ⚠️ 901 diagnostics |
| Safety Coverage | L3 | 100/100/100/100 | ✅ PASS |
| Secret Scan | Cross | `grep` patterns | ✅ PASS |

### Non-Blocking / Observation Gates

| Gate | Layer | Status | Blocked By |
|------|-------|--------|-----------|
| Mutation: Safety (88.32%) | L3 | Non-blocking | QA-009 (stability) |
| Mutation: Fast | L3 | Non-blocking | — |
| Playwright E2E | L4 | Non-blocking | Stability window (0/5) |
| Semgrep | L2 | Non-blocking | — |
| CodeQL | L2 | Non-blocking | — |
| Observability Config | L3 | Non-blocking | Docker fallback |

### Deferred / Discovery Gates

| Gate | Layer | Status |
|------|-------|--------|
| SonarQube | L2c | Deferred |
| Runtime Observability | L6 | Deferred |
| AI UI Review | L5 | Deferred |

### Accepted Risks

| Risk | Reason | Mitigation |
|------|--------|-----------|
| Biome format diffs (314) | Not safety-critical | `npm run format` in planned task |
| Biome lint diagnostics (901) | Not safety-critical | Gradual cleanup |
| E2E non-blocking | Web app JSX build issue | Stability window tracking |
| No SonarQube | Requires maintained instance | Existing toolchain covers 90% |
| No Sentry/OTEL | Requires cloud token | Console logging sufficient for now |
| Level-B Runtime Coverage | Not safety-critical | Documented, no blocking gate |

---

## 4. Evidence Status Values

| Value | Meaning | Example |
|-------|---------|---------|
| **PASS** | All blocking gates green | Safety coverage 100% |
| **PARTIAL** | Some non-blocking gates failing | E2E flaky, but tests pass |
| **BLOCKED** | Dependency not met | QA-009 waiting for stability |
| **FAIL** | Blocking gate red | Build broken, test failure |
| **DEFERRED** | Implementation postponed | SonarQube, Sentry, AI Review |
| **ACCEPTED_RISK** | Known risk, documented | Biome format diffs |

---

## 5. Evidence Report Schema

```json
{
  "timestamp": "2026-06-05T12:00:00Z",
  "runId": "optional-run-id",
  "trigger": "pr|push|manual",
  "overall": "PASS|PARTIAL|BLOCKED|FAIL",
  "gates": {
    "blocking": [
      { "name": "build", "status": "PASS", "detail": "tsc -b OK" },
      { "name": "safety-coverage", "status": "PASS", "detail": "100/100/100/100" }
    ],
    "non-blocking": [
      { "name": "mutation-safety", "status": "PASS", "score": 88.32, "runtime": "34s" },
      { "name": "e2e-playwright", "status": "PASS", "detail": "25/25 tests" }
    ],
    "deferred": [
      { "name": "sonarqube", "status": "DEFERRED" },
      { "name": "runtime-observability", "status": "DEFERRED" }
    ],
    "accepted-risks": [
      { "name": "biome-format-diffs", "count": 314 }
    ]
  },
  "artifacts": {
    "commit-safe": ["coverage-summary.json", "mutation-testing-baseline.md"],
    "ci-only": ["playwright-report", "trace.zip"]
  }
}
```

---

## 6. Integration Flow

```
PR Push / Manual Trigger
  ↓
quality-gates.yml CI pipeline
  ├── build-and-test (blocking)
  ├── observability-config-check
  ├── mutation-fast (non-blocking)
  ├── mutation-safety (non-blocking, QA-007)
  └── e2e-playwright (non-blocking)
  ↓
scripts/collect-evidence.mjs (future)
  ├── Read: coverage-summary.json
  ├── Read: mutation-safety report
  ├── Read: playwright results
  ├── Read: safety coverage status
  └── Generate: final-evidence-summary.md
  ↓
Post as comment to Issue #165
  └── (future: GitHub Write via GITHUB_TOKEN)
```

---

## 7. Implementation Phases

### Phase A (safe, implementable now): Manual Evidence Matrix
- This document (`docs/qa/layer-7-evidence-aggregation.md`)
- `docs/release/quality-gate-matrix.md`
- Updated manually per release cycle

### Phase B (future): Scripted Collection
- `scripts/collect-evidence.mjs` — reads local reports
- Generates `final-evidence-summary.md`
- No external calls, no GitHub writes
- Redacts all paths/secrets

### Phase C (future, deferred): CI Integration
- `evidence-collect` CI job in quality-gates.yml
- Posts evidence comment to Issue #165
- Requires `GITHUB_TOKEN` (already available in CI)
- Non-blocking initially, promote after stability

---

## 8. Decision

**Discovery complete.** The evidence landscape is fully mapped. All 7 layers are documented with their status, artifacts, and gate criteria. Implementation of automated evidence collection can proceed when CI infrastructure is fully stable.

**Recommendation:** Close #173 as discovery-complete. Create separate issues for Phase B (script) and Phase C (CI integration) when ready.

Date: 2026-06-05 | Issue: #173 | Epic: #165
