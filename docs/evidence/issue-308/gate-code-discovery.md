# Issue #308 Gate-Code Discovery

> Generated: 2026-06-27T21:37:00+02:00
> Auditor: issue-orchestrator (read-only)
> Scope: Catalog existing and missing gate mechanisms on main (HEAD 35c4225)

## Existing Gate Mechanisms on Main

### 1. GATE_APPROVE Phase (State Machine)

**Location:** `packages/run-state/src/state-machine.ts:86`
**Status:** EXISTS — as a phase definition only

```typescript
GATE_APPROVE: ['COMMIT', 'MERGE', 'DONE'],
```

- `GATE_APPROVE` is a valid phase in the state machine
- Transitions to: COMMIT, MERGE, DONE
- Referenced in `isFailurePhase()` — NOT a failure phase
- **Gap:** No runtime hook that evaluates stop/ask decisions before transitioning TO GATE_APPROVE
- **Gap:** No `gateApproveAction()` function on main

### 2. Phase Constants & Types

**Location:** `packages/shared/src/constants.ts:77,96`, `packages/shared/src/types.ts:29,90,165`
**Status:** EXISTS

```typescript
'GATE_APPROVE' // valid RunPhase
```

- Phase is properly typed and constant-defined
- German description: "Genehmigung erforderlich"

### 3. GATE_APPROVE Label Lifecycle

**Location:** `packages/github-adapter/src/label-lifecycle.ts:81-82,147`
**Status:** EXISTS

```typescript
GATE_APPROVE: {
  name: 'positron:gate-approve',
}
```

- GitHub label mapping exists
- Can add/remove labels during phase transitions

### 4. GATE_APPROVE Tool Gateway Reference

**Location:** `packages/tool-gateway/src/mcp-adapter.ts:25`
**Status:** EXISTS — as a blocked tool ID reference

### 5. Decision Classification (GREEN_SAFE / YELLOW_REVIEW / RED_HOLD)

**Location:** Multiple packages
**Status:** EXISTS (extensively)

- `packages/shared/src/decision-manifest.ts` — risk classification types
- `packages/shared/src/human-approval-pack.ts` — approval pack logic
- `packages/shared/src/safe-apply-plan.ts` — safe apply planning
- `packages/shared/src/github-context-reconciler.ts` — PR/issue classification
- `packages/shared/src/evidence-gate.ts` — evidence gate aggregation
- These provide **decision infrastructure** but NOT runtime enforcement

### 6. Local Gate Runner

**Location:** `packages/shared/src/local-gate-runner.ts`
**Status:** EXISTS

- `LocalGateResult` interface — gate result structure
- `createLocalGateReport()` — report generation
- `classifyLocalGateResult()` — result classification
- **Scope:** LOCAL gates only (build, test, typecheck) — NOT runtime gate enforcement

---

## Missing Gate Mechanisms on Main

### 1. Stop/Ask Policy Module

**Expected location:** `packages/sandbox/src/stop-ask-policy.ts`
**Status:** ABSENT

- `evaluateStopAsk()` function — NOT on main
- Category A/B pattern tables — NOT on main
- Decision types (ALLOW, DENY, ASK_HUMAN, etc.) — NOT on main
- Source: PR #218 branch only

### 2. GATE_APPROVE Runtime Hook

**Expected location:** `packages/sandbox/src/gate-approve.ts`
**Status:** ABSENT

- `gateApproveAction()` function — NOT on main
- Decision → phase mapping — NOT on main
- Event emission (GATE, ERROR, HUMAN) — NOT on main
- Source: PR #218 branch only

### 3. Workspace Cleanup / Lock

**Expected locations:**
- `packages/sandbox/src/fake-adapter.ts` — `destroyWorkspace`, `lockWorkspace`, `unlockWorkspace`, `isLocked`
- `packages/sandbox/src/real-adapter.ts` — same methods
**Status:** ABSENT

- Interface declared in `packages/shared/src/interfaces.ts` (lines 289-296)
- But NO adapter implements these methods
- Grep for `destroyWorkspace` on main: ZERO matches
- Grep for `lockWorkspace` on main: ZERO matches
- Source: PR #255 branch only (closed)

### 4. requiresAuditLog Enforcement

**Expected locations:**
- `packages/tool-gateway/src/gateway.ts` — Gate 9
- `packages/tool-gateway/src/scanner.ts` — audit warnings
**Status:** ABSENT

- `requiresAuditLog` field — Grep on main: ZERO matches
- No runtime check prevents tool execution without audit log
- No BLOCK_REASONS.AUDIT_LOG_REQUIRED
- Source: PR #255 branch only (closed)

### 5. GateType Runtime Enforcement

**Expected locations:**
- `packages/run-state/src/state-machine.ts` — GateEvaluator registry, evaluateGates, tryTransitionWithGates
**Status:** ABSENT

