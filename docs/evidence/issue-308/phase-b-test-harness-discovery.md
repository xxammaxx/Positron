# Issue #308 Phase B — Test Harness Discovery

**Generated:** 2026-06-29T09:00:00+02:00
**Mode:** FAKE/DRY-RUN GATE ASSEMBLY VALIDATION — NO Real Mode

---

## Packages Scanned

| Package | Source Files | Test Files | Test Count (approx) |
|---------|-------------|-----------|---------------------|
| `packages/run-state/src/` | `gate-evaluator.ts`, `state-machine.ts` | 5 | 95 |
| `packages/tool-gateway/src/` | `gateway.ts`, `types.ts`, `scanner.ts` | 16 | 174 |
| `packages/sandbox/src/` | `fake-adapter.ts`, `gate-approve.ts`, `stop-ask-policy.ts` | 8 | 204 |
| `packages/benchmark-rudolph/src/` | `controlled-real-probe.ts`, `benchmark-runner.ts`, `evidence-contract.ts` | 7 | 151 |
| `packages/shared/src/` | `types.ts`, `interfaces.ts`, `local-gate-runner.ts` | 17 | 412 |
| `apps/server/src/` | `index.ts` (pipeline) | 1 (integration.test.ts) | 10 |

---

## Key Components Discovered

### Fake Adapters

| Adapter | File | Lines | Key Features |
|---------|------|-------|-------------|
| `FakeGitWorkspaceAdapter` | `packages/sandbox/src/fake-adapter.ts` | 230 | workspace lifecycle (dirty simulation, commit, push, destroy, lock/unlock) |
| `FakeOpenCodeAdapter` | `packages/opencode-adapter/src/fake-adapter.ts` | 113 | health control, fail-command mode, custom results, call logging |
| `FakeGitHubAdapter` | `packages/github-adapter/src/fake-adapter.ts` | 238 | repo/issue store, PR idempotency, merge simulation, label management |

### Gate Evaluator Infrastructure

| Component | File | Lines | Purpose |
|-----------|------|-------|---------|
| `GateType` (union type) | `packages/shared/src/types.ts` | 189-197 | 8 gate types |
| `ALL_GATE_TYPES` | `packages/shared/src/types.ts` | 200-209 | Canonical array |
| `GateEvaluatorFn` | `packages/run-state/src/gate-evaluator.ts` | 34 | Evaluator function type |
| `GateEvaluationContext` | `packages/shared/src/interfaces.ts` | 375-387 | Context interface |
| `GateResult` | `packages/shared/src/types.ts` | 212-219 | Result type |
| `GateLayerResult` | `packages/shared/src/types.ts` | 221-229 | Layer result type |
| `evaluateGates()` | `packages/run-state/src/gate-evaluator.ts` | 80-136 | Iterates evaluators, missing → blocking failure |
| `tryTransitionWithGates()` | `packages/run-state/src/gate-evaluator.ts` | 228-358 | 6 security invariant branches |
| `PHASE_GATE_REQUIREMENTS` | `packages/run-state/src/gate-evaluator.ts` | 148-157 | COMMIT, PR_CREATE, MERGE, DONE mappings |
| `registerFakeGateEvaluators()` | `packages/run-state/src/gate-evaluator.ts` | 184-200 | All 8 gate types → PASS |
| `clearGateEvaluators()` | `packages/run-state/src/gate-evaluator.ts` | — | Test isolation |
| `registerGateEvaluator()` | `packages/run-state/src/gate-evaluator.ts` | — | Programmatic registration |
| `hasGateEvaluator()` | `packages/run-state/src/gate-evaluator.ts` | — | Existence check |
| `gateEvaluatorCount()` | `packages/run-state/src/gate-evaluator.ts` | — | Count check |
| `getRequiredGates()` | `packages/run-state/src/gate-evaluator.ts` | 163 | Helper |
| `phaseRequiresGates()` | `packages/run-state/src/gate-evaluator.ts` | 171 | Helper |

### Audit Enforcement

| Component | File | Lines | Purpose |
|-----------|------|-------|---------|
| `requiresAuditLog` property | `packages/tool-gateway/src/types.ts` | 77-78 | Per-tool opt-in |
| `AUDIT_LOG_MISSING` | `packages/tool-gateway/src/types.ts` | 178 | Block reason |
| Gate 9: fail-closed | `packages/tool-gateway/src/gateway.ts` | 161-184 | Missing or throwing `onAudit` → BLOCKED |
| `onAudit` callback | `packages/tool-gateway/src/gateway.ts` | — | Nullable, set in tests |
| Scanner advisory | `packages/tool-gateway/src/scanner.ts` | 193-201 | Warns on missing `requiresAuditLog` |

### Workspace Lifecycle

| Component | File | Lines | Purpose |
|-----------|------|-------|---------|
| `destroyWorkspace()` | Both adapters | — | Idempotent cleanup with validation |
| `lockWorkspace()` | Both adapters | — | Ownership-tracked locking |
| `unlockWorkspace()` | Both adapters | — | Ownership-validated unlock |
| `isLocked()` | Both adapters | — | Lock state query |
| `runCleanup()` | `packages/run-state/src/state-machine.ts` | 213-226 | Terminal phase sink |
| `registerWorkspaceCleanup()` | `packages/run-state/src/state-machine.ts` | 186 | Registration function |
| `WorkspaceCleanupFn` | `packages/run-state/src/state-machine.ts` | 186 | Type definition |

