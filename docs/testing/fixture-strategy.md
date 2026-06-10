# Test Data & Fixture Strategy

> Positron v3.0 — Evidence-Gated GitHub Issue Execution System
> Status: Active | Last updated: 2026-05-25

## Principles

1. **No production data in tests.** Ever.
2. **Deterministic reset.** Every test must be able to reset its state.
3. **Isolation per test.** No global test state leakage.
4. **Reproducible fixtures.** Fixtures must produce identical initial state.
5. **Environment separation.** Local, test, staging, and production use different data sources.

## Test Database Strategy

### Backend (apps/server)

- **SQLite in-memory** (`:memory:`) for unit and integration tests
- **SQLite file** for persistent integration tests when needed
- **No shared database** between test runs
- **Migrations run fresh** per test suite

```typescript
// Example: isolated database per test suite
import { createServer } from '../index.js';

beforeAll(async () => {
  server = createServer({
    repository: { owner: 'test-owner', repo: 'test-repo' },
    dbPath: ':memory:',  // fresh in-memory DB
  });
});
```

### Frontend (apps/web)

- **Mock Service Worker (MSW)** or inline mocks for API responses
- **No real HTTP calls** in unit tests
- **Playwright E2E** uses the actual backend with test data

## Fixture Files

### Location

```
e2e/
├── fixtures/
│   ├── test-issue.json          # Sample GitHub issue payload
│   ├── test-repository.json     # Sample repository config
│   ├── test-run-initial.json    # Initial run state
│   └── test-events.json         # Sample run events
```

### Usage

Fixtures are loaded by the test orchestrator and test files:

```typescript
import testIssue from '../fixtures/test-issue.json';

test('processes a valid issue', async () => {
  const response = await post('/api/repos/repo-1/runs', testIssue);
  expect(response.status).toBe(200);
});
```

## Environment Variables for Testing

| Variable | Purpose | Default |
|---|---|---|
| `POSITRON_DB_PATH` | Database location for tests | `:memory:` |
| `POSITRON_GITHUB_MODE` | `fake` for tests, `real` for live | `fake` |
| `POSITRON_REPO_OWNER` | Test repo owner | `test-owner` |
| `POSITRON_REPO_NAME` | Test repo name | `test-repo` |
| `PW_HEADED` | Show browser (1=yes) | `0` |
| `PW_SLOWMO` | Slow down browser (ms) | `0` |
| `CI` | CI environment flag | unset locally |

## Data Reset Strategy

### Between Tests

```
beforeEach → reset database / re-create server
afterEach  → close connections, clean up temp files
```

### Between Test Suites

```
beforeAll → create fresh server + DB
afterAll  → close server, delete temp DB files
```

### Global State Protection

- No `globalThis` state mutations
- No module-level singletons that persist across tests
- No shared mutable state between packages

## Secrets in Tests

- **Never** use real GitHub tokens
- **Never** use real LLM API keys
- **Use** `.env.test` for test-specific credentials
- **Redact** all secrets from test output and logs

```bash
# .env.test (example — never commit real values)
POSITRON_GITHUB_TOKEN=test_token_placeholder
POSITRON_LLM_API_KEY=test_key_placeholder
```

## Environment Separation

```
┌──────────────┐     ┌──────────┐     ┌──────────┐     ┌──────────────┐
│   Local Dev  │ ──→ │   Test   │ ──→ │ Staging  │ ──→ │  Production  │
│  SQLite :mem │     │ SQLite   │     │PostgreSQL│     │  PostgreSQL   │
│  Fake mode   │     │ Fake mode│     │ Real API │     │  Real API     │
│  Headed E2E  │     │Headless  │     │Headless  │     │  Monitoring   │
└──────────────┘     └──────────┘     └──────────┘     └──────────────┘
```

## Volumes and Persistence

- **Test artifacts** stored in `test-results/` (gitignored)
- **Playwright traces** stored in `test-results/traces/`
- **Screenshots** stored in `test-results/screenshots/`
- **Videos** stored in `test-results/videos/`
- **Logs** stored in `.opencode/logs/`

## Running with Test Data

```bash
# Full test suite with test fixtures
npm test

# E2E with test data (headless, CI mode)
npm run test:e2e

# E2E with test data (headed, visible browser)
npm run test:e2e:headed

# E2E with test data (slow, visible observation)
npm run test:e2e:slow
```
