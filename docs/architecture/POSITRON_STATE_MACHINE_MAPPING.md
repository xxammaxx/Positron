# Positron State Machine → Fleet/Phase Mapping

<!-- INTERNAL -->
**Date:** 2026-06-09
**Diataxis:** Reference
**Purpose:** Map Positron's 27 state machine phases to the Fleet Orchestrator 10-phase model, SDD concepts, and OpenCode gate model.

---

## Overview

Positron's state machine (`packages/run-state/src/state-machine.ts`) defines 27 Phase values. The Fleet/SDD model describes a more granular 10+ phase pipeline with additional gate states. This document maps between them and identifies where Positron already implements Fleet concepts within existing phases.

---

## Primary Workflow Mapping

| # | Fleet/SDD Phase | Fleet Description | Positron Phase(s) | Implementation | Match |
|---|---|---|---|---|---|
| 1 | specify | Write formal spec | `SPECIFY` | SpecKit adapter → `spec.md` | ✅ Exact |
| 2 | clarify | Clarify ambiguities | `CLARIFY_OPTIONAL` | Optional refinement gate | ✅ Exact |
| 3 | plan | Implementation plan | `PLAN` | SpecKit adapter → `plan.md` | ✅ Exact |
| 4 | checklist | Quality checklist | — | No dedicated phase. Speckit's `checklist` command is unused. `ANALYZE` serves similar purpose post-TASKS | ⚠️ Gap |
| 5 | tasks | Task breakdown | `TASKS` | SpecKit adapter → `tasks.md` | ✅ Exact |
| 6 | analyze | Feasibility analysis | `ANALYZE` | State machine phase | ✅ Exact |
| 7 | review | Pre-implementation review | `REVIEW` | Gate before `IMPLEMENT`, 7 review dimensions | ✅ Exact |
| 8 | implement | Code changes | `IMPLEMENT` | OpenCode adapter with permission profiles | ✅ Exact |
| 9 | verify | Test + validate | `TEST` → `VERIFY` | `TEST`: run tests (max 3 fix loops). `VERIFY`: validate results, diff, evidence | ✅ Aligned |
| 10 | CI | External CI checks | `COMMIT` → `PR_CREATE` | Positron triggers external CI via commit/PR; CI results not in machine state but in external checks | ✅ Aligned |

---

## Gate / Sub-Phase Mapping

These Fleet concepts exist within or between Positron phases, even if not as distinct Phase enum values:

| Fleet Concept | Fleet Model | Positron Implementation | Phase Context |
|---|---|---|---|
| **Verification Contract** | Contract defined before implementation | `docs/reference/verification-contract.md` — contract created between `TASKS` and `ANALYZE`. Not a distinct Phase but a documented sub-gate artifact. | `TASKS` → `ANALYZE` |
| **RED_TESTS** | Tests written before code, must fail initially | Described in `docs/workflows/orchestrierung.md` step 4. Executed during `ANALYZE` → `REVIEW`. Tests are written against acceptance criteria BEFORE `IMPLEMENT`. | `ANALYZE` → `REVIEW` |
| **Sandbox Preview** | Visual diff/preview before commit | Described in orchestrierung step 7. Occurs during `VERIFY`. Diff generated, preview URL if frontend change. | `VERIFY` |
| **Reviewer-Agent** | Post-implementation code review | Described in orchestrierung step 8. `review-agent` subagent evaluates code quality post-`IMPLEMENT`. Currently positioned at `VERIFY` → `COMMIT`. | `VERIFY` → `COMMIT` |
| **Human Approval** | Human decides: approve/revise/abort | `GATE_APPROVE` / `GATE_REVISE` are distinct Phase values. Gate controls in UI (`GateControls.tsx`). | `COMMIT` → `GATE_APPROVE` |
| **Evidence Comment** | Structured completion comment | Described in orchestrierung step 10. GitHub comment with test results, diff, risks. Currently within `COMMIT` phase. | `COMMIT` |
| **Merge Ready** | All gates passed, PR created | `PR_CREATE` → `MERGE`. Kill switch (`POSITRON_MERGE_KILL_SWITCH`) checked before merge. | `PR_CREATE` → `MERGE` |

---

## Current Phase Values (27 Total)

### Workflow Phases (18)
```
text
QUEUED → CLAIMED → REPO_SYNC → ISSUE_CONTEXT → WEB_RESEARCH
→ SPECIFY → CLARIFY_OPTIONAL → PLAN → TASKS
→ ANALYZE → REVIEW → IMPLEMENT
→ TEST → VERIFY → COMMIT
→ PR_CREATE → MERGE → DONE
```

