# How Positron Implements SDD, Fleet & Context Engineering

<!-- INTERNAL -->
**Date:** 2026-06-09
**Diataxis:** Explanation
**Purpose:** Explain how Positron's existing architecture embodies Spec-Driven Development, Fleet Orchestration, OpenCode integration, and Context Engineering — without requiring architectural changes.

---

## 1. Spec-Driven Development (SDD) in Positron

### 1.1 Spec as Source of Truth

Positron's Constitution Article II mandates "Spec Before Code." The SpecKit adapter (`packages/speckit-adapter/`) generates structured artifacts in sequence:

```
Issue Ingestion → SPECIFY (spec.md) → PLAN (plan.md) → TASKS (tasks.md)
```

The `REVIEW` phase gates `IMPLEMENT` — no code is written until spec, plan, and tasks exist and pass review.

### 1.2 Intent-Driven: WHAT/WHY Before HOW

The Speckit workflow enforces this separation:
- **SPECIFY** defines WHAT (user stories, acceptance criteria, non-goals)
- **PLAN** defines HOW (architecture decisions, data model, test strategy)
- **TASKS** defines the step-by-step implementation

The Verification Contract (`docs/reference/verification-contract.md`) locks the spec-hash, ensuring the WHAT doesn't drift during implementation.

### 1.3 Multi-Step Refinement

Positron explicitly supports refinement through:
- `CLARIFY_OPTIONAL` phase for ambiguity resolution
- `ANALYZE` phase for feasibility and risk assessment
- `REVIEW` gate with 7 review dimensions (spec-plan alignment, completeness, ordering, feasibility, standards, readiness)
- `REVIEW → PLAN` or `REVIEW → TASKS` back-edges for revision

This is not "One-Shot from Issue to Code" — it's iterative refinement with persistent artifacts.

### 1.4 Test-First (Contracts → Tests → Code)

The orchestration workflow (`docs/workflows/orchestrierung.md`) prescribes:
1. **Verification Contract** defined after TASKS (Step 3)
2. **Red Tests** written against acceptance criteria before IMPLEMENT (Step 4)
3. **Agent Code** implemented to make tests pass (Step 5)
4. **CI/Security Gates** verify objectively (Step 6)

The `MAX_FIX_LOOPS = 3` constant enforces the verify loop limit.

### 1.5 Feedback Loop

- Test failures → `FAILED_TRANSIENT` → retry (up to 3x) → `FAILED_BLOCKED`
- All results documented in GitHub Evidence Comment
- Evidence-gated progression per Constitution Article IV

---

## 2. Fleet Orchestration in Positron

### 2.1 The 10-Phase Model Mapped

Positron's 18 workflow phases cover and often exceed the Fleet 10-phase model. See [State Machine Mapping](POSITRON_STATE_MACHINE_MAPPING.md) for the detailed 1:1 mapping.

### 2.2 Phase Discipline

| Fleet Principle | Positron Implementation |
|---|---|
| Phases cannot be skipped | `canTransition(from, to)` enforces only valid transitions via `VALID_TRANSITIONS` lookup table |
| Human Gate after critical phases | `GATE_APPROVE` / `GATE_REVISE` phases at COMMIT → PR_CREATE → MERGE boundaries |
| Resume by artifact detection | `resumeFromEvents()` reconstructs run state from event history — no chat dependency |
| Verify loop (max 3) | `retry()` increments attempt counter; `MAX_FIX_LOOPS = 3` blocks further retries |
| Git safety | Branch naming policy, push policy (`POSITRON_ENABLE_PUSH`), merge kill switch (`POSITRON_MERGE_KILL_SWITCH`) |

### 2.3 Sub-Gates Within Phases

Several Fleet concepts (CHECKLIST, RED_TESTS, VERIFICATION_CONTRACT, SANDBOX_PREVIEW) exist as **activities within phases** rather than separate machine states:

