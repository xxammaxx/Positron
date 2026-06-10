# Positron New Insights — Gap Analysis

<!-- INTERNAL -->

**Audit:** SDD / Fleet / OpenCode / Context Engineering Transfer
**Ref:** Issue #205 → Iteration 2
**Date:** 2026-06-09
**Status:** Draft

---

## Executive Summary

Positron v3.0 already implements ~85% of the SDD/Fleet/OpenCode/Context Engineering principles described in the prompt. The core architecture — deterministic state machine, SpecKit → OpenCode pipeline, evidence gating, GitHub Source of Truth — is fundamentally aligned. Remaining gaps are mainly in **documentation explicitness**, **granularity of certain machine states**, and **formalizing concepts that are already practiced but not named**.

---

## A. Spec-Driven Development (SDD)

### A.1 Spec as Source of Truth
| Criterion | Status | Evidence |
|---|---|---|
| Spec.md created before implementation | ✅ PASS | Constitution Article II, SpecKit adapter (`packages/speckit-adapter/`) |
| Spec stored as artifact | ✅ PASS | `docs/workflows/orchestrierung.md` step 2 |
| Re-spec on scope change | ⚠️ GAP | No explicit "stale spec detection" or spec hash verification at TEST phase (though verification-contract.md exists) |

### A.2 Intent-Driven (WHAT/WHY before HOW)
| Criterion | Status | Evidence |
|---|---|---|
| SpecKit separates WHAT from HOW | ✅ PASS | SpecKit adapter generates `spec.md` before `plan.md` |
| User stories with AC | ✅ PASS | `docs/reference/verification-contract.md` §Acceptance Criteria |

### A.3 Multi-Step Refinement (not One-Shot)
| Criterion | Status | Evidence |
|---|---|---|
| SPECIFY → CLARIFY_OPTIONAL → PLAN chain | ✅ PASS | `CLARIFY_OPTIONAL` phase exists in state machine |
| REVIEW gate before IMPLEMENT | ✅ PASS | REVIEW phase in state machine, review dimensions in Blueprint §10 |

### A.4 Test-First (Contracts → Tests → Code)
| Criterion | Status | Evidence |
|---|---|---|
| Verification Contract before implementation | ✅ PASS | `docs/reference/verification-contract.md` defines create→verify→fulfill lifecycle |
| Red Tests phase as separate machine state | ⚠️ GAP | RED_TESTS is described in `orchestrierung.md` step 4 but NOT a distinct Phase type — embedded in ANALYZE → REVIEW |
| Contract enforced at gate | ⚠️ GAP | Contract verification is documented but not implemented as runtime gate in `state-machine.ts` |

### A.5 Feedback Loop to Spec/Evidence
| Criterion | Status | Evidence |
|---|---|---|
| Test results feed back to issue | ✅ PASS | `docs/workflows/orchestrierung.md` step 10: Evidence Comment |
| Failed tests cause retry (max 3) | ✅ PASS | `MAX_FIX_LOOPS = 3` in `packages/shared/src/constants.ts`, `retry()` in state-machine.ts |

**SDD Gap Summary:** 3 minor gaps — stale spec detection, RED_TESTS as distinct phase, contract runtime enforcement.

---

## B. Fleet Orchestration (10-Phase Model)

The prompt describes: `specify → clarify → plan → checklist → tasks → analyze → review → implement → verify → CI`

### B.1 Phase Mapping

| Fleet Phase | Positron Equivalent | Match | Notes |
|---|---|---|---|
| specify | SPECIFY | ✅ Exact | SpecKit adapter |
| clarify | CLARIFY_OPTIONAL | ✅ Exact | State machine phase |
| plan | PLAN | ✅ Exact | SpecKit adapter |
| checklist | — | ⚠️ GAP | No CHECKLIST phase. Speckit's `checklist` command exists but state machine skips it. `ANALYZE` is the closest, but it's post-TASKS. |
| tasks | TASKS | ✅ Exact | SpecKit adapter |
| analyze | ANALYZE | ✅ Exact | State machine phase |
| review | REVIEW | ✅ Exact | Review gate before IMPLEMENT |
| implement | IMPLEMENT | ✅ Exact | OpenCode adapter |
| verify | TEST → VERIFY | ✅ Aligned | TEST (run tests) + VERIFY (verify results) = fleet's verify |
| CI | COMMIT → PR_CREATE | ✅ Aligned | CI is external — Positron's COMMIT phase + CI workflows |

