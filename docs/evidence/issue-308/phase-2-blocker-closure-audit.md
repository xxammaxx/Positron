# Issue #308 Phase 2 — Blocker Closure Audit

**Generated:** 2026-06-29T08:15:00+02:00
**Mode:** READ-ONLY RECHECK — NO Real Mode

---

## Executive Summary

All 4 blockers are **CLOSED on GitHub** and **code is verified on main** (HEAD: 00fecb8). 

---

## #215 — GATE_APPROVE Runtime Hook

**Issue:** CLOSED 2026-06-28 | **PR:** #218 MERGED

### Code Presence on main

| File | Lines | Role |
|------|-------|------|
| `packages/sandbox/src/gate-approve.ts` | 189 | Core runtime hook: `gateApproveAction()` |
| `packages/sandbox/src/stop-ask-policy.ts` | 398 | Stop/Ask policy engine: `evaluateStopAsk()` |
| `packages/sandbox/src/index.ts` | 80-81 | Re-export |
| `packages/shared/src/types.ts` | 29,90,165 | `GATE_APPROVE` in Phase union, ALL_PHASES, labels |
| `packages/shared/src/constants.ts` | 77,96 | PHASE_ORDER, BLOCKED_PHASES includes GATE_APPROVE |
| `packages/run-state/src/state-machine.ts` | 86,311 | VALID_TRANSITIONS, resumeFromEvents |
| `packages/run-state/src/gate-evaluator.ts` | 309-324 | Human approval fail → GATE_APPROVE routing |
| `packages/github-adapter/src/label-lifecycle.ts` | 81,147 | `positron:gate-approve` label |
| `apps/server/src/index.ts` | 3413,3995 | GATE_APPROVE → COMMIT routing, resume list |
| `apps/web/src/types.ts` | 29 | Phase union type |

### Tests

| File | Tests |
|------|-------|
| `packages/sandbox/src/__tests__/gate-approve.test.ts` | 33 tests |
| `packages/sandbox/src/__tests__/stop-ask-policy.test.ts` | 64 tests |
| `packages/run-state/src/__tests__/gate-enforcement.test.ts` | includes GATE_APPROVE routing |
| `packages/run-state/src/__tests__/state-machine.test.ts` | includes GATE_APPROVE phase tests |
| `packages/run-state/src/__tests__/state-machine.contract.test.ts` | includes GATE_APPROVE |
| `apps/web/src/voice/__tests__/voice-output.test.ts` | GATE_APPROVE → human_action |

**Total dedicated tests:** 97 (33 gate-approve + 64 stop-ask)

### Verification

| Check | Status |
|-------|--------|
| Issue closed/completed | ✅ CLOSED 2026-06-28 |
| Code on main | ✅ PRESENT |
| `stop-ask-policy.ts` present | ✅ 398 lines |
| `gate-approve.ts` present | ✅ 189 lines |
| Runtime hook exported | ✅ via `packages/sandbox/src/index.ts` |
| Tests present | ✅ 97 dedicated + additional coverage |
| Auto-approval bypass | ✅ NONE FOUND |

### Known Limitations
- `evaluateCommand` not found as a standalone function (internal to stop-ask-policy.ts)
- Wiring `gateApproveAction()` into server's GATE_APPROVE phase handler listed as follow-up in `docs/testing/verification-contract-stop-ask.md`

**#215 VERDICT: VERIFIED ✅**

---

## #244 — Runtime Workspace Cleanup

**Issue:** CLOSED 2026-06-28 | **PR:** Delivered via #255 (closed) / rebuilt individually

### Code Presence on main

| File | Lines | Role |
|------|-------|------|
| `packages/shared/src/interfaces.ts` | 291-303 | Interface: `destroyWorkspace`, `lockWorkspace`, `unlockWorkspace`, `isLocked` |
| `packages/sandbox/src/fake-adapter.ts` | 155-229 | Fake adapter: all 4 lifecycle methods |
| `packages/sandbox/src/real-adapter.ts` | 262-368 | Real adapter: all 4 lifecycle methods + `validateWorkspaceBoundary` |
| `packages/run-state/src/state-machine.ts` | 186-226 | `runCleanup()`, `registerWorkspaceCleanup()`, `getWorkspaceCleanupFn()` |
| `packages/run-state/src/index.ts` | 23-25,32 | Public exports |
| `packages/shared/src/types.ts` | 32,35,93,102-109,168 | CLEANUP phase: union type, terminal phase, all phases, labels |
| `packages/shared/src/constants.ts` | 80,89 | CLEANUP in ALL_PHASES, TERMINAL_PHASES |
| `packages/run-state/src/state-machine.ts` | 79-89,314,345-351 | DONE/FAILED_* → CLEANUP transitions, terminal semantics |
| `apps/server/src/index.ts` | 207-210,1869-1880,1913-1924 | Server wiring |
| `apps/worker/src/index.ts` | 68-71 | Worker wiring |
| `apps/worker/src/pipeline-runner.ts` | 1475-1486,1516-1527 | Worker pipeline wiring |

