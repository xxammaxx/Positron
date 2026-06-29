# Issue #308 Phase 2 — Runtime Safety Layer Discovery

**Generated:** 2026-06-29T08:15:00+02:00
**Mode:** READ-ONLY RECHECK — NO Real Mode

---

## Safety Layer Inventory

| Layer | Status | Evidence | Risk |
|-------|--------|----------|------|
| Stop/Ask | **PRESENT** | `packages/sandbox/src/stop-ask-policy.ts` (398 lines, 64 tests) | LOW |
| GATE_APPROVE Hook | **PRESENT** | `packages/sandbox/src/gate-approve.ts` (189 lines, 33 tests) | LOW |
| Workspace Cleanup | **PRESENT** | Adapter lifecycle (28 tests), CLEANUP phase, server/worker wiring | LOW |
| Audit Enforcement | **PRESENT (core)** | Gate 9 in tool-gateway (31 tests), fail-closed | MEDIUM (server wiring pending) |
| GateType Enforcement | **PRESENT (core)** | 8 GateTypes, evaluator registry, gated transitions (38 tests) | MEDIUM (2 GateTypes not wired) |
| Real-Mode Kill Switches | **PRESENT** | 30+ guardrails, all default to safe | LOW |
| Secret Guardrails | **PRESENT** | Secret scanning, redaction, `.env` pattern detection, red-team tests | LOW |
| Evidence Portfolio | **PRESENT** | Evidence contract, portfolio updater, gate reports | LOW |

---

## Detailed Discovery by Key Pattern

### GATE_APPROVE

| File | Lines | Context |
|------|-------|---------|
| `packages/sandbox/src/gate-approve.ts` | 1-189 | Core runtime hook — bridges Stop/Ask → state machine |
| `packages/sandbox/src/index.ts` | 80-81 | `export { gateApproveAction } from './gate-approve.js'` |
| `packages/run-state/src/gate-evaluator.ts` | 309-324 | Human approval fail → GATE_APPROVE phase routing |
| `packages/run-state/src/state-machine.ts` | 86 | `GATE_APPROVE: ['COMMIT', 'MERGE', 'DONE']` |
| `apps/server/src/index.ts` | 3413,3995 | GATE_APPROVE → COMMIT decision routing |
| `apps/web/src/types.ts` | 29 | Phase union type |

### gateApproveAction

| File | Lines | Context |
|------|-------|---------|
| `packages/sandbox/src/gate-approve.ts` | 86 | Function definition: `export function gateApproveAction(input: GateApproveInput): GateApproveResult` |
| `packages/sandbox/src/index.ts` | 80 | Re-export |
| `packages/sandbox/src/__tests__/gate-approve.test.ts` | 33 invocations | Test coverage |

### evaluateCommand

**NOT FOUND** — zero matches across entire codebase. The concept is internal to `stop-ask-policy.ts` (`evaluateStopAsk()`).

### stop-ask

| File | Lines | Context |
|------|-------|---------|
| `packages/sandbox/src/stop-ask-policy.ts` | 1-398 | Policy engine: Category A (14 DENY patterns), Category B (8 ASK_HUMAN/REQUIRE_REVIEW), Category C (command classification) |
| `packages/sandbox/src/__tests__/stop-ask-policy.test.ts` | 1-477 | 64 test cases |

### destroyWorkspace, lockWorkspace, unlockWorkspace, isLocked

All **PRESENT** in both `fake-adapter.ts` and `real-adapter.ts`. See Blocker Closure Audit for details.

### runCleanup

| File | Lines | Context |
|------|-------|---------|
| `packages/run-state/src/state-machine.ts` | 213-226 | Core function: handles null workspacePath, null registered function, try/catch |
| `apps/server/src/index.ts` | 1869-1880,1913-1924 | Called on terminal phase and timeout |
| `apps/worker/src/pipeline-runner.ts` | 1475-1486,1516-1527 | Same pattern in worker |

### requiresAuditLog, onAudit, AUDIT_LOG_MISSING

| File | Lines | Context |
|------|-------|---------|
| `packages/tool-gateway/src/types.ts` | 77-78,178 | `requiresAuditLog?: boolean`; `AUDIT_LOG_MISSING` block reason |
| `packages/tool-gateway/src/gateway.ts` | 53-60,161-198 | `onAudit` callback; Gate 9 fail-closed enforcement |

### GateType, GateEvaluator, evaluateGates, tryTransitionWithGates

| File | Lines | Context |
|------|-------|---------|
| `packages/shared/src/types.ts` | 189-229 | 8 GateTypes, GateResult, GateLayerResult |
| `packages/run-state/src/gate-evaluator.ts` | 1-358 | Full implementation |
| `apps/server/src/index.ts` | 1057-1067,1118-1128,1232-1242 | Wired for COMMIT, PR_CREATE, MERGE |
| `apps/worker/src/pipeline-runner.ts` | 822-832,875-885,966-976 | Same wiring in worker |

