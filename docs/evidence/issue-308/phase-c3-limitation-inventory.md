# Phase C3 — Limitation Inventory

## Known Limitations L1–L7

Seven known limitations were identified across Phase C2, C2b, and Phase C (readiness recheck). Each is classified below.

---

## L1: onAudit Server/Worker Wiring fehlt

| Field | Value |
|-------|-------|
| **Description** | `ToolGateway.onAudit` callback exists in the gateway layer (defined in #245) but is NOT wired into the server/worker runtime. Audit events are generated but have no runtime sink. This is a safety gap for Phase D (requires audit persistence). |
| **Evidence Source** | Phase C Readiness Recheck (`phase-c-onaudit-server-wiring-audit.md`), Phase C2 Safety Audit |
| **Risk for Local Probes** | LOW — Local probes don't need server/worker runtime. Audit can be verified from file/direct inspection. |
| **Risk for Phase D** | MEDIUM — Phase D needs audit persistence. Without onAudit wired, audit events may not reach a persistent sink. |
| **Risk for Full Real Mode** | HIGH — Full Real Mode requires complete audit trail with runtime persistence. |
| **Existing Issue** | ✅ **#322** — "Issue #308 Follow-up: Wire ToolGateway onAudit into server/worker runtime" (OPEN) |
| **New Issue Needed** | NO — #322 already exists |
| **Recommendation** | **YELLOW_VALIDATE** — Wire before Phase D if audit persistence is required. Not blocking for local-only probes. |

---

## L2: pre_run/pre_push nicht produktiv verdrahtet

| Field | Value |
|-------|-------|
| **Description** | `pre_run` and `pre_push` exist as GateType enum values (defined in #246) but are NOT wired into PHASE_GATE_REQUIREMENTS. It is unclear whether they apply to Positron's pipeline at all. |
| **Evidence Source** | Phase 2 Readiness Recheck, Phase C Readiness Recheck (`phase-c-pre-run-pre-push-audit.md`) |
| **Risk for Local Probes** | NONE — Local probes don't push or run external pipelines. |
| **Risk for Phase D** | LOW — Phase D may not involve git push. `.pre_push` is a gate for push operations, which are separately blocked by `POSITRON_ENABLE_PUSH` env var. |
| **Risk for Full Real Mode** | LOW-MEDIUM — Depends on whether Full Real Mode includes push operations. |
| **Existing Issue** | ✅ **#323** — "Issue #308 Follow-up: Decide and document pre_run/pre_push GateType applicability" (OPEN) |
| **New Issue Needed** | NO — #323 already exists |
| **Recommendation** | **GREEN_SAFE / YELLOW_VALIDATE** — Decision needed. If not applicable, document in ADR. If applicable, wire before push-including real mode. |

---

## L3: MERGE→DONE raw transition

| Field | Value |
|-------|-------|
| **Description** | The MERGE→DONE phase transition uses `raw transition()` instead of `tryTransitionWithGates()`. This means DONE can be reached without evidence verification. |
| **Evidence Source** | Phase 2 Readiness Recheck, Phase C Readiness Recheck (`phase-c-merge-done-transition-audit.md`) |
| **Risk for Local Probes** | NONE — Local probes don't reach MERGE or DONE states. |
| **Risk for Phase D** | MEDIUM — If Phase D verifies MERGE readiness, a raw transition could allow premature DONE without evidence. |
| **Risk for Full Real Mode** | HIGH — Full Real Mode requires evidence-gated DONE. |
| **Existing Issue** | ✅ **#321** — "Issue #308 Follow-up: Gate MERGE->DONE transition with evidence_required" (OPEN) |
| **New Issue Needed** | NO — #321 already exists |
| **Recommendation** | **YELLOW_VALIDATE** — Gate before Phase D if MERGE→DONE is in scope. Critical for Full Real Mode. |

---

## L4: Workspace Lock process-scoped

| Field | Value |
|-------|-------|
| **Description** | The workspace lock from #244 is process-scoped. In multi-process scenarios (parallel agent runs, concurrent temp workspaces), this lock cannot prevent cross-process collisions. |
| **Evidence Source** | Phase 2 Readiness Recheck, Phase C Readiness Recheck |
| **Risk for Local Probes** | NONE — Single-process probes are not affected. |
| **Risk for Phase D** | LOW — Phase D is likely single-process validation. |
| **Risk for Full Real Mode** | MEDIUM — Multi-agent parallel runs could collide if workspace lock is process-scoped. |
| **Existing Issue** | ✅ **#324** — "Issue #308 Follow-up: Evaluate persistent workspace lock for multi-process safety" (OPEN) |
| **New Issue Needed** | NO — #324 already exists |
| **Recommendation** | **YELLOW_VALIDATE** — Evaluate before Phase D if multi-process is in scope. Accept risk with documentation if single-process only. |

---

## L5: Pre-existing dist artifacts

| Field | Value |
|-------|-------|
| **Description** | `packages/shared/dist/` contains ~300 compiled JS, declarations, sourcemaps from prior `npm run build` cycles. These are modified in the working tree, causing `git status` to show a dirty workspace. |
| **Evidence Source** | Phase C2 Reality Refresh, Phase C2 Cleanup Verification, Phase C3 Reality Refresh |
| **Risk for Local Probes** | NONE — Dist artifacts don't affect probe operations. |
| **Risk for Phase D** | LOW — May cause noise in working tree checks but doesn't affect runtime safety. |
| **Risk for Full Real Mode** | LOW — Aesthetic/hygiene issue only. |
| **Existing Issue** | ✅ **#325** — "Cleanup: Resolve pre-existing dist artifacts in working tree" (OPEN) |
| **New Issue Needed** | NO — #325 already exists |
| **Recommendation** | **GREEN_SAFE** — Clean or gitignore. Not blocking for any phase. |

---

## L6: PR #313 stale/obsolete

| Field | Value |
|-------|-------|
| **Description** | PR #313 (docs/issue-308-readiness-audit) was created June 27 as a readiness audit draft. Its base is `35c4225` (4 days stale). Its blocker audit claims #215/#244/#245/#246 are OPEN — all four are now CLOSED on main. The PR content is factually obsolete. |
| **Evidence Source** | `gh pr view 313`, Phase C3 Reality Refresh |
| **Risk for Local Probes** | NONE — PR #313 is not part of the probe pipeline. |
| **Risk for Phase D** | LOW — PR #313 could cause confusion if not resolved. |
| **Risk for Full Real Mode** | LOW — Stale historical draft, not blocking. |
| **Existing Issue** | NO — PR, not an issue. Decision package prepared in `phase-c3-pr-313-decision-package.md`. |
| **New Issue Needed** | NO — PR close/label is Owner action, not a new issue. |
| **Recommendation** | **NO_ACTION_REQUIRED** by AI. **OWNER_ACTION_ONLY** for PR close. Recommend CLOSE_AS_OBSOLETE. |

---

## L7: CodeRabbit external app / auto-comments trotz Decommission

| Field | Value |
|-------|-------|
| **Description** | CodeRabbit was decommissioned repo-internally (Phase 17 of #279, commit `5494851`). No `.coderabbit.yaml` or `.coderabbit/` directory exists. However, the external GitHub App (`coderabbitai`) continues posting automated comments on PRs. These are non-gate, non-blocking noise. |
| **Evidence Source** | Phase C3 CodeRabbit External Noise Audit, PR #320 comment, PR #313 comment |
| **Risk for Local Probes** | NONE — No effect on local operations. |
| **Risk for Phase D** | NONE — CodeRabbit is not a gate. External comments are advisory-only. |
| **Risk for Full Real Mode** | NONE — CodeRabbit is decommissioned, no functional impact. |
| **Existing Issue** | ✅ **#326** — "Owner Action: Remove or fully disable CodeRabbit external app for Positron" (OPEN) |
| **New Issue Needed** | NO — #326 already exists |
| **Recommendation** | **OWNER_ACTION_ONLY** — Owner must remove/disable the GitHub App via Settings. Not blocking for any phase. |

---

## Overall Classification

```text
ISSUE_308_PHASE_C3_LIMITATION_STATUS: COMPLETE
```

**Summary Table:**

| ID | Limitation | Risk | Existing Issue | Classification |
|----|-----------|------|---------------|---------------|
| L1 | onAudit Server Wiring | MEDIUM | #322 | YELLOW_VALIDATE |
| L2 | pre_run/pre_push not wired | LOW | #323 | GREEN_SAFE / YELLOW_VALIDATE |
| L3 | MERGE→DONE raw transition | MEDIUM | #321 | YELLOW_VALIDATE |
| L4 | Process-scoped workspace lock | LOW | #324 | YELLOW_VALIDATE |
| L5 | Pre-existing dist artifacts | LOW | #325 | GREEN_SAFE |
| L6 | PR #313 stale/obsolete | NONE | (PR) | NO_ACTION_REQUIRED |
| L7 | CodeRabbit external noise | NONE | #326 | OWNER_ACTION_ONLY |

**All 7 limitations are documented, classified, and tracked. No new issues needed — existing issues #321–#326 cover all action items. PR #313 requires Owner action (close/label), not a new issue.**
