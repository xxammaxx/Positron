# Mutation CI Stability Observation — QA-008.1

## Purpose

Observe the non-blocking `mutation-safety` CI job across multiple runs to determine readiness for QA-009 (blocking gate activation).

## Observation Criteria

Per QA-008 gate policy, all of the following must hold across 3+ consecutive runs:

| # | Criterion | Threshold |
|---|-----------|-----------|
| 1 | Score | ≥ 85% |
| 2 | Runtime | < 2 minutes |
| 3 | Timeouts | 0 |
| 4 | Errors | 0 |
| 5 | No Coverage | 0 |
| 6 | Artifacts | Present |

---

## Run Log

### Run 0 — Baseline (local, 2026-06-05)

Local execution via `npm run test:mutation:safety`. This serves as the reference baseline before CI observation begins.

| Metric | Value | Pass? |
|--------|-------|-------|
| Status | ✅ Pass (break=0) | ✅ |
| Score | 88.32% | ✅ (>85%) |
| Runtime | ~34s | ✅ (<2min) |
| Killed | 242 | — |
| Survived | 32 | — |
| Timeouts | 0 | ✅ |
| Errors | 0 | ✅ |
| No Coverage | 0 | ✅ |
| Artifact | reports/mutation/safety-baseline/ | ✅ |

**Artifact contents:**
- `report.json` — full Stryker JSON report (542 mutants)
- `html/index.html` — interactive HTML report
- File breakdown: commit-policy (100%), opencode-policy (100%), speckit-policy (100%), state-machine (98.77%), paths (72.50%), secret-manager (78.21%), templates (57.14%)

---

### Run 1 — Pending

Triggered by: next push to main or pull_request.

| Metric | Value | Pass? |
|--------|-------|-------|
| Status | ⬜ | ⬜ |
| Score | ⬜ | ⬜ |

### Run 2 — Pending

Triggered by: subsequent push to main or pull_request.

### Run 3 — Pending

Triggered by: third push to main or pull_request.

---

## Stability Status

| Requirement | Met? | Note |
|-------------|------|------|
| 3 consecutive runs | ❌ | 0 of 3 CI runs observed |
| Score ≥ 85% all runs | ⬜ | Baseline: 88.32% ✅ |
| Runtime < 2min all runs | ⬜ | Baseline: 34s ✅ |
| Timeouts = 0 all runs | ⬜ | Baseline: 0 ✅ |
| Errors = 0 all runs | ⬜ | Baseline: 0 ✅ |
| No Coverage = 0 all runs | ⬜ | Baseline: 0 ✅ |
| Artifacts present all runs | ⬜ | Baseline: ✅ |

---

## How to Observe

The `mutation-safety` CI job triggers on:
- Push to `main`, `master`, `develop`
- Pull request against `main`, `master`, `develop`

Each run posts an artifact named `mutation-safety-report` containing:
- `reports/mutation/safety-baseline/report.json`
- `reports/mutation/safety-baseline/html/index.html`

To add an observation: download the artifact, check the JSON report for score/runtime, and update this document.

---

## Decision

- **Ready for QA-009:** ❌ — Awaiting 3 CI runs
- **Can simulate locally:** YES — `npm run test:mutation:safety` reproduces identical behavior
- **Next:** Fill run log after each CI trigger

Date: 2026-06-05 | Issue: #196 | Depends on: QA-008 #194