- 8 GateType values (`pre_run`, `pre_write`, `pre_push`, `pre_pr`, `pre_merge`, `evidence_required`, `security`, `human_approval`) — NOT found on main via grep
- No `GateEvaluator` registry
- No `evaluateGates()` function
- No `tryTransitionWithGates()` function
- No `PHASE_GATE_REQUIREMENTS` map
- Transitions happen without gate evaluation
- Source: PR #255 branch only (closed)

### 6. Pipeline Orchestrator Gate Integration

**Expected locations:**
- `apps/server/src/index.ts` — `runFullPipeline` with gate checks
- `apps/worker/src/pipeline-runner.ts` — `runPipeline` with gate checks
**Status:** ABSENT

- `runFullPipeline` — no GateType enforcement calls
- `runPipeline` — no GateType enforcement calls
- No workspace cleanup integration
- No audit log enforcement in pipeline

---

## Where Runtime Gates Should Sit

| Gate | Location | Phase | Current |
|---|---|---|---|
| `pre_run` | `runFullPipeline` / `runPipeline` entry | Before PRERUN | MISSING |
| `pre_write` | Tool gateway / file write adapter | Before COMMIT | MISSING |
| `pre_push` | Git adapter push | Before PUSH | MISSING |
| `pre_pr` | PR creation flow | Before PR_CREATE | MISSING |
| `pre_merge` | Merge flow | Before MERGE | MISSING |
| `evidence_required` | Evidence collection | Before DONE | MISSING |
| `security` | Security scan gate | Before MERGE, DONE | MISSING |
| `human_approval` | GATE_APPROVE phase | Before any gated action | MISSING |
| `GATE_APPROVE` hook | `gateApproveAction()` | During GATE_APPROVE phase | MISSING |
| `requiresAuditLog` | Tool execution pre-check | Before tool exec | MISSING |
| `destroyWorkspace` | CLEANUP phase | After DONE/FAILED | MISSING |

---

## Test Coverage

### Tests Present on Main

| Test | Package | Count | Related Gate |
|---|---|---|---|
| `state-machine.test.ts` | run-state | ~95 tests | GATE_APPROVE phase transitions only |
| `state-machine.contract.test.ts` | run-state | ~35 contract tests | GATE_APPROVE phase check |
| `gateway.test.ts` | tool-gateway | ~30 tests | Tool gateway (no audit enforcement) |
| `local-gate-runner.test.ts` | shared | ~40 tests | Local gates (not runtime gates) |
| `decision-manifest.*.test.ts` | shared | multiple | Decision classification |

### Tests Missing on Main

| Test | Package | Expected Count | Source |
|---|---|---|---|
| `stop-ask-policy.test.ts` | sandbox | 64 | PR #218 |
| `gate-approve.test.ts` | sandbox | 33 | PR #218 |
| `workspace-cleanup.test.ts` | sandbox | 13 | PR #255 (closed) |
| `audit-enforcement.test.ts` | tool-gateway | 10 | PR #255 (closed) |
| `gate-enforcement.test.ts` | run-state | 21 | PR #255 (closed) |
| **Total missing:** | | **141 tests** | |

---

## Safety Classification of Changes

### GREEN_SAFE (safe to implement without blocker resolution)
- Documentation updates (docs/)
- Evidence file creation (docs/evidence/)
- Test additions that don't modify runtime behavior
- UI changes that don't affect pipeline (#248 LivingEvidencePortfolio)
- `approval:not-required` issues (#304, #298 types)

### YELLOW_REVIEW (needs review before implementation)
- PR #218 merge (GATE_APPROVE hook) — needs human approval
- Feature that adds new runtime enforcement
- Pipeline modification without changing gate behavior

### RED_HOLD (blocked, do not touch without resolution)
- Real Mode execution — blocked by #308 blockers
- Gate bypass code — never allowed
- PR #218 modification without explicit approval
- Workflow file changes
- Merge without human approval
- Auto-merge activation

---

## Classification

```text
ISSUE_308_GATE_CODE_DISCOVERY_STATUS: PARTIAL
```

**Reasoning:** The codebase on main has:
- Gate phase definitions (GATE_APPROVE) — EXIST
- Decision classification infrastructure — EXIST
- Local gate runner — EXIST

But MISSING:
- Stop/Ask policy evaluation — ABSENT
- GATE_APPROVE hook implementation — ABSENT
- Workspace cleanup/lock — ABSENT
- requiresAuditLog enforcement — ABSENT
- GateType runtime enforcement (all 8 types) — ABSENT
- Pipeline orchestrator gate integration — ABSENT
- 141 tests missing from main

The gate infrastructure is ~20% complete — types and definitions exist but no runtime teeth.
