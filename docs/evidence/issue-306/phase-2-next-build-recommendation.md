# Phase 2 Next Build Candidate Recommendation — Issue #306

**Generated:** 2026-06-27T15:30:00+02:00

---

## Build Candidates

### 1. #305 — Evidence Portfolio: Automate post-run capability updates
- **Type:** `type:feature`, infrastructure automation
- **Why:** After #307 (docs sync) and #306 (backlog hygiene), documentation and governance are updated. #305 prevents drift by automating capability/limitation updates after each run.
- **Risk:** GREEN_SAFE
- **Alignment:** Drift prevention directly after governance/documentation updates

### 2. #304 — Playwright tracing lifecycle flake
- **Type:** `type:bug`, CI/E2E quality
- **Why:** Flaky E2E tests undermine confidence. Fixing the flake improves CI reliability.
- **Risk:** GREEN_SAFE (test-only fix)
- **Alignment:** CI quality improvement

### 3. #308 — Supervised Full Real Mode pilot
- **Type:** `type:research` / `type:validation`
- **Why:** Tests the Positron orchestration with real external tooling under supervision.
- **Risk:** YELLOW_REVIEW (real-mode operations require monitoring)
- **Alignment:** Runtime validation / capability demonstration

### 4. #248 — Display LivingEvidencePortfolio in Operator Dashboard
- **Type:** `type:feature`, UI
- **Why:** Makes evidence visible to operators. High user-facing value.
- **Risk:** GREEN_SAFE
- **Alignment:** UI visibility / operator experience

### 5. #251 — API overview #229 endpoint sync
- **Type:** `type:docs`, API documentation
- **Why:** Ensures API docs match actual implementation.
- **Risk:** GREEN_SAFE
- **Alignment:** Documentation accuracy

---

## Recommendation

```text
Default recommendation: #305 — Evidence Portfolio: Automate post-run capability updates
```

### Rationale

After completing #307 (documentation sync) and #306 (backlog hygiene), the project's governance and documentation foundations are now solid. The NEXT most impactful step is **preventing drift**:

1. #307 updated all documentation to match current reality
2. #306 established the label taxonomy, milestones, and issue template infrastructure
3. **#305 ensures this work stays accurate** by automating capability/limitation updates after every run

Without #305, the governance gains from #306 and #307 will decay over time as new runs modify the project state without updating the documentation.

### Alternative Paths

- **If CI reliability is a blocker:** Do #304 first (fix Playwright flake), then #305
- **If real-mode validation is needed for the next milestone:** Do #308 as a research spike
- **If operator visibility is the priority:** Do #248 for the dashboard

### Dependency Chain

```
#305 (automation) → future runs automatically maintain capability docs
#304 (flake fix) → CI becomes more reliable for all subsequent PRs
#308 (real mode) → validates the orchestrator for production-like usage
#248 (dashboard) → makes evidence visible to operators
#251 (API docs) → keeps API references accurate
```

---

## Classification

```text
NEXT_BUILD_RECOMMENDATION: ISSUE_305 — Evidence Portfolio
```

**Confidence:** 0.90 — Strong alignment with post-governance drift prevention, but other candidates are equally valid depending on priority focus.
