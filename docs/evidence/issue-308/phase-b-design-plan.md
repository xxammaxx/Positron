# Issue #308 Phase B — Design Plan: Fake/Dry-Run Gate Assembly Validation

**Generated:** 2026-06-29T09:00:00+02:00
**Mode:** FAKE/DRY-RUN GATE ASSEMBLY VALIDATION — NO Real Mode
**Approval:** `APPROVE ISSUE 308 PHASE B FAKE GATE ASSEMBLY ONLY`

---

## 1. Ziel

Ein Fake/Dry-Run Gate Assembly Test (`gate-assembly.test.ts`) beweist, dass die Safety-Layer gemeinsam funktionieren:

1. Run startet nur in Fake/Dry-Run
2. Real Mode bleibt blockiert
3. Stop/Ask blockiert riskante Aktionen oder routet zu GATE_APPROVE
4. GateType Evaluatoren werden explizit registriert
5. Missing Evaluator blockiert
6. Security-Fail kann nicht durch Human Approval überschrieben werden
7. Human Approval Failure routet zu GATE_APPROVE/Pause
8. requiresAuditLog blockiert Tool-Ausführung ohne Audit
9. Audit Failure blockiert Tool-Ausführung
10. Workspace wird gelockt und am Ende cleaned
11. Secret-artige Inhalte werden nicht in Evidence/Logs ausgegeben
12. Evidence wird erzeugt und referenziert
13. Kein echter GitHub-Write erfolgt
14. Kein echter PR erzeugt wird
15. Kein Merge möglich ist

---

## 2. Teststrategie

### 2.1 Test Location

**File:** `packages/run-state/src/__tests__/gate-assembly.test.ts`

**Rationale:**
- Package owns gate evaluator infrastructure
- Minimal dependencies
- Fast, isolated, no server startup
- Separates assembly tests from existing gate-enforcement.test.ts (634 lines)

### 2.2 Test Architecture

The test file is organized into three sections:

#### Section A: Positive Tests (Happy Path)
Exercise the full fake/dry-run pipeline with all gates passing.

#### Section B: Negative Tests (Safety Enforcement)
Verify each safety layer independently blocks when it should.

#### Section C: Edge Case Tests
Cover boundary conditions, interactions, and invariants.

### 2.3 Test Setup (beforeEach)

```typescript
beforeEach(() => {
    clearGateEvaluators();            // Clean state
    registerFakeGateEvaluators();     // All 8 PASS baseline
    // Selective override for negative tests:
    // registerGateEvaluator('security', failingSecurityEvaluator);
});
```

### 2.4 Test Cases

#### Positive Tests

| # | Test Name | What It Verifies |
|---|-----------|-----------------|
| P1 | `full fake gate assembly COMMIT → PR_CREATE → MERGE → DONE` | All 4 gated phases complete successfully with fake evaluators |
| P2 | `all 8 gate types are registered after registerFakeGateEvaluators` | Registration is complete and verifiable |
| P3 | `each gated phase evaluates correct gate types` | PHASE_GATE_REQUIREMENTS correctly mapped |
| P4 | `evidence paths are populated across transitions` | Evidence is created and referenceable |
| P5 | `fake workspace lifecycle works: lock → run → cleanup` | Workspace lock acquired, cleanup called on terminal |
| P6 | `gate results contain all required evaluator results` | GateLayerResult is complete and verifiable |

#### Negative Tests

