# Issue #13 Initial Assessment: E2E Real GitHub Issue-to-Run Validation

## Existing Relevant Modules

### github-adapter (packages/github-adapter/)
| Module | File | Status | Notes |
|--------|------|--------|-------|
| RealGitHubAdapter | src/real-adapter.ts | Fully implemented | DOES NOT formally `implements GitHubAdapter` — method-compatible but no interface contract |
| FakeGitHubAdapter | src/fake-adapter.ts | Fully implemented | Correctly `implements GitHubAdapter`; in-memory Maps |
| GitHubAdapter interface | src/adapter.ts | Defined | 8 methods: getRepository, listOpenIssues, getIssue, listIssueComments, createIssueComment, addIssueLabels, removeIssueLabel, claimIssue |
| GitHubStatusSyncService | src/sync-service.ts | Fully implemented | Accepts GitHubAdapter in constructor; 6 sync methods; dedup via markers |
| sync-templates | src/sync-templates.ts | Fully implemented | 10 functions: syncMarker, 6 renderSync*, truncateComment, renderEvidenceSection, renderLlmMetadataSection |
| label-lifecycle | src/label-lifecycle.ts | Fully implemented | 7 lifecycle phases mapped to add/remove label operations |
| sync-types | src/sync-types.ts | Fully implemented | EvidenceItem, SafeLlmRunMetadata, GitHubStatusSyncInput/Result |
| Legacy templates | src/templates.ts | Implemented | renderAccepted, renderStatusUpdate, renderBlocked, renderDone — used by claimIssue |
| Client factory | src/client.ts | Fully implemented | Octokit with retry+throttling+SafeLogger |
| Error classes | src/errors.ts | Fully implemented | 9 typed GitHub error classes with rate-limit detection |
| Issue polling | src/issues.ts | Fully implemented | Paginated, etag-aware, 304 support, PR-filtering |
| Label sync | src/labels.ts | Fully implemented | Idempotent diff-based sync with POSITRON_LABEL_PREFIX |
| Comments | src/comments.ts | Implemented | writeComment, commentMarker (legacy format) |

### sandbox (packages/sandbox/)
| Module | File | Status | Notes |
|--------|------|--------|-------|
| GitWorkspaceAdapter interface | src/adapter.ts | Defined | 6 methods |
| RealGitWorkspaceAdapter | src/real-adapter.ts | Fully implemented | clone-per-run, branch creation, fetch, status/diff parsing |
| FakeGitWorkspaceAdapter | src/fake-adapter.ts | Fully implemented | In-memory Maps with real dir creation |
| CommandRunner | src/command-runner.ts | Fully implemented | spawn-based, CommandPolicy, safe env, secret redaction |
| Path utilities | src/paths.ts | Fully implemented | Workspace path creation, validation, remote URL validation |
| TestCommandDetector | src/detector.ts | Fully implemented | package.json parsing, allowed/blocked/dangerous classification |
| TestRunner | src/test-runner.ts | Fully implemented | Command execution, report generation, artifact storage |
| Test templates | src/test-templates.ts | Fully implemented | Full and compact markdown renderers |

### shared (packages/shared/)
| Module | File | Status | Notes |
|--------|------|--------|-------|
| Types | src/types.ts | Defined | Phase, RunStatus, AutonomyLevel, PositronLabel, ALL_PHASES |
| Constants | src/constants.ts | Defined | POSITRON_LABEL_PREFIX, MAX_FIX_LOOPS, BRANCH_PREFIX, etc. |
| Interfaces | src/interfaces.ts | Defined | Repository, IssueRecord, RunRecord, RunEventRecord, ArtifactRecord, CommandResultRecord |
| Utilities | src/utils.ts | Fully implemented | generateBranchName, createSafeSlug, transliterateGermanUmlauts, redactSecrets, redactValue, createRunId |

### server (apps/server/)
| Module | File | Status | Notes |
|--------|------|--------|-------|
| Orchestrator | src/index.ts | Implemented | executePhase with 19-phase state machine, REST API, FakeAdapter by default |
| Test integration | src/__tests__/integration.test.ts | Implemented | Uses FakeGitHubAdapter; no live tests |

## Existing Live-Test Support

### Environment Variables Already Referenced
- `GITHUB_MODE` (default: `'fake'`): Controls whether `FakeGitHubAdapter` or `createRealGitHubAdapter()` is used
- `GITHUB_TOKEN`: Required by `createGitHubClient()` for real adapter
- `POSITRON_WORKSPACE_ROOT` (default: `~/.positron/workspaces`): Workspace base path
- In `docs/github-adapter.md`: `POSITRON_ENABLE_LIVE_GITHUB_TESTS=true` mentioned but **NOT IMPLEMENTED**

