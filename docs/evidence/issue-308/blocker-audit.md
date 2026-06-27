# Issue #308 Blocker Audit

> Generated: 2026-06-27T21:37:00+02:00
> Auditor: issue-orchestrator (read-only)
> Scope: Validate whether #215, #244, #245, #246 are truly blocking #308

## Summary Table

| Blocker | Issue State | Code on main? | Tests on main? | PR | PR State | Verdict |
|---|---|---|---|---|---|---|
| #215 | OPEN | NO | NO | #218 | OPEN, not merged | **OPEN_BLOCKER** |
| #244 | OPEN | NO | NO | #255 | CLOSED, CONFLICTING | **OPEN_BLOCKER** |
| #245 | OPEN | NO | NO | #255 | CLOSED, CONFLICTING | **OPEN_BLOCKER** |
| #246 | OPEN | NO | NO | #255 | CLOSED, CONFLICTING | **OPEN_BLOCKER** |

---

## Blocker #215 — GATE_APPROVE runtime hook

### Issue Details
- **State:** OPEN
- **Title:** `Safety: Integrate Stop/Ask Policy via GATE_APPROVE runtime hook`
- **Labels:** `enhancement`, `architecture`
- **Risk:** YELLOW_REVIEW — runtime gate integration, needs validation before Real Mode

### Associated PRs
- **PR #218** — `feat(safety): integrate Stop/Ask policy with GATE_APPROVE`
  - Head: `positron/issue-215-gate-approve-stop-ask` (452bb18)
  - State: OPEN, not draft
  - Mergeable: UNKNOWN
  - Reviews: coderabbitai (2x COMMENTED), no human reviewer
  - 7 files changed, +1847 insertions
  - Has CodeRabbit actionable comments (4) but no blocking CHANGE_REQUEST

### Relevant Codepaths (on PR branch, NOT on main)
- `packages/sandbox/src/stop-ask-policy.ts` — Stop/Ask evaluation logic (Category A/B patterns)
- `packages/sandbox/src/gate-approve.ts` — `gateApproveAction()` bridge to state machine
- `packages/sandbox/src/index.ts` — exports updated
- `docs/security/stop-ask-protocol.md` — runtime hook documentation

### Existing Code on main
- `GATE_APPROVE` exists as a **phase** in `packages/run-state/src/state-machine.ts` (line 86)
- Transitions defined: `GATE_APPROVE → COMMIT | MERGE | DONE`
- Label lifecycle: `positron:gate-approve` label mapping exists
- **BUT:** No hook implementation — `gateApproveAction()` does NOT exist on main
- **BUT:** No policy evaluation — `stop-ask-policy.ts` does NOT exist on main

### Tests (on PR branch, NOT on main)
- `stop-ask-policy.test.ts` — 64 tests (PASS on branch, NOT present on main)
- `gate-approve.test.ts` — 33 tests (PASS on branch, NOT present on main)

### Evidence Present?
- Issue comment from xxammaxx (2026-06-15) — Implementation completed, awaiting human approval
- PR #218 review report from review-agent: PASS (0 blocking findings)
- Local gates: build PASS, typecheck PASS, 97 new tests PASS
- **Evidence location:** PR #218 description and issue comment
- **Evidence on main:** NONE

### Is the blocker truly resolved?
**NO.** Code exists on branch but is NOT merged to main. PR #218 awaits human approval. No evidence of merge.

### What's missing?
1. Human approval for PR #218 merge
2. PR #218 merge to main
3. Verification that merged code works in pipeline context
4. Evidence artifacts on main

### Can #308 start without this blocker?
**NO.** #308 requires GATE_APPROVE to function. Without it, there is no stop/ask evaluation at runtime. Real Mode without GATE_APPROVE would skip the #308 Phase 1 (Gate Assembly) entirely.

### Classification
```text
#215: OPEN_BLOCKER
```

---

## Blocker #244 — Runtime Workspace Cleanup

### Issue Details
- **State:** OPEN
- **Title:** `[APPROVAL REQUIRED] Implement Runtime Workspace Cleanup for GitWorkspaceAdapter`
- **Labels:** `enhancement`, `architecture`, `P0`, `approval:required`
- **Risk:** RED_HOLD — data loss risk from faulty destroyWorkspace, race conditions

### Owner Approval
- **Approval granted:** 2026-06-17 (`/approve scope=this-issue`)

