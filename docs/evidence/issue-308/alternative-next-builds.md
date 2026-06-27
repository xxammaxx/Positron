# Issue #308 Alternative Next Builds

> Generated: 2026-06-27T21:37:00+02:00
> Auditor: issue-orchestrator (read-only)

---

## Option A — #215 / PR #218 (Stop/Ask GATE_APPROVE)

### What It Is
Merge PR #218: integrate Stop/Ask policy via `GATE_APPROVE` runtime hook.

### Current State
- PR #218: OPEN, not draft, 12 days stale
- 7 files, +1847 insertions, 97 passing tests
- CodeRabbit: 9 non-blocking comments
- Human review: NOT DONE
- Mergeable: UNKNOWN

### When to Choose
- When #308 is blocked by #215 (TRUE — it is)
- When PR #218 is salvageable (TRUE — it is)
- When Runtime-Safety (Stop/Ask) has priority (TRUE — it does for Real Mode)

### What Needs to Happen
1. Address or acknowledge CodeRabbit comments (9 non-blocking)
2. Verify mergeability against current main
3. Run local gates on branch
4. Obtain human review and approval
5. Merge PR #218
6. Post evidence to #215 and #308

### Risk: LOW
- Contained scope (7 files, packages/sandbox/ only)
- Tests exist and pass (97/97)
- review-agent gave PASS
- No blocking review findings

### Effort: LOW
- Code already written and tested
- ~30 minutes: review comments, local merge test, re-run gates

### Recommendation
**Best first step.** Unblocks #215 with minimal effort. Prerequisite for all other gates.

---

## Option B — #244 (Runtime Workspace Cleanup)

### What It Is
Implement `destroyWorkspace`, `lockWorkspace`, `unlockWorkspace`, `isLocked` on both GitWorkspaceAdapter implementations.

### Current State
- Interface declared in `packages/shared/src/interfaces.ts` ✅
- Implementation: ABSENT on main
- PR #255: CLOSED, CONFLICTING — code exists on branch
- 13 tests existed on closed PR

### When to Choose
- When workspace cleanup is missing (TRUE)
- When Real Mode without cleanup would risk data (TRUE)
- After #215 is resolved (recommended)

### What Needs to Happen
1. Recover workspace cleanup code from `positron/issue-243-p0-runtime-safety` branch
2. Apply to current main
3. Run 13 workspace-cleanup tests
4. Wire CLEANUP phase into state machine
5. Verify clean and locked workspaces in integration

### Risk: MEDIUM
- Data loss risk if destroyWorkspace is buggy
- Path traversal must be prevented
- Race conditions in multi-process scenarios

### Effort: MEDIUM
- Code exists on branch but needs recovery and rebase
- ~2-3 hours: recovery, rebase, testing, wiring

### Recommendation
Second step after #215. Cannot skip — Real Mode without workspace cleanup risks disk leaks.

---

## Option C — #245 (requiresAuditLog Enforcement)

### What It Is
Enforce `requiresAuditLog: true` at runtime in Tool Gateway — block write/destructive tools without audit log configuration.

### Current State
- `requiresAuditLog` field: Type may exist, runtime enforcement ABSENT
- PR #255: CLOSED, CONFLICTING — code exists on branch
- 10 tests existed on closed PR
- Gate 9 + BLOCK_REASONS.AUDIT_LOG_REQUIRED on branch

### When to Choose
- When tools can run without audit trail (TRUE — they can)
- When DSGVO compliance needs audit enforcement (TRUE)
- After #215 and #244 are resolved (recommended)

### What Needs to Happen
1. Recover audit enforcement code from closed PR #255 branch
2. Apply Gate 9 to tool-gateway gateway.ts
3. Add BLOCK_REASONS.AUDIT_LOG_REQUIRED to types
4. Run 10 audit-enforcement red tests
5. Scanner warnings for missing audit config

### Risk: MEDIUM
- Could incorrectly block legitimate tools
- DSGVO-relevant — audit trail is legal requirement

### Effort: MEDIUM
- Code exists on branch but needs recovery
- ~2 hours: recovery, rebase, testing

