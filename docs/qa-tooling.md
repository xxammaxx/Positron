# Positron QA Tooling Guide

## Overview

Positron uses multiple layers of testing and validation:

| Layer | Command | Scope | Runtime | CI |
|-------|---------|-------|---------|----|
| **Unit Tests** | `npm test` | All public/private functions | ~2s | Blockierend |
| **Property-Based Tests** | `npm test` (included) | State machine invariants (37 props, ~18k runs) | ~2s | Blockierend |
| **Contract Tests** | `npm run test:contracts` | Public API contracts between packages | ~0.4s | Blockierend |
| **Mutation Fast** | `npm run test:mutation:fast` | Selected high-risk modules | ~25s | Optional |
| **E2E Tests** | `npm run test:e2e` | Full browser workflow | ~30s | Optional |

## Contract Tests

### What Are Contract Tests?

Contract tests verify the **public API contracts** between Positron packages. They assert that:

- Exported functions exist with the correct signatures
- Return shapes are stable
- Error cases are stable
- Runtime behavior matches the documented contract
- No secrets or unsafe values are leaked
- Fake adapters satisfy the same interface as real adapters

Contract tests do NOT test:
- Internal implementation details
- Concrete file paths (unless part of the contract)
- Real external API calls
- Real tokens or credentials

### Why Contract Tests?

Positron is a multi-package monorepo. Packages like `@positron/shared`, `@positron/run-state`, and `@positron/github-adapter` expose public APIs that other packages depend on. Contract tests ensure that:

1. **Breaking changes are detected early** — if a package changes its exported API, contract tests fail
2. **Fake/Real parity is maintained** — fake adapters must implement the same interface as real ones
3. **Security invariants hold** — `redactValue()` never leaks secrets, `generateBranchName()` never produces unsafe branch names

### Secured Package Boundaries

| Package | Contracts Tested | Key APIs Verified |
|---------|-----------------|-------------------|
| `@positron/shared` | `utils.contract.test.ts` | `redactValue()`, `generateBranchName()`, `createRunId()`, `formatDuration()`, `truncate()`, `sleep()` |
| `@positron/shared` | `secret-manager.contract.test.ts` | `SecretManager`, `EnvSecretProvider`, `FileSecretProvider`, `mask()`, `maskValue()`, `hasSecret()`, `getProviderNames()` |
| `@positron/run-state` | `state-machine.contract.test.ts` | `createRun()`, `transition()`, `markFailed()`, `retry()`, `isTerminalPhase()`, `isFailurePhase()`, `canTransition()`, `VALID_TRANSITIONS` |
| `@positron/github-adapter` | `github-adapter.contract.test.ts` | `FakeGitHubAdapter` implements full `GitHubAdapter` interface (15 methods), idempotency contracts |

### Running Contract Tests

```bash
npm run test:contracts
```

Contract tests run in ~0.4 seconds with no external dependencies. No Redis, no BullMQ, no real API calls.

### Configuration

Contract tests use a dedicated vitest config at `vitest.contracts.config.ts`:

```typescript
test: {
  include: [
    'packages/*/src/__tests__/**/*.contract.test.ts',
    'packages/*/src/__contracts__/**/*.test.ts',
  ],
  testTimeout: 5000,
  environment: 'node',
}
```

### Still Open

- **Adapter real-mode contracts**: Contract tests for `RealOpenCodeAdapter` and `RealSpecKitAdapter` require the actual CLI tools installed
- **GitWorkspaceAdapter contract**: Needs a controlled Git remote (local bare repo) for safe testing
- **Property-based tests**: Planned in Issue #121 for state machine completeness

### Why No External API Calls

Contract tests must NOT make real API calls because:

1. They must run offline and in CI without secrets
2. They must be deterministic (no network flakiness)
3. They must be fast (sub-second execution)

Fake adapters provide the contract verification surface, while integration/E2E tests handle real adapter behavior.

## Property-Based Tests (QA-024)

### What Are Property-Based Tests?

Property-based tests verify **invariants** — statements that must hold for all valid inputs — by testing them against many randomly generated values. Instead of hand-picking edge cases, the testing framework (`fast-check`) generates thousands of random inputs and verifies the invariant holds for each.

