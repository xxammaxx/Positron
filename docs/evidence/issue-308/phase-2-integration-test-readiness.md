# Issue #308 Phase 2 — Integration Test Readiness

**Generated:** 2026-06-29T08:15:00+02:00
**Mode:** READ-ONLY RECHECK — NO Real Mode

---

## Can we test gate assembly WITHOUT Full Real Mode?

**YES.** The codebase has extensive infrastructure for fake/dry-run testing.

## Existing Test Infrastructure

### Fake Adapters

| Adapter | File | Purpose |
|---------|------|---------|
| FakeGitWorkspaceAdapter | `packages/sandbox/src/fake-adapter.ts` | Simulated workspace operations |
| FakeOpenCodeAdapter | `packages/opencode-adapter/src/fake-adapter.ts` | Simulated OpenCode commands |
| FakeSpecKitAdapter | `packages/speckit-adapter/src/` | Simulated Speckit commands |

### Fake Gate Evaluators

| Function | File | Lines | Purpose |
|----------|------|-------|---------|
| `registerFakeGateEvaluators()` | `packages/run-state/src/gate-evaluator.ts` | 184-200 | Registers PASS evaluators for all 8 GateTypes |

### Fake Audit Sink

Available via `GatewayService.onAudit` property (testable in isolation). The `onAudit` callback can be mocked in tests.

### Test Fixtures

| Fixture | File | Purpose |
|---------|------|---------|
| Gate enforcement tests | `packages/run-state/src/__tests__/gate-enforcement.test.ts` | 38 tests for evaluateGates, tryTransitionWithGates, PHASE_GATE_REQUIREMENTS |
| GATE_APPROVE integration tests | `packages/sandbox/src/__tests__/gate-approve.test.ts` | 33 tests for gateApproveAction |
| Audit enforcement tests | `packages/tool-gateway/src/__tests__/red/audit-enforcement.test.ts` | 25 tests for Gate 9 |
| Workspace cleanup tests | `packages/sandbox/src/__tests__/workspace-cleanup.test.ts` | 28 tests for lifecycle methods |
| State machine tests | `packages/run-state/src/__tests__/` | Contract, property, and unit tests |

### Test-Only Run Summary

The benchmark-rudolph package has a `controlled-real-probe.ts` that can be used as a reference for how all gates interact. The dry-run agent's `DEFAULT_BLOCKED_PATTERNS` provides a comprehensive list of blocked operations.

## What a Gate Assembly Validation Test Would Look Like

A Phase B test could:

1. **Initialize all fake adapters** (already done: `registerFakeGateEvaluators()`)
2. **Create a test run** through the state machine
3. **Verify each transition** goes through `tryTransitionWithGates()`
4. **Verify each gate evaluator** is registered for required GateTypes
5. **Test missing evaluator** → BLOCKED
6. **Test security fail** → not overridable by human approval
7. **Test human approval missing** → GATE_APPROVE pause
8. **Test audit enforcement** → BLOCKED without onAudit
9. **Test workspace cleanup** → CLEANUP phase reached
10. **Test push/merge blockers** → denied without env vars
11. **Test secret scanning** → detects and redacts

## Existing Tests That Already Cover Gate Assembly

| Test file | What it covers |
|-----------|---------------|
| `gate-enforcement.test.ts` | All 8 GateTypes, evaluateGates, tryTransitionWithGates, PHASE_GATE_REQUIREMENTS, missing evaluator blocking, security non-override, human approval → GATE_APPROVE |
| `gate-approve.test.ts` | ALLOW/DENY paths, force push gating, merge gating, secret access, outside workspace, events/evidence, human approval preservation, #205 isolation, Stop/Ask delegation, structural integrity |
| `audit-enforcement.test.ts` | Write tool blocking, destructive blocking, audit callback success/failure, ordering, handler-not-called, priority over other gates, secret non-exposure, evidenceEventId propagation |
| `workspace-cleanup.test.ts` | destroyWorkspace, lockWorkspace, unlockWorkspace, isLocked, path safety, idempotency, ownership validation |
| `state-machine.test.ts` | Full state machine transitions, CLEANUP phase, GATE_APPROVE phase |
| `state-machine.contract.test.ts` | Phase existence, terminal semantics, isTerminalPhase consistency |
| `state-machine.property.test.ts` | 1000 random transition runs, terminal phase invariants |

## Gap: End-to-End Gate Assembly Test

While individual gate tests exist, there is **no single end-to-end test** that:
- Creates a full run
- Exercises all gates in sequence
- Verifies the pipeline goes through COMMIT → PR_CREATE → MERGE → DONE → CLEANUP
- Checks that all required GateTypes are evaluated at each phase
- Confirms no gate is silently skipped

This would be the deliverable of Phase B.

## Classification

```text
ISSUE_308_INTEGRATION_TEST_READINESS: READY_FOR_FAKE_GATE_ASSEMBLY
```

All infrastructure exists. Fake adapters, fake gate evaluators, fake audit sink, and test fixtures are in place. Individual gate tests pass. The missing piece is a single end-to-end gate assembly test that exercises all gates together in a dry-run pipeline — which is exactly what Phase B would deliver.
