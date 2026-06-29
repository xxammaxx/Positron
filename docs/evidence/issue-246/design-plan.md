# Issue #246 — Design Plan: GateType Layers Runtime Enforcement

## Timestamp
2026-06-29T07:28:00Z

## 1. GateType and Related Types

### Location: `packages/shared/src/types.ts`

```typescript
/** GateType — determines WHEN a gate is evaluated in the pipeline */
export type GateType =
  | 'pre_run'
  | 'pre_write'
  | 'pre_push'
  | 'pre_pr'
  | 'pre_merge'
  | 'evidence_required'
  | 'security'
  | 'human_approval';

/** Result of evaluating a single gate */
export interface GateResult {
  gateType: GateType;
  passed: boolean;
  message: string;
  blocking: boolean; // if true, transition MUST be blocked
  evidence?: Record<string, unknown>;
}

/** Result of evaluating all gates for a transition */
export interface GateLayerResult {
  allPassed: boolean;
  results: GateResult[];
  blockingFailures: GateResult[];
  warnings: GateResult[];
  summary: string;
}
```

### Location: `packages/shared/src/interfaces.ts`

```typescript
/** Context passed to gate evaluators */
export interface GateEvaluationContext {
  runId: string;
  phase: Phase;
  targetPhase: Phase;
  evidencePaths?: string[];
  requestId?: string;
}
```

## 2. Gate Evaluator Registry

### Location: `packages/run-state/src/gate-evaluator.ts` (new file)

```
GateEvaluatorFn = (context: GateEvaluationContext) => GateResult;

Registry:
- registerGateEvaluator(gateType: GateType, fn: GateEvaluatorFn): void
- clearGateEvaluators(): void (for tests)
- hasGateEvaluator(gateType: GateType): boolean

Behavior:
- Missing evaluator: NOT a pass — throws/blocks with "No evaluator registered for gate type X"
- Exception in evaluator: caught, converted to blocking GateResult
- Clear/reset for test isolation
```

**Design decision**: The registry is a module-level Map. Tests call `clearGateEvaluators()` in beforeEach. No global state leaks between test files.

**In fake/dry-run mode**: Fake evaluators must be EXPLICITLY registered. No implicit "fake pass" when evaluator is missing. This prevents tests from passing accidentally.

## 3. Gate Evaluation Function

### `evaluateGates()`

```
Input:
  - gateTypes: GateType[] — which gates to evaluate
  - context: GateEvaluationContext

Output: GateLayerResult

Algorithm:
1. For each gateType in gateTypes:
   a. Look up evaluator from registry
   b. If not found: create blocking GateResult with "missing evaluator"
   c. Call evaluator with context
   d. Catch exceptions → blocking GateResult
   e. Collect result
2. Aggregate:
   - allPassed = all results have passed === true
   - blockingFailures = results where blocked === true or passed === false
   - warnings = non-blocking failures
3. Return GateLayerResult
```

## 4. Gated Transition Function

### `tryTransitionWithGates()`

```
Input:
  - run: RunState
  - to: Phase
  - message: string
  - gateTypes: GateType[]
  - context: GateEvaluationContext
  - level: EventLevel (default: INFO)

Output: TransitionResult | GatedTransitionResult

Algorithm:
1. Call evaluateGates(gateTypes, context)
2. If allPassed === false:
   a. Security fail handling: if any security gate failed, this blocks regardless
      of human_approval status
   b. Human approval fail: transition to GATE_APPROVE or return blocked result
   c. Other fails: return blocked TransitionResult with gate info
3. If allPassed === true:
   a. Call transition(run, to, message, level)
   b. Return result

Critical invariant: Security gate failure CANNOT be overridden by human approval.
```

### `GatedTransitionResult` (extends TransitionResult)

```typescript
export interface GatedTransitionResult extends TransitionResult {
  gateResult: GateLayerResult;
}
```

## 5. Phase Gate Requirements Mapping

### `PHASE_GATE_REQUIREMENTS`

Based on the actual phases in VALID_TRANSITIONS and phase semantics:

| Phase/Target | Required GateTypes | Rationale |
|---|---|---|
| **COMMIT** | `pre_write` + `evidence_required` | Must gate file writes; must have evidence |
| **PR_CREATE** | `pre_pr` + `evidence_required` | Must gate PR creation; must have evidence |
| **MERGE** | `pre_merge` + `security` + `human_approval` | Must gate merge; must pass security; needs human |
| **DONE** | `evidence_required` | Must have evidence to complete |
| **FAILED_UNSAFE** | `security` | Unsafe failures must be security-gated |