| # | Test Name | What It Verifies |
|---|-----------|-----------------|
| N1 | `Real Mode blocked: HUMAN_APPROVED_REAL alone insufficient` | Both env vars required |
| N2 | `Real Mode blocked: POSITRON_ENABLE_REAL without human approval blocked` | Both env vars required |
| N3 | `Real Mode blocked: BLOCKED_BY_DEFAULT without any env vars` | Default is safe |
| N4 | `missing GateEvaluator blocks transition` | evaluateGates returns blocking failure for unregistered gate |
| N5 | `security gate fail cannot be overridden by Human Approval` | tryTransitionWithGates branch 2 (lines 265-285) |
| N6 | `human approval fail routes to GATE_APPROVE phase with blocked status` | tryTransitionWithGates branch 4 (lines 309-331) |
| N7 | `requiresAuditLog without onAudit blocks tool execution` | Gate 9 fail-closed: AUDIT_LOG_MISSING |
| N8 | `onAudit throwing blocks tool execution` | Gate 9: thrown error → BLOCKED |
| N9 | `workspace lock prevents concurrent access` | FakeGitWorkspaceAdapter.lockWorkspace |
| N10 | `secret-like strings are redacted from evidence` | redactValue via shared utils |

#### Edge Case Tests

| # | Test Name | What It Verifies |
|---|-----------|-----------------|
| E1 | `multiple gate failures accumulate in blockingFailures array` | All failures reported, not just first |
| E2 | `evaluator throwing is caught and reported as blocking failure` | Try/catch in evaluateGates |
| E3 | `clearGateEvaluators removes all evaluators` | gateEvaluatorCount() returns 0 |
| E4 | `registerGateEvaluator overwrites existing evaluator` | Re-registration works |
| E5 | `non-gated phases do not require gate evaluators` | PhaseRequiresGates returns false for internal phases |

### 2.5 What Is NOT Tested