### Associated PRs
- **PR #255** — `feat(issue-243): enforce P0 runtime safety gates`
  - Head: `positron/issue-243-p0-runtime-safety` (90b5155)
  - State: **CLOSED**, not merged
  - Mergeable: CONFLICTING
  - MergeStateStatus: DIRTY
  - 112 files changed, combined with #229 architecture chain

### Relevant Codepaths (on PR branch, NOT on main)
- `packages/sandbox/src/fake-adapter.ts` — destroyWorkspace, lockWorkspace, unlockWorkspace, isLocked
- `packages/sandbox/src/real-adapter.ts` — Same 4 methods with filesystem operations
- `packages/run-state/src/state-machine.ts` — WorkspaceCleanupFn, registerWorkspaceCleanup, runCleanup
- `packages/run-state/src/__tests__/workspace-cleanup.test.ts` — 13 tests

### Existing Code on main
- **Interface declared** in `packages/shared/src/interfaces.ts` (lines 289-296) — YES
- **Runtime implementation** — NO (neither fake-adapter nor real-adapter have these methods)
- **State machine cleanup** — NO
- **Grep for `destroyWorkspace` on main:** ZERO matches

### Tests (on PR branch, NOT on main)
- `workspace-cleanup.test.ts` — 13 tests (PASS on branch, NOT present on main)

### Evidence Present?
- Issue comments from xxammaxx (2026-06-17, 2026-06-18) — Implementation completed, wired into orchestrator
- PR #255 (closed) had 13 tests passing
- **Evidence on main:** NONE

### Is the blocker truly resolved?
**NO.** PR #255 was CLOSED (not merged). The workspace cleanup code never reached main. Both adapter implementations lack destroyWorkspace/lockWorkspace/unlockWorkspace/isLocked.

