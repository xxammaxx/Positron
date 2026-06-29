# Issue #308 Phase C — Readiness Decision

**Generated:** 2026-06-29T10:00:00+02:00
**Mode:** Phase C Readiness Recheck — NO Real Mode

---

## Decision Matrix

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1 | Phase B merged on main | ✅ YES | PR #318 MERGED, SHA 9461fa1 |
| 2 | onAudit server wiring ready | ❌ NO | `ToolGateway.onAudit` is never wired by server/worker |
| 3 | onAudit blocking for local temp probe? | ✅ NOT BLOCKING | Gateway is unused; local probe doesn't need it |
| 4 | pre_run/pre_push status acceptable | ✅ YES | Both exist but not in PHASE_GATE_REQUIREMENTS; push blocked by env var |
| 5 | MERGE→DONE acceptable for no-merge probe | ✅ YES | Raw transition doesn't matter if merge is never attempted |
| 6 | Real Mode blocked by default | ✅ YES | All adapters default to fake; multi-layer defense |
| 7 | Push blocked by default | ✅ YES | POSITRON_ENABLE_PUSH defaults to false |
| 8 | Merge blocked by default | ✅ YES | POSITRON_ENABLE_MERGE + KILL_SWITCH |
| 9 | External tools sandboxed | ✅ YES | Fake/Real adapter pattern with per-adapter env vars |
| 10 | Workspace cleanup ready | ✅ YES | State machine integrated; all terminal phases trigger cleanup |
| 11 | Rollback plan ready | ✅ YES | Temp workspace cleanup is trivially reversible |
| 12 | Audit persistence ready | ❌ PARTIAL | No runtime audit sink; gateway is unused |
| 13 | No secrets | ✅ YES | Verified — no .env contents, no token leakage |
| 14 | No real mode executed in this run | ✅ YES | Only code/docs/tests; no real mode |
| 15 | Local gates green | ⏳ PENDING | To be verified in Task 12 |
| 16 | All 8 phases audit tasks complete | ✅ YES | Tasks 1-10 executed |
| 17 | No RED_HOLD conditions | ✅ YES | No critical safety gaps found |

---

## Blocking Assessment

### What Blocks Full Controlled Real Probe?

| Blocker | Status | Reason |
|---------|--------|--------|
| onAudit server wiring | ⚠️ PARTIAL | Missing for full audit trail, but NOT blocking for local temp workspace probe (gateway is unused) |
| MERGE→DONE raw transition | ✅ NOT BLOCKING | Merge is prohibited in probe scope |
| pre_run wiring | ✅ NOT BLOCKING | No phase requires pre_run; push enforced by env var |
| External tool sandbox | ✅ NOT BLOCKING | Multi-layer defense; all writes blocked by default |
| Real mode kill-switches | ✅ NOT BLOCKING | All active by default |
| Workspace cleanup | ✅ NOT BLOCKING | Integrated and tested |

### What Blocks Full Real Mode (Future)?

| Blocker | Issue Needed? |
|---------|---------------|
| onAudit server wiring | YES — before any production run |
| MERGE→DONE gated transition | YES — before any merge-capable run |
| Tool Gateway runtime integration | YES — before full pipeline use |
| Multi-process workspace lock | YES — for production/cluster |
| Audit persistence | YES — for DSGVO compliance |

---

## Decision

### For Controlled Local Temp Workspace Probe (Option A):

```text
ISSUE_308_PHASE_C_READINESS_DECISION: READY_FOR_CONTROLLED_REAL_PROBE_WITH_OWNER_APPROVAL
```

**Justification:**
- All critical safety mechanisms are active by default (push, merge, kill-switch)
- Workspace operations can be restricted to a temp directory
- Cleanup is integrated and tested
- No single env var enables dangerous operations
- The missing `onAudit` server wiring is not blocking because the ToolGateway is not used at runtime — the local probe can capture evidence via file logs
- The MERGE→DONE raw transition doesn't affect a no-merge probe

### For Full Real Mode (Future):

```text
BLOCKED_BY_ONAUDIT_WIRING + BLOCKED_BY_MERGE_DONE_TRANSITION
```

Full Real Mode needs:
1. ToolGateway integrated at runtime with audit sink
2. MERGE→DONE gated transition
3. Multi-process workspace lock (for production)

---

## Scope Reiteration

This readiness decision enables:

✅ **A local temp workspace probe** with:
- Real file system writes (bounded to temp dir)
- Fake speckit/opencode adapters
- Real cleanup verification
- No push, no merge, no PR, no GitHub writes
- Owner approval required

This does NOT enable:

❌ Full Real Mode
❌ Production repo usage
❌ Real speckit/opencode execution
❌ GitHub writes via pipeline
❌ Merge to main
❌ Push to remote
❌ Workflow execution

---

## Confidence

**HIGH (0.90)** — Based on exhaustive code audit across all packages and apps. The identified gaps (onAudit wiring, MERGE→DONE) are real but not blocking for the minimal probe scope. Confidence is lowered from Phase B's 0.95 due to the onAudit integration gap being a genuine architectural limitation.

---

## Classification

```text
ISSUE_308_PHASE_C_READINESS_DECISION: READY_FOR_CONTROLLED_REAL_PROBE_WITH_OWNER_APPROVAL
```
