# Phase C2a — Readiness Decision Audit

## Timestamp
2026-06-29T10:20:00Z (approximated)

## Decision Under Audit

```
ISSUE_308_PHASE_C_READINESS_DECISION: READY_FOR_CONTROLLED_REAL_PROBE_WITH_OWNER_APPROVAL
```

Source: `docs/evidence/issue-308/phase-c-readiness-decision.md`

## Precision Analysis

### What the Decision Body Text Actually Says

The body of `phase-c-readiness-decision.md` (lines 60-62, 89-105) explicitly restricts the decision:

```
This readiness decision enables:
✅ A local temp workspace probe with:
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
```

The body text is **precise and correct**.

### What the Classification Phrase Could Be Misinterpreted As

The phrase `READY_FOR_CONTROLLED_REAL_PROBE` could be read as:

| Interpretation | Accurate? |
|---------------|-----------|
| Ready for any kind of real probe | ❌ NO — only local temp workspace |
| Ready for full real mode | ❌ NO — explicitly blocked |
| Ready for GitHub writes | ❌ NO — push, merge blocked |
| Ready for production repo usage | ❌ NO — only temp workspace |
| Ready for local temp workspace probe | ✅ YES — this is the intended scope |

### Why the Phrase Is Broad

The word "Real" in `CONTROLLED_REAL_PROBE` could suggest:
- Real adapters are active (only git workspace is real; speckit/opencode remain fake)
- Real GitHub writes are possible (they remain blocked)
- Real production repo is used (it's restricted to temp workspace)

### Why It's Not a Red Flag

1. The body text (89 lines) exhaustively disambiguates the scope
2. Every other evidence file (`controlled-probe-scope-proposal.md`, `next-prompt.md`, `report.md`) consistently refers to local temp workspace only
3. The `WITH_OWNER_APPROVAL` suffix indicates a gated, approval-required action
4. The summary.json also correctly records all safety flags as `false`

## Decision Refinement

To eliminate any ambiguity, this Phase C2a report recommends interpreting the decision as:

```
READY_FOR_CONTROLLED_LOCAL_TEMP_WORKSPACE_PROBE_WITH_OWNER_APPROVAL
```

### Scope of the Refined Decision

| Aspect | Status |
|--------|--------|
| **Local temp workspace only** | ✅ Required |
| **No production repo** | ✅ Hard boundary |
| **No GitHub writes (push/PR/merge)** | ✅ Blocked by default |
| **No real speckit/opencode** | ✅ Fake adapters remain |
| **Real GitWorkspaceAdapter** | ✅ Only this adapter goes real |
| **File system writes bounded to temp** | ✅ Workspace boundary |
| **Owner approval required** | ✅ Must be explicit |
| **Full Real Mode** | ❌ BLOCKED_BY_DEFAULT |
| **Merge to main** | ❌ BLOCKED_BY_KILL_SWITCH |
| **Push to remote** | ❌ BLOCKED_BY_DEFAULT |

### Why onAudit Server Wiring Being MISSING Limits to Local Temp Only

The onAudit audit (`phase-c-onaudit-server-wiring-audit.md`) found:
- `ToolGateway.onAudit` is defined but **never wired** by server/worker
- No runtime audit sink exists
- Gate 9 (Audit Enforcement) is theoretical at the gateway level

This means:
- A "broad" real mode probe that involves the full pipeline (with server/worker) would have **no audit trail**
- A local temp workspace probe can capture evidence via **file-based logs** (alternative mechanism)
- Therefore, the probe scope MUST be limited to what can be audited through file logs

### Why Option A Is the Only Ready Option

Option A (Local Temp Workspace Only) is the **only** ready option because:
- ✅ Workspace cleanup is verified and tested
- ✅ Kill-switches are active and fail-closed
- ✅ Push/merge blocked by default
- ✅ File-based audit evidence can be captured
- ✅ No GitHub writes at all
- ✅ Rollback is trivial (delete temp dir)

Option B (Real Local Git Branch) and Option C (GitHub Read-Only API) are either redundant or higher risk.

## Classification

```
PHASE_C_READINESS_DECISION_AUDIT_STATUS: CLEAN_WITH_REPHRASE
```

**Reasoning:**
- The original decision body text is **correct and precise** — it explicitly restricts to local temp workspace probe and lists exact prohibitions
- The classification **phrase** `READY_FOR_CONTROLLED_REAL_PROBE_WITH_OWNER_APPROVAL` is technically correct (it does say "controlled" and "with owner approval") but could be sharpened for precision
- The refined interpretation `READY_FOR_CONTROLLED_LOCAL_TEMP_WORKSPACE_PROBE_WITH_OWNER_APPROVAL` more precisely captures the actual scope
- This is NOT a correction to the Phase C evidence (historical) — it is a **refinement in the Phase C2a audit context**
- The historical evidence files do NOT need to be rewritten; this Phase C2a report carries the refined interpretation forward

**Rule applied:** The phrase `READY_FOR_CONTROLLED_REAL_PROBE` is explicitly restricted to `READY_FOR_CONTROLLED_LOCAL_TEMP_WORKSPACE_PROBE` in the Phase C2a context. Full Real Mode remains BLOCKED_BY_DEFAULT.