### What's Missing
- No `POSITRON_ENABLE_LIVE_GITHUB_TESTS` implementation
- No `POSITRON_LIVE_TEST_ALLOW_WRITE` implementation
- No `POSITRON_TEST_OWNER` / `POSITRON_TEST_REPO` configuration
- No `POSITRON_TEST_ISSUE_NUMBER` configuration
- No `POSITRON_LIVE_TEST_ALLOW_CREATE_ISSUE` configuration
- No live test files anywhere in the codebase
- No skip logic for conditional test execution
- No live-test marker system
- No live test RunId generation

## Existing GitHub Write Gates

### In RealGitHubAdapter
- Token required by `createGitHubClient()` — throws if unset
- Safe Logger redacts all Octokit log output
- Comment body validation (non-empty)
- Error mapping with redacted messages
- Rate limit detection in error handler

### In GitHubStatusSyncService
- Deduplication via `extractMarker()` — skips if same `runId+phase+kind` exists
- Comment truncation at 25,000 characters
- Secret redaction via `redactSecrets()` on all comment bodies
- Error redaction in result.reason

### NOT YET Implemented
- NO environment gate preventing write operations in normal test runs
- NO sandbox checks preventing access to non-test repositories
- NO issue ownership validation

## Existing Orchestrator Path

### Current Resolution
```typescript
function resolveAdapter(): GitHubAdapter {
  const mode = process.env.GITHUB_MODE || 'fake';
  return mode === 'real' ? createRealGitHubAdapter() : new FakeGitHubAdapter();
}
```

### Current Pipeline (relevant phases for E2E)
1. QUEUED → CLAIMED: transition only (no GitHub call)
2. CLAIMED → REPO_SYNC: `statusSyncService?.syncRunAccepted()` (fire-and-forget)
3. REPO_SYNC → ISSUE_CONTEXT: `workspaceAdapter.prepareWorkspace()`
4. ... (stub phases) ...
5. TEST → VERIFY: `TestCommandDetector.detect()` + `TestRunner.runDetectedCommands()` + `statusSyncService?.syncTestReport()`

### In TEST Phase
- Detector reads package.json from workspace
- Runner executes detected commands
- Report is synced to GitHub

## Required E2E Path

For live validation, the following flow must be tested:

```
Real GitHub Test Repo
→ Real Issue with positron:ready
→ Positron detects Issue (getIssue)
→ Positron claims Issue (claimIssue or syncRunAccepted)
→ positron:running label set, positron:ready removed
→ Accepted comment written with marker
→ Local workspace created (clone repo)
→ Branch positron/issue-<n>-<slug> created
→ Tests detected from package.json
→ Tests executed
→ TestReport generated
→ TestReport comment written with marker
→ DONE/FAILED/BLOCKED comment written with marker
→ Labels reflect final state (positron:done / positron:failed / positron:blocked)
→ Second run with same runId produces NO duplicate comments
```

## Missing Pieces

### Environment Gates (not implemented)
1. `POSITRON_ENABLE_LIVE_GITHUB_TESTS` — master enable gate
2. `POSITRON_LIVE_TEST_ALLOW_WRITE` — write operations gate
3. `POSITRON_TEST_OWNER` — target repository owner
4. `POSITRON_TEST_REPO` — target repository name
5. `POSITRON_TEST_ISSUE_NUMBER` — existing test issue number
6. `POSITRON_LIVE_TEST_ALLOW_CREATE_ISSUE` — optional create-issue gate
7. `POSITRON_LIVE_TEST_ALLOW_CLEANUP` — optional cleanup gate

### Live Test Infrastructure (not implemented)
1. LiveGitHubE2EConfig type + loader
2. shouldSkipLiveGitHubE2E validator
3. Live run ID generation (`live-e2e-<timestamp>-<random>`)
4. Live test markers in comments
5. Live test file structure
6. Vitest integration for conditional skip

### Test Scenarios (not implemented)
1. Safe skip without any env flags (must work in normal suite)
2. Read-only smoke test (env flags but no write flag)
3. Write E2E test (all flags including allowWrite)
4. Deduplication test (second run with same runId)
5. Secret redaction verification in live comments