### Tests

| File | Tests |
|------|-------|
| `packages/sandbox/src/__tests__/workspace-cleanup.test.ts` | 28 tests (13 fake + 12 real + 3 phase) |
| `packages/run-state/src/__tests__/state-machine.test.ts` | CLEANUP phase tests |
| `packages/run-state/src/__tests__/state-machine.contract.test.ts` | CLEANUP contract tests |
| `packages/run-state/src/__tests__/state-machine.property.test.ts` | 1000 random runs |
| `packages/shared/src/__tests__/types.test.ts` | `isTerminalPhase('CLEANUP')` |

### Verification

| Check | Status |
|-------|--------|
| Issue closed/completed | ✅ CLOSED 2026-06-28 |
| `destroyWorkspace` | ✅ Both adapters |
| `lockWorkspace` | ✅ Both adapters |
| `unlockWorkspace` | ✅ Both adapters |
| `isLocked` | ✅ Both adapters |
| CLEANUP phase | ✅ In state machine (terminal sink) |
| Path-safety-guards | ✅ `validateWorkspaceBoundary()` in real-adapter |
| Tests present | ✅ 28 adapter + state machine tests |
| Server wiring | ✅ Both `runFullPipeline` and timeout path |
| Worker wiring | ✅ Both `runPipeline` and timeout path |

### Known Limitations (documented)

- **process-scoped lock**: Lock is in-memory only, not distributed
- **symlink/deep path audit**: `validateWorkspaceBoundary` handles `..` traversal and root protection but full symlink audit is future work

**#244 VERDICT: VERIFIED ✅**

---

## #245 — requiresAuditLog Enforcement

**Issue:** CLOSED 2026-06-28 | **PR:** Delivered via #255 (closed) / rebuilt individually

### Code Presence on main

| File | Lines | Role |
|------|-------|------|
| `packages/tool-gateway/src/types.ts` | 77-78,178 | `requiresAuditLog?: boolean` on `ToolDefinition`; `AUDIT_LOG_MISSING` in BLOCK_REASONS |
| `packages/tool-gateway/src/gateway.ts` | 53-60,161-198 | `onAudit` callback property; Gate 9 enforcement: fail-closed if no callback or callback throws |
| `packages/tool-gateway/src/scanner.ts` | 193-201 | Scanner warning for write/destructive tools missing `requiresAuditLog` |

### Tests

| File | Tests |
|------|-------|
| `packages/tool-gateway/src/__tests__/red/audit-enforcement.test.ts` | 25 tests |
| `packages/tool-gateway/src/__tests__/gateway.test.ts` | 6 audit tests |

**Total:** 31 test cases

### Verification

| Check | Status |
|-------|--------|
| Issue closed/completed | ✅ CLOSED 2026-06-28 |
| `requiresAuditLog` in ToolDefinition | ✅ PRESENT |
| `onAudit` callback property | ✅ PRESENT on GatewayService |
| `AUDIT_LOG_MISSING` block reason | ✅ PRESENT |
| Audit enforced BEFORE tool execution | ✅ Gate 9 ordering |
| Fail-closed when no onAudit | ✅ BLOCKED with AUDIT_LOG_MISSING |
| Fail-closed when onAudit throws | ✅ BLOCKED with AUDIT_LOG_MISSING |
| Tests present | ✅ 31 test cases |

### Known Limitations

- **`onAudit` NOT wired in server**: Zero matches in `apps/server/src/`. The `onAudit` property exists on `GatewayService` but the server integration layer has NOT connected it. Documented as future work.
- **`onAudit` NOT wired in worker**: Same gap in `apps/worker/`.
- **Scanner warning untested**: Scanner's `requiresAuditLog` recommendation has no corresponding unit test.

**#245 VERDICT: VERIFIED WITH LIMITATION ⚠️** (core enforcement works, server integration pending)

---

## #246 — GateType Layers Enforcement

**Issue:** CLOSED 2026-06-29 | **PR:** #316 MERGED

### Code Presence on main

