# Issue #244 — Next Blocker Recommendation

**Timestamp:** 2026-06-28T11:04:00+02:00
**Agent:** issue-orchestrator

---

## Remaining #308 Blockers

After completing #215 and #244, the remaining blockers for #308 (Supervised Full Real Mode pilot) are:

| Issue | Title | Priority | Status |
|-------|-------|----------|--------|
| #245 | Enforce requiresAuditLog in Tool Gateway Runtime | P0 | OPEN, approval:required |
| #246 | Enforce GateType Layers in Pipeline Loop | P0 | OPEN, approval:required |
| #308 | Supervised Full Real Mode pilot | P1 | OPEN, blocked |

## Recommendation

```text
NEXT_RECOMMENDED_BUILD: #245
```

**Rationale:**

1. After #244 (Workspace Cleanup), the runtime safety infrastructure is in place: workspaces are cleaned up, locks prevent concurrent access, and CLEANUP runs after terminal phases.

2. **#245 (requiresAuditLog enforcement)** is the logical next step. It enforces that tools marked with `requiresAuditLog` actually produce audit trail entries before execution. This is a runtime safety gate that builds on the existing Tool Gateway infrastructure.

3. **#246 (GateType Layers enforcement)** should follow #245. GateType layers (Layer1 action, Layer2 review, Layer3 human) depend on the audit log being enforced first, since auditability is a prerequisite for layered gate evaluation.

4. **#308 (Full Real Mode)** requires both #245 and #246 to be complete before a supervised pilot can begin, as the combined approval gates (audit log + gate layers) form the safety net for real-mode execution.

## Dependency Chain

```
#244 (Workspace Cleanup) ✅ DONE
    ↓
#245 (requiresAuditLog enforcement) ← NEXT
    ↓
#246 (GateType Layers enforcement)
    ↓
#308 (Supervised Full Real Mode pilot)
```

## Owner Action Required

- Review and approve #245 for implementation
- Issue `/approve scope=this-issue` on #245 to unblock