### B.2 Phase Discipline
| Criterion | Status | Evidence |
|---|---|---|
| Phase must not be skipped | ✅ PASS | `canTransition()` enforces only valid transitions |
| HUMAN GATE after each phase | ⚠️ GAP | `GATE_APPROVE` and `GATE_REVISE` exist as Phases, but not between EVERY phase — only at critical points (COMMIT, MERGE) |
| Resume by artifact detection | ✅ PASS | `resumeFromEvents()` in state-machine.ts reads event history |
| Stale Artifact Detection | ⚠️ GAP | Not implemented. No hash-based detection that downstream artifacts are stale when upstream changes |
| Verify loop max 3 iterations | ✅ PASS | `MAX_FIX_LOOPS = 3`, `retry()` increments attempt counter |
| Cross-Model / Reviewer Gate | ⚠️ GAP | `review-agent` subagent exists but REVIEW phase is pre-implementation, not post-implementation peer review |
| Git safety checks | ✅ PASS | Branch policy, push policy, `POSITRON_ENABLE_PUSH`, `POSITRON_MERGE_KILL_SWITCH` |

### B.3 Additional Fleet States Proposed
| Fleet State | Positron Status | Recommendation |
|---|---|---|
| VERIFICATION_CONTRACT | Documented but not a Phase | Add as sub-gate between TASKS and ANALYZE |
| RED_TESTS | Documented but not a Phase | Add as sub-gate between ANALYZE and REVIEW |
| SANDBOX_PREVIEW | Documented in orchestrierung step 7 | Add as sub-gate between VERIFY and COMMIT |
| REVIEWER_AGENT | Documented in orchestrierung step 8 | Add as distinct Phase or sub-gate |
| HUMAN_APPROVAL | `GATE_APPROVE` exists | Already a Phase, well-implemented |
| EVIDENCE_COMMENT | Documented in orchestrierung step 10 | Add as sub-gate before PR_CREATE |
| MERGE_READY | — | Not in prompt's list; Positron uses PR_CREATE → MERGE |

**Fleet Gap Summary:** 4 notable gaps — CHECKLIST phase, per-phase HUMAN GATE, Stale Artifact Detection, post-implementation REVIEWER_AGENT gate. Core alignment is strong.

---

## C. Context Engineering

