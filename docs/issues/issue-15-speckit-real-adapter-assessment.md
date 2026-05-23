# Issue #15: Spec Kit Real Adapter — Initial Assessment

## Existing Spec Kit Adapter/Stub

**File:** `packages/speckit-adapter/src/index.ts` (4 lines)

Three stub functions returning hardcoded strings:
```ts
export function runSpecify(): string { return '# Spec\nGenerated spec content.'; }
export function runPlan(): string { return '# Plan\nGenerated plan content.'; }
export function runTasks(): string { return '# Tasks\n- [ ] Task 1\n- [ ] Task 2'; }
```

Key observations:
- No parameters (no runId, workspacePath, issue context)
- Return values are DISCARDED by the orchestrator (line 168-177 of `apps/server/src/index.ts`)
- No TypeScript interface — functions are imported directly
- No DI pattern — hardcoded imports in orchestrator
- 5 of 8 planned functions are missing: `runConstitution`, `runClarify`, `runChecklist`, `runAnalyze`, `runReview`
- No tests exist — the `dist/__tests__/smoke.test.js` is an orphan compiled artifact referencing a non-existent `SPECKIT_ADAPTER_VERSION` export
- No artifact persistence — results are never stored or logged

## Existing Orchestrator Integration Points

**File:** `apps/server/src/index.ts`

The orchestrator's `executePhase()` switch statement (line 167-180):

```ts
case 'SPECIFY':
    runSpecify();  // stub call, return value discarded
    result = transition(current, 'PLAN', 'Spec generated');
    break;
case 'PLAN':
    runPlan();  // stub call, return value discarded
    result = transition(current, 'TASKS', 'Plan generated');
    break;
case 'TASKS':
    runTasks();  // stub call, return value discarded
    result = transition(current, 'ANALYZE', 'Tasks generated');
    break;
case 'ANALYZE':
    result = transition(current, 'REVIEW', 'Analysis complete');  // NO adapter call
    break;
```