| Activity | Phase Context | Documentation |
|---|---|---|
| Verification Contract creation | `TASKS` → `ANALYZE` | `docs/reference/verification-contract.md` |
| Red Tests (test-first) | `ANALYZE` → `REVIEW` | `docs/workflows/orchestrierung.md` §4 |
| Sandbox Preview (diff, preview URL) | `VERIFY` | `docs/workflows/orchestrierung.md` §7 |
| Reviewer-Agent evaluation | `VERIFY` → `COMMIT` | `docs/workflows/orchestrierung.md` §8 |
| Evidence Comment | `COMMIT` | `docs/workflows/orchestrierung.md` §10 |

**Design Decision:** Sub-gates are documented but not encoded as distinct Phase values to keep the state machine manageable (27 values is already comprehensive). If a future requirement demands distinct Phase types for these activities, it can be done without breaking existing transitions.

---

## 3. OpenCode Integration

### 3.1 Agent Role Architecture

Positron separates concerns across agent types aligned with the Fleet model:

| Agent Role | Write Access | Phase(s) Active | Fleet Equivalent |
|---|---|---|---|
| issue-orchestrator | None (delegates) | All phases | Orchestrator |
| research-agent | Read-only | WEB_RESEARCH | Research |
| explore-agent | Read-only | ISSUE_CONTEXT, ANALYZE | Plan/Explore |
| build-agent (OpenCode) | Controlled (edit/bash in sandbox) | IMPLEMENT | Build |
| review-agent | Read-only | REVIEW, VERIFY→COMMIT | Reviewer |
| security-agent | Read-only (evidence-gated) | VERIFY | Security |
| compliance-agent | Read-only (canonical data) | (on demand) | Compliance |
| documentation-agent | Write: docs/ only | COMMIT, DONE | Documentation |

### 3.2 Permission Profiles

Two primary profiles exist:

**Supervised Mode (Level 2):**
```json
{
  "permission": {
    "read": "allow", "grep": "allow", "glob": "allow",
    "edit": "ask", "bash": "ask",
    "webfetch": "allow", "websearch": "allow"
  }
}
```

**Autonomous Sandbox Mode (Level 3):**
```json
{
  "permission": {
    "read": "allow", "grep": "allow", "glob": "allow",
    "edit": "allow",
    "bash": {
      "npm test": "allow", "npm run build": "allow",
      "git status": "allow", "git diff": "allow",
      "git push": "ask",
      "sudo *": "deny", "rm *": "ask"
    }
  }
}
```

### 3.3 Dangerous Command Protection

| Command Pattern | Permission | Rationale |
|---|---|---|
| `sudo *` | `deny` | System-level escalation |
| `rm *` | `ask` | Destructive file operations |
| `git push` | `ask` | Protected branch enforcement |
| `docker system prune *` | `deny` | Destructive container ops |
| `git push --force` | `deny` | Force push protection |

### 3.4 Autonomy Levels

| Level | Name | Implementation |
|---|---|---|
| 0 | Observer | Read-only, no code changes |
| 1 | Research & Spec | Research + specification, no code changes |
| 2 | Supervised Build | Code with `ask` gates, push after approval |
| 3 | Autonomous Sandbox | Autonomous in isolated workspace, no main merge |
| 4 | CI Auto-PR | Auto PR creation, merge only when checks green |

---

## 4. Context Engineering in Positron

### 4.1 Cold / Warm / Hot Context Tiers

Positron's context model (`docs/reference/context-engineering.md`) implements three tiers:

| Tier | Contents | Load Trigger | Token Budget |
|---|---|---|---|
| **Cold** | Constitution, Blueprint, README, CONTRIBUTING, AGENTS.md, ADRs | Explicit `skill` command | ~2,000 tokens |
| **Warm** | AGENTS.md (auto), module-map, dependency-graph, project-structure, glossary, llms.txt | Session start + phase changes | ~4,000–6,000 tokens |
| **Hot** | spec.md, plan.md, tasks.md, run.json, error logs, test reports | Always loaded, refreshed each step | ~8,000–12,000 tokens |

### 4.2 Compression Rules

- **Compress:** Successful CI logs, successful test runs, known project structures, old changelog entries, successful git operations, long dependency lists
- **NEVER Compress:** Error logs/stacktraces, CI failures, test failures, current diffs, spec/plan/tasks docs, GitHub issue content, verification contracts, evidence logs, security-relevant output