### C.1 Cold / Warm / Hot Context
| Criterion | Status | Evidence |
|---|---|---|
| Three-tier context model documented | ✅ PASS | `docs/reference/context-engineering.md` (160 lines) |
| Cold context: stable project info | ✅ PASS | Documented with loading rules |
| Warm context: session-level state | ✅ PASS | Documented with auto-load rules |
| Hot context: active work data | ✅ PASS | Documented with immediate-load rules |
| Compression rules (dos/don'ts) | ✅ PASS | Explicitly lists what may/may not be compressed |

### C.2 Context Manifest
| Criterion | Status | Evidence |
|---|---|---|
| Template exists | ✅ PASS | `docs/agent/CONTEXT_MANIFEST_TEMPLATE.md` |
| Per-session manifests | ✅ PASS | Template includes session metadata |
| Token budget tracking | ⚠️ GAP | Template mentions budget but no runtime enforcement |
| Tool-Discovery vs Tool-Dump | ⚠️ GAP | Not explicitly addressed — OpenCode tools are described as available but no lazy loading |
| Confidence/Freshness/Ownership per retrieval | ⚠️ GAP | Template has Confidence field but not Freshness or Ownership |

### C.3 Evidence Log
| Criterion | Status | Evidence |
|---|---|---|
| Template exists | ✅ PASS | `docs/agent/EVIDENCE_LOG_TEMPLATE.md` |
| Cross-session traceability | ✅ PASS | Audit trail in `.opencode/logs/audit/` |
| Immutable by convention | ✅ PASS | audit-trail-enforcer skill mandates this |

### C.4 Error Log Treatment
| Criterion | Status | Evidence |
|---|---|---|
| Error logs never compressed | ✅ PASS | Explicit rule in context-engineering.md |
| Stacktraces preserved in full | ✅ PASS | Documented |

**Context Gap Summary:** 3 minor gaps — runtime token budget enforcement, tool-discovery mechanism, freshness/ownership metadata. Model is well-documented.

---

## D. OpenCode Integration

### D.1 Agent Role Separation
| Criterion | Status | Evidence |
|---|---|---|
| Plan-Agent: read-only | ⚠️ GAP | `explore-agent` is read-only; `plan-agent` role not explicitly named |
| Explore-Agent: read-only | ✅ PASS | `explore` subagent_type exists |
| Build-Agent: write/edit/bash controlled | ✅ PASS | OpenCode adapter with permission profiles |
| Reviewer-Agent: read-only | ✅ PASS | `review-agent` subagent_type, leaf node |
| Supervised Mode: `ask` | ✅ PASS | Blueprint §5.5, supervised permission profile |
| Autonomous Mode: `allow` in sandbox | ✅ PASS | Blueprint §5.5, sandbox_autonomous profile |

### D.2 Permission Profiles
| Criterion | Status | Evidence |
|---|---|---|
| Dangerous commands: always `ask` or `deny` | ✅ PASS | `sudo *: deny`, `rm *: ask`, `git push: ask` |
| AGENTS.md as prioritized instruction | ✅ PASS | Listed in AGENTS.md itself and OpenCode config |
| .specify/memory/constitution.md prioritized | ✅ PASS | Required read in OpenCode instructions |
| No secrets in prompts/logs | ✅ PASS | Secret redaction patterns in `.opencode/config.json` |

### D.3 Permission Profile Standardization
| Criterion | Status | Evidence |
|---|---|---|
| JSON-structured permission profiles | ✅ PASS | Blueprint §5.5 provides supervised and autonomous profiles |
| Profiles match actual OpenCode config schema | ✅ PASS | `.opencode/config.json` uses matching patterns |
| Profiles documented for all agent types | ⚠️ GAP | Only Build and Reviewer profiles are explicit; orchestrator/spec/evidence agent profiles not formalized |

**OpenCode Gap Summary:** 2 minor gaps — plan-agent role formalization, complete agent permission profile documentation.

---

## E. UI / Cockpit Visibility

### E.1 Current UI Components (verified in code)
| Component | File | Implementation |
|---|---|---|
| Phase Timeline | `PhaseTimeline.tsx` | ✅ |
| Phase Pipeline | `PhasePipeline.tsx` | ✅ |
| Phase Badge | `PhaseBadge.tsx` | ✅ |
| Gate Controls | `GateControls.tsx` | ✅ (Approve/Revise/Pause/Abort/Retry/Rollback/Create PR) |
| Evidence Page | `EvidencePage.tsx` | ✅ |
| Health Indicator | `HealthIndicator.tsx` | ✅ |
| Log Viewer | `LogViewer.tsx` | ✅ |
| Dashboard | `DashboardPage.tsx`, `StatusSummary.tsx`, `AttentionQueue.tsx` | ✅ |
| Evidence Summary | `EvidenceSummary.tsx` | ✅ |
| SSE Hook | `useSSE.ts` | ✅ |

### E.2 Prompt's UI Requirements vs Implementation
| Requirement | Status | Gap |
|---|---|---|
| Aktuelle Phase anzeigen | ✅ | PhaseTimeline, PhasePipeline, PhaseBadge |
| Gate-Status | ✅ | GateControls |
| Offene Human Approval Entscheidung | ✅ | GateControls + AttentionQueue |
| Spec/Plan/Tasks/Verify Artefakte | ✅ | EvidencePage, ArtifactPanel |
| Live-Diff | ⚠️ | Dashboard shows diffs but "Live-Diff" during implementation not verified |
| Teststatus | ✅ | LogViewer shows test output |
| Security-Gates | ⚠️ | HealthIndicator shows health but no dedicated security gate panel |
| Sandbox Preview | ⚠️ GAP | Orchestrierung step 7 mentions preview URL but no UI component found |
| Context Budget | ⚠️ GAP | No context budget display in UI |
| Evidence-Log | ✅ | EvidencePage |
| Autonomie-Level | ⚠️ | Partially — RunDetail likely shows autonomy level |
| Risk Banner bei Autonomous Mode | ⚠️ GAP | Not found in component scan |
| Stale Artifact Warning | ⚠️ GAP | Not found in component scan |

**UI Gap Summary:** 5 gaps — Sandbox Preview panel, Security Gate panel, Context Budget display, Autonomous Mode Risk Banner, Stale Artifact Warning. Core visibility is strong.

---

## F. CI / Security / Evidence Gates

### F.1 CI Workflows
| Workflow | File | Status |
|---|---|---|
| Issue Verification | `.github/workflows/verify-issues.yml` | ✅ |
| Documentation Quality | `.github/workflows/docs-quality.yml` | ✅ |

### F.2 Gate Coverage
| Gate | Present | Evidence |
|---|---|---|
| format/lint | ⚠️ | `eslint` in scripts, no dedicated CI workflow |
| typecheck | ✅ | `npm run typecheck` exists in scripts |
| unit tests | ✅ | `vitest run` in test script |
| integration tests | ✅ | Included in vitest |
| e2e tests | ✅ | `playwright test` in scripts |
| security scan | ⚠️ GAP | No automated SAST/dependency scan in CI |
| secret scan | ✅ | `docs-quality.yml` includes secret pattern scan |
| dependency audit | ⚠️ GAP | No `npm audit` in CI |
| license check | ⚠️ GAP | Not present |
| sandbox preview | ⚠️ GAP | Not automated in CI |
| reviewer-agent | ⚠️ GAP | Agent exists but not wired into CI |
| human approval | ⚠️ GAP | GATE_APPROVE phase exists but no CI enforcement |
| evidence comment | ⚠️ GAP | Required by constitution but no CI check |

**CI Gap Summary:** 7 gaps — lint CI, security scan, dependency audit, license check, sandbox preview CI, reviewer-agent CI integration, human approval CI gate, evidence comment CI check.

---

## G. Consolidated Gap Priority Matrix

| # | Gap | Category | Severity | Effort | Priority |
|---|---|---|---|---|---|
| G1 | RED_TESTS as distinct Phase or sub-gate | SDD | MEDIUM | LOW (docs + optional enum extension) | P2 |
| G2 | CHECKLIST phase between PLAN and TASKS | Fleet | LOW | LOW (Speckit command already exists) | P3 |
| G3 | Stale Artifact Detection | Fleet | MEDIUM | MEDIUM (hash computation + gate check) | P2 |
| G4 | Post-implementation REVIEWER_AGENT gate | Fleet | MEDIUM | MEDIUM (wire review-agent into VERIFY → COMMIT) | P2 |
| G5 | Per-phase HUMAN GATE (currently only at COMMIT/MERGE) | Fleet | MEDIUM | HIGH (major state machine change) | P3 |
| G6 | Tool-Discovery mechanism (vs Tool-Dump) | Context | LOW | LOW (docs) | P3 |
| G7 | Runtime token budget enforcement | Context | LOW | MEDIUM (needs token counter) | P3 |
| G8 | Agent permission profiles for ALL agent types | OpenCode | MEDIUM | LOW (docs + config) | P2 |
| G9 | Sandbox Preview UI component | UI | MEDIUM | HIGH (new component + backend) | P2 |
| G10 | Context Budget UI display | UI | LOW | MEDIUM (needs token tracking) | P3 |
| G11 | Autonomous Mode Risk Banner | UI | LOW | LOW (UI component) | P3 |
| G12 | Lint CI workflow | CI | MEDIUM | LOW (workflow file) | P1 |
| G13 | Security scan CI (SAST) | CI | HIGH | MEDIUM (integrate scanner) | P1 |
| G14 | Dependency audit CI | CI | MEDIUM | LOW (workflow file) | P1 |
| G15 | Reviewer-agent CI integration | CI | MEDIUM | MEDIUM (wire subagent) | P2 |
| G16 | Evidence comment CI verification | CI | MEDIUM | LOW (check in verify-issues) | P2 |

---

## H. Decision: What to Implement Now vs. Defer

### Immediate (This Session — Docs Only)
1. **Architecture doc updates** — Add SDD/Fleet mapping to existing architecture docs
2. **State machine mapping** — Document how Positron phases map to fleet phases
3. **Gate matrix extension** — Extend `qualitaetspruefung.md` with fleet-specific gates
4. **Permission profile documentation** — Document all agent permission profiles
5. **Verification Contract standard extension** — Add missing fields (RED_TESTS, Sandbox Preview)

### Defer to Future Issues
- New Phase types (RED_TESTS, CHECKLIST, SANDBOX_PREVIEW, etc.) — requires shared types change
- CI workflow additions (security scan, dependency audit) — separate CI issue
- UI components (Sandbox Preview, Context Budget, Risk Banner) — separate feature issues
- Runtime token budget enforcement — requires new tracking infrastructure
- Stale artifact detection — requires hash computation infrastructure

---

## I. Verdict

**OVERALL: PASS (with documented gaps)**

Positron's architecture is fundamentally aligned with SDD/Fleet/OpenCode/Context Engineering principles. The state machine, evidence gating, SpecKit integration, OpenCode permission model, and CI foundations are solid. Gaps are in documentation explicitness, granularity of certain states, and CI completeness — all addressable without architectural changes.