### Dry-Run / Real-Mode Controls

| Component | File | Lines | Purpose |
|-----------|------|-------|---------|
| `checkApprovalGates()` | `packages/benchmark-rudolph/src/controlled-real-probe.ts` | 52-127 | 5 env vars, dual-gate system |
| `runControlledRealModeProbe()` | `packages/benchmark-rudolph/src/controlled-real-probe.ts` | 179-339 | 6-step probe |
| `DEFAULT_BLOCKED_PATTERNS` | `packages/opencode-adapter/src/dry-run-agent.ts` | — | 16 blocked write operations |
| `DEFAULT_SIMULATED_PATTERNS` | `packages/opencode-adapter/src/dry-run-agent.ts` | — | 10 simulated read operations |
| `POSITRON_ENABLE_REAL` check | Multiple files | — | Required for real mode |
| `HUMAN_APPROVED_REAL` check | Multiple files | — | Required for real mode |

---

## Existing Test Fixtures

**No dedicated fixture directories exist.** No `__tests__/fixtures/` in any package. No `test-utils/` or `test-helpers/` directories.

### Reusable Test Infrastructure

| Resource | Source | Reusability |
|----------|--------|-------------|
| `makeRun()` helper | `gate-enforcement.test.ts:42` | Creates minimal RunState — reusable pattern |
| `makeContext()` helper | `gate-enforcement.test.ts:47-49` | Creates minimal GateEvaluationContext — reusable pattern |
| `FakeGitWorkspaceAdapter` | `packages/sandbox/src/fake-adapter.ts` | Ready to instantiate in any test |
| `FakeGitHubAdapter` | `packages/github-adapter/src/fake-adapter.ts` | In-memory store, pre-populate |
| `createRun()` | `packages/run-state/src/state-machine.ts` | Creates valid RunState with unique IDs |
| `registerFakeGateEvaluators()` | `packages/run-state/src/gate-evaluator.ts` | All 8 PASS — use as baseline, override selectively |
| `clearGateEvaluators()` | `packages/run-state/src/gate-evaluator.ts` | Test isolation in beforeEach |

---

## Best Location for Phase B Test

### Recommendation: `packages/run-state/src/__tests__/gate-assembly.test.ts`

**Rationale:**
1. `packages/run-state` owns the gate evaluator infrastructure
2. Minimal dependencies (only `@positron/shared` for types)
3. Existing `gate-enforcement.test.ts` is already 634 lines — separate file for assembly tests
4. `vitest` already configured as devDependency
5. All gate primitives (`tryTransitionWithGates`, `evaluateGates`, `registerFakeGateEvaluators`) are directly importable
6. No server startup required — tests run fast and isolated

### Alternative: `apps/server/src/__tests__/` for HTTP-level E2E

**Not recommended for Phase B** because:
- Requires server startup overhead
- Couples test to HTTP layer unnecessarily
- Gate assembly validation can be done purely at the state machine level
- HTTP-level E2E already covered by `integration.test.ts`

---

## Production Code Requirements Assessment

### New Production Code Needed? **NO**

All infrastructure exists:
- ✅ `registerFakeGateEvaluators()` — registers all 8 gate types as PASS
- ✅ `clearGateEvaluators()` — test isolation
- ✅ `registerGateEvaluator()` — granular override for negative tests
- ✅ `tryTransitionWithGates()` — all 6 security branches
- ✅ `PHASE_GATE_REQUIREMENTS` — all 4 gated phases
- ✅ `createRun()` — valid RunState creation
- ✅ Fake adapters — all three ready to instantiate
- ✅ `GatewayService.onAudit` — mockable callback

### Small Test Helper Needed? **POSSIBLY**

A small test helper to:
1. Combine `registerFakeGateEvaluators()` + `createRun()` into a reusable setup
2. Create a mock `GateEvaluationContext` with evidence paths
3. Assert on `GatedTransitionResult` structure

Could be inline in the test file or extracted to a tiny helper.

### Mock `onAudit` for Phase B? **MOCKABLE**

The `onAudit` property on `GatewayService` can be set to any async function. No server wiring needed. Can test:
- `onAudit = async () => 'evidence-id-123'` → PASS
- `onAudit = null` → BLOCKED (AUDIT_LOG_MISSING)
- `onAudit = async () => { throw new Error('fail') }` → BLOCKED

---

## Classification

```text
ISSUE_308_PHASE_B_TEST_HARNESS_STATUS: READY
```

**Justification:** All components for a comprehensive gate assembly test exist. Fake adapters are complete. Gate evaluator infrastructure is complete with registration, evaluation, and transition primitives. Test isolation utilities (`clearGateEvaluators`) are present. The recommendation location (`packages/run-state/src/__tests__/gate-assembly.test.ts`) is dependency-minimal and aligned with existing test organization. No new production code is required. A small inline test helper may be useful but is optional. Mock `onAudit` is fully supported by the existing `GatewayService` callback interface.