**Not gated (raw transitions allowed):**
- QUEUED → CLAIMED (internal)
- CLAIMED → REPO_SYNC (internal)
- REPO_SYNC → ISSUE_CONTEXT (internal)
- ISSUE_CONTEXT → WEB_RESEARCH (internal)
- WEB_RESEARCH → SPECIFY (internal)
- SPECIFY → PLAN, CLARIFY_OPTIONAL (internal)
- PLAN → TASKS (internal)
- TASKS → ANALYZE (internal)
- ANALYZE → REVIEW (internal)
- REVIEW → IMPLEMENT (internal)
- IMPLEMENT → TEST (internal)
- TEST → VERIFY (internal)
- VERIFY → COMMIT (internal — gates apply AT COMMIT)
- CLEANUP (terminal)
- GATE_APPROVE → COMMIT, MERGE, DONE (after human approval)
- All FAILED transitions (terminal states)
- All retry transitions (retry from FAILED_TRANSIENT)

## 6. Server / Worker Integration

### Server (`apps/server/src/index.ts` — `executePhase()`)

Replace raw `transition()` calls at gated phases:
- `COMMIT` case: use `tryTransitionWithGates(current, 'PR_CREATE', ...)` with `pre_write` + `evidence_required` gates
- `PR_CREATE` case: use gated transition with `pre_pr` + `evidence_required`
- `MERGE` case: use gated transition with `pre_merge` + `security` + `human_approval`
- `DONE` phase (terminal sync): use gated transition with `evidence_required`

### Worker (`apps/worker/src/pipeline-runner.ts` — `executePhase()`)

Same integration pattern as server.

### Raw transitions preserved

All non-gated phases continue using raw `transition()`. This includes:
- Internal spec/plan/tasks/analyze/review transitions
- FAILED state creation (markFailed)
- Retry transitions
- GATE_APPROVE transitions

### Fake/Dry-Run Evaluators

Fake evaluators must be explicitly registered:
```typescript
// In fake mode setup
registerGateEvaluator('pre_write', () => ({
  gateType: 'pre_write',
  passed: true,
  message: 'Fake: pre_write gate passed',
  blocking: false,
}));
```

This is a separate concern from #308 Full Real Mode. Fake evaluators in this #246 implementation serve as explicit pass gates for the test/development environment.

## 7. Security Invariants

1. **Security gate failure cannot be overridden by human approval**: If a `security` gate fails, the transition is blocked regardless of `human_approval` passing.
2. **Missing evaluator blocks**: If no evaluator is registered for a required gate, the transition is blocked. No silent pass.
3. **Exception safety**: Evaluator exceptions are caught and converted to blocking failures. The pipeline does not crash.
4. **No bypass**: No `SKIP_GATES`, `bypassGate`, or `autoApprove` escape hatches.
5. **Evidence gating**: `evidence_required` gate must check for actual evidence artifacts, not just pass unconditionally.

## 8. Scope Boundaries

### IN SCOPE
- GateType, GateResult, GateLayerResult type definitions
- GateEvaluator registry (register/clear/has)
- evaluateGates() function
- tryTransitionWithGates() function
- PHASE_GATE_REQUIREMENTS mapping
- Server pipeline gate wiring (COMMIT, PR_CREATE, MERGE, DONE)
- Worker pipeline gate wiring (COMMIT, PR_CREATE, MERGE, DONE)
- Gate enforcement unit tests
- Evidence documents

### OUT OF SCOPE
- #308 Full Real Mode (no real mode env vars set, no real execution)
- UI changes (apps/web/*)
- Workflow changes (.github/workflows/*)
- CodeRabbit reactivation
- PR #255 merge/reactivation
- PR #218 modification
- PR chain #230-#242
- #245 rework (except compatibility)
- #244 rework (except compatibility)
- Dashboard/Provider/Oversight/Blueprint UI
- Manual CI trigger
- Merge

## Classification

**ISSUE_246_DESIGN_STATUS: GREEN_SAFE**

The design is well-scoped to the `packages/run-state/` module with minimal type additions to `packages/shared/`. Pipeline wiring touches two files in `apps/` but only at the transition points. All security invariants are clear. No #308 real mode. No UI. No workflow changes.