In Positron, property-based tests verify the **State Machine** (`packages/run-state`).

### Invariants Tested

| # | Invariant | Runs | Description |
|---|-----------|------|-------------|
| 1 | VALID_TRANSITIONS consistency | 4000 | Every valid pair returns `true` from `canTransition`; every invalid pair returns `false`; no phase transitions to itself |
| 2 | Terminal phase integrity | 3500 | Terminal phases have `isTerminalPhase() = true`, non-terminal phases `false`; no transition possible from terminal phases |
| 3 | Failure phase classification | 4000 | All failure phases return `isFailurePhase() = true`; non-failure phases return `false`; `isFailurePhase ↔ phase.startsWith('FAILED')` |
| 4 | Invalid transition safety | 1500 | Invalid transitions preserve run identity, phase unchanged, `lastError` set with error message |
| 5 | Valid transition correctness | 1500 | Valid transitions preserve run identity, set correct target phase, generate properly structured events |
| 6 | Retry restrictions | 2001 | Retry succeeds only from `FAILED_TRANSIENT`; all other phases block retry; `TEST` is a valid retry target |
| 7 | markFailed guarantees | 6000 | `markFailed` always returns `ok:true`; result is always a failure phase; preserves identity; `failedPhase` and `reason` in event payload |
| 8 | Transition chain integrity | 1000 | Connected transition chains never skip forbidden edges; invalid edges are detected and rejected |

**Total: ~18,000 generated test cases across 37 properties.**

### Generators

| Generator | Coverage |
|-----------|----------|
| `phaseArb` | All 28 phases |
| `terminalPhaseArb` | 7 terminal phases (DONE, FAILED, FAILED_BLOCKED, FAILED_UNSAFE, BLOCKED_PUSH, BLOCKED_MERGE, CLEANUP) |
| `nonTerminalPhaseArb` | 21 non-terminal phases |
| `failurePhaseArb` | 4 failure phases (FAILED, FAILED_TRANSIENT, FAILED_BLOCKED, FAILED_UNSAFE) |
| `validTransitionArb` | All 67 allowed (from, to) pairs in VALID_TRANSITIONS |
| `invalidTransitionArb` | Forbidden pairs including terminal sources |
| `transitionChainArb` | Connected chains of 2-20 valid transitions |
| `failureKindArb` | All 4 failure kinds |
| `runStateArb` | Random RunState with all fields populated |

### Reproducing Failures

When a property test fails, fast-check prints the **seed** and the **counterexample**:

```
Property failed after 1 tests
{ seed: -293364349, path: "0", endOnFailure: true }
Counterexample: [[["TASKS","ANALYZE"],["ANALYZE","REVIEW"]],"disk full"]
```

To reproduce: use the seed in a focused test with `fc.assert(property, { seed: -293364349 })`.

### CI Decision

Property-based tests run as part of `npm test` (vitest). They are **blocking** in CI because they run in ~2s with no external dependencies and catch regressions that hand-written tests can miss.

### Known Limits

- Only the state machine is covered (not adapters or utils)
- Generators don't cover all possible `RunState` variations (e.g., non-null branch paths)
- `resumeFromEvents` has basic property coverage but could benefit from more exhaustive phase-order verification

## Unit Tests

Run with:

```bash
npm test
```

Covers:
- Backend: vitest with V8 coverage (100% threshold for lines, functions, branches, statements)
- Frontend: vitest with React Testing Library

Status: 362 backend tests, 60 frontend tests, 3 known skipped (BullMQ/Redis integration)

## Mutation Testing

```bash
npm run test:mutation:fast
```

Uses Stryker Mutator with vitest runner. Covers selected high-risk modules (`state-machine.ts`, `secret-manager.ts`, `utils.ts`). Threshold: 60% mutation score.

## Observability Validation

```bash
npm run observability:validate
```

Validates Prometheus config, alert rules, Alertmanager config, and Docker Compose observability stack.

## CI Integration

All tests run in GitHub Actions. Contract tests are **blocking** — if they fail, the CI pipeline fails. This is justified because:

- Contract tests run in ~0.4s
- No external dependencies (no Redis, no API calls, no tokens)
- Deterministic and reliable
- Catch breaking API changes immediately