### 4.3 Context Manifest

Every session generates a Context Manifest (`docs/agent/CONTEXT_MANIFEST_TEMPLATE.md`) documenting:
- Files read (with purpose)
- Files modified (with reason)
- Assumptions (with confidence level)
- Evidence references (tests, builds, diffs)
- Open items
- Sign-off checklist

### 4.4 Evidence Log

The Evidence Log (`docs/agent/EVIDENCE_LOG_TEMPLATE.md`) records:
- Branch and commit(s)
- Changed files
- Tests executed and results
- CI/Security results
- Open risks
- Reviewer-Agent verdict
- Human Approval status

---

## 5. UI/Cockpit Implementation

### 5.1 Phase Visibility

| Component | Purpose |
|---|---|
| `PhaseTimeline.tsx` | Historical phase progression |
| `PhasePipeline.tsx` | Current and upcoming phases |
| `PhaseBadge.tsx` | Current phase indicator |

### 5.2 Gate Controls

`GateControls.tsx` provides: Approve, Revise, Pause, Abort, Retry, Rollback, Create PR — mapping to Fleet's human gate model.

### 5.3 Evidence & Monitoring

| Component | Purpose |
|---|---|
| `EvidencePage.tsx` | Full evidence explorer |
| `EvidenceSummary.tsx` | Dashboard-level evidence overview |
| `HealthIndicator.tsx` | System health status |
| `LogViewer.tsx` | Live log streaming via SSE |
| `AttentionQueue.tsx` | Items requiring human attention |

### 5.4 SSE Real-time Transport

9 SSE event types (`packages/shared/src/sse-events.ts`) connect backend to frontend:
`initial`, `run-event`, `run-update`, `run-control`, `run-complete`, `run-evidence-created`, `run-cancelled`, `heartbeat`

---

## 6. CI/Security Gate Coverage

| Gate | Implementation |
|---|---|
| Issue Verification | `.github/workflows/verify-issues.yml` — checks issue closure integrity |
| Documentation Quality | `.github/workflows/docs-quality.yml` — markdownlint, secret scan, mkdocs build, link check, essential files check |
| Unit/Integration Tests | `vitest run` — runs per package |
| E2E Tests | `playwright test` — visual regression, accessibility, contract tests |
| TypeCheck | `tsc -b --dry` |
| Lint | `eslint` (scripts, no dedicated CI workflow yet) |

---

## 7. Key Design Decisions

1. **State machine is 27 values, not 40+.** Fleet sub-concepts (RED_TESTS, CHECKLIST, SANDBOX_PREVIEW) are documented as activities within phases rather than distinct machine states to keep the state machine comprehensible.

2. **Critical-point human gates, not per-phase gates.** `GATE_APPROVE` at COMMIT and MERGE boundaries is sufficient for the current autonomy model. Per-phase human gates would make the state machine unwieldy without proven benefit.

3. **Documentation explicitness over code changes.** Where Positron already implements a concept (e.g., test-first via RED_TESTS), documentation is updated to use the Fleet-standard terminology without changing the code.

4. **Existing docs extended, not duplicated.** New architecture docs reference but do not replace existing well-written documentation. The [State Machine Mapping](POSITRON_STATE_MACHINE_MAPPING.md) is the bridge document.

---

## Related Documents

- [State Machine Mapping](POSITRON_STATE_MACHINE_MAPPING.md)
- [Orchestration Workflow](../workflows/orchestrierung.md)
- [Quality Gates](../workflows/qualitaetspruefung.md)
- [Verification Contract](../reference/verification-contract.md)
- [Context Engineering](../reference/context-engineering.md)
- [Gap Analysis](../audits/POSITRON_NEW_INSIGHTS_GAP_ANALYSIS.md)
- [Blueprint](https://github.com/xxammaxx/Positron/blob/main/Blueprint.md)
- [Constitution](https://github.com/xxammaxx/Positron/blob/main/.specify/memory/constitution.md)