### PHASE_GATE_REQUIREMENTS

```typescript
// packages/run-state/src/gate-evaluator.ts:148-157
COMMIT: ['pre_write', 'evidence_required'],
PR_CREATE: ['pre_pr', 'evidence_required'],
MERGE: ['pre_merge', 'security', 'human_approval'],
DONE: ['evidence_required'],
```

### registerFakeGateEvaluators

| File | Lines | Context |
|------|-------|---------|
| `packages/run-state/src/gate-evaluator.ts` | 184-200 | Registers fake-PASS evaluators for all 8 GateTypes |
| `apps/server/src/index.ts` | 2313-2316 | Called at server startup |
| `apps/worker/src/index.ts` | 110 | Called at worker startup |

### HUMAN_APPROVED_REAL, POSITRON_ENABLE_REAL

| File | Lines | Context |
|------|-------|---------|
| `packages/benchmark-rudolph/src/controlled-real-probe.ts` | 55-73 | Gate 1+2: Both must be `'true'` for real mode |
| `packages/benchmark-rudolph/src/__tests__/red-negative-tests.test.ts` | 323-358 | Verified: without these, real mode is BLOCKED |

### POSITRON_ENABLE_PUSH

| File | Lines | Context |
|------|-------|---------|
| `packages/sandbox/src/commit-policy.ts` | 74-77 | Blocks push when not `'true'` |
| `apps/server/src/index.ts` | 1072,1114 | Merge step skips push when not set |
| `.env.example` | 20 | `POSITRON_ENABLE_PUSH=false` |

### POSITRON_ENABLE_MERGE

| File | Lines | Context |
|------|-------|---------|
| `apps/server/src/index.ts` | 1263,1357,1457 | Merge step skipped when not `'true'` |
| `.env.example` | 21 | `POSITRON_ENABLE_MERGE=false` |

### POSITRON_MERGE_KILL_SWITCH

| File | Lines | Context |
|------|-------|---------|
| `apps/server/src/index.ts` | 1265,1363,1448 | `mergeKillSwitch !== 'false'` blocks merge |
| `packages/opencode-adapter/src/dry-run-agent.ts` | 156-164,233-234 | Kill-switch active → merge/branch-delete blocked |
| `docker-compose.yml` | 59,99 | `POSITRON_MERGE_KILL_SWITCH=true` |

---

## Safety Guardrails — Active Kill-Switch Inventory

| Guardrail | Mechanism | Default | Active? |
|-----------|-----------|---------|---------|
| Fake mode (all adapters) | `POSITRON_*_MODE` defaults to `fake` | BLOCKED | ✅ |
| Dry-run agent | 16 write operations blocked | BLOCKED | ✅ |
| Stop/Ask DENY | 14 Category A patterns | BLOCKED | ✅ |
| Push policy | `POSITRON_ENABLE_PUSH !== 'true'` | BLOCKED | ✅ |
| Merge policy | `POSITRON_ENABLE_MERGE !== 'true'` | BLOCKED | ✅ |
| Merge kill-switch | `POSITRON_MERGE_KILL_SWITCH !== 'false'` | ACTIVE | ✅ |
| Real mode gate | `HUMAN_APPROVED_REAL` + `POSITRON_ENABLE_REAL` | BLOCKED | ✅ |
| Fix loop limit | `MAX_FIX_LOOPS = 3` | ENFORCED | ✅ |
| Secret scanning | 9 regex patterns | ACTIVE | ✅ |
| Tool Gateway | 8 security gates + disabled by default | BLOCKED | ✅ |
| Protected branches | `main`, `master`, `develop` | BLOCKED | ✅ |
| Branch pattern | Only `positron/issue-<n>-<slug>` | ENFORCED | ✅ |
| Workspace boundary | `validateWorkspaceBoundary()` | ACTIVE | ✅ |
| Audit enforcement | Gate 9 fail-closed | ACTIVE (core) | ✅ |
| GateType enforcement | Missing evaluator → block | ACTIVE | ✅ |
| `--yolo` detection | Pattern in RED_HOLD_ACTIONS | BLOCKED | ✅ |

---

## Classification

```text
ISSUE_308_RUNTIME_SAFETY_STATUS: READY_WITH_LIMITATIONS
```

All critical safety layers are **present and active**. The two limitations (server `onAudit` wiring, GateType `pre_run`/`pre_push` wiring) are documented, well-understood, and do not affect the ability to run a fake/dry-run Gate Assembly Validation (Phase B). They would become relevant for any Full Real Mode (Phase C/D).