### RealGitHubAdapter Gap
- `RealGitHubAdapter` does NOT `implements GitHubAdapter` — this may cause typing issues when using it with GitHubStatusSyncService

## Proposed Implementation Plan

### Phase 1: Infrastructure (normal tests, no GitHub access)
1. Create `LiveGitHubE2EConfig` type and `loadLiveGitHubE2EConfig()` function
2. Create `shouldSkipLiveGitHubE2E()` function
3. Write unit tests for config loading and skip logic
4. Ensure normal tests always skip

### Phase 2: Live Test Harness
5. Create live test file under `apps/server/src/__tests__/` or appropriate location
6. Implement read-only smoke test
7. Implement write E2E test (gated behind all flags)
8. Implement deduplication test
9. Implement unicode/umlaut test in comments

### Phase 3: Documentation
10. Create `docs/e2e-live-github.md` with runbook
11. Update `docs/github-adapter.md` with live test section
12. Create `docs/research/e2e-live-github-validation.md`

### Phase 4: Verification
13. Run normal test suite — all tests green
14. Run build — clean
15. Document results

## Test-First Plan

### Normal Tests (always run, no GitHub)
```typescript
// packages/shared or apps/server
describe('LiveGitHubE2EConfig', () => {
  it('loads config from environment variables')
  it('returns disabled=false when ENABLE_LIVE_GITHUB_TESTS not set')
  it('returns tokenPresent=false when GITHUB_TOKEN not set')
  it('returns allowWrite=false when ALLOW_WRITE not set')
  it('returns owner/repo from POSITRON_TEST_OWNER/REPO')
})

describe('shouldSkipLiveGitHubE2E', () => {
  it('returns skip reason when not enabled')
  it('returns skip reason when no token')
  it('returns skip reason when no owner/repo')
  it('returns skip reason when write requested but not allowed')
  it('returns null when all gates pass')
  it('returns skip reason when issue number missing but no create allowed')
})
```

### Live Tests (skip by default)
```typescript
// apps/server/src/__tests__/live-github-e2e.test.ts (vitest)
describe('Live GitHub E2E', () => {
  const config = loadLiveGitHubE2EConfig(process.env)
  const skipReason = shouldSkipLiveGitHubE2E(config)
  const runIf = skipReason ? it.skip : it

  runIf('read-only: gets issue details')
  runIf('read-only: lists comments')
  runIf('read-only: lists labels')

  // Only if allowWrite
  const writeConfig = { ...config, allowWrite: config.allowWrite }
  const writeSkip = shouldSkipLiveGitHubE2E(writeConfig)
  const runWriteIf = writeSkip ? it.skip : it

  runWriteIf('write: claims issue and sets running label')
  runWriteIf('write: removes positron:ready label')
  runWriteIf('write: writes accepted comment')
  runWriteIf('write: prepares workspace')
  runWriteIf('write: detects test commands')
  runWriteIf('write: runs tests and produces report')
  runWriteIf('write: syncs test report comment')
  runWriteIf('write: syncs done/failed/blocked comment')
  runWriteIf('write: deduplication prevents double comments')
})
```

## Acceptance Criteria Mapping

| Criterion | Component |
|-----------|-----------|
| Live-E2E-Testmodus existiert | LiveGitHubE2EConfig + loader |
| Live-Test-Gates implementiert | shouldSkipLiveGitHubE2E |
| Normale Tests skippen sicher | Unit tests for skip logic |
| Read-only Live-Test möglich | Smoke test with read-only gates |
| Write Live-Test explizit aktivierbar | E2E test with ALLOW_WRITE |
| E2E-Run dokumentiert | docs/e2e-live-github.md |
| Issue claiming validiert | RealGitHubAdapter.claimIssue or syncRunAccepted |
| Label-Sync validiert | syncManagedLabels / GitHubStatusSyncService |
| Kommentar-Schreiben validiert | syncRunAccepted + syncTestReport + syncDone |
| Deduplizierung validiert | Second run with same runId |
| Workspace-Erstellung validiert | RealGitWorkspaceAdapter.prepareWorkspace |
| TestRunner validiert | TestRunner.runDetectedCommands |
| TestReport-Kommentar validiert | syncTestReport comment inspection |
| Unicode/Umlaute validiert | German text in comment bodies |
| Secret-Redaction validiert | Fake API key in test data |
| Kein PR/Commit/Push | Scope control check |
| Dokumentation geschrieben | docs/e2e-live-github.md |
| Alle normalen Tests grün | npm test |
| Build grün | npm run build |
