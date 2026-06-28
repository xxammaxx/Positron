# Next Build Candidate Recommendation — Post Issue #305

## Metadata
- **Timestamp:** 2026-06-27T19:37:00Z
- **Run ID:** issue-305-phase-2-next-build
- **Executor:** issue-orchestrator

## Current State After #305 Merge

- `main` is at `5a1d20ea942b59c1304e5942e1648c78758b9fb2`
- Evidence Portfolio Auto-Update utility is on main
- Feature is disabled by default, not integrated with `runFullPipeline`
- Issue #305 is CLOSED

## Candidate Assessment

### 1. #308 — Validation: Supervised Full Real Mode Pilot (YELLOW, P1)

**Argument FOR:**
- #305 created the evidence/status infrastructure but is not productively wired
- #308 validates controlled Real Mode, which is the prerequisite for safe pipeline integration
- Addresses the "Full Real Mode not productively validated" limitation
- Builds on Rudolph Beacon (#279) and the safety architecture
- Paves the way for safe integration of #305's portfolio auto-update into `runFullPipeline`

**Argument AGAINST:**
- Requires GATE_APPROVE (#215) to be functional
- Higher risk than GREEN_SAFE issues
- Owner must be available for manual approvals during pilot

**Focus:** Runtime-Sicherheit, Pipeline-Integration-Vorbereitung

### 2. #248 — Display LivingEvidencePortfolio in Operator Dashboard (GREEN_SAFE, P2)

**Argument FOR:**
- Directly visible product value
- Leverages the evidence/status infrastructure built by #305
- Operator Dashboard gains live capability/limitation visibility
- GREEN_SAFE risk level
- Can be implemented independently of Real Mode

**Argument AGAINST:**
- UI-only feature, no runtime safety improvement
- Dashboard is secondary to pipeline robustness
- Less urgent than closing safety gaps

**Focus:** Sichtbarer Produktnutzen

### 3. #304 — Playwright Tracing Lifecycle Flake (YELLOW, P2)

**Argument FOR:**
- Fixes known E2E instability
- Improves CI signal quality
- Directly addresses a documented limitation

**Argument AGAINST:**
- CI is advisory-only per policy
- Flake is known and stable (not getting worse)
- Does not enable new capabilities

**Focus:** CI-/E2E-Qualität

### 4. #247 — Trace and Eval Aggregation (APPROVAL REQUIRED, —)

**Argument FOR:**
- Creates feedback loop for evaluating AI agent runs
- Complements #305's portfolio updates with actual run metrics
- Foundation for data-driven quality assessment

**Argument AGAINST:**
- Large, complex feature
- Requires approval gate changes
- May need Real Mode foundation first (#308)

**Focus:** Bewertungs-/Feedback-Loop

### 5. #251 — API Overview #229 Endpoint Sync (GREEN_SAFE, P2)

**Argument FOR:**
- Documentation improvement
- Low risk, small scope
- GREEN_SAFE

**Argument AGAINST:**
- Documentation only, no functional improvement
- Doesn't address any active limitations

**Focus:** Dokumentation/API

### 6. #215 / PR #218 — Stop/Ask Policy via GATE_APPROVE (YELLOW, P1)

**Argument FOR:**
- Critical safety gate for Real Mode
- PR #218 already exists (OPEN)
- Required prerequisite for #308
- Infrastructure already partially built

**Argument AGAINST:**
- PR #218 mergeability is UNKNOWN
- May have conflicts with main (was created earlier)
- Requires careful human review of safety policies

**Focus:** Safety-Gate-Härtung

## Recommendation

### Primary: #308 — Supervised Full Real Mode Pilot

**Rationale:**
- #305 created the portfolio infrastructure, but it is not productively wired
- #308 validates controlled Real Mode operations, which is the prerequisite for:
  - Integrating #305's auto-update into `runFullPipeline`
  - Activating the Operator Dashboard (#248) with live data
  - Building trace/eval aggregation (#247) with real run data
- Addresses "Full Real Mode not productively validated" limitation
- Builds on Rudolph Beacon (#279) safety architecture

### Secondary: #248 — Operator Dashboard Portfolio Display

**Rationale:**
- If Owner prioritizes visible product value over runtime safety
- Leverages #305's infrastructure immediately
- GREEN_SAFE, lower risk than #308
- Can be parallel-tracked with #308 since they touch different code

### Dependency Chain

```
#215/PR #218 (GATE_APPROVE) → #308 (Real Mode Pilot) → #305 integration → #248 (Dashboard)
                                                                          → #247 (Trace/Eval)
```

**Default recommendation for Owner decision: #308 or #248, depending on whether the focus is runtime safety foundation or visible product value.**

### Risk Note

Neither #308 nor #248 can be fully productive without the other in the long term:
- #308 without #248: validation runs but no dashboard visibility
- #248 without #308: dashboard exists but no live data

The optimal sequence is #308 first (enable real data), then #248 (display it).
