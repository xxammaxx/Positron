# Positron QA Tooling Guide

## Overview

Positron uses multiple layers of testing and validation:

| Layer | Command | Scope | Runtime | CI |
|-------|---------|-------|---------|----|
| **Unit Tests** | `npm test` | All public/private functions | ~2s | Blockierend |
| **Property-Based Tests** | `npm test` (included) | State machine invariants (37 props, ~18k runs) | ~2s | Blockierend |
| **Contract Tests** | `npm run test:contracts` | Public API contracts between packages | ~0.4s | Blockierend |
| **Mutation Fast** | `npm run test:mutation:fast` | Selected high-risk modules | ~25s | Optional |
| **E2E Tests** | `npm run test:e2e` | Full browser workflow (25 tests) | ~60s | Optional (QA-030, non-blocking) |

## E2E Tests (QA-028 / QA-031)

### Test Suite Overview

The E2E suite consists of 4 test files, 25 tests total, all passing green (QA-031):

| File | Tests | Purpose |
|------|-------|---------|
| `e2e/smoke.spec.ts` | 3 | Health check, Dashboard, Runs API |
| `e2e/diagnostic-reality-check.spec.ts` | 6 | Console/network logging, screenshots, API reachability |
| `e2e/full-run-lifecycle.spec.ts` | 2 | Full QUEUED→DONE lifecycle + console error check |
| `e2e/workflow-proof.spec.ts` | 14 | 16-step UI workflow proof (S01-S16) |

### QA-031: E2E Suite Stabilization

All 4 pre-existing E2E failures were analyzed and fixed:

| Test | Root Cause | Fix |
|------|-----------|-----|
| `diagnostic-reality-check` Test 3 & 6 | Hardcoded `API_BASE = http://localhost:3001` — server runs on port 3000 | Changed `API_BASE` to `http://localhost:3000` |
| `diagnostic-reality-check` manifest | `baseUrl: http://localhost:5174` — frontend runs on port 5173 | Changed to `http://localhost:5173` |
| `workflow-proof` S05 | "Load Mini Blueprint" button removed in UI refactoring (commit `9f4ae99`) | Updated to use "Generate Blueprint" + repo/issue inputs |
| All tests | Rate limiter (100 req/min) blocked cumulative E2E API calls with 429 | Added `VITEST=true` bypass in rate limiter middleware |

### Port 3001 Issue — Root Cause Analysis

Port 3001 was a historical artifact:
- **Not Grafana** — Grafana runs on port 3000 (conflicts with backend in production)
- **Not an old UI port** — the frontend always used port 5173 (Vite default)
- **Originated from** `e2e/diagnostic-reality-check.spec.ts` line 18: `const API_BASE = 'http://localhost:3001'`. This was a stale/incorrect assumption from an earlier configuration.

**Resolution:** All E2E tests use `http://localhost:3000` for the backend and `http://localhost:5173` for the frontend, matching the Playwright `webServer` configuration.

### Rate Limiter Bypass (QA-031)