### Recommendation
Third step. Important but less blocking than #215 (no gate at all) and #244 (no cleanup).

---

## Option D — #246 (GateType Layers Enforcement)

### What It Is
Implement GateEvaluator registry with `evaluateGates()` and `tryTransitionWithGates()` — enforce all 8 GateTypes at runtime in the pipeline loop.

### Current State
- GateType values: NOT found on main (grep returned no matches for `GateType`)
- Runtime enforcement: ABSENT
- PR #255: CLOSED, CONFLICTING — code exists on branch
- 21 tests existed on closed PR
- PHASE_GATE_REQUIREMENTS map on branch

### When to Choose
- When gate classes are not runtime-enforced (TRUE — they aren't)
- After other gates are implemented (recommended — enforcement without gates is meaningless)

### What Needs to Happen
1. Define 8 GateType values in shared types
2. Implement GateEvaluator registry
3. Wire `tryTransitionWithGates()` into pipeline
4. Define PHASE_GATE_REQUIREMENTS
5. Run 21 gate-enforcement tests

### Risk: HIGH
- Misconfigured gates could block entire pipeline
- Core state machine modification
- Security gate failures must never be overridden

### Effort: HIGH
- Most complex blocker — touches core state machine and pipeline
- ~4-6 hours: types, registry, enforcement, wiring, testing

### Recommendation
Last blocker. This is the enforcement layer that makes all other gates actually work. Implement AFTER #215, #244, #245 are on main so there are actual gates to enforce.

---

## Option E — #248 (LivingEvidencePortfolio UI)

### What It Is
Display LivingEvidencePortfolio in Operator Dashboard — pure frontend UI, no runtime changes.

### Current State
- #248: OPEN, `approval:not-required`, labels: `enhancement`, `P1`, `frontend`, `ui`
- SAFE — no gate code, no pipeline changes
- Uses existing `shared/src/evidence-portfolio/portfolio-updater.ts` data

### When to Choose
- When owner wants visible product progress while #308 is blocked
- When a GREEN_SAFE UI run is preferred over runtime validation
- When #308 still blocked and a safe alternative is needed

### What Needs to Happen
1. Build UI component displaying portfolio data
2. Wire into Operator Dashboard
3. Add tests
4. No pipeline changes, no gates, no runtime
5. GREEN_SAFE — can be implemented now

### Risk: VERY LOW
- Pure frontend, no runtime, no pipeline changes
- `approval:not-required`

### Effort: LOW-MEDIUM
- ~2-3 hours: UI component, API integration, tests

### Recommendation
Best GREEN_SAFE alternative if owner prefers visible progress while #308 blockers are being resolved. Can be done in parallel with #215.

---

## Recommendation

```text
NEXT_RECOMMENDED_BUILD: #215
```

### Priority Order

1. **#215 (NOW):** Merge PR #218 — fastest unblock, lowest risk, code exists
2. **#244 (NEXT):** Recover workspace cleanup — safety prerequisite for Real Mode
3. **#245 (THEN):** Recover audit enforcement — DSGVO compliance
4. **#246 (LAST):** Recover GateType enforcement — makes all gates enforceable
5. **#248 (PARALLEL):** LivingEvidencePortfolio UI — can be done anytime, GREEN_SAFE

### Why #215 First

1. PR #218 already exists with working code and tests
2. Lowest implementation effort (~30 min to review + merge)
3. Most immediately needed — #308 Gate Assembly requires GATE_APPROVE
4. Unblocks the most natural progression (#215 → #244 → #245 → #246)
5. The Stop/Ask policy is the first gate that intercepts dangerous actions

### Why Not Skip to #244/#245/#246

PR #255 (which contained all three) was CLOSED with CONFLICTING status and 112 files. It bundled the #229 architecture chain with the P0 safety work, making it too large to merge cleanly. Recovering individual pieces (#244, #245, #246 separately) will be cleaner and safer.

### Why Not #248 First

#248 is safe and can be done anytime, but it doesn't unblock #308. If the goal is to progress toward Real Mode, the blocker chain must be resolved. #248 is a parallel option for visible progress.