Integration gaps:
- No `CLARIFY_OPTIONAL` phase integration (state machine supports it, orchestrator skips it)
- No `IMPLEMENT` phase uses Spec Kit (it calls `executeTasks()` from OpenCode adapter)
- The `REVIEW` phase has no Spec Kit call (`runReview` doesn't exist)
- No workspace path is passed to adapter functions
- No error handling for adapter failures — phases always succeed
- No artifact tracking from Spec Kit phases

## Existing Command Execution Infrastructure

**File:** `packages/sandbox/src/command-runner.ts` (144 lines)

`runCommand(command, args, cwd, options)`:
- Uses `spawn()` from `node:child_process` with `shell: false`
- Secret redaction via `redactSecrets()` on every stdout/stderr chunk
- Timeout: 60s default, configurable via `RunCommandOptions.timeoutMs`
- Max buffer: 1MB default
- Safe env: only PATH, HOME, GIT_TERMINAL_PROMPT, GCM_INTERACTIVE

`CommandPolicy` (inline in `validateCommand()`):
- **Allowed commands:** git, git-lfs, npm, npx, node
- **Allowed git subcommands:** clone, fetch, status, diff, branch, switch, checkout, rev-parse, remote, worktree, log, symbolic-ref, config, init, add, restore
- **Forbidden git subcommands:** push, commit, reset, clean, merge, rebase
- **Shell metacharacter blocking:** rejects args containing `;|&\`$#!<>~`
- **CWD validation:** must exist and be a directory

Gaps for Spec Kit:
- `specify` is NOT in the allowed commands list
- No subcommand validation for `specify`
- The `validateCommand()` function is private — cannot be extended from outside
- The `CommandResult` interface returns stdout/stderr as strings (not file paths)

## Existing Artifact Infrastructure

**Database schema** (`packages/run-state/src/db/schema.ts`):
- `artifacts` table: id, run_id, kind, path, sha256, created_at

**Shared interface** (`packages/shared/src/interfaces.ts`):
```ts
export interface ArtifactRecord {
  id: string; runId: string; kind: string; path: string;
  sha256: string | null; createdAt: string;
}
```

Gaps:
- No dedicated `ArtifactService` class — persistence is distributed
- No artifact-kind constants or enum — `kind` is `string`
- No artifact detection/scanning logic
- No sha256 computation utility for files
- The orchestrator's `buildEvidence()` only reports phase and branch, not artifacts

## Existing Security Utilities

**File:** `packages/shared/src/utils.ts`

`redactSecrets()` — 7 built-in rules:
1. `gh[pousr]_[A-Za-z0-9_]{20,}` → `[REDACTED_GITHUB_TOKEN]`
2. `github_pat_[A-Za-z0-9_]{20,}` → `[REDACTED_GITHUB_PAT]`
3. `Bearer <token>` → `Bearer [REDACTED]`
4. `sk-[A-Za-z0-9]{32,}` → `[REDACTED_OPENAI_KEY]`
5. `anthropic_[A-Za-z0-9]{20,}` → `[REDACTED_ANTHROPIC_KEY]`
6. `gemini_[A-Za-z0-9]{20,}` → `[REDACTED_GEMINI_KEY]`
7. `api[_-]?key|token|secret\s*[:=]\s*\S+` → `$1=[REDACTED]`

`redactValue()` — handles objects, Errors, undefined, symbols, circular references

These are already integrated into `runCommand()` in the sandbox package.

## Spec Kit Phases Currently Represented

| Phase | Adapter Function | Orchestrator Integration | Status |
|-------|-----------------|------------------------|--------|
| Constitution | MISSING | N/A | Not implemented |
| Specify | `runSpecify()` (stub) | SPECIFY → PLAN | Stub, return value discarded |
| Clarify | MISSING | CLARIFY_OPTIONAL skipped | Not implemented |
| Plan | `runPlan()` (stub) | PLAN → TASKS | Stub, return value discarded |
| Tasks | `runTasks()` (stub) | TASKS → ANALYZE | Stub, return value discarded |
| Analyze | MISSING | ANALYZE (no-op) | Phase exists but empty |
| Checklist | MISSING | N/A | Not implemented |
| Review | MISSING | N/A | Not implemented |

## Live E2E Caveat from Issue #13

Issue #13 was completed with PARTIAL status:
- Repository configuration centralized (POSITRON_REPO_OWNER/NAME)
- Live E2E gates hardened
- Live marker for GitHub sync comments added
- **NOT completed:** Live GitHub E2E was not executed against a real test repository

Consequence for Issue #15:
- The Spec Kit Real Adapter must NOT be marked as production-ready
- Real Spec Kit tests require `POSITRON_ENABLE_REAL_SPECKIT_TESTS=true`
- Default tests use Fake CLI
- Production mode defaults to `detect-only`

## Missing Pieces

1. **SpecKitAdapter interface** — no TypeScript contract exists
2. **RealSpecKitAdapter class** — needs CLI detection, safe execution, artifact scanning
3. **SpecKitCommandPolicy** — needs extension of sandbox CommandPolicy for `specify`
4. **SpecKit-specific error classes** — SpecKitNotInstalledError, etc.
5. **Artifact detection/scanner** — walk workspace for .specify/ and specs/ artifacts
6. **Artifact mapping** — convert SpecKitArtifactRef to Positron ArtifactRecord
7. **Orchestrator DI** — inject adapter instead of hardcoded import
8. **FakeSpecKitAdapter** — for testing without real CLI
9. **Unit tests** — adapter, policy, artifact detection
10. **Integration tests** — fake CLI scenarios
11. **Documentation** — adapter architecture, modes, limitations

## Proposed Implementation Plan

### Phase 1: Interfaces & Types (packages/shared/)
- Define `SpecKitAdapter` interface
- Define `SpecKitPhase`, `SpecKitHealth`, `SpecKitCommandResult`, `SpecKitArtifactRef`, `SpecKitRunInput`
- Define `SpecKitCommandStatus`
- Add to shared barrel export

### Phase 2: Command Policy (packages/sandbox/)
- Refactor `validateCommand` to be extensible
- Add `SpecKitCommandPolicy` with allow/block lists
- Export `isAllowedSpecKitCommand()`, `ALLOWED_SPECKIT_COMMANDS`
- Add `specify` to allowed commands (controlled via policy)

### Phase 3: RealSpecKitAdapter (packages/speckit-adapter/)
- Implement `RealSpecKitAdapter` class
- Implement `healthCheck()` — detect `specify` in PATH, run `specify version`
- Implement `initialize()` — run `specify init` if safe
- Implement `detectArtifacts()` — scan for constitution, specs, plans, tasks, etc.
- Implement `runSpecify()`, `runPlan()`, `runTasks()`, `runAnalyze()` with honest blocking for slash commands
- Secret redaction on all output
- Exit-code / timeout handling

### Phase 4: FakeSpecKitAdapter (packages/speckit-adapter/)
- Implement `FakeSpecKitAdapter` for testing
- Configurable health status, artifacts, command results
- Test helpers for mocking CLI behavior

### Phase 5: Artifact Detection & Mapping
- `scanWorkspace(workspacePath)` → `SpecKitArtifactRef[]`
- Path traversal prevention (no symlink escape)
- UTF-8 reading with umlaut preservation
- sha256 computation using `node:crypto`
- Mapping to `ArtifactRecord` format

### Phase 6: Orchestrator Integration (apps/server/)
- Inject `SpecKitAdapter` (real or fake) via `ServerOptions`
- Wire into SPECIFY, PLAN, TASKS, ANALYZE phases
- Handle BLOCKED/SKIPPED status gracefully
- Store artifacts and command results
- Post phase status to GitHub sync

### Phase 7: Tests
- Unit tests for RealSpecKitAdapter
- Unit tests for SpecKitCommandPolicy
- Unit tests for artifact detection
- Integration tests with Fake CLI binary
- Secret redaction tests
- UTF-8/umlaut preservation tests
- Path safety tests

### Phase 8: Documentation
- `docs/speckit-real-adapter.md` — architecture, modes, limitations
- Update changelog
- Update LLM usage inventory if needed

## Test-First Plan

1. Write `SpecKitCommandPolicy` tests first (allow version/check/init, block dangerous)
2. Write `healthCheck` tests (available=true with fake CLI, available=false without)
3. Write `detectArtifacts` tests (finds all artifact types, blocks path traversal)
4. Write `initialize` tests (success with fake CLI, blocked without)
5. Write `runSpecify`/`runPlan`/`runTasks` tests (blocked — slash commands not CLI)
6. Write secret redaction tests
7. Write integration tests with temporary workspace and fake `specify` script
8. Write UTF-8/umlaut preservation tests