### What's missing?
1. Recovery of workspace cleanup code from closed PR #255 branch
2. Clean merge to main (PR #255 was CONFLICTING and DIRTY)
3. Re-testing on current main
4. Evidence on main

### Can #308 start without this blocker?
**NO.** #308 requires workspace cleanup for Phase 2 (Controlled Real Run) and Phase 3 (Supervised Real Run). Without cleanup, workspace disk leaks and no lock protection would risk data corruption.

### Classification
```text
#244: OPEN_BLOCKER
```

---

## Blocker #245 — requiresAuditLog enforcement

### Issue Details
- **State:** OPEN
- **Title:** `[APPROVAL REQUIRED] Enforce requiresAuditLog in Tool Gateway Runtime`
- **Labels:** `enhancement`, `architecture`, `P0`, `approval:required`
- **Risk:** RED_HOLD — faulty enforcement could incorrectly block tools, DSGVO-relevant

### Owner Approval
- **Approval granted:** 2026-06-17 (`/approve scope=this-issue`)

### Associated PRs
- **PR #255** — CLOSED, CONFLICTING (same as #244)

### Relevant Codepaths (on PR branch, NOT on main)
- `packages/tool-gateway/src/gateway.ts` — Gate 9 blocks write/destructive tools with requiresAuditLog=true
- `packages/tool-gateway/src/scanner.ts` — Warns about missing requiresAuditLog on risky tools
- `packages/tool-gateway/src/types.ts` — BLOCK_REASONS: AUDIT_LOG_REQUIRED
- `packages/tool-gateway/src/__tests__/red/audit-enforcement.test.ts` — 10 tests

### Existing Code on main
- `ToolDefinition.requiresAuditLog` — **Type defined** in `packages/tool-gateway/src/types.ts:92`?
  - Let me verify... The code on main does NOT show `requiresAuditLog` in grep results
  - The type may exist but runtime enforcement definitely does NOT
- **Runtime enforcement** — NO (Grep for `requiresAuditLog` returned ZERO matches on main)
- **Gate 9** — NOT on main
- **BLOCK_REASONS.AUDIT_LOG_REQUIRED** — NOT on main

### Tests (on PR branch, NOT on main)
- `audit-enforcement.test.ts` — 10 tests (PASS on branch, NOT present on main)
  - Write tool without audit → BLOCKED
  - Destructive tool without audit → BLOCKED
  - Write tool with audit configured → ALLOWED
  - Read-only tool without audit → NOT blocked

### Evidence Present?
- Issue comments from xxammaxx (2026-06-17, 2026-06-18) — Implementation completed, enforcement active
- 10 red tests passing on branch
- **Evidence on main:** NONE

### Is the blocker truly resolved?
**NO.** PR #255 was CLOSED (not merged). The requiresAuditLog enforcement code never reached main.

### What's missing?
1. Recovery of audit enforcement code from closed PR #255 branch
2. Clean merge to main
3. Re-testing
4. Evidence on main

### Can #308 start without this blocker?
**NO.** #308 Phase 1 (Gate Assembly) requires audit log enforcement to verify audit trail integrity. Without it, tools can execute write/destructive operations without audit — violating #308 evidence requirements.

### Classification
```text
#245: OPEN_BLOCKER
```

---

## Blocker #246 — GateType Layers enforcement

### Issue Details
- **State:** OPEN
- **Title:** `[APPROVAL REQUIRED] Enforce GateType Layers in Pipeline Loop`
- **Labels:** `enhancement`, `architecture`, `P0`, `approval:required`
- **Risk:** RED_HOLD — misconfigured gates could block entire pipeline

### Owner Approval
- **Approval granted:** 2026-06-17 (`/approve scope=this-issue`)

### Associated PRs
- **PR #255** — CLOSED, CONFLICTING (same as #244, #245)

### Relevant Codepaths (on PR branch, NOT on main)
- `packages/run-state/src/state-machine.ts` — GateEvaluator registry, evaluateGates, tryTransitionWithGates
- `packages/run-state/src/__tests__/gate-enforcement.test.ts` — 21 tests
- PHASE_GATE_REQUIREMENTS: COMMIT→pre_write+evidence, PR_CREATE→pre_pr+evidence, etc.
- Security fail cannot be overridden by human approval
- Missing evaluator → blocking failure (no fake pass)

### Existing Code on main
- **8 GateType values:** Defined in `packages/shared/src/types.ts:299-307` — possible (needs verification)
  - The grep showed only `LocalGateResult` types, NOT the 8 GateType values
  - Let me note: GateType values may exist as type definitions (as claimed by #246 issue body), but...
  - Grep for `GateType` on main returned ZERO matches
- **GateResult/GateLayerResult interfaces:** NOT on main (grep found no matches)
- **Runtime enforcement:** NO — no GateEvaluator, no tryTransitionWithGates
- **Pipeline gate evaluation:** NO — transitions happen without gate checks
- **`pre_run` gate check:** DOES NOT EXIST
- **`pre_write` gate check:** DOES NOT EXIST
- **`evidence_required` gate check:** DOES NOT EXIST
- **`security` gate check:** DOES NOT EXIST
- **`human_approval` gate check:** DOES NOT EXIST

### Tests (on PR branch, NOT on main)
- `gate-enforcement.test.ts` — 21 tests (PASS on branch, NOT present on main)
  - Missing evaluator → blocking failure
  - Passing gates allow transition
  - Blocking gate prevents transition
  - Security fail cannot be overridden
  - Phase gate requirements correctly mapped

### Evidence Present?
- Issue comments from xxammaxx (2026-06-17, 2026-06-18) — Implementation completed, enforced in orchestrator + worker
- 21 tests passing on branch
- **Evidence on main:** NONE

### Is the blocker truly resolved?
**NO.** PR #255 was CLOSED (not merged). None of the GateType enforcement code exists on main.

### What's missing?
1. Recovery of gate enforcement code from closed PR #255 branch
2. Clean merge to main
3. Re-testing
4. Evidence on main

### Can #308 start without this blocker?
**NO.** #308 Phase 1 (Gate Assembly) requires all 8 gate types to be enforced at runtime. Without GateType enforcement, the gate pipeline in #308 would be unenforceable.

### Classification
```text
#246: OPEN_BLOCKER
```

---

## Overall Classification

```text
ISSUE_308_BLOCKER_STATUS: BLOCKED
```

**Reasoning:** All four blocker issues (#215, #244, #245, #246) remain OPEN. Implementations exist on branches but NOT on main. PR #218 (for #215) is open but unmerged and awaiting human approval. PR #255 (for #244/#245/#246) was closed with CONFLICTING status and was never merged. None of the four prerequisite gate mechanisms exist on the current main branch.

**Blockers are REAL and ACTIVE.** #308 cannot proceed until these issues are resolved on main.
