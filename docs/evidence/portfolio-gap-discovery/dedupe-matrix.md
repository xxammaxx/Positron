# Portfolio Gap Discovery — Dedupe Matrix

## Potential New Issue Candidates

Each candidate is checked against existing open/closed issues to prevent duplication.

---

### Candidate 1: Documentation Reality Sync (comprehensive)

**Gap:** README badges stale. current-capabilities.md stale. known-limitations.md stale. api-overview.md incomplete (beyond #229 endpoints). CHANGELOG v0.2.0/v0.3.0 files missing. evidence-index.md missing.

**Existing Open Issues:**
- #251 — "Update api-overview.md with All Issue #229 Endpoints" — covers ONLY api-overview for #229 endpoints, not the broader staleness.
- #211 — "GitHub repo polish with verified screenshots" — covers README presentation and screenshots, not capability/limitation docs sync.

**Existing Closed Issues:**
- #253 — "Update Living Evidence Portfolio with Issue #243 Baseline Capabilities" (CLOSED) — but current docs show no #243 baseline content.
- #254 — "Add CHANGELOG Entries for v0.2.0 and v0.3.0" (CLOSED) — but changelog files not found on main.
- #252 — "GitHub Repo Polish" (CLOSED) — added templates but badges still stale.

**Gap NOT Covered:** Yes. No single issue covers the comprehensive documentation reality sync needed after multiple completed tracks (Rudolph Beacon, CI recovery, post-268 fixes).

**Decision:** CREATE_NEW — but scope carefully to avoid overlapping with #251 and #211.

**Proposed Issue:** "Docs: Sync all status docs, README, API overview, changelog, and evidence index with post-closeout reality"

---

### Candidate 2: Evidence Portfolio Post-Run Auto-Update

**Gap:** After each Positron run, the Living Evidence Portfolio (current-capabilities.md, known-limitations.md, evidence-index.md) should be automatically updated. Currently this is manual.

**Existing Open Issues:**
- #248 — "Display LivingEvidencePortfolio in Operator Dashboard" — display only, not automation.
- #247 — "Add Trace and Eval Aggregation to runFullPipeline" — trace/eval aggregation, not portfolio update.

**Existing Closed Issues:**
- #253 — Manual portfolio update (CLOSED). Did not include automation.

**Gap NOT Covered:** Yes. Automated post-run portfolio capability/limitation update is not covered.

**Decision:** CREATE_NEW.

**Proposed Issue:** "Evidence Portfolio: Automate post-run capability and limitation updates"

---

### Candidate 3: Backlog Hygiene — Milestones, Labels, Taxonomy

**Gap:** No milestones defined. Label set has grown organically (70+ labels). No issue type taxonomy. README badges show stale data.

**Existing Open Issues:**
- #211 — covers screenshots and README presentation, not milestone/label hygiene.
- #251 — covers api-overview only.

**Existing Closed Issues:**
- #252 — "GitHub Repo Polish" (CLOSED) — added templates and basic hygiene but no milestones, no label normalization.

**Gap NOT Covered:** Partially covered. #211 addresses presentation. Milestone creation and label taxonomy normalization is NOT covered by any issue.

**Decision:** CREATE_NEW — specifically for milestones and label taxonomy, excluding README screenshots (#211 owns that).

**Proposed Issue:** "Backlog Hygiene: Define milestones, normalize labels, and add issue type taxonomy"

---

### Candidate 4: Full Real Mode Supervised Validation Pilot

**Gap:** Full supervised Real Mode (actual OpenCode tool execution with human approval gates) is not implemented or validated. Rudolph Beacon (#279) proved controlled real-mode probe works, but the full supervised mode is blocked by missing runtime gates.

**Existing Open Issues:**
- #215 — "Safety: Integrate Stop/Ask Policy via GATE_APPROVE runtime hook" — covers the GATE_APPROVE mechanism (PR #218 exists).
- #244 — "Runtime Workspace Cleanup" — covers workspace isolation enforcement.
- #245 — "Enforce requiresAuditLog" — covers audit log enforcement.
- #246 — "Enforce GateType Layers" — covers gate layer enforcement.

**Existing Closed Issues:**
- #279 — Rudolph Beacon (CLOSED) — controlled real-mode probe, not full supervised mode.

**Gap NOT Covered:** Yes. All the pieces are specified (#215, #244-#246) but no single validation/pilot issue brings them together for an end-to-end supervised Real Mode test.

**Decision:** CREATE_NEW — as a research/validation issue, NOT implementation. Depends on #215 and #244-#246 being resolved first.

**Proposed Issue:** "Validation: Supervised Full Real Mode pilot with combined approval gates"

---

### Candidate 5: Operator Cockpit MVP — Usable Run Control Dashboard

**Gap:** The dashboard has basic features (run list, SSE, pipeline view), but is not a cohesive "operator cockpit" with run control, gate status, evidence browsing, and owner approval workflow in one pane.

**Existing Open Issues:**
- #248 — "Display LivingEvidencePortfolio in Operator Dashboard" — adds one specific widget.
- #229 — "Oversight UI" — specified but not implemented.
- #224 — "Dashboard and Server integration for Tool Monitoring" — tool monitoring only.
- #27 — Operator Dashboard Enhancement (CLOSED, historical).
- #22 — Operator Dashboard and Safety Control UI (CLOSED, historical).

**Gap NOT Covered:** PARTIALLY. Individual widget features exist (#248, #224) but no holistic "make it a usable cockpit" issue. Could be COMMENT_ON_EXISTING on #248 to expand scope.

**Decision:** YELLOW_REVIEW — overlaps significantly with existing issues. Recommend COMMENT_ON_EXISTING on #248 or #229 rather than new issue. If created, must have narrow, non-overlapping scope.

**Proposed Issue (if created):** "Operator Cockpit: Integrate run control, gate status, and evidence browsing in unified dashboard"

---

### Candidate 6: Reverse-PRD / Blueprint-to-Spec Pipeline Productization

**Gap:** The full pipeline from Blueprint/Issue → Reverse-PRD → Spec → Plan → Tasks is specified but not implemented as an end-to-end automated runtime.

**Existing Open Issues:**
- #229 — "Spec Kit Sync" — covers Spec Kit synchronization but as part of a larger epic.
- #243 — "Agentic/Vibe-Coding Baseline" — covers orchestrator capabilities broadly.

**Existing Closed Issues:**
- #205 — "SDD-/Fleet-/OpenCode-Erkenntnisse" (CLOSED) — identified gaps including SpecKit policy expansion.

**Gap NOT Covered:** PARTIALLY. #229 and #243 are broad epics that include this but don't call it out as a specific implementable issue. 

**Decision:** COMMENT_ON_EXISTING — on #229 recommending a sub-issue for Reverse-PRD productization. Or CREATE_NEW as a focused sub-issue of #229.

**Proposed Issue (if created):** "SpecKit: Productize Reverse-PRD and Blueprint-to-Spec pipeline"

---

### Candidate 7: CodeRabbit External App Removal

**Gap:** CodeRabbit is decommissioned repo-internally but the external GitHub App may still be installed on the repository. This is a known open item from Rudolph Beacon Phase 17-20.

**Existing Open Issues:** None.
**Existing Closed Issues:** Referenced in #279 Phase 17/19/20 evidence.

**Decision:** OWNER_ACTION_ONLY — cannot be done by agent. Document as owner reminder, not a new issue.

---

### Candidate 8: Test count update in README badges

**Gap:** README shows "917 tests" but reality is 1571+ tests (after Rudolph Beacon addition).

**Existing Open Issues:**
- #211 — "GitHub repo polish" — could include badge updates.

**Decision:** COMMENT_ON_EXISTING — on #211 to add badge update to scope. Or CREATE_NEW as small GREEN_SAFE task.

**Proposed Issue (if created):** "Docs: Update README badges with current test counts and version"

---

## Final Decision Matrix

| # | Candidate | Decision | Reference |
|---|-----------|----------|-----------|
| 1 | Documentation Reality Sync | CREATE_NEW | — |
| 2 | Evidence Portfolio Auto-Update | CREATE_NEW | — |
| 3 | Backlog Hygiene (Milestones, Labels) | CREATE_NEW | — |
| 4 | Full Real Mode Validation Pilot | CREATE_NEW | Depends on #215, #244-#246 |
| 5 | Operator Cockpit MVP | YELLOW_REVIEW | Overlaps #248, #229. COMMENT_ON_EXISTING instead |
| 6 | Reverse-PRD Productization | COMMENT_ON_EXISTING | On #229 for sub-issue |
| 7 | CodeRabbit External Removal | OWNER_ACTION_ONLY | Not a dev issue |
| 8 | README badge update | CREATE_NEW (included in #1) | Merge into Candidate 1 |

## Issues to CREATE

After deduplication, **4 new issues** will be created:

1. **Docs: Comprehensive documentation reality sync** — GREEN_SAFE
2. **Evidence Portfolio: Automate post-run capability updates** — YELLOW_VALIDATE
3. **Backlog Hygiene: Milestones, label taxonomy, issue templates** — GREEN_SAFE
4. **Validation: Supervised Full Real Mode pilot** — YELLOW_VALIDATE (depends on #215/#244-#246)

**Total new issues: 4** (within the 10-issue limit).

## Gaps NOT requiring new issues (covered by existing)

| Gap | Covered By |
|-----|-----------|
| E2E tracing flake | #304 (OPEN) |
| Playwright tracing lifecycle | #304 (OPEN) |
| api-overview #229 endpoints | #251 (OPEN) |
| CT-120 browser smoke | #250 (OPEN) |
| LivingEvidencePortfolio display | #248 (OPEN) |
| Infrastructure state auto-populate | #249 (OPEN) |
| Trace/Eval aggregation | #247 (OPEN) |
| GateType enforcement | #246 (OPEN) |
| Audit log enforcement | #245 (OPEN) |
| Workspace cleanup | #244 (OPEN) |
| Orchestrator capabilities | #243 (OPEN) |
| MCP/OpenCode bootstrap | #229 (OPEN) |
| Tool monitoring dashboard | #224 (OPEN) |
| GATE_APPROVE runtime | #215 (OPEN), PR #218 |
| Repo presentation/screenshots | #211 (OPEN) |
| Controlled real-mode probe | #279 (CLOSED, COMPLETE) |
| CI infrastructure | #268 (CLOSED, COMPLETE) |