The server has a global rate limiter (100 requests per 60 seconds per IP, from Issue #93). During E2E testing, the cumulative API calls across 25 tests exceed this limit, causing `429 Too Many Requests` errors.

**Fix:** Added `VITEST=true` bypass in `apps/server/src/index.ts` rate limiter middleware:
```typescript
// QA-031: Bypass rate limiting in test environment (E2E tests trigger 100+ requests)
if (process.env.VITEST === "true") {
  next();
  return;
}
```

This follows the same pattern as `POSITRON_DISABLE_QUEUE=true` — test-specific configuration that doesn't weaken production security.

E2E tests use a real browser (Chromium via Playwright) to validate the complete Positron user workflow through the web interface.

**Isolation Rules:**
- **Fake GitHub Adapter** — `POSITRON_GITHUB_MODE=fake` enforced via Playwright webServer env
- **Fake OpenCode Adapter** — `POSITRON_OPENCODE_MODE=fake`
- **Fake SpecKit Adapter** — `POSITRON_SPECKIT_MODE=fake`
- **No `.env` loading** — `VITEST=true` prevents accidental real-mode activation
- **No real GitHub tokens** — Explicitly cleared via `GITHUB_TOKEN=""`
- **No real GitHub API calls** — Fake adapters simulate all operations
- **No real GitHub writes** — All PR/commit operations are simulated
- **No real OpenCode process** — Fake adapter simulates CLI execution
- **Deterministic test data** — `test-owner/test-repo`, Issue #1

### Run Lifecycle E2E Test (QA-028 / QA-029)

`e2e/full-run-lifecycle.spec.ts` — Validates the complete user workflow:

| Step | Action | Assertion |
|------|--------|-----------|
| S01 | Dashboard loads | Heading "Dashboard" visible, main nav visible |
| S02 | Open New Run modal, enter URL | Modal visible, input filled, Start Run clicked |
| S02 | Navigate to run detail | URL matches `/runs/:id` |
| S03 | Run detail page loads | Phase pipeline visible, Run heading visible |
| S04 | Verify DONE via API | `expect.poll()` confirms `run.phase === "DONE"` |
| S05 | UI shows DONE status | Pipeline badge updated, no error banner |
| S06 | All pages reachable | Dashboard, Runs, Evidence, Settings |
| S07 | Backend health stable | `/api/health` returns ok |

### QA-029: Pipeline Regression Fix

**Root Cause:** A running BullMQ worker (`apps/worker/`) was registered in Redis, causing `getWorkers()` to return 1. The server then queued jobs via BullMQ instead of using the inline fallback. The worker could not find runs in its own database, causing jobs to fail and runs to stall at `QUEUED`.

**Fix:** Added `POSITRON_DISABLE_QUEUE=true` environment variable. When set, the server skips the BullMQ queue entirely and executes `runFullPipeline` synchronously (inline fallback). This is enabled for:
- **Vitest integration tests** (`vitest.config.ts` + `vitest.setup.ts`)
- **Playwright E2E tests** (`playwright.config.ts` FAKE_MODE_ENV)

### Pipeline Path Decision

| Environment | Path | Mechanism |
|-------------|------|-----------|
| E2E (Playwright) | Inline | `POSITRON_DISABLE_QUEUE=true` |
| Integration tests (Vitest) | Inline | `POSITRON_DISABLE_QUEUE=true` |
| Dev server | Queue (if Redis+Worker) or Inline | Automatic: `getWorkers()` check |
| Production | Queue | BullMQ with dedicated worker |

### SSE/Polling Validation

The UI receives run updates via both mechanisms:

| Mechanism | Implementation | E2E Validation |
|-----------|---------------|----------------|
| SSE (EventSource) | `useSSE.ts` — connects to `/api/runs/:id/events/stream` | Not directly testable in Playwright (EventSource mocking); covered by polling fallback |
| Polling | `useRun.ts` — HTTP GET every 3s | Asserted via `page.waitForTimeout` + UI element visibility checks |
| API Polling | Direct `fetch()` calls | Used for fast DONE verification (when pipeline is working) |

### Local Execution

```bash
# Full suite (headless, CI-compatible)
npm run test:e2e

# Visible browser (debugging)
npm run test:e2e:headed

# Debug mode (Playwright Inspector, step-by-step)
npm run test:e2e:debug

# Slow-motion for visual verification
npm run test:e2e:slow

# Single test file
npx playwright test e2e/diagnostic-reality-check.spec.ts --workers=1
npx playwright test e2e/workflow-proof.spec.ts --workers=1
npx playwright test e2e/full-run-lifecycle.spec.ts --workers=1
```

### CI Integration (QA-030 / QA-031)

The E2E test runs as a **non-blocking, optional** job (`e2e-playwright`) in the `Quality Gates` GitHub Actions workflow (`.github/workflows/quality-gates.yml`).

**CI Job Properties:**

| Property | Value |
|----------|-------|
| Job name | `e2e-playwright` |
| Trigger | `push` and `pull_request` on main/master/develop |
| Timeout | 10 minutes |
| Blocking | No (`continue-on-error: true`) — optional until stability window completed |
| Browser | Chromium only (`npx playwright install chromium`) |
| Node version | 22 |
| Dependencies | `npm ci` |

**QA-031 Update:** The E2E suite is now fully green (25/25 tests pass). The suite remains **optional** in CI. The stability window is being monitored. After ≥5 consecutive successful CI runs with 0 flakes, the E2E gate can be promoted to blocking.

**CI-Explicit Safety Env:**

All these environment variables are set at the CI job step level for defense-in-depth:

| Env Var | Value | Purpose |
|---------|-------|---------|
| `VITEST` | `true` | Skip `.env` loading, prevent real-mode activation |
| `NODE_ENV` | `test` | Runtime test mode |
| `POSITRON_DISABLE_QUEUE` | `true` | Force inline pipeline execution (no BullMQ) |
| `POSITRON_GITHUB_MODE` | `fake` | Fake GitHub adapter |
| `POSITRON_OPENCODE_MODE` | `fake` | Fake OpenCode adapter |
| `POSITRON_SPECKIT_MODE` | `fake` | Fake SpecKit adapter |
| `GITHUB_TOKEN` | `""` | No real GitHub token |
| `POSITRON_REPO_OWNER` | `test-owner` | Fake repo for test data |
| `POSITRON_REPO_NAME` | `test-repo` | Fake repo for test data |
| `POSITRON_REPO_DEFAULT_BRANCH` | `main` | Default branch for test data |
| `POSITRON_ADMIN_TOKEN` | `positron-admin-dev` | Test admin token |

**No external dependencies required:**
- No Redis service
- No BullMQ worker
- No external API calls
- No GitHub tokens
- No Docker services

**Artifact Upload:**

Playwright reports, traces, and test results are uploaded as CI artifacts on every run (including failures):

| Artifact | Path | Behavior on Failure |
|----------|------|---------------------|
| Playwright HTML Report | `playwright-report/**` | Uploaded (`if: always()`) |
| Test Results (traces, screenshots) | `test-results/**` | Uploaded (`if: always()`) |

Artifacts are available for download from the GitHub Actions run page.

### Stability Window — Upgrade Criteria to Blocking Gate

The E2E job is intentionally **non-blocking** (`continue-on-error: true`). It will be promoted to a blocking gate when all of the following criteria are met:

| Criterion | Target | Rationale |
|-----------|--------|-----------|
| Successful CI runs | ≥ 5 consecutive | Confidence in reliability |
| Flake rate | 0% | No intermittent failures |
| Runtime | < 30 seconds (target) | Fast feedback for developers |
| External services | 0 | Self-contained, no Redis/API |
| Secrets required | 0 | No tokens needed |
| DONE-step stability | 100% | Pipeline completes reliably |
| Artifact usability | Reports useful on failure | Debuggable when tests break |

**When criteria are met:** Change `continue-on-error: true` to `continue-on-error: false` (or remove it) in the CI workflow, and update the overview table to mark E2E as "Blockierend".

### Known Limits

- **SSE in Playwright**: `EventSource` behavior differs in headless Chromium. Tests rely on HTTP polling fallback for status updates.
- **Real-Adapter E2E missing**: Only fake adapter E2E testing exists. Real adapter E2E requires controlled GitHub test repos and is planned separately.
- **Browser flakiness possible**: Vite hot-reload and React component mounting timing may cause occasional failures. Rerun `npm run test:e2e` if a test flakes. The CI retries up to 2 times.
- **Worker processing not in UI E2E**: The actual BullMQ worker processing path is not validated through the UI E2E test (covered by integration tests).
- **Inline-only in test**: E2E and integration tests use inline pipeline execution (`POSITRON_DISABLE_QUEUE=true`). The BullMQ queuing path is validated separately via unit tests and contract tests.
- **Rate limiter bypass in test**: The production rate limiter (100 req/min) is bypassed during E2E tests via `VITEST=true`. Production rate limiting remains active at all times.

### Troubleshooting

**Port conflicts (EADDRINUSE 3000/5173):**
```bash
# Check what's using the ports
lsof -i :3000
lsof -i :5173

# Kill existing processes
fuser -k 3000/tcp
fuser -k 5173/tcp

# Or let Playwright reuse existing servers (reuseExistingServer: true)
```

**Port 3001 confusion:**
Port 3001 is NOT used by Positron. The backend runs on port 3000 and the frontend on port 5173. If you see port 3001 referenced anywhere (e.g., in old tests or documentation), it's a stale artifact. Update to port 3000.

**Stale compiled Playwright files:**
If you're editing `.spec.ts` files and changes don't take effect, check for stale compiled `.spec.js` files:
```bash
# Remove stale compiled files
rm e2e/**/*.spec.js e2e/**/*.spec.js.map e2e/**/*.spec.d.ts.map
```

**Rate limiting / "Too many requests" (429):**
If you see `429 Too Many Requests` during E2E tests, ensure `VITEST=true` is set. The Playwright config automatically sets this, but if running a custom server manually:
```bash
VITEST=true npm run dev  # starts server without rate limiting
```

Or in `playwright.config.ts`, the rate limiter is bypassed automatically when the webServer is configured with `VITEST: "true"` in its env.

**Stale dev server:**
```bash
# Kill all Positron-related processes
fuser -k 3000/tcp 5173/tcp
# Then restart via Playwright
npm run test:e2e
```

**Wrong baseURL:**
The Playwright config uses `baseURL: "http://localhost:5173"`. Tests should use relative URLs (`await page.goto('/')`) not hardcoded full URLs. The `full-run-lifecycle.spec.ts` and `diagnostic-reality-check.spec.ts` follow this pattern.

**Missing browsers:**
```bash
npx playwright install chromium
```

### Server/Web Autostart

Playwright's `webServer` config automatically starts:
- Backend: `npx tsx src/index.ts` on port 3000 (health check: `/api/health`)
- Frontend: `npx vite --port 5173` on port 5173

Both use `reuseExistingServer: true` — manually started servers will be reused.

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

In Positron, property-based tests verify:
- **State Machine** (`packages/run-state`) — 37 properties, ~18,000 runs
- **Shared Utilities** (`packages/shared`) — 21 properties, ~11,000 runs

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

### Shared Utilities (QA-025)

Property-based tests for security-critical shared utilities: `redactValue()` and `generateBranchName()`.

**`redactValue()` Invariants** (~4,500 runs):

| # | Property | Runs | What it verifies |
|---|----------|------|------------------|
| 1 | No secret leaks in plaintext | 1,000 | Fake tokens are NEVER returned in plaintext |
| 2 | Secrets in context | 500 | Token patterns embedded in text (headers, query strings) are redacted |
| 3 | Nested objects | 500 | Secrets at any nesting depth in JSON objects are masked |
| 4 | Arrays with secrets | 500 | Secrets in arrays are redacted; non-secret arrays pass through safely |
| 5 | Safe primitives | 1,000 | Non-secret values (strings, numbers, booleans) are never falsely redacted |
| 6 | Circular references | 10 | Throws produce safe `[Unserializable]` fallback, never crash |
| 7 | Multiple secrets | 500 | All secrets in a string are redacted, not just the first |
| 8 | Never throws | 1,000 | Any input type returns a string, never throws |

**`generateBranchName()` Invariants** (~6,500 runs):

| # | Property | Runs | What it verifies |
|---|----------|------|------------------|
| 1 | Non-empty output | 1,000 | Always produces a valid branch name string |
| 2 | No shell metacharacters | 1,000 | Removes `;`, `|`, `&`, `$`, backticks, `()`, `<>`, whitespace |
| 3 | No path traversal | 1,000 | Removes `..`, `/etc/`, `C:\` patterns |
| 4 | Determinism | 1,000 | Same input always produces identical output |
| 5 | Slug length ≤ 50 | 1,000 | Truncation contract is enforced |
| 6 | Slug charset `[a-z0-9-]` | 1,000 | Only lowercase alphanumeric and hyphens in slug |
| 7 | No leading/trailing hyphens | 1,000 | Slug never starts or ends with `-` |
| 8 | ASCII-only | 500 | Unicode/umlauts are stripped to ASCII |
| 9 | Issue number uniqueness | 500 | Different issue numbers produce different branch names |

**Generators:**
- Secret patterns: `ghp_`, `sk-`, `anthropic_`, `github_pat_`, `AIza` — all FAKE tokens
- Dangerous titles: shell metacharacters, path traversal, command injection, unicode
- Nested objects/arrays with secrets at various depths

## Unit Tests

Run with:

```bash
npm test
```

Covers:
- Backend: vitest with V8 coverage (100% threshold for lines, functions, branches, statements)
- Frontend: vitest with React Testing Library

Status: ~450 backend tests, ~60 frontend tests, 3 integration tests have known pipeline regression (runs stay at QUEUED)

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
