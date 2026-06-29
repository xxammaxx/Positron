# Issue #332 — GATE_APPROVE Server Runtime Wiring Evidence

## Reality Refresh

| Feld | Erwartet | Aktuell | Status |
|------|----------|---------|--------|
| Issue #332 | OPEN | OPEN | ✅ |
| PR #218 | MERGED | MERGED (676dd2c) | ✅ |
| Issue #215 | CLOSED | CLOSED | ✅ |
| Issue #308 | OPEN | OPEN | ✅ |
| Working tree | clean | clean | ✅ |
| Branch | main | main | ✅ |
| HEAD == origin/main | equal | 66f326d == 66f326d | ✅ |
| Build host | Linux Mint | Linux Mint 22.1 | ✅ |
| Open PRs | none | none | ✅ |

## Scope

### In Scope (implemented)
- Added `GATE_APPROVE` case to server `executePhase()` in `apps/server/src/index.ts`
- Extracted narrow adapter `handleGateApprove()` into `apps/server/src/gate-approve-handler.ts` for testability
- `handleGateApprove()` calls `gateApproveAction()` from `@positron/sandbox`
- Routes all 6 Stop/Ask decision outcomes to state machine transitions
- Added `buildPipelineAction()` helper that creates meaningful action descriptions for policy evaluation
- Added 25 targeted tests in `apps/server/src/__tests__/gate-approve-handler.test.ts`
- Fake mode default preserved — no real gate evaluators registered

### Out of Scope (not touched)
- No Real Mode execution
- No Phase-D probe
- Issue #308 not closed
- Issue #215 not reopened
- Issue #332 not closed
- No merge performed
- No broad refactor
- No Issue #244 / #246 / #325 work

## Code Changes

### Files Added
- `apps/server/src/gate-approve-handler.ts` — Extracted handler with `handleGateApprove()` and `buildPipelineAction()`
- `apps/server/src/__tests__/gate-approve-handler.test.ts` — 25 targeted tests
- `docs/evidence/issue-332/gate-approve-server-wiring-report.md` — This report

### Files Modified
- `apps/server/src/index.ts` — Added `GATE_APPROVE` case to `executePhase()`

## Safety Behavior

| Outcome | Server behavior | Evidence |
|---------|----------------|----------|
| ALLOW | Transition to MERGE with GATE-level audit event | Test: "commit action in TEST repo resolves to ALLOW → MERGE" ✅ |
| DENY | Transition to FAILED_BLOCKED, preserves reason/evidence | Test: "merge to main branch is denied (Category A)" ✅ |
| ASK_HUMAN | Stays in GATE_APPROVE (STAY), emits HUMAN-level event | Test: "PRODUCTION repo forces review for any action" ✅ |
| REQUIRE_DRY_RUN | Stays in GATE_APPROVE (STAY), preserves requirement | Test: "database migration triggers REQUIRE_DRY_RUN → STAY" ✅ |
| REQUIRE_BACKUP | Stays in GATE_APPROVE (STAY), preserves requirement | Structural: handler routes all 6 outcomes ✅ |
| REQUIRE_REVIEW | Stays in GATE_APPROVE (STAY), preserves requirement | Test: "feature branch merge triggers REQUIRE_REVIEW → STAY" ✅ |

### Fail-Closed Invariants Verified
- Non-ALLOW never proceeds to COMMIT/MERGE ✅
- Exception / missing input → FAILED_BLOCKED ✅
- Existing Gate 9 / onAudit behavior unaffected ✅
- Handler does not mutate input RunState ✅
- Unknown/unexpected decision → FAILED_BLOCKED ✅
- PRODUCTION/CRITICAL repo risk forces review ✅
- TEST repo risk allows harmless actions ✅

## Tests

