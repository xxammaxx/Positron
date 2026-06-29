# Phase 2 — Next Build Recommendation

**Generated:** 2026-06-29T12:00:00Z  
**Orchestrator:** issue-orchestrator

---

## #308 Blocker Status (Post-Merge)

| Blocker | Status |
|---------|--------|
| #215 (GATE_APPROVE) | **CLOSED** |
| #244 (Workspace Cleanup) | **CLOSED** |
| #245 (requiresAuditLog) | **CLOSED** |
| #246 (GateType Enforcement) | **CLOSED** (merged) |

**All original #308 blockers are now closed.** ✅

---

## Remaining Constraints for #308

Before #308 Full Real Mode can begin, a fresh Readiness Recheck should verify:

1. All Runtime Safety Layers present on main
2. GATE_APPROVE (#215) — verified on main
3. Workspace Cleanup (#244) — verified on main
4. requiresAuditLog (#245) — verified on main
5. GateType Enforcement (#246) — verified on main
6. Fake/Dry-Run mode completeness
7. Real mode environment variables NOT set
8. Real external tools NOT invoked yet

---

## Next Build Candidates

| Priority | Candidate | Rationale |
|----------|-----------|-----------|
| **1** | **#308 — Readiness Recheck** | All blockers closed. Must verify all safety layers are present on main before any Real Mode pilot. |
| 2 | #248 — LivingEvidencePortfolio UI | UI improvement — lower priority than safety verification |
| 3 | #304 — Playwright tracing flake | Bug fix — can be done in parallel |
| 4 | Follow-up: Wire `pre_run`/`pre_push` | Future enhancement — not blocking |
| 5 | Follow-up: Wire `MERGE→DONE` gated transition | Future enhancement — evidence collected at earlier phases |

---

## Recommendation

```
NEXT_RECOMMENDED_BUILD: #308_READINESS_RECHECK
```

**Reasoning:** After #215, #244, #245, and #246 are all merged and closed, the original #308 blockers are resolved. However, before any Full Real Mode pilot, a fresh #308 Readiness Recheck must prove all Runtime Safety Layers are present on main and sufficiently wired. This is a prerequisite safety gate before real external tools are invoked.

**Note:** The Readiness Recheck should NOT run Full Real Mode. It should verify the presence and wiring of all safety layers while remaining in fake/dry-run mode.