### Failure Phases (4)
```text
FAILED_TRANSIENT    — Retry-able (max 3 attempts)
FAILED_BLOCKED      — Human intervention required
FAILED_UNSAFE       — Security violation, immediate stop
FAILED              — Generic terminal failure
```

### Gate / Block Phases (5)
```text
BLOCKED_PUSH        — Push prevented by policy
BLOCKED_MERGE       — Merge prevented by kill switch
GATE_APPROVE        — Human approved continuation
GATE_REVISE         — Human requested revision
RESUME_PENDING      — Waiting for human to resume
CLEANUP             — Post-merge cleanup
```

---

## Fleet-to-Positron Migration Decisions

| Fleet Concept | Current Positron Approach | Migration Decision |
|---|---|---|
| CHECKLIST phase | Speckit `checklist` command unused; `ANALYZE` phase covers similar ground | **Document only.** Don't add Phase. Document checklist as optional Speckit command usable within TASKS→ANALYZE |
| VERIFICATION_CONTRACT phase | Documented as sub-gate artifact, not distinct Phase | **Document only.** Contract already well-defined in `docs/reference/verification-contract.md` |
| RED_TESTS phase | Described in orchestrierung.md but embedded in ANALYZE→REVIEW | **Document only.** RED_TESTS is a methodology, not a machine state. Document the test-first contract flow |
| SANDBOX_PREVIEW phase | Described in orchestrierung step 7, within VERIFY | **Document only.** Preview is an activity within VERIFY |
| REVIEWER_AGENT phase | `review-agent` subagent exists; called during VERIFY→COMMIT | **Document only.** Agent invocation, not machine state |
| HUMAN_APPROVAL phase | `GATE_APPROVE` / `GATE_REVISE` exist as distinct Phases | **Already implemented.** No change needed |
| EVIDENCE_COMMENT phase | Embedded in COMMIT phase | **Document only.** Explicit comment step in workflow docs |
| Per-phase HUMAN GATE | Only at COMMIT/MERGE | **Defer.** Adding gates between all 18 phases would make the state machine unwieldy. Current critical-point gates (COMMIT, MERGE, failed states) are appropriate for the autonomy level model |

---

## Verify Loop

Positron's verify loop maps to the Fleet model's "max 3 iterations":

```text
IMPLEMENT → TEST → (fail?) → IMPLEMENT → TEST → (fail?) → IMPLEMENT → TEST → (fail?)
→ FAILED_BLOCKED (after 3 attempts, MAX_FIX_LOOPS=3)
```

On test pass:
```
TEST → VERIFY → (verify passes?) → COMMIT
```

The `retry()` function in `state-machine.ts` increments `attempt` on each retry. At 3 failed attempts, the run is marked `FAILED_BLOCKED`.

---

## Resume Logic

Positron's `resumeFromEvents()` function implements Fleet's "Resume by Artifact":

1. Reads all events for a run
2. Identifies completed phases (INFO/GATE events)
3. Determines the last completed phase
4. Returns the run at that phase

No chat history dependency — purely event-driven resume.

---

## Git Safety Checks

| Fleet Requirement | Positron Implementation |
|---|---|
| No push to main/master | Branch policy: only `positron/issue-<n>-<slug>` accepted |
| No force push | Force flags blocked |
| Push requires gate | `POSITRON_ENABLE_PUSH=true` required |
| Merge requires gate | `POSITRON_MERGE_KILL_SWITCH`, `POSITRON_ENABLE_MERGE` |
| No auto-merge without checks | `BLOCKED_MERGE` phase, kill switch |

---

## Migration Completion Status

| Area | Status | Action |
|---|---|---|
| Phase mapping documented | ✅ Complete | This document |
| CHECKLIST gap | ⚠️ Documented | No code change; document that Speckit `checklist` command is available but unused |
| RED_TESTS gap | ⚠️ Documented | Test-first methodology documented in verification-contract.md |
| Stale artifact detection | ❌ Gap | Defer to future issue (requires hash infrastructure) |
| Per-phase human gates | ❌ Gap | Defer (critical-point gates sufficient for current autonomy model) |

---

## Related Documents

- [State Machine Source (GitHub)](https://github.com/xxammaxx/Positron/blob/main/packages/run-state/src/state-machine.ts)
- [Orchestration Workflow](../workflows/orchestrierung.md)
- [Quality Gates](../workflows/qualitaetspruefung.md)
- [Verification Contract](../reference/verification-contract.md)
- [Gap Analysis](../audits/POSITRON_NEW_INSIGHTS_GAP_ANALYSIS.md)
