# Issue #308 Phase C — Follow-up Issues

**Generated:** 2026-06-29T10:00:00+02:00
**Mode:** Phase C Readiness Recheck — NO Real Mode

---

## Existing Issues Search

Before creating new issues, checked for duplicates:

| Search | Result |
|--------|--------|
| `onAudit server` | Only #308 found |
| `pre_run pre_push` | #243 (unrelated), #308 |
| `MERGE DONE transition` | #243 (unrelated), #308 |
| `controlled probe temp workspace` | None |

---

## Gap Analysis

| # | Gap | Severity | Blocks Local Probe? | Existing Issue? | New Issue Needed? |
|---|-----|----------|---------------------|-----------------|-------------------|
| 1 | ToolGateway `onAudit` not wired at runtime | MEDIUM | NO (gateway unused) | None | ⬜ Not urgent for probe |
| 2 | MERGE→DONE raw transition (no gate enforcement) | MEDIUM | NO (no merge in probe) | #246 references | ⬜ Deferred to #246 |
| 3 | pre_run GateType not in PHASE_GATE_REQUIREMENTS | LOW | NO (no phase needs it) | #246 references | ⬜ Deferred to #246 |
| 4 | ToolGateway not integrated in server/worker | MEDIUM | NO (local probe doesn't need) | None | ⬜ Consider for future |
| 5 | Multi-process workspace lock not implemented | LOW | NO (single instance) | #244 mentions | ⬜ Deferred |
| 6 | Audit persistence missing for production | MEDIUM | YES (local file log ok) | None | ⬜ Consider for future |

---

## Decision: No New Follow-up Issues for Phase C

**Reasoning:**

1. **onAudit server wiring**: The gateway is not used at runtime by server/worker. This is an architectural gap but not a blocking one for a local temp workspace probe. A follow-up issue should be created when ToolGateway integration becomes a priority, but for Phase C's scope, it's not blocking.

2. **MERGE→DONE raw transition**: Covered by existing issue #246 (GateType Layers enforcement). Not blocking because merge is prohibited.

3. **pre_run/pre_push**: Also covered by #246. The gate types exist and are test-covered; they're just not wired into pipeline routing. Not blocking.

4. **ToolGateway runtime integration**: This is the larger architectural question. The gateway package exists with comprehensive tests but is never used. Creating an issue for this now would be premature — it should be scoped as part of a broader initiative.

5. All other gaps are either deferred to existing issues or are documented limitations that don't affect Phase C scope.

---

## Recommended Future Issues (NOT created now — for reference)

When the project is ready for Full Real Mode:

```
# NEW — Integrate ToolGateway into server/worker pipeline runtime
# NEW — Wire onAudit server sink for Tool Gateway runtime
# NEW — Replace MERGE→DONE raw transition with gated transition
# NEW — Implement multi-process workspace lock (beyond process-scoped)
# NEW — Add audit persistence layer for production runs
```

---

## Classification

```text
PHASE_C_FOLLOWUP_ISSUES_STATUS: NOT_NEEDED
```

**Justification:** All identified gaps are either:
- NOT blocking for the minimal controlled probe scope
- Already referenced by existing issues (#244, #245, #246)
- Architectural questions better deferred to Full Real Mode planning

No deduplicated new issues are required for Phase C readiness.