| Gate | Command | Exit | Result |
|------|---------|------|--------|
| Whitespace | `git diff --check` | 0 | ✅ clean |
| Build | `npm run build` | 0 | ✅ |
| Typecheck | `npm run typecheck` | 0 | ✅ all projects up to date |
| Root tests | `npm test` | 0 | ✅ 196 passed (8 files) |
| Gate assembly | `npx vitest run gate-assembly.test.ts` | 0 | ✅ 43 passed |
| Gate approve (sandbox) | `npx vitest run packages/sandbox/src/__tests__/gate-approve.test.ts` | 0 | ✅ 33 passed |
| Stop-ask policy (sandbox) | `npx vitest run packages/sandbox/src/__tests__/stop-ask-policy.test.ts` | 0 | ✅ 64 passed |
| Server integration | `npx vitest run apps/server/src/__tests__/integration.test.ts` | 0 | ✅ 8 passed |
| Handler tests (new) | `npx vitest run apps/server/src/__tests__/gate-approve-handler.test.ts` | 0 | ✅ 25 passed |

### Test Summary
- Total test files: 10
- Total tests: 369 passed
- New tests added: 25 (gate-approve-handler.test.ts)
- Existing tests preserved: 344

## Design Decision Manifest

### GREEN_SAFE
- `gateApproveAction()` imported from sandbox (already tested: 33 tests)
- Server already imports from `@positron/sandbox`
- `tryTransitionWithGates` already routes to GATE_APPROVE on human_approval failure
- No circular dependency risk — handler is a leaf module
- `buildPipelineAction()` creates Stop/Ask-compatible action descriptions from pipeline context
- Gate boilerplate stripping prevents false policy matches (e.g., "MERGE" phase name vs. actual merge action)

### YELLOW_VALIDATE
- GATE_APPROVE phase is never reached in current fake-mode pipeline (fake evaluators always pass)
- Handler is callable but unexercised in normal flow — tested only through unit tests
- Action descriptions are synthetic (built from pipeline context) — may need refinement for Real Mode

### RED_BLOCK
- No Real Mode execution
- No Phase-D probe
- No MERGE
- No Issue #308 closure

### Chosen Minimal Design
1. Extracted `handleGateApprove()` adapter for isolated testability
2. Added `buildPipelineAction()` helper that creates policy-evaluable action descriptions
3. Server `executePhase()` uses dynamic import of handler (no new static dependencies)
4. All 6 outcomes routed: ALLOW→MERGE, DENY→FAILED_BLOCKED, others→STAY (GATE_APPROVE)

### Explicit Non-Goals
- No Real Mode
- No Phase-D probe
- No Issue #308 closure
- No broad refactor
- No merge

## Boundaries

- ✅ No Real Mode executed
- ✅ No Phase-D probe executed
- ✅ Issue #308 not closed
- ✅ Issue #215 not reopened
- ✅ Issue #332 not closed
- ✅ No merge performed
- ✅ No secrets exposed
- ✅ No remote CI triggered
- ✅ Fake Mode default preserved
- ✅ Existing Gate 9 / onAudit behavior untouched

## Risks

| Risk | Status | Recommendation |
|------|--------|----------------|
| GATE_APPROVE unreachable in Fake Mode | Mitigated | Handler tested in isolation; pipeline flow verified structurally |
| Synthetic action descriptions may miss edge cases | Acknowledged | `buildPipelineAction` covers MERGE/COMMIT/PR_CREATE; extensible |
| Dynamic import in hot path | Minimal | Handler import is awaited once per GATE_APPROVE phase; minimal overhead |

## What Positron Can Do After This PR

- Server `executePhase()` now handles `GATE_APPROVE` phase
- `gateApproveAction()` is callable from server runtime
- All 6 Stop/Ask decision outcomes are correctly routed
- When Real Mode gate evaluators are activated (Issue #308), the GATE_APPROVE handler will process blocked transitions through the Stop/Ask policy

## Owner Next Step

```
APPROVE MERGE PR <number> AFTER FINAL AUDIT FOR ISSUE #332
APPROVE CLOSE ISSUE #332 AS COMPLETED AFTER MERGE
```
