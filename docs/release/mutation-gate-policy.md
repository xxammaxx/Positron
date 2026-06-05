# Mutation Gate Policy — QA-008

## Status: Non-Blocking (current)

The `mutation-safety` CI job is currently **non-blocking** (`continue-on-error: true`).
This document defines the criteria that must be met before the gate can become blocking.

## Current Baseline (QA-006)

| Metric | Value |
|--------|-------|
| Score | 88.32% |
| Killed | 242 of 274 |
| Survived | 32 |
| Timeouts | 0 |
| Errors | 0 |
| No Coverage | 0 |
| Runtime | ~34 seconds |
| Modules | 7 safety/core |

## Blocking Gate Activation Criteria

A blocking mutation gate may only be activated when **ALL** of the following are true:

| # | Criterion | Status | Note |
|---|-----------|--------|------|
| 1 | ≥ 3 consecutive stable CI runs | ❌ | 0 runs — need observation period |
| 2 | Runtime < 2 minutes | ✅ | 34s — well within limit |
| 3 | Timeouts = 0 | ✅ | 0 in baseline |
| 4 | Errors = 0 | ✅ | 0 in baseline |
| 5 | No Coverage = 0 | ✅ | 0 uncovered mutants |
| 6 | No critical survivors open | ✅ | 0 critical, 0 high |
| 7 | Score ≥ 85% | ✅ | 88.32% (3.32% buffer) |
| 8 | Threshold documented | ✅ | This document |
| 9 | No secrets/GitHub writes | ✅ | Fake mode, no tokens |
| 10 | Maintainer approval | ❌ | Not yet requested |

**Current status: 8/10 criteria met. Blocked by: #1 (stability), #10 (approval).**

## Recommended Start Threshold

**85%** — with ratcheting plan:

| Phase | Threshold | When |
|-------|-----------|------|
| Baseline | 0% | QA-006/007 — now |
| Soft gate | 85% | QA-009 — after 3 stable runs |
| Hardening | 90% | After medium-severity survivors closed |
| Target | 95% | After low-severity survivors addressed |
| Aspirational | 100% | Only for Level-A safety modules |

## Ratcheting Policy

- Threshold must **never decrease**
- Raise threshold only after survivors are addressed and stable CI runs confirm
- Each threshold increase requires new PR documenting the change
- Safety coverage (100/100/100/100) is independent and always blocking

## CI Architecture

```
quality-gates.yml
├── build-and-test (blocking)
│   ├── Format (Biome)
│   ├── Lint (Biome)
│   ├── Build
│   ├── Typecheck
│   └── Unit Tests
├── observability-config-check (blocking)
├── mutation-fast (non-blocking)
├── mutation-safety (non-blocking) ← current
└── e2e-playwright (non-blocking)
```

When activated:
```yaml
mutation-safety:
  continue-on-error: false  # QA-009
```

## Stability Observation Plan

Before activation:
1. Let `mutation-safety` run in CI for ≥ 3 consecutive PRs/merges
2. Verify score stays ≥ 85% across all runs
3. Verify runtime stays < 2 minutes
4. Verify 0 timeouts/errors across all runs
5. Document stability report in `docs/release/mutation-ci-stability-plan.md`

## Decision Matrix

| Condition | Block Now? |
|-----------|-----------|
| All 10 criteria met | Yes — activate |
| 8-9 criteria met (missing stability/approval) | No — wait for observation |
| < 8 criteria met | No — address blockers first |
| Score drops below 85% | No — investigate regression |

Date: 2026-06-05 | Issue: #194 | Depends on: QA-006 #190, QA-007 #192