| File | Lines | Role |
|------|-------|------|
| `packages/shared/src/types.ts` | 182-229 | 8 GateTypes defined: `pre_run`, `pre_write`, `pre_push`, `pre_pr`, `pre_merge`, `evidence_required`, `security`, `human_approval` |
| `packages/shared/src/interfaces.ts` | 370-387 | `GateEvaluationContext` interface |
| `packages/run-state/src/gate-evaluator.ts` | 1-358 | Core: `registerGateEvaluator()`, `evaluateGates()`, `tryTransitionWithGates()`, `PHASE_GATE_REQUIREMENTS`, `registerFakeGateEvaluators()` |
| `packages/run-state/src/index.ts` | 35-48 | Barrel exports |
| `apps/server/src/index.ts` | 1057-1067,1118-1128,1232-1242,2313-2316 | Server wiring for gated transitions |
| `apps/worker/src/index.ts` | 13,110 | Worker startup: `registerFakeGateEvaluators()` |
| `apps/worker/src/pipeline-runner.ts` | 822-832,875-885,966-976 | Worker wiring for gated transitions |

### GateType Coverage Matrix

| GateType | Defined | Fake Evaluator | In PHASE_GATE_REQUIREMENTS | Server Wired | Worker Wired |
|----------|---------|----------------|----------------------------|--------------|--------------|
| `pre_run` | ✅ | ✅ | **NO** | N/A | N/A |
| `pre_write` | ✅ | ✅ | ✅ COMMIT | ✅ | ✅ |
| `pre_push` | ✅ | ✅ | **NO** | N/A | N/A |
| `pre_pr` | ✅ | ✅ | ✅ PR_CREATE | ✅ | ✅ |
| `pre_merge` | ✅ | ✅ | ✅ MERGE | ✅ | ✅ |
| `evidence_required` | ✅ | ✅ | ✅ COMMIT, PR_CREATE, DONE | ✅ | ✅ |
| `security` | ✅ | ✅ | ✅ MERGE | ✅ | ✅ |
| `human_approval` | ✅ | ✅ | ✅ MERGE | ✅ | ✅ |

### Tests

| File | Tests |
|------|-------|
| `packages/run-state/src/__tests__/gate-enforcement.test.ts` | 38 tests |

### Verification

| Check | Status |
|-------|--------|
| Issue closed/completed | ✅ CLOSED 2026-06-29 |
| 8 GateTypes defined | ✅ All 8 present |
| GateEvaluator registry | ✅ `registerGateEvaluator()`, `clearGateEvaluators()`, `hasGateEvaluator()` |
| `evaluateGates()` exists | ✅ With missing evaluator → blocking |
| `tryTransitionWithGates()` exists | ✅ With security invariants |
| Server wiring | ✅ VERIFY→COMMIT, COMMIT→PR_CREATE, PR_CREATE→MERGE |
| Worker wiring | ✅ Same transitions |
| Missing evaluator blocks | ✅ Returns blocking failure |
| Security fail not overridable | ✅ Enforced in `tryTransitionWithGates()` |
| Human approval fail → GATE_APPROVE | ✅ Route to GATE_APPROVE phase |
| Fake gate evaluators registered | ✅ At both server and worker startup |

### Known Limitations

| Limitation | Status | Risk |
|------------|--------|------|
| `pre_run` not wired in PHASE_GATE_REQUIREMENTS | Documented future work | Low (defined but unused) |
| `pre_push` not wired in PHASE_GATE_REQUIREMENTS | Documented future work | Low (defined but unused) |
| MERGE→DONE uses raw `transition()` | Documented future work | Low (DONE has `evidence_required` but gated transition not yet wired; evidence collected at earlier phases) |

**#246 VERDICT: VERIFIED WITH LIMITATIONS ⚠️** (core enforcement works, 2 GateTypes not wired, MERGE→DONE raw)

---

## Overall Blocker Closure Status

| Blocker | GitHub | Code on main | Tests | Limitations | Verdict |
|---------|--------|-------------|-------|-------------|---------|
| #215 | CLOSED | ✅ Full | ✅ 97+ | Minimal (wiring follow-up) | VERIFIED ✅ |
| #244 | CLOSED | ✅ Full | ✅ 28+ | Process-scoped lock | VERIFIED ✅ |
| #245 | CLOSED | ✅ Core | ✅ 31 | Server `onAudit` not wired | VERIFIED ⚠️ |
| #246 | CLOSED | ✅ Core | ✅ 38 | 2 GateTypes not wired, raw MERGE→DONE | VERIFIED ⚠️ |

```text
ISSUE_308_BLOCKER_CLOSURE_STATUS: CLOSED_WITH_LIMITATIONS
```

All four blockers are **CLOSED** on GitHub and **code is on main**. The limitations are documented, understood, and do not prevent Phase B (fake/dry-run Gate Assembly Validation). They **do** block Full Real Mode (Phase C/D).
