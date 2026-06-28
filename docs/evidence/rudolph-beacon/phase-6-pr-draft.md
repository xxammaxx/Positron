# Phase 6 — PR Description Draft

**Status:** DRAFT — NOT submitted
**Target:** `feat/issue-279-phase-1g-safe-apply-plan-20260624-135722` → `main`

---

## Suggested PR Title

```
feat(issue-279): add Rudolph Beacon benchmark and controlled real-mode probe
```

---

## Summary

This PR introduces the Rudolph Beacon — a deterministic, evidence-gated benchmark system for verifying Positron agent capability across multiple dimensions (domain logic, schema validation, negative testing, real-mode blockade, commit-readiness). It establishes a formal benchmark framework that ensures the Positron agent ecosystem can detect regressions in safety-critical behavior, enforce evidence requirements, block dangerous operations, and validate run summaries before claiming conclusions.

The benchmark runs in fixture mode (deterministic, no external dependencies) and includes a controlled local real-mode probe that validates all approval gates and kill-switches without performing any GitHub write actions, push, merge, or remote CI.

---

## Scope

### What's Included

- **Packages:**
  - `packages/benchmark-rudolph/` — New deterministic benchmark package

- **Benchmark Modules:**
  - `beacon-domain.ts` — Domain classification (battery, RSSI, staleness) — 7 Red Tests
  - `beacon-fixtures.ts` — Deterministic scan simulator (seeded PRNG) — 2 Red Tests
  - `evidence-contract.ts` — Machine-readable evidence schema with `validateRunSummary()` — 63 tests, 97.24% coverage
  - `benchmark-runner.ts` — Fixture/dry-run/real execution modes — 2 Red Tests
  - `traceability.ts` — Issue traceability and independence validation — 1 Red Test
  - `controlled-real-probe.ts` — Controlled real-mode with approval gates, `isRedHoldAction()`, `checkCommitReadiness()` — 8 Red Tests

- **Documentation:**
  - `docs/benchmark/rudolph-beacon/` — BENCHMARK_SPEC, CAPABILITIES, KNOWN_LIMITATIONS, COVERAGE_POLICY
  - `docs/evidence/rudolph-beacon/` — Phase 3-6 evidence artifacts (run reports, audit trails, gate results)
  - `docs/audits/` — Issue cleanup and reconciliation documentation
  - `docs/architecture/` — Mermaid diagrams (evidence flow, feedback flow, system map)

- **Configuration:**
  - Updated `.gitignore`: `/evidence/` excluded (line 92)
  - Updated `package.json`: Added `test:benchmark:rudolph` and `test:benchmark:rudolph:coverage` scripts
  - Updated `tsconfig.json`: Added `packages/benchmark-rudolph` to composite build

### What's NOT Included

- No changes to `apps/server`, `apps/web`, `packages/shared`, `packages/opencode-adapter`, `packages/run-state`
- No full real-mode execution with external tools (controlled local probe only)
- No network, Bluetooth, or hardware testing
- No GitHub Actions or CI pipeline changes
- No push, merge, PR creation, or remote CI execution
- No `.env` files or secrets
- No build artifacts (`dist/`, `*.tsbuildinfo`, `*.js.map`, `coverage/`)

---

## Tests

### Benchmark Tests
```
282/282 PASS (7 test files, 176ms)
7 test files | 0 failures
```

| File | Tests | Description |
|------|-------|-------------|
| `beacon-domain.test.ts` | 19 | Battery/RSSI/stale classification + precedence |
| `beacon-fixtures.test.ts` | 15 | Deterministic scan, seed reproducibility |
| `benchmark-runner.test.ts` | 12 | Execution modes, dry-run blocks, fixture processing |
| `evidence-contract.test.ts` | 86 | Schema validation, secret redaction, conclusion logic |
| `evidence-schema-validation.test.ts` | 32 | Full schema enforcement, fixture validation |
| `red-negative-tests.test.ts` | 98 | Negative paths, real-mode blockade, commit-readiness |
| `traceability.test.ts` | 20 | Traceability map, issue independence |

### Red Tests
```
36/36 PASS
```
- Red 1-7: Beacon domain (battery thresholds, RSSI, staleness)
- Red 8-14: Evidence schema (DONE-without-evidence, secret detection, conclusion logic)
- Red 15-28: Negative paths (blind GREEN, assumption-as-evidence, missing coverage)
- Red 29-36: Real-mode blockade (approval gates, RED_HOLD actions, commit-readiness)

