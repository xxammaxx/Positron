# Portfolio Gap Discovery — Created Missing Issues

## Status

```
MISSING_ISSUES_CREATION_STATUS: CREATED
```

## Issues Created

### #305 — Evidence Portfolio: Automate post-run capability and limitation updates
- **URL:** https://github.com/xxammaxx/Positron/issues/305
- **Category:** B. Agent Orchestration / D. Evidence Portfolio
- **Risk Class:** GREEN_SAFE
- **Priority:** P2
- **Labels:** enhancement, architecture, P2
- **Why new:** #248 covers DISPLAY of portfolio, not AUTOMATION. #253 (CLOSED) was manual one-time update. No issue covers automated post-run portfolio refresh.
- **Dependencies:** Related to #248, #247 (non-blocking)
- **Recommended order:** 3rd (after docs sync and #304)

### #306 — Backlog Hygiene: Define milestones, normalize labels, and add issue type taxonomy
- **URL:** https://github.com/xxammaxx/Positron/issues/306
- **Category:** E. Documentation / Repo Hygiene
- **Risk Class:** GREEN_SAFE
- **Priority:** P2
- **Labels:** documentation, github, approval:not-required, P2
- **Why new:** #252 (CLOSED) added basic templates but no milestones. #211 covers README presentation but not label taxonomy. No milestone exists. Label set has 70+ entries with duplicates.
- **Dependencies:** Related to #211 (non-blocking)
- **Recommended order:** 2nd (low risk, high value for AI readability)

### #307 — Docs: Sync all status docs, README, API overview, changelog, and evidence index with post-closeout reality
- **URL:** https://github.com/xxammaxx/Positron/issues/307
- **Category:** E. Documentation / Repo Hygiene
- **Risk Class:** GREEN_SAFE
- **Priority:** P2
- **Labels:** documentation, approval:not-required, P2
- **Why new:** #251 covers ONLY api-overview for #229 endpoints. #211 covers README screenshots/presentation. No issue covers comprehensive documentation reality sync (current-capabilities, known-limitations, evidence-index, CHANGELOG, api-overview beyond #229).
- **Dependencies:** Coordinate with #251 on api-overview scope
- **Recommended order:** 1st (highest documentation drift, pure docs, no risk)

### #308 — Validation: Supervised Full Real Mode pilot with combined approval gates
- **URL:** https://github.com/xxammaxx/Positron/issues/308
- **Category:** A. Core Runtime / Safety
- **Risk Class:** YELLOW_VALIDATE
- **Priority:** P1
- **Labels:** enhancement, architecture, safety, approval:decision-needed, P1
- **Why new:** No single validation issue exists for end-to-end supervised Real Mode. #279 (CLOSED) proved controlled probe works. #215 (GATE_APPROVE) and #244-#246 (P0 gates) are prerequisites but no pilot issue combines them for validation.
- **Dependencies:** BLOCKED BY #215 (GATE_APPROVE/PR #218), #244, #245, #246
- **Recommended order:** 9th (last, after all P0 safety gates are implemented)

## Detailed Per-Issue Evidence

### #305 Rationale
- **Background:** After each run, evidence is collected manually. Portfolio docs drift.
- **Existing coverage check:** #248 (display only), #253 (manual, CLOSED), #247 (trace/eval, not portfolio)
- **Why not USE_EXISTING:** None of the existing issues cover automation of portfolio updates post-run.
- **Validation:** Read #248 body — "Display LivingEvidencePortfolio in Operator Dashboard" is about UI rendering, not automated update logic.

### #306 Rationale
- **Background:** 0 milestones, 70+ labels with duplicates, no type taxonomy.
- **Existing coverage check:** #252 (CLOSED, templates only), #211 (presentation only)
- **Why not USE_EXISTING:** #252 is closed and didn't include milestones. #211 is about README/screenshots.
- **Validation:** `gh api repos/xxammaxx/Positron/milestones` returned empty array. Label list confirmed `P0`/`P1`/`P2` AND `priority: high`/`medium`/`low` both exist.

### #307 Rationale
- **Background:** 6 documentation files are stale, 2 are missing, badges are wrong.
- **Existing coverage check:** #251 (api-overview #229 only), #211 (screenshots/presentation only)
- **Why not USE_EXISTING:** #251 scope is too narrow (one file, one issue's endpoints). #211 scope is about presentation, not capability accuracy.
- **Validation:** Confirmed current-capabilities.md references #268 as "Open". Confirmed evidence-index.md does not exist. Confirmed CHANGELOG v0.2.0/v0.3.0 files absent from `docs/changelog/`.

### #308 Rationale
- **Background:** Full supervised Real Mode is not validated. All pieces exist as issues but no integration pilot.
- **Existing coverage check:** #215 (GATE_APPROVE hook), #244-#246 (individual P0 gates)
- **Why not USE_EXISTING:** Each existing issue covers ONE gate. No issue covers the integration validation of ALL gates together in a supervised real run.
- **Validation:** Rudolph Beacon (#279) Phase 17-20 confirms "Full Real Mode not tested (separate optional follow-up)." No issue # exists for this follow-up.

## Issues NOT Created (Covered by Existing)

| Gap | Why Not Created | Reference |
|-----|----------------|-----------|
| E2E tracing flake | #304 already OPEN | — |
| api-overview #229 endpoints | #251 already OPEN | — |
| CT-120 browser smoke | #250 already OPEN | — |
| Portfolio display | #248 already OPEN | — |
| Infra state auto-populate | #249 already OPEN | — |
| Trace/Eval aggregation | #247 already OPEN | — |
| GateType enforcement | #246 already OPEN | — |
| Audit log enforcement | #245 already OPEN | — |
| Workspace cleanup | #244 already OPEN | — |
| Orchestrator baseline | #243 already OPEN (epic) | — |
| MCP/OpenCode bootstrap | #229 already OPEN (epic) | — |
| GATE_APPROVE runtime | #215 already OPEN, PR #218 exists | — |
| Repo presentation | #211 already OPEN | — |
| Operator Cockpit MVP | Overlaps #248, #229, #224 — comment on existing | YELLOW_REVIEW |
| Reverse-PRD productization | Overlaps #229, #243 — comment on existing | YELLOW_REVIEW |
| CodeRabbit external removal | Owner action, not dev issue | OWNER_ACTION |
| README badge update alone | Merged into #307 | — |
