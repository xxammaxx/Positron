# Positron Test Strategy — Context Manifest

> Version: 1.0.0 | Date: 2026-06-10 | Branch: `chore/vibe-coding-orchestration`
> Source-of-Truth: GitHub Repository `xxammaxx/Positron`
> Scope: `positron-test-strategy-direct-integration`

---

## Run Context

| Field | Value |
|-------|-------|
| Run ID | `550e8400-e29b-41d4-a716-446655440000` |
| Phase | IMPLEMENT (Test Strategy Integration) |
| Autonomy Level | 2 |
| Attempt | 1 |
| Max Attempts | 1 |

## Issue Context

| Field | Value |
|-------|-------|
| Issue | Positron Teststrategie direkt einbauen |
| Labels | test-strategy, agentic-coding, ci-gates |
| URL | GitHub issue on chore/vibe-coding-orchestration branch |

## Repository Context

| Field | Value |
|-------|-------|
| Owner | xxammaxx |
| Name | Positron |
| Default Branch | main |
| Language | TypeScript 5.4 |
| Package Manager | npm |
| Runtime | Node >= 22 |
| Test Framework | Vitest 4.x, Playwright 1.60, Stryker 9.6, fast-check 4.8 |

## Workspace

| Field | Value |
|-------|-------|
| Path | C:\Positron |
| Branch | chore/vibe-coding-orchestration |
| Base Commit | 54010a3 |
| Isolation | Direct (no worktree — test strategy integration) |

## Specification Artifacts

| Artifact | Path | Status |
|----------|------|--------|
| Constitution | `.specify/memory/constitution.md` | Existing |
| Test Strategy | `docs/testing/POSITRON_TEST_STRATEGY.md` | Created |
| Verification Contract | `docs/testing/POSITRON_TEST_STRATEGY_VERIFICATION_CONTRACT.md` | Created |
| Reality Gate | `docs/audits/REPOSITORY_REALITY_GATE.md` | Created |

## Verification Contract

| Criterion | Status |
|-----------|--------|
| Repository Reality Gate completed | PASS |
| Test strategy matrix maps to actual repo state | PASS |
| Red tests exist for new agentic contract types | PASS |
| Known failures classified as FIXABLE/MITIGATABLE | PASS |
| No new test regressions introduced | PASS |
| CI gates enhanced with separate test layers | PASS |
| Evidence artifacts configured | PASS |
| Human approval required for merge | PENDING |

## Red Tests

| Test File | Tests | Status |
|-----------|-------|--------|
| `agent-capability-registry.contract.test.ts` | 27 tests | Green |
| `evidence-log.contract.test.ts` | 26 tests | Green |
| `reviewer-report.contract.test.ts` | 28 tests | Green |
| `coding-agent-adapter.contract.test.ts` | 18 tests | Green |
| `context-manifest.test.ts` | 18 tests | Green |
| **Total** | **117 tests** | **All pass** |

## Context

### Affected Modules
- `packages/shared/src/agent-types.ts` (new)
- `packages/shared/src/evidence-types.ts` (new)
- `packages/shared/src/index.ts` (updated)
- `.github/workflows/quality-gates.yml` (updated)
- `packages/opencode-adapter/src/__tests__/real-adapter.test.ts` (fixed)
- `packages/run-state/src/__tests__/state-machine.property.test.ts` (fixed)

### Existing Tests
- 32 test files, 708 tests (unit)
- 8 test files, 247 tests (contract)
- 5 Playwright spec files (E2E)

### Configuration Files
- `vitest.config.ts`
- `vitest.contracts.config.ts`
- `vitest.safety.config.ts`
- `playwright.config.ts`
- `.github/workflows/quality-gates.yml`

## Agent

| Field | Value |
|-------|-------|
| Type | issue-orchestrator (OpenCode) |
| Capabilities | repo_read, code_write, spec_generate, plan_generate, task_breakdown |
| Trust Tier | 1 |
| Risk Level | medium |
| Allowed Paths | workspace/* |
| Denied Paths | .env, **/.git/ |

## Constraints

| Constraint | Source |
|-----------|--------|
| No implementation without spec | `.specify/memory/constitution.md` |
| Evidence-gated progression | `.opencode/policies/evidence-gates.json` |
| MCP trust tier enforcement | `.opencode/policies/mcp-trust-tiers.json` |
| No secret leakage | `SECURITY.md` |
| Known failures classified separately | Test Strategy |

## Evidence Requirements

| Evidence | Required | Status |
|----------|----------|--------|
| Test Report | Yes | All 955 tests pass |
| Diff Summary | Yes | See Evidence Log |
| CI Status | N/A | CI workflow updated |
| Preview Screenshot | No | No UI changes |
| Security Scan | Yes | Existing safety tests pass |
| Reviewer Verdict | Yes | Pending |
| Human Approval | Yes | Pending |

## Output

| Directory | Purpose |
|-----------|---------|
| `.positron/runs/{runId}/evidence` | Evidence artifacts |
| `.positron/runs/{runId}/artifacts` | Build artifacts |

---

*Context manifest generated 2026-06-10 by positron-orchestrator.*
