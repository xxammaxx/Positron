# Next Blocker Recommendation — Post Issue #215

## Current Blocker Status for #308

| Issue | Title | State | Priority |
|---|---|---|---|
| ~~#215~~ | ~~GATE_APPROVE runtime hook~~ | ~~CLOSED~~ | ~~P1~~ |
| #244 | Runtime Workspace Cleanup | OPEN | P0, approval:required |
| #245 | requiresAuditLog enforcement | OPEN | P0, approval:required |
| #246 | GateType Layers enforcement | OPEN | P0, approval:required |

## Evaluation

### Candidate 1: #244 — Runtime Workspace Cleanup

**Recommendation: YES**

After #215 (GATE_APPROVE), the next logical blocker for Full Real Mode is workspace safety. Without proper workspace cleanup and locking:
- Multiple concurrent runs could interfere
- Leftover state from prior runs could leak
- Workspace boundaries are not enforced at runtime

#244 is blocking `GitWorkspaceAdapter` cleanup — a critical safety component.

### Candidate 2: #245 — requiresAuditLog enforcement

**Reason to defer:** Should come after workspace is secure. Audit logs need a clean workspace to be meaningful.

### Candidate 3: #246 — GateType Layers enforcement

**Reason to defer:** Gate type enforcement depends on both GATE_APPROVE (#215, done) and audit log infrastructure (#245). Should follow #245.

### Candidate 4: #248 — LivingEvidencePortfolio UI

**Reason to defer:** Non-blocker for Real Mode. UI enhancement.

### Candidate 5: #304 — Playwright tracing flake

**Reason to defer:** Non-blocker for Real Mode. Test infrastructure.

## Recommendation

```
NEXT_RECOMMENDED_BUILD: #244
```

**Rationale:** After #215 GATE_APPROVE is on main, workspace safety (#244) is the most critical remaining blocker for Full Real Mode readiness. It is a P0 with `approval:required` label, and completing it would remove the first of the three remaining #308 blockers.