---

## Coverage

### Benchmark Package
| Metric | Value | Threshold |
|--------|-------|-----------|
| Statements | 93.91% | ≥85% ✅ |
| Branches | 88.57% | ≥85% ✅ |
| Functions | 94.33% | ≥85% ✅ |
| Lines | 93.90% | ≥85% ✅ |

### Key File: `evidence-contract.ts`
| Metric | Value |
|--------|-------|
| Statements | 97.24% |
| Branches | 97.41% |
| Functions | 100.00% |
| Lines | 97.12% |

### Global Coverage Note
The global coverage command (`npm run test:benchmark:rudolph:coverage`) returns exit code 1 due to pre-existing global thresholds (30% lines, 25% branches) applied across all packages — other packages lack vitest coverage configuration. This is NOT caused by the benchmark and is documented as `PRE_EXISTING_GLOBAL_THRESHOLD`. The benchmark package itself exceeds all thresholds.

---

## Evidence

All evidence artifacts are committed under `docs/evidence/rudolph-beacon/`:

| Phase | Artifacts | Description |
|-------|-----------|-------------|
| Phase 3 | reality-refresh, preflight, gates, report, reviewer-report, summary | Initial benchmark verification |
| Phase 4 | reality-refresh, preflight, gates, report, reviewer-report, summary, commit-readiness | Coverage gap analysis |
| Phase 5 | reality-refresh, preflight, gates, report, reviewer-report, summary, commit-readiness, gitignore-decision | Coverage closure (82.73% → 97.24%) |
| Phase 6 | reality-refresh, commit-audit, evidence-code-audit, gates, pr-readiness, pr-draft, reviewer-report, summary | Final review and PR readiness |

Root `/evidence/` is gitignored to prevent accidental commit of runtime artifacts. `docs/evidence/rudolph-beacon/` remains versioned for audit trail.

---

## Risks

| Risk | Classification | Mitigation |
|------|---------------|------------|
| Full real-mode untested | YELLOW_REVIEW | Controlled local probe only; separate approval needed for full real mode |
| Global coverage exit code 1 | PRE-EXISTING | Not caused by benchmark; benchmark package at 93.91% |
| Mermaid diagram validation | TOOL_GAP | Diagrams are documentation-only; no runtime dependency |
| Cross-platform behavior | UNKNOWN | Tests run on Windows only (by design for now) |
| No full `npm test` in Phase 6 | YELLOW_REVIEW | Benchmark tests are the primary gate; full suite recommended before merge |

---

## Reviewer Notes

1. **Focus areas:**
   - `controlled-real-probe.ts` — Approval gate logic and env var checks
   - `evidence-contract.ts` — `validateRunSummary()` schema enforcement
   - `red-negative-tests.test.ts` — Negative/error path coverage
   - `benchmark-runner.ts` — Execution mode downgrade logic

2. **Not in scope:**
   - Full real-mode execution with external tools
   - GitHub Actions or CI pipeline changes
   - Changes to existing application packages

3. **Pre-existing conditions:**
   - Global coverage exit code 1 (see Coverage section)
   - Other packages have 0% coverage in vitest reports (no vitest config)

---

## Human Approval Required

The following actions require **explicit human approval** and are NOT included in this PR:

| Action | Why |
|--------|-----|
| `git push` | Push policy requires approval |
| `gh pr create` | PR creation requires approval |
| `gh pr merge` | No merge without approval |
| Full real-mode execution | Requires `HUMAN_APPROVED_REAL=true` + `POSITRON_ENABLE_REAL=true` |
| GitHub Actions trigger | Remote CI requires approval |

---

## Issue Reference

- **Primary:** [#279 — Rudolph Beacon Benchmark](https://github.com/xxammaxx/Positron/issues/279)
- **Related:** [#268 — GitHub Actions advisory-only](https://github.com/xxammaxx/Positron/issues/268)

---

## Commits in this PR (will become 2 commits)

1. `6f65a5b` — `feat(issue-279): add Rudolph Beacon benchmark hardening and controlled real-mode probe` (68 files, +10,600 lines)
2. `7000ff9` — `docs(issue-279): add Phase 5 closure evidence artifacts` (6 files, +603 lines)

Phase 6 evidence commits will be added before PR creation (after human review).