- Real external tool execution (prohibited by scope)
- Real GitHub API writes (prohibited by scope)
- Real PR creation or merge (prohibited by scope)
- Server-level HTTP endpoint behavior (already covered by integration.test.ts)
- Stop/Ask Category A DENY patterns (already covered by stop-ask-policy.test.ts, 64 tests)
- Tool Gateway scanner behavior (already covered by scanner.test.ts, 17 tests)
- Red-team attacks on tool gateway (already covered by red/*.test.ts, 10 files)

---

## 3. Implementation Approach

### 3.1 New File: `packages/run-state/src/__tests__/gate-assembly.test.ts`

**~400-500 lines** of test code. No new production code.

**Dependencies (all existing):**
```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { createRun, RunStatus, Phase } from '../state-machine.js';
import { 
    registerFakeGateEvaluators,
    clearGateEvaluators,
    registerGateEvaluator,
    evaluateGates,
    tryTransitionWithGates,
    PHASE_GATE_REQUIREMENTS,
    gateEvaluatorCount,
    hasGateEvaluator,
} from '../gate-evaluator.js';
import type { GateType, GateResult } from '@positron/shared/types.js';
import type { GateEvaluationContext } from '@positron/shared/interfaces.js';
```

### 3.2 Test Helpers (inline)

```typescript
// Create a minimal valid RunState
function makeRun(phase: Phase = 'COMMIT'): RunState {
    return createRun('test-repo', 999, 2);
}

// Create a minimal valid GateEvaluationContext
function makeContext(
    runId: string,
    phase: Phase,
    targetPhase: Phase,
    evidencePaths?: string[]
): GateEvaluationContext {
    return {
        runId,
        phase,
        targetPhase,
        evidencePaths: evidencePaths ?? [],
        gateTypes: [...(PHASE_GATE_REQUIREMENTS[targetPhase] ?? [])],
    };
}

// Create a failing gate evaluator
function makeFailingEvaluator(
    gateType: GateType,
    message: string = `Test failure for ${gateType}`,
    blocking: boolean = true
): GateResult {
    return { gateType, passed: false, message, blocking };
}

// Create a passing gate evaluator
function makePassingEvaluator(gateType: GateType): GateResult {
    return { gateType, passed: true, message: `Test pass for ${gateType}`, blocking: false };
}
```

### 3.3 Gate Override Pattern for Negative Tests

```typescript
// Override specific gate to fail while keeping others passing
registerGateEvaluator('security', () => makeFailingEvaluator('security', 'Security check failed', true));

// Override human_approval to fail → should route to GATE_APPROVE
registerGateEvaluator('human_approval', () => makeFailingEvaluator('human_approval', 'Human approval required', true));
```

### 3.4 Audit Mock Pattern

```typescript
// For gateway-level Gate 9 tests, mock the onAudit callback:
const gateway = new GatewayService();
gateway.onAudit = async (call) => 'evidence-event-id-123';  // Success
gateway.onAudit = null;  // BLOCKED
gateway.onAudit = async () => { throw new Error('audit failed'); };  // BLOCKED
```

---

## 4. Scope Protection

### Explicitly ALLOWED

| Action | Detail |
|--------|--------|
| Create test file | `packages/run-state/src/__tests__/gate-assembly.test.ts` |
| Create evidence docs | `docs/evidence/issue-308/phase-b-*.md` |
| Use fake adapters | `FakeGitWorkspaceAdapter`, `FakeOpenCodeAdapter`, `FakeGitHubAdapter` |
| Use `registerFakeGateEvaluators()` | All 8 gate types as PASS baseline |
| Use `clearGateEvaluators()` | Test isolation |
| Use mock `onAudit` callback | GatewayService.onAudit property |
| Run vitest | `npx vitest run` (targeted + full) |
| Run local gates | `git diff --check`, `npm run build`, `npm run typecheck`, `npm test` |
| Create branch | `feat/issue-308-phase-b-fake-gate-assembly` |
| Commit + push | Evidence + test file |
| Create Draft PR | With structured body |
| Post comment on #308 | Completion comment only |

### Explicitly PROHIBITED

| Action | Status |
|--------|--------|
| Full Real Mode | ❌ BLOCKED |
| Set `HUMAN_APPROVED_REAL` | ❌ BLOCKED |
| Set `POSITRON_ENABLE_REAL` | ❌ BLOCKED |
| Real external tools | ❌ BLOCKED |
| Real GitHub writes | ❌ BLOCKED |
| Real PR via pipeline | ❌ BLOCKED |
| Merge to main | ❌ BLOCKED |
| Workflow changes | ❌ BLOCKED |
| Manual CI (`gh workflow run`) | ❌ BLOCKED |
| CodeRabbit reactivation | ❌ BLOCKED |
| Read secrets or `.env` | ❌ BLOCKED |
| Force push | ❌ BLOCKED |
| Branch deletion | ❌ BLOCKED |
| PR #218 modification | ❌ BLOCKED |
| PR #255 reactivation | ❌ BLOCKED |
| PR chain #230-#242 | ❌ BLOCKED |
| Modify `apps/web/` | ❌ BLOCKED |
| Modify `.github/workflows/` | ❌ BLOCKED |
| Network dependency in tests | ❌ BLOCKED |
| Production repo usage | ❌ BLOCKED |

---

## 5. Expected Outcomes

### If All Tests Pass
- Phase B validated: fake/dry-run gate assembly works
- Ready for Phase C Readiness Recheck
- No new production code needed
- Evidence complete and verifiable

### If Tests Fail
- Diagnose root cause (test error vs real gap)
- Document findings in evidence
- Classify as `PASSED_WITH_LIMITATIONS` or `FAILED`
- Report to owner via Draft PR + Issue #308 comment

---

## Classification

```text
ISSUE_308_PHASE_B_DESIGN_STATUS: GREEN_SAFE
```

**Justification:**
- All infrastructure exists — no new production code needed
- Test location is dependency-minimal (`packages/run-state`)
- All 15 test scenarios are testable with existing primitives
- Scope is purely fake/dry-run — no Real Mode, no external tools, no network
- All prohibited actions are explicitly blocked
- Test file and evidence docs are the only new files
- `registerFakeGateEvaluators()` provides PASS baseline for happy path
- Selective override via `registerGateEvaluator()` enables all negative tests
- Mock `onAudit` callback is fully supported by GatewayService interface
- No server startup, no HTTP layer, no CI triggers

**Design is GREEN_SAFE. Implementation can proceed.**
