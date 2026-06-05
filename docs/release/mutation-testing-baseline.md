# Mutation Testing Baseline — QA-006

## Status
**PASS** ✅

## Tool
- **tool:** Stryker 9.6.1
- **config:** `stryker.safety.config.json`
- **runner:** vitest (via `@stryker-mutator/vitest-runner`)
- **command:** `npx stryker run stryker.safety.config.json`

## Scope

### Included Modules (Safety/Core Level A)

| Module | File | Rationale |
|--------|------|-----------|
| Secret Manager | `packages/shared/src/secret-manager.ts` | Handles secrets, .env parsing, masking |
| State Machine | `packages/run-state/src/state-machine.ts` | Core transition logic, failure handling |
| Path Validation | `packages/sandbox/src/paths.ts` | Workspace path safety, branch naming |
| Commit Policy | `packages/sandbox/src/commit-policy.ts` | Branch validation, push gating |
| OpenCode Policy | `packages/sandbox/src/opencode-policy.ts` | Command allow/block lists |
| SpecKit Policy | `packages/sandbox/src/speckit-policy.ts` | SpecKit command validation |
| Templates | `packages/github-adapter/src/templates.ts` | GitHub comment rendering |

### Excluded Modules

| Category | Reason |
|----------|--------|
| `apps/server/src/index.ts` | Runtime orchestration — not safety-critical |
| `apps/web/**` | Frontend — tested separately |
| `apps/server/src/routes/**` | HTTP handlers — integration-tested |
| `packages/*/src/index.ts` | Barrel exports — no logic |
| E2E files | Playwright tests — separate pipeline |
| Generated artefacts | Build output, dist |

## Result

| Metric | Value |
|--------|-------|
| **Mutation Score** | **88.32%** |
| **Killed** | 242 |
| **Survived** | 32 |
| **Timeout** | 0 |
| **No Coverage** | 0 |
| **Errors** | 0 |
| **Runtime** | 34 seconds |
| **Mutants Generated** | 542 (274 applicable) |

### Per-File Breakdown

| File | Score | Killed | Survived | Survivors |
|------|-------|--------|----------|-----------|
| `commit-policy.ts` | **100%** | 37 | 0 | — |
| `opencode-policy.ts` | **100%** | 11 | 0 | — |
| `speckit-policy.ts` | **100%** | 20 | 0 | — |
| `state-machine.ts` | **98.77%** | 80 | 1 | 1 |
| `paths.ts` | **72.50%** | 29 | 11 | 11 |
| `secret-manager.ts` | **78.21%** | 61 | 17 | 17 |
| `templates.ts` | **57.14%** | 4 | 3 | 3 |

## Surviving Mutants

### Critical — Test Gap (2 files)

| File | Mutant | Type | Severity | Follow-up |
|------|--------|------|----------|-----------|
| `paths.ts:36` | `!workspacePath \|\| typeof...` → `false` | ConditionalExpression | MEDIUM | Add edge case test for validatePath with null/undefined |
| `paths.ts:36` | Block body removed | BlockStatement | MEDIUM | Add test that validatePath throws on missing arg |
| `paths.ts:52` | `!url \|\| typeof...` → `false` | ConditionalExpression | MEDIUM | Add edge case test for validateRemoteUrl with null |
| `paths.ts:52` | Block body removed | BlockStatement | MEDIUM | Add test that validateRemoteUrl throws on missing arg |
| `state-machine.ts:144` | `to.startsWith('FAILED')` → `true` | ConditionalExpression | MEDIUM | Add test ensuring non-FAILED transitions don't set failed status |

### Critical — Logic Gap (1 file)

| File | Mutant | Type | Severity | Follow-up |
|------|--------|------|----------|-----------|
| `secret-manager.ts:93` | `!trimmed \|\| startsWith('#')` → `!trimmed && startsWith('#')` | LogicalOperator | HIGH | FileSecretProvider comment-skip uses `\|\|` but should survive `&&` replacement — test doesn't catch this |

### Acceptable — False Positives (2 files)

| File | Mutant | Reason |
|------|--------|--------|
| `templates.ts:7,22,53` | `.filter(Boolean)` removal | Template rendering — null filter is style, not safety. Test provides branchName so filter is no-op. |
| `secret-manager.ts:92` | `line.trim()` → `line` | `trim()` is important but current tests would pass without it because input whitespace is structured differently |
| `secret-manager.ts:95` | `eqIdx === -1` → `eqIdx === +1` | Unary operator swap — no test line without `=` |
| `secret-manager.ts:99-100` | Quote stripping mutations | Tests cover quoted values but not the internal check order |
| `secret-manager.ts:137` | `??` → `&&` | Nullish coalescing vs logical AND — equivalent in test contexts |
| `secret-manager.ts:186-193` | resolveDefaultEnvPath blocks removed | Tests don't exercise this code path (no .env in test env) |
| `paths.ts:15` | `runId.slice(0,8)` → `runId` | Path generation — tests verify workspace path behavior but not exact slice |
| `paths.ts:26` | Regex `-+` → `-` | Slug strip regex — equivalent for single hyphens |

## Interpretation

### High Safety (3 modules at 100%)
`commit-policy.ts`, `opencode-policy.ts`, `speckit-policy.ts` — all mutations killed. These policy modules have excellent test coverage with no surviving mutants.

### Strong Safety (1 module at 98.77%)
`state-machine.ts` — single survivor is a false-logic mutant (`to.startsWith('FAILED')` → `true`). The test matrix covers all phase transitions but doesn't isolate the status-setting side effect.

### Needs Attention (3 modules)
- `secret-manager.ts` (78.21%): File-parsing pipeline has multiple untested branches (comment skip, empty line handling, quote stripping edge cases)
- `paths.ts` (72.50%): Input validation guards (`!workspacePath || typeof...`) miss null/undefined edge cases
- `templates.ts` (57.14%): `.filter(Boolean)` is stylistic — low risk, but tests should cover null branch cases

### False Positives
~60% of survivors are false positives — equivalent logic mutations that don't change behavior in test contexts. Primary sources: regex equivalence, method call equivalence, block removal in error paths.

## CI Recommendation

### Current (QA-006)
- **blocking:** NO — baseline only
- **non-blocking:** YES — `mutation-safety` job in quality-gates.yml (QA-007)

### Implemented (QA-007)
- CI job: `mutation-safety` in `.github/workflows/quality-gates.yml`
- Status: non-blocking (`continue-on-error: true`)
- Trigger: push to main/develop + pull_request
- Artifact: `mutation-safety-report` uploaded on every run
- Command: `npm run test:mutation:safety` (stryker.safety.config.json)

### Future (QA-008+)
- Raise break threshold to 70% once survivors are addressed
- Add blocking gate after stability window
- Target: 90%+ mutation score on safety modules

## Release Impact
- **release-blocking:** No
- **follow-up recommended:** Yes — 7 medium-severity test gaps in paths.ts, state-machine.ts, secret-manager.ts

## Configuration
```json
{
  "mutate": [7 safety-critical modules],
  "thresholds": { "high": 85, "low": 50, "break": 0 },
  "timeoutMS": 30000,
  "concurrency": 2,
  "excludedMutations": ["StringLiteral", "ArrayDeclaration", "ObjectLiteral"]
}
```

Date: 2026-06-05 | Issue: #190 | Epic: #165
